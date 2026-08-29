import { type DbExecutor } from "@/drizzle/drizzle";
import { type IModels } from "@/foundation/models";
import { type ISendGrid } from "@/foundation/sendgrid";
import { type CacheHelper } from "@/shared/cache";
import { type IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { type IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import { type IStripeService } from "@/features/stripe/service/stripe-service";
import { type IApiKeyService } from "@/features/apikeys/service/api-key-service";
import { type IAssetStorageService } from "@/features/s3/service/asset-storage-service";
import { type ILLMService } from "@/features/llm/service/llm-service";
import { type ILedgerAccountService } from "@/features/ledger/service/ledger-account-service";
import { type ILedgerAssetService } from "@/features/ledger/service/ledger-asset-service";
import { type ILedgerEntryService } from "@/features/ledger/service/ledger-entry-service";
import { type ILedgerFinanceService } from "@/features/ledger/service/ledger-finance-service";
import { type ILedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { type ILedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { type ILedgerShellService } from "@/features/ledger/service/ledger-shell-service";
import { type ILedgerPublicKeyService } from "@/features/ledger/service/ledger-public-key-service";
import { type ILedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { type ILedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { type ILedgerCollaboratorsWorkflow } from "@/features/ledger/workflow/ledger-collaborators-workflow";
import { type ILedgerReceiptWorkflow } from "@/features/ledger/workflow/ledger-receipt-workflow";
import { type IPlaidClient } from "@/features/plaid/service/plaid-client";
import { type IPlaidItemService } from "@/features/plaid/service/plaid-item-service";
import { type IPlaidSyncService } from "@/features/plaid/service/plaid-sync-service";
import { type IFeatureUsageService } from "@/features/feature-usage/service/feature-usage-service";
import { type IAiCfoUsageService } from "@/features/feature-usage/service/ai-cfo-usage-service";
import { type IAccountService } from "@/features/auth/service/account-service";
import { type IAuthService } from "@/features/auth/service/auth-service";
import { type ICliAuthService } from "@/features/auth/service/cli-auth-service";
import { type IUserProfileService } from "@/features/gitea/user-profile/service/user-profile-service";
import { type IPullRequestService } from "@/features/gitea/pull-request/service/pull-request-service";
import { type IFeedService } from "@/features/gitea/feed/service/feed-service";
import { type ICommitsService } from "@/features/gitea/commits/service/commits-service";
import { type IAuthorizationService } from "@/server/api/authorization";

/**
 * Composition-root layers. Each layer is a narrow interface describing what the
 * layer above it may depend on, and is assembled from the layer(s) below it
 * (see `builder.ts`). This is the explicit dependency graph replacing the flat
 * `IService` container. See backend-v2/CLAUDE.md "Composition root".
 */

/** Layer 1 — Database (persistence primitives). */
export interface DatabaseLayer {
  db: DbExecutor;
  models: IModels;
}

/**
 * Layer 2 — Client factories (external-API client provisioning). Its own layer
 * so the many services that need Fava/Gitea clients depend downward on it
 * instead of on each other, keeping the Service layer free of service→service
 * calls.
 */
export interface ClientFactoryLayer {
  favaClientFactory: IFavaClientFactory;
  giteaClientFactory: IGiteaClientFactory;
  plaidClient: IPlaidClient;
  sendgrid: ISendGrid;
  cacheHelper: CacheHelper;
}

/**
 * Layer 3 — Services (single-concern business units). Depend on Database +
 * ClientFactory, never on a sibling Service.
 */
export interface ServiceLayer {
  stripe: IStripeService;
  apiKey: IApiKeyService;
  assetStorage: IAssetStorageService;
  llm: ILLMService;
  ledgerAccount: ILedgerAccountService;
  ledgerAsset: ILedgerAssetService;
  ledgerEntry: ILedgerEntryService;
  ledgerFinance: ILedgerFinanceService;
  ledgerData: ILedgerDataService;
  ledgerJournal: ILedgerJournalService;
  ledgerShell: ILedgerShellService;
  ledgerPublicKey: ILedgerPublicKeyService;
  ledgerRepo: ILedgerRepoService;
  plaidItem: IPlaidItemService;
  plaidSync: IPlaidSyncService;
  featureUsage: IFeatureUsageService;
  aiCfoUsage: IAiCfoUsageService;
  account: IAccountService;
  auth: IAuthService;
  cliAuth: ICliAuthService;
  userProfile: IUserProfileService;
  pullRequest: IPullRequestService;
  feed: IFeedService;
  commits: ICommitsService;
  authorization: IAuthorizationService;
}

/** Layer 4 — Workflows (cross-service orchestration; own transaction boundaries). */
export interface WorkflowLayer {
  ledger: ILedgerWorkflow;
  ledgerCollaborators: ILedgerCollaboratorsWorkflow;
  ledgerReceipt: ILedgerReceiptWorkflow;
}

/** All four layers composed — the top-level dependency object passed cross-transport. */
export interface AppLayers {
  database: DatabaseLayer;
  clients: ClientFactoryLayer;
  services: ServiceLayer;
  workflows: WorkflowLayer;
}

/**
 * What the resolver wiring needs. Resolvers may call a Service directly (simple
 * CRUD) or a Workflow (orchestration); the Database layer is deliberately not
 * exposed — the "resolvers never touch models" boundary holds.
 */
export interface ResolverDeps {
  services: ServiceLayer;
  workflows: WorkflowLayer;
}
