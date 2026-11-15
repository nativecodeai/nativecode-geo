/**
 * Citation probe tools (preview). Registered alongside the live Audit tools.
 * Every response carries data_source.sample so models and people can tell
 * preview data from measured data.
 */
import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProbeInputError, ProbeService } from "./service.js";
import { PLATFORMS, PLATFORM_LABELS, type AuditDataSource } from "./data/types.js";
import { NEGATIVE_THRESHOLD, POSITIVE_THRESHOLD } from "./metrics.js";
import { READ_ONLY_LOCAL, toolResult as baseResult } from "../shared.js";

const PREVIEW =
  "PREVIEW, sample data: citation probes (real prompts run against AI engines) are the next NativeCode Audit module and are not live yet. Results describe fictional brands.";

const toolResult = (fn: () => Promise<Record<string, unknown>>) =>
  baseResult(fn, (err) => (err instanceof ProbeInputError ? err.message : undefined));

const platformSchema = z
  .enum(PLATFORMS)
  .optional()
  .describe(`AI platform to limit results to. Omit for all platforms. One of: ${PLATFORMS.map((p) => `${p} (${PLATFORM_LABELS[p]})`).join(", ")}.`);

const weeksSchema = z
  .number()
  .int()
  .min(1)
  .max(52)
  .optional()
  .describe("How many recent weeks to include. Defaults to 12.");

