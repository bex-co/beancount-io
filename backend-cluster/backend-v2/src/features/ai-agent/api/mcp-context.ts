import type { ILegacyEntryWorkflow } from "@/features/ledger/workflow/legacy-entry-workflow";
import type { ILedgerEntryService } from "@/features/ledger/service/ledger-entry-service";
import type { IAiCfoUsageService } from "@/features/feature-usage/service/ai-cfo-usage-service";
import type { IAssetStorageService } from "@/features/s3/service/asset-storage-service";
import type { IUserProfileService } from "@/features/gitea/user-profile/service/user-profile-service";
import type { IAccountService } from "@/features/auth/service/account-service";
import type { ISubscriptionService } from "@/features/stripe/service/subscription-service";
import type { ILedgerArchiveService } from "@/features/ledger/service/ledger-archive-service";
import type { ILedgerAssetService } from "@/features/ledger/service/ledger-asset-service";
import type { IPullRequestWorkflow } from "@/features/gitea/pull-request/workflow/pull-request-workflow";
import type { ILedgerPublicKeyService } from "@/features/ledger/service/ledger-public-key-service";
import type { ILedgerCollaboratorsWorkflow } from "@/features/ledger/workflow/ledger-collaborators-workflow";
import type { ICommitsService } from "@/features/gitea/commits/service/commits-service";
import type { ILedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import type { ToolContext } from "../tools/types";
import type { Identity } from "@/server/api/identity";
import { BadUserInputError, ForbiddenError } from "@/shared/errors";
import { CLASS_BUDGETS } from "@/server/api/rate-limit";
import { z } from "zod";

/**
 * The one spelling of the optional per-call ledger selector, shared by every
 * ledger-targeted tool module so clients see the same documented contract on
 * each tool.
 */
export const ledgerSelection = z
  .string()
  .optional()
  .describe(
    "Target ledger as owner/name. Required for an unpinned credential; defaults to the credential's ledger restriction.",
  );

/** A credential may select a ledger per call or perform account-only work. */
export type McpRequestContext = Omit<ToolContext, "ledgerId"> & {
  ledgerId?: string;
  socialService: Pick<
    IUserProfileService,
    | "getUserProfile"
    | "getUserFollowers"
    | "getUserFollowing"
    | "getUserStarredRepos"
  >;
  accountService: Pick<IAccountService, "getUserProfile" | "deleteAccount">;
  assetStorage: Pick<
    IAssetStorageService,
    "generateUploadUrl" | "generateTempDownloadUrl"
  >;
  ledgerEntryService: Pick<
    ILedgerEntryService,
    "addBulkEntries" | "appendDirectiveText"
  >;
  aiCfoUsage: Pick<IAiCfoUsageService, "getUsage">;
  subscriptionService: Pick<ISubscriptionService, "allTierQuotas">;
  legacyEntryWorkflow: ILegacyEntryWorkflow;
  ledgerWorkflow: ILedgerWorkflow;
  ledgerAssetService: ILedgerAssetService;
  ledgerArchiveService: ILedgerArchiveService;
  pullRequestWorkflow: IPullRequestWorkflow;
  commitsService: ICommitsService;
  publicKeyService: ILedgerPublicKeyService;
  collaboratorsWorkflow: ILedgerCollaboratorsWorkflow;
};

/**
 * Per-credential server instructions for the MCP `initialize` result (w2/m27).
 *
 * The one free channel every client reads: what the audit's agents spent turns
 * discovering — which ledger this credential holds, how to select one, the
 * resource URI grammar, when to check errors, and how BQL rows work. Built per
 * request because the endpoint builds a server per request, so the pin (or the
 * selection rule for an unpinned credential) is stated for this caller.
 * Kept under 1,500 characters; it is paid on every session.
 */
export function buildInstructions(identity: Identity): string {
  const ledgerLine = identity.ledgerScope
    ? `Ledger ${identity.ledgerScope}: omit \`ledger\` or repeat it.`
    : "Unpinned credential: pass `ledger: owner/name` on every ledger call; call `listLedgers` first.";
  return [
    ledgerLine,
    "Start with `listLedgers`, then `getLedgerContext`, then work.",
    "Reads: beancount://{owner}/{name}/<errors|accounts|payees|metadata>, e.g. beancount://alice/personal/errors.",
    "Files: beancount://{owner}/{name}/files/{path}; catalog: beancount://catalog/ledgers.",
    "Prefer resources over tools when your client fetches URIs; reads cost less.",
    "Multi-step jobs have playbooks: prompts/list offers close-month, reconcile-account, categorize-imports, spending-report.",
    "After any write, check `validation.newErrors` or call `checkLedger`.",
    "BQL rows are postings: LIMIT counts postings, not transactions; use `runBqlQueryStructured` for typed numbers.",
    "Every tool returns {ok, result} or {ok:false, error:{code,message,hint}} with isError; branch on error.code and follow error.hint.",
    // Interpolated, not restated: the instruction string is the contract every
    // session reads, and a retuned budget must not leave it advertising a
    // number the limiter does not enforce.
    `Budgets per minute: ${CLASS_BUDGETS.read.max} reads, ${CLASS_BUDGETS.write.max} writes, ${CLASS_BUDGETS.admin.max} admin; the handshake is free. Over budget is code RATE_LIMITED with retryAfter — wait, do not retry now.`,
  ].join("\n");
}

export function resolveMcpLedger(
  context: McpRequestContext,
  requested?: string,
): string {
  const ledger = requested ?? context.identity.ledgerScope;
  if (!ledger || !/^[^/\s?#%]+\/[^/\s?#%]+$/.test(ledger)) {
    throw new BadUserInputError(
      "Select a ledger using ledger: owner/name",
      "ledger",
      'Call `listLedgers`, then pass `ledger: "owner/name"` on this call. A credential pinned to one ledger may omit it.',
    );
  }
  if (context.identity.ledgerScope && ledger !== context.identity.ledgerScope) {
    throw new ForbiddenError(
      "The selected ledger is outside this credential's ledger restriction",
      "ledger",
      "This credential is pinned to one ledger and cannot reach another. Omit `ledger`, or use a credential without a pin.",
    );
  }
  return ledger;
}
