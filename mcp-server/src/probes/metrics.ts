/**
 * Pure metric functions. Every number the server reports is computed here
 * from raw Observations, so the definitions live in one place.
 *
 * Definitions (also served to LLMs as the nativecode://methodology resource):
 * - Mention rate: share of sampled AI answers that name the brand.
 * - Citation rate: share of sampled AI answers that link to the brand's own site.
 * - Share of voice (SoV): brand mentions / all tracked-brand mentions in the same answers.
 * - Share of Model Voice (SoMV): SoV tracked week by week, per platform or overall.
 * - Average position: mean rank of the brand among brands named (1 = named first).
 * - Sentiment score: mean sentiment of mentions, -1 to 1.
 */
import type { Observation } from "./data/types.js";

export interface SentimentSummary {
  score: number | null;
  label: "positive" | "neutral" | "negative" | "no data";
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
}

export interface VisibilityMetrics {
  answers_sampled: number;
  mentions: number;
  mention_rate_pct: number;
  citations: number;
  citation_rate_pct: number;
  share_of_voice_pct: number;
  avg_position: number | null;
  sentiment: SentimentSummary;
}

export const POSITIVE_THRESHOLD = 0.25;
export const NEGATIVE_THRESHOLD = -0.15;

export const pct = (part: number, whole: number) => (whole === 0 ? 0 : round((part / whole) * 100, 1));
export const round = (v: number, digits = 2) => Math.round(v * 10 ** digits) / 10 ** digits;
export const mean = (xs: number[]) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);

export function sentimentLabel(score: number | null): SentimentSummary["label"] {
  if (score === null) return "no data";
  if (score >= POSITIVE_THRESHOLD) return "positive";
  if (score <= NEGATIVE_THRESHOLD) return "negative";
  return "neutral";
}

export function summarizeSentiment(scores: number[]): SentimentSummary {
  const avg = mean(scores);
  const pos = scores.filter((s) => s >= POSITIVE_THRESHOLD).length;
  const neg = scores.filter((s) => s <= NEGATIVE_THRESHOLD).length;
  return {
    score: avg === null ? null : round(avg),
    label: sentimentLabel(avg),
    positive_pct: pct(pos, scores.length),
    neutral_pct: pct(scores.length - pos - neg, scores.length),
    negative_pct: pct(neg, scores.length),
  };
}

/**
 * Visibility metrics for one brand over a set of observations.
 * Observations should already be limited to the brand's category, since
 * share of voice is measured against the other tracked brands in those answers.
 */
export function computeVisibility(brandId: string, observations: Observation[]): VisibilityMetrics {
  let mentions = 0;
  let citations = 0;
  let allMentions = 0;
  const positions: number[] = [];
  const sentiments: number[] = [];

  for (const o of observations) {
    allMentions += o.mentions.length;
    const m = o.mentions.find((x) => x.brandId === brandId);
    if (!m) continue;
    mentions++;
    positions.push(m.position);
    sentiments.push(m.sentiment);
    if (m.cited) citations++;
  }

  const avgPos = mean(positions);
  return {
    answers_sampled: observations.length,
    mentions,
    mention_rate_pct: pct(mentions, observations.length),
    citations,
    citation_rate_pct: pct(citations, observations.length),
    share_of_voice_pct: pct(mentions, allMentions),
    avg_position: avgPos === null ? null : round(avgPos, 1),
    sentiment: summarizeSentiment(sentiments),
  };
}

/** Least-squares slope of y over x = 0..n-1. */
export function slope(ys: number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  ys.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

export function groupBy<T, K extends string>(items: T[], key: (t: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}
