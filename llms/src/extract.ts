/**
 * HTML to clean Markdown. Strips site chrome (header, nav, footer, forms,
 * scripts, decorative SVG), keeps the main content, and appends FAQ pairs
 * from FAQPage JSON-LD that are not already visible in the body.
 */
import * as cheerio from "cheerio";
import TurndownService from "turndown";
// @ts-expect-error no types published
import { gfm } from "turndown-plugin-gfm";

export interface Extracted {
  title: string;
  description: string;
  canonical: string | null;
  h1: string;
  markdown: string;
  wordCount: number;
  noindex: boolean;
}

const ALWAYS_STRIP = [
  "script",
  "style",
  "noscript",
  "template",
  "iframe",
  "svg",
  "form",
  "header",
  "footer",
  "nav",
  '[role="banner"]',
  '[role="navigation"]',
  '[role="contentinfo"]',
  '[aria-hidden="true"]',
  ".w-condition-invisible",
  ".w-dyn-hide",
  ".w-dyn-empty",
];

export function extract(html: string, pageUrl: string, stripSelectors: string[] = [], contentSelector?: string, dropPatterns: string[] = []): Extracted {
  const $ = cheerio.load(html);
  const title = clean($("title").first().text());
  const description = clean($('meta[name="description"]').attr("content") ?? $('meta[property="og:description"]').attr("content") ?? "");
  const canonical = $('link[rel="canonical"]').attr("href") ?? null;
  const robots = ($('meta[name="robots"]').attr("content") ?? "").toLowerCase();
  const faq = faqFromJsonLd($);

  $([...ALWAYS_STRIP, ...stripSelectors].join(",")).remove();

  let root = $("main").first();
  if (!root.length && contentSelector) root = $(contentSelector).first();
  if (!root.length) root = $("body");

  // Resolve relative links and images so the Markdown stands on its own.
  root.find("a[href]").each((_, el) => {
    const href = $(el).attr("href")!;
    // In-page anchors are calls to action (jump to a form) or menus; they carry no content.
    if (href.startsWith("#") || href.startsWith("javascript:")) return void $(el).remove();
    try {
      $(el).attr("href", new URL(href, pageUrl).toString());
    } catch {
      /* leave malformed links alone */
    }
  });
  root.find("img").each((_, el) => {
    const alt = $(el).attr("alt")?.trim();
    if (!alt) return void $(el).remove(); // decorative
    const src = $(el).attr("src");
    if (src) $(el).attr("src", new URL(src, pageUrl).toString());
  });

  const h1 = clean(root.find("h1").first().text());
  let markdown = toMarkdown(root.html() ?? "");
  for (const p of dropPatterns) markdown = markdown.replace(new RegExp(p, "gm"), "");
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

  const missingFaq = faq.filter((q) => !markdown.toLowerCase().includes(q.question.toLowerCase().slice(0, 40)));
  if (missingFaq.length) {
    markdown += "\n\n## Frequently asked questions\n\n" + missingFaq.map((q) => `### ${q.question}\n\n${q.answer}`).join("\n\n");
  }

  return {
    title,
    description,
    canonical,
    h1,
    markdown,
    wordCount: markdown.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length,
    noindex: robots.includes("noindex"),
  };
}

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced", emDelimiter: "*" });
turndown.use(gfm);
// Layout wrappers carry no meaning; keep only their text flow.
turndown.addRule("flatten-buttons", { filter: ["button"], replacement: (content) => content });

function toMarkdown(html: string): string {
  return turndown
    .turndown(html)
    .replace(/ /g, " ")
    .replace(/^(\s*)([-*]|\d+\.)\s{2,}/gm, "$1$2 ")
    .replace(/\)\[/g, ") [")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^(#{1,6} .*)\n(?!\n)/gm, "$1\n\n")
    .trim();
}

function faqFromJsonLd($: cheerio.CheerioAPI): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    let data: unknown;
    try {
      data = JSON.parse($(el).text());
    } catch {
      return;
    }
    const nodes: any[] = [];
    const walk = (n: any) => {
      if (!n || typeof n !== "object") return;
      if (Array.isArray(n)) return n.forEach(walk);
      nodes.push(n);
      if (n["@graph"]) walk(n["@graph"]);
    };
    walk(data);
    for (const n of nodes) {
      const types = ([] as string[]).concat(n["@type"] ?? []);
      if (!types.includes("FAQPage")) continue;
      for (const q of [].concat(n.mainEntity ?? [])) {
        const question = clean((q as any)?.name ?? "");
        const answer = clean(cheerio.load(String((q as any)?.acceptedAnswer?.text ?? "")).text());
        if (question && answer) out.push({ question, answer });
      }
    }
  });
  return out;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
