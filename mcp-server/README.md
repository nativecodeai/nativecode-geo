# NativeCode Audit MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets any MCP-capable LLM or agent query NativeCode Audit, NativeCode's AI-visibility platform. It reports how brands show up in answers from ChatGPT, Gemini, Claude, Perplexity, and Google AI Overviews: how often they are named and cited, their share of voice, sentiment, which sources the answers cite, and how all of that changes week to week.

Built with TypeScript and the official `@modelcontextprotocol/sdk`. Runs locally over stdio (Claude Desktop, Claude Code, Cursor) or hosted over streamable HTTP (remote connectors and agents).

## What it exposes

### Tools

| Tool | Arguments | Returns |
|---|---|---|
| `get_ai_visibility` | `brand`, `platform?`, `weeks?` | Mention rate, citation rate, share of voice, average position, and sentiment, overall and per platform. Category rank and plain-language insights. |
| `compare_brands` | `brands[]`, `query?`, `platform?`, `weeks?` | Ranked benchmark of share of voice, head-to-head share, and citation share, plus the leader on each platform. Loose query wording is matched to the nearest tracked query. |
| `get_citation_sources` | `brand`, `query`, `platform?`, `weeks?`, `limit?` | Top domains and URLs cited when the brand is named, how often its own site is cited, the source-type mix, and gap sources: domains that show up when competitors are named and the brand is not. |
| `get_share_of_model_voice` | `brand`, `platform?`, `weeks?` | Weekly Share of Model Voice series, trend (direction, change in points, slope), per-platform change, and competitor context. |
| `list_tracked_brands` | none | Every tracked brand, category, and query, so the model can discover what to ask for. |

`platform` is one of `chatgpt`, `gemini`, `claude`, `perplexity`, `google_ai_overviews`. All tools are read-only.

### Resources

- `nativecode://brands/{brand}/report`: full Markdown visibility report for a brand (listable and autocompletable)
- `nativecode://brands`: tracked brands
- `nativecode://queries`: tracked high-intent queries
- `nativecode://methodology`: how data is collected and how each metric is defined

### Prompts

- `audit_brand_visibility(brand, focus_platform?)`: walks the model through a full audit and a ranked action list
- `competitive_gap_analysis(brand, competitors, query?)`: finds the sources competitors win that the brand is missing

## Quick start

Requires Node 18 or later.

```bash
cd mcp-server
npm install
npm run build
npm test        # 17 end-to-end tests over in-memory, stdio, and HTTP transports
npm run demo    # terminal walkthrough of every tool
```

## Connect it to an MCP client

**Claude Desktop.** Open Settings, Developer, Edit Config, and add the server (see `examples/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "nativecode-audit": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/nativecode-geo/mcp-server/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop. The tools appear under the tools menu, the report resources under attachments, and the prompts under the prompt menu.

**Claude Code.**

```bash
claude mcp add nativecode-audit -- node /ABSOLUTE/PATH/TO/nativecode-geo/mcp-server/dist/index.js
```

**Cursor and other clients** use the same `mcpServers` shape (see `examples/mcp.json`).

**MCP Inspector** (visual testing):

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Example questions to ask

- "How visible is Larkmail in AI answers? Where is it strongest and weakest?"
- "Compare Larkmail, Sendcraft, and Inboxium for 'best email platform for ecommerce'."
- "Which sources do AI answers cite for Postharbor on small business email software, and where are the gaps?"
- "Is Sendcraft's Share of Model Voice rising? Show me the weekly trend on Perplexity."
- Use the `audit_brand_visibility` prompt with brand `Planquill`.

## Host it (remote MCP over HTTP)

```bash
npm run build
PORT=3000 MCP_AUTH_TOKEN=choose-a-secret npm run start:http
# MCP endpoint: POST http://localhost:3000/mcp
# Health check: GET  http://localhost:3000/health
```

The HTTP server is stateless, so it runs on any container host. A `Dockerfile` is included:

```bash
docker build -t nativecode-audit-mcp .
docker run -p 3000:3000 -e MCP_AUTH_TOKEN=choose-a-secret nativecode-audit-mcp
```

On Render, Railway, Fly.io, or Cloud Run, point the service at this folder, use the Dockerfile, and set `MCP_AUTH_TOKEN`. Clients connect to `https://your-host/mcp`. When `MCP_AUTH_TOKEN` is set, requests need `Authorization: Bearer <token>`. Leave it unset only for a public read-only demo on sample data.

## Data sources

The server runs on a built-in sample dataset unless you point it at the live API.

```bash
NATIVECODE_AUDIT_API_URL=https://api.nativecode.ai/audit \
NATIVECODE_AUDIT_API_KEY=... \
npm start
```

**Sample data.** A deterministic 12-week history: 7 tracked queries in two categories, 5 platforms, 3 runs per week, about 1,200 AI answers. The brands are fictional and use reserved `.example` domains, so no number describes a real company. Third-party sources (G2, Capterra, Reddit, Forbes, YouTube, and others) are real domains so citation analysis looks like production output. The generator models platform differences, rising and falling brands, query-specific winners, brand-specific source footprints, and Google AI Overviews that only trigger on part of the runs. Every response includes `data_source.sample: true` while sample data is in use.

**Swapping in real data is a one-file change.** Everything downstream depends on one interface, `AuditDataSource` in `src/data/types.ts`:

```ts
interface AuditDataSource {
  listBrands(): Promise<Brand[]>;
  listQueries(): Promise<TrackedQuery[]>;
  getObservations(filter?: ObservationFilter): Promise<Observation[]>;
}
```

An `Observation` is one AI answer to one tracked query on one platform: the brands it named (position, sentiment, whether it linked the brand's site) and every source it cited. All metrics are computed from observations in `src/metrics.ts`, so the definitions stay consistent whatever the backend.

- REST API: `src/data/api-source.ts` already implements the interface over `GET /brands`, `/queries`, and `/observations`. Adjust paths or field mapping in that file if the real API differs.
- Database or anything else: implement `AuditDataSource` and return it from `createDataSource()` in `src/data/index.ts`.

## Project layout

```
src/
  index.ts            stdio entry (local clients)
  http.ts             streamable HTTP entry (hosted)
  server.ts           MCP tools, resources, prompts
  audit.ts            business logic: input resolution, aggregation, insights
  metrics.ts          metric definitions (pure functions)
  data/
    types.ts          data model and the AuditDataSource interface
    index.ts          picks the data source (the one-file swap point)
    sample-source.ts  deterministic sample dataset
    api-source.ts     live REST API source
test/server.test.ts   end-to-end tests through a real MCP client
scripts/demo.ts       terminal demo for recordings
examples/             client config snippets
```

## Metric definitions

- **Mention rate**: share of sampled answers that name the brand.
- **Citation rate**: share of sampled answers that link to the brand's own domain.
- **Share of voice**: brand mentions divided by all tracked-brand mentions in the same answers, within the brand's category.
- **Share of Model Voice**: share of voice by week. Trend compares the first and last four weeks and reports a least-squares slope.
- **Head-to-head share / citation share**: share among only the brands being compared.
- **Average position**: mean rank among brands named (1 = named first).
- **Sentiment**: mean mention sentiment from -1 to 1. Positive at 0.25 and above, negative at -0.15 and below.
- **Gap sources**: domains cited more often in competitor-only answers than in answers naming the brand. `gap_pts` is the difference.
