/**
 * Renders llms.txt in the llmstxt.org format:
 *   # Name
 *   > one-paragraph summary
 *   free-form details
 *   ## Section
 *   - [Title](url): description
 *   ## Optional   (secondary content an agent can skip when context is short)
 */
import { mdPath } from "./build.js";
import type { PageDoc, SiteConfig } from "./types.js";

/** Webflow's llms.txt upload limit is 100 KB. Stay under it with margin. */
export const LLMS_TXT_MAX_BYTES = 95_000;

export function renderLlmsTxt(config: SiteConfig, pages: PageDoc[], opts: { mirrorBase?: string; generatedAt: string }): string {
  for (const maxDesc of [220, 160, 110, 70, 0]) {
    const out = render(config, pages, opts, maxDesc);
    if (Buffer.byteLength(out) <= LLMS_TXT_MAX_BYTES) return out;
  }
  throw new Error("llms.txt is over 95 KB even without descriptions. Collapse more sections in the config.");
}

function render(config: SiteConfig, pages: PageDoc[], opts: { mirrorBase?: string; generatedAt: string }, maxDesc: number): string {
  const lines: string[] = [`# ${config.name}`, "", `> ${config.summary}`, ""];
  if (config.facts.length) lines.push(...config.facts.map((f) => `- ${f}`), "");
  if (opts.mirrorBase) {
    const base = opts.mirrorBase.replace(/\/$/, "");
    lines.push(
      `Clean Markdown of every page listed here is at ${base}/md/<path>.md (for example ${base}/md/${mdPath("/services/seo")}). The full text of all pages in one file: ${base}/llms-full.txt`,
      "",
    );
  }

  const line = (p: PageDoc) => {
    const desc = shorten(p.description || firstSentence(p.markdown), maxDesc);
    return `- [${p.title}](${p.url})${desc ? `: ${desc}` : ""}`;
  };

  const optional: string[] = [];
  for (const s of config.sections) {
    const inSection = pages.filter((p) => p.section === s.title);
    if (!inSection.length) continue;
    const block = s.collapse
      ? [`- [${s.collapse.label}](${s.collapse.url}): ${s.collapse.description} (${inSection.length} pages)`]
      : inSection.map(line);
    if (s.optional) optional.push(...block);
    else lines.push(`## ${s.title}`, "", ...block, "");
  }
  const unsorted = pages.filter((p) => !p.section);
  optional.push(...unsorted.map(line));
  if (optional.length) lines.push("## Optional", "", ...optional, "");

  lines.push(`<!-- Generated ${opts.generatedAt} by nativecode-geo/llms from ${config.origin}/sitemap.xml -->`, "");
  return lines.join("\n");
}

export function renderLlmsFull(config: SiteConfig, pages: PageDoc[], opts: { generatedAt: string }): string {
  const order = new Map(config.sections.map((s, i) => [s.title, i]));
  const sorted = [...pages].sort((a, b) => (order.get(a.section ?? "") ?? 99) - (order.get(b.section ?? "") ?? 99) || a.path.localeCompare(b.path));
  const head = [`# ${config.name}`, "", `> ${config.summary}`, "", ...config.facts.map((f) => `- ${f}`), "", `Generated ${opts.generatedAt} from ${config.origin}. ${pages.length} pages.`, ""];
  const body = sorted.map((p) => {
    const md = p.markdown.replace(/^# .*\n+/, "");
    return [`---`, "", `# ${p.title}`, "", `Source: ${p.url}${p.lastmod ? ` (updated ${p.lastmod.slice(0, 10)})` : ""}`, "", md, ""].join("\n");
  });
  return [...head, ...body].join("\n");
}

function shorten(s: string, max: number): string {
  if (max === 0) return "";
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}...`;
}

function firstSentence(md: string): string {
  const text = md
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("|") && !l.startsWith("!"))
    .join(" ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>]/g, "");
  const m = text.match(/^(.{40,240}?[.!?])(\s|$)/);
  return (m ? m[1] : text.slice(0, 200)).trim();
}
