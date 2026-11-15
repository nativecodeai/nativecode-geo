# NativeCode GEO Engineering

LLM-native infrastructure built by [NativeCode](https://www.nativecode.ai) for Generative Engine Optimization (GEO): tools that let AI models and agents read, measure, and navigate brand visibility in AI answers.

| Artifact | Folder | Status |
|---|---|---|
| NativeCode Audit MCP server | [`mcp-server/`](mcp-server/) | Working: stdio + hosted HTTP, 17 end-to-end tests, Docker |
| llms.txt and LLM-native endpoints for nativecode.ai | `llms/` | Next |
| RAG prototype over NativeCode content | `rag/` | Planned |
| Accessibility-tree and agentic-DOM pass | `agentic-dom/` | Planned |

## 1. NativeCode Audit MCP server

NativeCode Audit tracks how brands appear across ChatGPT, Gemini, Claude, Perplexity, and Google AI Overviews. This MCP server exposes that data to any MCP-capable LLM through five tools (`get_ai_visibility`, `compare_brands`, `get_citation_sources`, `get_share_of_model_voice`, `list_tracked_brands`), brand report resources, and guided audit prompts.

```bash
cd mcp-server && npm install && npm run build && npm test && npm run demo
```

Setup, client configuration, hosting, and the data-source contract are in [`mcp-server/README.md`](mcp-server/README.md).

**In plain language.** I built a Model Context Protocol server that turns NativeCode Audit, my AI-visibility platform, into something an AI assistant can query directly. Instead of exporting a dashboard, you ask Claude "Is Sendcraft gaining on Larkmail in AI answers, and which sources are driving it?" and the model calls the server's tools, gets share of voice, citation, sentiment, and trend data across five AI platforms, and answers with real numbers. Every metric is computed from raw AI-answer observations in one place, the server runs locally or as a hosted endpoint, and the data layer sits behind a single interface so the demo dataset and the production API are interchangeable.
