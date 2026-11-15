/**
 * MCP wiring. Two tool families share one server:
 *
 * - Live NativeCode Audit tools (src/live): real crawls of real sites through
 *   the Audit API at app.nativecode.ai.
 * - Citation probe tools (src/probes), marked PREVIEW: the data model and
 *   outputs of the next Audit module, running on sample data until it ships.
 *
 * Transport-agnostic; see index.ts (stdio) and http.ts (HTTP).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AuditClient } from "./live/audit-client.js";
import { registerLiveAuditTools } from "./live/tools.js";
import type { AuditDataSource } from "./probes/data/types.js";
import { registerProbeTools } from "./probes/tools.js";

export const SERVER_NAME = "nativecode-audit";
export const SERVER_VERSION = "0.2.0";

export interface ServerOptions {
  auditClient: AuditClient;
  /** Omit to leave the citation probe preview tools off. */
  probeSource?: AuditDataSource;
}

export function createServer({ auditClient, probeSource }: ServerOptions): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions: [
        "NativeCode Audit scores how ready a website is for search engines and AI answer engines.",
        "Live tools (audit_site, get_ai_search_readiness, get_fix_plan, compare_sites, get_saved_report) crawl real sites through the Audit API. Quote their evidence strings, and never estimate a factor the audit marked as not measured.",
        probeSource
          ? "Tools titled 'Citation probes (preview)' return sample data about fictional brands. Say so whenever you use them, and never present them as measurements of a real company."
          : "",
        "Read nativecode://methodology for definitions.",
      ]
        .filter(Boolean)
        .join(" "),
    },
  );

  registerLiveAuditTools(server, auditClient);
  if (probeSource) registerProbeTools(server, probeSource);

  server.registerResource(
    "methodology",
    "nativecode://methodology",
    { title: "NativeCode Audit methodology", description: "What the Audit measures, how, and what it does not measure.", mimeType: "text/markdown" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: METHODOLOGY }] }),
  );

  return server;
}

const METHODOLOGY = `# NativeCode Audit methodology

NativeCode Audit (https://app.nativecode.ai) fetches a live site and scores 30 factors in three categories. Every measured factor carries the observation behind it.

## What a crawl reads
- The homepage and two sampled inner pages: metadata, headings, links, JSON-LD, answer blocks, content depth, citations, images.
- robots.txt: indexability, crawlability, and access for each AI crawler token.
- llms.txt: presence and structure.
- sitemap.xml: architecture, depth, freshness, question and comparison coverage.
- PageSpeed Insights (mobile): page speed.

## Categories
- **Technical SEO**: indexability, speed, metadata, internal linking, content depth, schema, mobile, crawlability, architecture.
- **AEO (answer engine readiness)**: direct answers, FAQ, definitions, comparisons, how-tos, entity clarity, author signals, citations, content structure, question coverage.
- **GEO (generative engine readiness)**: AI crawler access, llms.txt, structured data, E-E-A-T, brand entity, freshness, citable blocks.

## AI crawler model
robots.txt is evaluated per AI crawler, split three ways. Index crawlers build the corpus an engine cites from (weighted 70%). Live fetchers retrieve a page when a user points an assistant at it (30%). Training crawlers are reported but never scored, because blocking them is a business decision, not a visibility failure.

## Not measured in this tier
Keyword footprint and competitor displacement (need third-party rank data), citation likelihood and AI query coverage (need live prompt testing), and value capture (needs a connected analytics account). These are reported as not measured and contribute nothing to any score. The composite reweights over what was measured.

## Estimates
Traffic value and opportunity figures are planning estimates from default assumptions per business model unless the caller supplies real inputs.

## Citation probes (preview)
Live prompt testing is the next module. Its tools are available in preview on sample data; see nativecode://probes/methodology.
`;
