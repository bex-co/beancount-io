import { ForbiddenError } from "@/shared/errors";
import type { Identity } from "../identity";
import {
  VERB_TABLE,
  classifiedOpIds,
  classifyOp,
  evaluateScope,
  requireScopeClass,
} from "../op-class";
import { MOBILE_CLIENT_ID } from "@/features/oauth/constants";

/**
 * The enforcement machinery itself. The three drift guards test that the table
 * describes reality; this tests what the table is *for* — that a credential
 * holding the wrong scope is actually refused, and the right one is not.
 */

const token = (...scopes: string[]): Identity => ({
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(scopes),
  tokenId: "tok_1",
  capabilityExempt: false,
});

const session: Identity = {
  userId: "usr_1",
  method: "session",
  scopes: new Set(),
  capabilityExempt: true,
};

const READ_OP = "GQL Query.queryShellText";
const WRITE_OP = "GQL Mutation.createLedgerFile";
const ADMIN_OP = "GQL Mutation.deleteLedger";
const SESSION_ONLY_OP = "GQL Mutation.signIn";
const PUBLIC_OP = "GQL Query.health";
const UNKNOWN_OP = "GQL Query.somethingNobodyClassified";
const DELETE_ACCOUNT_OP = "GQL Mutation.deleteAccount";

describe("classifyOp", () => {
  it("fails closed on an op the table does not know", () => {
    expect(classifyOp(UNKNOWN_OP)).toEqual({ class: "write", found: false });
  });

  it("returns the classified class and its verb", () => {
    expect(classifyOp(READ_OP)).toEqual({
      class: "read",
      found: true,
      verb: "ledger.queryShellText",
    });
  });

  it("indexes every surface's op id from one row", () => {
    // `ledger.queryShellText` is one verb reachable two ways; both spellings
    // must land on the same class, or the surface a caller picked would decide
    // what they are allowed to do.
    expect(classifyOp("MCP runBqlQuery").class).toBe(
      classifyOp("GQL Query.queryShellText").class,
    );
  });

  it("exposes one op id per surface entry in the table", () => {
    const expected = VERB_TABLE.reduce(
      (total, entry) =>
        total +
        (entry.gql ? 1 : 0) +
        (entry.rest ? 1 : 0) +
        (entry.mcp ? 1 : 0) +
        (entry.mcpResource ? 1 : 0),
      0,
    );
    // Fewer ids than entries for two reasons: `editLedgerFiles` is named by
    // three rows, and `ledger.readFiles` carries both a tool and a resource —
    // one verb, two primitives, two ids.
    expect(classifiedOpIds().length).toBeLessThanOrEqual(expected);
    expect(new Set(classifiedOpIds()).size).toBe(classifiedOpIds().length);
  });
});

describe("evaluateScope", () => {
  it("lets an unauthenticated request through — authentication is elsewhere", () => {
    // Denying here would 403 every public route before its own handler could
    // decide it needs no caller.
    expect(evaluateScope(undefined, WRITE_OP).allowed).toBe(true);
  });

  it("exempts a browser session from the matrix entirely", () => {
    expect(evaluateScope(session, ADMIN_OP).allowed).toBe(true);
    expect(evaluateScope(session, SESSION_ONLY_OP).allowed).toBe(true);
  });

  it("refuses a read-only token on a write op", () => {
    const decision = evaluateScope(token("ledger.read"), WRITE_OP);
    expect(decision.allowed).toBe(false);
    expect(decision.requiredScope).toBe("ledger.write");
    expect(decision.denyReason).toContain("ledger.write");
  });

  it("refuses a write token on an admin op", () => {
    expect(evaluateScope(token("ledger.write"), ADMIN_OP).allowed).toBe(false);
  });

  it("treats scopes as cumulative, not orthogonal", () => {
    // A grant that may delete the ledger being refused a look at it would be
    // nonsense, and exact matching would only teach clients to ask for all
    // three every time.
    expect(evaluateScope(token("ledger.write"), READ_OP).allowed).toBe(true);
    expect(evaluateScope(token("ledger.admin"), READ_OP).allowed).toBe(true);
    expect(evaluateScope(token("ledger.admin"), WRITE_OP).allowed).toBe(true);
  });

  it("allows a public op to a token with no scopes at all", () => {
    expect(evaluateScope(token(), PUBLIC_OP).allowed).toBe(true);
  });

  it("refuses a session-only op to every scope combination", () => {
    const all = token("ledger.read", "ledger.write", "ledger.admin");
    const decision = evaluateScope(all, SESSION_ONLY_OP);
    expect(decision.allowed).toBe(false);
    expect(decision.requiredScope).toBeNull();
    expect(decision.denyReason).toContain("browser session");
  });

  it("admits only the native product session to account deletion", () => {
    const mobile = {
      ...token("ledger.admin"),
      oauthClientId: MOBILE_CLIENT_ID,
    };

    expect(evaluateScope(mobile, DELETE_ACCOUNT_OP).allowed).toBe(true);
    expect(
      evaluateScope(
        { ...mobile, oauthClientId: "dynamic-client" },
        DELETE_ACCOUNT_OP,
      ).allowed,
    ).toBe(false);
  });

  it("treats an unclassified op as write, and says so", () => {
    const decision = evaluateScope(token("ledger.read"), UNKNOWN_OP);
    expect(decision).toMatchObject({
      opClass: "write",
      classified: false,
      allowed: false,
    });
    expect(evaluateScope(token("ledger.write"), UNKNOWN_OP).allowed).toBe(true);
  });
});

describe("requireScopeClass", () => {
  it("throws in enforce mode", () => {
    expect(() =>
      requireScopeClass(token("ledger.read"), WRITE_OP, "enforce"),
    ).toThrow(ForbiddenError);
  });

  it("names the op in the refusal, so a client can tell what it lacked", () => {
    expect(() =>
      requireScopeClass(token("ledger.read"), WRITE_OP, "enforce"),
    ).toThrow(WRITE_OP);
  });

  it("records but does not refuse in shadow mode", () => {
    const decision = requireScopeClass(
      token("ledger.read"),
      WRITE_OP,
      "shadow",
    );
    expect(decision.allowed).toBe(true);
    // The underlying decision is preserved so the shadow log says what would
    // have happened rather than what did.
    expect(decision.opClass).toBe("write");
    expect(decision.requiredScope).toBe("ledger.write");
  });

  it("stays silent for a caller it never constrains", () => {
    expect(() =>
      requireScopeClass(session, UNKNOWN_OP, "enforce"),
    ).not.toThrow();
    expect(() =>
      requireScopeClass(undefined, WRITE_OP, "enforce"),
    ).not.toThrow();
  });

  it("lets a correctly scoped token through", () => {
    expect(
      requireScopeClass(token("ledger.write"), WRITE_OP, "enforce").allowed,
    ).toBe(true);
  });
});
