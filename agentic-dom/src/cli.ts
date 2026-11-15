/**
 *   npx tsx src/cli.ts --urls urls.txt --out ../public/agentic-dom [--chrome /usr/bin/google-chrome]
 *   npx tsx src/cli.ts --url https://www.nativecode.ai/ --url https://www.nativecode.ai/services/seo
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { auditPage, type PageAudit } from "./audit.js";
import { renderReport } from "./report.js";

const { values } = parseArgs({
  options: {
    urls: { type: "string" },
    url: { type: "string", multiple: true },
    out: { type: "string", default: "out" },
    chrome: { type: "string" },
    mobile: { type: "boolean", default: false },
  },
});

const urls = [
  ...(values.url ?? []),
  ...(values.urls ? (await readFile(values.urls, "utf8")).split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")) : []),
];
if (!urls.length) throw new Error("Pass --url or --urls");

const browser = await chromium.launch(values.chrome ? { executablePath: values.chrome } : {});
const pages: PageAudit[] = [];
for (const url of urls) {
  try {
    const a = await auditPage(browser, url, values.mobile ? { viewport: { width: 390, height: 844 } } : {});
    pages.push(a);
    console.log(`${a.score.toString().padStart(3)}  ${url}  (${a.findings.length} findings, ${a.axe.length} axe rules)`);
  } catch (err) {
    console.error(`FAILED ${url}: ${err instanceof Error ? err.message : err}`);
  }
}
await browser.close();

await mkdir(join(values.out!, "aria"), { recursive: true });
for (const p of pages) await writeFile(join(values.out!, "aria", `${slug(p.url)}.yml`), p.ariaSnapshot);
const json = { generated_at: new Date().toISOString(), viewport: values.mobile ? "mobile" : "desktop", pages: pages.map(({ ariaSnapshot, ...rest }) => ({ ...rest, aria_snapshot: `aria/${slug(rest.url)}.yml` })) };
await writeFile(join(values.out!, "report.json"), JSON.stringify(json, null, 2));
await writeFile(join(values.out!, "report.md"), renderReport(pages));
console.log(`wrote ${values.out}/report.md`);

function slug(url: string) {
  const p = new URL(url).pathname.replace(/\/$/, "");
  return p ? p.slice(1).replace(/\//g, "__") : "home";
}
