import { type AppConfig } from "@/config/config";
import { PlaidItemService } from "@/features/plaid/service/plaid-item-service";
import { PlaidSyncService } from "@/features/plaid/service/plaid-sync-service";
import { AssetStorageService } from "@/features/s3/service/asset-storage-service";
import { StripeService } from "@/features/stripe/service/stripe-service";
import { SubscriptionService } from "@/features/stripe/service/subscription-service";
import { ApiKeyService } from "@/features/apikeys/service/api-key-service";
import { getUserTier } from "@/features/stripe/operations/get-user-tier";
import { SubscriptionTier } from "@/features/stripe/service/stripe";
import { FeatureUsageService } from "@/features/feature-usage/service/feature-usage-service";
import { AiCfoUsageService } from "@/features/feature-usage/service/ai-cfo-usage-service";
import { LLMService } from "@/features/llm/service/llm-service";
import { LedgerAccountService } from "@/features/ledger/service/ledger-account-service";
import { LedgerAssetService } from "@/features/ledger/service/ledger-asset-service";
import {
  createLedgerEntryWriter,
  LedgerEntryService,
} from "@/features/ledger/service/ledger-entry-service";
import { LedgerFinanceService } from "@/features/ledger/service/ledger-finance-service";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { LedgerShellService } from "@/features/ledger/service/ledger-shell-service";
import { LedgerPublicKeyService } from "@/features/ledger/service/ledger-public-key-service";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { LedgerCollaboratorsWorkflow } from "@/features/ledger/workflow/ledger-collaborators-workflow";
import { LedgerReceiptWorkflow } from "@/features/ledger/workflow/ledger-receipt-workflow";
import { AccountService } from "@/features/auth/service/account-service";
import { AuthService } from "@/features/auth/service/auth-service";
import { CliAuthService } from "@/features/auth/service/cli-auth-service";
import { UserProfileService } from "@/features/gitea/user-profile/service/user-profile-service";
import { PullRequestService } from "@/features/gitea/pull-request/service/pull-request-service";
import { FeedService } from "@/features/gitea/feed/service/feed-service";
import { CommitsService } from "@/features/gitea/commits/service/commits-service";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import {
  type DatabaseLayer,
  type ClientFactoryLayer,
  type ServiceLayer,
  type WorkflowLayer,
} from "./layers";

