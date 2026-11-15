/**
 * Client for the NativeCode Audit API (https://app.nativecode.ai).
 *
 * The Audit app crawls a live site (homepage, two sampled pages, robots.txt,
 * llms.txt, sitemap.xml, PageSpeed Insights) and scores 30 SEO, AEO and GEO
 * factors. Factors it cannot measure are reported as unavailable, never guessed.
 *
 *   POST {baseUrl}/api/audit        { domain, businessModel, ... } -> { report }
 *   GET  {baseUrl}/api/report?id=   -> { report }
 *
 * Only the fields this server reads are typed here.
 */

export const BUSINESS_MODELS = ["ecommerce", "leadgen", "saas", "local", "publisher", "marketplace"] as const;
export type BusinessModel = (typeof BUSINESS_MODELS)[number];
export type Category = "seo" | "aeo" | "geo";
export const CATEGORIES: Category[] = ["seo", "aeo", "geo"];
export const CATEGORY_LABELS: Record<Category, string> = {
  seo: "Technical SEO",
  aeo: "Answer engine readiness (AEO)",
  geo: "Generative engine readiness (GEO)",
};

export interface FactorScore {
  id: string;
  label: string;
  status: "measured" | "unavailable";
  score: number | null;
  finding: string;
  evidence?: string;
  reason?: string;
}

export interface CategoryResult {
  score: number;
  factors: FactorScore[];
  measured: number;
  total: number;
}

export interface Recommendation {
  id: string;
  title: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  category: "SEO" | "AEO" | "GEO" | "Content" | "Technical" | "Authority";
  impact: string;
  effort: "Low" | "Medium" | "High";
  why: string;
  fix: string;
  factorScore: number;
}

export interface CrawlReceipt {
  finalUrl: string;
  httpStatus: number;
  https: boolean;
  robotsTxt: boolean;
  llmsTxt: boolean;
  sitemapXml: boolean;
  pagesSampled: number;
  pageSpeedApi: boolean;
  fetchedAt: string;
  notes: string[];
}

export interface AuditReport {
  version: number;
  domain: string;
  generatedAt: string;
  inputs: { businessModel: BusinessModel; industry: string; competitor: string | null; provided: Record<string, boolean> };
  overallScore: number;
  tier: string;
  seo: CategoryResult;
  aeo: CategoryResult;
  geo: CategoryResult;
  trafficValue: { estimatedAnnualOrganicValue: number; estimatedMissedOpportunity: number };
  estimatedAnnualOpportunity: number;
  recommendations: Recommendation[];
  topFixes: Recommendation[];
  summary: string;
  crawl: CrawlReceipt;
  coverage: { measured: number; total: number };
}

export interface AuditRequest {
  domain: string;
  businessModel?: BusinessModel;
  industry?: string;
  competitor?: string;
}

export class AuditApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export interface AuditClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** How long to reuse a report within this process. The API also caches crawls for 24h. */
  cacheTtlMs?: number;
}

export const DEFAULT_AUDIT_URL = "https://app.nativecode.ai";

export class AuditClient {
  readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;
  private readonly cache = new Map<string, { at: number; report: Promise<AuditReport> }>();

  constructor(opts: AuditClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_AUDIT_URL).replace(/\/$/, "");
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? 70_000; // the API allows a 60s crawl
    this.cacheTtlMs = opts.cacheTtlMs ?? 15 * 60_000;
  }

  /** Runs (or reuses) an audit. Concurrent calls for the same site share one request. */
  runAudit(req: AuditRequest): Promise<AuditReport> {
    const domain = normalizeDomain(req.domain);
    const businessModel = req.businessModel ?? "leadgen";
    const key = [domain, businessModel, req.industry ?? "", req.competitor ?? ""].join("|");
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.cacheTtlMs) return hit.report;

    const report = this.request<{ report: AuditReport }>("/api/audit", {
      method: "POST",
      body: JSON.stringify({ domain, businessModel, industry: req.industry, competitor: req.competitor }),
    }).then((r) => r.report);
    this.cache.set(key, { at: Date.now(), report });
    report.catch(() => this.cache.delete(key));
    return report;
  }

  async getSavedReport(id: string): Promise<AuditReport> {
    if (!/^[a-z0-9]{6,24}$/.test(id)) throw new AuditApiError("Report ids are 6 to 24 lowercase letters and digits.", 400);
    return (await this.request<{ report: AuditReport }>(`/api/report?id=${id}`, { method: "GET" })).report;
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "nativecode-audit-mcp/0.2" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new AuditApiError(`Could not reach NativeCode Audit at ${this.baseUrl}: ${err instanceof Error ? err.message : String(err)}`, 0);
    }
    const body = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new AuditApiError(body.error ?? `NativeCode Audit returned HTTP ${res.status}.`, res.status);
    return body;
  }
}

/** Same normalization the Audit app applies, so cache keys line up. */
export function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}
