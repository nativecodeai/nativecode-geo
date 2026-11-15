# NativeCode GEO engineering

LLM-native infrastructure from [NativeCode](https://www.nativecode.ai) for Generative Engine Optimization: tools that let AI models and agents read, measure and navigate a website.

**Live demo:** https://nativecodeai.github.io/nativecode-geo/

| Artifact | Folder | What it does |
|---|---|---|
| NativeCode Audit MCP server | [`mcp-server/`](mcp-server/) | Lets Claude and other MCP clients run live SEO, AEO and GEO audits through [app.nativecode.ai](https://app.nativecode.ai) |
| llms.txt and LLM-native endpoints | [`llms/`](llms/) | Crawls nativecode.ai and writes llms.txt, llms-full.txt and a clean Markdown copy of every page |
| RAG prototype | [`rag/`](rag/) | Embeds the Markdown copy into a vector store and answers questions from it with citations |
| Agentic DOM audit | [`agentic-dom/`](agentic-dom/) | Measures how well browser agents and screen readers can perceive and operate each page template |

A GitHub Actions [pipeline](.github/workflows/geo-pipeline.yml) runs every test suite, then rebuilds all four against the live site every Monday and on each push, and publishes the results to GitHub Pages. 43 tests in total.

## 1. NativeCode Audit MCP server

NativeCode Audit crawls a site and scores 30 factors across technical SEO, answer engine readiness and generative engine readiness, with the evidence behind each score. The MCP server puts that behind five tools (`audit_site`, `get_ai_search_readiness`, `get_fix_plan`, `compare_sites`, `get_saved_report`), a report resource and a guided audit prompt. A second, clearly labeled set of preview tools defines the next Audit module, citation probes (share of voice and citations across ChatGPT, Gemini, Claude, Perplexity and AI Overviews), on sample data.

**In plain language.** I built a Model Context Protocol server for NativeCode Audit, my SEO and AI-search audit tool. Instead of opening a dashboard, you ask Claude "Can AI crawlers read nativecode.ai, and what should I fix first?" and the model runs a live crawl through the server, gets 30 scored factors with the evidence behind each one, and answers with a ranked plan. It works locally in Claude Desktop or Claude Code and as a hosted HTTP endpoint, and it is tested against real output from the audit engine.

## 2. llms.txt and LLM-native endpoints

A crawler reads the sitemap, strips site chrome (header, nav, footer, forms, scripts), converts each page to Markdown with tables and JSON-LD FAQs preserved, and writes a curated llms.txt grouped by section, llms-full.txt with every page in one file, and a Markdown mirror. The llms.txt stays under Webflow's 100 KB upload limit so it can be served from the domain root. [Crawler access guide](docs/ai-crawler-access.md).

**In plain language.** AI crawlers and agents pay for every token they read, and a marketing page is mostly navigation, scripts and layout. This tool turns nativecode.ai into the low-token version: a one-file index of what each page covers, plus clean Markdown of every page, rebuilt automatically each week so it never goes stale.

## 3. RAG prototype

Splits the Markdown mirror into chunks along heading boundaries, embeds them with all-MiniLM-L6-v2 through transformers.js, and stores them in an int8-quantized vector index. Retrieval fuses cosine similarity with BM25 so exact terms ("X12", "llms.txt") are not lost, caps passages per page, and sends the top passages to Claude with instructions to answer only from them and cite by number. The demo page runs the same model in the browser against the same index.

**In plain language.** I built a retrieval-augmented generation system over NativeCode's own website. Ask it a question and it finds the most relevant passages by meaning and by keyword, then has Claude answer only from those passages with numbered citations, so every claim traces back to a page. You can try the retrieval half live on the demo page.

## 4. Agentic DOM audit

Loads each template in headless Chromium, pulls the full accessibility tree over the DevTools protocol (the tree DOM-based agents and screen readers read), and checks what blocks agents: missing landmarks, broken heading outlines, controls with no accessible name, vague link text, div "buttons", hover-only menus, unlabeled form fields, small click targets. axe-core adds WCAG 2.2 AA rules. Output is a site-level report that groups issues by template, at desktop and mobile widths.

**In plain language.** AI agents that browse the web, like Claude's computer use, navigate a site through its accessibility tree or by clicking what they see. This tool audits nativecode.ai the way an agent experiences it, finds what would trip one up, and explains the fix for each issue in Webflow terms.

## Run everything locally

```bash
(cd mcp-server && npm install && npm test)
(cd llms && npm install && npm test && npx tsx src/cli.ts --config nativecode.config.json --out ../public)
(cd rag && npm install && npm test && npm run index && npm run ask -- "Does NativeCode build Shopify stores?")
(cd agentic-dom && npm install && npx playwright install chromium && npm test && npm run audit -- --urls nativecode-urls.txt --out ../public/agentic-dom)
```
