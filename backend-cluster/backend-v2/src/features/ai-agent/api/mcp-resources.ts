import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../tools/types";

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
 * This file holds one template. It is the proof of shape for the port that
 * follows (w3/m6–m8), not the port.
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

/** The resource fragment: every template this feature contributes to the registry. */
export const MCP_RESOURCES: readonly McpResourceDescriptor[] = [
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
