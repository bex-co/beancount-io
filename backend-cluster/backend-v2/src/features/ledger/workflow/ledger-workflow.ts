import { type AppConfig } from "@/config/config";
import { type DbExecutor } from "@/drizzle/drizzle";
import { type IModels } from "@/foundation/models";
import { type IStripeService } from "@/features/stripe/service/stripe-service";
import { type ILedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { type IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { type IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import {
  LedgerCreate,
  LedgerCreateFileOptions,
  LedgerUpdateFileOptions,
  LedgerDeleteFileOptions,
  LedgerChangeFilesOptions,
  LedgerChangeFileOperation,
  LedgerUpdate,
  unwrapFavaResponse,
  FavaApiClient,
} from "@/foundation/fava";
import { type IPlaidClient } from "@/features/plaid/service/plaid-client";
import { decryptToken } from "@/features/plaid/utils/encryption";
import {
  defaultLedgerTemplate,
  ledgerWithMultipleFilesTemplate,
} from "@/features/ledger/utils/ledger-template";
import { parseLedgerId } from "@/shared/str";
import { lock, LOCK_KEYS } from "@/shared/lock";
import {
  directiveLimitExemptParams,
} from "@/features/ledger/operations/directive-limit-bypass";
import { FavaLedgerPublic } from "@/features/ledger/types/fava-api.types";
import {
  mapToLedger,
  mapToLedgerFileContent,
} from "@/features/ledger/utils/mappers";
import {
  CreateLedgerCommand,
  UpdateLedgerCommand,
  CreateLedgerFileCommand,
  UpdateLedgerFileCommand,
  DeleteLedgerFileCommand,
  RenameLedgerFileCommand,
  ListLedgersParams,
  SearchLedgersParams,
  GetLedgerFileParams,
  GetLedgerDirContentParams,
  LedgerData,
  LedgerWithDirectiveCountData,
  LedgerFileData,
  DeleteLedgerResult,
  DeleteLedgerFileResult,
  RenameLedgerFileResult,
  StarLedgerResult,
  LedgerAttributesData,
  LedgerOptionsData,
  FavaOptionsData,
  BcioOptionsData,
  LedgerTemplate,
} from "./ledger-workflow.types";
import { createLedger as createLedgerOperation } from "@/features/ledger/operations/create-ledger";
import { BadUserInputError, InternalServerError } from "@/shared/errors";
import { operationNotAllowedFromCause } from "@/features/ledger/utils/operation-not-allowed-from-cause";
import { filterNullish } from "@/shared/tools";
import { processBatch } from "@/shared/batch-processor";
import { logger } from "@/shared/logger";
import { trustedIdentity } from "@/server/api/identity";

const workflowLogger = logger.child({ module: "ledger-workflow" });

// Each miss is a real git clone + beancount parse (see beancount-ledger-v2's
// load-cached-ledger-file-map.ts), so directive-count fan-out stays deliberately narrow.
const OWNED_LEDGERS_PAGE_SIZE = 50;
const DIRECTIVE_COUNT_CONCURRENCY = 3;

/**
 * Orchestration for the ledger feature. Owns the cross-service coordination the
 * ledger resolvers used to inline (Fava client provisioning, tier checks,
 * locking, DTO mapping) so the resolvers become thin transport adapters.
 *
 * Dependencies are narrow injected interfaces (no `IService`); request data
 * (`userId`) is passed per method. See backend-v2/CLAUDE.md "Workflow layer".
 */
export interface ILedgerWorkflow {
  createLedger(params: {
    userId: string;
    input: CreateLedgerCommand;
  }): Promise<LedgerData>;
  updateLedger(params: {
    userId: string;
    ledgerId: string;
    input: UpdateLedgerCommand;
  }): Promise<LedgerData>;
  deleteLedger(params: {
    userId: string;
    ledgerId: string;
  }): Promise<DeleteLedgerResult>;
  createLedgerFile(params: {
    userId: string;
    ledgerId: string;
    input: CreateLedgerFileCommand;
    platform: "web" | "mobile";
  }): Promise<LedgerFileData>;
  updateLedgerFile(params: {
    userId: string;
    ledgerId: string;
    input: UpdateLedgerFileCommand;
    platform: "web" | "mobile";
  }): Promise<LedgerFileData>;
  deleteLedgerFile(params: {
    userId: string;
    ledgerId: string;
    input: DeleteLedgerFileCommand;
  }): Promise<DeleteLedgerFileResult>;
  renameLedgerFile(params: {
    userId: string;
    ledgerId: string;
    input: RenameLedgerFileCommand;
  }): Promise<RenameLedgerFileResult>;
  starLedger(params: {
    userId: string;
    ledgerId: string;
  }): Promise<StarLedgerResult>;
  unstarLedger(params: {
    userId: string;
    ledgerId: string;
  }): Promise<StarLedgerResult>;

  listLedgers(params: {
    userId: string;
    args: ListLedgersParams;
  }): Promise<LedgerData[]>;
  listUserOwnedLedgers(params: {
    userId: string;
    args: ListLedgersParams;
  }): Promise<LedgerData[]>;
  listUserOwnedLedgersWithDirectiveCounts(params: {
    userId: string;
  }): Promise<LedgerWithDirectiveCountData[]>;
  searchLedgers(params: {
    userId: string;
    args: SearchLedgersParams;
  }): Promise<LedgerData[]>;
  getLedger(params: { ledgerId: string; userId?: string }): Promise<LedgerData>;
  getLedgerFile(params: {
    ledgerId: string;
    userId?: string;
    args: GetLedgerFileParams;
  }): Promise<LedgerFileData | null>;
  getLedgerDirContent(params: {
    ledgerId: string;
    userId?: string;
    args: GetLedgerDirContentParams;
  }): Promise<LedgerFileData[]>;
  getLedgerAttributes(params: {
    ledgerId: string;
    userId?: string;
  }): Promise<LedgerAttributesData>;
  getLedgerOptions(params: {
    ledgerId: string;
    userId?: string;
  }): Promise<LedgerOptionsData>;
  getLedgerFavaOptions(params: {
    ledgerId: string;
    userId?: string;
  }): Promise<FavaOptionsData>;
  getLedgerBcioOptions(params: {
    ledgerId: string;
    userId?: string;
  }): Promise<BcioOptionsData>;
  isLedgerStarred(params: {
    ledgerId: string;
    userId?: string;
  }): Promise<boolean | undefined>;
}

export class LedgerWorkflow implements ILedgerWorkflow {
  constructor(
    private readonly favaClientFactory: IFavaClientFactory,
    private readonly giteaClientFactory: IGiteaClientFactory,
    private readonly plaidClient: IPlaidClient,
    private readonly stripe: IStripeService,
    private readonly ledgerDataService: ILedgerDataService,
    private readonly models: Pick<
      IModels,
      "user" | "paidCustomer" | "plaidItem"
    >,
    private readonly db: DbExecutor,
    private readonly config: Pick<AppConfig, "gitea">,
  ) {}

  // --- Mutations ---------------------------------------------------------

  async createLedger({
    userId,
    input,
  }: {
    userId: string;
    input: CreateLedgerCommand;
  }): Promise<LedgerData> {
    const ledgerCreate: LedgerCreate = {
      name: input.name,
      description: input.description,
      private: input.private,
      files:
        input.template === LedgerTemplate.SAMPLE
          ? ledgerWithMultipleFilesTemplate
          : defaultLedgerTemplate,
    };

    const lockKey = LOCK_KEYS.LEDGER.create(userId);
    return lock.acquire(lockKey, async () => {
      const { favaApiClient } =
        await this.favaClientFactory.getApiContext(userId);

      // Tier enforcement + Fava ledger creation lives in the cross-service
      // operation (still shared with the auth signup flow); the workflow owns
      // the lock + client provisioning around it.
      return createLedgerOperation({
        favaApiClient,
        models: this.models,
        postgresDb: this.db,
        stripe: this.stripe,
        config: this.config,
        ledgerCreate,
        userId,
      });
    });
  }

  async updateLedger({
    userId,
    ledgerId,
    input,
  }: {
    userId: string;
    ledgerId: string;
    input: UpdateLedgerCommand;
  }): Promise<LedgerData> {
    const ledgerUpdate: LedgerUpdate = {
      name: input.name,
      description: input.description,
      private: input.private,
    };
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const data = await unwrapFavaResponse(
      favaApiClient.ledgers.updateLedger(ledgerOwner, ledgerName, ledgerUpdate),
      "update ledger",
    );

    if (!data) {
      throw new InternalServerError("Failed to update ledger");
    }

    return mapToLedger(data as FavaLedgerPublic, this.config.gitea);
  }

  async deleteLedger({
    userId,
    ledgerId,
  }: {
    userId: string;
    ledgerId: string;
  }): Promise<DeleteLedgerResult> {
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);

    // Resolve the numeric Gitea repo id (the FK plaid_items.ledger_repo_id
    // uses) while the repo still exists — getLedger 404s once it's gone, so
    // this must happen before the delete call below. Best-effort: a failure
    // here only skips local Plaid cleanup, it must not block ledger deletion
    // itself (which never depended on this lookup before).
    const ledgerRepoId = await this.resolveLedgerRepoId(
      favaApiClient,
      ledgerOwner,
      ledgerName,
    );

    if (ledgerRepoId !== null) {
      await this.revokePlaidAccessForLedger(ledgerRepoId, ledgerId);
    }

    await this.db.transaction(async (tx) => {
      if (ledgerRepoId !== null) {
        await this.models.plaidItem.deleteByLedgerRepoId(tx, ledgerRepoId);
      }
      await unwrapFavaResponse(
        favaApiClient.ledgers.deleteLedger(ledgerOwner, ledgerName),
        "delete ledger",
      );
    });

    return { ledgerId };
  }

  private async resolveLedgerRepoId(
    favaApiClient: FavaApiClient,
    ledgerOwner: string,
    ledgerName: string,
  ): Promise<number | null> {
    try {
      const data = await unwrapFavaResponse(
        favaApiClient.ledgers.getLedger(ledgerOwner, ledgerName),
        "get ledger",
      );
      return data.id;
    } catch (error) {
      workflowLogger.warn(
        "Failed to resolve ledgerRepoId before ledger delete; skipping local Plaid cleanup",
        { ledgerOwner, ledgerName, error },
      );
      return null;
    }
  }

  private async revokePlaidAccessForLedger(
    ledgerRepoId: number,
    ledgerId: string,
  ): Promise<void> {
    const items = await this.models.plaidItem.getByLedgerRepoId(
      this.db,
      ledgerRepoId,
    );
    if (items.length === 0) {
      return;
    }
    await Promise.allSettled(
      items.map(async (item) => {
        try {
          await this.plaidClient.removeItem(decryptToken(item.accessToken));
        } catch (error) {
          workflowLogger.warn(
            "Failed to remove Plaid Item during ledger deletion (may already be removed)",
            { ledgerId, ledgerRepoId, itemId: item.id, error },
          );
        }
      }),
    );
  }

  async createLedgerFile({
    userId,
    ledgerId,
    input,
    platform,
  }: {
    userId: string;
    ledgerId: string;
    input: CreateLedgerFileCommand;
    platform: "web" | "mobile";
  }): Promise<LedgerFileData> {
    const fileOptions: LedgerCreateFileOptions = {
      path: input.path,
      content: input.content,
      message: input.message,
    };
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const data = await unwrapFavaResponse(
      favaApiClient.ledgers.createLedgerFile(
        ledgerOwner,
        ledgerName,
        fileOptions,
        directiveLimitExemptParams(platform),
      ),
      "create ledger file",
      (cause) => operationNotAllowedFromCause("create ledger file", cause),
    );

    return mapToLedgerFileContent(data);
  }

  async updateLedgerFile({
    userId,
    ledgerId,
    input,
    platform,
  }: {
    userId: string;
    ledgerId: string;
    input: UpdateLedgerFileCommand;
    platform: "web" | "mobile";
  }): Promise<LedgerFileData> {
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const fileOptions: LedgerUpdateFileOptions = {
      path: input.path,
      content: input.content,
      sha: input.sha,
      message: input.message,
    };
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const data = await unwrapFavaResponse(
      favaApiClient.ledgers.updateLedgerFile(
        ledgerOwner,
        ledgerName,
        fileOptions,
        directiveLimitExemptParams(platform),
      ),
      "update ledger file",
      (cause) => operationNotAllowedFromCause("update ledger file", cause),
    );

    return mapToLedgerFileContent(data);
  }

  async deleteLedgerFile({
    userId,
    ledgerId,
    input,
  }: {
    userId: string;
    ledgerId: string;
    input: DeleteLedgerFileCommand;
  }): Promise<DeleteLedgerFileResult> {
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    if (input.path === "") {
      throw new BadUserInputError("Path is required");
    }
    if (input.path === "main.bean") {
      throw new BadUserInputError("main.bean file cannot be deleted");
    }

    const fileOptions: LedgerDeleteFileOptions = {
      path: input.path,
      sha: input.sha,
      message: input.message,
    };
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    await unwrapFavaResponse(
      favaApiClient.ledgers.deleteLedgerFile(
        ledgerOwner,
        ledgerName,
        fileOptions,
      ),
      "delete ledger file",
      (cause) => operationNotAllowedFromCause("delete ledger file", cause),
    );

    return { path: input.path };
  }

  async renameLedgerFile({
    userId,
    ledgerId,
    input,
  }: {
    userId: string;
    ledgerId: string;
    input: RenameLedgerFileCommand;
  }): Promise<RenameLedgerFileResult> {
    const changeOptions: LedgerChangeFilesOptions = {
      files: [
        {
          operation: "create",
          path: input.newPath,
          from_path: input.oldPath,
        } satisfies LedgerChangeFileOperation,
      ],
      message: input.message,
    };
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    await unwrapFavaResponse(
      favaApiClient.ledgers.changeLedgerFiles(
        ledgerOwner,
        ledgerName,
        changeOptions,
      ),
      "rename ledger file",
      (cause) => operationNotAllowedFromCause("rename ledger file", cause),
    );

    return { newPath: input.newPath, oldPath: input.oldPath };
  }

  async starLedger({
    userId,
    ledgerId,
  }: {
    userId: string;
    ledgerId: string;
  }): Promise<StarLedgerResult> {
    try {
      const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
      const giteaClient =
        await this.giteaClientFactory.getUserApiClient(userId);

      await giteaClient.user.userCurrentPutStar(ledgerOwner, ledgerName, {
        format: "json",
      });

      return {
        success: true,
        isStarred: true,
        message: `Successfully starred ${ledgerOwner}/${ledgerName}`,
      };
    } catch (error) {
      workflowLogger.error("Failed to star ledger", { ledgerId, error });
      return {
        success: false,
        isStarred: false,
        message: `Failed to star ledger`,
      };
    }
  }

  async unstarLedger({
    userId,
    ledgerId,
  }: {
    userId: string;
    ledgerId: string;
  }): Promise<StarLedgerResult> {
    try {
      const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
      const giteaClient =
        await this.giteaClientFactory.getUserApiClient(userId);

      await giteaClient.user.userCurrentDeleteStar(ledgerOwner, ledgerName, {
        format: "json",
      });

      return {
        success: true,
        isStarred: false,
        message: `Successfully unstarred ${ledgerOwner}/${ledgerName}`,
      };
    } catch (error) {
      workflowLogger.error("Failed to unstar ledger", { ledgerId, error });
      return {
        success: false,
        isStarred: true,
        message: `Failed to unstar ledger`,
      };
    }
  }

  // --- Queries -----------------------------------------------------------

  async listLedgers({
    userId,
    args,
  }: {
    userId: string;
    args: ListLedgersParams;
  }): Promise<LedgerData[]> {
    const { favaApiClient } =
      await this.favaClientFactory.getApiContext(userId);
    const data = await unwrapFavaResponse(
      favaApiClient.ledgers.listLedgers({ page: args.page, limit: args.limit }),
      "list ledgers",
    );

    return data.map((ledger) =>
      mapToLedger(ledger as FavaLedgerPublic, this.config.gitea),
    );
  }

  async listUserOwnedLedgers({
    userId,
    args,
  }: {
    userId: string;
    args: ListLedgersParams;
  }): Promise<LedgerData[]> {
    const { favaApiClient, favaUser } =
      await this.favaClientFactory.getApiContext(userId);
    const data = await unwrapFavaResponse(
      favaApiClient.ledgers.listUserLedgers(favaUser.username, {
        page: args.page,
        limit: args.limit,
      }),
      "list ledgers",
    );

    return data.map((ledger) =>
      mapToLedger(ledger as FavaLedgerPublic, this.config.gitea),
    );
  }

  async listUserOwnedLedgersWithDirectiveCounts({
    userId,
  }: {
    userId: string;
  }): Promise<LedgerWithDirectiveCountData[]> {
    const ledgers: LedgerData[] = [];
    let page = 1;
    for (;;) {
      const pageResult = await this.listUserOwnedLedgers({
        userId,
        args: { page, limit: OWNED_LEDGERS_PAGE_SIZE },
      });
      ledgers.push(...pageResult);
      if (pageResult.length < OWNED_LEDGERS_PAGE_SIZE) break;
      page += 1;
    }

    // Empty ledgers have nothing to parse — skip the Fava call entirely.
    const nonEmptyLedgers = ledgers.filter((ledger) => !ledger.empty);
    const { results, errors } = await processBatch(
      nonEmptyLedgers,
      async (ledger) => {
        const counts = await this.ledgerDataService.getEntriesCountPerType({
          ledgerId: ledger.id,
          identity: trustedIdentity(userId),
        });
        return {
          ledgerId: ledger.id,
          directiveCount: counts.reduce((sum, c) => sum + c.number, 0),
        };
      },
      { batchSize: DIRECTIVE_COUNT_CONCURRENCY },
    );

    for (const { index, error } of errors) {
      workflowLogger.warn("Failed to get directive count for ledger", {
        ledgerId: nonEmptyLedgers[index].id,
        userId,
        error,
      });
    }

    const directiveCountByLedgerId = new Map(
      results.map((r) => [r.ledgerId, r.directiveCount]),
    );

    return ledgers.map((ledger) => ({
      ...ledger,
      directiveCount: ledger.empty
        ? 0
        : (directiveCountByLedgerId.get(ledger.id) ?? null),
    }));
  }

  async searchLedgers({
    userId,
    args,
  }: {
    userId: string;
    args: SearchLedgersParams;
  }): Promise<LedgerData[]> {
    const query = filterNullish({
      q: args.q,
      topic: args.topic,
      include_desc: args.includeDesc,
      uid: args.uid,
      priority_owner_id: args.priorityOwnerId,
      team_id: args.teamId,
      starred_by: args.starredBy,
      private: args.private,
      is_private: args.isPrivate,
      template: args.template,
      archived: args.archived,
      mode: args.mode,
      exclusive: args.exclusive,
      sort: args.sort,
      order: args.order,
      page: args.page,
      limit: args.limit,
    });
    const { favaApiClient } =
      await this.favaClientFactory.getApiContext(userId);

    const results = await unwrapFavaResponse(
      favaApiClient.ledgers.searchLedgers(query),
      "search ledgers",
    );

    if (!results.data) {
      return [];
    }

    return results.data.map((ledger) =>
      mapToLedger(ledger as FavaLedgerPublic, this.config.gitea),
    );
  }

  async getLedger({
    ledgerId,
    userId,
  }: {
    ledgerId: string;
    userId?: string;
  }): Promise<LedgerData> {
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const data = await unwrapFavaResponse(
      favaApiClient.ledgers.getLedger(ledgerOwner, ledgerName),
      "get ledger",
    );

    const ledger = mapToLedger(data as FavaLedgerPublic, this.config.gitea);
    // The public client authenticates as the ledger owner, so Gitea returns the
    // owner's permissions. Strip them so the viewer doesn't see owner-level access.
    if (!userId) {
      return { ...ledger, permissions: undefined };
    }
    return ledger;
  }

  async getLedgerFile({
    ledgerId,
    userId,
    args,
  }: {
    ledgerId: string;
    userId?: string;
    args: GetLedgerFileParams;
  }): Promise<LedgerFileData | null> {
    try {
      const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
      const favaApiClient = await this.favaClientFactory.getPublicApiClient(
        ledgerId,
        userId,
      );
      const data = await unwrapFavaResponse(
        favaApiClient.ledgers.getLedgerFile(ledgerOwner, ledgerName, {
          path: args.path,
        }),
        "get ledger file",
      );

      if (!data) {
        return null;
      }

      return mapToLedgerFileContent(data);
    } catch (error) {
      throw new InternalServerError(
        `Failed to get ledger file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  async getLedgerDirContent({
    ledgerId,
    userId,
    args,
  }: {
    ledgerId: string;
    userId?: string;
    args: GetLedgerDirContentParams;
  }): Promise<LedgerFileData[]> {
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);

    const data = await unwrapFavaResponse(
      favaApiClient.ledgers.getLedgerDirContent(
        ledgerOwner,
        ledgerName,
        filterNullish({ dir_path: args.dirPath }),
      ),
      "get ledger directory content",
    );

    return data.map(mapToLedgerFileContent);
  }

  async getLedgerAttributes({
    ledgerId,
    userId,
  }: {
    ledgerId: string;
    userId?: string;
  }): Promise<LedgerAttributesData> {
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const data = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerAttributes(ledgerOwner, ledgerName),
      "get ledger filter options",
    );

    return {
      accounts: data.accounts,
      tags: data.tags,
      years: data.years,
      links: data.links,
      payees: data.payees,
      currencies: data.currencies,
    };
  }

  async getLedgerOptions({
    ledgerId,
    userId,
  }: {
    ledgerId: string;
    userId?: string;
  }): Promise<LedgerOptionsData> {
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const data = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerOptions(ledgerOwner, ledgerName),
      "get ledger options",
    );

    return {
      title: data.title,
      nameAssets: data.name_assets,
      nameEquity: data.name_equity,
      nameExpenses: data.name_expenses,
      nameIncome: data.name_income,
      nameLiabilities: data.name_liabilities,
      accountCurrentConversions: data.account_current_conversions,
      accountCurrentEarnings: data.account_current_earnings,
      renderCommas: data.render_commas,
      operatingCurrency: data.operating_currency,
    };
  }

  async getLedgerFavaOptions({
    ledgerId,
    userId,
  }: {
    ledgerId: string;
    userId?: string;
  }): Promise<FavaOptionsData> {
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const data = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerFavaOptions(ledgerOwner, ledgerName),
      "get ledger fava options",
    );

    return {
      accountJournalIncludeChildren: data.account_journal_include_children,
      autoReload: data.auto_reload,
      collapsePattern: data.collapse_pattern,
      conversionCurrencies: data.conversion_currencies,
      currencyColumn: data.currency_column,
      defaultPage: data.default_page,
      fiscalYearEnd: {
        month: data.fiscal_year_end.month,
        day: data.fiscal_year_end.day,
      },
      indent: data.indent,
      invertIncomeLiabilitiesEquity: data.invert_income_liabilities_equity,
      language: data.language ?? null,
      locale: data.locale ?? null,
      showAccountsWithZeroBalance: data.show_accounts_with_zero_balance,
      showAccountsWithZeroTransactions:
        data.show_accounts_with_zero_transactions,
      showClosedAccounts: data.show_closed_accounts,
      sidebarShowQueries: data.sidebar_show_queries,
      unrealized: data.unrealized,
      upcomingEvents: data.upcoming_events,
      uptodateIndicatorGreyLookbackDays:
        data.uptodate_indicator_grey_lookback_days,
      useExternalEditor: data.use_external_editor,
    };
  }

  async getLedgerBcioOptions({
    ledgerId,
    userId,
  }: {
    ledgerId: string;
    userId?: string;
  }): Promise<BcioOptionsData> {
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const data = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerBcioOptions(ledgerOwner, ledgerName),
      "get ledger beancountio options",
    );

    return {
      defaultFile: data.default_file,
      transactionFile: data.transaction_file ?? null,
      accountFile: data.account_file ?? null,
      priceFile: data.price_file ?? null,
      balanceFile: data.balance_file ?? null,
      noteFile: data.note_file ?? null,
      padFile: data.pad_file ?? null,
      budgetFile: data.budget_file ?? null,
      receiptBaseFolder: data.receipt_base_folder ?? null,
      receiptStorage: data.receipt_storage ?? null,
      documentFile: data.document_file ?? null,
    };
  }

  async isLedgerStarred({
    ledgerId,
    userId,
  }: {
    ledgerId: string;
    userId?: string;
  }): Promise<boolean | undefined> {
    // Only check if the user is authenticated.
    if (!userId) {
      return undefined;
    }

    try {
      const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
      const giteaClient =
        await this.giteaClientFactory.getUserApiClient(userId);
      const response = await giteaClient.user.userCurrentCheckStarring(
        ledgerOwner,
        ledgerName,
        { format: "json" },
      );
      // 204 = starred, 404 = not starred
      return response.status === 204;
    } catch {
      // If error (likely 404), ledger is not starred.
      return false;
    }
  }
}
