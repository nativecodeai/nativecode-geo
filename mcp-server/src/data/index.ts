/**
 * The one place that decides where NativeCode Audit data comes from.
 *
 * - Set NATIVECODE_AUDIT_API_URL (and optionally NATIVECODE_AUDIT_API_KEY)
 *   to use the live API.
 * - Otherwise the server runs on the built-in sample dataset.
 *
 * To connect a database or another backend, implement AuditDataSource
 * (see ./types.ts) and return it here.
 */
import { ApiAuditDataSource } from "./api-source.js";
import { SampleAuditDataSource } from "./sample-source.js";
import type { AuditDataSource } from "./types.js";

export function createDataSource(env: NodeJS.ProcessEnv = process.env): AuditDataSource {
  if (env.NATIVECODE_AUDIT_API_URL) {
    return new ApiAuditDataSource({
      baseUrl: env.NATIVECODE_AUDIT_API_URL,
      apiKey: env.NATIVECODE_AUDIT_API_KEY,
    });
  }
  return new SampleAuditDataSource();
}

export * from "./types.js";
