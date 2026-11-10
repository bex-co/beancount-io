import type { Identity } from "@/server/api/identity";
import { ErrorCategory } from "@/shared/errors";
import {
  AUTHORIZATION_ACTIONS,
  AuthorizationService,
  ledgerResource,
  type AuthorizationAction,
} from "..";

/**
 * w23/m36 — one bad call, one failure: a ledger the caller cannot see.
 *
 * REST, GraphQL and MCP all authorize through this one service, so the
 * failure a missing or private ledger earns is decided here and is the same
 * on every surface. Eleven write tools used to answer FORBIDDEN "Authorization
 * denied" for a mistyped ledger name while every read answered NOT_FOUND
 * (w1/194). This matrix walks every ledger-scoped action, so a new one fails
 * until it conceals the ledger or is listed below with the reason it differs.
 *
 * The rest of the bad-call set, and where each row is proved:
 * - out-of-range `page`/`limit` on the catalogs: `catalog-parity.test.ts`
 *   ("list pagination arguments"), REST, GraphQL and the MCP resource;
 * - a write that breaks the ledger: `write-preview-matrix.test.ts`;
 * - a stale hash: `write-conflict-parity.test.ts`;
 * - a blank bank id: `bank-empty-id-parity.test.ts`;
 * - a read-only credential writing: `permissions-parity.test.ts`.
 */
const principal: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.admin"]),
};

/** Ledger-scoped actions that answer a different refusal, and why. */
const ALLOWED_DIFFERENCES: Partial<Record<AuthorizationAction, string>> = {
  [AUTHORIZATION_ACTIONS.LEDGER_CATALOG_READ]:
    "authorizes the caller's own account, not a ledger",
  [AUTHORIZATION_ACTIONS.LEDGER_CREATE]:
    "authorizes the caller's own account; the ledger does not exist yet",
  [AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_LEAVE]:
    "keeps its own refusal for a non-member (w23/063)",
};

const LEDGER_ACTIONS = Object.values(AUTHORIZATION_ACTIONS).filter(
  (action) => action.startsWith("ledger.") && !(action in ALLOWED_DIFFERENCES),
);

describe("a ledger the caller cannot see", () => {
  it("covers read, write and administration actions", () => {
    expect(LEDGER_ACTIONS).toEqual(
      expect.arrayContaining([
        AUTHORIZATION_ACTIONS.LEDGER_METADATA_READ,
        AUTHORIZATION_ACTIONS.LEDGER_FILES_WRITE,
        AUTHORIZATION_ACTIONS.LEDGER_ADMINISTRATION_DELETE,
      ]),
    );
  });

  it.each(LEDGER_ACTIONS)("answers %s as not found", async (action) => {
    await expect(
      new AuthorizationService({ check: async () => false }).authorizeOrThrow({
        principal,
        action,
        resource: ledgerResource("alice/qa-nonexistent"),
      }),
    ).rejects.toMatchObject({
      category: ErrorCategory.NOT_FOUND,
      message: "Ledger not found",
    });
  });
});
