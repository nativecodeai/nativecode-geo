// Browser side of the RAG demo. Same model and the same hybrid ranking as rag/src/store.ts.
const MODEL = "Xenova/all-MiniLM-L6-v2";
const TRANSFORMERS = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
const STOP = new Set("a an the and or of to in on for with is are be by as at it its this that from your you we our do does did can how what which who why when where".split(" "));

const $ = (id) => document.getElementById(id);
const status = (t) => ($("status").textContent = t);
const tokenize = (s) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));

let index = null;
let extractor = null;

async function loadIndex() {
  if (index) return index;
  status("Loading index...");
  const f = await (await fetch("rag/index.json")).json();
  const vecs = f.vectors.map(({ q, s }) => {
    const bytes = Uint8Array.from(atob(q), (c) => c.charCodeAt(0));
    const i8 = new Int8Array(bytes.buffer, 0, f.dims);
    const v = new Float32Array(f.dims);
    for (let i = 0; i < f.dims; i++) v[i] = i8[i] * s;
    return v;
  });
  // BM25 over heading + text, matching the Node implementation.
  const docs = f.chunks.map((c) => {
    const tf = new Map();
    for (const w of tokenize(`${c.heading}\n${c.text}`)) tf.set(w, (tf.get(w) ?? 0) + 1);
    return tf;
  });
  const df = new Map();
  docs.forEach((d) => d.forEach((_, w) => df.set(w, (df.get(w) ?? 0) + 1)));
  const lens = docs.map((d) => [...d.values()].reduce((a, b) => a + b, 0));
  const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
  index = { ...f, vecs, docs, df, lens, avg };
  $("built").textContent = `${new Date(f.created_at).toUTCString().slice(5, 16)} from ${f.chunks.length} chunks`;
  return index;
}

async function embed(text) {
  if (!extractor) {
    status("Downloading the embedding model (first search only)...");
    const { pipeline } = await import(TRANSFORMERS);
    extractor = await pipeline("feature-extraction", MODEL, { dtype: "fp32" });
  }
  const t = await extractor([text], { pooling: "mean", normalize: true });
  return t.data;
}

function bm25(ix, query) {
  const terms = [...new Set(tokenize(query))];
  const N = ix.docs.length;
  return ix.docs.map((tf, i) => {
    let s = 0;
    for (const t of terms) {
      const f = tf.get(t);
      if (!f) continue;
      const d = ix.df.get(t);
      s += (Math.log(1 + (N - d + 0.5) / (d + 0.5)) * f * 2.2) / (f + 1.2 * (0.25 + (0.75 * ix.lens[i]) / ix.avg));
    }
    return s;
  });
}

async function search(query, k = 5) {
  const ix = await loadIndex();
  const qv = await embed(query);
  status("Searching...");
  const dense = ix.vecs.map((v, i) => { let s = 0; for (let j = 0; j < v.length; j++) s += v[j] * qv[j]; return { i, s }; }).sort((a, b) => b.s - a.s);
  const sparseScores = bm25(ix, query);
  const sparse = sparseScores.map((s, i) => ({ i, s })).sort((a, b) => b.s - a.s);
  const dr = new Map(dense.map((x, r) => [x.i, r]));
  const sr = new Map(sparse.map((x, r) => [x.i, r]));
  const ds = new Map(dense.map((x) => [x.i, x.s]));
  const fused = ix.chunks.map((_, i) => ({ i, score: 1 / (60 + dr.get(i)) + (sparseScores[i] > 0 ? 1 / (60 + sr.get(i)) : 0) })).sort((a, b) => b.score - a.score);
  const seen = new Map();
  const hits = [];
  for (const { i } of fused) {
    const c = ix.chunks[i];
    if ((seen.get(c.url) ?? 0) >= 2) continue;
    seen.set(c.url, (seen.get(c.url) ?? 0) + 1);
    hits.push({ c, dense: ds.get(i), sparse: sparseScores[i] });
    if (hits.length === k) break;
  }
  return hits;
}

const esc = (s) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
function highlight(text, query) {
  const terms = tokenize(query).filter((t) => t.length > 2);
  let html = esc(text.length > 700 ? `${text.slice(0, 700)}...` : text);
  for (const t of terms) html = html.replace(new RegExp(`\\b(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w*)`, "gi"), "<mark>$1</mark>");
  return html;
}

async function run(query) {
  $("go").disabled = true;
  $("results").innerHTML = "";
  try {
    const t0 = performance.now();
    const hits = await search(query);
    $("results").innerHTML = hits
      .map((h, n) => `<article class="hit"><h3>[${n + 1}] <a href="${esc(h.c.url)}">${esc(h.c.heading)}</a></h3><div class="meta">cosine ${h.dense.toFixed(3)} · bm25 ${h.sparse.toFixed(2)}</div><p>${highlight(h.c.text, query)}</p></article>`)
      .join("");
    status(`${hits.length} passages in ${Math.round(performance.now() - t0)} ms. These are what a model would be given to answer from; the CLI (npm run ask) sends them to Claude for a cited answer.`);
  } catch (err) {
    status(`Search failed: ${err.message}`);
  } finally {
    $("go").disabled = false;
  }
}

$("form").addEventListener("submit", (e) => { e.preventDefault(); run($("q").value.trim()); });
document.querySelectorAll(".chips button").forEach((b) => b.addEventListener("click", () => { $("q").value = b.textContent; run(b.textContent); }));
loadIndex().then(() => status("Index loaded. Ask a question.")).catch(() => status("Index not built yet. Run the pipeline."));
