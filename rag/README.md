# RAG over NativeCode content

Retrieval-augmented generation over the Markdown mirror that `llms/` produces.

1. **Chunking** (`src/chunk.ts`): splits each page on headings, merges sections under 40 words into their neighbor, splits sections over 220 words on paragraph boundaries with one short paragraph of overlap, and keeps the page title, URL and heading path on every chunk.
2. **Embeddings** (`src/embed.ts`): `all-MiniLM-L6-v2` (384 dimensions) through transformers.js, mean-pooled and normalized. The browser demo loads the same model, so query and index vectors match.
3. **Vector store** (`src/store.ts`): an int8-quantized flat index saved as JSON. Retrieval fuses cosine similarity with BM25 by reciprocal rank fusion, so exact terms that small embedding models blur still match, and caps passages at two per page.
4. **Generation** (`src/answer.ts`): with `ANTHROPIC_API_KEY` set, the top passages go to Claude with instructions to answer only from them and cite by number. Without a key, the answer is extractive.

```bash
npm install
npm test                                  # uses a dependency-free hashing embedder
npm run index -- --md ../public/md --out ../public/rag/index.json
npm run ask -- "Does NativeCode migrate stores from WooCommerce to Shopify?"
ANTHROPIC_API_KEY=... npm run ask -- "How does NativeCode get a brand cited in AI answers?"
```

Live retrieval demo (runs in your browser): https://nativecodeai.github.io/nativecode-geo/
