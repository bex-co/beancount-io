import type Router from "@koa/router";

// Mock logger
jest.mock("@/shared/logger", () => ({
  logger: {
    child: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

// Mock validatePlaidWebhook
const mockValidatePlaidWebhook = jest.fn();
jest.mock("@/features/plaid/utils/plaid-webhook-verification", () => ({
  validatePlaidWebhook: mockValidatePlaidWebhook,
}));

// Mock safeParseWebhookEvent
const mockSafeParseWebhookEvent = jest.fn();
jest.mock("@/features/plaid/utils/plaid-webhook-parser", () => ({
  safeParseWebhookEvent: mockSafeParseWebhookEvent,
}));

// The transport adapter delegates persistence to the webhook service; it must
// never touch the persistence model directly.
const mockRecordEvent = jest.fn();
jest.mock("@/features/plaid/service/plaid-webhook-service", () => ({
  PlaidWebhookService: jest.fn().mockImplementation(() => ({
    recordEvent: mockRecordEvent,
  })),
}));

import { setPlaidWebhookHandler } from "../plaid-webhook-handler";
import { UnauthenticatedError } from "@/shared/errors";

const mockPostgresDb = {} as any;
const mockPlaidClient = {} as any;

const mockLayers = {
  database: { db: mockPostgresDb, models: {} as any },
  clients: { plaidClient: mockPlaidClient, favaClientFactory: {} as any },
  services: { plaidSync: {} as any, authorization: {} as any },
} as any;

function createMockRouter() {
  const handlers: Record<string, ((ctx: any) => Promise<void>)[]> = {};

  const router = {
    post: jest.fn((path: string, handler: (ctx: any) => Promise<void>) => {
      handlers[`POST:${path}`] = handlers[`POST:${path}`] || [];
      handlers[`POST:${path}`].push(handler);
    }),
    get: jest.fn((path: string, handler: (ctx: any) => Promise<void>) => {
      handlers[`GET:${path}`] = handlers[`GET:${path}`] || [];
      handlers[`GET:${path}`].push(handler);
    }),
    _handlers: handlers,
  };
  return router as unknown as Router & { _handlers: typeof handlers };
}

function createMockCtx(body: unknown = {}, verificationHeader?: string) {
  return {
    request: {
      body,
    },
    headers: verificationHeader
      ? { "plaid-verification": verificationHeader }
      : {},
    status: 0,
    body: undefined as any,
  };
}

describe("plaid-webhook-handler", () => {
  let router: ReturnType<typeof createMockRouter>;

  beforeEach(() => {
    jest.clearAllMocks();
    router = createMockRouter();
  });

  async function invokeWebhookHandler(ctx: any) {
    setPlaidWebhookHandler(router as unknown as Router, mockLayers);
    const handler = router._handlers["POST:/api/plaid/webhook"][0];
    await handler(ctx);
  }

  it("should store event and return 200 on successful webhook", async () => {
    mockValidatePlaidWebhook.mockResolvedValue(undefined);
    mockSafeParseWebhookEvent.mockReturnValue({
      webhookType: "TRANSACTIONS",
      webhookCode: "SYNC_UPDATES_AVAILABLE",
      itemId: "plaid-item-ext-id",
    });
    mockRecordEvent.mockResolvedValue({
      id: "whevt_1",
      webhookType: "TRANSACTIONS",
    });

    const ctx = createMockCtx(
      {
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "plaid-item-ext-id",
      },
      "jwt-token",
    );

    await invokeWebhookHandler(ctx);

    expect(mockValidatePlaidWebhook).toHaveBeenCalled();
    expect(mockRecordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        webhookType: "TRANSACTIONS",
        webhookCode: "SYNC_UPDATES_AVAILABLE",
        itemId: "plaid-item-ext-id",
      }),
    );
    expect(ctx.status).toBe(200);
    expect(ctx.body).toEqual({ received: true });
  });

  // An unsigned post used to be stored as a pending "unknown" event and
  // answered 200, so anyone could queue rows ahead of real Plaid events
  // (w0/052). It is now refused and nothing is stored.
  it.each([
    [
      "a missing",
      new UnauthenticatedError("Missing webhook verification header"),
    ],
    ["an invalid", new UnauthenticatedError("Invalid webhook signature")],
    ["a malformed", new UnauthenticatedError("Invalid verification payload")],
  ])(
    "refuses %s signature with 401 and stores nothing",
    async (_kind, error) => {
      mockValidatePlaidWebhook.mockRejectedValue(error);

      const ctx = createMockCtx({ webhook_type: "TRANSACTIONS" }, "bad-jwt");

      await invokeWebhookHandler(ctx);

      expect(mockRecordEvent).not.toHaveBeenCalled();
      expect(ctx.status).toBe(401);
      expect(ctx.body).toEqual({ received: false });
    },
  );

  it("still returns 200 when the service reports the store as lost", async () => {
    mockValidatePlaidWebhook.mockResolvedValue(undefined);
    mockSafeParseWebhookEvent.mockReturnValue({
      webhookType: "ITEM",
      webhookCode: "ERROR",
      itemId: "plaid-item-ext-id",
    });
    mockRecordEvent.mockResolvedValue(null);

    const ctx = createMockCtx({ webhook_type: "ITEM" }, "jwt-token");

    await invokeWebhookHandler(ctx);

    expect(mockRecordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ webhookType: "ITEM", webhookCode: "ERROR" }),
    );
    expect(ctx.status).toBe(200);
    expect(ctx.body).toEqual({ received: true });
  });

  it("should store failed event and return 200 on parse error", async () => {
    mockValidatePlaidWebhook.mockResolvedValue(undefined);
    mockSafeParseWebhookEvent.mockImplementation(() => {
      throw new Error("Parse failed");
    });
    mockRecordEvent.mockResolvedValue({ id: "whevt_failed" });

    const ctx = createMockCtx({});

    await invokeWebhookHandler(ctx);

    expect(mockRecordEvent).toHaveBeenCalled();
    expect(ctx.status).toBe(200);
  });
});
