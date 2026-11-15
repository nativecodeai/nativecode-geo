/**
 * Sample data source for demos and tests.
 *
 * Generates a deterministic 12-week history of AI answers for two fictional
 * categories. Brands are invented and use reserved .example domains, so the
 * numbers never describe a real company. Third-party source domains (G2,
 * Reddit, etc.) are real sites, used so citation analysis looks like
 * production output.
 *
 * The generator models the things that make real AI-visibility data
 * interesting: platforms differ, some brands rise while others fade, some
 * brands win specific queries, Google AI Overviews only trigger on part of
 * the runs, and answer engines sample differently each run.
 */
import {
  PLATFORMS,
  type AuditDataSource,
  type Brand,
  type BrandMention,
  type CitedSource,
  type Observation,
  type ObservationFilter,
  type Platform,
  type SourceType,
  type TrackedQuery,
} from "./types.js";

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

const BRANDS: Brand[] = [
  { id: "larkmail", name: "Larkmail", domain: "larkmail.example", category: "email-marketing" },
  { id: "sendcraft", name: "Sendcraft", domain: "sendcraft.example", category: "email-marketing" },
  { id: "inboxium", name: "Inboxium", domain: "inboxium.example", category: "email-marketing" },
  { id: "postharbor", name: "Postharbor", domain: "postharbor.example", category: "email-marketing" },
  { id: "campaignary", name: "Campaignary", domain: "campaignary.example", category: "email-marketing" },
  { id: "taskfern", name: "Taskfern", domain: "taskfern.example", category: "project-management" },
  { id: "planquill", name: "Planquill", domain: "planquill.example", category: "project-management" },
  { id: "boardnest", name: "Boardnest", domain: "boardnest.example", category: "project-management" },
  { id: "sprintwell", name: "Sprintwell", domain: "sprintwell.example", category: "project-management" },
];

const QUERIES: TrackedQuery[] = [
  { id: "em-small-business", text: "best email marketing software for small business", category: "email-marketing", intent: "commercial" },
  { id: "em-ecommerce", text: "best email marketing platform for ecommerce stores", category: "email-marketing", intent: "commercial" },
  { id: "em-free", text: "free email marketing tools with automation", category: "email-marketing", intent: "commercial" },
  { id: "em-alternatives", text: "Larkmail alternatives", category: "email-marketing", intent: "transactional" },
  { id: "pm-small-teams", text: "best project management software for small teams", category: "project-management", intent: "commercial" },
  { id: "pm-agencies", text: "project management tool for marketing agencies", category: "project-management", intent: "commercial" },
  { id: "pm-free", text: "free project management app with gantt charts", category: "project-management", intent: "commercial" },
];

interface BrandProfile {
  /** Base probability of being named, by platform (order of PLATFORMS). */
  visibility: [number, number, number, number, number];
  /** Baseline sentiment, -1 to 1. */
  sentiment: number;
  /** Change in mention probability per week (positive = rising). */
  trendPerWeek: number;
  /** Probability an answer that names the brand also links its own site. */
  ownSiteCiteRate: number;
  /** Per-query adjustments to mention probability. */
  queryBoost?: Record<string, number>;
  /**
   * How strongly answers that name this brand lean on a given source domain.
   * Models off-site presence: strong G2 reviews, Reddit buzz, YouTube reviews.
   */
  sourceAffinity?: Record<string, number>;
}

