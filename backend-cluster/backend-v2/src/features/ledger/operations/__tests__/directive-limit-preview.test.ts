import {
  createDirectiveLimitPreview,
  directiveLimitMessage,
} from "../directive-limit-preview";
import { ResourceLimitReachedError } from "@/shared/errors";

jest.mock("@/features/stripe/operations/get-user-tier", () => ({
  getUserTierLimits: jest.fn(),
}));
import { getUserTierLimits } from "@/features/stripe/operations/get-user-tier";
const tier = getUserTierLimits as jest.Mock;

/**
 * w5/904: a preview asks the question the commit asks. The fixtures vary one
 * thing at a time — the owner's limit and the ledger's current count — and the
 * ledger client is the same shape the gate's own tests use.
 */
function preview(over: { count?: number | null; countThrows?: Error }) {
  const request = jest.fn(async () => {
    if (over.countThrows) throw over.countThrows;
    return { data: { success: true, data: { count: over.count, sha: "s" } } };
  });
  const gate = createDirectiveLimitPreview({
    models: {
      user: { getUserByUsername: jest.fn(async () => ({ id: "u_1" })) },
      paidCustomer: {},
    } as never,
    db: {} as never,
    stripe: {} as never,
    cacheHelper: { get: jest.fn(async () => false) } as never,
  });
  return {
    assertRoom: (adding: number) =>
      gate.assertRoom({
        client: { request } as never,
        owner: "alice",
        repo: "main",
        adding,
      }),
    request,
  };
}

describe("DirectiveLimitPreview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tier.mockResolvedValue({ maxDirectives: 1000 });
  });

  it("refuses with the commit's own sentence when the write crosses the limit", async () => {
    const { assertRoom } = preview({ count: 999 });

    const refusal = await assertRoom(2).catch((error) => error);

    expect(refusal).toBeInstanceOf(ResourceLimitReachedError);
    expect(refusal.message).toBe(directiveLimitMessage(1000, 1001));
    expect(refusal.message).toContain("approximately 1001");
    expect(refusal.metadata.limitOwner).toBe("LEDGER_OWNER");
  });

  it("refuses a write that grows a ledger already over the limit", async () => {
    await expect(preview({ count: 2000 }).assertRoom(1)).rejects.toThrow(
      "approximately 2001",
    );
  });

  it("allows a write that stays within the limit, up to and including it", async () => {
    await expect(
      preview({ count: 998 }).assertRoom(2),
    ).resolves.toBeUndefined();
  });

  it("never refuses a write that adds nothing, and does not even count", async () => {
    const { assertRoom, request } = preview({ count: 5000 });

    await expect(assertRoom(0)).resolves.toBeUndefined();
    expect(request).not.toHaveBeenCalled();
  });

  it("allows an unlimited owner", async () => {
    tier.mockResolvedValue({ maxDirectives: -1 });

    await expect(
      preview({ count: 99999 }).assertRoom(5),
    ).resolves.toBeUndefined();
  });

  it("fails open when the count cannot be read, as the gate does", async () => {
    await expect(
      preview({ countThrows: new Error("ledger down") }).assertRoom(5),
    ).resolves.toBeUndefined();
  });
});
