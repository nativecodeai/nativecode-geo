/**
 * Core data model for NativeCode Audit.
 *
 * NativeCode Audit works by running a fixed set of high-intent prompts
 * ("tracked queries") against each AI platform on a schedule, then recording
 * every answer as an Observation: which tracked brands were named, in what
 * order, with what sentiment, and which sources the answer cited.
 *
 * Every metric the MCP server exposes is computed from Observations, so any
 * data source (sample, REST API, database) only has to return these shapes.
 */

export const PLATFORMS = [
  "chatgpt",
  "gemini",
  "claude",
  "perplexity",
  "google_ai_overviews",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  claude: "Claude",
  perplexity: "Perplexity",
  google_ai_overviews: "Google AI Overviews",
};

export type SourceType =
  | "brand"
  | "review_site"
  | "publisher"
  | "community"
  | "video"
  | "reference";

export interface Brand {
  /** Stable slug, e.g. "larkmail". */
  id: string;
  name: string;
  /** Brand-owned domain, used to detect first-party citations. */
  domain: string;
  /** Category the brand is benchmarked in. Share of voice is computed within it. */
  category: string;
  aliases?: string[];
}

export interface TrackedQuery {
  id: string;
  text: string;
  category: string;
  intent: "commercial" | "transactional" | "informational";
}

export interface BrandMention {
  brandId: string;
  /** 1 = first brand named in the answer. */
  position: number;
  /** -1 (very negative) to 1 (very positive). */
  sentiment: number;
  /** True when the answer linked to a page on the brand's own domain. */
  cited: boolean;
}

export interface CitedSource {
  url: string;
  domain: string;
  sourceType: SourceType;
}

export interface Observation {
  id: string;
  /** ISO date the prompt was run, e.g. "2026-11-03". */
  runDate: string;
  /** ISO date of the Monday that starts the run's week. Used for time series. */
  week: string;
  platform: Platform;
  queryId: string;
  mentions: BrandMention[];
  sources: CitedSource[];
}

export interface ObservationFilter {
  category?: string;
  platform?: Platform;
  queryIds?: string[];
  /** Inclusive ISO date. */
  since?: string;
  /** Inclusive ISO date. */
  until?: string;
}

/**
 * The only contract the rest of the server depends on.
 * Swap implementations in src/data/index.ts.
 */
export interface AuditDataSource {
  readonly name: string;
  /** True when the data is generated for demos rather than collected from real AI answers. */
  readonly isSample: boolean;
  listBrands(): Promise<Brand[]>;
  listQueries(): Promise<TrackedQuery[]>;
  getObservations(filter?: ObservationFilter): Promise<Observation[]>;
}
