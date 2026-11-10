import { ledgerResource } from "@/server/api/authorization/authorization-contract";
import { DomainError, ErrorCategory } from "@/shared/errors";
import { canonicalLedgerId, createLedgerId, parseLedgerId } from "@/shared/str";
import { identityAllowsLedgerScope } from "@/server/api/identity";
import { resolveMcpLedger } from "../mcp-context";
import { validatePromptArgs } from "../mcp-prompts";

/**
 * w23/m38 — one spelling of a ledger, one outcome on every surface.
 *
 * The same `owner/name` text reaches the backend five ways, and each used to
 * decide for itself what a bad one meant (w1/235: every MCP tool answered
 * "Select a ledger" for whitespace, extra slashes and URL characters, while the
 * resource, REST and GraphQL named the slug rule that failed). They now share
 * one parser:
 * - MCP tools: `resolveMcpLedger`;
 * - MCP prompt arguments: `validatePromptArgs`, through the same check;
 * - MCP resources: `createLedgerId` on the URI's `{owner}` and `{name}`;
 * - REST and GraphQL: `authorizeLedger` → `ledgerResource` → `parseLedgerId`.
 *
 * Each spelling below is either one ledger on all five, or refused on all five
 * with the same slug rule. A retry's idempotency record is keyed on
 * `canonicalLedgerId`; the retries themselves are driven end to end across
 * REST, GraphQL and MCP in `structured-entry-parity.test.ts` ("owner in
 * another case").
 */
const unpinned = { identity: { userId: "usr_1" } } as never;

/** The refusal `run` throws; a call that does not refuse fails the test. */
function refusal(run: () => unknown): DomainError {
  try {
    run();
  } catch (error) {
    if (error instanceof DomainError) return error;
    throw error;
  }
  throw new Error("expected the ledger to be refused");
}

const ACCEPTED = [
  "puncsky/example",
  "Puncsky/example",
  "PUNCSKY/example",
  "p.u-n_c/ex-ample_1",
  "a/b",
];

/** The spellings from w1/235 and the neighbours that share its cause. */
const REFUSED = [
  // whitespace
  " puncsky/example",
  "puncsky/example ",
  "puncsky /example",
  "puncsky/ example",
  "puncsky/exa mple",
  "puncsky/example\n",
  "\tpuncsky/example",
  // extra or missing slashes
  "puncsky/example/",
  "puncsky//example",
  "puncsky //example",
  "puncsky/example/extra",
  "/example",
  "puncsky/",
  "/",
  "//",
  "example",
  "puncsky",
  // encoded or query characters
  "puncsky%2Fexample",
  "puncsky%20/example",
  "puncsky/example%20",
  "puncsky/example?x=1",
  "puncsky/example#frag",
  // names are lowercase-only, owners cannot be dot segments, and neither is Unicode
  "puncsky/Example",
  "../example",
  "./example",
  "pünc/example",
  "puncsky/exämple",
  `puncsky/${"x".repeat(101)}`,
];

/** What a resource URI can carry: `{owner}` and `{name}` as separate segments. */
const URI_SEGMENTS: [owner: string, name: string][] = [
  [" puncsky", "example"],
  ["puncsky", "example "],
  ["puncsky ", "example"],
  ["puncsky", " example"],
  ["puncsky", "Example"],
  ["..", "example"],
  ["pünc", "example"],
  ["puncsky", "exämple"],
  ["puncsky", "x".repeat(101)],
];

describe("ledger spellings the backend accepts", () => {
  it.each(ACCEPTED)("%s is one ledger on every surface", (spelling) => {
    const [owner, name] = spelling.split("/");
    expect(resolveMcpLedger(unpinned, spelling)).toBe(spelling);
    expect(createLedgerId(owner, name)).toBe(spelling);
    expect(ledgerResource(spelling)).toBe(`ledger:${spelling}`);
  });

  it("keys the owner's case variants on one canonical id, and nothing else", () => {
    for (const spelling of ["Puncsky/example", "PUNCSKY/example"]) {
      expect(canonicalLedgerId(spelling)).toBe("puncsky/example");
    }
    // A different name or owner is a different ledger.
    expect(canonicalLedgerId("puncsky/other")).not.toBe("puncsky/example");
    expect(canonicalLedgerId("other/example")).not.toBe("puncsky/example");
  });
});

/**
 * w23/232 — a credential pinned to `puncsky/example` holds the owner's other
 * cases on every surface, and nothing else. REST and GraphQL decide it through
 * `identityAllowsLedgerScope` (`authorization-service.test.ts` drives the same
 * rule through the policy decision point); MCP through `resolveMcpLedger`,
 * which also answers with the pin's own spelling.
 */
describe("a pinned credential and the owner's case", () => {
  const pin = "puncsky/example";
  const pinned = { identity: { userId: "usr_1", ledgerScope: pin } } as never;

  it.each(["puncsky/example", "Puncsky/example", "PUNCSKY/example"])(
    "%s is the pinned ledger on every surface",
    (spelling) => {
      expect(
        identityAllowsLedgerScope({ ledgerScope: pin } as never, spelling),
      ).toBe(true);
      expect(resolveMcpLedger(pinned, spelling)).toBe(pin);
    },
  );

  it.each(["puncsky/other", "mallory/example", "puncsky/Example", "puncsky"])(
    "%s is not the pinned ledger on any surface",
    (spelling) => {
      expect(
        identityAllowsLedgerScope({ ledgerScope: pin } as never, spelling),
      ).toBe(false);
      refusal(() => resolveMcpLedger(pinned, spelling));
    },
  );
});

describe("ledger spellings the backend refuses", () => {
  it.each(REFUSED)(
    "%j names the same slug rule on every surface",
    (spelling) => {
      const shared = refusal(() => parseLedgerId(spelling));
      expect(shared.category).toBe(ErrorCategory.BAD_USER_INPUT);

      const tool = refusal(() => resolveMcpLedger(unpinned, spelling));
      expect(tool).toMatchObject({
        category: ErrorCategory.BAD_USER_INPUT,
        message: shared.message,
        // The refusal still says what to call next.
        metadata: {
          field: "ledger",
          hint: expect.stringMatching(/owner\/name/),
        },
      });
      // A malformed ledger is not a missing one.
      expect(tool.message).not.toMatch(/select a ledger/i);

      expect(refusal(() => ledgerResource(spelling)).message).toBe(
        shared.message,
      );
      expect(
        refusal(() => validatePromptArgs({ ledger: spelling })).message,
      ).toBe(shared.message);
    },
  );

  it.each(URI_SEGMENTS)(
    "a resource URI with owner %j and name %j names the same slug rule",
    (owner, name) => {
      expect(refusal(() => createLedgerId(owner, name)).message).toBe(
        refusal(() => parseLedgerId(`${owner}/${name}`)).message,
      );
    },
  );

  it("says a ledger was not named only when none was", () => {
    // Allowed difference: only the MCP tools can be called without a ledger
    // (REST and GraphQL carry it in the path or a required argument), and an
    // empty string counts as none.
    for (const none of [undefined, ""]) {
      const tool = refusal(() => resolveMcpLedger(unpinned, none));
      expect(tool.category).toBe(ErrorCategory.BAD_USER_INPUT);
      expect(tool.message).toMatch(/select a ledger/i);
    }
  });
});
