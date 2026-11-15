import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { answer, buildPrompt } from "../src/answer.js";
import { chunkPage } from "../src/chunk.js";
import { HashingEmbedder } from "../src/embed.js";
import { chunkDirectory } from "../src/load.js";
import { Bm25, VectorStore } from "../src/store.js";

const dir = fileURLToPath(new URL("./fixture-md", import.meta.url));
const embedder = new HashingEmbedder();

async function store() {
  const chunks = await chunkDirectory(dir);
  const vecs = await embedder.embed(chunks.map((c) => `${c.heading}\n${c.text}`));
  return new VectorStore(chunks.map(({ words, ...c }) => c), vecs, embedder.name);
}
async function search(s: VectorStore, q: string, k = 3) {
  const [v] = await embedder.embed([q]);
  return s.search(v, q, k);
}

describe("RAG pipeline", () => {
  test("chunks keep title, URL and heading path, without Markdown syntax", () => {
    const md = "---\ntitle: \"Page\"\nurl: https://x.test/p\n---\n\n# Page\n\nIntro paragraph with enough words to stand alone as a chunk of text here.\n\n## Section A\n\nThe **section** has a [link](https://x.test/l) and more words to pass the minimum size threshold easily.";
    const chunks = chunkPage(md, { minWords: 5 });
    assert.equal(chunks[0].url, "https://x.test/p");
    assert.equal(chunks[1].heading, "Page > Section A");
    assert.doesNotMatch(chunks[1].text, /\*\*|\]\(/);
  });

  test("long sections split on paragraphs under the word cap", () => {
    const para = "word ".repeat(90).trim();
    const md = `---\nurl: https://x.test/p\n---\n# P\n\n${[para, para, para, para].join("\n\n")}`;
    const chunks = chunkPage(md, { maxWords: 200 });
    assert.ok(chunks.length >= 2);
    assert.ok(chunks.every((c) => c.words <= 200));
  });

  test("retrieves the right page for exact and paraphrased questions", async () => {
    const s = await store();
    assert.match((await search(s, "how long does a shopify store build take"))[0].chunk.url, /shopify-development/);
    assert.match((await search(s, "what is llms.txt"))[0].chunk.url, /llms-txt/);
    assert.match((await search(s, "generative engine optimization crawler access"))[0].chunk.heading, /Generative engine optimization/);
    assert.match((await search(s, "how do I reach the team by email"))[0].chunk.url, /contact/);
  });

  test("caps passages per page so one page cannot fill every slot", async () => {
    const s = await store();
    const hits = await search(s, "AI SEO answer engine generative engine", 4);
    const perUrl = new Map<string, number>();
    for (const h of hits) perUrl.set(h.chunk.url, (perUrl.get(h.chunk.url) ?? 0) + 1);
    assert.ok([...perUrl.values()].every((n) => n <= 2));
  });

  test("index survives a save and load with int8 quantization", async () => {
    const s = await store();
    const loaded = VectorStore.fromJSON(JSON.parse(JSON.stringify(s.toJSON("test"))));
    const q = "migrations from magento with redirect mapping";
    assert.equal((await search(loaded, q))[0].chunk.id, (await search(s, q))[0].chunk.id);
  });

  test("BM25 ranks documents containing rare query terms first", () => {
    const b = new Bm25(["shopify stores and themes", "x12 edi integration for suppliers", "email marketing flows"]);
    const sc = b.scores("edi x12");
    assert.equal(sc.indexOf(Math.max(...sc)), 1);
    assert.equal(sc[0], 0);
  });

  test("extractive answer cites sources without an API key", async () => {
    const s = await store();
    const hits = await search(s, "What is answer engine optimization?");
    const a = await answer("What is answer engine optimization?", hits);
    assert.equal(a.mode, "extractive");
    assert.match(a.answer, /^\[1\] /);
    assert.equal(a.sources.length, hits.length);
  });

  test("Claude mode sends numbered passages and returns the model's cited answer", async () => {
    const s = await store();
    const hits = await search(s, "Do you handle WooCommerce migrations?");
    let sent: any;
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ content: [{ type: "text", text: "Yes, including redirect mapping [1]." }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const a = await answer("Do you handle WooCommerce migrations?", hits, { apiKey: "test-key", fetchImpl: fakeFetch });
    assert.equal(a.mode, "claude");
    assert.equal(a.answer, "Yes, including redirect mapping [1].");
    assert.match(sent.messages[0].content, /\[1\] Shopify development/);
    assert.match(buildPrompt("q", hits), /answer the question using only the numbered passages/i);
  });
});
