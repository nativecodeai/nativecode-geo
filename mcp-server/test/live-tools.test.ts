/**
 * Live NativeCode Audit tools, exercised through a real MCP client against a
 * mock of the Audit API that serves genuine engine output.
 */
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { AuditClient } from "../src/live/audit-client.js";
import { createServer } from "../src/server.js";
import { mockAuditFetch } from "./mock-audit-api.js";

type Json = Record<string, any>;

async function connect() {
  const mock = mockAuditFetch();
  const server = createServer({ auditClient: new AuditClient({ fetchImpl: mock.fetch }) });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "live-test", version: "1.0.0" });
  await Promise.all([server.connect(st), client.connect(ct)]);
  const call = async (name: string, args: Json = {}) => {
    const res = await client.callTool({ name, arguments: args });
    const text = (res.content as { text: string }[])[0].text;
    return { isError: Boolean(res.isError), text, data: res.isError ? undefined : (JSON.parse(text) as Json) };
  };
  return { client, call, mock };
}

describe("live NativeCode Audit tools", () => {
  let ctx: Awaited<ReturnType<typeof connect>>;
  before(async () => {
    ctx = await connect();
  });

  test("probe tools are absent when no probe source is configured", async () => {
    const names = (await ctx.client.listTools()).tools.map((t) => t.name).sort();
    assert.deepEqual(names, ["audit_site", "compare_sites", "get_ai_search_readiness", "get_fix_plan", "get_saved_report"]);
  });

  test("audit_site posts to the Audit API and summarizes the real report", async () => {
    const { data } = await ctx.call("audit_site", { domain: "https://www.Good.example/pricing" });
    const req = ctx.mock.calls.find((c) => c.url.endsWith("/api/audit"))!;
    assert.equal(req.url, "https://app.nativecode.ai/api/audit");
    assert.deepEqual(req.body, { domain: "good.example", businessModel: "leadgen" });
    assert.equal(data!.overall_score, 83);
    assert.equal(data!.tier, "AI-Ready Growth Engine");
    assert.deepEqual(Object.keys(data!.categories), ["seo", "aeo", "geo"]);
    assert.equal(data!.coverage, "25 of 30 factors measured");
    assert.equal(data!.not_measured.length, 5);
    assert.ok(data!.not_measured.some((f: Json) => f.factor.toLowerCase().includes("citation")));
    assert.equal(data!.crawl.llms_txt, true);
    assert.match(data!.estimated_annual_opportunity_usd.note, /default traffic/);
    assert.equal(data!.factors, undefined, "summary mode omits factors");
  });

  test("audit_site detail=full returns every factor with evidence", async () => {
    const { data } = await ctx.call("audit_site", { domain: "good.example", detail: "full" });
    const all = [...data!.factors.seo, ...data!.factors.aeo, ...data!.factors.geo];
    assert.equal(all.length, 30);
    assert.ok(all.filter((f: Json) => f.status === "measured").every((f: Json) => typeof f.score === "number"));
    assert.ok(all.filter((f: Json) => f.status === "unavailable").every((f: Json) => f.score === null));
  });

  test("repeat calls for the same site reuse one API request", async () => {
    const before = ctx.mock.calls.length;
    await ctx.call("get_fix_plan", { domain: "good.example" });
    await ctx.call("get_ai_search_readiness", { domain: "good.example" });
    assert.equal(ctx.mock.calls.length, before);
  });

  test("get_ai_search_readiness returns GEO factors with crawler evidence", async () => {
    const { data } = await ctx.call("get_ai_search_readiness", { domain: "poor.example" });
    assert.match(data!.category, /GEO/);
    const crawler = data!.factors.find((f: Json) => f.id === "ai-crawler-access");
    assert.match(crawler.evidence, /retrieval crawlers blocked/);
    const llms = data!.factors.find((f: Json) => f.id === "llms-txt");
    assert.equal(llms.score, 0);
    assert.equal(data!.weakest.length, 3);
  });

  test("get_fix_plan sorts by priority and filters quick wins", async () => {
    const all = (await ctx.call("get_fix_plan", { domain: "poor.example", limit: 30 })).data!;
    const order = { Critical: 0, High: 1, Medium: 2, Low: 3 } as Record<string, number>;
    const ranks = all.recommendations.map((r: Json) => order[r.priority]);
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
    const quick = (await ctx.call("get_fix_plan", { domain: "poor.example", max_effort: "Low", limit: 30 })).data!;
    assert.ok(quick.recommendations.length > 0);
    assert.ok(quick.recommendations.every((r: Json) => r.effort === "Low"));
    const geo = (await ctx.call("get_fix_plan", { domain: "poor.example", category: "GEO" })).data!;
    assert.ok(geo.recommendations.every((r: Json) => r.category === "GEO"));
  });

  test("compare_sites finds factor gaps against the stronger site", async () => {
    const { data } = await ctx.call("compare_sites", { domains: ["poor.example", "good.example"] });
    assert.equal(data!.leader, "good.example");
    assert.equal(data!.sites.length, 2);
    assert.ok(data!.gaps_for_first_domain.length > 5);
    assert.ok(data!.gaps_for_first_domain.every((g: Json) => g.gap >= 20 && g.best_domain === "good.example"));
  });

  test("compare_sites reports a failed domain without failing the rest", async () => {
    const { data } = await ctx.call("compare_sites", { domains: ["good.example", "poor.example", "down.example"] });
    assert.equal(data!.sites.length, 2);
    assert.equal(data!.failures[0].domain, "down.example");
  });

  test("API errors reach the model as readable tool errors", async () => {
    const down = await ctx.call("audit_site", { domain: "down.example" });
    assert.equal(down.isError, true);
    assert.match(down.text, /Could not reach down\.example/);
    const busy = await ctx.call("audit_site", { domain: "busy.example" });
    assert.match(busy.text, /rate limit/);
  });

  test("get_saved_report loads by id and rejects malformed ids", async () => {
    assert.equal((await ctx.call("get_saved_report", { report_id: "abc123def456" })).data!.overall_score, 83);
    assert.match((await ctx.call("get_saved_report", { report_id: "../etc" })).text, /lowercase letters and digits/);
  });

  test("audit resource renders a Markdown report", async () => {
    const res = await ctx.client.readResource({ uri: "nativecode://audit/poor.example" });
    const text = (res.contents[0] as { text: string }).text;
    assert.match(text, /# NativeCode Audit: poor\.example/);
    assert.match(text, /\| AI Crawler Accessibility \| 48 \|/);
    assert.match(text, /not measured/);
  });

  test("ai_search_audit prompt includes the competitor step when given", async () => {
    const p = await ctx.client.getPrompt({ name: "ai_search_audit", arguments: { domain: "nativecode.ai", competitor: "example.com" } });
    assert.match((p.messages[0].content as { text: string }).text, /compare_sites with \["nativecode\.ai", "example\.com"\]/);
  });
});
