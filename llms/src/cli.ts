/**
 * Usage:
 *   npx tsx src/cli.ts --config nativecode.config.json --out ../public [--mirror-base URL] [--limit N] [--crawl-origin URL]
 */
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { build } from "./build.js";
import type { SiteConfig } from "./types.js";

const { values } = parseArgs({
  options: {
    config: { type: "string", default: "nativecode.config.json" },
    out: { type: "string", default: "out" },
    "mirror-base": { type: "string" },
    "crawl-origin": { type: "string" },
    limit: { type: "string" },
    concurrency: { type: "string", default: "4" },
  },
});

const config = JSON.parse(await readFile(values.config!, "utf8")) as SiteConfig;
const result = await build({
  config,
  outDir: values.out!,
  mirrorBase: values["mirror-base"],
  crawlOrigin: values["crawl-origin"],
  limit: values.limit ? Number(values.limit) : undefined,
  concurrency: Number(values.concurrency),
  log: (m) => console.log(m),
});

const bySection = new Map<string, number>();
for (const p of result.pages) bySection.set(p.section ?? "(unsorted)", (bySection.get(p.section ?? "(unsorted)") ?? 0) + 1);
console.table(Object.fromEntries(bySection));
console.log(`llms.txt ${(result.llmsTxtBytes / 1024).toFixed(1)} KB, llms-full.txt ${(result.llmsFullBytes / 1024).toFixed(1)} KB`);
if (result.skipped.length) console.log(`skipped ${result.skipped.length}: ${[...new Set(result.skipped.map((s) => s.reason))].join("; ")}`);
const unsorted = result.pages.filter((p) => !p.section).map((p) => p.path);
if (unsorted.length) console.log(`not matched by any section (listed under Optional): ${unsorted.join(", ")}`);
