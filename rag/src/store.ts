/**
 * A small vector store with hybrid retrieval.
 *
 * - Dense: cosine similarity over normalized embeddings (int8-quantized on disk).
 * - Sparse: BM25 over the same chunks, which catches exact terms (product
 *   names, "llms.txt", "X12") that small embedding models blur.
 * - Fusion: reciprocal rank fusion of both lists, then a per-page cap so one
 *   long page cannot fill every slot.
 *
 * The saved index is plain JSON so the browser demo can load the same file.
 */
import type { Chunk } from "./chunk.js";
import { tokenize } from "./embed.js";

export interface IndexFile {
  version: 1;
  model: string;
  dims: number;
  created_at: string;
  source: string;
  chunks: Omit<Chunk, "words">[];
  /** base64 int8 vectors, one per chunk, with a per-vector scale. */
  vectors: { q: string; s: number }[];
}

export interface Hit {
  chunk: Omit<Chunk, "words">;
  score: number;
  dense: number;
  sparse: number;
}

export class VectorStore {
  private readonly vecs: Float32Array[];
  private readonly bm25: Bm25;

  constructor(
    readonly chunks: Omit<Chunk, "words">[],
    vectors: Float32Array[],
    readonly model: string,
  ) {
    if (chunks.length !== vectors.length) throw new Error("chunks and vectors differ in length");
    this.vecs = vectors;
    this.bm25 = new Bm25(chunks.map((c) => `${c.heading}\n${c.text}`));
  }

  search(queryVec: Float32Array, queryText: string, k = 5, opts: { perPage?: number; mode?: "hybrid" | "dense" | "sparse" } = {}): Hit[] {
    const mode = opts.mode ?? "hybrid";
    const dense = this.vecs.map((v, i) => ({ i, s: dot(v, queryVec) })).sort((a, b) => b.s - a.s);
    const sparse = this.bm25.scores(queryText).map((s, i) => ({ i, s })).sort((a, b) => b.s - a.s);
    const denseRank = new Map(dense.map((x, r) => [x.i, r]));
    const sparseRank = new Map(sparse.map((x, r) => [x.i, r]));
    const denseScore = new Map(dense.map((x) => [x.i, x.s]));
    const sparseScore = new Map(sparse.map((x) => [x.i, x.s]));

    const K = 60;
    const fused = this.chunks.map((_, i) => {
      const d = 1 / (K + denseRank.get(i)!);
      const sp = sparseScore.get(i)! > 0 ? 1 / (K + sparseRank.get(i)!) : 0;
      const score = mode === "dense" ? denseScore.get(i)! : mode === "sparse" ? sparseScore.get(i)! : d + sp;
      return { i, score };
    });
    fused.sort((a, b) => b.score - a.score);

    const perPage = opts.perPage ?? 2;
    const seen = new Map<string, number>();
    const hits: Hit[] = [];
    for (const { i, score } of fused) {
      const c = this.chunks[i];
      const n = seen.get(c.url) ?? 0;
      if (n >= perPage) continue;
      seen.set(c.url, n + 1);
      hits.push({ chunk: c, score, dense: round(denseScore.get(i)!), sparse: round(sparseScore.get(i)!) });
      if (hits.length === k) break;
    }
    return hits;
  }

  toJSON(source: string): IndexFile {
    return {
      version: 1,
      model: this.model,
      dims: this.vecs[0]?.length ?? 0,
      created_at: new Date().toISOString(),
      source,
      chunks: this.chunks,
      vectors: this.vecs.map(quantize),
    };
  }

  static fromJSON(f: IndexFile): VectorStore {
    return new VectorStore(f.chunks, f.vectors.map((v) => dequantize(v, f.dims)), f.model);
  }
}

/** Okapi BM25 with k1=1.2, b=0.75. */
export class Bm25 {
  private readonly docs: Map<string, number>[];
  private readonly lens: number[];
  private readonly avg: number;
  private readonly df = new Map<string, number>();

  constructor(texts: string[]) {
    this.docs = texts.map((t) => {
      const tf = new Map<string, number>();
      for (const w of tokenize(t)) tf.set(w, (tf.get(w) ?? 0) + 1);
      for (const w of tf.keys()) this.df.set(w, (this.df.get(w) ?? 0) + 1);
      return tf;
    });
    this.lens = this.docs.map((d) => [...d.values()].reduce((a, b) => a + b, 0));
    this.avg = this.lens.reduce((a, b) => a + b, 0) / Math.max(1, this.lens.length);
  }

  scores(query: string): number[] {
    const terms = [...new Set(tokenize(query))];
    const N = this.docs.length;
    return this.docs.map((tf, i) => {
      let s = 0;
      for (const t of terms) {
        const f = tf.get(t);
        if (!f) continue;
        const idf = Math.log(1 + (N - this.df.get(t)! + 0.5) / (this.df.get(t)! + 0.5));
        s += (idf * f * 2.2) / (f + 1.2 * (0.25 + (0.75 * this.lens[i]) / this.avg));
      }
      return s;
    });
  }
}

export function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function quantize(v: Float32Array): { q: string; s: number } {
  let max = 0;
  for (const x of v) max = Math.max(max, Math.abs(x));
  const s = max / 127 || 1;
  const q = new Int8Array(v.length);
  for (let i = 0; i < v.length; i++) q[i] = Math.round(v[i] / s);
  return { q: Buffer.from(q.buffer).toString("base64"), s };
}

function dequantize(v: { q: string; s: number }, dims: number): Float32Array {
  const bytes = Buffer.from(v.q, "base64");
  const q = new Int8Array(bytes.buffer, bytes.byteOffset, dims);
  const out = new Float32Array(dims);
  for (let i = 0; i < dims; i++) out[i] = q[i] * v.s;
  return out;
}

const round = (x: number) => Math.round(x * 1000) / 1000;
