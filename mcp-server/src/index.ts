#!/usr/bin/env node
/**
 * stdio entry point. This is what Claude Desktop, Claude Code, Cursor, and
 * other local MCP clients launch.
 *
 * Env:
 *   NATIVECODE_AUDIT_URL      Audit API base URL. Default https://app.nativecode.ai
 *   NATIVECODE_PROBES         "off" hides the citation probe preview tools
 *   NATIVECODE_PROBES_API_URL use a real probe store instead of sample data
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { configFromEnv } from "./config.js";
import { createServer } from "./server.js";

async function main() {
  const options = configFromEnv();
  const server = createServer(options);
  await server.connect(new StdioServerTransport());
  // stdout carries the protocol, so log to stderr only.
  console.error(`nativecode-audit MCP server on stdio (audit: ${options.auditClient.baseUrl}; probes: ${options.probeSource?.name ?? "off"})`);
}

main().catch((err) => {
  console.error("Fatal error starting nativecode-audit MCP server:", err);
  process.exit(1);
});
