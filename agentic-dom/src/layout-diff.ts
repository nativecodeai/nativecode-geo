/**
 * Layout diff between two hosts of the same Webflow site, usually staging
 * (*.webflow.io) and production. Used to prove a structural change, such as
 * wrapping content in <main>, moved nothing on screen before it goes live.
 *
 * For every path and viewport it records each top-level block on the page
 * (children of .ds-page, looking through <main>): class, top, height and
 * background color, plus total document height. Any difference over the
 * tolerance fails the run.
 *
 * Usage: tsx src/layout-diff.ts --a https://www.nativecode.ai --b https://nativecodeai.webflow.io \
 *          --urls nativecode-urls.txt [--out out/layout-diff.json]
 */
import { chromium, type Page } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";

type Row = { cls: string; top: number; height: number; bg: string };
type Measure = { docHeight: number; hasMain: boolean; rows: Row[] };

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const TOLERANCE = 1;

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i > -1 && process.argv[i + 1]) return process.argv[i + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`missing --${name}`);
}

function readPaths(file: string): string[] {
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => new URL(l).pathname);
}

async function measure(page: Page, url: string): Promise<Measure> {
  await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  await page.addScriptTag({ content: "window.__name = window.__name || ((f) => f);" });
  // Scroll through once so lazy images and scroll-triggered layout settle, then return to top.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
  return page.evaluate(() => {
    const els = [...document.querySelectorAll<HTMLElement>(".ds-page > *, .ds-page > main > *")].filter(
      (el) => el.tagName !== "MAIN" && el.tagName !== "SCRIPT" && el.tagName !== "STYLE",
    );
    const rows = els.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        cls: (el.getAttribute("class") || el.tagName.toLowerCase()).split(/\s+/).slice(0, 3).join("."),
        top: Math.round(r.top + window.scrollY),
        height: Math.round(r.height),
        bg: getComputedStyle(el).backgroundColor,
      };
    });
    return {
      docHeight: Math.round(document.documentElement.scrollHeight),
      hasMain: !!document.querySelector("main"),
      rows,
    };
  });
}

function compare(a: Measure, b: Measure): string[] {
  const out: string[] = [];
  if (Math.abs(a.docHeight - b.docHeight) > TOLERANCE) out.push(`document height ${a.docHeight} vs ${b.docHeight}`);
  if (a.rows.length !== b.rows.length) out.push(`block count ${a.rows.length} vs ${b.rows.length}`);
  const n = Math.min(a.rows.length, b.rows.length);
  for (let i = 0; i < n; i++) {
    const x = a.rows[i];
    const y = b.rows[i];
    if (x.cls !== y.cls) out.push(`#${i} class ${x.cls} vs ${y.cls}`);
    if (Math.abs(x.top - y.top) > TOLERANCE) out.push(`#${i} ${x.cls} top ${x.top} vs ${y.top}`);
    if (Math.abs(x.height - y.height) > TOLERANCE) out.push(`#${i} ${x.cls} height ${x.height} vs ${y.height}`);
    if (x.bg !== y.bg) out.push(`#${i} ${x.cls} background ${x.bg} vs ${y.bg}`);
  }
  return out;
}

async function main() {
  const hostA = arg("a").replace(/\/$/, "");
  const hostB = arg("b").replace(/\/$/, "");
  const paths = readPaths(arg("urls", "nativecode-urls.txt"));
  const outFile = arg("out", "out/layout-diff.json");

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const results: Array<{ path: string; viewport: string; mainA: boolean; mainB: boolean; diffs: string[] }> = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    for (const p of paths) {
      try {
        const a = await measure(page, hostA + p);
        const b = await measure(page, hostB + p);
        const diffs = compare(a, b);
        results.push({ path: p, viewport: vp.name, mainA: a.hasMain, mainB: b.hasMain, diffs });
        console.log(`${diffs.length ? "DIFF" : "ok  "} ${vp.name.padEnd(7)} ${p}  main: ${a.hasMain}/${b.hasMain}`);
        for (const d of diffs) console.log(`       ${d}`);
      } catch (e) {
        results.push({ path: p, viewport: vp.name, mainA: false, mainB: false, diffs: [`error: ${(e as Error).message}`] });
        console.log(`ERR  ${vp.name} ${p} ${(e as Error).message}`);
      }
    }
    await ctx.close();
  }
  await browser.close();

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify({ hostA, hostB, results }, null, 2));

  const failed = results.filter((r) => r.diffs.length);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      `## Layout diff: ${hostA} vs ${hostB}`,
      "",
      `${results.length - failed.length} of ${results.length} page/viewport pairs match within ${TOLERANCE}px.`,
      "",
      "| Path | Viewport | main (A/B) | Result |",
      "|---|---|---|---|",
      ...results.map((r) => `| ${r.path} | ${r.viewport} | ${r.mainA ? "yes" : "no"}/${r.mainB ? "yes" : "no"} | ${r.diffs.length ? r.diffs.join("; ") : "match"} |`),
    ];
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