const PROFILES: Record<string, BrandProfile> = {
  larkmail: { visibility: [0.82, 0.75, 0.7, 0.78, 0.76], sentiment: 0.45, trendPerWeek: -0.016, ownSiteCiteRate: 0.35, queryBoost: { "em-alternatives": -0.15 }, sourceAffinity: { "www.g2.com": 1.4, "www.forbes.com": 1.6, "zapier.com": 1.3 } },
  sendcraft: { visibility: [0.46, 0.4, 0.44, 0.54, 0.38], sentiment: 0.35, trendPerWeek: 0.013, ownSiteCiteRate: 0.3, queryBoost: { "em-alternatives": 0.2 }, sourceAffinity: { "www.reddit.com": 1.9, "www.youtube.com": 1.8 } },
  inboxium: { visibility: [0.4, 0.5, 0.35, 0.38, 0.52], sentiment: 0.1, trendPerWeek: 0, ownSiteCiteRate: 0.2, queryBoost: { "em-ecommerce": 0.3 }, sourceAffinity: { "www.shopify.com": 2.6, "www.capterra.com": 1.2 } },
  postharbor: { visibility: [0.3, 0.25, 0.38, 0.22, 0.2], sentiment: 0.3, trendPerWeek: 0.003, ownSiteCiteRate: 0.15, queryBoost: { "em-free": 0.35 }, sourceAffinity: { "www.reddit.com": 1.3, "www.g2.com": 0.45, "www.capterra.com": 0.55, "www.forbes.com": 0.6 } },
  campaignary: { visibility: [0.25, 0.22, 0.18, 0.3, 0.28], sentiment: -0.2, trendPerWeek: -0.006, ownSiteCiteRate: 0.12, sourceAffinity: { "www.capterra.com": 1.3, "www.techradar.com": 1.5 } },
  taskfern: { visibility: [0.76, 0.68, 0.74, 0.72, 0.66], sentiment: 0.4, trendPerWeek: 0, ownSiteCiteRate: 0.3, sourceAffinity: { "www.pcmag.com": 1.5, "www.g2.com": 1.3 } },
  planquill: { visibility: [0.44, 0.54, 0.4, 0.46, 0.58], sentiment: 0.3, trendPerWeek: 0.014, ownSiteCiteRate: 0.25, queryBoost: { "pm-agencies": 0.2 }, sourceAffinity: { "www.reddit.com": 1.7, "www.youtube.com": 1.5 } },
  boardnest: { visibility: [0.42, 0.36, 0.5, 0.4, 0.34], sentiment: 0.2, trendPerWeek: -0.003, ownSiteCiteRate: 0.2, queryBoost: { "pm-free": 0.25 }, sourceAffinity: { "www.capterra.com": 1.4, "www.pcmag.com": 0.6 } },
  sprintwell: { visibility: [0.3, 0.28, 0.34, 0.44, 0.26], sentiment: 0.25, trendPerWeek: 0.01, ownSiteCiteRate: 0.18, sourceAffinity: { "www.reddit.com": 1.5, "www.g2.com": 0.6 } },
};

interface SourceTemplate {
  domain: string;
  sourceType: SourceType;
  paths: string[];
  weight: number;
  /** Platform-specific weight multipliers. */
  platformBias?: Partial<Record<Platform, number>>;
}

