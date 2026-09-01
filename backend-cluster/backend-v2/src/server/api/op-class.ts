import {
  hasRequiredScope,
  isFirstPartyInteractiveIdentity,
  type ApiScope,
  type Identity,
} from "./identity";
import { ForbiddenError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import {
  auditSubject,
  emitAuditEvent,
  shouldAudit,
  type AuditOutcome,
} from "./audit";
import {
  AUTHORIZATION_ACTIONS,
  type AuthorizationAction,
} from "./authorization/authorization-contract";
import { authorizationActionAcceptsDelegatedCredential } from "./authorization/authorization-service";

const scopeLogger = logger.child({ module: "op-class" });

/**
 * How much authority an operation needs, expressed in the closed scope
 * vocabulary of ADR 0006 D3 plus the classes that vocabulary cannot express.
 *
 * - `read` / `write` / `admin` map onto `ledger.read` / `ledger.write` /
 *   `ledger.admin`. `admin` is the ledger's own control plane: its existence,
 *   its collaborators, its keys, its bank bindings — and the reads of those,
 *   because an access-control list is not ledger content.
 * - `session-only` is the historical catalog name for an op no delegated scope
 *   alone can unlock. The exact first-party Dashboard OAuth client and valid
 *   legacy sessions can reach it; Mobile, DCR/MCP, API keys, and arbitrary
 *   issuer-signed clients cannot. The vocabulary stays three ledger scopes
 *   wide, so billing and browser-only ceremonies have no scope that describes
 *   them.
 *   Filing them under `admin` would mean a token granted "manage my ledger"
 *   could also delete the account — so they get a class that never matches.
 * - `public` is for the handful of ops that carry no authority at all (a
 *   liveness probe, the feature-flag bootstrap). It exists so "needs nothing"
 *   is stated rather than approximated by `read`.
 *
 * An op absent from the table is treated as `write`, not as an error — see
 * {@link classifyOp}. That is the fail-closed default; the coverage test
 * (`op-class-coverage.test.ts`) is what keeps it from ever firing in
 * production.
 */
export type OpClass = "read" | "write" | "admin" | "session-only" | "public";

/** The scope that satisfies each class, or null when no scope can. */
// TODO(authz): Migrate the remaining protected operations to centralized
// authorization, using OpenFGA for durable relationship checks when ADR 0010's
// runtime-adoption trigger fires.
const SCOPE_FOR_CLASS: Record<OpClass, ApiScope | null> = {
  read: "ledger.read",
  write: "ledger.write",
  admin: "ledger.admin",
  "session-only": null,
  public: null,
};

/**
 * Whether enforcement denies or merely records. Shadow mode logs the requests
 * that *would* be refused so coverage can be confirmed against real traffic
 * before anyone is actually turned away (ADR 0006 Consequences / risk 2).
 */
export type ScopeEnforcementMode = "shadow" | "enforce";

// ---------------------------------------------------------------------------
// Op ids
// ---------------------------------------------------------------------------

/**
 * Stable op ids, the keys this whole table is written against (ADR 0006 D3):
 *
 * ```
 * REST <METHOD> <path>     REST GET /api-gateway/ledgers/{ledgerId}/archive/{archive}
 * GQL Query.<field>        GQL Query.queryShellText
 * GQL Mutation.<field>     GQL Mutation.upsertEntry
 * MCP <tool>               MCP runBqlQuery
 * ```
 *
 * They are checked into this file and asserted against the live registrations
 * by `op-class-coverage.test.ts`, which is what makes them stable rather than
 * merely conventional.
 */
export const restOpId = (method: string, path: string): string =>
  `REST ${method} ${path}`;
export const gqlOpId = (field: string): string => `GQL ${field}`;
export const mcpOpId = (tool: string): string => `MCP ${tool}`;
/**
 * A resource read is its own op, classified like any other.
 *
 * Distinct from `mcpOpId` because a resource and a tool are separate primitives
 * with separate handlers, and the rate limiter and audit trail should be able
 * to tell "read the file" from "call the tool that reads the file". The *verb*
 * is the same, so both ids hang off one `VERB_TABLE` row.
 */
export const mcpResourceOpId = (resource: string): string =>
  `MCP resource:${resource}`;

// ---------------------------------------------------------------------------
// The verb table
// ---------------------------------------------------------------------------

/**
 * One verb, and where it is reachable.
 *
 * A verb is the unit parity is judged on: the same capability may appear as a
 * GraphQL field, a REST route, and an MCP tool, and those three op ids belong
 * to one row. A surface a verb does not reach must carry a reason string in the
 * matching `*Exempt` field — `surface-parity.test.ts` fails on a bare absence,
 * so "we never got round to it" has to be written down as such.
 */
export interface VerbEntry {
  /** Stable identifier for the verb itself, independent of any surface. */
  readonly verb: string;
  /**
   * Operational risk class used for rate limiting and legacy audit defaults.
   * When `authorizationAction` is present, this does not describe credential
   * reachability or grant authority; the centralized PDP catalog does.
   */
  readonly class: OpClass;
  /** Canonical PDP action, independent of rate/audit operational class. */
  readonly authorizationAction?: AuthorizationAction;
  /** GraphQL root field, e.g. `Query.getLedger`. */
  readonly gql?: string;
  /** REST route as `<METHOD> <path>`, path in `{param}` form. */
  readonly rest?: string;
  /** MCP tool name. */
  readonly mcp?: string;
  /**
   * MCP resource name, when the same verb is also fetchable as a resource
   * (ADR 0008 D2). Reads that an agent pulls into context rather than acts
   * through; the verb and its class are shared with the tool above.
   */
  readonly mcpResource?: string;
  readonly gqlExempt?: string;
  readonly restExempt?: string;
  readonly mcpExempt?: string;
}

/**
 * Why a verb has no REST route. These are categories, not boilerplate: each one
 * is an argument that can be disagreed with, which is the point — the parity
 * test's job is to make the absence arguable rather than invisible.
 */
const R = {
  sessionCeremony:
    "Session-only ceremony: login, signup, OTP, and password reset are browser-shaped (cookies, redirects, one-time links). A REST twin would be a second authentication system to keep correct, not a convenience.",
  accountProfile:
    "Identity, not ledger content: a token client already gets these facts from the OIDC userinfo endpoint, so a REST twin would be a second source of the same data, free to drift.",
  credentialMinting:
    "Credential minting is deliberately unreachable by a token credential (ADR 0006 D6: an API key may not create an API key), so a REST twin would exist only to be refused.",
  billing:
    "Billing verbs return Stripe-hosted URLs a human must visit in a browser; a curl client cannot complete checkout or the customer portal, so the endpoint would hand back a link to nowhere.",
  publicPricingCatalog:
    "The public pricing catalog currently has only a GraphQL consumer. A REST representation is useful when a non-GraphQL pricing client asks for it, not before its contract is known.",
  coveredByV1List:
    "Covered by `GET /api-gateway/v1/ledgers`, which already returns every ledger the caller can reach. Owner-filtering and search are paging concerns of one screen; a client holding the list can do both itself.",
  coveredByV1Journal:
    "Covered by `GET /api-gateway/v1/ledgers/{owner}/{name}/journal`, which takes the same account/filter/time narrowing and answers with structured entries rather than a screen-tuned or plaintext rendering.",
  coveredByV1Entries:
    "Covered by `POST /api-gateway/v1/ledgers/{owner}/{name}/entries`, which calls the same `addBulkEntries` service and routes each directive to its file the same way.",
  coveredByV1Files:
    "Expressible over the v1 file endpoints: `GET`, `PUT`, and `DELETE` on `/api-gateway/v1/ledgers/{owner}/{name}/files/{path}` cover reading, writing, and moving content. A dedicated verb would be a second way to spell the same commit.",
  ledgerControlPlane:
    "The ledger control plane — creating, renaming, deleting a ledger, and who may reach it — is `admin` class and deliberately outside D7's v1 table. v1 publishes ledger *content*; granting a token the power to delete a ledger is a decision to take deliberately alongside API keys (w1/m22), not to inherit from publishing reads.",
  notInV1Table:
    "Not in ADR 0006 D7's v1 table. v1 is deliberately small — the bar is the handful of things a curl user does in their first ten minutes — so this waits for a client that asks for it rather than shipping as a default.",
  dashboardShaped:
    "Dashboard-shaped read: the response is assembled for one screen (chart series, account trees, screen-tuned paging). v1 REST publishes ledger resources, not screens (ADR 0006 D7).",
  giteaSocial:
    "The Gitea-backed social graph (feeds, followers, stars) is a web-UI product surface, outside the ledger resource model the Beancount API promises.",
  pullRequest:
    "Ledger pull-request review is a dashboard workflow layered on Gitea's own API; publishing it as REST would commit us to Gitea's review model as public contract.",
  plaidBinding:
    "Plaid binding runs through Link, a browser widget — the link token and its public-token exchange are only meaningful as callbacks from that widget. Covers the Link ceremony only; operating an already-linked bank is `plaidOperation` (ADR 0008 D4a).",
  plaidOperation:
    "Operating an already-linked bank — listing items, mapping accounts, syncing and submitting transactions — needs no browser and is squarely customer-facing. Deferred pending the authorization decision in w3/m8/t001, not excused (ADR 0008 D4a).",
  llm: "LLM-assisted helper whose contract is a prompt and its response shape, both still moving. Publishing it as REST would freeze what we are still iterating on.",
  assetStorage:
    "Pre-signed S3 URL minting is an implementation detail of the dashboard's upload widget, not a ledger resource.",
  legacy:
    "Legacy resolver retained for older mobile clients and on the removal path; a public REST twin would extend its life rather than end it.",
  internalProbe:
    "Already reachable over REST in its own right — `GET /healthz` for liveness, the dashboard bootstrap for flags — so a second spelling would only be another thing to keep in step.",
  streamingOnly:
    "Server-sent streaming: the response is an event stream tied to one long-lived HTTP request, which is what the dedicated AI routes already are.",
} as const;

/**
 * Why a verb has no MCP tool. Tool count is the dominant cost in an agent's
 * tool selection, so "an agent could conceivably call this" is not sufficient
 * reason to add one — the bar is a workflow that needs it.
 */
const M = {
  notAgentShaped:
    "Not agent-shaped — no agent workflow reaches for it, and every additional tool measurably degrades selection accuracy for the ones that do (ADR 0006 Alternatives: agents are highly sensitive to tool naming and count). Deferred rather than structural: ADR 0008 D5 makes the tool list a budget, so this is an argument about today's budget, not a permanent limit.",
  sessionCeremony:
    "Authentication ceremony: an MCP client arrives already holding a token, so it can neither need nor complete these.",
  credentialMinting:
    "Credential minting is deliberately unreachable by a token credential (ADR 0006 D6), and an agent minting its own successor credential is precisely the loop that rule closes.",
  billing:
    "Billing is a human decision with a hosted checkout page; an agent has nothing to do with the URL it would receive.",
  publicPricingCatalog:
    "An agent has no workflow that needs the static pricing catalog, and adding a dedicated tool would spend the deliberately-small MCP tool budget without helping ledger work.",
  plaidBinding:
    "Bank binding runs through the Plaid Link browser widget, which an agent cannot drive. Covers the Link ceremony only — three verbs. Operating an already-linked bank is `plaidOperation` (ADR 0008 D4a).",
  plaidOperation:
    "Operating an already-linked bank needs no browser, and importing transactions into a ledger is close to the whole customer job. Deferred pending w3/m8/t001's decision on what an agent may do to a bank link, not excused (ADR 0008 D4a).",
  dashboardShaped:
    "Screen-shaped payload: an agent wants the underlying ledger data, which `runBqlQuery` already gives it in a form it can reason about.",
  coveredByBql:
    "Already reachable through `runBqlQuery` — BQL expresses this query directly, so a dedicated tool would be a second, narrower way to ask the same question. Read-only by construction: BQL cannot write, so this may never excuse a `write` or `admin` verb (ADR 0008 D7.1).",
  coveredByEditFiles:
    "Already reachable through `editLedgerFiles` — the directive is written into the ledger file and committed by the same tool, so a dedicated tool would be a second way to spell one commit.",
  transportOnly:
    "This *is* the MCP surface's own transport or one of its siblings — a tool for reaching it would be circular.",
  singleLedgerPin:
    "Depends-on ADR-0007-D3 — MCP pins every credential to one ledger, so a tool that enumerates ledgers can only return the one the agent already has. ADR 0007 D11 relaxes the pin and inverts this: an unpinned credential must call it first. Reverse when D11 lands.",
} as const;

/** Why a verb has no GraphQL field. */
const G = {
  bytesNotFields:
    "Serves bytes, not fields: a GraphQL response cannot stream an archive, so the field mints the ticket and the REST route serves the download.",
  streamingOnly:
    "Server-sent streaming over a long-lived HTTP request; GraphQL's request/response shape cannot carry it, and the dashboard consumes the stream directly.",
  wireCompat:
    "Exists to speak a foreign wire format (OpenAI / Anthropic / MCP) so third-party clients work unchanged; a GraphQL twin would have no client.",
} as const;

/**
 * Verbs outside the parity target, by name.
 *
 * ADR 0008 D4 scopes parity to the customer-facing surface: an operation a
 * ledger owner, or an agent acting for them, performs on their own accounting
 * data. Three things fall outside it. Two are small enough to list here; the
 * third — the `session-only` class — is derived, because ADR 0006 D3 already
 * decided it and a second list would be free to disagree.
 *
 * These are lists rather than a marker on each exemption string on purpose.
 * An exemption is an *argument*, and the same argument lands on both in-scope
 * and out-of-scope verbs — "credential minting is unreachable by a token"
 * excuses six `session-only` verbs and four in-scope ones. A prose marker would
 * have to be right in every row it was pasted into, which is the failure mode
 * ADR 0008 exists to stop. Derive what can be derived.
 */

/** The Plaid Link ceremony: the operation *is* the hosted browser widget. */
const LINK_CEREMONY_VERBS: ReadonlySet<string> = new Set([
  "Mutation.createPlaidLinkToken",
  "Mutation.createPlaidUpdateModeLinkToken",
  "Mutation.exchangePlaidPublicToken",
]);

/** Projections assembled for one dashboard screen, not ledger resources. */
const SCREEN_PROJECTION_VERBS: ReadonlySet<string> = new Set([
  "Query.accountHierarchy",
  "Query.homeCharts",
]);

/**
 * In-scope verbs a given surface cannot carry, whatever the effort.
 *
 * Distinct from the scope lists above, and the distinction matters: those say
 * "not a parity target"; this says "a target, and this surface physically
 * cannot". Ten verbs, all of them a transport limit rather than a judgement —
 * which is why they are listed rather than argued for per row.
 */
const SURFACE_IMPOSSIBLE: Record<
  "gql" | "rest" | "mcp",
  ReadonlySet<string>
> = {
  // A GraphQL response cannot stream an archive or an event stream, and cannot
  // speak someone else's wire format.
  gql: new Set([
    "ledger.downloadArchive",
    "ledger.downloadArchive.legacy",
    "ai.agent",
    "ai.askAgent",
    "ai.openaiChatCompletions",
    "ai.anthropicMessages",
  ]),
  // REST can carry anything in scope; the set is empty rather than absent so
  // that adding to it is a deliberate edit here.
  rest: new Set<string>(),
  // These *are* the agent transports. A tool for reaching one from inside a
  // tool call is circular.
  mcp: new Set([
    "ai.agent",
    "ai.askAgent",
    "ai.openaiChatCompletions",
    "ai.anthropicMessages",
  ]),
};

/** Whether `surface` could carry this verb if someone did the work. */
export function isReachableOn(
  entry: VerbEntry,
  surface: "gql" | "rest" | "mcp",
): boolean {
  return isInParityScope(entry) && !SURFACE_IMPOSSIBLE[surface].has(entry.verb);
}

/**
 * Whether a verb is something parity is trying to reach at all.
 *
 * False means "cannot, and that is settled" — not "nobody got to it". The
 * ratchet in `surface-parity.test.ts` counts only what this returns true for,
 * so an absence that is genuinely out of reach never inflates the debt and an
 * absence that is merely unbuilt can never hide inside it.
 */
export function isInParityScope(entry: VerbEntry): boolean {
  if (entry.authorizationAction) {
    // Operational risk and credential reachability are deliberately separate.
    // Parity follows the PDP catalog, while `class` continues to select the
    // transport's rate budget and legacy audit default.
    return authorizationActionAcceptsDelegatedCredential(
      entry.authorizationAction,
    );
  }
  return (
    entry.class !== "session-only" &&
    !LINK_CEREMONY_VERBS.has(entry.verb) &&
    !SCREEN_PROJECTION_VERBS.has(entry.verb)
  );
}

/** A verb on GraphQL and REST, but not MCP. */
const gqlAndRest = (
  gql: string,
  opClass: OpClass,
  rest: string,
  mcpExempt: string,
): VerbEntry => ({
  verb: gql,
  class: opClass,
  gql,
  rest,
  mcpExempt,
});

/** A verb that lives only on GraphQL. */
const gqlOnly = (
  gql: string,
  opClass: OpClass,
  restExempt: string,
  mcpExempt: string,
): VerbEntry => ({
  verb: gql,
  class: opClass,
  gql,
  restExempt,
  mcpExempt,
});

const ACCOUNT_VERBS: readonly VerbEntry[] = [
  // The native app learns who signed in by asking for its profile immediately
  // after code exchange. The PDP preserves that `ledger.read` credential
  // ceiling while composing it with exact-self, instead of letting the ledger
  // scope gate make the final User-domain decision.
  {
    ...gqlOnly("Query.userProfile", "read", R.accountProfile, M.notAgentShaped),
    authorizationAction: AUTHORIZATION_ACTIONS.USER_PROFILE_READ,
  },
  {
    ...gqlOnly(
      "Query.getUserByExactMatch",
      "read",
      R.accountProfile,
      M.notAgentShaped,
    ),
    authorizationAction: AUTHORIZATION_ACTIONS.USER_PROFILE_SEARCH,
  },
  {
    ...gqlOnly(
      "Mutation.deleteAccount",
      "admin",
      R.sessionCeremony,
      M.sessionCeremony,
    ),
    authorizationAction: AUTHORIZATION_ACTIONS.USER_DELETE,
  },
  {
    ...gqlOnly(
      "Mutation.updateUsername",
      "write",
      R.accountProfile,
      M.notAgentShaped,
    ),
    authorizationAction: AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE,
  },
  {
    ...gqlOnly(
      "Mutation.updateProfile",
      "write",
      R.accountProfile,
      M.notAgentShaped,
    ),
    authorizationAction: AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE,
  },
];

const AUTH_VERBS: readonly VerbEntry[] = [
  gqlOnly(
    "Query.validateEmailToken",
    "session-only",
    R.sessionCeremony,
    M.sessionCeremony,
  ),
  gqlOnly(
    "Mutation.logout",
    "session-only",
    R.sessionCeremony,
    M.sessionCeremony,
  ),
  gqlOnly(
    "Mutation.signIn",
    "session-only",
    R.sessionCeremony,
    M.sessionCeremony,
  ),
  gqlOnly(
    "Mutation.refreshToken",
    "session-only",
    R.sessionCeremony,
    M.sessionCeremony,
  ),
  gqlOnly(
    "Mutation.signInWithOneTimeToken",
    "session-only",
    R.sessionCeremony,
    M.sessionCeremony,
  ),
  gqlOnly(
    "Mutation.createOneTimeToken",
    "session-only",
    R.credentialMinting,
    M.credentialMinting,
  ),
  gqlOnly(
    "Mutation.sendForgotPasswordLink",
    "session-only",
    R.sessionCeremony,
    M.sessionCeremony,
  ),
  gqlOnly(
    "Mutation.resetPassword",
    "session-only",
    R.sessionCeremony,
    M.sessionCeremony,
  ),
  gqlOnly(
    "Mutation.signUp",
    "session-only",
    R.sessionCeremony,
    M.sessionCeremony,
  ),
  gqlOnly(
    "Mutation.verifySignUpOtp",
    "session-only",
    R.sessionCeremony,
    M.sessionCeremony,
  ),
  // The CLI auth ceremony mints session credentials. It is the one flow whose
  // whole purpose is to hand a token to a non-browser client, which is exactly
  // why a non-browser client must not be able to drive it (ADR 0006 D6).
  gqlOnly(
    "Query.getCliAuthSession",
    "session-only",
    R.credentialMinting,
    M.credentialMinting,
  ),
  gqlOnly(
    "Mutation.createCliAuthSession",
    "session-only",
    R.credentialMinting,
    M.credentialMinting,
  ),
  gqlOnly(
    "Mutation.confirmCliAuthSession",
    "session-only",
    R.credentialMinting,
    M.credentialMinting,
  ),
  gqlOnly(
    "Mutation.denyCliAuthSession",
    "session-only",
    R.credentialMinting,
    M.credentialMinting,
  ),
  gqlOnly(
    "Mutation.consumeCliAuthSession",
    "session-only",
    R.credentialMinting,
    M.credentialMinting,
  ),
];

const BILLING_VERBS: readonly VerbEntry[] = [
  // Static product configuration, not user billing state. Keep it public so a
  // pricing surface can render before sign-in; protected billing starts below.
  gqlOnly(
    "Query.allTierQuotas",
    "public",
    R.publicPricingCatalog,
    M.publicPricingCatalog,
  ),
  {
    ...gqlOnly("Query.subscriptionStatus", "read", R.billing, M.billing),
    authorizationAction: AUTHORIZATION_ACTIONS.USER_BILLING_STATUS_READ,
  },
  {
    ...gqlOnly(
      "Mutation.createSubscriptionSession",
      "write",
      R.billing,
      M.billing,
    ),
    authorizationAction: AUTHORIZATION_ACTIONS.USER_BILLING_CHECKOUT_CREATE,
  },
  {
    ...gqlOnly(
      "Mutation.createStripePortalSession",
      "write",
      R.billing,
      M.billing,
    ),
    authorizationAction: AUTHORIZATION_ACTIONS.USER_BILLING_PORTAL_CREATE,
  },
  {
    ...gqlOnly("Mutation.cancelSubscription", "write", R.billing, M.billing),
    authorizationAction: AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_CANCEL,
  },
  {
    ...gqlOnly("Mutation.resumeSubscription", "write", R.billing, M.billing),
    authorizationAction: AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_RESUME,
  },
  {
    ...gqlOnly("Mutation.upgradeSubscription", "write", R.billing, M.billing),
    authorizationAction:
      AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_UPGRADE,
  },
];

const PROBE_VERBS: readonly VerbEntry[] = [
  gqlOnly("Query.health", "public", R.internalProbe, M.notAgentShaped),
  gqlOnly("Query.featureFlags", "public", R.internalProbe, M.notAgentShaped),
];

/**
 * The ledger's own control plane. Both the writes and the reads are `admin`:
 * a collaborator list and a deploy key are access-control artefacts, not ledger
 * content, and a grant that says "read my books" should not also enumerate who
 * else can reach them.
 */
const LEDGER_ADMIN_VERBS: readonly VerbEntry[] = [
  gqlOnly(
    "Mutation.createLedger",
    "admin",
    R.ledgerControlPlane,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Mutation.updateLedger",
    "admin",
    R.ledgerControlPlane,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Mutation.deleteLedger",
    "admin",
    R.ledgerControlPlane,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Query.listPublicKeys",
    "admin",
    R.credentialMinting,
    M.credentialMinting,
  ),
  gqlOnly(
    "Query.getPublicKey",
    "admin",
    R.credentialMinting,
    M.credentialMinting,
  ),
  gqlOnly(
    "Mutation.createPublicKey",
    "admin",
    R.credentialMinting,
    M.credentialMinting,
  ),
  gqlOnly(
    "Mutation.deletePublicKey",
    "admin",
    R.credentialMinting,
    M.credentialMinting,
  ),
  gqlOnly(
    "Query.listLedgerCollaborators",
    "admin",
    R.ledgerControlPlane,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Query.getLedgerCollaboratorPermission",
    "admin",
    R.ledgerControlPlane,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Mutation.addOrUpdateLedgerCollaborator",
    "admin",
    R.ledgerControlPlane,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Mutation.deleteLedgerCollaborator",
    "admin",
    R.ledgerControlPlane,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Mutation.leaveLedger",
    "admin",
    R.ledgerControlPlane,
    M.notAgentShaped,
  ),
];

const LEDGER_READ_VERBS: readonly VerbEntry[] = [
  gqlAndRest(
    "Query.listLedgers",
    "read",
    "GET /api-gateway/v1/ledgers",
    M.singleLedgerPin,
  ),
  gqlOnly(
    "Query.listUserOwnedLedgers",
    "read",
    R.coveredByV1List,
    M.notAgentShaped,
  ),
  gqlOnly("Query.searchLedgers", "read", R.coveredByV1List, M.notAgentShaped),
  gqlAndRest(
    "Query.getLedger",
    "read",
    "GET /api-gateway/v1/ledgers/{owner}/{name}",
    M.notAgentShaped,
  ),
  gqlOnly("Query.getLedgerOverview", "read", R.dashboardShaped, M.coveredByBql),
  gqlAndRest(
    "Query.getLedgerIncomeStatement",
    "read",
    "GET /api-gateway/v1/ledgers/{owner}/{name}/statements/{statement}",
    M.coveredByBql,
  ),
  gqlAndRest(
    "Query.getLedgerBalanceSheet",
    "read",
    "GET /api-gateway/v1/ledgers/{owner}/{name}/statements/{statement}",
    M.coveredByBql,
  ),
  {
    verb: "Query.getLedgerTrialBalance",
    class: "read",
    gql: "Query.getLedgerTrialBalance",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/trial-balance",
    mcpResource: "ledgerTrialBalance",
    mcpExempt:
      "Reachable as the `ledgerTrialBalance` resource rather than a tool: an analysis read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getLedgerAttributes",
    class: "read",
    gql: "Query.getLedgerAttributes",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/attributes",
    mcpResource: "ledgerAttributes",
    mcpExempt:
      "Reachable as the `ledgerAttributes` resource rather than a tool: a vocabulary read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getLedgerCommodities",
    class: "read",
    gql: "Query.getLedgerCommodities",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/commodities",
    mcpResource: "ledgerCommodities",
    mcpExempt:
      "Reachable as the `ledgerCommodities` resource rather than a tool: a vocabulary read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getLedgerEvents",
    class: "read",
    gql: "Query.getLedgerEvents",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/events",
    mcpResource: "ledgerEvents",
    mcpExempt:
      "Reachable as the `ledgerEvents` resource rather than a tool: a vocabulary read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  gqlOnly(
    "Query.getLedgerDocuments",
    "read",
    R.dashboardShaped,
    M.coveredByBql,
  ),
  {
    verb: "Query.getLedgerPayeeTransactions",
    class: "read",
    gql: "Query.getLedgerPayeeTransactions",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/payee-transactions",
    mcpResource: "ledgerPayeeTransactions",
    mcpExempt:
      "Reachable as the `ledgerPayeeTransactions` resource rather than a tool: an analysis read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getLedgerNarrationTransactions",
    class: "read",
    gql: "Query.getLedgerNarrationTransactions",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/narration-transactions",
    mcpResource: "ledgerNarrationTransactions",
    mcpExempt:
      "Reachable as the `ledgerNarrationTransactions` resource rather than a tool: an analysis read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getLedgerPayeeAccounts",
    class: "read",
    gql: "Query.getLedgerPayeeAccounts",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/payee-accounts",
    mcpResource: "ledgerPayeeAccounts",
    mcpExempt:
      "Reachable as the `ledgerPayeeAccounts` resource rather than a tool: an analysis read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getLedgerErrors",
    class: "read",
    gql: "Query.getLedgerErrors",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/errors",
    mcpResource: "ledgerErrors",
    mcpExempt:
      "Reachable as the `ledgerErrors` resource rather than a tool: a vocabulary read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getLedgerCurrencies",
    class: "read",
    gql: "Query.getLedgerCurrencies",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/currencies",
    mcpResource: "ledgerCurrencies",
    mcpExempt:
      "Reachable as the `ledgerCurrencies` resource rather than a tool: a vocabulary read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  gqlOnly(
    "Query.getLedgerSourceFiles",
    "read",
    R.coveredByV1Files,
    M.notAgentShaped,
  ),
  {
    verb: "Query.getLedgerTags",
    class: "read",
    gql: "Query.getLedgerTags",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/tags",
    mcpResource: "ledgerTags",
    mcpExempt:
      "Reachable as the `ledgerTags` resource rather than a tool: a vocabulary read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getLedgerYears",
    class: "read",
    gql: "Query.getLedgerYears",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/years",
    mcpResource: "ledgerYears",
    mcpExempt:
      "Reachable as the `ledgerYears` resource rather than a tool: a vocabulary read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getLedgerLinks",
    class: "read",
    gql: "Query.getLedgerLinks",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/links",
    mcpResource: "ledgerLinks",
    mcpExempt:
      "Reachable as the `ledgerLinks` resource rather than a tool: a vocabulary read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getLedgerNarrations",
    class: "read",
    gql: "Query.getLedgerNarrations",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/narrations",
    mcpResource: "ledgerNarrations",
    mcpExempt:
      "Reachable as the `ledgerNarrations` resource rather than a tool: a vocabulary read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getLedgerPayees",
    class: "read",
    gql: "Query.getLedgerPayees",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/payees",
    mcpResource: "ledgerPayees",
    mcpExempt:
      "Reachable as the `ledgerPayees` resource rather than a tool: a vocabulary read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getLedgerAccountLastEntries",
    class: "read",
    gql: "Query.getLedgerAccountLastEntries",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/account-last-entries",
    mcpResource: "ledgerAccountLastEntries",
    mcpExempt:
      "Reachable as the `ledgerAccountLastEntries` resource rather than a tool: an analysis read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getLedgerEntriesCountPerType",
    class: "read",
    gql: "Query.getLedgerEntriesCountPerType",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/entries-count",
    mcpResource: "ledgerEntriesCount",
    mcpExempt:
      "Reachable as the `ledgerEntriesCount` resource rather than a tool: an analysis read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getLedgerAccountReport",
    class: "read",
    gql: "Query.getLedgerAccountReport",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/account-report",
    mcpResource: "ledgerAccountReport",
    mcpExempt:
      "Reachable as the `ledgerAccountReport` resource rather than a tool: an analysis read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getLedgerIntervalTotals",
    class: "read",
    gql: "Query.getLedgerIntervalTotals",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/interval-totals",
    mcpResource: "ledgerIntervalTotals",
    mcpExempt:
      "Reachable as the `ledgerIntervalTotals` resource rather than a tool: an analysis read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  gqlAndRest(
    "Query.getLedgerJournal",
    "read",
    "GET /api-gateway/v1/ledgers/{owner}/{name}/journal",
    M.coveredByBql,
  ),
  {
    verb: "Query.getLedgerEntryContext",
    class: "read",
    gql: "Query.getLedgerEntryContext",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/entry-context",
    mcpResource: "ledgerEntryContext",
    mcpExempt:
      "Reachable as the `ledgerEntryContext` resource rather than a tool: an analysis read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  gqlOnly(
    "Query.getLedgerPlaintextJournal",
    "read",
    R.coveredByV1Journal,
    M.coveredByBql,
  ),
  gqlOnly(
    "Query.getLedgerAccountJournal",
    "read",
    R.coveredByV1Journal,
    M.coveredByBql,
  ),
  gqlAndRest(
    "Query.getLedgerAccounts",
    "read",
    "GET /api-gateway/v1/ledgers/{owner}/{name}/accounts",
    M.coveredByBql,
  ),
  {
    verb: "Query.getLedgerAccountDirectives",
    class: "read",
    gql: "Query.getLedgerAccountDirectives",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/account-directives",
    mcpResource: "ledgerAccountDirectives",
    mcpExempt:
      "Reachable as the `ledgerAccountDirectives` resource rather than a tool: an analysis read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  gqlOnly(
    "Query.getLedgerAssetDownloadUrl",
    "read",
    R.assetStorage,
    M.notAgentShaped,
  ),
  gqlAndRest(
    "Query.getLedgerArchiveDownloadUrl",
    "read",
    "POST /api-gateway/v1/ledgers/{owner}/{name}/archive-tickets",
    M.notAgentShaped,
  ),
  gqlOnly(
    "Query.getLatestLedgerCommit",
    "read",
    R.notInV1Table,
    M.notAgentShaped,
  ),
  gqlOnly("Query.listCommits", "read", R.notInV1Table, M.notAgentShaped),
  gqlOnly("Query.getCommitDetails", "read", R.notInV1Table, M.notAgentShaped),
  // Legacy resolvers, kept for older mobile builds.
  gqlOnly("Query.ledgerMeta", "read", R.legacy, M.notAgentShaped),
  gqlOnly("Query.accountHierarchy", "read", R.legacy, M.dashboardShaped),
  gqlOnly("Query.homeCharts", "read", R.legacy, M.dashboardShaped),
  gqlOnly("Query.journalEntries", "read", R.legacy, M.coveredByBql),
];

const LEDGER_WRITE_VERBS: readonly VerbEntry[] = [
  gqlOnly("Mutation.starLedger", "write", R.giteaSocial, M.notAgentShaped),
  gqlOnly("Mutation.unstarLedger", "write", R.giteaSocial, M.notAgentShaped),
  gqlAndRest(
    "Mutation.bulkEntries",
    "write",
    "POST /api-gateway/v1/ledgers/{owner}/{name}/entries",
    M.coveredByEditFiles,
  ),
  gqlOnly(
    "Mutation.insertReceiptTransaction",
    "write",
    R.notInV1Table,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Mutation.deleteLedgerEntrySourceSlice",
    "write",
    R.notInV1Table,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Mutation.deleteMultipleLedgerEntrySourceSlices",
    "write",
    R.notInV1Table,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Mutation.updateLedgerEntrySourceSlice",
    "write",
    R.notInV1Table,
    M.notAgentShaped,
  ),
  gqlOnly("Mutation.addEntries", "write", R.legacy, M.notAgentShaped),
  gqlOnly(
    "Mutation.renameLedgerFile",
    "write",
    R.coveredByV1Files,
    M.notAgentShaped,
  ),
];

/**
 * The verbs that reach more than one surface.
 *
 * `ledger.queryShellText` is the worked example of ADR 0006 D1: one service
 * method (`LedgerShellService.queryShellText`) with two adapters, so the
 * GraphQL field and the MCP tool cannot disagree about authorization or data.
 *
 * The file verbs are NOT there yet, and this table should not be read as
 * claiming they are. w1/m19 moved the MCP tools onto `LedgerRepoService`
 * (which authorizes through `authorizeLedger`), but the GraphQL twins still go
 * through `LedgerWorkflow`, which reaches Fava via the client factory on its
 * own. Two implementations of one verb is exactly problem 1 in ADR 0006 — the
 * rows below are honest about the verb being reachable from both surfaces, and
 * this comment is the honest part about it being reachable two different ways.
 * Converging them belongs with the service-layer work, not with classification.
 *
 * What that divergence is no longer allowed to mean is a difference in
 * AUTHORIZATION. It did once: `LedgerWorkflow` never consulted
 * `Identity.ledgerScope`, so a credential pinned to one ledger reached every
 * ledger its user could through the GraphQL twin while the MCP tool refused.
 * `graphql/ledger-pin-middleware.ts` now enforces the pin for the whole
 * surface, from the `ledgerId` argument, whichever implementation sits behind
 * it. Convergence is still owed; the hole it left is closed.
 */
/**
 * API-key management, on all three surfaces (ADR 0006 D6, w1/m22).
 *
 * The operational class remains `admin` for rate limiting. The independent
 * canonical action tells the legacy scope gate to defer the final decision to
 * the PDP without changing the operation's risk budget.
 */
const API_KEY_VERBS: readonly VerbEntry[] = [
  {
    verb: "apikeys.list",
    class: "admin",
    authorizationAction: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_LIST,
    gql: "Query.apiKeys",
    rest: "GET /api-gateway/v1/api-keys",
    mcp: "listApiKeys",
  },
  {
    verb: "apikeys.create",
    class: "admin",
    authorizationAction: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_CREATE,
    gql: "Mutation.createApiKey",
    rest: "POST /api-gateway/v1/api-keys",
    mcp: "createApiKey",
  },
  {
    verb: "apikeys.revoke",
    class: "admin",
    authorizationAction: AUTHORIZATION_ACTIONS.USER_CREDENTIALS_REVOKE,
    gql: "Mutation.revokeApiKey",
    rest: "DELETE /api-gateway/v1/api-keys/{id}",
    mcp: "revokeApiKey",
  },
];

const CROSS_SURFACE_VERBS: readonly VerbEntry[] = [
  {
    verb: "ledger.queryShellText",
    class: "read",
    gql: "Query.queryShellText",
    mcp: "runBqlQuery",
    // Read-classed despite being a POST. The class comes from this table, not
    // from the method, and it has to: an op absent from the table defaults to
    // `write`, so a BQL query — which changes nothing — would demand
    // `ledger.write` on the strength of its verb alone. The body is a POST
    // because a BQL statement does not belong in a URL, not because it writes.
    rest: "POST /api-gateway/v1/ledgers/{owner}/{name}/query",
  },
  {
    verb: "ledger.queryShell",
    class: "read",
    gql: "Query.queryShell",
    // Same endpoint as `queryShellText`, chosen by `Accept`: JSON returns the
    // typed table, `text/plain` the shell's own rendering. One route, one
    // service call, two representations — so both verbs point at it.
    rest: "POST /api-gateway/v1/ledgers/{owner}/{name}/query",
    mcpExempt: M.coveredByBql,
  },
  {
    verb: "ledger.listDirContent",
    class: "read",
    gql: "Query.getLedgerDirContent",
    mcp: "listLedgerFiles",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/files",
  },
  {
    verb: "ledger.readFiles",
    class: "read",
    gql: "Query.getLedgerFile",
    mcp: "readLedgerFiles",
    mcpResource: "ledgerFile",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/files/{*path}",
  },
  // One MCP tool, three GraphQL mutations: `editLedgerFiles` takes create /
  // update / delete as an operation argument, while GraphQL spells each out as
  // its own field. The verb row is anchored on the create field and the other
  // two carry their own rows pointing back at the same tool.
  {
    verb: "ledger.editFiles.create",
    class: "write",
    gql: "Mutation.createLedgerFile",
    mcp: "editLedgerFiles",
    rest: "PUT /api-gateway/v1/ledgers/{owner}/{name}/files/{*path}",
  },
  {
    verb: "ledger.editFiles.update",
    class: "write",
    gql: "Mutation.updateLedgerFile",
    mcp: "editLedgerFiles",
    rest: "PUT /api-gateway/v1/ledgers/{owner}/{name}/files/{*path}",
  },
  {
    verb: "ledger.editFiles.delete",
    class: "write",
    gql: "Mutation.deleteLedgerFile",
    mcp: "editLedgerFiles",
    rest: "DELETE /api-gateway/v1/ledgers/{owner}/{name}/files/{*path}",
  },
  {
    verb: "ledger.downloadArchive",
    class: "read",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/archive/{archive}",
    gqlExempt: G.bytesNotFields,
    mcpExempt: M.notAgentShaped,
  },
  {
    // The pre-v1 spelling, superseded and marked deprecated in the spec. Kept
    // classified while it is still mounted: a route nobody classifies is a
    // route the coverage test has to be told to ignore, which is worse.
    verb: "ledger.downloadArchive.legacy",
    class: "read",
    rest: "GET /api-gateway/ledgers/{ledgerId}/archive/{archive}",
    gqlExempt: G.bytesNotFields,
    mcpExempt: M.notAgentShaped,
  },
];

const GITEA_SOCIAL_VERBS: readonly VerbEntry[] = [
  gqlOnly("Query.getFeed", "session-only", R.giteaSocial, M.notAgentShaped),
  gqlOnly(
    "Query.getUserProfile",
    "session-only",
    R.giteaSocial,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Query.getUserFollowers",
    "session-only",
    R.giteaSocial,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Query.getUserFollowing",
    "session-only",
    R.giteaSocial,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Query.getUserStarredRepos",
    "session-only",
    R.giteaSocial,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Mutation.followUser",
    "session-only",
    R.giteaSocial,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Mutation.unfollowUser",
    "session-only",
    R.giteaSocial,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Query.getPullRequestDetails",
    "read",
    R.pullRequest,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Mutation.createPullRequestFromPatch",
    "write",
    R.pullRequest,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Mutation.approvePullRequest",
    "write",
    R.pullRequest,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Mutation.rejectPullRequest",
    "write",
    R.pullRequest,
    M.notAgentShaped,
  ),
];

const LLM_VERBS: readonly VerbEntry[] = [
  gqlOnly(
    "Query.suggestTransactionCategories",
    "read",
    R.llm,
    M.notAgentShaped,
  ),
  // Mutations by TypeGraphQL, and left at `write` deliberately: they spend the
  // account's LLM budget, which a read-scoped credential has no business doing
  // even though no ledger bytes change.
  gqlOnly("Mutation.parseFile", "write", R.llm, M.notAgentShaped),
  gqlOnly("Mutation.parseReceipt", "write", R.llm, M.notAgentShaped),
  gqlOnly("Query.aiCfoUsage", "read", R.llm, M.notAgentShaped),
];

const ASSET_VERBS: readonly VerbEntry[] = [
  gqlOnly(
    "Query.generateTempAssetDownloadUrl",
    "read",
    R.assetStorage,
    M.notAgentShaped,
  ),
  gqlOnly(
    "Mutation.generateTempAssetUploadUrl",
    "write",
    R.assetStorage,
    M.notAgentShaped,
  ),
];

/**
 * Plaid. The binding itself is `admin` — it attaches a bank credential to a
 * ledger — and so are the reads of it, which echo institution and item status.
 * The transaction verbs on the other side of the binding are ordinary
 * read/write ledger data.
 */
const PLAID_VERBS: readonly VerbEntry[] = [
  {
    verb: "Query.getPlaidItems",
    class: "admin",
    gql: "Query.getPlaidItems",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/banks",
    mcpResource: "bankList",
    mcpExempt:
      "Reachable as the `bankList` resource rather than a tool: a bank read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getPlaidItem",
    class: "admin",
    gql: "Query.getPlaidItem",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/banks/{itemId}",
    mcpResource: "bank",
    mcpExempt:
      "Reachable as the `bank` resource rather than a tool: a bank read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getPlaidAccounts",
    class: "admin",
    gql: "Query.getPlaidAccounts",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/banks/{itemId}/accounts",
    mcpResource: "bankAccountsForItem",
    mcpExempt:
      "Reachable as the `bankAccountsForItem` resource rather than a tool: a bank read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.getPlaidAccountsForLedger",
    class: "admin",
    gql: "Query.getPlaidAccountsForLedger",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/bank-accounts",
    mcpResource: "bankAccounts",
    mcpExempt:
      "Reachable as the `bankAccounts` resource rather than a tool: a bank read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  gqlOnly(
    "Mutation.createPlaidLinkToken",
    "admin",
    R.plaidBinding,
    M.plaidBinding,
  ),
  gqlOnly(
    "Mutation.createPlaidUpdateModeLinkToken",
    "admin",
    R.plaidBinding,
    M.plaidBinding,
  ),
  gqlOnly(
    "Mutation.exchangePlaidPublicToken",
    "admin",
    R.plaidBinding,
    M.plaidBinding,
  ),
  {
    verb: "Mutation.unlinkPlaidItem",
    class: "admin",
    gql: "Mutation.unlinkPlaidItem",
    rest: "DELETE /api-gateway/v1/ledgers/{owner}/{name}/banks/{itemId}",
    mcp: "manageBankConnection",
  },
  {
    verb: "Mutation.reconcilePlaidAccounts",
    class: "admin",
    gql: "Mutation.reconcilePlaidAccounts",
    rest: "POST /api-gateway/v1/ledgers/{owner}/{name}/banks/{itemId}/reconcile",
    mcp: "manageBankConnection",
  },
  {
    verb: "Mutation.updatePlaidAccountMapping",
    class: "admin",
    gql: "Mutation.updatePlaidAccountMapping",
    rest: "PUT /api-gateway/v1/ledgers/{owner}/{name}/bank-accounts/{accountId}/mapping",
    mcp: "manageBankConnection",
  },
  {
    verb: "Mutation.updatePlaidAccountCurrency",
    class: "admin",
    gql: "Mutation.updatePlaidAccountCurrency",
    rest: "PUT /api-gateway/v1/ledgers/{owner}/{name}/bank-accounts/{accountId}/currency",
    mcp: "manageBankConnection",
  },
  {
    verb: "Mutation.refreshPlaidItemStatus",
    class: "admin",
    gql: "Mutation.refreshPlaidItemStatus",
    rest: "POST /api-gateway/v1/ledgers/{owner}/{name}/banks/{itemId}/refresh",
    mcp: "manageBankConnection",
  },
  {
    verb: "Query.getUnsyncedPlaidTransactions",
    class: "read",
    gql: "Query.getUnsyncedPlaidTransactions",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/bank-transactions/unsynced",
    mcpResource: "bankUnsyncedTransactions",
    mcpExempt:
      "Reachable as the `bankUnsyncedTransactions` resource rather than a tool: a bank read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.suggestPlaidTransactionCategories",
    class: "read",
    gql: "Query.suggestPlaidTransactionCategories",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/bank-transactions/suggested-categories",
    mcpResource: "bankSuggestedCategories",
    mcpExempt:
      "Reachable as the `bankSuggestedCategories` resource rather than a tool: a bank read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Query.suggestPlaidAccountMapping",
    class: "read",
    gql: "Query.suggestPlaidAccountMapping",
    rest: "GET /api-gateway/v1/ledgers/{owner}/{name}/banks/{itemId}/suggested-mapping",
    mcpResource: "bankSuggestedMapping",
    mcpExempt:
      "Reachable as the `bankSuggestedMapping` resource rather than a tool: a bank read is context a client fetches, not an action a model decides to take (ADR 0008 D2).",
  },
  {
    verb: "Mutation.syncPlaidTransactions",
    class: "write",
    gql: "Mutation.syncPlaidTransactions",
    rest: "POST /api-gateway/v1/ledgers/{owner}/{name}/banks/{itemId}/sync",
    mcp: "manageBankImport",
  },
  {
    verb: "Mutation.submitPlaidTransactionsToLedger",
    class: "write",
    gql: "Mutation.submitPlaidTransactionsToLedger",
    rest: "POST /api-gateway/v1/ledgers/{owner}/{name}/bank-transactions/submit",
    mcp: "manageBankImport",
  },
  {
    verb: "Mutation.deletePlaidTransactions",
    class: "write",
    gql: "Mutation.deletePlaidTransactions",
    rest: "DELETE /api-gateway/v1/ledgers/{owner}/{name}/bank-transactions",
    mcp: "manageBankImport",
  },
];

/**
 * The AI routes. All `write`: each one hands an agent a tool belt that includes
 * `editLedgerFiles`, so the class has to describe what the agent may end up
 * doing, not what the HTTP request looks like.
 */
const AI_ROUTE_VERBS: readonly VerbEntry[] = [
  {
    verb: "ai.agent",
    class: "write",
    rest: "POST /api-gateway/agent",
    gqlExempt: G.streamingOnly,
    mcpExempt: M.transportOnly,
  },
  {
    verb: "ai.askAgent",
    class: "write",
    rest: "POST /api-gateway/ask-agent",
    gqlExempt: G.streamingOnly,
    mcpExempt: M.transportOnly,
  },
  {
    verb: "ai.openaiChatCompletions",
    class: "write",
    rest: "POST /api-gateway/ai/openai/chat/completions",
    gqlExempt: G.wireCompat,
    mcpExempt: M.transportOnly,
  },
  {
    verb: "ai.anthropicMessages",
    class: "write",
    rest: "POST /api-gateway/ai/anthropic/v1/messages",
    gqlExempt: G.wireCompat,
    mcpExempt: M.transportOnly,
  },
];

/** The whole matrix, in one list. */
export const VERB_TABLE: readonly VerbEntry[] = [
  ...API_KEY_VERBS,
  ...ACCOUNT_VERBS,
  ...AUTH_VERBS,
  ...BILLING_VERBS,
  ...PROBE_VERBS,
  ...LEDGER_ADMIN_VERBS,
  ...LEDGER_READ_VERBS,
  ...LEDGER_WRITE_VERBS,
  ...CROSS_SURFACE_VERBS,
  ...GITEA_SOCIAL_VERBS,
  ...LLM_VERBS,
  ...ASSET_VERBS,
  ...PLAID_VERBS,
  ...AI_ROUTE_VERBS,
];

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

function buildOpIndex(): ReadonlyMap<string, VerbEntry> {
  const index = new Map<string, VerbEntry>();
  const claim = (opId: string, entry: VerbEntry) => {
    const existing = index.get(opId);
    // One op id, one class and one canonical action. `editLedgerFiles`
    // legitimately appears on three rows; disagreement would make enforcement
    // depend on table order, so it is a startup error rather than a coin toss.
    if (
      existing &&
      (existing.class !== entry.class ||
        existing.authorizationAction !== entry.authorizationAction)
    ) {
      throw new Error(
        `op-class: ${opId} has conflicting entries (${existing.verb}, ${entry.verb})`,
      );
    }
    index.set(opId, entry);
  };
  for (const entry of VERB_TABLE) {
    if (entry.gql) claim(gqlOpId(entry.gql), entry);
    if (entry.rest) claim(restOpId(...splitRest(entry.rest)), entry);
    if (entry.mcp) claim(mcpOpId(entry.mcp), entry);
    if (entry.mcpResource) claim(mcpResourceOpId(entry.mcpResource), entry);
  }
  return index;
}

function splitRest(rest: string): [string, string] {
  const at = rest.indexOf(" ");
  if (at < 0) {
    throw new Error(`op-class: malformed rest entry "${rest}"`);
  }
  return [rest.slice(0, at), rest.slice(at + 1)];
}

const OP_INDEX = buildOpIndex();

/** Every op id the table classifies, for the coverage test's reverse check. */
export const classifiedOpIds = (): readonly string[] => [...OP_INDEX.keys()];

/** Canonical action for a GraphQL/REST/MCP alias, when it is PDP-routed. */
export const authorizationActionForOp = (
  opId: string,
): AuthorizationAction | undefined => OP_INDEX.get(opId)?.authorizationAction;

export interface OpClassification {
  readonly class: OpClass;
  /** False when the op is absent from the table and defaulted to `write`. */
  readonly found: boolean;
  readonly verb?: string;
  readonly authorizationAction?: AuthorizationAction;
}

/**
 * Classify an op id, defaulting an unknown one to `write` (ADR 0006 D3).
 *
 * The default is not a mechanical GET/Query heuristic applied at runtime: the
 * heuristic's job was to seed the table, and once seeded, guessing again at
 * request time would only make a forgotten entry look handled. An unclassified
 * op is a bug, so it gets the strictest ordinary class and a warning, and the
 * coverage test turns it red long before it reaches production.
 */
export function classifyOp(opId: string): OpClassification {
  const entry = OP_INDEX.get(opId);
  if (!entry) {
    return { class: "write", found: false };
  }
  return {
    class: entry.class,
    found: true,
    verb: entry.verb,
    ...(entry.authorizationAction && {
      authorizationAction: entry.authorizationAction,
    }),
  };
}

// ---------------------------------------------------------------------------
// Enforcement
// ---------------------------------------------------------------------------

export interface ScopeDecision {
  readonly opId: string;
  readonly opClass: OpClass;
  /** False when the op was defaulted rather than looked up. */
  readonly classified: boolean;
  /** Present when the centralized PDP, not this legacy gate, decides access. */
  readonly authorizationAction?: AuthorizationAction;
  /** The scope that would satisfy this op, or null when none can. */
  readonly requiredScope: ApiScope | null;
  readonly allowed: boolean;
  /** Human-readable refusal, present only when `allowed` is false. */
  readonly denyReason?: string;
}

/**
 * Decide, without acting. Separated from {@link requireScopeClass} so shadow
 * mode, the surfaces' differing refusal dialects, and the tests all read the
 * same decision rather than three lookalikes.
 *
 * An absent identity is allowed through: authentication is a separate question
 * from authorization, and the route or resolver behind this gate is the thing
 * that knows whether it needs a caller at all. Denying here would turn every
 * public route into a 403.
 */
export function evaluateScope(
  identity: Identity | undefined,
  opId: string,
): ScopeDecision {
  const { class: opClass, found, authorizationAction } = classifyOp(opId);
  const requiredScope = SCOPE_FOR_CLASS[opClass];
  const base = {
    opId,
    opClass,
    classified: found,
    requiredScope,
    ...(authorizationAction && { authorizationAction }),
  };

  if (!identity) {
    return { ...base, allowed: true };
  }
  // A legacy session or the exact first-party Dashboard OAuth client means the
  // person is driving the product directly. Other issuer-signed OAuth clients
  // remain delegated credentials even when they carry every ledger scope.
  if (isFirstPartyInteractiveIdentity(identity)) {
    return { ...base, allowed: true };
  }
  if (opClass === "public") {
    return { ...base, allowed: true };
  }
  if (authorizationAction) {
    return { ...base, allowed: true };
  }
  if (requiredScope === null) {
    return {
      ...base,
      allowed: false,
      denyReason:
        "This operation is not part of the API scope vocabulary and is reachable only from a browser session",
    };
  }
  if (!hasRequiredScope(identity.scopes, requiredScope)) {
    return {
      ...base,
      allowed: false,
      denyReason: `This operation requires the "${requiredScope}" scope`,
    };
  }
  return { ...base, allowed: true };
}

/**
 * Apply the matrix, throwing {@link ForbiddenError} on refusal.
 *
 * In `shadow` mode the refusal is logged and the request proceeds, so coverage
 * can be measured against real traffic before anyone is actually turned away.
 * Each surface catches the throw and dresses it in its own dialect: a GraphQL
 * error, a REST 403 `{ ok: false }`, an MCP `isError` result.
 */
export function requireScopeClass(
  identity: Identity | undefined,
  opId: string,
  mode: ScopeEnforcementMode,
): ScopeDecision {
  const decision = evaluateScope(identity, opId);

  if (!decision.classified && identity && !identity.capabilityExempt) {
    scopeLogger.warn("Unclassified op treated as write", {
      opId: decision.opId,
      userId: identity.userId,
    });
  }

  if (decision.allowed) {
    audit(identity, decision, "allowed");
    return decision;
  }

  if (mode === "shadow") {
    scopeLogger.info("Scope check would deny", {
      opId: decision.opId,
      class: decision.opClass,
      requiredScope: decision.requiredScope,
      classified: decision.classified,
      wouldDeny: true,
    });
    audit(identity, decision, "shadow-denied");
    return { ...decision, allowed: true };
  }

  scopeLogger.info("Scope check denied", {
    opId: decision.opId,
    class: decision.opClass,
    requiredScope: decision.requiredScope,
    classified: decision.classified,
  });
  audit(identity, decision, "denied");
  throw new ForbiddenError(
    `${decision.denyReason} (${decision.opId})`,
    decision.opId,
  );
}

/**
 * The audit hook on the scope seam (w1/m22 t005).
 *
 * Placed here rather than in each surface's middleware for the same reason the
 * gate itself is: this is the one place all three surfaces converge, so
 * coverage does not depend on anybody remembering. The caller's identity is
 * projected through `auditSubject`, which is the only way user fields reach an
 * event — and the event type has no field an argument value could occupy.
 */
function audit(
  identity: Identity | undefined,
  decision: ScopeDecision,
  outcome: AuditOutcome,
): void {
  // PDP-routed operations emit after the final relationship decision, with
  // their exact transport op id; this table provides the action mapping.
  if (decision.authorizationAction) return;
  if (!shouldAudit(outcome, decision.opClass)) return;
  emitAuditEvent({
    op: decision.opId,
    ...auditSubject(identity),
    ledgerId: identity?.ledgerScope,
    outcome,
    at: new Date(),
  });
}
