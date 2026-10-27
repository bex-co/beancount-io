import { LedgerCollaboratorsWorkflow } from "../ledger-collaborators-workflow";
import { getUserTier } from "@/features/stripe/operations/get-user-tier";
import { SubscriptionTier } from "@/features/stripe/service/stripe";
import { ResourceLimitReachedError } from "@/shared/errors";

// The pure getTierLimits runs for real; only the tier lookup is mocked.
jest.mock("@/features/stripe/operations/get-user-tier");
const mockGetUserTier = getUserTier as jest.Mock;

/** An admin collaborator acting on a ledger someone else owns. */
const identity = {
  userId: "usr_admin",
  method: "session",
  scopes: new Set<string>(),
} as const;
const ledgerId = "owner/main";

describe("collaborator limit (PRFAQ005 question 21 item 6)", () => {
  const listLedgerCollaborators = jest.fn();
  const addOrUpdateLedgerCollaborator = jest.fn();
  const getUserByUsername = jest.fn();
  let tiers: Record<string, SubscriptionTier>;
  let workflow: LedgerCollaboratorsWorkflow;

  /** The owner plus `count` collaborators, as Gitea pages them. */
  const collaborators = (count: number) => {
    const all = [
      { login: "owner" },
      ...Array.from({ length: count }, (_, i) => ({ login: `member-${i}` })),
    ];
    listLedgerCollaborators.mockImplementation(
      (
        _owner: string,
        _name: string,
        { page, limit }: { page: number; limit: number },
      ) =>
        Promise.resolve({
          data: {
            success: true,
            data: all.slice((page - 1) * limit, page * limit),
          },
        }),
    );
  };
  const add = (collaborator: string) =>
    workflow.addOrUpdateCollaborator({
      identity,
      ledgerId,
      collaborator,
      permission: "write",
    });

  beforeEach(() => {
    jest.clearAllMocks();
    // The owner is on Free; the admin adding people pays for Growth.
    tiers = {
      usr_owner: SubscriptionTier.FREE,
      usr_admin: SubscriptionTier.GROWTH,
    };
    mockGetUserTier.mockImplementation(({ userId }: { userId: string }) =>
      Promise.resolve(tiers[userId] ?? SubscriptionTier.FREE),
    );
    getUserByUsername.mockResolvedValue({ id: "usr_owner" });
    addOrUpdateLedgerCollaborator.mockResolvedValue({
      data: { success: true },
    });
    const favaApiClient = {
      collaborators: { listLedgerCollaborators, addOrUpdateLedgerCollaborator },
    };
    workflow = new LedgerCollaboratorsWorkflow(
      {
        getPublicApiClient: jest.fn().mockResolvedValue(favaApiClient),
      } as never,
      {} as never,
      {
        authorizeOrThrow: jest.fn().mockResolvedValue({ allowed: true }),
      } as never,
      { user: { getUserByUsername } } as never,
      {} as never,
    );
  });

  it("holds an admin on a bigger plan to the ledger owner's limit, as a resource-limit error", async () => {
    collaborators(1);

    const refusal = add("newcomer");

    await expect(refusal).rejects.toBeInstanceOf(ResourceLimitReachedError);
    await expect(refusal).rejects.toMatchObject({
      category: "RESOURCE_LIMIT_REACHED",
      metadata: { resource: "Collaborator", limit: 1, current: 1 },
      message: expect.stringContaining(
        "owner is on the Free plan, which allows 1 collaborator per ledger, and it already has 1.",
      ),
    });
    expect(getUserByUsername).toHaveBeenCalledWith(expect.anything(), "owner");
    expect(addOrUpdateLedgerCollaborator).not.toHaveBeenCalled();
  });

  // The admin is on Organization (50), so only the owner's plan can explain
  // the limit.
  describe.each([
    [SubscriptionTier.PREMIUM, 5],
    [SubscriptionTier.GROWTH, 10],
  ])("for a ledger whose owner is on %s", (ownerTier, limit) => {
    beforeEach(() => {
      tiers.usr_owner = ownerTier;
      tiers.usr_admin = SubscriptionTier.ORGANIZATION;
    });

    it(`refuses a new collaborator at the owner's limit of ${limit}`, async () => {
      collaborators(limit);

      const refusal = add("newcomer");

      await expect(refusal).rejects.toBeInstanceOf(ResourceLimitReachedError);
      await expect(refusal).rejects.toMatchObject({
        category: "RESOURCE_LIMIT_REACHED",
        metadata: { resource: "Collaborator", limit, current: limit },
      });
      expect(addOrUpdateLedgerCollaborator).not.toHaveBeenCalled();
    });

    it(`adds a new collaborator one under the owner's limit of ${limit}`, async () => {
      collaborators(limit - 1);

      await expect(add("newcomer")).resolves.toMatchObject({ success: true });
      expect(addOrUpdateLedgerCollaborator).toHaveBeenCalledTimes(1);
    });
  });

  it("lets an existing collaborator's permission change at the limit", async () => {
    collaborators(1);

    await expect(add("member-0")).resolves.toMatchObject({ success: true });
    expect(addOrUpdateLedgerCollaborator).toHaveBeenCalledTimes(1);
  });

  it("refuses the change when the collaborator list cannot be read, rather than skipping the limit", async () => {
    listLedgerCollaborators.mockResolvedValue({ data: { success: false } });

    await expect(add("newcomer")).rejects.toThrow();
    expect(addOrUpdateLedgerCollaborator).not.toHaveBeenCalled();
  });

  it("treats a login that differs only in case as the existing collaborator", async () => {
    collaborators(1);

    await expect(add("MEMBER-0")).resolves.toMatchObject({ success: true });
  });

  it("counts collaborators past Gitea's first page of 50", async () => {
    tiers.usr_owner = SubscriptionTier.ORGANIZATION; // 50 per ledger
    collaborators(50);

    await expect(add("newcomer")).rejects.toMatchObject({
      metadata: { resource: "Collaborator", limit: 50, current: 50 },
    });
    expect(listLedgerCollaborators).toHaveBeenCalledWith("owner", "main", {
      page: 2,
      limit: 50,
    });
  });

  it("never limits an unlimited Enterprise owner, and does not list to find out", async () => {
    tiers.usr_owner = SubscriptionTier.ENTERPRISE;

    await expect(add("newcomer")).resolves.toMatchObject({ success: true });
    expect(listLedgerCollaborators).not.toHaveBeenCalled();
  });

  it("falls back to the acting user's plan when no account owns the ledger", async () => {
    getUserByUsername.mockResolvedValue(null);
    collaborators(1); // under Growth's 10

    await expect(add("newcomer")).resolves.toMatchObject({ success: true });
    expect(mockGetUserTier).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "usr_admin" }),
    );
  });

  it("refuses a set preview at the cap like the commit, so would-grant never overpromises", async () => {
    collaborators(1); // owner on Free: 1 per ledger, already has 1

    const refusal = workflow.addOrUpdateCollaborator({
      identity,
      ledgerId,
      collaborator: "newcomer",
      permission: "write",
      input: { dryRun: true },
    });

    await expect(refusal).rejects.toBeInstanceOf(ResourceLimitReachedError);
    await expect(refusal).rejects.toMatchObject({
      category: "RESOURCE_LIMIT_REACHED",
      metadata: { resource: "Collaborator", limit: 1, current: 1 },
    });
    expect(addOrUpdateLedgerCollaborator).not.toHaveBeenCalled();
  });
});