export function registerProbeTools(server: McpServer, source: AuditDataSource) {
  const audit = new ProbeService(source);

  // ---------------------------------------------------------------- tools

  server.registerTool(
    "list_tracked_brands",
    {
      title: "Citation probes (preview): list tracked brands",
      description: `${PREVIEW} Lists the brands and high-intent queries in the probe dataset, grouped by category.`,
      inputSchema: {},
      annotations: READ_ONLY_LOCAL,
    },
    async () =>
      toolResult(async () => {
        const [brands, queries] = await Promise.all([audit.listBrands(), audit.listQueries()]);
        const categories = [...new Set(brands.map((b) => b.category))];
        return {
          categories: categories.map((c) => ({
            category: c,
            brands: brands.filter((b) => b.category === c).map((b) => ({ id: b.id, name: b.name, domain: b.domain })),
            queries: queries.filter((q) => q.category === c).map((q) => ({ id: q.id, text: q.text, intent: q.intent })),
          })),
          platforms: PLATFORMS.map((p) => ({ id: p, name: PLATFORM_LABELS[p] })),
          data_source: audit.dataSourceInfo,
        };
      }),
  );

  server.registerTool(
    "get_ai_visibility",
    {
      title: "Citation probes (preview): AI visibility",
      description:
        `${PREVIEW} ` + "Citation frequency, share of voice, average position, and sentiment for a brand across one or all AI platforms, plus its rank in its category and plain-language insights.",
      inputSchema: {
        brand: z.string().min(1).describe("Brand name, id, or domain, e.g. \"Larkmail\"."),
        platform: platformSchema,
        weeks: weeksSchema,
      },
      annotations: READ_ONLY_LOCAL,
    },
    async ({ brand, platform, weeks }) => toolResult(() => audit.getAiVisibility(brand, platform, weeks)),
  );

  server.registerTool(
    "compare_brands",
    {
      title: "Citation probes (preview): compare brands",
      description:
        `${PREVIEW} ` + "Benchmarks share of voice and citation share between two or more brands in the same category, optionally for one high-intent query and one platform. Returns a ranked table and the leader on each platform.",
      inputSchema: {
        brands: z.array(z.string().min(1)).min(2).max(10).describe("Brands to compare, e.g. [\"Larkmail\", \"Sendcraft\"]."),
        query: z.string().optional().describe("A tracked query (id or text). Close wording is matched to the nearest tracked query. Omit for all queries."),
        platform: platformSchema,
        weeks: weeksSchema,
      },
      annotations: READ_ONLY_LOCAL,
    },
    async ({ brands, query, platform, weeks }) => toolResult(() => audit.compareBrands(brands, query, platform, weeks)),
  );

  server.registerTool(
    "get_citation_sources",
    {
      title: "Citation probes (preview): citation sources",
      description:
        `${PREVIEW} ` + "Shows which sources AI answers cite for a brand's category query: the top domains and URLs when the brand is named, how often the brand's own site is cited, and gap sources that appear when competitors are named but the brand is not.",
      inputSchema: {
        brand: z.string().min(1).describe("Brand name, id, or domain."),
        query: z.string().min(1).describe("A tracked query (id or text), e.g. \"best email marketing software for small business\"."),
        platform: platformSchema,
        weeks: weeksSchema,
        limit: z.number().int().min(1).max(25).optional().describe("Max domains per list. Defaults to 10."),
      },
      annotations: READ_ONLY_LOCAL,
    },
    async ({ brand, query, platform, weeks, limit }) => toolResult(() => audit.getCitationSources(brand, query, platform, weeks, limit)),
  );

  server.registerTool(
    "get_share_of_model_voice",
    {
      title: "Citation probes (preview): Share of Model Voice",
      description:
        `${PREVIEW} ` + "Share of Model Voice over time: the brand's weekly share of all tracked-brand mentions in AI answers, with trend direction, per-platform change, and competitor context.",
      inputSchema: {
        brand: z.string().min(1).describe("Brand name, id, or domain."),
        platform: platformSchema,
        weeks: weeksSchema,
      },
      annotations: READ_ONLY_LOCAL,
    },
    async ({ brand, platform, weeks }) => toolResult(() => audit.getShareOfModelVoice(brand, platform, weeks)),
  );

  // ------------------------------------------------------------ resources

  server.registerResource(
    "probe-brands",
    "nativecode://probes/brands",
    { title: "Tracked brands", description: "Every brand NativeCode Audit tracks.", mimeType: "application/json" },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(await audit.listBrands(), null, 2) }],
    }),
  );

  server.registerResource(
    "probe-queries",
    "nativecode://probes/queries",
    { title: "Tracked queries", description: "High-intent prompts run against each AI platform.", mimeType: "application/json" },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(await audit.listQueries(), null, 2) }],
    }),
  );

  server.registerResource(
    "probe-methodology",
    "nativecode://probes/methodology",
    { title: "Citation probe methodology", description: "How citation probes collect AI answers and define each metric.", mimeType: "text/markdown" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: METHODOLOGY }] }),
  );

  server.registerResource(
    "probe-brand-report",
    new ResourceTemplate("nativecode://probes/brands/{brand}/report", {
      list: async () => ({
        resources: (await audit.listBrands()).map((b) => ({
          uri: `nativecode://probes/brands/${b.id}/report`,
          name: `${b.name} AI visibility report`,
          mimeType: "text/markdown",
        })),
      }),
      complete: {
        brand: async (value) =>
          (await audit.listBrands()).map((b) => b.id).filter((id) => id.startsWith(value.toLowerCase())),
      },
    }),
    { title: "Citation probe brand report (preview)", description: "Markdown AI-visibility report for one brand in the probe dataset.", mimeType: "text/markdown" },
    async (uri, { brand }) => {
      const id = decodeURIComponent(Array.isArray(brand) ? brand[0] : brand);
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: await audit.brandReportMarkdown(id) }] };
    },
  );

  // -------------------------------------------------------------- prompts

  server.registerPrompt(
    "audit_brand_visibility",
    {
      title: "Brand AI visibility audit (citation probe preview)",
      description: "Walks through the citation-probe tools for one brand and writes prioritized recommendations.",
      argsSchema: {
        brand: z.string().describe("Brand to audit."),
        focus_platform: z.string().optional().describe("Optional platform to emphasize, e.g. perplexity."),
      },
    },
    ({ brand, focus_platform }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Audit the AI visibility of ${brand} using the citation probe tools.`,
              "",
              `1. Call get_ai_visibility for ${brand}${focus_platform ? ` (all platforms, then platform=${focus_platform})` : ""}.`,
              `2. Call get_share_of_model_voice for ${brand} to see the trend.`,
              `3. Call get_citation_sources for ${brand} on its most important tracked query (use list_tracked_brands if you need the list).`,
              `4. Call compare_brands for ${brand} and its two strongest competitors.`,
              "",
              "Then write a short audit with these sections: Where the brand stands, What is changing, Which sources drive AI answers, Gap sources to win, and Top 3 actions ranked by expected impact.",
              "Use concrete numbers from the tool results. If data_source.sample is true, say the figures come from sample data.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "competitive_gap_analysis",
    {
      title: "Competitive gap analysis",
      description: "Finds where competitors win AI answers that a brand is missing, and which sources to target.",
      argsSchema: {
        brand: z.string().describe("Your brand."),
        competitors: z.string().describe("Comma-separated competitor brands."),
        query: z.string().optional().describe("Optional tracked query to focus on."),
      },
    },
    ({ brand, competitors, query }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Run a competitive gap analysis for ${brand} against ${competitors}${query ? ` for the query "${query}"` : ""}.`,
              `Use compare_brands, then get_citation_sources for ${brand}${query ? "" : " on the query where it trails most"}.`,
              "Focus on gap_sources: the domains AI answers cite when competitors are named and this brand is not.",
              "Finish with a table of target sources, what each one needs (review profile, listicle inclusion, community presence, video), and a priority.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

}

const METHODOLOGY = `# Citation probe methodology (preview)

Citation probes are the next NativeCode Audit module and are not live yet; the server ships with a sample dataset of fictional brands. Probes run a fixed set of high-intent prompts ("tracked queries") against ChatGPT, Gemini, Claude, Perplexity, and Google AI Overviews several times a week. Each answer is stored as an observation: which tracked brands it named, in what order, the sentiment of each mention, and every source it cited. All metrics are computed from these observations.

## Metrics
- **Mention rate**: share of sampled answers that name the brand.
- **Citation rate**: share of sampled answers that link to a page on the brand's own domain.
- **Share of voice (SoV)**: the brand's mentions divided by all tracked-brand mentions in the same answers, within the brand's category.
- **Share of Model Voice (SoMV)**: SoV tracked week by week, overall or per platform. Trend compares the first and last four weeks and reports a least-squares slope in points per week.
- **Head-to-head share**: in compare_brands, a brand's mentions divided by mentions of only the brands being compared.
- **Citation share**: in compare_brands, a brand's first-party citations divided by first-party citations of the compared brands.
- **Average position**: mean rank among brands named in an answer (1 = named first).
- **Sentiment**: mean mention sentiment from -1 to 1. Positive at or above ${POSITIVE_THRESHOLD}, negative at or below ${NEGATIVE_THRESHOLD}.
- **Gap sources**: domains cited more often in answers that name competitors but not the brand than in answers that name the brand. gap_pts is the difference between the two shares.

## Notes
- AI answers vary run to run, so each query is sampled repeatedly and results are aggregated.
- Google AI Overviews do not trigger on every run; only runs where an overview appeared are counted.
- Percentages are reported on a 0 to 100 scale.
`;
