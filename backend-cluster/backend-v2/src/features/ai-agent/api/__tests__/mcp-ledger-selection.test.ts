import { resolveMcpLedger } from "../mcp-context";
import { ledgerIdMatchesPin } from "../mcp-ledger-selection";
import { MCP_PROMPTS } from "../mcp-prompts";
import { ForbiddenError } from "@/shared/errors";

/**
 * w23/078. Host usernames are case-insensitive, so a credential pinned to
 * `puncsky/x` holds `PUNCSKY/x` too — but ledger names are lowercase-only, so
 * the name still compares exactly.
 */
describe("ledgerIdMatchesPin", () => {
  it("matches the exact pin spelling", () => {
    expect(ledgerIdMatchesPin("puncsky/x", "puncsky/x")).toBe(true);
  });

  it("matches owner spellings that differ only in case", () => {
    expect(ledgerIdMatchesPin("PUNCSKY/x", "puncsky/x")).toBe(true);
    expect(ledgerIdMatchesPin("Puncsky/x", "puncsky/x")).toBe(true);
  });

  it("refuses a different owner, name, or malformed id", () => {
    expect(ledgerIdMatchesPin("mallory/x", "puncsky/x")).toBe(false);
    expect(ledgerIdMatchesPin("puncsky/y", "puncsky/x")).toBe(false);
    // The name is lowercase-only: an uppercase name is never the pin.
    expect(ledgerIdMatchesPin("puncsky/X", "puncsky/x")).toBe(false);
    expect(ledgerIdMatchesPin("puncsky", "puncsky/x")).toBe(false);
    expect(ledgerIdMatchesPin("puncsky/x", "puncsky")).toBe(false);
  });
});

describe("resolveMcpLedger pin case", () => {
  const pinned = {
    identity: { userId: "u", ledgerScope: "puncsky/x" },
  } as never;

  it.each(["puncsky/x", "PUNCSKY/x", "Puncsky/x"])(
    "resolves %s to the pin's canonical spelling",
    (requested) => {
      expect(resolveMcpLedger(pinned, requested)).toBe("puncsky/x");
    },
  );

  it("still refuses a different owner or name", () => {
    for (const requested of ["mallory/x", "puncsky/y"]) {
      expect(() => resolveMcpLedger(pinned, requested)).toThrow(
        ForbiddenError,
      );
      expect(() => resolveMcpLedger(pinned, requested)).toThrow(
        /outside this credential's ledger restriction/,
      );
    }
  });

  it("leaves an unpinned credential's spelling alone", () => {
    const unpinned = { identity: { userId: "u" } } as never;
    expect(resolveMcpLedger(unpinned, "PUNCSKY/x")).toBe("PUNCSKY/x");
  });
});

describe("prompt ledger line pin case", () => {
  const pinned = {
    userId: "u",
    method: "oauth",
    scopes: new Set(["ledger.read"]),
    ledgerScope: "alice/personal",
  } as never;

  it("does not cry restriction when the pin differs only in owner case", () => {
    for (const descriptor of MCP_PROMPTS) {
      const text = descriptor.build({ ledger: "ALICE/personal" }, pinned);
      expect(text).not.toContain("outside this credential's ledger restriction");
    }
  });

  it("still names the restriction for a genuinely different ledger", () => {
    for (const descriptor of MCP_PROMPTS) {
      expect(
        descriptor.build({ ledger: "mallory/other" }, pinned),
      ).toContain("outside this credential's ledger restriction");
    }
  });
});
