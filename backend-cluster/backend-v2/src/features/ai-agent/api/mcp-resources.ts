import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../tools/types";
import { VOCABULARY_READS } from "@/features/ledger/api/rest/v1/vocabulary-handler";
import { ANALYSIS_READS } from "@/features/ledger/api/rest/v1/analysis-handler";

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
  readonly read: (
    toolCtx: ToolContext,
    variables: Record<string, string | string[]>,
  ) => Promise<string>;
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
  toolCtx: ToolContext,
  variables: Record<string, string | string[]>,
): string {
  const owner = String(variables.owner ?? "");
  const name = String(variables.name ?? "");
  const requested = owner && name ? `${owner}/${name}` : "";
  if (!requested) return toolCtx.ledgerId;
  if (
    toolCtx.identity.ledgerScope &&
    requested !== toolCtx.identity.ledgerScope
  ) {
    throw new Error(
      `This credential is bound to ${toolCtx.identity.ledgerScope} and cannot read ${requested}`,
    );
  }
  return requested;
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
const vocabularyResources: readonly McpResourceDescriptor[] =
  VOCABULARY_READS.map((read) => ({
    name: `ledger${read.segment[0].toUpperCase()}${read.segment.slice(1)}`,
    title: read.summary,
    description: read.description,
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/${read.segment}`,
    read: async (toolCtx, variables) => {
      const ledgerId = resolveLedgerId(toolCtx, variables);
      // The same service instance the REST route calls — `read.fetch` takes the
      // service rather than a surface's wrapper around it, so neither side has
      // to fake the other's shape.
      const result = await read.fetch(toolCtx.services.ledgerData, {
        ledgerId,
        identity: toolCtx.identity,
      });
      return JSON.stringify(result, null, 2);
    },
  }));

/**
 * The analysis reads, as templates (w3/m7).
 *
 * Same construction as the vocabulary ones and the same reason: one
 * `ANALYSIS_READS` list, two adapters.
 *
 * Required parameters ride the **path** (`…/payee-transactions/{payee}`) rather
 * than a query string, which is not the spelling ADR 0008 D5a first chose. The
 * SDK's `UriTemplate.match` does not implement RFC 6570 form-style expansion,
 * so a `{?account,filter}` template matches no URI at all, and a bare template
 * stops matching the moment a caller appends `?`. Path parameters match — colons
 * in account names included.
 *
 * The cost is real and worth naming: **optional filters are REST-only.** A
 * caller wanting a trial balance narrowed by time uses the REST route; the MCP
 * resource returns the unfiltered read. That is a tooling limit, not a decision,
 * and it is recorded on the affected rows rather than left for someone to
 * rediscover.
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
    read: async (toolCtx, variables) => {
      const ledgerId = resolveLedgerId(toolCtx, variables);
      // The path variable arrives here alongside `owner`/`name`, and the
      // services read it from `query` — so a path parameter and its REST
      // query-string twin land in the same place. RFC 6570 hands a variable
      // back as a string or a list; a repeated one collapses to its first
      // value rather than reaching the service as an array it would mishandle.
      const query = Object.fromEntries(
        Object.entries(variables)
          .filter(([key]) => key !== "owner" && key !== "name")
          .map(([key, value]) => [
            key,
            Array.isArray(value) ? value[0] : value,
          ]),
      ) as Record<string, string | undefined>;
      // The same service objects the REST route passes: `fetch` takes the
      // services it uses, not a surface's wrapper around them.
      const result = await read.fetch(toolCtx.services, {
        ledgerId,
        identity: toolCtx.identity,
        query,
      });
      return JSON.stringify(result, null, 2);
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
        null,
        2,
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
        null,
        2,
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
        null,
        2,
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
        null,
        2,
      ),
  },
  {
    name: "bankUnsyncedTransactions",
    title: "Transactions Not Yet In The Ledger",
    description:
      "Transactions pulled from a bank that have not been written into the ledger — what `manageBankImport` submits.",
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/bank-transactions/unsynced`,
    read: async (ctx, vars) =>
      JSON.stringify(
        await ctx.services.plaidItem.getUnsyncedTransactions(
          ctx.identity,
          undefined,
          resolveLedgerId(ctx, vars),
        ),
        null,
        2,
      ),
  },
  {
    name: "bankSuggestedCategories",
    title: "Suggested Categories For Unsynced Transactions",
    description:
      "A ledger account suggested for each staged transaction, drawn from the ledger's own history.",
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/bank-transactions/suggested-categories`,
    read: async (ctx, vars) =>
      JSON.stringify(
        await ctx.services.plaidItem.suggestCategories(
          ctx.identity,
          resolveLedgerId(ctx, vars),
        ),
        null,
        2,
      ),
  },
  {
    name: "bankSuggestedMapping",
    title: "Suggested Ledger Account Per Bank Account",
    description:
      "Which ledger account each of a bank's accounts most likely corresponds to.",
    mimeType: "application/json",
    uriTemplate: `${RESOURCE_SCHEME}://{owner}/{name}/banks/{itemId}/suggested-mapping`,
    read: async (ctx, vars) =>
      JSON.stringify(
        await ctx.services.plaidItem.suggestAccountMapping(
          ctx.identity,
          resolveLedgerId(ctx, vars),
          String(vars.itemId ?? ""),
        ),
        null,
        2,
      ),
  },
];

/** The resource fragment: every template this feature contributes to the registry. */
export const MCP_RESOURCES: readonly McpResourceDescriptor[] = [
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
      if (!file) throw new Error(`No such file in ${ledgerId}: ${path}`);
      return file.content;
    },
  },
];

/** The SDK template object for a descriptor. No `list` callback: enumerating every
 * file of every ledger is a crawl, and the paths come from `listLedgerFiles`. */
export const resourceTemplateFor = (
  descriptor: McpResourceDescriptor,
): ResourceTemplate =>
  new ResourceTemplate(descriptor.uriTemplate, { list: undefined });
