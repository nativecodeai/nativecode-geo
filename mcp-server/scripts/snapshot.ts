/**
 * Writes the full audit_site output for a domain, produced through a real MCP
 * client session against the live Audit API. Used by the pipeline to publish
 * a verifiable example.   npx tsx scripts/snapshot.ts nativecode.ai out.json
 */
import { writeFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { AuditClient } from "../src/live/audit-client.js";
import { createServer } from "../src/server.js";

const [domain = "nativecode.ai", out = "audit.json"] = process.argv.slice(2);
const server = createServer({ auditClient: new AuditClient() });
const [ct, st] = InMemoryTransport.createLinkedPair();
const client = new Client({ name: "snapshot", version: "1.0.0" });
await Promise.all([server.connect(st), client.connect(ct)]);
const res = await client.callTool({ name: "audit_site", arguments: { domain, detail: "full" } });
const text = (res.content as { text: string }[])[0].text;
if (res.isError) throw new Error(text);
await writeFile(out, JSON.stringify({ tool: "audit_site", arguments: { domain, detail: "full" }, captured_at: new Date().toISOString(), result: JSON.parse(text) }, null, 2));
console.log(`wrote ${out}`);
await client.close();
