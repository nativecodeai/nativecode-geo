/**
 * Crawl a site from its sitemap and write:
 *   llms.txt          curated index for LLMs (llmstxt.org format, under 100 KB for Webflow)
 *   llms-full.txt     every included page's Markdown in one file
 *   md/<path>.md      one clean Markdown file per page, with front matter
 *   manifest.json     what was crawled, skipped and why
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import * as cheerio from "cheerio";
import { extract } from "./extract.js";
import { renderLlmsFull, renderLlmsTxt } from "./render.js";
import type { PageDoc, SiteConfig, SitemapEntry } from "./types.js";

export const USER_AGENT = "NativeCodeLLMsBuilder/0.1 (+https://github.com/nativecodeai/nativecode-geo)";

export interface BuildOptions {
  config: SiteConfig;
  outDir: string;
  /** Where the Markdown mirror is served from, e.g. https://nativecodeai.github.io/nativecode-geo */
  mirrorBase?: string;
  /** Override the origin that is crawled (for tests or staging). Output links still use config.origin. */
  crawlOrigin?: string;
  concurrency?: number;
  limit?: number;
  fetchImpl?: typeof fetch;
  log?: (msg: string) => void;
}

export interface BuildResult {
  pages: PageDoc[];
  skipped: { url: string; reason: string }[];
  llmsTxtBytes: number;
  llmsFullBytes: number;
}

export async function build(opts: BuildOptions): Promise<BuildResult> {
  const { config } = opts;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const log = opts.log ?? (() => {});
  const crawlOrigin = (opts.crawlOrigin ?? config.origin).replace(/\/$/, "");
  const toCrawl = (u: string) => u.replace(config.origin, crawlOrigin);
  const toCanonical = (u: string) => u.replace(crawlOrigin, config.origin);

  const entries = await readSitemap(`${crawlOrigin}/sitemap.xml`, fetchImpl);
  log(`sitemap: ${entries.length} URLs`);

  const skipped: BuildResult["skipped"] = [];
  const queue = entries
    .map((e) => ({ ...e, url: toCanonical(e.url) }))
    .filter((e) => {
      const path = pathOf(e.url);
      const rule = config.exclude.find((x) => new RegExp(x).test(path));
      if (rule) skipped.push({ url: e.url, reason: `excluded by ${rule}` });
      return !rule;
    })
    .slice(0, opts.limit ?? Infinity);

  const pages: PageDoc[] = [];
  let i = 0;
  const worker = async () => {
    while (i < queue.length) {
      const entry = queue[i++];
      try {
        const res = await fetchImpl(toCrawl(entry.url), { headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, redirect: "follow" });
        if (!res.ok) {
          skipped.push({ url: entry.url, reason: `HTTP ${res.status}` });
          continue;
        }
        const x = extract(await res.text(), entry.url, config.stripSelectors, config.contentSelector);
        if (x.noindex) {
          skipped.push({ url: entry.url, reason: "noindex" });
          continue;
        }
        const path = pathOf(entry.url);
        const rule = config.sections.find((s) => new RegExp(s.match).test(path));
        pages.push({
          url: entry.url,
          path,
          lastmod: entry.lastmod,
          title: stripBrand(x.title, config.name) || x.h1 || path,
          description: x.description,
          h1: x.h1,
          markdown: x.markdown,
          wordCount: x.wordCount,
          section: rule?.title ?? null,
          optional: Boolean(rule?.optional),
          status: res.status,
          noindex: false,
        });
      } catch (err) {
        skipped.push({ url: entry.url, reason: `fetch failed: ${err instanceof Error ? err.message : String(err)}` });
      }
    }
  };
  await Promise.all(Array.from({ length: opts.concurrency ?? 4 }, worker));
  pages.sort((a, b) => a.path.localeCompare(b.path));
  log(`pages: ${pages.length} converted, ${skipped.length} skipped`);

  const generatedAt = new Date().toISOString();
  const llmsTxt = renderLlmsTxt(config, pages, { mirrorBase: opts.mirrorBase, generatedAt });
  const llmsFull = renderLlmsFull(config, pages, { generatedAt });

  await mkdir(opts.outDir, { recursive: true });
  await writeFile(join(opts.outDir, "llms.txt"), llmsTxt);
  await writeFile(join(opts.outDir, "llms-full.txt"), llmsFull);
  for (const p of pages) {
    const file = join(opts.outDir, "md", mdPath(p.path));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, pageMarkdown(p, generatedAt));
  }
  await writeFile(
    join(opts.outDir, "manifest.json"),
    JSON.stringify(
      {
        site: config.origin,
        generated_at: generatedAt,
        pages: pages.map((p) => ({ url: p.url, md: `md/${mdPath(p.path)}`, title: p.title, section: p.section, words: p.wordCount, lastmod: p.lastmod })),
        skipped,
      },
      null,
      2,
    ),
  );

  return { pages, skipped, llmsTxtBytes: Buffer.byteLength(llmsTxt), llmsFullBytes: Buffer.byteLength(llmsFull) };
}

export async function readSitemap(url: string, fetchImpl: typeof fetch, depth = 0): Promise<SitemapEntry[]> {
  const res = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Sitemap ${url} returned HTTP ${res.status}`);
  const $ = cheerio.load(await res.text(), { xml: true });
  const nested = $("sitemapindex > sitemap > loc").map((_, el) => $(el).text().trim()).get();
  if (nested.length && depth < 2) {
    return (await Promise.all(nested.map((u) => readSitemap(u, fetchImpl, depth + 1)))).flat();
  }
  return $("urlset > url")
    .map((_, el) => ({ url: $(el).find("loc").text().trim(), lastmod: $(el).find("lastmod").text().trim() || undefined }))
    .get()
    .filter((e) => e.url);
}

export function pathOf(url: string): string {
  const p = new URL(url).pathname.replace(/\/$/, "");
  return p === "" ? "/" : p;
}

/** "/" -> index.md, "/services/seo" -> services/seo.md */
export function mdPath(path: string): string {
  return path === "/" ? "index.md" : `${path.slice(1)}.md`;
}

function stripBrand(title: string, brand: string): string {
  return title.replace(new RegExp(`\\s*[|\\-:]\\s*${brand}\\s*$`, "i"), "").trim();
}

function pageMarkdown(p: PageDoc, generatedAt: string): string {
  const fm = [
    "---",
    `title: ${JSON.stringify(p.title)}`,
    `url: ${p.url}`,
    p.description ? `description: ${JSON.stringify(p.description)}` : null,
    p.lastmod ? `last_modified: ${p.lastmod}` : null,
    `converted_at: ${generatedAt}`,
    "---",
  ].filter(Boolean);
  const body = p.markdown.startsWith("# ") ? p.markdown : `# ${p.h1 || p.title}\n\n${p.markdown}`;
  return `${fm.join("\n")}\n\n${body}\n`;
}
