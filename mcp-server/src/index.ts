#!/usr/bin/env node
/**
 * stdio entry point. This is what Claude Desktop, Claude Code, Cursor, and
 * other local MCP clients launch.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDataSource } from "./data/index.js";
import { createServer } from "./server.js";

async function main() {
  const source = createDataSource();
  const server = createServer(source);
  await server.connect(new StdioServerTransport());
  // stdout carries the protocol, so log to stderr only.
  console.error(`nativecode-audit MCP server running on stdio (data: ${source.name})`);
}

main().catch((err) => {
  console.error("Fatal error starting nativecode-audit MCP server:", err);
  process.exit(1);
});
