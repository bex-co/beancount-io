import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ServerResponse } from "node:http";
import { logger } from "@/shared/logger";
import { InternalServerError } from "@/shared/errors";
import type { IAgentHandler, AgentHandlerContext } from "./agent-handler";

const handlerLogger = logger.child({ module: "sandbox-proxy-agent-handler" });

const SSE_HEADERS = [
  "content-type",
  "cache-control",
  "x-vercel-ai-data-stream",
] as const;

export class SandboxProxyAgentHandler implements IAgentHandler {
  constructor(private readonly sandboxApiUrl: string) {}

  async handle(ctx: AgentHandlerContext, res: ServerResponse): Promise<void> {
    const { messages, ledgerId, mcpUrl, mcpToken, sessionId } = ctx;

    const sandboxResponse = await fetch(this.sandboxApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, ledgerId, mcpUrl, mcpToken, sessionId }),
    });

    if (!sandboxResponse.ok) {
      const errorText = await sandboxResponse.text().catch(() => "");
      handlerLogger.error("Sandbox returned non-200 status", {
        status: sandboxResponse.status,
        body: errorText.substring(0, 200),
      });
      throw new InternalServerError(
        `Sandbox error: ${errorText.substring(0, 100)}`,
        undefined,
        sandboxResponse.status,
      );
    }

    if (!sandboxResponse.body) {
      throw new InternalServerError(
        "No response body from sandbox",
        undefined,
        502,
      );
    }

    for (const header of SSE_HEADERS) {
      const value = sandboxResponse.headers.get(header);
      if (value) res.setHeader(header, value);
    }

    res.writeHead(200);

    const nodeReadable = Readable.fromWeb(
      sandboxResponse.body as import("stream/web").ReadableStream<Uint8Array>,
    );
    await pipeline(nodeReadable, res, { end: true });
  }
}
