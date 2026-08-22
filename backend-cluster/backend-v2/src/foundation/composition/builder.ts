import { type AppConfig } from "@/config/config";
import { type Cache } from "cache-manager";
import { createCacheHelper } from "@/shared/cache";
import { FavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { GiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import { PlaidClient } from "@/features/plaid/service/plaid-client";
import { PlaidItemService } from "@/features/plaid/service/plaid-item-service";
import { PlaidSyncService } from "@/features/plaid/service/plaid-sync-service";
import { AssetStorageService } from "@/features/s3/service/asset-storage-service";
import { StripeService } from "@/features/stripe/service/stripe-service";
import { FeatureUsageService } from "@/features/feature-usage/service/feature-usage-service";
import { AiCfoUsageService } from "@/features/feature-usage/service/ai-cfo-usage-service";
import { LLMService } from "@/features/llm/service/llm-service";
import { LedgerAccountService } from "@/features/ledger/service/ledger-account-service";
import { LedgerAssetService } from "@/features/ledger/service/ledger-asset-service";
import { LedgerEntryService } from "@/features/ledger/service/ledger-entry-service";
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
import { SendGrid, ConsoleSendGrid } from "@/foundation/sendgrid";
import {
  type DatabaseLayer,
  type ClientFactoryLayer,
  type ServiceLayer,
  type WorkflowLayer,
} from "./layers";

/** Build the external-API client factory layer from the Database layer + config. */
export function buildClientFactoryLayer(input: {
  database: DatabaseLayer;
  config: AppConfig;
  cache: Cache;
}): ClientFactoryLayer {
  const sendGridOpts = {
    apiKey: input.config.sendGrid.apiKey,
    retryLimit: 2,
    defaultFrom: "Beancount.io <noreply@mail.beancount.io>",
  };
  return {
    favaClientFactory: new FavaClientFactory(
      input.database.models,
      input.database.db,
      input.config,
    ),
    giteaClientFactory: new GiteaClientFactory(
      input.database.models,
      input.database.db,
      input.config,
    ),
    plaidClient: new PlaidClient(input.config.plaid),
    sendgrid:
      input.config.env === "production"
        ? new SendGrid(sendGridOpts)
        : new ConsoleSendGrid(sendGridOpts),
    cacheHelper: createCacheHelper(input.cache),
  };
}

/** Build the service layer from the layers below it + config. */
export function buildServiceLayer(input: {
  database: DatabaseLayer;
  clients: ClientFactoryLayer;
  config: AppConfig;
}): ServiceLayer {
  const stripe = new StripeService(input.database.models, input.database.db);
  const assetStorage = new AssetStorageService(input.config.tempAssetS3);
  const featureUsage = new FeatureUsageService(
    input.database.models,
    input.database.db,
  );
  const aiCfoUsage = new AiCfoUsageService(
    featureUsage,
    stripe,
    input.database.models,
    input.database.db,
  );
  return {
    stripe,
    assetStorage,
    featureUsage,
    aiCfoUsage,
    llm: new LLMService(
      input.clients.favaClientFactory,
      assetStorage,
      aiCfoUsage,
      input.config,
      input.database.models,
      input.database.db,
    ),
    ledgerAccount: new LedgerAccountService(
      input.clients.favaClientFactory,
      input.database.models,
      input.database.db,
    ),
    ledgerAsset: new LedgerAssetService(
      input.clients.favaClientFactory,
      input.database.models,
      input.database.db,
      assetStorage,
      input.config,
    ),
    ledgerEntry: new LedgerEntryService(
      input.clients.favaClientFactory,
      input.database.models,
      input.database.db,
    ),
    ledgerFinance: new LedgerFinanceService(
      input.clients.favaClientFactory,
      input.database.models,
      input.database.db,
    ),
    ledgerData: new LedgerDataService(
      input.clients.favaClientFactory,
      input.database.models,
      input.database.db,
    ),
    ledgerJournal: new LedgerJournalService(
      input.clients.favaClientFactory,
      input.database.models,
      input.database.db,
    ),
    ledgerShell: new LedgerShellService(
      input.clients.favaClientFactory,
      input.database.models,
      input.database.db,
    ),
    ledgerPublicKey: new LedgerPublicKeyService(
      input.clients.favaClientFactory,
    ),
    ledgerRepo: new LedgerRepoService(
      input.clients.favaClientFactory,
      input.database.models,
      input.database.db,
    ),
    plaidItem: new PlaidItemService(
      input.clients.plaidClient,
      input.clients.favaClientFactory,
      input.database.models,
      input.database.db,
      input.config,
    ),
    plaidSync: new PlaidSyncService(
      input.clients.plaidClient,
      input.clients.favaClientFactory,
      input.database.models,
      input.database.db,
    ),
    account: new AccountService(
      input.database.models,
      input.database.db,
      stripe,
      input.clients.favaClientFactory,
      input.clients.plaidClient,
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
    ),
    pullRequest: new PullRequestService(
      input.clients.giteaClientFactory,
      input.database.models,
      input.database.db,
    ),
    feed: new FeedService(
      input.clients.cacheHelper,
      input.clients.favaClientFactory,
      input.clients.giteaClientFactory,
      input.database.models,
      input.database.db,
    ),
    commits: new CommitsService(input.clients.giteaClientFactory),
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
  );
  const ledgerCollaborators = new LedgerCollaboratorsWorkflow(
    input.clients.favaClientFactory,
    input.services.stripe,
    input.database.models,
    input.database.db,
  );
  const ledgerReceipt = new LedgerReceiptWorkflow(
    input.clients.favaClientFactory,
    input.services.assetStorage,
    input.services.ledgerEntry,
    input.config,
  );
  return { ledger, ledgerCollaborators, ledgerReceipt };
}
