import { registerEnumType } from "type-graphql";
import type { buildSchema } from "type-graphql";
import type {
  DatabaseLayer,
  ClientFactoryLayer,
  ServiceLayer,
  WorkflowLayer,
} from "@/foundation/composition";

import { AccountResolver } from "@/features/auth/api/account-resolver";
import { AuthResolver } from "@/features/auth/api/auth-resolver";
import { CliAuthResolver } from "@/features/auth/api/cli-auth-resolver";
import { LedgerQueryResolver } from "@/features/ledger/api/resolvers/ledger-resolver.query";
import { LedgerMutationResolver } from "@/features/ledger/api/resolvers/ledger-resolver.mutation";
import { LedgerFinanceQueryResolver } from "@/features/ledger/api/resolvers/ledger-finance-resolver.query";
import { LedgerDataQueryResolver } from "@/features/ledger/api/resolvers/ledger-data-resolver.query";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { SubscriptionResolver } from "@/features/stripe/api/subscription-resolver";
import { LedgerPublicKeyQueryResolver } from "@/features/ledger/api/resolvers/ledger-public-key-resolver.query";
import { LedgerPublicKeyMutationResolver } from "@/features/ledger/api/resolvers/ledger-public-key-resolver.mutation";
import { LedgerCollaboratorsQueryResolver } from "@/features/ledger/api/resolvers/ledger-collaborators-resolver.query";
import { LedgerCollaboratorsMutationResolver } from "@/features/ledger/api/resolvers/ledger-collaborators-resolver.mutation";
import { LedgerEntryMutationResolver } from "@/features/ledger/api/resolvers/ledger-entry-resolver.mutation";
import { LedgerReceiptMutationResolver } from "@/features/ledger/api/resolvers/ledger-receipt-resolver";
import { LedgerShellQueryResolver } from "@/features/ledger/api/resolvers/ledger-shell-resolver.query";
import { LedgerJournalQueryResolver } from "@/features/ledger/api/resolvers/ledger-journal-resolver.query";
import { LedgerAccountQueryResolver } from "@/features/ledger/api/resolvers/ledger-account-resolver.query";
import { LedgerAssetQueryResolver } from "@/features/ledger/api/resolvers/ledger-asset-resolver";
import { LedgerJournalMutationResolver } from "@/features/ledger/api/resolvers/ledger-journal-resolver.mutation";
import { LedgerLegacyQueryResolver } from "@/features/ledger/api/resolvers/ledger-legacy-resolver.query";
import { LedgerLegacyMutationResolver } from "@/features/ledger/api/resolvers/ledger-legacy-resolver.mutation";
import { LedgerRepoQueryResolver } from "@/features/ledger/api/resolvers/ledger-repo-resolver.query";
import { FeedResolver } from "@/features/gitea/feed/api/feed-resolver";
import { UserProfileResolver } from "@/features/gitea/user-profile/api/user-profile-resolver";
import { PullRequestResolver } from "@/features/gitea/pull-request/api/pull-request-resolver";
import { CommitsResolver } from "@/features/gitea/commits/api/commits-resolver";
import { LLMParserResolver } from "@/features/llm/api/llm-parser-resolver";
import { LLMCategorizationQueryResolver } from "@/features/llm/api/ai-categorization-resolver";
import { AssetStorageResolver } from "@/features/s3/api/asset-storage-resolver";
import {
  PlaidQueryResolver,
  PlaidMutationResolver,
} from "@/features/plaid/api/resolvers";
import { AiCfoUsageResolver } from "@/features/feature-usage/api/ai-cfo-usage-resolver";
import { ApiKeyResolver } from "@/features/apikeys/api/api-key-resolver";
import { ReportStatus } from "@/features/auth/utils/report-status";

// ReportStatus is exposed by UserProfileResponse.emailReportStatus (account
// surface); register it with TypeGraphQL before buildSchema.
registerEnumType(ReportStatus, {
  name: "ReportStatus",
  description: "The email report status (deprecated)",
});

type Resolvers = Parameters<typeof buildSchema>["0"]["resolvers"];
type ResolverClass = NonNullable<Resolvers>[number];
type ResolverConstructor<TInstance extends object = object> = new (
  ...args: any[]
) => TInstance;

export interface ResolverContainer {
  get: <TInstance extends object>(
    resolverClass: ResolverConstructor<TInstance>,
  ) => TInstance;
}

/** All resolver classes registered with TypeGraphQL's buildSchema. */
export const resolvers: Resolvers = [
  HealthResolver,
  LedgerQueryResolver,
  LedgerMutationResolver,
  LedgerFinanceQueryResolver,
  LedgerDataQueryResolver,
  AccountResolver,
  AuthResolver,
  CliAuthResolver,
  SubscriptionResolver,
  LedgerPublicKeyQueryResolver,
  LedgerPublicKeyMutationResolver,
  LedgerCollaboratorsQueryResolver,
  LedgerCollaboratorsMutationResolver,
  LedgerEntryMutationResolver,
  LedgerReceiptMutationResolver,
  ApiKeyResolver,
  LedgerShellQueryResolver,
  LedgerJournalQueryResolver,
  LedgerJournalMutationResolver,
  LedgerAccountQueryResolver,
  LedgerAssetQueryResolver,
  LedgerLegacyQueryResolver,
  LedgerLegacyMutationResolver,
  LedgerRepoQueryResolver,
  LLMCategorizationQueryResolver,
  FeedResolver,
  UserProfileResolver,
  PullRequestResolver,
  CommitsResolver,
  LLMParserResolver,
  AssetStorageResolver,
  PlaidQueryResolver,
  PlaidMutationResolver,
  AiCfoUsageResolver,
];

