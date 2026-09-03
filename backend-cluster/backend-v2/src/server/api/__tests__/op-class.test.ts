import { ForbiddenError } from "@/shared/errors";
import type { Identity } from "../identity";
import {
  VERB_TABLE,
  authorizationActionForOp,
  classifiedOpIds,
  classifyOp,
  evaluateScope,
  gqlOpId,
  requireScopeClass,
  SOCIAL_PUBLIC_EXCLUSIONS,
} from "../op-class";
import { AUTHORIZATION_ACTIONS } from "../authorization";

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
});

const session: Identity = {
  userId: "usr_1",
  method: "session",
  scopes: new Set(),
};

const READ_OP = "GQL Query.queryShellText";
const WRITE_OP = "GQL Mutation.unclassifiedWriteFallback";
const ADMIN_OP = "MCP manageBankConnection";
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
      authorizationAction: AUTHORIZATION_ACTIONS.LEDGER_SHELL_READ,
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

  it("maps every migrated transport alias to one canonical action", () => {
    expect(
      [
        "GQL Query.userProfile",
        "GQL Query.getUserByExactMatch",
        "GQL Mutation.updateUsername",
        "GQL Mutation.updateProfile",
        "GQL Mutation.deleteAccount",
        "GQL Query.apiKeys",
        "REST GET /api-gateway/v1/api-keys",
        "MCP listApiKeys",
        "GQL Mutation.createApiKey",
        "REST POST /api-gateway/v1/api-keys",
        "MCP createApiKey",
        "GQL Mutation.revokeApiKey",
        "REST DELETE /api-gateway/v1/api-keys/{id}",
        "MCP revokeApiKey",
        "GQL Query.subscriptionStatus",
        "GQL Mutation.createSubscriptionSession",
        "GQL Mutation.createStripePortalSession",
        "GQL Mutation.cancelSubscription",
        "GQL Mutation.resumeSubscription",
        "GQL Mutation.upgradeSubscription",
        "GQL Query.getFeed",
        "GQL Mutation.followUser",
        "GQL Mutation.unfollowUser",
        "GQL Mutation.starLedger",
        "GQL Mutation.unstarLedger",
      ].map((opId) => authorizationActionForOp(opId)),
    ).toEqual([
      AUTHORIZATION_ACTIONS.USER_PROFILE_READ,
      AUTHORIZATION_ACTIONS.USER_PROFILE_SEARCH,
      AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE,
      AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE,
      AUTHORIZATION_ACTIONS.USER_DELETE,
      AUTHORIZATION_ACTIONS.USER_CREDENTIALS_LIST,
      AUTHORIZATION_ACTIONS.USER_CREDENTIALS_LIST,
      AUTHORIZATION_ACTIONS.USER_CREDENTIALS_LIST,
      AUTHORIZATION_ACTIONS.USER_CREDENTIALS_CREATE,
      AUTHORIZATION_ACTIONS.USER_CREDENTIALS_CREATE,
      AUTHORIZATION_ACTIONS.USER_CREDENTIALS_CREATE,
      AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE,
      AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE,
      AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE,
      AUTHORIZATION_ACTIONS.USER_BILLING_STATUS_READ,
      AUTHORIZATION_ACTIONS.USER_BILLING_CHECKOUT_CREATE,
      AUTHORIZATION_ACTIONS.USER_BILLING_PORTAL_CREATE,
      AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_CANCEL,
      AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_RESUME,
      AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_UPGRADE,
      AUTHORIZATION_ACTIONS.USER_SOCIAL_FEED_READ,
      AUTHORIZATION_ACTIONS.USER_SOCIAL_FOLLOW_CREATE,
      AUTHORIZATION_ACTIONS.USER_SOCIAL_FOLLOW_DELETE,
      AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_CREATE,
      AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_DELETE,
    ]);
  });

  it("maps every ledger control-plane verb exactly once", () => {
    const fields = [
      "Mutation.createLedger",
      "Mutation.updateLedger",
      "Mutation.deleteLedger",
      "Query.listPublicKeys",
      "Query.getPublicKey",
      "Mutation.createPublicKey",
      "Mutation.deletePublicKey",
      "Query.listLedgerCollaborators",
      "Query.getLedgerCollaboratorPermission",
      "Mutation.addOrUpdateLedgerCollaborator",
      "Mutation.deleteLedgerCollaborator",
      "Mutation.leaveLedger",
    ];
    expect(
      fields.map((field) => authorizationActionForOp(gqlOpId(field))),
    ).toEqual([
      AUTHORIZATION_ACTIONS.LEDGER_CREATE,
      AUTHORIZATION_ACTIONS.LEDGER_ADMINISTRATION_UPDATE,
      AUTHORIZATION_ACTIONS.LEDGER_ADMINISTRATION_DELETE,
      AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_LIST,
      AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_READ,
      AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_CREATE,
      AUTHORIZATION_ACTIONS.USER_PUBLIC_KEYS_DELETE,
      AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_LIST,
      AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_PERMISSION_READ,
      AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_UPDATE,
      AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_DELETE,
      AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_LEAVE,
    ]);
    for (const field of fields) {
      expect(VERB_TABLE.filter((entry) => entry.gql === field)).toHaveLength(1);
    }
  });

  it.each([
    [
      "GQL Query.suggestTransactionCategories",
      AUTHORIZATION_ACTIONS.ASSISTED_CATEGORIES_SUGGEST,
      "read",
    ],
    [
      "GQL Query.suggestPlaidTransactionCategories",
      AUTHORIZATION_ACTIONS.BANK_TRANSACTION_CATEGORIES_SUGGEST,
      "read",
    ],
    [
      "REST GET /api-gateway/v1/ledgers/{owner}/{name}/bank-transactions/suggested-categories",
      AUTHORIZATION_ACTIONS.BANK_TRANSACTION_CATEGORIES_SUGGEST,
      "read",
    ],
    [
      "MCP resource:bankSuggestedCategories",
      AUTHORIZATION_ACTIONS.BANK_TRANSACTION_CATEGORIES_SUGGEST,
      "read",
    ],
    [
      "GQL Query.suggestPlaidAccountMapping",
      AUTHORIZATION_ACTIONS.BANK_ACCOUNT_MAPPING_SUGGEST,
      "read",
    ],
    [
      "REST GET /api-gateway/v1/ledgers/{owner}/{name}/banks/{itemId}/suggested-mapping",
      AUTHORIZATION_ACTIONS.BANK_ACCOUNT_MAPPING_SUGGEST,
      "read",
    ],
    [
      "MCP resource:bankSuggestedMapping",
      AUTHORIZATION_ACTIONS.BANK_ACCOUNT_MAPPING_SUGGEST,
      "read",
    ],
    [
      "GQL Mutation.parseFile",
      AUTHORIZATION_ACTIONS.ASSISTED_FILE_PARSE,
      "write",
    ],
    [
      "GQL Mutation.parseReceipt",
      AUTHORIZATION_ACTIONS.ASSISTED_RECEIPT_PARSE,
      "write",
    ],
    [
      "GQL Mutation.insertReceiptTransaction",
      AUTHORIZATION_ACTIONS.LEDGER_RECEIPTS_WRITE,
      "write",
    ],
    [
      "GQL Mutation.generateTempAssetUploadUrl",
      AUTHORIZATION_ACTIONS.TEMP_ASSET_UPLOAD_CREATE,
      "write",
    ],
    [
      "GQL Query.generateTempAssetDownloadUrl",
      AUTHORIZATION_ACTIONS.TEMP_ASSET_DOWNLOAD_READ,
      "read",
    ],
    [
      "REST POST /api-gateway/agent",
      AUTHORIZATION_ACTIONS.AI_LEDGER_ASK,
      "write",
    ],
    [
      "REST POST /api-gateway/ask-agent",
      AUTHORIZATION_ACTIONS.AI_LEDGER_ASK,
      "write",
    ],
    [
      "REST POST /api-gateway/ai/openai/chat/completions",
      AUTHORIZATION_ACTIONS.AI_MODEL_INVOKE,
      "write",
    ],
    [
      "REST POST /api-gateway/ai/anthropic/v1/messages",
      AUTHORIZATION_ACTIONS.AI_MODEL_INVOKE,
      "write",
    ],
  ] as const)(
    "maps assisted-ingestion alias %s to %s without changing its %s budget class",
    (opId, action, opClass) => {
      expect(authorizationActionForOp(opId)).toBe(action);
      expect(classifyOp(opId).class).toBe(opClass);
    },
  );

  it("maps every ledger data-plane alias to its row's canonical action", () => {
    const actions = new Set<string>([
      AUTHORIZATION_ACTIONS.LEDGER_CATALOG_READ,
      AUTHORIZATION_ACTIONS.LEDGER_METADATA_READ,
      AUTHORIZATION_ACTIONS.LEDGER_REPORTS_READ,
      AUTHORIZATION_ACTIONS.LEDGER_JOURNAL_READ,
      AUTHORIZATION_ACTIONS.LEDGER_ACCOUNTS_READ,
      AUTHORIZATION_ACTIONS.LEDGER_FILES_READ,
      AUTHORIZATION_ACTIONS.LEDGER_FILES_WRITE,
      AUTHORIZATION_ACTIONS.LEDGER_REPOSITORY_READ,
      AUTHORIZATION_ACTIONS.LEDGER_SHELL_READ,
      AUTHORIZATION_ACTIONS.LEDGER_ARCHIVE_READ,
      AUTHORIZATION_ACTIONS.LEDGER_ENTRIES_WRITE,
      AUTHORIZATION_ACTIONS.LEDGER_RECEIPTS_WRITE,
      AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_READ,
      AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_CREATE,
      AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_APPROVE,
      AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_REJECT,
    ]);
    const rows = VERB_TABLE.filter(
      (entry) =>
        entry.authorizationAction && actions.has(entry.authorizationAction),
    );

    expect(new Set(rows.map((entry) => entry.authorizationAction))).toEqual(
      actions,
    );
    for (const entry of rows) {
      for (const alias of [
        entry.gql && gqlOpId(entry.gql),
        entry.rest && `REST ${entry.rest}`,
        entry.mcp && `MCP ${entry.mcp}`,
        entry.mcpResource && `MCP resource:${entry.mcpResource}`,
      ].filter((alias): alias is string => Boolean(alias))) {
        expect(authorizationActionForOp(alias)).toBe(entry.authorizationAction);
      }
    }
  });

  it("leaves grouped bank MCP dispatchers to authorize the selected service verb", () => {
    expect(
      authorizationActionForOp("MCP manageBankConnection"),
    ).toBeUndefined();
    expect(authorizationActionForOp("MCP manageBankImport")).toBeUndefined();

    expect(authorizationActionForOp("GQL Mutation.unlinkPlaidItem")).toBe(
      AUTHORIZATION_ACTIONS.BANK_CONNECTION_UNLINK,
    );
    expect(authorizationActionForOp("GQL Mutation.syncPlaidTransactions")).toBe(
      AUTHORIZATION_ACTIONS.BANK_TRANSACTIONS_SYNC,
    );
  });

  it.each([
    ["Query.getPlaidItems", AUTHORIZATION_ACTIONS.BANK_CONNECTIONS_LIST],
    ["Query.getPlaidItem", AUTHORIZATION_ACTIONS.BANK_CONNECTION_READ],
    ["Query.getPlaidAccounts", AUTHORIZATION_ACTIONS.BANK_ACCOUNTS_READ],
    [
      "Query.getPlaidAccountsForLedger",
      AUTHORIZATION_ACTIONS.BANK_ACCOUNTS_READ,
    ],
    ["Mutation.createPlaidLinkToken", AUTHORIZATION_ACTIONS.BANK_LINK_CREATE],
    [
      "Mutation.createPlaidUpdateModeLinkToken",
      AUTHORIZATION_ACTIONS.BANK_LINK_UPDATE,
    ],
    [
      "Mutation.exchangePlaidPublicToken",
      AUTHORIZATION_ACTIONS.BANK_LINK_EXCHANGE,
    ],
    ["Mutation.unlinkPlaidItem", AUTHORIZATION_ACTIONS.BANK_CONNECTION_UNLINK],
    [
      "Mutation.reconcilePlaidAccounts",
      AUTHORIZATION_ACTIONS.BANK_ACCOUNTS_RECONCILE,
    ],
    [
      "Mutation.updatePlaidAccountMapping",
      AUTHORIZATION_ACTIONS.BANK_ACCOUNT_MAPPING_UPDATE,
    ],
    [
      "Mutation.updatePlaidAccountCurrency",
      AUTHORIZATION_ACTIONS.BANK_ACCOUNT_CURRENCY_UPDATE,
    ],
    [
      "Mutation.refreshPlaidItemStatus",
      AUTHORIZATION_ACTIONS.BANK_CONNECTION_STATUS_REFRESH,
    ],
    [
      "Query.getUnsyncedPlaidTransactions",
      AUTHORIZATION_ACTIONS.BANK_TRANSACTIONS_READ,
    ],
    [
      "Query.suggestPlaidTransactionCategories",
      AUTHORIZATION_ACTIONS.BANK_TRANSACTION_CATEGORIES_SUGGEST,
    ],
    [
      "Query.suggestPlaidAccountMapping",
      AUTHORIZATION_ACTIONS.BANK_ACCOUNT_MAPPING_SUGGEST,
    ],
    [
      "Mutation.syncPlaidTransactions",
      AUTHORIZATION_ACTIONS.BANK_TRANSACTIONS_SYNC,
    ],
    [
      "Mutation.submitPlaidTransactionsToLedger",
      AUTHORIZATION_ACTIONS.BANK_TRANSACTIONS_SUBMIT,
    ],
    [
      "Mutation.deletePlaidTransactions",
      AUTHORIZATION_ACTIONS.BANK_TRANSACTIONS_DELETE,
    ],
  ])("maps GQL %s to the exact bank action", (verb, action) => {
    expect(authorizationActionForOp(`GQL ${verb}`)).toBe(action);
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

  it("defers centralized-authz operations without treating a ledger scope as authority", () => {
    const decision = evaluateScope(token(), DELETE_ACCOUNT_OP);
    expect(decision.allowed).toBe(true);
    expect(decision.opClass).toBe("admin");
    expect(decision.requiredScope).toBe("ledger.admin");
    expect(decision.authorizationAction).toBe(
      AUTHORIZATION_ACTIONS.USER_DELETE,
    );
  });

  it("classifies migrated account operations by operational risk", () => {
    expect(
      [
        "GQL Query.userProfile",
        "GQL Query.getUserByExactMatch",
        "GQL Mutation.updateUsername",
        "GQL Mutation.updateProfile",
        "GQL Mutation.deleteAccount",
      ].map((opId) => classifyOp(opId).class),
    ).toEqual(["read", "read", "write", "write", "admin"]);
  });

  it("keeps API-key operations on the admin risk class while deferring policy", () => {
    const decision = evaluateScope(token("ledger.write"), "MCP revokeApiKey");
    expect(decision).toMatchObject({
      allowed: true,
      opClass: "admin",
      requiredScope: "ledger.admin",
      authorizationAction: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE,
    });
  });

  it("defers ledger control-plane reachability to the PDP while preserving admin risk", () => {
    for (const opId of [
      "GQL Mutation.createLedger",
      "GQL Mutation.updateLedger",
      "GQL Mutation.deleteLedger",
      "GQL Query.listPublicKeys",
      "GQL Query.listLedgerCollaborators",
      "GQL Mutation.leaveLedger",
    ]) {
      expect(evaluateScope(token(), opId)).toMatchObject({
        allowed: true,
        opClass: "admin",
        requiredScope: "ledger.admin",
      });
      expect(authorizationActionForOp(opId)).toBeDefined();
    }
  });

  it("keeps tier quotas public and defers protected billing credentials to the PDP", () => {
    expect(
      [
        "GQL Query.allTierQuotas",
        "GQL Query.subscriptionStatus",
        "GQL Mutation.createSubscriptionSession",
        "GQL Mutation.createStripePortalSession",
        "GQL Mutation.cancelSubscription",
        "GQL Mutation.resumeSubscription",
        "GQL Mutation.upgradeSubscription",
      ].map((opId) => classifyOp(opId).class),
    ).toEqual(["public", "read", "write", "write", "write", "write", "write"]);
    expect(evaluateScope(token(), "GQL Query.allTierQuotas")).toMatchObject({
      allowed: true,
      opClass: "public",
    });
    expect(authorizationActionForOp("GQL Query.allTierQuotas")).toBeUndefined();
    expect(
      evaluateScope(token(), "GQL Mutation.cancelSubscription"),
    ).toMatchObject({
      allowed: true,
      authorizationAction:
        AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_CANCEL,
    });
  });

  it("makes public social discovery explicit and PDP-routes protected social roots", () => {
    for (const [field, reason] of Object.entries(SOCIAL_PUBLIC_EXCLUSIONS)) {
      const opId = gqlOpId(field);
      expect(reason.length).toBeGreaterThan(20);
      expect(classifyOp(opId).class).toBe("public");
      expect(authorizationActionForOp(opId)).toBeUndefined();
      expect(evaluateScope(token(), opId).allowed).toBe(true);
    }

    expect(
      [
        "GQL Query.getFeed",
        "GQL Mutation.followUser",
        "GQL Mutation.unfollowUser",
        "GQL Mutation.starLedger",
        "GQL Mutation.unstarLedger",
      ].map((opId) => classifyOp(opId).class),
    ).toEqual(["read", "write", "write", "write", "write"]);
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
