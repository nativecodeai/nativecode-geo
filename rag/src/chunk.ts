/**
 * Splits Markdown pages into retrieval chunks along heading boundaries.
 * Each chunk keeps its page title, URL and heading path, so a retrieved
 * passage can be cited and understood on its own.
 */

export interface Chunk {
  id: string;
  url: string;
  title: string;
  /** e.g. "SEO services > What is included" */
  heading: string;
  text: string;
  words: number;
}

export interface ChunkOptions {
  /** Target size. Sections longer than max are split on paragraph boundaries. */
  maxWords?: number;
  /** Sections shorter than this are merged into the next one under the same parent. */
  minWords?: number;
}

export function parseFrontMatter(md: string): { meta: Record<string, string>; body: string } {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: md };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const raw = line.slice(i + 1).trim();
    meta[line.slice(0, i).trim()] = raw.startsWith('"') ? JSON.parse(raw) : raw;
  }
  return { meta, body: md.slice(m[0].length) };
}

export function chunkPage(md: string, opts: ChunkOptions = {}): Chunk[] {
  const maxWords = opts.maxWords ?? 220;
  const minWords = opts.minWords ?? 40;
  const { meta, body } = parseFrontMatter(md);
  const url = meta.url ?? "";
  const title = meta.title ?? body.match(/^# (.*)$/m)?.[1] ?? url;

  // 1. Sections by heading, tracking the heading path.
  const sections: { path: string[]; text: string }[] = [];
  const path: string[] = [];
  let buf: string[] = [];
  const flush = () => {
    const text = buf.join("\n").trim();
    if (text) sections.push({ path: [...path], text });
    buf = [];
  };
  for (const line of body.split("\n")) {
    const h = line.match(/^(#{1,4}) (.*)$/);
    if (h) {
      flush();
      const level = h[1].length;
      path.splice(level - 1);
      path[level - 1] = clean(h[2]);
      continue;
    }
    buf.push(line);
  }
  flush();

  // 2. Merge tiny sections forward, split large ones by paragraph.
  const merged: { path: string[]; text: string }[] = [];
  for (const s of sections) {
    const prev = merged[merged.length - 1];
    if (prev && countWords(prev.text) < minWords && prev.path[0] === s.path[0]) {
      prev.text += `\n\n${s.path.length > (prev.path.length || 1) ? `${s.path[s.path.length - 1]}: ` : ""}${s.text}`;
      continue;
    }
    merged.push({ ...s });
  }

  const chunks: Chunk[] = [];
  for (const s of merged) {
    for (const piece of splitByParagraph(s.text, maxWords)) {
      const text = stripMarkdown(piece);
      const words = countWords(text);
      if (words < 8) continue;
      const heading = [title, ...s.path.filter((p, i) => !(i === 0 && p === title))].filter(Boolean).join(" > ");
      chunks.push({ id: `${url}#${chunks.length}`, url, title, heading, text, words });
    }
  }
  return chunks;
}

function splitByParagraph(text: string, maxWords: number): string[] {
  const paras = text.split(/\n{2,}/);
  const out: string[] = [];
  let cur: string[] = [];
  let n = 0;
  for (const p of paras) {
    const w = countWords(p);
    if (n + w > maxWords && cur.length) {
      out.push(cur.join("\n\n"));
      // Carry the last paragraph forward for context when it is short.
      const last = cur[cur.length - 1];
      cur = countWords(last) < 60 ? [last] : [];
      n = cur.length ? countWords(last) : 0;
    }
    cur.push(p);
    n += w;
  }
  if (cur.length) out.push(cur.join("\n\n"));
  return out;
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\|?\s*-{3,}.*$/gm, "")
    .replace(/\|/g, " ")
    .replace(/[*_`>#]/g, "")
    .replace(/^\s*[-+]\s+/gm, "- ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const clean = (s: string) => stripMarkdown(s).replace(/\s+/g, " ");
export const countWords = (s: string) => s.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
