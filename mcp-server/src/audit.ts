/**
 * AuditService: the business logic behind every MCP tool and resource.
 * It resolves fuzzy user input (brand names, query text), pulls observations
 * from the data source, and shapes results for LLM consumption.
 * Kept separate from MCP wiring so it can be unit tested and reused (REST, CLI).
 */
import {
  PLATFORMS,
  PLATFORM_LABELS,
  type AuditDataSource,
  type Brand,
  type Observation,
  type Platform,
  type SourceType,
  type TrackedQuery,
} from "./data/types.js";
import { computeVisibility, groupBy, mean, pct, round, slope, type VisibilityMetrics } from "./metrics.js";

/** Errors caused by bad input. Shown to the model so it can correct itself. */
export class AuditInputError extends Error {}

export interface DataSourceInfo {
  name: string;
  sample: boolean;
  note?: string;
}

export interface Period {
  from: string | null;
  to: string | null;
  weeks: number;
}

const DEFAULT_WEEKS = 12;
const TREND_WINDOW = 4;

export class AuditService {
  constructor(private readonly source: AuditDataSource) {}

  get dataSourceInfo(): DataSourceInfo {
    return {
      name: this.source.name,
      sample: this.source.isSample,
      ...(this.source.isSample
        ? { note: "Sample data with fictional brands for demonstration. Connect the NativeCode Audit API for real results." }
        : {}),
    };
  }

  listBrands() {
    return this.source.listBrands();
  }

  listQueries() {
    return this.source.listQueries();
  }

  // -------------------------------------------------------------------------
  // Input resolution
  // -------------------------------------------------------------------------

  async resolveBrand(input: string): Promise<Brand> {
    const brands = await this.source.listBrands();
    const needle = normalize(input);
    const match = brands.find((b) =>
      [b.id, b.name, b.domain, `www.${b.domain}`, ...(b.aliases ?? [])].some((v) => normalize(v) === needle),
    );
    if (match) return match;
    const partial = brands.filter((b) => normalize(b.name).includes(needle) || needle.includes(normalize(b.name)));
    if (partial.length === 1) return partial[0];
    throw new AuditInputError(
      `Brand "${input}" is not tracked. Tracked brands: ${brands.map((b) => `${b.name} (${b.category})`).join(", ")}.`,
    );
  }

  async resolveQuery(input: string, category: string): Promise<TrackedQuery> {
    const queries = (await this.source.listQueries()).filter((q) => q.category === category);
    const needle = normalize(input);
    const exact = queries.find((q) => q.id === input || normalize(q.text) === needle);
    if (exact) return exact;

    // Fall back to the closest tracked query by word overlap.
    const words = tokenSet(input);
    let best: { q: TrackedQuery; score: number } | undefined;
    for (const q of queries) {
      const qWords = tokenSet(q.text);
      const shared = [...words].filter((w) => qWords.has(w)).length;
      const score = shared / new Set([...words, ...qWords]).size;
      if (!best || score > best.score) best = { q, score };
    }
    if (best && best.score >= 0.3) return best.q;
    throw new AuditInputError(
      `No tracked query matches "${input}" in ${category}. Tracked queries: ${queries.map((q) => `"${q.text}"`).join(", ")}.`,
    );
  }

  // -------------------------------------------------------------------------
  // Tools
  // -------------------------------------------------------------------------

  async getAiVisibility(brandInput: string, platform?: Platform, weeks = DEFAULT_WEEKS) {
    const brand = await this.resolveBrand(brandInput);
    const obs = await this.window({ category: brand.category, platform }, weeks);
    const categoryBrands = (await this.source.listBrands()).filter((b) => b.category === brand.category);

    const byPlatform: Partial<Record<Platform, VisibilityMetrics>> = {};
    for (const p of platform ? [platform] : PLATFORMS) {
      byPlatform[p] = computeVisibility(brand.id, obs.filter((o) => o.platform === p));
    }

    const ranking = categoryBrands
      .map((b) => ({ brand: b.name, share_of_voice_pct: computeVisibility(b.id, obs).share_of_voice_pct }))
      .sort((a, b) => b.share_of_voice_pct - a.share_of_voice_pct);
    const overall = computeVisibility(brand.id, obs);

    return {
      brand: brandRef(brand),
      platform: platform ? PLATFORM_LABELS[platform] : "All platforms",
      period: periodOf(obs, weeks),
      overall,
      by_platform: labelKeys(byPlatform),
      category_rank: {
        rank: ranking.findIndex((r) => r.brand === brand.name) + 1,
        of: ranking.length,
        ranking,
      },
      insights: visibilityInsights(brand, overall, byPlatform),
      data_source: this.dataSourceInfo,
    };
  }

