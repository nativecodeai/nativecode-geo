/**
 * Data source for a citation-probe store exposed over REST.
 *
 * Expected endpoints (adjust paths or field mapping here if the real API differs):
 *   GET {baseUrl}/brands                       -> Brand[]
 *   GET {baseUrl}/queries                      -> TrackedQuery[]
 *   GET {baseUrl}/observations?category=&platform=&query_ids=&since=&until=
 *                                              -> Observation[]
 *
 * If the API returns different field names, map them in the `to*` functions
 * below. Nothing else in the server needs to change.
 */
import type {
  AuditDataSource,
  Brand,
  Observation,
  ObservationFilter,
  TrackedQuery,
} from "./types.js";

export interface ApiSourceOptions {
  baseUrl: string;
  apiKey?: string;
  /** Cache brands and queries for this long. Observations are never cached. */
  catalogTtlMs?: number;
  timeoutMs?: number;
}

export class ApiAuditDataSource implements AuditDataSource {
  readonly name = "NativeCode citation probe API";
  readonly isSample = false;
  private readonly opts: Required<Omit<ApiSourceOptions, "apiKey">> & { apiKey?: string };
  private cache = new Map<string, { at: number; value: unknown }>();

  constructor(options: ApiSourceOptions) {
    this.opts = {
      catalogTtlMs: 5 * 60_000,
      timeoutMs: 15_000,
      ...options,
      baseUrl: options.baseUrl.replace(/\/$/, ""),
    };
  }

  async listBrands(): Promise<Brand[]> {
    return this.cached("brands", async () => (await this.get<unknown[]>("/brands")).map(toBrand));
  }

  async listQueries(): Promise<TrackedQuery[]> {
    return this.cached("queries", async () => (await this.get<unknown[]>("/queries")).map(toQuery));
  }

  async getObservations(filter: ObservationFilter = {}): Promise<Observation[]> {
    const params = new URLSearchParams();
    if (filter.category) params.set("category", filter.category);
    if (filter.platform) params.set("platform", filter.platform);
    if (filter.queryIds?.length) params.set("query_ids", filter.queryIds.join(","));
    if (filter.since) params.set("since", filter.since);
    if (filter.until) params.set("until", filter.until);
    const rows = await this.get<unknown[]>(`/observations?${params}`);
    return rows.map(toObservation);
  }

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.opts.catalogTtlMs) return hit.value as T;
    const value = await load();
    this.cache.set(key, { at: Date.now(), value });
    return value;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      headers: {
        Accept: "application/json",
        ...(this.opts.apiKey ? { Authorization: `Bearer ${this.opts.apiKey}` } : {}),
      },
      signal: AbortSignal.timeout(this.opts.timeoutMs),
    });
    if (!res.ok) {
      throw new Error(`NativeCode Audit API ${path} returned ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  }
}

// Field mapping. Identity today; edit if the API uses different names.
const toBrand = (row: unknown) => row as Brand;
const toQuery = (row: unknown) => row as TrackedQuery;
const toObservation = (row: unknown) => row as Observation;
