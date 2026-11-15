/**
 * Live NativeCode Audit tools: every number comes from a real crawl of the
 * site, run by the Audit API. Nothing here is estimated by the MCP server.
 */
import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  AuditApiError,
  BUSINESS_MODELS,
  CATEGORIES,
  CATEGORY_LABELS,
  type AuditClient,
  type AuditReport,
  type Category,
  type FactorScore,
  type Recommendation,
} from "./audit-client.js";
import { READ_ONLY_REMOTE, toolResult } from "../shared.js";

const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
const EFFORT_RANK = { Low: 0, Medium: 1, High: 2 } as const;

const domainSchema = z.string().min(3).describe('Domain to audit, e.g. "nativecode.ai". Protocol and path are ignored.');
const businessModelSchema = z
  .enum(BUSINESS_MODELS)
  .optional()
  .describe("Business model. Changes only the traffic-value estimate, not the scores. Defaults to leadgen.");

export function registerLiveAuditTools(server: McpServer, client: AuditClient) {
  server.registerTool(
    "audit_site",
    {
      title: "Audit a site for SEO, AEO and GEO",
      description:
        "Runs NativeCode Audit on a live domain: crawls the homepage, two inner pages, robots.txt, llms.txt and sitemap.xml, then scores 30 factors across technical SEO, answer engine readiness (AEO) and generative engine readiness (GEO). Returns the overall score, tier, category scores, top fixes, factors that could not be measured, and what the crawl actually retrieved. Takes 5 to 40 seconds on a cold crawl.",
      inputSchema: {
        domain: domainSchema,
        business_model: businessModelSchema,
        industry: z.string().max(120).optional().describe("Optional industry label, e.g. \"SaaS\"."),
        competitor: z.string().max(120).optional().describe("Optional main competitor."),
        detail: z.enum(["summary", "full"]).optional().describe("full adds every factor with its evidence. Defaults to summary."),
      },
      annotations: READ_ONLY_REMOTE,
    },
    async ({ domain, business_model, industry, competitor, detail }) =>
      toolResult(async () => {
        const r = await client.runAudit({ domain, businessModel: business_model, industry, competitor });
        return {
          ...summarize(r),
          ...(detail === "full" ? { factors: Object.fromEntries(CATEGORIES.map((c) => [c, r[c].factors.map(factorView)])) } : {}),
        };
      }, auditError),
  );

  server.registerTool(
    "get_ai_search_readiness",
    {
      title: "Get AI search readiness factors",
      description:
        "Factor-level detail for one category of a NativeCode Audit, with the evidence behind every score. geo covers AI crawler access in robots.txt (per bot: index, live-fetch and training crawlers), llms.txt, structured data, E-E-A-T, brand entity reconciliation, freshness and citable blocks. aeo covers direct answers, FAQ, definitions, comparisons, how-tos, entity clarity, authorship and question coverage. seo covers indexability, speed, metadata, linking, schema and architecture.",
      inputSchema: {
        domain: domainSchema,
        category: z.enum(["geo", "aeo", "seo"]).optional().describe("Which category to return. Defaults to geo."),
        business_model: businessModelSchema,
      },
      annotations: READ_ONLY_REMOTE,
    },
    async ({ domain, category, business_model }) =>
      toolResult(async () => {
        const r = await client.runAudit({ domain, businessModel: business_model });
        const c: Category = category ?? "geo";
        const factors = r[c].factors.map(factorView);
        return {
          domain: r.domain,
          category: CATEGORY_LABELS[c],
          score: r[c].score,
          measured: `${r[c].measured} of ${r[c].total} factors`,
          weakest: factors
            .filter((f) => f.score !== null)
            .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
            .slice(0, 3)
            .map((f) => f.label),
          factors,
          crawl: crawlView(r),
          source: sourceInfo(client, r),
        };
      }, auditError),
  );

  server.registerTool(
    "get_fix_plan",
    {
      title: "Get a prioritized fix plan",
      description:
        "Ranked recommendations from a NativeCode Audit: what to fix, why it matters for search and AI answers, how to fix it, priority, effort and impact. Filter by category or cap effort to find quick wins.",
      inputSchema: {
        domain: domainSchema,
        category: z.enum(["SEO", "AEO", "GEO", "Content", "Technical", "Authority"]).optional().describe("Only recommendations in this category."),
        max_effort: z.enum(["Low", "Medium", "High"]).optional().describe("Only recommendations at or below this effort. Use Low for quick wins."),
        limit: z.number().int().min(1).max(30).optional().describe("Max recommendations. Defaults to 10."),
        business_model: businessModelSchema,
      },
      annotations: READ_ONLY_REMOTE,
    },
    async ({ domain, category, max_effort, limit, business_model }) =>
      toolResult(async () => {
        const r = await client.runAudit({ domain, businessModel: business_model });
        const recs = r.recommendations
          .filter((x) => !category || x.category === category)
          .filter((x) => !max_effort || EFFORT_RANK[x.effort] <= EFFORT_RANK[max_effort])
          .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || EFFORT_RANK[a.effort] - EFFORT_RANK[b.effort]);
        return {
          domain: r.domain,
          overall_score: r.overallScore,
          filters: { category: category ?? "all", max_effort: max_effort ?? "any" },
          total_matching: recs.length,
          recommendations: recs.slice(0, limit ?? 10).map(recView),
          source: sourceInfo(client, r),
        };
      }, auditError),
  );

  server.registerTool(
    "compare_sites",
    {
      title: "Compare sites",
      description:
        "Audits two to four domains and compares overall, SEO, AEO and GEO scores, then lists the factors where the first domain trails the best competitor by 20 points or more. Use it to benchmark a brand against competitors on AI search readiness.",
      inputSchema: {
        domains: z.array(z.string().min(3)).min(2).max(4).describe("Domains to compare. Put your own site first."),
        business_model: businessModelSchema,
      },
      annotations: READ_ONLY_REMOTE,
    },
    async ({ domains, business_model }) =>
      toolResult(async () => {
        const settled = await Promise.allSettled(domains.map((d) => client.runAudit({ domain: d, businessModel: business_model })));
        const reports = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
        const failures = settled.flatMap((s, i) => (s.status === "rejected" ? [{ domain: domains[i], error: String((s.reason as Error).message) }] : []));
        if (reports.length < 2) throw new AuditApiError(`Need at least two successful audits. Failures: ${failures.map((f) => `${f.domain}: ${f.error}`).join("; ")}`, 502);

        const [mine, ...others] = reports;
        const gaps: { factor: string; category: string; yours: number; best: number; best_domain: string; gap: number }[] = [];
        for (const c of CATEGORIES) {
          for (const f of mine[c].factors) {
            if (f.score === null) continue;
            const rivals = others
              .map((o) => ({ domain: o.domain, score: o[c].factors.find((x) => x.id === f.id)?.score ?? null }))
              .filter((x): x is { domain: string; score: number } => x.score !== null)
              .sort((a, b) => b.score - a.score);
            if (rivals[0] && rivals[0].score - f.score >= 20) {
              gaps.push({ factor: f.label, category: c.toUpperCase(), yours: f.score, best: rivals[0].score, best_domain: rivals[0].domain, gap: rivals[0].score - f.score });
            }
          }
        }
        return {
          sites: reports.map((r) => ({ domain: r.domain, overall: r.overallScore, tier: r.tier, seo: r.seo.score, aeo: r.aeo.score, geo: r.geo.score, llms_txt: r.crawl.llmsTxt })),
          leader: [...reports].sort((a, b) => b.overallScore - a.overallScore)[0].domain,
          gaps_for_first_domain: gaps.sort((a, b) => b.gap - a.gap),
          failures,
          source: { api: client.baseUrl, measured: "Live crawl of each domain" },
        };
      }, auditError),
  );

  server.registerTool(
    "get_saved_report",
    {
      title: "Open a saved Audit report",
      description: "Loads a report someone saved from app.nativecode.ai by its id (the id in the shared report link).",
      inputSchema: { report_id: z.string().describe("Saved report id, 6 to 24 lowercase letters and digits.") },
      annotations: READ_ONLY_REMOTE,
    },
    async ({ report_id }) => toolResult(async () => summarize(await client.getSavedReport(report_id), client), auditError),
  );

  server.registerResource(
    "audit-report",
    new ResourceTemplate("nativecode://audit/{domain}", { list: undefined }),
    { title: "NativeCode Audit report", description: "Full Markdown audit of a live domain, e.g. nativecode://audit/nativecode.ai", mimeType: "text/markdown" },
    async (uri, { domain }) => {
      const d = decodeURIComponent(Array.isArray(domain) ? domain[0] : domain);
      const r = await client.runAudit({ domain: d });
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: reportMarkdown(r) }] };
    },
  );

  server.registerPrompt(
    "ai_search_audit",
    {
      title: "AI search audit for a domain",
      description: "Audits a live site for SEO, AEO and GEO with NativeCode Audit and writes a prioritized plan.",
      argsSchema: { domain: z.string().describe("Domain to audit."), competitor: z.string().optional().describe("Optional competitor domain to benchmark against.") },
    },
    ({ domain, competitor }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Audit ${domain} for search and AI answer visibility using the NativeCode Audit tools.`,
              `1. audit_site for ${domain}.`,
              `2. get_ai_search_readiness for ${domain} with category geo, then aeo.`,
              `3. get_fix_plan for ${domain}, then again with max_effort Low for quick wins.`,
              competitor ? `4. compare_sites with ["${domain}", "${competitor}"].` : "",
              "",
              "Write the result as: Where the site stands (scores and tier), What AI engines can and cannot see (crawler access, llms.txt, structured data, entity signals), Quick wins this week, Bigger projects, and What was not measured.",
              "Quote the evidence string behind every claim. Do not estimate anything the audit marked as not measured.",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        },
      ],
    }),
  );
}

// ---------------------------------------------------------------- views

function summarize(r: AuditReport, client?: AuditClient) {
  const unmeasured = CATEGORIES.flatMap((c) => r[c].factors.filter((f) => f.status === "unavailable").map((f) => ({ factor: f.label, category: c.toUpperCase(), why: f.finding })));
  return {
    domain: r.domain,
    overall_score: r.overallScore,
    tier: r.tier,
    summary: r.summary,
    categories: Object.fromEntries(CATEGORIES.map((c) => [c, { label: CATEGORY_LABELS[c], score: r[c].score, measured: `${r[c].measured}/${r[c].total}` }])),
    coverage: `${r.coverage.measured} of ${r.coverage.total} factors measured`,
    top_fixes: r.topFixes.map(recView),
    not_measured: unmeasured,
    estimated_annual_opportunity_usd: {
      value: r.estimatedAnnualOpportunity,
      note: Object.values(r.inputs.provided).some(Boolean)
        ? "Planning estimate from the inputs provided."
        : "Planning estimate from default traffic and conversion assumptions for this business model, not measured traffic.",
    },
    crawl: crawlView(r),
    ...(client ? { source: sourceInfo(client, r) } : {}),
  };
}

function factorView(f: FactorScore) {
  return { id: f.id, label: f.label, status: f.status, score: f.score, finding: f.finding, ...(f.evidence ? { evidence: f.evidence } : {}) };
}

function recView(x: Recommendation) {
  return { title: x.title, priority: x.priority, category: x.category, impact: x.impact, effort: x.effort, why: x.why, fix: x.fix, current_factor_score: x.factorScore };
}

function crawlView(r: AuditReport) {
  const c = r.crawl;
  return {
    final_url: c.finalUrl,
    http_status: c.httpStatus,
    https: c.https,
    robots_txt: c.robotsTxt,
    llms_txt: c.llmsTxt,
    sitemap_xml: c.sitemapXml,
    pages_sampled: c.pagesSampled,
    pagespeed_measured: c.pageSpeedApi,
    fetched_at: c.fetchedAt,
    notes: c.notes,
  };
}

function sourceInfo(client: AuditClient, r: AuditReport) {
  return { api: client.baseUrl, generated_at: r.generatedAt, live_crawl: true };
}

function auditError(err: unknown): string | undefined {
  if (!(err instanceof AuditApiError)) return undefined;
  if (err.status === 429) return `NativeCode Audit rate limit: ${err.message}`;
  return err.message;
}

export function reportMarkdown(r: AuditReport): string {
  const lines = [
    `# NativeCode Audit: ${r.domain}`,
    "",
    `Overall ${r.overallScore}/100, ${r.tier}. Crawled ${r.crawl.fetchedAt} (${r.crawl.pagesSampled} pages; robots.txt ${yes(r.crawl.robotsTxt)}, llms.txt ${yes(r.crawl.llmsTxt)}, sitemap.xml ${yes(r.crawl.sitemapXml)}).`,
    "",
    r.summary,
    "",
  ];
  for (const c of CATEGORIES) {
    lines.push(`## ${CATEGORY_LABELS[c]}: ${r[c].score}/100`, "", "| Factor | Score | Evidence |", "|---|---|---|");
    for (const f of r[c].factors) {
      lines.push(`| ${f.label} | ${f.score ?? "not measured"} | ${(f.evidence ?? f.finding).replace(/\|/g, "/")} |`);
    }
    lines.push("");
  }
  lines.push("## Top fixes", "");
  r.topFixes.forEach((x, i) => lines.push(`${i + 1}. **${x.title}** (${x.priority}, ${x.effort} effort). ${x.fix}`));
  if (r.crawl.notes.length) lines.push("", "## Crawl notes", "", ...r.crawl.notes.map((n) => `- ${n}`));
  return lines.join("\n");
}

const yes = (b: boolean) => (b ? "found" : "missing");
