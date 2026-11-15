import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { build, mdPath } from "../src/build.js";
import { extract } from "../src/extract.js";
import type { SiteConfig } from "../src/types.js";

const tpl = await readFile(new URL("./fixture/page.html", import.meta.url), "utf8");
const noindex = await readFile(new URL("./fixture/noindex.html", import.meta.url), "utf8");
const PAGES: Record<string, [string, string]> = {
  "/": ["Digital marketing agency in Atlanta", "NativeCode is an Atlanta-based digital marketing agency."],
  "/services/seo": ["SEO services", "SEO programs that turn search into revenue."],
  "/services/ai-seo": ["AI SEO", "Get named in AI answers."],
  "/post/how-to-measure-ai-visibility": ["How to measure AI visibility", "A method for measuring AI visibility."],
  "/local-seo/ohio-seo-company": ["Ohio SEO company", "Local SEO in Ohio."],
  "/local-seo/texas-seo-company": ["Texas SEO company", "Local SEO in Texas."],
  "/lp/seo": ["SEO landing page", "Ad landing page."],
};

let origin = "";
const server = createServer((req, res) => {
  const path = req.url!;
  if (path === "/sitemap.xml") {
    const urls = [...Object.keys(PAGES), "/thanks", "/gone"].map((p) => `<url><loc>https://www.nativecode.ai${p === "/" ? "" : p}</loc><lastmod>2026-11-14T01:00:00Z</lastmod></url>`);
    res.writeHead(200, { "content-type": "application/xml" });
    return res.end(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`);
  }
  if (path === "/thanks") return res.end(noindex);
  const page = PAGES[path];
  if (!page) return res.writeHead(404).end("not found");
  res.writeHead(200, { "content-type": "text/html" });
  res.end(tpl.replaceAll("{{TITLE}}", page[0]).replaceAll("{{DESC}}", page[1]).replaceAll("{{PATH}}", path));
});

const config: SiteConfig = JSON.parse(await readFile(new URL("../nativecode.config.json", import.meta.url), "utf8"));
const out = join(tmpdir(), `llms-test-${process.pid}`);

describe("llms builder", () => {
  before(async () => {
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(async () => {
    server.close();
    await rm(out, { recursive: true, force: true });
  });

  test("extract strips chrome, keeps content, resolves links, adds JSON-LD FAQ", () => {
    const x = extract(tpl.replaceAll("{{TITLE}}", "SEO services").replaceAll("{{DESC}}", "SEO programs.").replaceAll("{{PATH}}", "/services/seo"), "https://www.nativecode.ai/services/seo", config.stripSelectors, config.contentSelector);
    assert.equal(x.h1, "SEO services");
    assert.doesNotMatch(x.markdown, /Services\]\(|© 2026|console\.log|Get a free audit|email/);
    assert.match(x.markdown, /^# SEO services/m);
    assert.match(x.markdown, /- Technical fixes ranked by revenue/);
    assert.match(x.markdown, /\| Plan \| Scope \|/);
    assert.match(x.markdown, /\[how we measure AI visibility\]\(https:\/\/www\.nativecode\.ai\/post\/how-to-measure-ai-visibility\)/);
    assert.match(x.markdown, /!\[Share of voice chart\]\(https:\/\/www\.nativecode\.ai\/images\/chart\.png\)/);
    assert.doesNotMatch(x.markdown, /divider\.svg/);
    assert.match(x.markdown, /## Frequently asked questions\n\n### How long does SEO services take\?\n\nMost programs show movement in 90 days\./);
  });

  test("build writes llms.txt, llms-full.txt, Markdown mirror and manifest", async () => {
    const r = await build({ config, outDir: out, crawlOrigin: origin, mirrorBase: "https://nativecodeai.github.io/nativecode-geo" });
    assert.equal(r.pages.length, 6);
    const reasons = Object.fromEntries(r.skipped.map((s) => [new URL(s.url).pathname, s.reason]));
    assert.match(reasons["/lp/seo"], /excluded/);
    assert.equal(reasons["/thanks"], "noindex");
    assert.equal(reasons["/gone"], "HTTP 404");

    const llms = await readFile(join(out, "llms.txt"), "utf8");
    assert.match(llms, /^# NativeCode\n\n> NativeCode is an Atlanta-based digital marketing agency/);
    assert.match(llms, /## AI search optimization \(AEO and GEO\)\n\n- \[AI SEO\]\(https:\/\/www\.nativecode\.ai\/services\/ai-seo\): Get named in AI answers\./);
    assert.match(llms, /## Insights\n\n- \[How to measure AI visibility\]/);
    assert.match(llms, /## Optional\n\n- \[Local SEO by state and city\]\(https:\/\/www\.nativecode\.ai\/services\/local-seo#states\): .* \(2 pages\)/);
    assert.doesNotMatch(llms, /ohio-seo-company/, "collapsed sections list one line, not every page");
    assert.match(llms, /md\/services\/seo\.md/);
    assert.ok(r.llmsTxtBytes < 95_000);

    const md = await readFile(join(out, "md", mdPath("/services/seo")), "utf8");
    assert.match(md, /^---\ntitle: "SEO services"\nurl: https:\/\/www\.nativecode\.ai\/services\/seo\n/);
    assert.match(md, /last_modified: 2026-11-14T01:00:00Z/);
    assert.ok((await readFile(join(out, "md", "index.md"), "utf8")).includes("# Digital marketing agency in Atlanta"));

    const full = await readFile(join(out, "llms-full.txt"), "utf8");
    assert.equal(full.match(/^Source: /gm)?.length, 6);
    const manifest = JSON.parse(await readFile(join(out, "manifest.json"), "utf8"));
    assert.equal(manifest.pages.length, 6);
  });
});
