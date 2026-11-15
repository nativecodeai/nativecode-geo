/**
 * End-to-end tests: a real MCP client talks to the server over three
 * transports (in-memory, stdio subprocess, streamable HTTP) and exercises
 * every tool, resource, and prompt.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { SampleAuditDataSource } from "../src/data/sample-source.js";
import { createServer } from "../src/server.js";
import { httpServer } from "../src/http.js";

type Json = Record<string, any>;

async function call(client: Client, name: string, args: Json = {}) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as { type: string; text: string }[])[0].text;
  return { isError: Boolean(res.isError), text, data: res.isError ? undefined : (JSON.parse(text) as Json) };
}

describe("in-memory transport", () => {
  let client: Client;

  before(async () => {
    const server = createServer(new SampleAuditDataSource());
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "test", version: "1.0.0" });
    await Promise.all([server.connect(serverT), client.connect(clientT)]);
  });

  after(() => client.close());

  test("lists all tools, resources, templates, and prompts", async () => {
    const tools = (await client.listTools()).tools.map((t) => t.name).sort();
    assert.deepEqual(tools, ["compare_brands", "get_ai_visibility", "get_citation_sources", "get_share_of_model_voice", "list_tracked_brands"]);
    const resources = (await client.listResources()).resources.map((r) => r.uri);
    assert.ok(resources.includes("nativecode://brands"));
    assert.ok(resources.includes("nativecode://methodology"));
    assert.ok(resources.includes("nativecode://brands/larkmail/report"));
    const templates = (await client.listResourceTemplates()).resourceTemplates.map((t) => t.uriTemplate);
    assert.deepEqual(templates, ["nativecode://brands/{brand}/report"]);
    const prompts = (await client.listPrompts()).prompts.map((p) => p.name).sort();
    assert.deepEqual(prompts, ["audit_brand_visibility", "competitive_gap_analysis"]);
  });

  test("list_tracked_brands returns both categories and flags sample data", async () => {
    const { data } = await call(client, "list_tracked_brands");
    assert.equal(data!.categories.length, 2);
    assert.equal(data!.data_source.sample, true);
  });

  test("get_ai_visibility returns metrics for all five platforms", async () => {
    const { data } = await call(client, "get_ai_visibility", { brand: "larkmail" });
    assert.equal(data!.brand.name, "Larkmail");
    assert.deepEqual(Object.keys(data!.by_platform), ["ChatGPT", "Gemini", "Claude", "Perplexity", "Google AI Overviews"]);
    const o = data!.overall;
    assert.ok(o.answers_sampled > 500);
    assert.ok(o.share_of_voice_pct > 0 && o.share_of_voice_pct < 100);
    assert.ok(o.mention_rate_pct >= o.citation_rate_pct);
    assert.equal(data!.category_rank.rank, 1, "Larkmail is the sample category leader");
    assert.equal(data!.period.weeks, 12);
  });

  test("get_ai_visibility respects platform and weeks filters", async () => {
    const { data } = await call(client, "get_ai_visibility", { brand: "Sendcraft", platform: "perplexity", weeks: 4 });
    assert.deepEqual(Object.keys(data!.by_platform), ["Perplexity"]);
    assert.equal(data!.period.weeks, 4);
  });

  test("category share of voice sums to 100", async () => {
    const brands = ["Larkmail", "Sendcraft", "Inboxium", "Postharbor", "Campaignary"];
    const results = await Promise.all(brands.map((b) => call(client, "get_ai_visibility", { brand: b })));
    const total = results.reduce((s, r) => s + r.data!.overall.share_of_voice_pct, 0);
    assert.ok(Math.abs(total - 100) < 0.6, `SoV total was ${total}`);
  });

  test("compare_brands ranks brands and matches loose query wording", async () => {
    const { data } = await call(client, "compare_brands", {
      brands: ["Larkmail", "Sendcraft", "Inboxium"],
      query: "email platform for ecommerce store",
    });
    assert.equal(data!.query.id, "em-ecommerce");
    assert.equal(data!.brands.length, 3);
    const h2h = data!.brands.reduce((s: number, b: Json) => s + b.head_to_head_share_pct, 0);
    assert.ok(Math.abs(h2h - 100) < 0.5);
    assert.ok(data!.by_platform["Perplexity"].leader);
  });

  test("compare_brands rejects brands from different categories", async () => {
    const res = await call(client, "compare_brands", { brands: ["Larkmail", "Taskfern"] });
    assert.equal(res.isError, true);
    assert.match(res.text, /same category/);
  });

  test("get_citation_sources returns top, own-site, and gap sources", async () => {
    const { data } = await call(client, "get_citation_sources", { brand: "Postharbor", query: "em-small-business" });
    assert.ok(data!.top_sources.length > 0);
    assert.ok(data!.gap_sources.sources.length > 0);
    assert.equal(data!.own_site.domain, "www.postharbor.example");
    assert.ok(!data!.top_sources.some((s: Json) => s.domain === "www.postharbor.example"));
    // Postharbor's weak review-site presence should surface as a gap; competitor sites never should.
    const gaps = data!.gap_sources.sources;
    assert.ok(gaps.some((s: Json) => s.domain === "www.g2.com" || s.domain === "www.capterra.com"));
    assert.ok(gaps.every((s: Json) => s.source_type !== "brand" && s.gap_pts > 0));
  });

  test("get_share_of_model_voice shows Sendcraft rising and Larkmail falling", async () => {
    const send = (await call(client, "get_share_of_model_voice", { brand: "Sendcraft" })).data!;
    const lark = (await call(client, "get_share_of_model_voice", { brand: "Larkmail" })).data!;
    assert.equal(send.series.length, 12);
    assert.equal(send.trend.direction, "rising");
    assert.ok(lark.trend.change_pts < send.trend.change_pts);
    assert.equal(Object.keys(send.by_platform).length, 5);
  });

  test("unknown brand returns a helpful error the model can act on", async () => {
    const res = await call(client, "get_ai_visibility", { brand: "Acme" });
    assert.equal(res.isError, true);
    assert.match(res.text, /Tracked brands: Larkmail/);
  });

  test("invalid platform is rejected by the input schema", async () => {
    const res = await client.callTool({ name: "get_ai_visibility", arguments: { brand: "Larkmail", platform: "bing" } });
    assert.equal(res.isError, true);
  });

  test("brand report resource renders Markdown", async () => {
    const res = await client.readResource({ uri: "nativecode://brands/inboxium/report" });
    const text = (res.contents[0] as { text: string }).text;
    assert.match(text, /# AI Visibility Report: Inboxium/);
    assert.match(text, /\| Perplexity \|/);
    assert.match(text, /Sample data/);
  });

  test("prompts render with arguments", async () => {
    const p = await client.getPrompt({ name: "audit_brand_visibility", arguments: { brand: "Larkmail", focus_platform: "perplexity" } });
    assert.match((p.messages[0].content as { text: string }).text, /platform=perplexity/);
  });

  test("sample data is deterministic", async () => {
    const a = await new SampleAuditDataSource().getObservations();
    const b = await new SampleAuditDataSource().getObservations();
    assert.deepEqual(a, b);
  });
});

describe("stdio transport (compiled server, as Claude Desktop runs it)", () => {
  test("connects and answers a tool call", async () => {
    const entry = fileURLToPath(new URL("../dist/index.js", import.meta.url));
    const client = new Client({ name: "stdio-test", version: "1.0.0" });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [entry], stderr: "ignore" }));
    try {
      const { data } = await call(client, "get_share_of_model_voice", { brand: "Planquill", platform: "google_ai_overviews" });
      assert.equal(data!.platform, "Google AI Overviews");
    } finally {
      await client.close();
    }
  });
});

describe("streamable HTTP transport", () => {
  let baseUrl: URL;

  before(async () => {
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    baseUrl = new URL(`http://127.0.0.1:${(httpServer.address() as AddressInfo).port}/mcp`);
  });

  after(() => new Promise<void>((resolve) => httpServer.close(() => resolve())));

  test("health endpoint responds", async () => {
    const res = await fetch(new URL("/health", baseUrl));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
  });

  test("remote client can call tools", async () => {
    const client = new Client({ name: "http-test", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(baseUrl));
    try {
      const { data } = await call(client, "compare_brands", { brands: ["Taskfern", "Planquill", "Boardnest", "Sprintwell"] });
      assert.equal(data!.brands.length, 4);
    } finally {
      await client.close();
    }
  });
});
