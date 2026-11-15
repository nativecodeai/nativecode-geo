/**
 * Build the vector index from the Markdown mirror.
 *   npx tsx src/cli-index.ts --md ../public/md --out ../public/rag/index.json [--embedder minilm|hashing]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { chunkDirectory, embedderFor } from "./load.js";
import { VectorStore } from "./store.js";

const { values } = parseArgs({
  options: {
    md: { type: "string", default: "../public/md" },
    out: { type: "string", default: "../public/rag/index.json" },
    embedder: { type: "string", default: "minilm" },
    source: { type: "string", default: "https://www.nativecode.ai" },
  },
});

const t0 = Date.now();
const chunks = await chunkDirectory(values.md!);
console.log(`chunks: ${chunks.length} from ${new Set(chunks.map((c) => c.url)).size} pages (median ${median(chunks.map((c) => c.words))} words)`);
const embedder = embedderFor(values.embedder!);
const vectors = await embedder.embed(chunks.map((c) => `${c.heading}\n${c.text}`));
const store = new VectorStore(chunks.map(({ words, ...c }) => c), vectors, embedder.name);
await mkdir(dirname(values.out!), { recursive: true });
const json = JSON.stringify(store.toJSON(values.source!));
await writeFile(values.out!, json);
console.log(`index: ${values.out} (${(json.length / 1024).toFixed(0)} KB, ${embedder.name}, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}
