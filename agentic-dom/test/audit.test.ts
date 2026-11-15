import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { after, before, describe, test } from "node:test";
import { chromium, type Browser } from "playwright";
import { auditPage, type PageAudit } from "../src/audit.js";
import { renderReport } from "../src/report.js";

const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
let browser: Browser;
let base = "";
const server = createServer(async (req, res) => {
  let body: Buffer;
  try {
    body = await readFile(new URL(`./fixture${req.url}`, import.meta.url));
  } catch {
    return res.writeHead(404).end();
  }
  res.writeHead(200, { "content-type": "text/html" }).end(body);
});

describe("agentic DOM audit", () => {
  let good: PageAudit, bad: PageAudit;
  before(async () => {
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    browser = await chromium.launch({ executablePath: CHROME });
    [good, bad] = await Promise.all([auditPage(browser, `${base}/good.html`), auditPage(browser, `${base}/bad.html`)]);
  });
  after(async () => {
    await browser.close();
    server.close();
  });

  test("a well-built page scores high with landmarks and one h1", () => {
    assert.equal(good.landmarks.main, 1);
    assert.equal(good.headings.filter((h) => h.level === 1).length, 1);
    assert.equal(good.interactive.unnamed, 0);
    assert.deepEqual(good.findings.filter((f) => f.severity !== "notice").map((f) => f.id), []);
    assert.ok(good.score >= 90, `good score ${good.score}`);
  });

  test("a badly built page surfaces the agent blockers", () => {
    const ids = new Set(bad.findings.map((f) => f.id));
    for (const id of ["landmark-main", "single-h1", "heading-order", "unnamed-control", "vague-link-text", "fake-button", "anchor-no-href", "hover-only-menu", "img-missing-alt", "input-no-label", "duplicate-id", "positive-tabindex", "focusable-aria-hidden", "html-lang"]) {
      assert.ok(ids.has(id), `expected finding ${id}; got ${[...ids].join(", ")}`);
    }
    const unnamed = bad.findings.find((f) => f.id === "unnamed-control")!;
    assert.ok(unnamed.examples.some((e) => e.includes('href="/x"')), unnamed.examples.join(" | "));
    assert.ok(bad.axe.length > 0);
    assert.ok(bad.score < 20, `bad score ${bad.score}`);
  });

  test("aria snapshot captures the accessibility tree", () => {
    assert.match(good.ariaSnapshot, /- main:/);
    assert.match(good.ariaSnapshot, /heading "Technical SEO" \[level=1\]/);
  });

  test("report groups repeated issues site-wide", () => {
    const md = renderReport([good, bad]);
    assert.match(md, /2 pages audited/);
    assert.match(md, /### No main landmark \(error, 1 of 2 pages/);
    assert.match(md, /axe-core WCAG 2\.2 AA violations/);
  });
});
