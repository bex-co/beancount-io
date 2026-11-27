import type { Identity } from "@/server/api/identity";
import { MCP_PROMPTS, renderPrompt } from "../mcp-prompts";

/**
 * w31/122. A Beancount `balance` assertion checks the balance at the start of
 * its date, so it leaves out that day's transactions. A statement's ending
 * balance is therefore asserted the day after its last day
 * (skills/beancount-reconcile/SKILL.md), and a close counts an account as
 * pinned only by an assertion dated on or after period end + 1
 * (skills/beancount-close/references/close-checklist.md). An agent that reads
 * only the served prompt text must get the same rule, or a reconciliation that
 * ties fails its preview and is reported `partial`.
 */

const identity: Identity = {
  userId: "user-123",
  method: "apikey",
  scopes: new Set(["ledger.read", "ledger.write"]),
  tokenId: "tok_1",
};

/** The prompt text with its line wrapping and indentation collapsed. */
const served = (name: string, args: Record<string, string> = {}): string => {
  const descriptor = MCP_PROMPTS.find((prompt) => prompt.name === name)!;
  return renderPrompt(descriptor, args, identity).replace(/\s+/g, " ");
};

const START_OF_DATE = "a `balance` checks the balance at the start of its date";

describe("reconcile-account dates its assertion the day after the statement's last day", () => {
  it.each([
    ["no arguments", {}],
    [
      "an account and period",
      { account: "Assets:Cash", period: "2026-08", ledger: "alice/personal" },
    ],
  ] as const)("with %s", (_kind, args) => {
    const text = served("reconcile-account", args);
    expect(text).toContain(
      "one `balance` assertion at the statement's ending balance, dated the day after the statement's last day",
    );
    expect(text).toContain(
      `${START_OF_DATE}, so it leaves out that day's transactions`,
    );
    expect(text).toContain(
      "a statement ending 2026-05-31 is asserted on 2026-06-01",
    );
    expect(text).not.toMatch(/period-end `balance` assertion/);
  });
});

describe("close-month counts an assertion as pinning the period only from the day after period end", () => {
  it.each([
    ["no month", {}],
    ["month 2026-08", { month: "2026-08" }],
  ] as const)("with %s", (_kind, args) => {
    const text = served("close-month", args);
    expect(text).toContain(
      "a `balance` assertion dated on or after the day after period end",
    );
    expect(text).toContain(
      "one dated on the period's last day leaves out that day's activity and does not pin the period",
    );
    expect(text).toContain(START_OF_DATE.replace(/^a/, "A"));
    expect(text).not.toMatch(/dated on or after period end/);
  });
});