/** Build the service layer from the layers below it + config. */
export function buildServiceLayer(input: {
  database: DatabaseLayer;
  clients: ClientFactoryLayer;
  config: AppConfig;
}): ServiceLayer {
  const stripe = new StripeService(input.database.models, input.database.db);
  const authorization = new AuthorizationService(
    new SourceBackedRelationshipEvaluator(
      input.database.db,
      input.database.models,
      input.clients.giteaClientFactory,
      input.clients.favaClientFactory,
    ),
  );
  const subscriptions = new SubscriptionService(
    stripe,
    input.database.models,
    input.database.db,
    authorization,
  );
  const apiKey = new ApiKeyService({
    db: input.database.db,
    models: input.database.models,
    authorization,
    // Minting is a paid feature (w1/m22). Injected as a predicate rather than
    // reached for inside the service, so the key service depends on a question
    // rather than on billing.
    isPremium: async (userId: string) =>
      input.config.api.developmentPremiumUserIds.has(userId) ||
      (await getUserTier({
        stripe,
        models: input.database.models,
        postgresDb: input.database.db,
        userId,
      })) !== SubscriptionTier.FREE,
  });
  const assetStorage = new AssetStorageService(
    input.config.tempAssetS3,
    authorization,
  );
  const featureUsage = new FeatureUsageService(
    input.database.models,
    input.database.db,
  );
  const aiCfoUsage = new AiCfoUsageService(
    featureUsage,
    stripe,
    input.database.models,
    input.database.db,
    authorization,
  );
  const ledgerEntryWriter = createLedgerEntryWriter(
    input.clients.favaClientFactory,
  );
  return {
    authorization,
    stripe,
    subscriptions,
    apiKey,
    assetStorage,
    featureUsage,
    aiCfoUsage,
    llm: new LLMService(
      input.clients.favaClientFactory,
      assetStorage,
      aiCfoUsage,
      input.config,
      authorization,
    ),
    ledgerAccount: new LedgerAccountService(
      input.clients.favaClientFactory,
      authorization,
    ),
    ledgerAsset: new LedgerAssetService(
      input.clients.favaClientFactory,
      assetStorage,
      input.config,
      authorization,
    ),
    ledgerEntry: new LedgerEntryService(ledgerEntryWriter, authorization),
    ledgerEntryWriter,
    ledgerFinance: new LedgerFinanceService(
      input.clients.favaClientFactory,
      authorization,
    ),
    ledgerData: new LedgerDataService(
      input.clients.favaClientFactory,
      authorization,
    ),
    ledgerJournal: new LedgerJournalService(
      input.clients.favaClientFactory,
      authorization,
    ),
    ledgerShell: new LedgerShellService(
      input.clients.favaClientFactory,
      authorization,
    ),
    ledgerPublicKey: new LedgerPublicKeyService(
      input.clients.favaClientFactory,
      authorization,
    ),
    ledgerRepo: new LedgerRepoService(
      input.clients.favaClientFactory,
      authorization,
    ),
    plaidItem: new PlaidItemService(
      input.clients.plaidClient,
      input.clients.favaClientFactory,
      input.database.models,
      input.database.db,
      input.config,
      authorization,
    ),
    plaidSync: new PlaidSyncService(
      input.clients.plaidClient,
      input.clients.favaClientFactory,
      input.database.models,
      input.database.db,
      authorization,
    ),
    account: new AccountService(
      input.database.models,
      input.database.db,
      stripe,
      input.clients.favaClientFactory,
      input.clients.plaidClient,
      authorization,
    ),
    auth: new AuthService(
      input.database.models,
      input.database.db,
      input.clients.sendgrid,
      stripe,
      input.clients.favaClientFactory,
      input.config,
    ),
    cliAuth: new CliAuthService(input.database.models, input.database.db),
    userProfile: new UserProfileService(
      input.clients.giteaClientFactory,
      input.database.models,
      input.database.db,
      authorization,
    ),
    pullRequest: new PullRequestService(
      input.clients.giteaClientFactory,
      input.database.models,
      input.database.db,
      authorization,
    ),
    feed: new FeedService(
      input.clients.cacheHelper,
      input.clients.favaClientFactory,
      input.clients.giteaClientFactory,
      input.database.models,
      input.database.db,
      authorization,
    ),
    commits: new CommitsService(
      input.clients.giteaClientFactory,
      authorization,
    ),
  };
}

/** Build the workflow layer from the layers below it. */
export function buildWorkflowLayer(input: {
  database: DatabaseLayer;
  clients: ClientFactoryLayer;
  services: ServiceLayer;
  config: AppConfig;
}): WorkflowLayer {
  const ledger = new LedgerWorkflow(
    input.clients.favaClientFactory,
    input.clients.giteaClientFactory,
    input.clients.plaidClient,
    input.services.stripe,
    input.services.ledgerData,
    input.database.models,
    input.database.db,
    input.config,
    input.services.authorization,
  );
  const ledgerCollaborators = new LedgerCollaboratorsWorkflow(
    input.clients.favaClientFactory,
    input.services.stripe,
    input.database.models,
    input.database.db,
    input.services.authorization,
  );
  const ledgerReceipt = new LedgerReceiptWorkflow(
    input.clients.favaClientFactory,
    input.services.assetStorage,
    input.services.ledgerEntryWriter,
    input.config,
    input.services.authorization,
  );
  return { ledger, ledgerCollaborators, ledgerReceipt };
}
