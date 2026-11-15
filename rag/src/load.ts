import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { chunkPage, type Chunk } from "./chunk.js";
import { HashingEmbedder, MiniLmEmbedder, type Embedder } from "./embed.js";

export async function* walkMarkdown(dir: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walkMarkdown(p);
    else if (e.name.endsWith(".md")) yield p;
  }
}

export async function chunkDirectory(dir: string): Promise<Chunk[]> {
  const files: string[] = [];
  for await (const f of walkMarkdown(dir)) files.push(f);
  files.sort();
  const chunks: Chunk[] = [];
  for (const f of files) chunks.push(...chunkPage(await readFile(f, "utf8")));
  return chunks;
}

export function embedderFor(name: string): Embedder {
  if (name === "hashing" || name === "hashing-384") return new HashingEmbedder();
  return new MiniLmEmbedder();
}
