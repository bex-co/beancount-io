import { readAiCfoUsage } from "@/features/feature-usage/api/ai-cfo-usage-route";
import { suggestCategoriesQuery } from "@/features/llm/api/suggest-categories-route";
import { tempAssetDownloadQuery } from "@/features/s3/api/temp-asset-routes";
import { bankAccountQuery } from "@/features/ledger/api/rest/v1/banks-handler";
import { publicProfileQuery } from "@/features/gitea/user-profile/api/public-profile-route";
import {
  SOCIAL_READS,
  socialListQuery,
} from "@/features/gitea/user-profile/api/social-read-routes";
import { userProfileQuery } from "@/features/auth/api/account-routes";
import { featureFlagsQuery } from "@/features/healthz/api/configuration-routes";
import {
  readHealth,
  readFeatureFlags,
} from "@/features/healthz/utils/public-configuration";
import { assetUrlQuery } from "@/features/ledger/api/rest/v1/asset-url-handler";
import { pullRequestNumberQuery } from "@/features/gitea/pull-request/api/pull-request-routes";
import {
  publicKeyListQuery,
  publicKeyIdQuery,
} from "@/features/ledger/api/rest/v1/public-keys-handler";
import {
  collaboratorListQuery,
  collaboratorPermissionQuery,
} from "@/features/ledger/api/rest/v1/collaborators-handler";
import { COMMIT_READS } from "@/features/gitea/commits/api/commit-reads";
import { JOURNAL_READS } from "@/features/ledger/api/rest/v1/journal-reads";
import {
  fetchStatement,
  statementReadQuery,
  accountsQuerySchema,
} from "@/features/ledger/api/rest/v1/reports-handler";
import { CATALOG_READS } from "@/features/ledger/api/rest/v1/catalog-reads";
import {
  queryTemplate,
  type QueryResourceTemplate,
} from "./mcp-resource-template";
import {
  ResourceTemplate,
  type ListResourcesCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { type McpRequestContext, resolveMcpLedger } from "./mcp-context";
import { parseLedgerId } from "@/shared/str";
import { VOCABULARY_READS } from "@/features/ledger/api/rest/v1/vocabulary-handler";
import { ANALYSIS_READS } from "@/features/ledger/api/rest/v1/analysis-handler";
import { NotFoundError } from "@/shared/errors";

/**
 * The MCP surface's resource fragment (ADR 0008 D2).
 *
 * Resources exist here for one reason: a tool competes for the model's
 * selection attention and a resource does not. 50 in-scope reads cannot become
 * 50 tools without measurably degrading which tool an agent picks — and they do
 * not have to, because a read is something a client *fetches*, not something a
 * model *decides to do*. That is the line MCP itself draws between the two
 * primitives, and it is the line this fragment follows: reads here, actions in
 * `mcp-tools.ts`.
 *
 * Twenty-one templates: the ledger's vocabulary (w3/m6), its analysis reads
 * (w3/m7), and file contents — the one w3/m5 proved the shape with. The
 * bank-import family follows in w3/m8.
 */

/**
 * `beancount://` rather than `https://`.
 *
 * The spec reserves `https://` for resources a client can fetch on its own,
 * directly from the web. These cannot be: reaching one requires the caller's
 * credential, the per-call ledger authorization below, and this server in the
 * path. Advertising them as `https://` would invite a client to try fetching
 * them itself and get a 401 from somewhere it did not expect.
 */
export const RESOURCE_SCHEME = "beancount";

/** One MCP resource template, described rather than registered — mirrors `McpToolDescriptor`. */
export interface McpResourceDescriptor {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly mimeType: string;
  /** RFC 6570 template. `{owner}/{name}` addresses the ledger, as everywhere else. */
  readonly uriTemplate: string;
  readonly queryNames?: readonly string[];
  /**
   * Static per-ledger path emitted into `resources/list` (w2/m27:t004), e.g.
   * `"errors"` for `beancount://{owner}/{name}/errors`. Only for templates
   * with no other required variable: a concrete URI cannot fill `{itemId}`.
   */
  readonly listSegment?: string;
  /**
   * The file template sets this instead: one concrete URI per source file of
   * the credential's ledger, capped (t004).
   */
  readonly listPerSourceFile?: boolean;
  readonly read: (
    toolCtx: McpRequestContext,
    variables: Record<string, string | string[]>,
  ) => Promise<
    string | { blob: string; mimeType: string; _meta?: Record<string, string> }
  >;
}

async function readArchive(
  context: McpRequestContext,
  ledgerId: string,
  archive: string,
) {
  const response = await context.ledgerArchiveService.download({
    identity: context.identity,
    ledgerId,
    archive,
  });
  const disposition = response.headers.get("content-disposition");
  return {
    blob: (await response.buffer()).toString("base64"),
    mimeType:
      response.headers.get("content-type") ?? "application/octet-stream",
    ...(disposition && {
      _meta: { "beancount/contentDisposition": disposition },
    }),
  };
}

/**
 * The ledger id a read applies to.
 *
 * The template carries `{owner}/{name}` even though a pinned credential already
 * names one ledger, because ADR 0007 D11 lets a credential reach several and a
 * URI that omitted the ledger could not say which. A pin still wins: naming a
 * different ledger is refused here rather than passed through to be authorized,
 * so a pinned credential cannot be widened by a URI.
 */
function resolveLedgerId(
  toolCtx: McpRequestContext,
  variables: Record<string, string | string[]>,
): string {
  const owner = String(variables.owner ?? "");
  const name = String(variables.name ?? "");
  const requested = owner && name ? `${owner}/${name}` : "";
  return resolveMcpLedger(toolCtx, requested || undefined);
}

/**
 * The ledger-vocabulary reads, as templates.
 *
 * Built from the *same* `VOCABULARY_READS` list the v1 REST routes are built
 * from, so the two surfaces cannot answer differently: there is one list, one
 * service call per entry, and two adapters. Writing the ten out again here
 * would be ten chances for the surfaces to drift, and the drift would be
 * invisible because each side has its own tests (ADR 0008 D5).
 */
/**
 * The vocabulary reads enumerated in `resources/list` (w2/m27:t004): the ones
 * every audit agent looked for first. The rest stay template-only — a concrete
 * URI for each of ten vocabularies on every ledger would be listing noise.
 */
const LISTED_VOCABULARY: ReadonlySet<string> = new Set(["errors", "payees"]);

const vocabularyResources: readonly McpResourceDescriptor[] =
  VOCABULARY_READS.map((read) => ({
    name: `ledger${read.segment[0].toUpperCase()}${read.segment.slice(1)}`,
    title: read.summary,
    description: read.description,
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/${read.segment}`,
    ...(LISTED_VOCABULARY.has(read.segment)
      ? { listSegment: read.segment }
      : {}),
    read: async (toolCtx, variables) => {
      const ledgerId = resolveLedgerId(toolCtx, variables);
      // The same service instance the REST route calls — `read.fetch` takes the
      // service rather than a surface's wrapper around it, so neither side has
      // to fake the other's shape.
      const result = await read.fetch(toolCtx.services.ledgerData, {
        ledgerId,
        identity: toolCtx.identity,
      });
      return JSON.stringify(result);
    },
  }));

/**
 * The analysis reads, as templates (w3/m7).
 *
 * Same construction as the vocabulary ones and the same reason: one
 * `ANALYSIS_READS` list, two adapters.
 *
 * Required parameters retain their existing path spelling. Optional arguments
 * are advertised as RFC 6570 query expansions and matched by the MCP adapter.
 * The same Zod query schema validates REST and MCP inputs before domain work.
 */
const analysisResources: readonly McpResourceDescriptor[] = ANALYSIS_READS.map(
  (read) => ({
    name: `ledger${read.segment
      .split("-")
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join("")}`,
    title: read.summary,
    description: read.description,
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/${read.segment}${read.uriPath}`,
    queryNames: Object.keys(read.query.shape).filter(
      (name) => !read.uriPath.includes(`{${name}}`),
    ),
    read: async (toolCtx, variables) => {
      const ledgerId = resolveLedgerId(toolCtx, variables);
      // The path variable arrives here alongside `owner`/`name`, and the
      // services read it from `query` — so a path parameter and its REST
      // query-string twin land in the same place. RFC 6570 hands a variable
      // back as a string or a list; a repeated one collapses to its first
      // value rather than reaching the service as an array it would mishandle.
      const query = read.query.parse(
        Object.fromEntries(
          Object.entries(variables)
            .filter(([key]) => key !== "owner" && key !== "name")
            .map(([key, value]) => [
              key,
              Array.isArray(value) ? value[0] : value,
            ]),
        ),
      ) as Record<string, string | undefined>;
      // The same service objects the REST route passes: `fetch` takes the
      // services it uses, not a surface's wrapper around them.
      const result = await read.fetch(toolCtx.services, {
        ledgerId,
        identity: toolCtx.identity,
        query,
      });
      return JSON.stringify(result);
    },
  }),
);

/**
 * The bank reads, as templates (w3/m8).
 *
 * Hand-written rather than derived from a shared list, because unlike the
 * ledger families these do not share one service signature — some take an item
 * id, some an account filter, and two reach a different service. A list built
 * to paper over that would hide the difference rather than remove it.
 */
const bankResources: readonly McpResourceDescriptor[] = [
  {
    name: "bankList",
    title: "Linked Banks",
    description: "Every bank connection linked to this ledger.",
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/banks`,
    read: async (ctx, vars) =>
      JSON.stringify(
        await ctx.services.plaidItem.getItems(
          ctx.identity,
          resolveLedgerId(ctx, vars),
        ),
      ),
  },
  {
    name: "bank",
    title: "One Linked Bank",
    description: "Status and institution details for a single bank connection.",
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/banks/{itemId}`,
    read: async (ctx, vars) => {
      resolveLedgerId(ctx, vars);
      return JSON.stringify(
        await ctx.services.plaidItem.getItem(
          ctx.identity,
          String(vars.itemId ?? ""),
        ),
      );
    },
  },
  {
    name: "bankAccountsForItem",
    title: "A Bank's Accounts",
    description: "The accounts one bank connection shares.",
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/banks/{itemId}/accounts`,
    read: async (ctx, vars) =>
      JSON.stringify(
        await ctx.services.plaidItem.getAccounts(
          ctx.identity,
          String(vars.itemId ?? ""),
          resolveLedgerId(ctx, vars),
        ),
      ),
  },
  {
    name: "bankAccounts",
    title: "All Bank Accounts",
    description:
      "Accounts across every linked bank, with their institution and ledger-account mapping.",
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/bank-accounts`,
    read: async (ctx, vars) =>
      JSON.stringify(
        await ctx.services.plaidItem.getAccountsForLedger(
          ctx.identity,
          resolveLedgerId(ctx, vars),
        ),
      ),
  },
  {
    name: "bankUnsyncedTransactions",
    title: "Transactions Not Yet In The Ledger",
    description:
      "Transactions pulled from a bank that have not been written into the ledger — what `manageBankImport` submits.",
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/bank-transactions/unsynced`,
    queryNames: Object.keys(bankAccountQuery.shape),
    read: async (ctx, vars) =>
      JSON.stringify(
        await ctx.services.plaidItem.getUnsyncedTransactions(
          ctx.identity,
          bankAccountQuery.parse(vars).accountId,
          resolveLedgerId(ctx, vars),
        ),
      ),
  },
  {
    name: "bankSuggestedCategories",
    title: "Suggested Categories For Unsynced Transactions",
    description:
      "A ledger account suggested for each staged transaction, drawn from the ledger's own history. Requires ledger-content read, bank-connection read, and AI-use authority.",
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/bank-transactions/suggested-categories`,
    queryNames: Object.keys(bankAccountQuery.shape),
    read: async (ctx, vars) =>
      JSON.stringify(
        await ctx.services.plaidItem.suggestCategories(
          ctx.identity,
          resolveLedgerId(ctx, vars),
          bankAccountQuery.parse(vars).accountId,
        ),
      ),
  },
  {
    name: "bankSuggestedMapping",
    title: "Suggested Ledger Account Per Bank Account",
    description:
      "Which ledger account each of a bank's accounts most likely corresponds to. Requires ledger-content read, bank-connection read, and AI-use authority.",
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/banks/{itemId}/suggested-mapping`,
    read: async (ctx, vars) =>
      JSON.stringify(
        await ctx.services.plaidItem.suggestAccountMapping(
          ctx.identity,
          resolveLedgerId(ctx, vars),
          String(vars.itemId ?? ""),
        ),
      ),
  },
];

/** The resource fragment: every template this feature contributes to the registry. */
export const MCP_RESOURCES: readonly McpResourceDescriptor[] = [
  {
    name: "aiCfoUsage",
    title: "AI CFO Usage",
    description:
      "Current account's billing-month token usage and plan limit. No user or ledger selector; read capability is required.",
    uriTemplate: "beancount://account/ai-cfo-usage",
    mimeType: "application/json",
    read: async (context) =>
      JSON.stringify(
        await readAiCfoUsage(context.aiCfoUsage, context.identity),
      ),
  },
  {
    name: "transactionCategorySuggestions",
    title: "Transaction Category Suggestions",
    description:
      "Suggest a target account for each supplied transaction using the ledger's open accounts and recent history. transactions is a JSON-encoded array of {rowIndex, date, payee, description, amount}. Requires assisted-categorization authority and consumes AI quota.",
    uriTemplate: "beancount://{owner}/{name}/import/suggest-categories",
    queryNames: Object.keys(suggestCategoriesQuery.shape),
    mimeType: "application/json",
    read: async (context, { owner, name, ...query }) =>
      JSON.stringify(
        await context.llmService.suggestCategories(
          context.identity,
          resolveLedgerId(context, { owner, name }),
          suggestCategoriesQuery.parse(query).transactions,
        ),
      ),
  },
  {
    name: "tempAssetDownloadUrl",
    title: "Temporary Asset Download URL",
    description:
      "Presign a download for an objectKey owned by the current user. Returns downloadUrl and expiresIn in seconds. Foreign, malformed, and permanent object keys are refused.",
    uriTemplate: "beancount://temp-assets/download-url",
    queryNames: Object.keys(tempAssetDownloadQuery.shape),
    mimeType: "application/json",
    read: async (context, variables) =>
      JSON.stringify(
        await context.assetStorage.generateTempDownloadUrl(
          context.identity,
          tempAssetDownloadQuery.parse(variables).objectKey,
        ),
      ),
  },
  {
    name: "publicUserProfile",
    title: "Public user profile",
    description:
      "Profile, activities, and repositories for username. Authenticated self-views retain existing private enrichment; other targets use the public view.",
    uriTemplate: "beancount://social/profile",
    queryNames: Object.keys(publicProfileQuery.shape),
    mimeType: "application/json",
    read: async (context, variables) => {
      const { username } = publicProfileQuery.parse(variables);
      return JSON.stringify(
        await context.socialService.getUserProfile(
          username,
          context.identity.userId,
        ),
      );
    },
  },
  ...SOCIAL_READS.map((read): McpResourceDescriptor => ({
    name: read.name,
    title: read.path,
    description:
      "Public social discovery. page defaults to 1 and limit to 20; total is the page size. Upstream failure returns an empty page.",
    uriTemplate: `beancount://social/${read.path}`,
    queryNames: Object.keys(socialListQuery.shape),
    mimeType: "application/json",
    read: async (context, variables) => {
      const { username, page, limit } = socialListQuery.parse(variables);
      return JSON.stringify(
        await context.socialService[read.method](username, page, limit),
      );
    },
  })),
  {
    name: "userProfile",
    title: "Your profile",
    description:
      "Read your account profile and limits. An explicit userId must be your own user ID.",
    uriTemplate: "beancount://account/profile",
    queryNames: Object.keys(userProfileQuery.shape),
    mimeType: "application/json",
    read: async (context, variables) => {
      const { userId } = userProfileQuery.parse(variables);
      return JSON.stringify(
        await context.accountService.getUserProfile(
          context.identity,
          userId ?? context.identity.userId,
        ),
      );
    },
  },
  {
    name: "allTierQuotas",
    title: "Subscription tier quotas",
    description:
      "Public product limits for every tier; -1 means unlimited. No user billing information.",
    uriTemplate: "beancount://configuration/tier-quotas",
    mimeType: "application/json",
    read: async (context) =>
      JSON.stringify(await context.subscriptionService.allTierQuotas()),
  },
  {
    name: "health",
    title: "Application health",
    description:
      "Public application health probe; not a dependency readiness check.",
    uriTemplate: "beancount://configuration/health",
    mimeType: "application/json",
    read: async () => JSON.stringify(await readHealth()),
  },
  {
    name: "featureFlags",
    title: "Feature flags",
    description:
      "Public static feature configuration. The legacy userId does not affect the result.",
    uriTemplate: "beancount://configuration/feature-flags",
    queryNames: Object.keys(featureFlagsQuery.shape),
    mimeType: "application/json",
    read: async (_ctx, variables) => {
      featureFlagsQuery.parse(variables);
      return JSON.stringify(await readFeatureFlags());
    },
  },
  {
    name: "ledgerArchive",
    title: "Ledger Archive",
    description:
      "Download archive bytes as an MCP base64 blob. The archive name selects the same ZIP or tar/gzip variant as REST. Every call rechecks ledger read authority and spends the shared archive-download budget.",
    mimeType: "application/octet-stream",
    uriTemplate: "beancount://{owner}/{name}/archive/{archive}",
    read: async (context, variables) =>
      readArchive(
        context,
        resolveLedgerId(context, variables),
        String(variables.archive),
      ),
  },
  {
    name: "ledgerAssetDownloadUrl",
    title: "Ledger Asset Download URL",
    description:
      "Issue a presigned asset URL after resolving ledgerRepoId and checking current file-read authority. filename is relative to the repository's asset directory. The service enforces any credential ledger pin.",
    mimeType: "application/json",
    uriTemplate: "beancount://assets/download-url",
    queryNames: Object.keys(assetUrlQuery.shape),
    read: async (context, query) => {
      const args = assetUrlQuery.parse(query);
      return JSON.stringify({
        downloadUrl: await context.ledgerAssetService.getAssetDownloadUrl(
          args.ledgerRepoId,
          args.filename,
          context.identity,
        ),
      });
    },
  },
  {
    name: "ledgerArchiveDownloadUrl",
    title: "Ledger Archive Download URL",
    description:
      "Get the authenticated HTTP URL for main.zip. Fetch it with the same session cookie, OAuth bearer token, or API key; no credential is embedded in the URL. This resource discovers a URL and does not deliver archive bytes.",
    mimeType: "application/json",
    uriTemplate: "beancount://{owner}/{name}/archive-download-url",
    read: async (context, variables) =>
      JSON.stringify({
        downloadUrl:
          await context.ledgerAssetService.getLedgerArchiveDownloadUrl(
            resolveLedgerId(context, variables),
            context.identity,
          ),
      }),
  },
  {
    name: "pullRequestDetails",
    title: "Pull Request Details",
    description:
      "Read pull request metadata, file statistics, and diff with current repository read authority.",
    mimeType: "application/json",
    uriTemplate: "beancount://{owner}/{name}/pull-request",
    queryNames: Object.keys(pullRequestNumberQuery.shape),
    read: async (context, { owner, name, ...query }) => {
      const { ledgerOwner, ledgerName } = parseLedgerId(
        resolveLedgerId(context, { owner, name }),
      );
      return JSON.stringify(
        await context.pullRequestWorkflow.getPullRequestDetails(
          ledgerOwner,
          ledgerName,
          pullRequestNumberQuery.parse(query).prNumber,
          context.identity,
        ),
      );
    },
  },
  {
    name: "publicKeys",
    title: "SSH Public Keys",
    description:
      "List the authenticated user's SSH public keys. Requires administrative account authority; no ledger target.",
    mimeType: "application/json",
    uriTemplate: "beancount://account/public-keys",
    queryNames: Object.keys(publicKeyListQuery.shape),
    read: async (context, query) =>
      JSON.stringify(
        await context.publicKeyService.listPublicKeys(
          context.identity,
          publicKeyListQuery.parse(query),
        ),
      ),
  },
  {
    name: "publicKey",
    title: "SSH Public Key",
    description:
      "Read one SSH public key from the authenticated user's key API. Requires keyId and administrative account authority.",
    mimeType: "application/json",
    uriTemplate: "beancount://account/public-key",
    queryNames: Object.keys(publicKeyIdQuery.shape),
    read: async (context, query) =>
      JSON.stringify(
        await context.publicKeyService.getPublicKey(
          context.identity,
          publicKeyIdQuery.parse(query).keyId,
        ),
      ),
  },
  {
    name: "ledgerCollaborators",
    title: "Ledger Collaborators",
    description:
      "List ledger collaborators and permissions. Requires ledger.admin and current collaborator-inspection authority. Defaults to page 1, limit 10.",
    mimeType: "application/json",
    uriTemplate: "beancount://{owner}/{name}/collaborators",
    queryNames: Object.keys(collaboratorListQuery.shape),
    read: async (context, { owner, name, ...query }) =>
      JSON.stringify(
        await context.collaboratorsWorkflow.listCollaborators({
          identity: context.identity,
          ledgerId: resolveLedgerId(context, { owner, name }),
          ...collaboratorListQuery.parse(query),
        }),
      ),
  },
  {
    name: "ledgerCollaboratorPermission",
    title: "Ledger Collaborator Permission",
    description:
      "Read one collaborator's permission and user information. Requires collaborator username, ledger.admin, and current collaborator-inspection authority.",
    mimeType: "application/json",
    uriTemplate: "beancount://{owner}/{name}/collaborators/permission",
    queryNames: Object.keys(collaboratorPermissionQuery.shape),
    read: async (context, { owner, name, ...query }) =>
      JSON.stringify(
        await context.collaboratorsWorkflow.getCollaboratorPermission({
          identity: context.identity,
          ledgerId: resolveLedgerId(context, { owner, name }),
          ...collaboratorPermissionQuery.parse(query),
        }),
      ),
  },
  ...COMMIT_READS.map((read): McpResourceDescriptor => ({
    name: read.name,
    title: read.summary,
    description: read.summary,
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/${read.segment}`,
    queryNames: Object.keys(read.query.shape),
    read: async (context, variables) => {
      const { owner: _owner, name: _name, ...query } = variables;
      return JSON.stringify(
        await read.fetch(
          {
            commits: context.commitsService,
            ledgerRepo: context.services.ledgerRepo,
          },
          {
            identity: context.identity,
            ledgerId: resolveLedgerId(context, variables),
            query: read.query.parse(query),
          },
        ),
      );
    },
  })),
  ...JOURNAL_READS.map((read): McpResourceDescriptor => ({
    name: read.name,
    title: read.summary,
    description: `${read.summary}. Subtype filters are JSON-encoded string arrays.`,
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/${read.segment}`,
    // The one journal read enumerated in `resources/list` (w2/m27:t004):
    // clients that enumerate concrete resources need the source-file list
    // without first knowing it exists.
    ...(read.segment === "source-files" ? { listSegment: read.segment } : {}),
    queryNames: Object.keys(read.query.shape),
    read: async (context, variables) => {
      const { owner: _owner, name: _name, ...query } = variables;
      const result = await read.fetch(context.services, {
        identity: context.identity,
        ledgerId: resolveLedgerId(context, variables),
        query: read.query.parse(query),
      });
      return JSON.stringify(result);
    },
  })),
  ...(["income-statement", "balance-sheet"] as const).map(
    (statement): McpResourceDescriptor => ({
      name:
        statement === "balance-sheet"
          ? "ledgerBalanceSheet"
          : "ledgerIncomeStatement",
      title:
        statement === "balance-sheet" ? "Balance Sheet" : "Income Statement",
      description:
        "Financial statement with account, filter, time, conversion, and interval parameters. Returns the same structured data as REST.",
      mimeType: "application/json",
      uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/statements/${statement}`,
      listSegment: `statements/${statement}`,
      queryNames: Object.keys(statementReadQuery.shape),
      read: async (context, variables) => {
        const { owner: _owner, name: _name, ...query } = variables;
        // The same seam the REST route calls, so `shape` cannot mean two
        // different things on the two surfaces (w2/m28:t002).
        return JSON.stringify(
          await fetchStatement(context.services, {
            ledgerId: resolveLedgerId(context, variables),
            identity: context.identity,
            statement,
            query: statementReadQuery.parse(query),
          }),
        );
      },
    }),
  ),
  {
    name: "ledgerAccounts",
    title: "Ledger Accounts",
    description:
      "Account names, optionally restricted to open or closed accounts.",
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/accounts`,
    listSegment: "accounts",
    queryNames: Object.keys(accountsQuerySchema.shape),
    read: async (context, variables) => {
      const { ledgerOwner: owner, ledgerName: name } = parseLedgerId(
        resolveLedgerId(context, variables),
      );
      const { status } = accountsQuerySchema.parse({
        status: variables.status,
      });
      return JSON.stringify(
        await context.services.ledgerAccount.getAccounts(
          owner,
          name,
          status,
          context.identity,
        ),
      );
    },
  },
  ...CATALOG_READS.map((read): McpResourceDescriptor => ({
    name: read.name,
    title: read.summary,
    description: read.summary,
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://catalog/ledgers${read.segment ? `/${read.segment}` : ""}`,
    queryNames: Object.keys(read.query.shape),
    read: async (context, variables) =>
      JSON.stringify(
        await read.fetch(
          context.ledgerWorkflow,
          context.identity,
          read.query.parse(variables),
        ),
      ),
  })),
  {
    name: "ledgerMetadata",
    title: "Ledger Metadata",
    description:
      "Read ledger metadata, visibility, repository URLs, and caller permissions.",
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/metadata`,
    listSegment: "metadata",
    read: async (context, variables) =>
      JSON.stringify(
        await context.ledgerWorkflow.getLedger({
          identity: context.identity,
          ledgerId: resolveLedgerId(context, variables),
        }),
      ),
  },
  ...vocabularyResources,
  ...analysisResources,
  ...bankResources,
  {
    name: "ledgerFile",
    title: "Ledger File Contents",
    description:
      "The text of one file in the ledger repository, addressed by its path. Reading it needs no tool call, so an agent can pull a file into context without spending a tool slot.",
    mimeType: "text/plain",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/files/{+path}`,
    listPerSourceFile: true,
    read: async (toolCtx, variables) => {
      const ledgerId = resolveLedgerId(toolCtx, variables);
      const path = String(variables.path ?? "");
      // The same service the `readLedgerFiles` tool and the GraphQL resolver
      // call. Two adapters over one service, so they cannot drift — and its
      // `authorizeLedger` runs on this read, not once at listing time, which is
      // what makes a revoked grant bite on the very next fetch (ADR 0007 D5).
      const [file] = await toolCtx.services.ledgerRepo.getFilesContent({
        ledgerId,
        identity: toolCtx.identity,
        paths: [path],
      });
      if (!file)
        throw new NotFoundError(
          `File in ${ledgerId}`,
          path,
          "List what exists first: `listLedgerFiles`, or the `beancount://{owner}/{name}/source-files` resource.",
        );
      return file.content;
    },
  },
];

/** One concrete entry for `resources/list`. */
export interface ListedMcpResource {
  /** The descriptor it was enumerated from, so each template lists its own. */
  readonly template: string;
  readonly uri: string;
  readonly title: string;
  readonly mimeType: string;
}

/** Source-file entries per ledger are capped: this is discovery, not a crawl. */
const MAX_LISTED_SOURCE_FILES = 100;

/**
 * The concrete `resources/list` enumeration for the credential's ledger
 * (w2/m27:t004).
 *
 * A pinned credential enumerates its one ledger; an unpinned credential
 * enumerates the first catalog page. Static segments come from the
 * descriptors' `listSegment`; file URIs come from the ledger's source files,
 * capped. Listing authorizes exactly like reading (each service call runs its
 * own `authorizeLedger`) but grants nothing: a listed URI still passes the
 * per-read gate, so a grant revoked after listing bites on the next fetch
 * (ADR 0007 D5).
 */
export async function listLedgerResources(
  context: McpRequestContext,
): Promise<readonly ListedMcpResource[]> {
  const ledgers = context.identity.ledgerScope
    ? [context.identity.ledgerScope]
    : (
        await context.ledgerWorkflow.listLedgers({
          identity: context.identity,
          args: { page: 1, limit: 20 },
        })
      ).map((ledger) => ledger.fullName);
  const listed: ListedMcpResource[] = [];
  const fileTemplate = MCP_RESOURCES.find(
    (descriptor) => descriptor.listPerSourceFile,
  );
  for (const requested of ledgers) {
    // The pin ceiling applies to listing exactly as to reading: a pinned
    // credential cannot widen itself by enumerating.
    const ledgerId = resolveMcpLedger(context, requested);
    for (const descriptor of MCP_RESOURCES) {
      if (descriptor.listSegment === undefined) continue;
      listed.push({
        template: descriptor.name,
        uri: `${RESOURCE_SCHEME}://${ledgerId}/${descriptor.listSegment}`,
        title: descriptor.title,
        mimeType: descriptor.mimeType,
      });
    }
    if (fileTemplate) {
      // A ledger whose files cannot be read contributes its static entries
      // but no file URIs — a revoked grant between catalog and files must not
      // fail the whole list.
      const files = await context.services.ledgerData
        .getSourceFiles({ ledgerId, identity: context.identity })
        .catch((): string[] => []);
      for (const path of files.slice(0, MAX_LISTED_SOURCE_FILES)) {
        listed.push({
          template: fileTemplate.name,
          uri: `${RESOURCE_SCHEME}://${ledgerId}/files/${path}`,
          title: fileTemplate.title,
          mimeType: fileTemplate.mimeType,
        });
      }
    }
  }
  return listed;
}

/** The SDK template object for a descriptor.
 *
 * Memoized per descriptor: the MCP endpoint is stateless and rebuilds its
 * registry per request, but a template is fully determined by the static
 * descriptor — only the read handler needs per-request state. Without the
 * cache every request re-parses ~70 RFC 6570 templates twice each. */
const templateCache = new WeakMap<
  McpResourceDescriptor,
  QueryResourceTemplate
>();
const queryTemplateFor = (
  descriptor: McpResourceDescriptor,
): QueryResourceTemplate => {
  const cached = templateCache.get(descriptor);
  if (cached) return cached;
  const template = queryTemplate(
    descriptor.uriTemplate,
    descriptor.queryNames ?? [],
  );
  templateCache.set(descriptor, template);
  return template;
};
/**
 * The SDK template object for a descriptor, optionally carrying this
 * request's `resources/list` callback (w2/m27:t004). The wrapper is rebuilt
 * per call while the parsed URI template stays cached.
 */
export const resourceTemplateFor = (
  descriptor: McpResourceDescriptor,
  list?: ListResourcesCallback,
): ResourceTemplate => {
  return new ResourceTemplate(queryTemplateFor(descriptor), {
    list: list ?? undefined,
  });
};
