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
import { BadUserInputError, ForbiddenError } from "@/shared/errors";
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
  ledgerEntryService: Pick<ILedgerEntryService, "addBulkEntries">;
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

export function resolveMcpLedger(
  context: McpRequestContext,
  requested?: string,
): string {
  const ledger = requested ?? context.identity.ledgerScope;
  if (!ledger || !/^[^/\s?#%]+\/[^/\s?#%]+$/.test(ledger)) {
    throw new BadUserInputError("Select a ledger using ledger: owner/name");
  }
  if (context.identity.ledgerScope && ledger !== context.identity.ledgerScope) {
    throw new ForbiddenError(
      "The selected ledger is outside this credential's ledger restriction",
    );
  }
  return ledger;
}
