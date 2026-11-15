/**
 * Ask a question against the index.
 *   npx tsx src/cli-ask.ts "Does NativeCode build Shopify stores?" [--index ../public/rag/index.json] [--k 5] [--json]
 * Set ANTHROPIC_API_KEY for a generated, cited answer; otherwise the answer is extractive.
 */
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { answer } from "./answer.js";
import { embedderFor } from "./load.js";
import { VectorStore, type IndexFile } from "./store.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    index: { type: "string", default: "../public/rag/index.json" },
    k: { type: "string", default: "5" },
    mode: { type: "string", default: "hybrid" },
    json: { type: "boolean", default: false },
  },
});
const question = positionals.join(" ").trim();
if (!question) {
  console.error('Usage: npm run ask -- "your question"');
  process.exit(1);
}

const file = JSON.parse(await readFile(values.index!, "utf8")) as IndexFile;
const store = VectorStore.fromJSON(file);
const [qv] = await embedderFor(file.model).embed([question]);
const hits = store.search(qv, question, Number(values.k), { mode: values.mode as "hybrid" });
const result = await answer(question, hits, { apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL });

if (values.json) {
  console.log(JSON.stringify({ question, ...result, hits: hits.map((h) => ({ heading: h.chunk.heading, url: h.chunk.url, score: h.score, dense: h.dense, sparse: h.sparse })) }, null, 2));
} else {
  console.log(`\n${result.answer}\n`);
  for (const s of result.sources) console.log(`[${s.n}] ${s.heading}\n    ${s.url}`);
  console.log(`\n(${result.mode}${result.model ? `, ${result.model}` : ""}; retrieval: ${values.mode}, ${file.model}, ${store.chunks.length} chunks)`);
}
