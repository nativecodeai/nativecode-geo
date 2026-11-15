# NativeCode Audit MCP server

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets Claude and any other MCP client run [NativeCode Audit](https://app.nativecode.ai) on a live website and work with the results: scores, the evidence behind each factor, AI crawler access, llms.txt, and a ranked fix plan.

NativeCode Audit crawls a site's homepage, two inner pages, robots.txt, llms.txt, sitemap.xml and PageSpeed Insights, then scores 30 factors across technical SEO, answer engine readiness (AEO) and generative engine readiness (GEO). Factors it cannot measure are reported as not measured, never estimated. This server is a typed client for that API plus the MCP layer, written in TypeScript on the official `@modelcontextprotocol/sdk`.

A live run against nativecode.ai, captured weekly by the pipeline: [demo output](https://nativecodeai.github.io/nativecode-geo/mcp/demo-nativecode.txt) and [full audit_site result](https://nativecodeai.github.io/nativecode-geo/mcp/audit-nativecode.json).

## Tools

### Live (real crawls through app.nativecode.ai)

| Tool | Arguments | Returns |
|---|---|---|
| `audit_site` | `domain`, `business_model?`, `industry?`, `competitor?`, `detail?` | Overall score, tier, SEO / AEO / GEO scores, coverage, top fixes, factors not measured, and what the crawl retrieved. `detail: "full"` adds all 30 factors with evidence. |
| `get_ai_search_readiness` | `domain`, `category?` (`geo` default, `aeo`, `seo`) | Factor-level scores with the observation behind each one, e.g. "3 of 8 retrieval crawlers blocked". |
| `get_fix_plan` | `domain`, `category?`, `max_effort?`, `limit?` | Recommendations ranked by priority then effort, with why and how. `max_effort: "Low"` gives quick wins. |
| `compare_sites` | `domains[]` (2 to 4), `business_model?` | Scores side by side and every factor where the first domain trails the best competitor by 20+ points. |
| `get_saved_report` | `report_id` | A report someone saved and shared from app.nativecode.ai. |

Repeat calls for the same site within 15 minutes reuse one API request, and the Audit API itself caches crawls for 24 hours. The API allows 12 audits per IP per 10 minutes; errors such as rate limits or unreachable domains come back as readable tool errors.

### Preview: citation probes (sample data)

Live prompt testing (running real prompts against ChatGPT, Gemini, Claude, Perplexity and Google AI Overviews and recording which brands get cited) is the next NativeCode Audit module. These tools define its data model and outputs and run on a deterministic dataset of fictional brands with reserved `.example` domains. Every description starts with "PREVIEW, sample data" and every response carries `data_source.sample: true`.

| Tool | Returns |
|---|---|
| `get_ai_visibility` | Mention rate, citation rate, share of voice, position and sentiment per platform |
| `compare_brands` | Share of voice, head-to-head share and citation share between brands for a query |
| `get_citation_sources` | Domains cited when a brand is named, its own-site citation rate, and gap sources that appear when competitors are named instead |
| `get_share_of_model_voice` | Weekly Share of Model Voice with trend, per-platform change and competitor context |
| `list_tracked_brands` | Brands, categories and queries in the probe dataset |

Set `NATIVECODE_PROBES=off` to hide them, or `NATIVECODE_PROBES_API_URL` to point them at a real probe store (contract in `src/probes/data/types.ts`).

### Resources and prompts

- `nativecode://audit/{domain}`: full Markdown audit report for a live domain
- `nativecode://methodology`: what the Audit measures, how, and what it does not
- `nativecode://probes/...`: probe dataset, methodology and per-brand reports (preview)
- Prompt `ai_search_audit(domain, competitor?)`: runs the live tools in order and writes a plan that quotes evidence
- Prompts `audit_brand_visibility` and `competitive_gap_analysis`: walk through the probe preview tools

## Quick start

Requires Node 18 or later.

```bash
cd mcp-server
npm install
npm run build
npm test                   # 29 end-to-end tests over in-memory, stdio and HTTP transports
npm run demo               # live audit of nativecode.ai through a real MCP client
npm run demo -- --offline  # same walkthrough on recorded engine output, no network
```

The live tools are tested against reports produced by the real Audit engine on its own fixture sites (one well built, scoring 83; one badly built, scoring 11), served by a mock of the API.

## Connect a client

**Claude Desktop**: Settings > Developer > Edit Config, then restart:

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

**Claude Code**:

```bash
claude mcp add nativecode-audit -- node /ABSOLUTE/PATH/TO/nativecode-geo/mcp-server/dist/index.js
```

**Cursor and others** use the same `mcpServers` shape (`examples/mcp.json`). **MCP Inspector**: `npx @modelcontextprotocol/inspector node dist/index.js`.

Things to ask:

- "Audit nativecode.ai for AI search readiness. What can AI crawlers see, and what are the quick wins?"
- "Compare my site with competitor.com on GEO and tell me where I trail."
- Run the `ai_search_audit` prompt with your domain.

## Host it

```bash
npm run build
PORT=3000 MCP_AUTH_TOKEN=choose-a-secret npm run start:http
# MCP endpoint POST /mcp, health check GET /health
```

Stateless streamable HTTP, so any container host works (`Dockerfile` included). With `MCP_AUTH_TOKEN` set, clients send `Authorization: Bearer <token>`. A hosted server shares one IP across its users, so the Audit API's per-IP rate limit applies to all of them together.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `NATIVECODE_AUDIT_URL` | `https://app.nativecode.ai` | Audit API base URL (point at a preview deployment to test) |
| `NATIVECODE_PROBES` | on | `off` hides the preview tools |
| `NATIVECODE_PROBES_API_URL`, `NATIVECODE_PROBES_API_KEY` | unset | Real probe store instead of sample data |
| `PORT`, `MCP_AUTH_TOKEN` | 3000, unset | HTTP server |

## Layout

```
src/
  index.ts, http.ts       stdio and streamable HTTP entry points
  config.ts               env -> server options
  server.ts               composes both tool families and the methodology resource
  shared.ts               result and error wrapping, tool annotations
  live/audit-client.ts    typed Audit API client with in-process request sharing
  live/tools.ts           live tools, audit resource, ai_search_audit prompt
  probes/                 citation probe preview: data model, sample data, metrics, tools
test/                     live tools on real engine output, probe tools, three transports
scripts/demo.ts           terminal walkthrough
scripts/snapshot.ts       saves full audit_site output for a domain
```
