/**
 * Streamable HTTP entry point, for hosting the server so remote MCP clients
 * (Claude custom connectors, agents, the MCP Inspector) can connect by URL.
 *
 * Stateless: each POST /mcp gets a fresh server and transport, which keeps it
 * simple to run on Render, Fly.io, Railway, Cloud Run, or any container host.
 *
 * Env:
 *   PORT            default 3000
 *   MCP_AUTH_TOKEN  optional; when set, requests need "Authorization: Bearer <token>"
 */
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { configFromEnv } from "./config.js";
import { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

const PORT = Number(process.env.PORT ?? 3000);
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;
const MAX_BODY_BYTES = 1_000_000;
const options = configFromEnv();

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body too large");
    chunks.push(chunk as Buffer);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : undefined;
}

export const httpServer = createHttpServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname === "/health") {
    return sendJson(res, 200, { ok: true, server: SERVER_NAME, version: SERVER_VERSION, audit_api: options.auditClient.baseUrl, probes: options.probeSource ? "preview (sample data)" : "off" });
  }
  if (url.pathname !== "/mcp") return sendJson(res, 404, { error: "Not found. MCP endpoint is POST /mcp." });

  if (AUTH_TOKEN && req.headers.authorization !== `Bearer ${AUTH_TOKEN}`) {
    return sendJson(res, 401, { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed. This server is stateless; use POST." }, id: null });
  }

  try {
    const body = await readJson(req);
    const server = createServer(options);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (err) {
    console.error("MCP request failed:", err);
    if (!res.headersSent) {
      sendJson(res, 400, { jsonrpc: "2.0", error: { code: -32700, message: err instanceof Error ? err.message : "Bad request" }, id: null });
    }
  }
});

// Start only when run directly (tests import httpServer and listen themselves).
if (import.meta.url === `file://${process.argv[1]}`) {
  httpServer.listen(PORT, () => {
    console.error(`nativecode-audit MCP server on http://localhost:${PORT}/mcp (audit: ${options.auditClient.baseUrl})`);
  });
}
