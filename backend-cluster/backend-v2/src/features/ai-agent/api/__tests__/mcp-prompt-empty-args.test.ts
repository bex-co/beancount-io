import { BadUserInputError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import { MCP_PROMPTS, renderPrompt } from "../mcp-prompts";

/**
 * w31/011 & w31/074. Every prompt argument is optional, and a client with a
 * form submits an unfilled optional field as `""` (or whitespace). `""` now
 * means omitted for every argument; whitespace-only strings on free-text
 * arguments (`account`, `period`, `statement`, `item_id`, `question`) also
 * count as omitted instead of folding blank text into the playbook, while
 * whitespace-only fixed-shape arguments (`month`, `ledger`) stay refused.
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

describe("whitespace-only free-text prompt arguments count as omitted (w31/074)", () => {
  const FIXED_SHAPE = new Set(["month", "ledger"]);
  const BLANKS = ["   ", "\t\n"] as const;

  describe.each(
    MCP_PROMPTS.filter((prompt) =>
      Object.keys(prompt.argsSchema).some((arg) => !FIXED_SHAPE.has(arg)),
    ).map((prompt) => [prompt.name, prompt] as const),
  )("prompt %s", (_name, descriptor) => {
    const allArgs = Object.keys(descriptor.argsSchema);
    const freeTextArgs = allArgs.filter((arg) => !FIXED_SHAPE.has(arg));

    it.each([
      ["pinned", pinned],
      ["unpinned", unpinned],
    ] as const)(
      "renders whitespace-only free-text arguments identically to omitting them, for a %s credential",
      (_kind, identity) => {
        const omitted = renderPrompt(descriptor, {}, identity);
        for (const blank of BLANKS) {
          for (const arg of freeTextArgs) {
            expect(renderPrompt(descriptor, { [arg]: blank }, identity)).toBe(
              omitted,
            );

            const others = Object.fromEntries(
              allArgs
                .filter((other) => other !== arg)
                .map((o) => [o, SAMPLE[o]]),
            );
            expect(
              renderPrompt(descriptor, { ...others, [arg]: blank }, identity),
            ).toBe(renderPrompt(descriptor, others, identity));
          }

          const allBlank = Object.fromEntries(
            freeTextArgs.map((arg) => [arg, blank]),
          );
          expect(renderPrompt(descriptor, allBlank, identity)).toBe(omitted);
        }
      },
    );
  });

  it("drops broken prose and phantom blocks when free-text arguments are whitespace", () => {
    const reconcile = renderPrompt(
      MCP_PROMPTS.find((prompt) => prompt.name === "reconcile-account")!,
      { account: "   ", period: "   ", statement: "   " },
      unpinned,
    );
    expect(reconcile).toContain(
      "Reconcile one account (ask me which) against one statement period.",
    );
    expect(reconcile).not.toContain("Statement provided by the user:");

    const categorize = renderPrompt(
      MCP_PROMPTS.find((prompt) => prompt.name === "categorize-imports")!,
      { item_id: "   " },
      unpinned,
    );
    expect(categorize).not.toContain("Linked bank:");

    const spending = renderPrompt(
      MCP_PROMPTS.find((prompt) => prompt.name === "spending-report")!,
      { period: "   ", question: "   " },
      unpinned,
    );
    expect(spending).toContain("spending for a period I will name.");
    expect(spending).not.toContain("starting with:");
  });
});

describe("a non-empty malformed fixed-shape argument", () => {
  const closeMonth = MCP_PROMPTS.find(
    (prompt) => prompt.name === "close-month",
  )!;

  it.each([
    ["month", "2026-13"],
    ["month", " "],
    ["month", "\t\n"],
    ["month", "banana"],
    ["ledger", " "],
    ["ledger", "\t\n"],
    ["ledger", "alice"],
    ["ledger", " alice/personal"],
  ])("refuses %s %j as before", (arg, value) => {
    expect(() => renderPrompt(closeMonth, { [arg]: value }, unpinned)).toThrow(
      BadUserInputError,
    );
  });
});
