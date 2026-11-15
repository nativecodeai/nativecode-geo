import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const READ_ONLY_LOCAL = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
/** Live tools reach out to the Audit API and the audited site. */
export const READ_ONLY_REMOTE = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

/**
 * Wraps a tool body: JSON text for every client, structured content for
 * clients that use it, and errors the model can read and act on.
 * `explain` turns known errors into a clean message; anything else is reported generically.
 */
export async function toolResult(
  fn: () => Promise<Record<string, unknown>>,
  explain: (err: unknown) => string | undefined = () => undefined,
): Promise<CallToolResult> {
  try {
    const result = await fn();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result };
  } catch (err) {
    const message = explain(err) ?? `Error: ${err instanceof Error ? err.message : String(err)}`;
    return { content: [{ type: "text", text: message }], isError: true };
  }
}
