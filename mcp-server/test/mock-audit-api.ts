/**
 * A stand-in for app.nativecode.ai that serves reports produced by the real
 * NativeCode Audit engine (run against its own well-built and badly-built
 * fixture sites). Lets the live tools be tested offline with genuine output.
 */
import { readFileSync } from "node:fs";

const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")).report;
const GOOD = load("audit-good.json");
const POOR = load("audit-poor.json");

export function mockAuditFetch() {
  const calls: { url: string; method: string; body?: any }[] = [];
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url: url.toString(), method: init?.method ?? "GET", body });

    if (url.pathname === "/api/audit" && init?.method === "POST") {
      const domain: string = body.domain;
      if (domain.startsWith("down.")) return json(502, { error: `Could not reach ${domain}. DNS lookup failed. Check the domain and try again.` });
      if (domain.startsWith("busy.")) return json(429, { error: "That is a lot of audits in a short window. Give it a few minutes and try again." });
      const base = domain.startsWith("poor.") ? POOR : GOOD;
      return json(200, { report: { ...base, domain, inputs: { ...base.inputs, domain, businessModel: body.businessModel } } });
    }
    if (url.pathname === "/api/report") {
      return url.searchParams.get("id") === "abc123def456" ? json(200, { report: GOOD }) : json(404, { error: "That report has expired or never existed." });
    }
    return json(404, { error: "Not found" });
  }) as typeof fetch;

  return { fetch: fetchImpl, calls };
}
