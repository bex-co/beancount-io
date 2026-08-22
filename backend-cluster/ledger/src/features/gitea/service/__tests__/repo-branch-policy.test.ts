import type { Api as GiteaApi } from "@/features/gitea/client/gitea-api";
import { applyMainOnlyPolicy } from "../repo-branch-policy";

interface Calls {
  repoListBranchProtection: jest.Mock;
  repoCreateBranchProtection: jest.Mock;
  repoEditBranchProtection: jest.Mock;
  repoListTagProtection: jest.Mock;
  repoCreateTagProtection: jest.Mock;
  repoEditTagProtection: jest.Mock;
}

function makeClient(opts: {
  branchRules?: unknown[];
  tagRules?: unknown[];
  createdTagId?: number;
}): { client: GiteaApi<unknown>; calls: Calls } {
  const calls: Calls = {
    repoListBranchProtection: jest
      .fn()
      .mockResolvedValue({ data: opts.branchRules ?? [] }),
    repoCreateBranchProtection: jest.fn().mockResolvedValue({ data: {} }),
    repoEditBranchProtection: jest.fn().mockResolvedValue({ data: {} }),
    repoListTagProtection: jest
      .fn()
      .mockResolvedValue({ data: opts.tagRules ?? [] }),
    repoCreateTagProtection: jest
      .fn()
      .mockResolvedValue({ data: { id: opts.createdTagId ?? 7 } }),
    repoEditTagProtection: jest.fn().mockResolvedValue({ data: {} }),
  };
  return { client: { repos: calls } as unknown as GiteaApi<unknown>, calls };
}

describe("applyMainOnlyPolicy", () => {
  it("creates the two branch rules and the tag rule on a fresh repository", async () => {
    const { client, calls } = makeClient({});

    await applyMainOnlyPolicy(client, "alice", "ledger");

    expect(calls.repoCreateBranchProtection).toHaveBeenCalledTimes(2);
    expect(calls.repoCreateBranchProtection).toHaveBeenCalledWith(
      "alice",
      "ledger",
      { rule_name: "main", enable_push: true, priority: 1 },
    );
    expect(calls.repoCreateBranchProtection).toHaveBeenCalledWith(
      "alice",
      "ledger",
      { rule_name: "*", enable_push: false, priority: 2 },
    );
    expect(calls.repoEditBranchProtection).not.toHaveBeenCalled();
  });

  it("keeps `main` at a higher priority than the catch-all so main stays pushable", async () => {
    const { client, calls } = makeClient({});

    await applyMainOnlyPolicy(client, "alice", "ledger");

    const [mainRule] = calls.repoCreateBranchProtection.mock.calls
      .map((c) => c[2])
      .filter((r) => r.rule_name === "main");
    const [catchAll] = calls.repoCreateBranchProtection.mock.calls
      .map((c) => c[2])
      .filter((r) => r.rule_name === "*");

    expect(mainRule.enable_push).toBe(true);
    expect(catchAll.enable_push).toBe(false);
    expect(mainRule.priority).toBeLessThan(catchAll.priority);
  });

  it("empties the tag whitelist after creating the rule", async () => {
    // Gitea rejects creating a tag rule with an empty whitelist, so the rule is
    // created naming the owner and then patched empty.
    const { client, calls } = makeClient({ createdTagId: 42 });

    await applyMainOnlyPolicy(client, "alice", "ledger");

    expect(calls.repoCreateTagProtection).toHaveBeenCalledWith(
      "alice",
      "ledger",
      { name_pattern: "*", whitelist_usernames: ["alice"] },
    );
    expect(calls.repoEditTagProtection).toHaveBeenCalledWith(
      "alice",
      "ledger",
      42,
      { whitelist_usernames: [] },
    );
  });

  it("is a no-op when the policy is already in place", async () => {
    const { client, calls } = makeClient({
      branchRules: [
        { rule_name: "main", enable_push: true, priority: 1 },
        { rule_name: "*", enable_push: false, priority: 2 },
      ],
      tagRules: [{ id: 5, name_pattern: "*", whitelist_usernames: [] }],
    });

    await applyMainOnlyPolicy(client, "alice", "ledger");

    expect(calls.repoCreateBranchProtection).not.toHaveBeenCalled();
    expect(calls.repoEditBranchProtection).not.toHaveBeenCalled();
    expect(calls.repoCreateTagProtection).not.toHaveBeenCalled();
    expect(calls.repoEditTagProtection).not.toHaveBeenCalled();
  });

  it("repairs a drifted rule instead of creating a duplicate", async () => {
    const { client, calls } = makeClient({
      branchRules: [
        // Someone re-enabled push on the catch-all.
        { rule_name: "main", enable_push: true, priority: 1 },
        { rule_name: "*", enable_push: true, priority: 2 },
      ],
      tagRules: [{ id: 5, name_pattern: "*", whitelist_usernames: [] }],
    });

    await applyMainOnlyPolicy(client, "alice", "ledger");

    expect(calls.repoCreateBranchProtection).not.toHaveBeenCalled();
    expect(calls.repoEditBranchProtection).toHaveBeenCalledTimes(1);
    expect(calls.repoEditBranchProtection).toHaveBeenCalledWith(
      "alice",
      "ledger",
      "*",
      { enable_push: false, priority: 2 },
    );
  });

  it("empties a tag whitelist that is not empty", async () => {
    const { client, calls } = makeClient({
      branchRules: [
        { rule_name: "main", enable_push: true, priority: 1 },
        { rule_name: "*", enable_push: false, priority: 2 },
      ],
      tagRules: [{ id: 9, name_pattern: "*", whitelist_usernames: ["alice"] }],
    });

    await applyMainOnlyPolicy(client, "alice", "ledger");

    expect(calls.repoCreateTagProtection).not.toHaveBeenCalled();
    expect(calls.repoEditTagProtection).toHaveBeenCalledWith(
      "alice",
      "ledger",
      9,
      { whitelist_usernames: [] },
    );
  });

  it("propagates a Gitea failure so ledger creation can roll back", async () => {
    const { client, calls } = makeClient({});
    calls.repoCreateBranchProtection.mockRejectedValueOnce(
      new Error("gitea down"),
    );

    await expect(
      applyMainOnlyPolicy(client, "alice", "ledger"),
    ).rejects.toThrow("gitea down");
    expect(calls.repoCreateTagProtection).not.toHaveBeenCalled();
  });

  it("does not crash when Gitea returns a tag rule without an id", async () => {
    // The whitelist can only be emptied by id. If Gitea ever stops returning
    // one, the rule is left with the owner whitelisted rather than throwing
    // mid-way through ledger creation — the backfill script's second pass is
    // what repairs that case.
    const { client, calls } = makeClient({});
    calls.repoCreateTagProtection.mockResolvedValueOnce({ data: {} });

    await expect(
      applyMainOnlyPolicy(client, "alice", "ledger"),
    ).resolves.toBeUndefined();
    expect(calls.repoEditTagProtection).not.toHaveBeenCalled();
  });

  it("still applies the branch rules when the tag rule already exists", async () => {
    // Ordering guarantee: branch rules go first, so a later tag failure cannot
    // leave a repository pushable on every branch.
    const { client, calls } = makeClient({
      tagRules: [{ id: 3, name_pattern: "*", whitelist_usernames: [] }],
    });

    await applyMainOnlyPolicy(client, "alice", "ledger");

    expect(calls.repoCreateBranchProtection).toHaveBeenCalledTimes(2);
    expect(calls.repoCreateTagProtection).not.toHaveBeenCalled();
  });
});