const SOURCE_POOLS: Record<string, SourceTemplate[]> = {
  "email-marketing": [
    { domain: "www.g2.com", sourceType: "review_site", paths: ["/categories/email-marketing", "/compare/email-marketing-tools"], weight: 5, platformBias: { perplexity: 1.3 } },
    { domain: "www.capterra.com", sourceType: "review_site", paths: ["/email-marketing-software/"], weight: 4, platformBias: { google_ai_overviews: 1.4 } },
    { domain: "www.reddit.com", sourceType: "community", paths: ["/r/emailmarketing/", "/r/smallbusiness/", "/r/shopify/"], weight: 4, platformBias: { perplexity: 1.8, google_ai_overviews: 1.6, claude: 0.4 } },
    { domain: "zapier.com", sourceType: "publisher", paths: ["/blog/best-email-marketing-apps/"], weight: 3, platformBias: { chatgpt: 1.5 } },
    { domain: "www.forbes.com", sourceType: "publisher", paths: ["/advisor/business/software/best-email-marketing-software/"], weight: 3, platformBias: { gemini: 1.4, google_ai_overviews: 1.3 } },
    { domain: "www.techradar.com", sourceType: "publisher", paths: ["/best/best-email-marketing-services"], weight: 2 },
    { domain: "www.youtube.com", sourceType: "video", paths: ["/watch"], weight: 2, platformBias: { google_ai_overviews: 2.2, gemini: 1.6, claude: 0.1, chatgpt: 0.5 } },
    { domain: "en.wikipedia.org", sourceType: "reference", paths: ["/wiki/Email_marketing"], weight: 1.5, platformBias: { chatgpt: 1.6, claude: 1.4 } },
    { domain: "www.shopify.com", sourceType: "publisher", paths: ["/blog/email-marketing-tools"], weight: 1.5 },
  ],
  "project-management": [
    { domain: "www.g2.com", sourceType: "review_site", paths: ["/categories/project-management"], weight: 5, platformBias: { perplexity: 1.3 } },
    { domain: "www.capterra.com", sourceType: "review_site", paths: ["/project-management-software/"], weight: 4, platformBias: { google_ai_overviews: 1.4 } },
    { domain: "www.reddit.com", sourceType: "community", paths: ["/r/projectmanagement/", "/r/agency/", "/r/startups/"], weight: 4, platformBias: { perplexity: 1.8, google_ai_overviews: 1.6, claude: 0.4 } },
    { domain: "www.pcmag.com", sourceType: "publisher", paths: ["/picks/the-best-project-management-software"], weight: 3, platformBias: { chatgpt: 1.4 } },
    { domain: "www.forbes.com", sourceType: "publisher", paths: ["/advisor/business/software/best-project-management-software/"], weight: 3, platformBias: { gemini: 1.4 } },
    { domain: "www.youtube.com", sourceType: "video", paths: ["/watch"], weight: 2, platformBias: { google_ai_overviews: 2.2, gemini: 1.6, claude: 0.1, chatgpt: 0.5 } },
    { domain: "en.wikipedia.org", sourceType: "reference", paths: ["/wiki/Project_management_software"], weight: 1.5, platformBias: { chatgpt: 1.6, claude: 1.4 } },
    { domain: "www.zapier.com", sourceType: "publisher", paths: ["/blog/best-project-management-apps/"], weight: 2 },
  ],
};

const SOURCE_COUNT: Record<Platform, [number, number]> = {
  chatgpt: [1, 4],
  gemini: [2, 5],
  claude: [0, 3],
  perplexity: [4, 8],
  google_ai_overviews: [3, 6],
};

const OWN_SITE_CITE_FACTOR: Record<Platform, number> = {
  chatgpt: 1,
  gemini: 0.9,
  claude: 0.6,
  perplexity: 1.4,
  google_ai_overviews: 1.1,
};

/** Claude tends to hedge, Perplexity tends to quote reviews more directly. */
const SENTIMENT_SCALE: Record<Platform, number> = {
  chatgpt: 1,
  gemini: 1,
  claude: 0.8,
  perplexity: 1.1,
  google_ai_overviews: 0.95,
};

