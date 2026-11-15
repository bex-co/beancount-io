import { BadUserInputError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import { MCP_PROMPTS, renderPrompt } from "../mcp-prompts";

/**
 * w31/011. Every prompt argument is optional, and a client with a form submits
 * an unfilled optional field as `""`. That value used to mean three things:
 * `close-month {month: ""}` and `ledger: ""` were refused as malformed,
 * `spending-report {period: ""}` rendered "spending for ." and
 * `reconcile-account {account: ""}` rendered "Reconcile  against", and the
 * rest fell back as if omitted. It now means omitted, for every argument.
 */

const unpinned: Identity = {
  userId: "user-123",
  method: "apikey",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_1",
};

const pinned: Identity = { ...unpinned, ledgerScope: "alice/personal" };

/** A well-formed value for every argument any prompt declares. */
const SAMPLE: Record<string, string> = {
  month: "2026-08",
  ledger: "alice/personal",
  account: "Assets:Bank:Checking",
  period: "2026-06",
  statement: "2026-06-03,COFFEE,-4.50",
  item_id: "pitm_123",
  question: "how much did I spend on groceries",
};

const argNames = (name: string): string[] =>
  Object.keys(MCP_PROMPTS.find((prompt) => prompt.name === name)!.argsSchema);

describe.each(MCP_PROMPTS.map((prompt) => [prompt.name, prompt] as const))(
  "prompt %s with an empty argument",
  (_name, descriptor) => {
    const args = Object.keys(descriptor.argsSchema);

    it("declares only arguments this test has a sample for", () => {
      expect(args.filter((arg) => !(arg in SAMPLE))).toEqual([]);
    });

    it.each([
      ["pinned", pinned],
      ["unpinned", unpinned],
    ] as const)(
      "renders each argument sent as an empty string as if it were omitted, for a %s credential",
      (_kind, identity) => {
        const omitted = renderPrompt(descriptor, {}, identity);
        for (const arg of args) {
          expect(renderPrompt(descriptor, { [arg]: "" }, identity)).toBe(
            omitted,
          );

          // The same with every other argument given, so a builder that reads
          // two arguments in one sentence cannot blank one of them.
          const others = Object.fromEntries(
            args.filter((other) => other !== arg).map((o) => [o, SAMPLE[o]]),
          );
          expect(
            renderPrompt(descriptor, { ...others, [arg]: "" }, identity),
          ).toBe(renderPrompt(descriptor, others, identity));
        }

        const allEmpty = Object.fromEntries(args.map((arg) => [arg, ""]));
        expect(renderPrompt(descriptor, allEmpty, identity)).toBe(omitted);
      },
    );
  },
);

describe("empty prompt arguments keep the fallback text", () => {
  it.each([
    [
      "close-month",
      "month",
      "Close the books for the last complete calendar month.",
    ],
    ["spending-report", "period", "spending for a period I will name."],
    [
      "reconcile-account",
      "account",
      "Reconcile one account (ask me which) against",
    ],
    ["reconcile-account", "period", "against one statement period."],
  ])('%s with %s: "" says %j', (name, arg, fallback) => {
    const descriptor = MCP_PROMPTS.find((prompt) => prompt.name === name)!;
    expect(argNames(name)).toContain(arg);
    expect(renderPrompt(descriptor, { [arg]: "" }, unpinned)).toContain(
      fallback,
    );
  });

  it("does not echo an empty ledger as the one selected", () => {
    for (const descriptor of MCP_PROMPTS) {
      const text = renderPrompt(descriptor, { ledger: "" }, unpinned);
      expect(text).toContain("Ledger: not selected.");
      expect(renderPrompt(descriptor, { ledger: "" }, pinned)).toContain(
        "Ledger: alice/personal.",
      );
    }
  });
});

describe("a non-empty malformed fixed-shape argument", () => {
  const closeMonth = MCP_PROMPTS.find(
    (prompt) => prompt.name === "close-month",
  )!;

  it.each([
    ["month", "2026-13"],
    ["month", " "],
    ["month", "banana"],
    ["ledger", " "],
    ["ledger", "alice"],
    ["ledger", " alice/personal"],
  ])("refuses %s %j as before", (arg, value) => {
    expect(() => renderPrompt(closeMonth, { [arg]: value }, unpinned)).toThrow(
      BadUserInputError,
    );
  });
});
