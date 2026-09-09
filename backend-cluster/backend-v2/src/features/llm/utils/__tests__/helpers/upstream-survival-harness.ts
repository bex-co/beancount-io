/**
 * Child-process harness for the LLM upstream-survival regression (w2/m30/t001,
 * ADR 0011 D6). Runs the real extraction path — real AI SDK, real fallback
 * factory — against a deliberately hostile local "Anthropic" upstream, and
 * prints HANDLED when the failure surfaced as an ordinary thrown error. A
 * crash (uncaught exception / unhandled rejection escalated by --unhandled-
 * rejections=strict) exits non-zero without the marker, which is what the
 * parent test asserts against.
 *
 * Modes: reject401 | destroy-mid-body | garbage-then-destroy | reset
 */
import http from "http";
import { AddressInfo } from "net";
import { extractTransactionsFromFile } from "../../extract-transactions-from-file";
import { extractReceiptFromFile } from "../../extract-receipt-from-file";
import { LLMClient } from "../../llm-client";

const MODES = [
  "reject401",
  "destroy-mid-body",
  "garbage-then-destroy",
  "reset",
] as const;
type Mode = (typeof MODES)[number];

// A tiny valid JPEG so the image leg has real bytes to serve.
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APvSiigD/9k=",
  "base64",
);

async function runMode(mode: Mode): Promise<void> {
  // Serves both the "uploaded file" (GET /file.jpg) and the hostile
  // /v1/messages endpoint, per mode.
  const server = http.createServer((req, res) => {
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(JPEG);
      return;
    }
    switch (mode) {
      case "reject401":
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            type: "error",
            error: { type: "authentication_error", message: "bad key" },
          }),
        );
        return;
      case "destroy-mid-body":
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Content-Length": "4096",
        });
        res.write('{"id":"msg_x","type":"message","content":[');
        setTimeout(() => res.destroy(new Error("upstream died")), 30);
        return;
      case "garbage-then-destroy":
        res.writeHead(200, { "Content-Type": "application/json" });
        res.write("<<<not json at all>>>");
        setTimeout(() => res.socket?.destroy(), 30);
        return;
      case "reset":
      default:
        req.socket.destroy();
        return;
    }
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const origin = `http://127.0.0.1:${port}`;

  process.env.ANTHROPIC_API_KEY = "sk-ant-harness";
  process.env.ANTHROPIC_BASE_URL = `${origin}/v1`;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;

  try {
    await extractTransactionsFromFile({
      llmClient: new LLMClient(),
      fileUrl: `${origin}/file.jpg`,
      format: "jpg",
      mediaType: "image/jpeg",
    });
    console.log(`UNEXPECTED_SUCCESS:${mode}`);
  } catch {
    console.log(`HANDLED:${mode}`);
  } finally {
    server.close();
  }
}

/**
 * Failover rescue: the Anthropic upstream rejects, a mock OpenAI upstream
 * serves a valid structured completion — the receipt extraction must succeed
 * through the fallback leg alone (w2/m30/t002 acceptance).
 */
async function runOpenAIRescue(): Promise<void> {
  const receiptJson = JSON.stringify({
    transactions: [
      {
        date: null,
        payee: "Rescue Mart",
        description: "Groceries",
        amount: -1,
      },
    ],
  });
  const server = http.createServer((req, res) => {
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(JPEG);
      return;
    }
    // The @ai-sdk/openai provider uses the Responses API for structured output.
    if (req.url?.includes("/responses")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "resp_harness",
          object: "response",
          created_at: 0,
          status: "completed",
          model: "gpt-4o",
          output: [
            {
              type: "message",
              id: "msg_harness",
              status: "completed",
              role: "assistant",
              content: [
                { type: "output_text", text: receiptJson, annotations: [] },
              ],
            },
          ],
          usage: {
            input_tokens: 1,
            output_tokens: 1,
            total_tokens: 2,
          },
        }),
      );
      return;
    }
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        type: "error",
        error: { type: "authentication_error", message: "bad key" },
      }),
    );
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  const origin = `http://127.0.0.1:${port}`;

  process.env.ANTHROPIC_API_KEY = "sk-ant-harness";
  process.env.ANTHROPIC_BASE_URL = `${origin}/v1`;
  process.env.OPENAI_API_KEY = "sk-oai-harness";
  process.env.OPENAI_BASE_URL = `${origin}/openai/v1`;

  try {
    const { transaction } = await extractReceiptFromFile({
      llmClient: new LLMClient(),
      fileUrl: `${origin}/file.jpg`,
      format: "jpg",
      mediaType: "image/jpeg",
    });
    if (transaction.payee === "Rescue Mart" && transaction.date === "") {
      console.log("RESCUED");
    } else {
      console.log(`RESCUE_WRONG_RESULT:${JSON.stringify(transaction)}`);
    }
  } catch (err) {
    console.log(`RESCUE_FAILED:${err instanceof Error ? err.message : err}`);
  } finally {
    server.close();
  }
}

async function main(): Promise<void> {
  for (const mode of MODES) {
    await runMode(mode);
  }
  await runOpenAIRescue();
  // Give any detached promise/emitter 500 ms to blow up before a clean exit.
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log("SURVIVED_ALL");
}

void main();