const AIO_TRIGGER_RATE = 0.75;
const WEEKS = 12;
const RUNS_PER_WEEK = 3; // Monday, Wednesday, Friday
/** Monday of the most recent week in the sample. Fixed so output is reproducible. */
export const SAMPLE_LAST_WEEK = "2026-11-02";

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/** Small seeded PRNG (mulberry32) so every run produces identical data. */
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function pickWeighted<T>(rng: () => number, items: T[], weightOf: (t: T) => number): T {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let r = rng() * total;
  for (const item of items) {
    r -= weightOf(item);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function generateObservations(seed = 20261102): Observation[] {
  const rng = createRng(seed);
  const noise = (scale: number) => (rng() + rng() + rng() - 1.5) * scale; // roughly normal
  const observations: Observation[] = [];
  const firstWeek = addDays(SAMPLE_LAST_WEEK, -7 * (WEEKS - 1));

  for (let w = 0; w < WEEKS; w++) {
    const week = addDays(firstWeek, 7 * w);
    for (let run = 0; run < RUNS_PER_WEEK; run++) {
      const runDate = addDays(week, run * 2);
      for (const query of QUERIES) {
        const brands = BRANDS.filter((b) => b.category === query.category);
        const pool = SOURCE_POOLS[query.category];

        PLATFORMS.forEach((platform, pIndex) => {
          if (platform === "google_ai_overviews" && rng() > AIO_TRIGGER_RATE) return;

          // 1. Which brands get named, and in what order.
          const named: { brand: Brand; score: number }[] = [];
          for (const brand of brands) {
            const p = PROFILES[brand.id];
            const prob = clamp(
              p.visibility[pIndex] + p.trendPerWeek * w + (p.queryBoost?.[query.id] ?? 0) + noise(0.08),
              0.02,
              0.97,
            );
            if (rng() < prob) named.push({ brand, score: prob + rng() * 0.4 });
          }
          named.sort((a, b) => b.score - a.score);

          // 2. Third-party sources the answer cites.
          const [minSources, maxSources] = SOURCE_COUNT[platform];
          const sourceCount = minSources + Math.floor(rng() * (maxSources - minSources + 1));
          const remaining = [...pool];
          const sources: CitedSource[] = [];
          for (let i = 0; i < sourceCount && remaining.length > 0; i++) {
            const tpl = pickWeighted(
              rng,
              remaining,
              (t) =>
                t.weight *
                (t.platformBias?.[platform] ?? 1) *
                named.reduce((f, { brand }) => f * (PROFILES[brand.id].sourceAffinity?.[t.domain] ?? 1), 1),
            );
            remaining.splice(remaining.indexOf(tpl), 1);
            const path = tpl.paths[Math.floor(rng() * tpl.paths.length)];
            const url =
              tpl.sourceType === "video"
                ? `https://${tpl.domain}${path}?v=${slugify(query.id)}-${Math.floor(rng() * 90 + 10)}`
                : `https://${tpl.domain}${path}`;
            sources.push({ url, domain: tpl.domain, sourceType: tpl.sourceType });
          }

          // 3. Mentions, with sentiment and first-party citations.
          const mentions: BrandMention[] = named.map(({ brand }, i) => {
            const p = PROFILES[brand.id];
            const cited = rng() < clamp(p.ownSiteCiteRate * OWN_SITE_CITE_FACTOR[platform], 0, 0.95);
            if (cited) {
              sources.push({
                url: `https://www.${brand.domain}/${slugify(query.text)}`,
                domain: `www.${brand.domain}`,
                sourceType: "brand",
              });
            }
            return {
              brandId: brand.id,
              position: i + 1,
              sentiment: Math.round(clamp(p.sentiment * SENTIMENT_SCALE[platform] + noise(0.5), -1, 1) * 100) / 100,
              cited,
            };
          });

          observations.push({
            id: `${platform}:${query.id}:${runDate}`,
            runDate,
            week,
            platform,
            queryId: query.id,
            mentions,
            sources,
          });
        });
      }
    }
  }
  return observations;
}

// ---------------------------------------------------------------------------
// Data source
// ---------------------------------------------------------------------------

export class SampleAuditDataSource implements AuditDataSource {
  readonly name = "NativeCode Audit sample dataset (fictional brands)";
  readonly isSample = true;
  private readonly observations: Observation[];

  constructor(seed?: number) {
    this.observations = generateObservations(seed);
  }

  async listBrands(): Promise<Brand[]> {
    return BRANDS.map((b) => ({ ...b }));
  }

  async listQueries(): Promise<TrackedQuery[]> {
    return QUERIES.map((q) => ({ ...q }));
  }

  async getObservations(filter: ObservationFilter = {}): Promise<Observation[]> {
    const categoryQueryIds = filter.category
      ? new Set(QUERIES.filter((q) => q.category === filter.category).map((q) => q.id))
      : undefined;
    const queryIds = filter.queryIds ? new Set(filter.queryIds) : undefined;

    return this.observations.filter(
      (o) =>
        (!filter.platform || o.platform === filter.platform) &&
        (!categoryQueryIds || categoryQueryIds.has(o.queryId)) &&
        (!queryIds || queryIds.has(o.queryId)) &&
        (!filter.since || o.runDate >= filter.since) &&
        (!filter.until || o.runDate <= filter.until),
    );
  }
}
