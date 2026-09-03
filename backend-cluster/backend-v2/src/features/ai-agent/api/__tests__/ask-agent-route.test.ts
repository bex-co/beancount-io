import "reflect-metadata";
import Router from "@koa/router";
import { PassThrough } from "node:stream";
import { setAskAgentRoute } from "../ask-agent-route";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import type { IAskAgentWorkflow } from "../../workflow/ask-agent-workflow";

// Mock the harness ESM value-imports so importing the workflow (via the route)
// does not load @ai-sdk/harness-acp, whose `import.meta.url` cannot be
// evaluated under Jest's CommonJS transform. The route injects a fake workflow,
// so the real harness is never needed here.
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({
  createACP: () => ({}),
}));
jest.mock("../../utils/route-guards");

import { resolveAuthUser } from "../../utils/route-guards";

const mockResolveAuthUser = resolveAuthUser as jest.MockedFunction<
  typeof resolveAuthUser
>;
describe("setAskAgentRoute", () => {
  let router: Router;
  let layers: AppLayers;
  let config: AppConfig;
  let workflow: { streamAnswer: jest.Mock };
  let assertQuota: jest.Mock;
  let addTokenUsage: jest.Mock;

  const makeCtx = (body: unknown) => {
    const res = new PassThrough() as unknown as {
      statusCode: number;
      setHeader: jest.Mock;
      end: jest.Mock;
    };
    // PassThrough is a Writable so Readable.pipe(res) works; add the fields the
    // route sets.
    (res as unknown as { setHeader: jest.Mock }).setHeader = jest.fn();
    return {
      request: { body },
      req: { socket: {} },
      res,
      respond: true as boolean,
      set: jest.fn(),
      get: jest.fn().mockReturnValue("en"),
      status: 200,
      body: null as unknown,
    };
  };

  const invoke = async (ctx: unknown) => {
    const route = router.stack[0].stack[0];
    await restErrorMiddleware()(ctx as never, () =>
      route(ctx as never, jest.fn()),
    );
  };

  beforeEach(() => {
    router = new Router();
    assertQuota = jest.fn().mockResolvedValue(undefined);
    addTokenUsage = jest.fn().mockResolvedValue(undefined);
    layers = {
      database: { db: {}, models: {} },
      clients: { favaClientFactory: {} },
      services: {
        aiCfoUsage: {
          assertQuotaAvailable: assertQuota,
          addTokenUsage,
        },
      },
      workflows: {},
    } as unknown as AppLayers;
    config = {
      gitea: {
        hostname: "192.168.4.49",
        internalHostname: "gitea",
        httpPort: 3000,
        externalHttpPort: 3701,
        sshPort: 2223,
      },
      claudeCodeSandbox: { apiUrl: "http://worker:8788" },
      adminToken: "tok",
    } as unknown as AppConfig;

    workflow = {
      streamAnswer: jest.fn().mockResolvedValue(
        new Response("data: {}\n\n", {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      ),
    };

    mockResolveAuthUser.mockResolvedValue({
      user: {
        id: "usr_1",
        email: "a@b.co",
        ledger_username: "un_a",
        ledger_password: "pw_a",
      },
      identity: {
        userId: "usr_1",
        method: "oauth",
        scopes: new Set(["ledger.read", "ledger.write"]),
      },
    } as never);
  });

  afterEach(() => jest.clearAllMocks());

  const register = () =>
    setAskAgentRoute(
      router,
      layers,
      config,
      () => workflow as IAskAgentWorkflow,
    );

  it("registers POST /api-gateway/ask-agent", () => {
    register();
    expect(router.stack[0].path).toBe("/api-gateway/ask-agent");
    expect(router.stack[0].methods).toContain("POST");
  });

  it("400 when messages is empty", async () => {
    register();
    const ctx = makeCtx({ messages: [], ledgerId: "a/d", conversationId: "c" });
    await invoke(ctx);
    expect(ctx.status).toBe(400);
    expect(workflow.streamAnswer).not.toHaveBeenCalled();
  });

  it("400 when ledgerId is missing", async () => {
    register();
    const ctx = makeCtx({
      messages: [{ role: "user", content: "hi" }],
      conversationId: "c",
    });
    await invoke(ctx);
    expect(ctx.status).toBe(400);
  });

  it("400 when conversationId is missing", async () => {
    register();
    const ctx = makeCtx({
      messages: [{ role: "user", content: "hi" }],
      ledgerId: "a/d",
    });
    await invoke(ctx);
    expect(ctx.status).toBe(400);
  });

  it("delegates identity and guard callbacks to the protected workflow", async () => {
    register();
    const ctx = makeCtx({
      messages: [
        { role: "user", content: "first" },
        { role: "user", content: "what is my balance?" },
      ],
      ledgerId: "alice/default",
      conversationId: "conv_9",
      mode: "ask",
    });
    await invoke(ctx);

    expect(mockResolveAuthUser).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
    );
    expect(workflow.streamAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "what is my balance?", // last message
        ledgerId: "alice/default",
        ledgerOwner: "alice",
        ledgerName: "default",
        ledgerUsername: "un_a",
        ledgerPassword: "pw_a",
        conversationId: "conv_9",
        mode: "ask",
        identity: expect.objectContaining({ userId: "usr_1" }),
        assertQuotaAvailable: expect.any(Function),
        recordTokenUsage: expect.any(Function),
      }),
    );
    const command = workflow.streamAnswer.mock.calls[0][0];
    expect(assertQuota).not.toHaveBeenCalled();
    await command.assertQuotaAvailable();
    expect(assertQuota).toHaveBeenCalledWith("usr_1");
    await command.recordTokenUsage(321);
    expect(addTokenUsage).toHaveBeenCalledWith("usr_1", 321);
    expect(ctx.respond).toBe(false);
  });

  it("extracts the prompt from UIMessage parts (what useChat sends)", async () => {
    register();
    const ctx = makeCtx({
      messages: [
        {
          role: "user",
          parts: [
            { type: "step-start" },
            { type: "text", text: "hello from " },
            { type: "text", text: "parts" },
          ],
        },
      ],
      ledgerId: "a/d",
      conversationId: "c",
      mode: "ask",
    });
    await invoke(ctx);
    expect(workflow.streamAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "hello from parts" }),
    );
  });

  it("400 when the last message has no text content", async () => {
    register();
    const ctx = makeCtx({
      messages: [{ role: "user", parts: [{ type: "step-start" }] }],
      ledgerId: "a/d",
      conversationId: "c",
    });
    await invoke(ctx);
    expect(ctx.status).toBe(400);
    expect(workflow.streamAnswer).not.toHaveBeenCalled();
  });

  it("maps mode:agent through to the workflow, defaulting unknown to ask", async () => {
    register();
    const agentCtx = makeCtx({
      messages: [{ role: "user", content: "add a txn" }],
      ledgerId: "a/d",
      conversationId: "c",
      mode: "agent",
    });
    await invoke(agentCtx);
    expect(mockResolveAuthUser).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.any(Object),
    );
    expect(workflow.streamAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "agent" }),
    );

    workflow.streamAnswer.mockClear();
    const weirdCtx = makeCtx({
      messages: [{ role: "user", content: "x" }],
      ledgerId: "a/d",
      conversationId: "c",
      mode: "nonsense",
    });
    await invoke(weirdCtx);
    expect(mockResolveAuthUser).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.any(Object),
    );
    expect(workflow.streamAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "ask" }),
    );
  });
});
