/**
 * Terminal demo: a real MCP client walks through the server's tools.
 *
 *   npm run demo                        live audit of nativecode.ai via app.nativecode.ai
 *   npm run demo -- example.com         live audit of another domain
 *   npm run demo -- --offline           uses real engine output from test fixtures (no network)
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { AuditClient } from "../src/live/audit-client.js";
import { SampleAuditDataSource } from "../src/probes/data/sample-source.js";
import { createServer } from "../src/server.js";
import { mockAuditFetch } from "../test/mock-audit-api.js";

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const offline = process.argv.includes("--offline");
const domain = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? (offline ? "poor.example" : "nativecode.ai");

async function main() {
  const auditClient = new AuditClient(offline ? { fetchImpl: mockAuditFetch().fetch } : {});
  const server = createServer({ auditClient, probeSource: new SampleAuditDataSource() });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "demo", version: "1.0.0" });
  await Promise.all([server.connect(serverT), client.connect(clientT)]);

  const call = async (name: string, args: Record<string, unknown>) => {
    console.log(`\n${bold(`> ${name}`)} ${dim(JSON.stringify(args))}`);
    const res = await client.callTool({ name, arguments: args });
    const text = (res.content as { text: string }[])[0].text;
    if (res.isError) throw new Error(text);
    return JSON.parse(text);
  };

  const { tools } = await client.listTools();
  console.log(bold("NativeCode Audit MCP server"));
  console.log(`Tools: ${tools.map((t) => t.name).join(", ")}`);
  console.log(dim(offline ? "Offline mode: real engine output from fixtures." : `Live mode: crawling ${domain} through ${auditClient.baseUrl}`));

  const audit = await call("audit_site", { domain });
  console.log(`${audit.domain}: ${audit.overall_score}/100, ${audit.tier}. ${audit.coverage}.`);
  console.table(Object.fromEntries(Object.entries(audit.categories).map(([k, v]: [string, any]) => [k.toUpperCase(), { score: v.score, measured: v.measured }])));
  console.log(`llms.txt: ${audit.crawl.llms_txt ? "found" : "missing"}. Not measured: ${audit.not_measured.map((f: any) => f.factor).join(", ")}.`);

  const geo = await call("get_ai_search_readiness", { domain, category: "geo" });
  console.table(geo.factors.map((f: any) => ({ factor: f.label, score: f.score ?? "n/m", evidence: (f.evidence ?? "").slice(0, 70) })));

  const plan = await call("get_fix_plan", { domain, max_effort: "Low", limit: 5 });
  plan.recommendations.forEach((r: any, i: number) => console.log(`${i + 1}. [${r.priority}] ${r.title}: ${r.fix}`));

  console.log(dim("\nCitation probe preview (sample data, fictional brands):"));
  const somv = await call("get_share_of_model_voice", { brand: "Sendcraft" });
  console.log(`Trend: ${somv.trend.direction}, ${somv.trend.early_avg_pct}% -> ${somv.trend.recent_avg_pct}% (${somv.trend.slope_pts_per_week} pts/week)`);
  console.log(somv.series.map((s: any) => `${s.week.slice(5)} ${"#".repeat(Math.round(s.share_of_voice_pct / 2))} ${s.share_of_voice_pct}%`).join("\n"));

  await client.close();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
