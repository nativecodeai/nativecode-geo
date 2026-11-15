/**
 * Generation step. With ANTHROPIC_API_KEY set, retrieved passages go to Claude
 * with instructions to answer only from them and cite by number. Without a
 * key, the answer is extractive: the best-matching passages, quoted with sources.
 */
import type { Hit } from "./store.js";

export interface Answer {
  answer: string;
  sources: { n: number; title: string; url: string; heading: string }[];
  mode: "claude" | "extractive";
  model?: string;
}

export function buildPrompt(question: string, hits: Hit[]): string {
  const context = hits.map((h, i) => `[${i + 1}] ${h.chunk.heading}\nURL: ${h.chunk.url}\n${h.chunk.text}`).join("\n\n---\n\n");
  return [
    "Answer the question using only the numbered passages from nativecode.ai below.",
    "Cite passages inline like [1] or [2][3]. If the passages do not contain the answer, say what is missing instead of guessing.",
    "Keep the answer under 150 words, in plain prose.",
    "",
    "<passages>",
    context,
    "</passages>",
    "",
    `Question: ${question}`,
  ].join("\n");
}

export async function answer(
  question: string,
  hits: Hit[],
  opts: { apiKey?: string; model?: string; fetchImpl?: typeof fetch } = {},
): Promise<Answer> {
  const sources = hits.map((h, i) => ({ n: i + 1, title: h.chunk.title, url: h.chunk.url, heading: h.chunk.heading }));
  if (!hits.length) return { answer: "Nothing in the indexed content matches that question.", sources, mode: "extractive" };

  if (opts.apiKey) {
    const model = opts.model ?? "claude-haiku-5-5";
    const res = await (opts.fetchImpl ?? fetch)("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": opts.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 500, messages: [{ role: "user", content: buildPrompt(question, hits) }] }),
    });
    if (!res.ok) throw new Error(`Anthropic API returned ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { content: { type: string; text?: string }[] };
    return { answer: body.content.filter((c) => c.type === "text").map((c) => c.text).join("").trim(), sources, mode: "claude", model };
  }

  const top = hits.slice(0, 3).map((h, i) => `[${i + 1}] ${firstSentences(h.chunk.text, 2)}`);
  return { answer: top.join("\n"), sources, mode: "extractive" };
}

function firstSentences(text: string, n: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const parts = flat.match(/[^.!?]+[.!?]+/g) ?? [flat];
  return parts.slice(0, n).map((p) => p.trim()).join(" ");
}