  async compareBrands(brandInputs: string[], queryInput?: string, platform?: Platform, weeks = DEFAULT_WEEKS) {
    if (brandInputs.length < 2) throw new AuditInputError("Provide at least two brands to compare.");
    const brands = await Promise.all(brandInputs.map((b) => this.resolveBrand(b)));
    const unique = [...new Map(brands.map((b) => [b.id, b])).values()];
    const categories = new Set(unique.map((b) => b.category));
    if (categories.size > 1) {
      throw new AuditInputError(
        `Brands must be in the same category to compare share of voice. Got: ${unique.map((b) => `${b.name} (${b.category})`).join(", ")}.`,
      );
    }
    const category = unique[0].category;
    const query = queryInput ? await this.resolveQuery(queryInput, category) : undefined;
    const obs = await this.window({ category, platform, queryIds: query ? [query.id] : undefined }, weeks);

    const metrics = unique.map((b) => ({ brand: b, m: computeVisibility(b.id, obs) }));
    const totalMentions = metrics.reduce((s, x) => s + x.m.mentions, 0);
    const totalCitations = metrics.reduce((s, x) => s + x.m.citations, 0);

    const rows = metrics
      .map(({ brand, m }) => ({
        brand: brand.name,
        share_of_voice_pct: m.share_of_voice_pct,
        head_to_head_share_pct: pct(m.mentions, totalMentions),
        citation_share_pct: pct(m.citations, totalCitations),
        mention_rate_pct: m.mention_rate_pct,
        citation_rate_pct: m.citation_rate_pct,
        avg_position: m.avg_position,
        sentiment_score: m.sentiment.score,
        sentiment_label: m.sentiment.label,
      }))
      .sort((a, b) => b.share_of_voice_pct - a.share_of_voice_pct);

    const byPlatform: Record<string, { leader: string; share_of_voice_pct: Record<string, number> }> = {};
    for (const p of platform ? [platform] : PLATFORMS) {
      const pObs = obs.filter((o) => o.platform === p);
      const sov = Object.fromEntries(unique.map((b) => [b.name, computeVisibility(b.id, pObs).share_of_voice_pct]));
      const leader = Object.entries(sov).sort((a, b) => b[1] - a[1])[0][0];
      byPlatform[PLATFORM_LABELS[p]] = { leader, share_of_voice_pct: sov };
    }

    return {
      category,
      query: query ? { id: query.id, text: query.text, matched_from: queryInput } : "All tracked queries in category",
      platform: platform ? PLATFORM_LABELS[platform] : "All platforms",
      period: periodOf(obs, weeks),
      answers_sampled: obs.length,
      leader: rows[0].brand,
      brands: rows,
      by_platform: byPlatform,
      notes: [
        "share_of_voice_pct is measured against every tracked brand in the category.",
        "head_to_head_share_pct and citation_share_pct are measured only among the brands compared here.",
      ],
      data_source: this.dataSourceInfo,
    };
  }

