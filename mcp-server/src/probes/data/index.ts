/**
 * The one place that decides where citation-probe data comes from.
 *
 * - Set NATIVECODE_PROBES_API_URL (and optionally NATIVECODE_PROBES_API_KEY)
 *   to use a real probe store.
 * - Otherwise the server runs on the built-in sample dataset.
 *
 * To connect a database or another backend, implement AuditDataSource
 * (see ./types.ts) and return it here.
 */
import { ApiAuditDataSource } from "./api-source.js";
import { SampleAuditDataSource } from "./sample-source.js";
import type { AuditDataSource } from "./types.js";

export function createProbeSource(env: NodeJS.ProcessEnv = process.env): AuditDataSource {
  if (env.NATIVECODE_PROBES_API_URL) {
    return new ApiAuditDataSource({
      baseUrl: env.NATIVECODE_PROBES_API_URL,
      apiKey: env.NATIVECODE_PROBES_API_KEY,
    });
  }
  return new SampleAuditDataSource();
}

export * from "./types.js";
