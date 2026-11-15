import { AuditClient } from "./live/audit-client.js";
import { createProbeSource } from "./probes/data/index.js";
import type { ServerOptions } from "./server.js";

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): ServerOptions {
  return {
    auditClient: new AuditClient({ baseUrl: env.NATIVECODE_AUDIT_URL }),
    probeSource: env.NATIVECODE_PROBES === "off" ? undefined : createProbeSource(env),
  };
}