  async getCitationSources(brandInput: string, queryInput?: string, platform?: Platform, weeks = DEFAULT_WEEKS, limit = 10) {
    const brand = await this.resolveBrand(brandInput);
    const query = queryInput ? await this.resolveQuery(queryInput, brand.category) : undefined;
    const obs = await this.window({ category: brand.category, platform, queryIds: query ? [query.id] : undefined }, weeks);

    const ownDomain = `www.${brand.domain}`;
    const withBrand = obs.filter((o) => o.mentions.some((m) => m.brandId === brand.id));
    const competitorOnly = obs.filter((o) => o.mentions.length > 0 && !o.mentions.some((m) => m.brandId === brand.id));

    const topSources = aggregateSources(withBrand, limit, (d) => d !== ownDomain);
    const brandShare = new Map(aggregateSources(withBrand, Infinity, () => true).map((s) => [s.domain, s.share_of_answers_pct]));
    const gapSources = aggregateSources(competitorOnly, Infinity, (d) => d !== ownDomain)
      .filter((s) => s.source_type !== "brand") // competitors' own sites are not actionable
      .map((s) => {
        const inBrand = brandShare.get(s.domain) ?? 0;
        return {
          domain: s.domain,
          source_type: s.source_type,
          answers: s.answers,
          share_in_competitor_answers_pct: s.share_of_answers_pct,
          share_in_brand_answers_pct: inBrand,
          gap_pts: round(s.share_of_answers_pct - inBrand, 1),
          top_urls: s.top_urls,
        };
      })
      .filter((s) => s.gap_pts > 0)
      .sort((a, b) => b.gap_pts - a.gap_pts)
      .slice(0, limit);
    const ownSite = aggregateSources(withBrand, 5, (d) => d === ownDomain)[0];

    const typeCounts = new Map<SourceType, number>();
    let totalCitations = 0;
    for (const o of withBrand) {
      for (const s of o.sources) {
        typeCounts.set(s.sourceType, (typeCounts.get(s.sourceType) ?? 0) + 1);
        totalCitations++;
      }
    }

    return {
      brand: brandRef(brand),
      query: query ? { id: query.id, text: query.text, matched_from: queryInput } : "All tracked queries in category",
      platform: platform ? PLATFORM_LABELS[platform] : "All platforms",
      period: periodOf(obs, weeks),
      answers_sampled: obs.length,
      answers_naming_brand: withBrand.length,
      top_sources: topSources,
      own_site: ownSite
        ? { domain: ownDomain, answers: ownSite.answers, share_of_brand_answers_pct: ownSite.share_of_answers_pct, top_urls: ownSite.top_urls }
        : { domain: ownDomain, answers: 0, share_of_brand_answers_pct: 0, top_urls: [] },
      source_type_mix_pct: Object.fromEntries([...typeCounts].map(([t, c]) => [t, pct(c, totalCitations)])),
      gap_sources: {
        description:
          "Domains cited more often in answers that name competitors but not this brand than in answers that name it. gap_pts is the difference in share of answers. Earning coverage on these sources is the most direct path to more AI mentions.",
        answers_without_brand: competitorOnly.length,
        sources: gapSources,
      },
      data_source: this.dataSourceInfo,
    };
  }

  async getShareOfModelVoice(brandInput: string, platform?: Platform, weeks = DEFAULT_WEEKS) {
    const brand = await this.resolveBrand(brandInput);
    const obs = await this.window({ category: brand.category, platform }, weeks);
    const categoryBrands = (await this.source.listBrands()).filter((b) => b.category === brand.category);

    const series = weeklySeries(brand.id, obs);
    const sovValues = series.map((s) => s.share_of_voice_pct);
    const trend = describeTrend(sovValues);

    const byPlatform = platform
      ? undefined
      : Object.fromEntries(
          PLATFORMS.map((p) => {
            const t = describeTrend(weeklySeries(brand.id, obs.filter((o) => o.platform === p)).map((s) => s.share_of_voice_pct));
            return [PLATFORM_LABELS[p], { recent_avg_pct: t.recent_avg_pct, change_pts: t.change_pts, direction: t.direction }];
          }),
        );

    const recentWeeks = new Set(series.slice(-TREND_WINDOW).map((s) => s.week));
    const recentObs = obs.filter((o) => recentWeeks.has(o.week));
    const competitors = categoryBrands
      .filter((b) => b.id !== brand.id)
      .map((b) => ({
        brand: b.name,
        recent_avg_pct: computeVisibility(b.id, recentObs).share_of_voice_pct,
        change_pts: describeTrend(weeklySeries(b.id, obs).map((s) => s.share_of_voice_pct)).change_pts,
      }))
      .sort((a, b) => b.recent_avg_pct - a.recent_avg_pct);

    return {
      brand: brandRef(brand),
      metric: "Share of Model Voice: the brand's share of all tracked-brand mentions in AI answers, by week.",
      platform: platform ? PLATFORM_LABELS[platform] : "All platforms",
      period: periodOf(obs, weeks),
      trend,
      series,
      by_platform: byPlatform,
      competitors_recent: competitors,
      data_source: this.dataSourceInfo,
    };
  }