/**
 * Builds the TypeGraphQL resolver container that serves pre-constructed
 * resolver instances for migrated resolvers, and falls back to no-arg
 * construction for resolvers still using ctx.service (migration bridge).
 *
 * Add a resolver to `resolverInstances` when migrating it away from ctx.service.
 * The container throws if a resolver with ctor params is not registered here,
 * which makes missing registrations a loud startup error rather than a silent bug.
 */
export function buildResolverContainer(
  services: ServiceLayer,
  workflows: WorkflowLayer,
  database: DatabaseLayer,
  clients: ClientFactoryLayer,
): ResolverContainer {
  const resolverInstances = new Map<ResolverClass, object>([
    [PlaidQueryResolver, new PlaidQueryResolver(services.plaidItem)],
    [
      PlaidMutationResolver,
      new PlaidMutationResolver(services.plaidItem, services.plaidSync),
    ],
    [AiCfoUsageResolver, new AiCfoUsageResolver(services.aiCfoUsage)],
    [
      AccountResolver,
      new AccountResolver(services.account, services.authorization),
    ],
    [AuthResolver, new AuthResolver(services.auth)],
    [CliAuthResolver, new CliAuthResolver(services.cliAuth)],
    [UserProfileResolver, new UserProfileResolver(services.userProfile)],
    [PullRequestResolver, new PullRequestResolver(services.pullRequest)],
    [FeedResolver, new FeedResolver(services.feed)],
    [CommitsResolver, new CommitsResolver(services.commits)],
    [LedgerMutationResolver, new LedgerMutationResolver(workflows.ledger)],
    [LedgerQueryResolver, new LedgerQueryResolver(workflows.ledger)],
    [AssetStorageResolver, new AssetStorageResolver(services.assetStorage)],
    [
      SubscriptionResolver,
      new SubscriptionResolver(services.stripe, database.models, database.db),
    ],
    [LLMParserResolver, new LLMParserResolver(services.llm)],
    [
      LLMCategorizationQueryResolver,
      new LLMCategorizationQueryResolver(services.llm),
    ],
    [
      LedgerAccountQueryResolver,
      new LedgerAccountQueryResolver(services.ledgerAccount),
    ],
    [
      LedgerPublicKeyQueryResolver,
      new LedgerPublicKeyQueryResolver(services.ledgerPublicKey),
    ],
    [
      LedgerPublicKeyMutationResolver,
      new LedgerPublicKeyMutationResolver(services.ledgerPublicKey),
    ],
    [LedgerRepoQueryResolver, new LedgerRepoQueryResolver(services.ledgerRepo)],
    [
      LedgerEntryMutationResolver,
      new LedgerEntryMutationResolver(services.ledgerEntry),
    ],
    [ApiKeyResolver, new ApiKeyResolver(services.apiKey)],
    [
      LedgerJournalMutationResolver,
      new LedgerJournalMutationResolver(services.ledgerJournal),
    ],
    [
      LedgerCollaboratorsQueryResolver,
      new LedgerCollaboratorsQueryResolver(workflows.ledgerCollaborators),
    ],
    [
      LedgerJournalQueryResolver,
      new LedgerJournalQueryResolver(services.ledgerJournal),
    ],
    [
      LedgerFinanceQueryResolver,
      new LedgerFinanceQueryResolver(services.ledgerFinance),
    ],
    [LedgerDataQueryResolver, new LedgerDataQueryResolver(services.ledgerData)],
    [
      LedgerShellQueryResolver,
      new LedgerShellQueryResolver(services.ledgerShell),
    ],
    // Legacy resolvers (migration deferred)
    [
      LedgerLegacyQueryResolver,
      new LedgerLegacyQueryResolver(clients.favaClientFactory),
    ],
    [
      LedgerLegacyMutationResolver,
      new LedgerLegacyMutationResolver(
        clients.favaClientFactory,
        services.ledgerEntry,
      ),
    ],
    [
      LedgerCollaboratorsMutationResolver,
      new LedgerCollaboratorsMutationResolver(workflows.ledgerCollaborators),
    ],
    [
      LedgerReceiptMutationResolver,
      new LedgerReceiptMutationResolver(workflows.ledgerReceipt),
    ],
    [
      LedgerAssetQueryResolver,
      new LedgerAssetQueryResolver(services.ledgerAsset),
    ],
  ]);

  return {
    get: <TInstance extends object>(
      resolverClass: ResolverConstructor<TInstance>,
    ): TInstance => {
      const existing = resolverInstances.get(
        resolverClass as unknown as ResolverClass,
      ) as TInstance | undefined;

      if (existing) return existing;

      if (resolverClass.length > 0) {
        throw new Error(
          `Resolver ${resolverClass.name} has constructor parameters. Instantiate it manually in buildResolverContainer.`,
        );
      }

      return new resolverClass();
    },
  };
}
