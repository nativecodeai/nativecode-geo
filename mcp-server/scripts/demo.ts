/**
 * Terminal demo: connects a real MCP client to the server and walks through
 * every tool. Good for screen recordings. Run: npm run demo
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createDataSource } from "../src/data/index.js";
import { createServer } from "../src/server.js";

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

async function main() {
  const server = createServer(createDataSource());
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "demo", version: "1.0.0" });
  await Promise.all([server.connect(serverT), client.connect(clientT)]);

  const call = async (name: string, args: Record<string, unknown>) => {
    console.log(`\n${bold(`> ${name}`)} ${dim(JSON.stringify(args))}`);
    const res = await client.callTool({ name, arguments: args });
    return JSON.parse((res.content as { text: string }[])[0].text);
  };

  const { tools } = await client.listTools();
  console.log(bold("NativeCode Audit MCP server"));
  console.log(`Tools: ${tools.map((t) => t.name).join(", ")}`);

  const vis = await call("get_ai_visibility", { brand: "Larkmail" });
  console.log(`Share of voice ${vis.overall.share_of_voice_pct}%, rank ${vis.category_rank.rank}/${vis.category_rank.of}, sentiment ${vis.overall.sentiment.score} (${vis.overall.sentiment.label})`);
  console.table(
    Object.fromEntries(
      Object.entries(vis.by_platform).map(([p, m]: [string, any]) => [p, { "mention %": m.mention_rate_pct, "citation %": m.citation_rate_pct, "SoV %": m.share_of_voice_pct, "avg pos": m.avg_position, sentiment: m.sentiment.score }]),
    ),
  );
  vis.insights.forEach((i: string) => console.log(`- ${i}`));

  const cmp = await call("compare_brands", { brands: ["Larkmail", "Sendcraft", "Inboxium"], query: "email platform for ecommerce" });
  console.log(`Query matched: "${cmp.query.text}". Leader: ${cmp.leader}`);
  console.table(cmp.brands.map((b: any) => ({ brand: b.brand, "SoV %": b.share_of_voice_pct, "head-to-head %": b.head_to_head_share_pct, "citation share %": b.citation_share_pct, sentiment: b.sentiment_label })));

  const src = await call("get_citation_sources", { brand: "Postharbor", query: "best email marketing software for small business", limit: 5 });
  console.log(`Named in ${src.answers_naming_brand} of ${src.answers_sampled} answers. Own site cited in ${src.own_site.share_of_brand_answers_pct}% of those.`);
  console.table(src.top_sources.map((s: any) => ({ domain: s.domain, type: s.source_type, "% of answers": s.share_of_answers_pct })));
  console.log("Gap sources (competitors named, Postharbor missing):");
  console.table(src.gap_sources.sources.map((s: any) => ({ domain: s.domain, type: s.source_type, "% competitor-only": s.share_in_competitor_answers_pct, "% with brand": s.share_in_brand_answers_pct, "gap pts": s.gap_pts })));

  const somv = await call("get_share_of_model_voice", { brand: "Sendcraft" });
  console.log(`Trend: ${somv.trend.direction}, ${somv.trend.early_avg_pct}% -> ${somv.trend.recent_avg_pct}% (${somv.trend.slope_pts_per_week} pts/week)`);
  console.log(somv.series.map((s: any) => `${s.week.slice(5)} ${"#".repeat(Math.round(s.share_of_voice_pct / 2))} ${s.share_of_voice_pct}%`).join("\n"));

  console.log(dim(`\nData source: ${vis.data_source.name}${vis.data_source.sample ? " (sample)" : ""}`));
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