  /** Markdown report used by the brand report resource. */
  async brandReportMarkdown(brandInput: string): Promise<string> {
    const vis = await this.getAiVisibility(brandInput);
    const somv = await this.getShareOfModelVoice(brandInput);
    const sources = await this.getCitationSources(brandInput, undefined, undefined, DEFAULT_WEEKS, 5);
    const o = vis.overall;

    const platformRows = Object.entries(vis.by_platform)
      .map(([p, m]) => `| ${p} | ${m.mention_rate_pct}% | ${m.citation_rate_pct}% | ${m.share_of_voice_pct}% | ${m.avg_position ?? "n/a"} | ${m.sentiment.score ?? "n/a"} (${m.sentiment.label}) |`)
      .join("\n");

    return [
      `# AI Visibility Report: ${vis.brand.name}`,
      "",
      `Category: ${vis.brand.category}. Period: ${vis.period.from} to ${vis.period.to} (${vis.period.weeks} weeks). Source: ${vis.data_source.name}.`,
      vis.data_source.sample ? `\n> ${vis.data_source.note}\n` : "",
      "## Summary",
      `- Share of voice: ${o.share_of_voice_pct}% (rank ${vis.category_rank.rank} of ${vis.category_rank.of} in category)`,
      `- Named in ${o.mention_rate_pct}% of ${o.answers_sampled} sampled AI answers; own site cited in ${o.citation_rate_pct}%`,
      `- Sentiment: ${o.sentiment.score} (${o.sentiment.label}); ${o.sentiment.positive_pct}% positive, ${o.sentiment.negative_pct}% negative`,
      `- Share of Model Voice trend: ${somv.trend.direction} (${somv.trend.change_pts >= 0 ? "+" : ""}${somv.trend.change_pts} pts, first ${TREND_WINDOW} weeks vs last ${TREND_WINDOW})`,
      "",
      "## By platform",
      "| Platform | Mention rate | Citation rate | Share of voice | Avg position | Sentiment |",
      "|---|---|---|---|---|---|",
      platformRows,
      "",
      "## Most-cited sources when the brand is named",
      ...sources.top_sources.map((s) => `- ${s.domain} (${s.source_type}): in ${s.share_of_answers_pct}% of answers naming the brand`),
      "",
      "## Gap sources (cited when competitors are named and this brand is not)",
      ...(sources.gap_sources.sources.length
        ? sources.gap_sources.sources.map(
            (s) => `- ${s.domain} (${s.source_type}): in ${s.share_in_competitor_answers_pct}% of competitor-only answers vs ${s.share_in_brand_answers_pct}% of answers naming the brand (+${s.gap_pts} pts)`,
          )
        : ["- None. The brand's source footprint matches its competitors'."]),
      "",
      "## Insights",
      ...vis.insights.map((i) => `- ${i}`),
    ].join("\n");
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Fetch observations and keep only the most recent `weeks` weeks. */
  private async window(
    filter: { category: string; platform?: Platform; queryIds?: string[] },
    weeks: number,
  ): Promise<Observation[]> {
    const obs = await this.source.getObservations(filter);
    const allWeeks = [...new Set(obs.map((o) => o.week))].sort();
    const keep = new Set(allWeeks.slice(-Math.max(1, Math.floor(weeks))));
    return obs.filter((o) => keep.has(o.week));
  }
}

// ---------------------------------------------------------------------------
// Module helpers
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s.toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9.]+/g, " ").trim();
}

const STOPWORDS = new Set(["the", "a", "an", "for", "with", "of", "to", "and", "in", "best", "top"]);
function tokenSet(s: string): Set<string> {
  return new Set(normalize(s).split(/\s+/).filter((w) => w && !STOPWORDS.has(w)));
}

function brandRef(b: Brand) {
  return { id: b.id, name: b.name, domain: b.domain, category: b.category };
}

function labelKeys<T>(record: Partial<Record<Platform, T>>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [PLATFORM_LABELS[k as Platform], v as T]));
}

