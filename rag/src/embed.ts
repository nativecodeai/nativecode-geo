/**
 * Embedders. MiniLM (all-MiniLM-L6-v2, 384 dimensions) runs locally through
 * transformers.js, the same library the browser demo uses, so index and
 * query vectors come from an identical model. The hashing embedder is a
 * dependency-free fallback for offline tests.
 */

export interface Embedder {
  readonly name: string;
  readonly dims: number;
  embed(texts: string[]): Promise<Float32Array[]>;
}

export const MINILM = "Xenova/all-MiniLM-L6-v2";

export class MiniLmEmbedder implements Embedder {
  readonly name = MINILM;
  readonly dims = 384;
  private pipe: Promise<any> | null = null;

  async embed(texts: string[]): Promise<Float32Array[]> {
    this.pipe ??= import("@huggingface/transformers").then((t) => t.pipeline("feature-extraction", MINILM, { dtype: "fp32" }));
    const extractor = await this.pipe;
    const out: Float32Array[] = [];
    for (let i = 0; i < texts.length; i += 32) {
      const batch = texts.slice(i, i + 32);
      const tensor = await extractor(batch, { pooling: "mean", normalize: true });
      const data = tensor.data as Float32Array;
      for (let j = 0; j < batch.length; j++) out.push(data.slice(j * this.dims, (j + 1) * this.dims));
    }
    return out;
  }
}

/** Feature-hashed unigrams and bigrams, L2-normalized. Lexical, not semantic: tests only. */
export class HashingEmbedder implements Embedder {
  readonly name = "hashing-384";
  readonly dims = 384;

  async embed(texts: string[]): Promise<Float32Array[]> {
    return texts.map((t) => {
      const v = new Float32Array(this.dims);
      const toks = tokenize(t);
      const grams = [...toks, ...toks.slice(1).map((w, i) => `${toks[i]}_${w}`)];
      for (const g of grams) {
        const h = fnv1a(g);
        v[h % this.dims] += h & 0x80000000 ? -1 : 1;
      }
      return normalize(v);
    });
  }
}

export function normalize(v: Float32Array): Float32Array {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}

const STOP = new Set("a an the and or of to in on for with is are be by as at it its this that from your you we our do does did can how what which who why when where".split(" "));
export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