function periodOf(obs: Observation[], weeksRequested: number): Period {
  if (obs.length === 0) return { from: null, to: null, weeks: 0 };
  const dates = obs.map((o) => o.runDate).sort();
  return { from: dates[0], to: dates[dates.length - 1], weeks: Math.min(weeksRequested, new Set(obs.map((o) => o.week)).size) };
}

function weeklySeries(brandId: string, obs: Observation[]) {
  const byWeek = groupBy(obs, (o) => o.week);
  return [...byWeek.keys()].sort().map((week) => {
    const m = computeVisibility(brandId, byWeek.get(week)!);
    return { week, share_of_voice_pct: m.share_of_voice_pct, mention_rate_pct: m.mention_rate_pct, answers: m.answers_sampled };
  });
}

function describeTrend(values: number[]) {
  const window = Math.min(TREND_WINDOW, Math.floor(values.length / 2) || 1);
  const early = mean(values.slice(0, window)) ?? 0;
  const recent = mean(values.slice(-window)) ?? 0;
  const perWeek = slope(values);
  const change = round(recent - early, 1);
  return {
    early_avg_pct: round(early, 1),
    recent_avg_pct: round(recent, 1),
    change_pts: change,
    slope_pts_per_week: round(perWeek, 2),
    direction: Math.abs(perWeek) < 0.15 ? "flat" : perWeek > 0 ? "rising" : "falling",
  } as const;
}

function aggregateSources(obs: Observation[], limit: number, include: (domain: string) => boolean) {
  const stats = new Map<string, { type: SourceType; answers: number; urls: Map<string, number>; platforms: Set<Platform> }>();
  for (const o of obs) {
    const seen = new Set<string>();
    for (const s of o.sources) {
      if (!include(s.domain)) continue;
      let st = stats.get(s.domain);
      if (!st) {
        st = { type: s.sourceType, answers: 0, urls: new Map(), platforms: new Set() };
        stats.set(s.domain, st);
      }
      if (!seen.has(s.domain)) {
        st.answers++;
        seen.add(s.domain);
      }
      st.urls.set(s.url, (st.urls.get(s.url) ?? 0) + 1);
      st.platforms.add(o.platform);
    }
  }
  return [...stats.entries()]
    .sort((a, b) => b[1].answers - a[1].answers)
    .slice(0, limit)
    .map(([domain, st]) => ({
      domain,
      source_type: st.type,
      answers: st.answers,
      share_of_answers_pct: pct(st.answers, obs.length),
      platforms: [...st.platforms].map((p) => PLATFORM_LABELS[p]),
      top_urls: [...st.urls.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([url, count]) => ({ url, count })),
    }));
}

function visibilityInsights(brand: Brand, overall: VisibilityMetrics, byPlatform: Partial<Record<Platform, VisibilityMetrics>>): string[] {
  const entries = Object.entries(byPlatform) as [Platform, VisibilityMetrics][];
  const insights: string[] = [];
  if (entries.length > 1) {
    const sorted = [...entries].sort((a, b) => b[1].share_of_voice_pct - a[1].share_of_voice_pct);
    const [best, worst] = [sorted[0], sorted[sorted.length - 1]];
    insights.push(
      `Strongest on ${PLATFORM_LABELS[best[0]]} (${best[1].share_of_voice_pct}% SoV), weakest on ${PLATFORM_LABELS[worst[0]]} (${worst[1].share_of_voice_pct}% SoV).`,
    );
  }
  if (overall.mention_rate_pct > 0 && overall.citation_rate_pct / overall.mention_rate_pct < 0.3) {
    insights.push(
      `${brand.name} is named far more often than its own site is cited (${overall.citation_rate_pct}% vs ${overall.mention_rate_pct}%). Answer-ready pages on ${brand.domain} could capture more citations.`,
    );
  }
  if (overall.sentiment.label === "negative") {
    insights.push(`Sentiment is negative (${overall.sentiment.score}). Review the third-party sources driving these answers.`);
  }
  if (overall.avg_position !== null && overall.avg_position > 2.5) {
    insights.push(`Usually named after competitors (average position ${overall.avg_position}).`);
  }
  return insights;
}
