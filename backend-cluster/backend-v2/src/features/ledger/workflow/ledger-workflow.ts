import { enhanceLegacyJournal } from "@/features/ledger/utils/legacy-journal";
import type {
  LegacyJournalQuery,
  LegacyJournalResult,
} from "./ledger-workflow.types";
import { resolveLegacyLedgerId } from "@/features/ledger/utils/resolve-legacy-ledger";
import type { BeancountOptionsPublic } from "@/foundation/fava";
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
import { directiveLimitExemptParams } from "@/features/ledger/operations/directive-limit-bypass";
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
import { systemIdentity, type Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  anonymousPrincipal,
  ledgerResource,
  type IAuthorizationService,
  userResource,
} from "@/server/api/authorization";
import { assertSafeRepoPath } from "@/features/ledger/utils/safe-repo-path";
import { decodeFileContent } from "@/shared/file-content";

const workflowLogger = logger.child({ module: "ledger-workflow" });

// Each miss is a real git clone + beancount parse (see beancount-ledger-v2's
// load-cached-ledger-file-map.ts), so directive-count fan-out stays deliberately narrow.
const OWNED_LEDGERS_PAGE_SIZE = 50;
const DIRECTIVE_COUNT_CONCURRENCY = 3;

function includeTargetOf(line: string): string | null {
  const match = line.match(/^\s*include\s+(?:"([^"]+)"|'([^']+)'|(\S+))\s*(;.*)?$/);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function matchesIncludeLine(line: string, oldPath: string): boolean {
  return includeTargetOf(line) === oldPath;
}

function rewriteIncludeLine(line: string, oldPath: string, newPath: string): string {
  const match = line.match(
    /^(\s*include\s+)(?:"([^"]+)"|'([^']+)'|(\S+))(\s*(;.*)?)$/,
  );
  if (!match) return line;
  const target = match[2] ?? match[3] ?? match[4];
  if (target !== oldPath) return line;
  const quote = match[2] !== undefined ? '"' : match[3] !== undefined ? "'" : "";
  return `${match[1]}${quote}${newPath}${quote}${match[5] ?? ""}`;
}

/**
 * Orchestration for the ledger feature. Owns the cross-service coordination the
 * ledger resolvers used to inline (Fava client provisioning, tier checks,
 * locking, DTO mapping) so the resolvers become thin transport adapters.
 *
 * Dependencies are narrow injected interfaces (no `IService`); request data
 * (`userId`) is passed per method. See backend-v2/CLAUDE.md "Workflow layer".
 */
export interface LegacyLedgerMetadata {
  success: boolean;
  data: {
    accounts: string[];
    currencies: string[];
    errors: number;
    options: Pick<
      BeancountOptionsPublic,
      | "name_assets"
      | "name_equity"
      | "name_expenses"
      | "name_income"
      | "name_liabilities"
      | "operating_currency"
    >;
  };
}

export interface ILedgerWorkflow {
  getLegacyJournal(params: {
    identity: Identity;
    args: LegacyJournalQuery;
  }): Promise<LegacyJournalResult>;
  getLegacyMetadata(params: {
    identity: Identity;
    ledgerId?: string | null;
  }): Promise<LegacyLedgerMetadata>;
  createLedger(params: {
    identity: Identity;
    input: CreateLedgerCommand;
  }): Promise<LedgerData>;
  updateLedger(params: {
    identity: Identity;
    ledgerId: string;
    input: UpdateLedgerCommand;
  }): Promise<LedgerData>;
  deleteLedger(params: {
    identity: Identity;
    ledgerId: string;
  }): Promise<DeleteLedgerResult>;
  createLedgerFile(params: {
    identity: Identity;
    ledgerId: string;
    input: CreateLedgerFileCommand;
    platform: "web" | "mobile";
  }): Promise<LedgerFileData>;
  updateLedgerFile(params: {
    identity: Identity;
    ledgerId: string;
    input: UpdateLedgerFileCommand;
    platform: "web" | "mobile";
  }): Promise<LedgerFileData>;
  deleteLedgerFile(params: {
    identity: Identity;
    ledgerId: string;
    input: DeleteLedgerFileCommand;
  }): Promise<DeleteLedgerFileResult>;
  renameLedgerFile(params: {
    identity: Identity;
    ledgerId: string;
    input: RenameLedgerFileCommand;
  }): Promise<RenameLedgerFileResult>;
  starLedger(params: {
    identity: Identity;
    ledgerId: string;
  }): Promise<StarLedgerResult>;
  unstarLedger(params: {
    identity: Identity;
    ledgerId: string;
  }): Promise<StarLedgerResult>;

  listLedgers(params: {
    identity: Identity;
    args: ListLedgersParams;
  }): Promise<LedgerData[]>;
  listUserOwnedLedgers(params: {
    identity: Identity;
    args: ListLedgersParams;
  }): Promise<LedgerData[]>;
  /**
   * Support-only: the admin REST surface asks this about an arbitrary user by
   * email, so `userId` is the *subject*, not the caller — there is no caller
   * identity to thread and the per-ledger counts authorize as `systemIdentity`
   * for that subject. Do not reach for this from a request-backed path; those
   * have a real `Identity` and should carry it.
   */
  listUserOwnedLedgersWithDirectiveCounts(params: {
    userId: string;
  }): Promise<LedgerWithDirectiveCountData[]>;
  searchLedgers(params: {
    identity: Identity;
    args: SearchLedgersParams;
  }): Promise<LedgerData[]>;
  getLedger(params: {
    ledgerId: string;
    identity?: Identity;
  }): Promise<LedgerData>;
  getLedgerFile(params: {
    ledgerId: string;
    identity?: Identity;
    args: GetLedgerFileParams;
  }): Promise<LedgerFileData | null>;
  getLedgerDirContent(params: {
    ledgerId: string;
    identity?: Identity;
    args: GetLedgerDirContentParams;
  }): Promise<LedgerFileData[]>;
  getLedgerAttributes(params: {
    ledgerId: string;
    identity?: Identity;
  }): Promise<LedgerAttributesData>;
  getLedgerOptions(params: {
    ledgerId: string;
    identity?: Identity;
  }): Promise<LedgerOptionsData>;
  getLedgerFavaOptions(params: {
    ledgerId: string;
    identity?: Identity;
  }): Promise<FavaOptionsData>;
  getLedgerBcioOptions(params: {
    ledgerId: string;
    identity?: Identity;
  }): Promise<BcioOptionsData>;
  isLedgerStarred(params: {
    ledgerId: string;
    identity?: Identity;
  }): Promise<boolean | undefined>;
}

/** The credential-pin disclosure ceiling: a pinned credential sees only its ledger. */
const restrictToPin = <L extends { fullName: string }>(
  identity: Identity,
  ledgers: L[],
): L[] =>
  identity.ledgerScope
    ? ledgers.filter((ledger) => ledger.fullName === identity.ledgerScope)
    : ledgers;

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
    private readonly authorization: IAuthorizationService,
  ) {}

  private async authorizeContent(
    identity: Identity | undefined,
    ledgerId: string,
    action:
      | typeof AUTHORIZATION_ACTIONS.LEDGER_METADATA_READ
      | typeof AUTHORIZATION_ACTIONS.LEDGER_REPORTS_READ
      | typeof AUTHORIZATION_ACTIONS.LEDGER_FILES_READ,
  ): Promise<void> {
    await this.authorization.authorizeOrThrow({
      principal: identity ?? anonymousPrincipal(),
      action,
      resource: ledgerResource(ledgerId),
    });
  }

  async getLegacyMetadata({
    identity,
    ledgerId,
  }: {
    identity: Identity;
    ledgerId?: string | null;
  }): Promise<LegacyLedgerMetadata> {
    const target = await resolveLegacyLedgerId(
      this.favaClientFactory,
      this.authorization,
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_METADATA_READ,
    );
    const client = await this.favaClientFactory.getPublicApiClient(
      target,
      identity.userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(target);
    const [options, attributes, errors] = await Promise.all([
      unwrapFavaResponse(
        client.reports.getLedgerOptions(ledgerOwner, ledgerName),
        "get the ledger data",
      ),
      unwrapFavaResponse(
        client.reports.getLedgerAttributes(ledgerOwner, ledgerName),
        "get the ledger data",
      ),
      unwrapFavaResponse(
        client.reports.getLedgerErrors(ledgerOwner, ledgerName),
        "get the ledger data",
      ),
    ]);
    return {
      success: true,
      data: {
        accounts: attributes.accounts,
        currencies: attributes.currencies,
        errors: errors.length,
        options: {
          name_assets: options.name_assets,
          name_equity: options.name_equity,
          name_expenses: options.name_expenses,
          name_income: options.name_income,
          name_liabilities: options.name_liabilities,
          operating_currency: options.operating_currency,
        },
      },
    };
  }

  async getLegacyJournal({
    identity,
    args,
  }: {
    identity: Identity;
    args: LegacyJournalQuery;
  }): Promise<LegacyJournalResult> {
    const userId = identity.userId;
    const ledgerId = await resolveLegacyLedgerId(
      this.favaClientFactory,
      this.authorization,
      identity,
      undefined,
      AUTHORIZATION_ACTIONS.LEDGER_JOURNAL_READ,
    );
    const { ledgerOwner, ledgerName: repoName } = parseLedgerId(ledgerId);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const query = {
      first: args.first,
      after: args.after,
      last: args.last,
      before: args.before,
      detailed: args.detailed,
      search_query: args.searchQuery,
      account_filter: args.accountFilter,
      amount_min: args.amountMin,
      amount_max: args.amountMax,
      entry_types: args.entryTypes?.join(","),
      sort_by: args.sortBy,
      sort_order: args.sortOrder,
      group_by: args.groupBy,
    };

    const resp = await favaApiClient.legacy.getLegacyJournal(
      ledgerOwner,
      repoName,
      query,
    );

    await unwrapFavaResponse(resp, "get the legacy journal");
    const result = resp.data as {
      data: Parameters<typeof enhanceLegacyJournal>[0];
    };
    return enhanceLegacyJournal(result.data, args);
  }

  // --- Mutations ---------------------------------------------------------

  async createLedger({
    identity,
    input,
  }: {
    identity: Identity;
    input: CreateLedgerCommand;
  }): Promise<LedgerData> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_CREATE,
      resource: userResource(identity.userId),
    });
    const userId = identity.userId;
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
    identity,
    ledgerId,
    input,
  }: {
    identity: Identity;
    ledgerId: string;
    input: UpdateLedgerCommand;
  }): Promise<LedgerData> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_ADMINISTRATION_UPDATE,
      resource: ledgerResource(ledgerId),
    });
    const userId = identity.userId;
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
    identity,
    ledgerId,
  }: {
    identity: Identity;
    ledgerId: string;
  }): Promise<DeleteLedgerResult> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_ADMINISTRATION_DELETE,
      resource: ledgerResource(ledgerId),
    });
    const userId = identity.userId;
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
    identity,
    ledgerId,
    input,
    platform,
  }: {
    identity: Identity;
    ledgerId: string;
    input: CreateLedgerFileCommand;
    platform: "web" | "mobile";
  }): Promise<LedgerFileData> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_FILES_WRITE,
      resource: ledgerResource(ledgerId),
    });
    const userId = identity.userId;
    assertSafeRepoPath(input.path);
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
    identity,
    ledgerId,
    input,
    platform,
  }: {
    identity: Identity;
    ledgerId: string;
    input: UpdateLedgerFileCommand;
    platform: "web" | "mobile";
  }): Promise<LedgerFileData> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_FILES_WRITE,
      resource: ledgerResource(ledgerId),
    });
    const userId = identity.userId;
    assertSafeRepoPath(input.path);
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
    identity,
    ledgerId,
    input,
  }: {
    identity: Identity;
    ledgerId: string;
    input: DeleteLedgerFileCommand;
  }): Promise<DeleteLedgerFileResult> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_FILES_WRITE,
      resource: ledgerResource(ledgerId),
    });
    const userId = identity.userId;
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    assertSafeRepoPath(input.path);
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
    identity,
    ledgerId,
    input,
  }: {
    identity: Identity;
    ledgerId: string;
    input: RenameLedgerFileCommand;
  }): Promise<RenameLedgerFileResult> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_FILES_WRITE,
      resource: ledgerResource(ledgerId),
    });
    const userId = identity.userId;
    assertSafeRepoPath(input.oldPath, "oldPath");
    assertSafeRepoPath(input.newPath, "newPath");
    if (input.oldPath === input.newPath) {
      throw new BadUserInputError("oldPath and newPath are the same file");
    }
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);

    const oldFile = await unwrapFavaResponse(
      favaApiClient.ledgers.getLedgerFile(ledgerOwner, ledgerName, {
        path: input.oldPath,
      }),
      "read ledger file for rename",
      (cause) => operationNotAllowedFromCause("read ledger file for rename", cause),
    );
    if (!oldFile) {
      throw new BadUserInputError(`${input.oldPath}: file not found`);
    }
    const existingTarget = await unwrapFavaResponse(
      favaApiClient.ledgers.getLedgerFile(ledgerOwner, ledgerName, {
        path: input.newPath,
      }),
      "read ledger file for rename",
      (cause) => operationNotAllowedFromCause("read ledger file for rename", cause),
    );
    if (existingTarget) {
      throw new BadUserInputError(
        `${input.newPath}: file already exists; rename refused so ${input.oldPath} keeps its content`,
      );
    }

    // Find every `.bean`/`.beancount` file whose `include` line still points
    // at oldPath, so the rename either refuses or rewrites them in the same
    // commit instead of leaving a stale reference behind. This walks the whole
    // tree rather than trusting the entry-point-reachable set: an orphan file
    // nobody includes today breaks the day someone includes it.
    const beanFiles: string[] = [];
    const pendingDirs: (string | undefined)[] = [undefined];
    while (pendingDirs.length > 0) {
      const dir = pendingDirs.pop();
      const entries = await unwrapFavaResponse(
        favaApiClient.ledgers.getLedgerDirContent(ledgerOwner, ledgerName, {
          ...(dir === undefined ? {} : { dir_path: dir }),
        }),
        "list ledger files for rename",
        (cause) =>
          operationNotAllowedFromCause("list ledger files for rename", cause),
      );
      for (const entry of entries ?? []) {
        if (entry.type === "dir") pendingDirs.push(entry.path);
        else if (
          entry.type === "file" &&
          /\.(bean|beancount)$/.test(entry.path)
        )
          beanFiles.push(entry.path);
      }
    }
    let includingFiles: { path: string; content: string; sha: string }[] = [];
    const candidates = beanFiles.filter(
      (path) => path !== input.oldPath && path !== input.newPath,
    );
    if (candidates.length > 0) {
      const contents = await unwrapFavaResponse(
        favaApiClient.ledgers.getLedgerFilesContent(ledgerOwner, ledgerName, {
          files: candidates,
        }),
        "read ledger files for rename",
        (cause) => operationNotAllowedFromCause("read ledger files for rename", cause),
      );
      includingFiles = (contents ?? [])
        .map((file) => ({
          path: file.path,
          content: decodeFileContent(file),
          sha: file.sha,
        }))
        .filter(({ content }) =>
          content
            .split("\n")
            .some((line) => matchesIncludeLine(line, input.oldPath)),
        );
    }
    if (includingFiles.length > 0 && !input.updateIncludes) {
      const names = includingFiles.map((file) => file.path).join(", ");
      throw new BadUserInputError(
        `${input.oldPath} is still included by ${names}; pass updateIncludes: true to rewrite ${
          includingFiles.length === 1 ? "it" : "them"
        } in the same commit`,
        "updateIncludes",
        "Pass `updateIncludes: true` so the rename rewrites the `include` lines in the same commit.",
      );
    }

    const preservedContent =
      oldFile.encoding === "base64" && oldFile.content
        ? oldFile.content.replace(/\s/g, "")
        : Buffer.from(oldFile.content ?? "", "utf-8").toString("base64");
    const files: LedgerChangeFileOperation[] = [
      {
        operation: "create",
        path: input.newPath,
        content: preservedContent,
      },
      {
        operation: "delete",
        path: input.oldPath,
        sha: oldFile.sha,
      },
    ];
    const updatedIncludes: string[] = [];
    for (const including of includingFiles) {
      const rewritten = including.content
        .split("\n")
        .map((line) =>
          matchesIncludeLine(line, input.oldPath)
            ? rewriteIncludeLine(line, input.oldPath, input.newPath)
            : line,
        )
        .join("\n");
      if (rewritten === including.content) continue;
      files.push({
        operation: "update",
        path: including.path,
        content: Buffer.from(rewritten, "utf-8").toString("base64"),
        sha: including.sha,
      });
      updatedIncludes.push(including.path);
    }

    const changeOptions: LedgerChangeFilesOptions = {
      files,
      message: input.message ?? `Rename ${input.oldPath} → ${input.newPath}`,
    };
    await unwrapFavaResponse(
      favaApiClient.ledgers.changeLedgerFiles(
        ledgerOwner,
        ledgerName,
        changeOptions,
      ),
      "rename ledger file",
      (cause) => operationNotAllowedFromCause("rename ledger file", cause),
    );

    return {
      newPath: input.newPath,
      oldPath: input.oldPath,
      updatedIncludes,
    };
  }

  async starLedger({
    identity,
    ledgerId,
  }: {
    identity: Identity;
    ledgerId: string;
  }): Promise<StarLedgerResult> {
    let ledgerOwner: string;
    let ledgerName: string;
    try {
      ({ ledgerOwner, ledgerName } = parseLedgerId(ledgerId));
    } catch (error) {
      workflowLogger.error("Failed to star ledger", { ledgerId, error });
      return {
        success: false,
        isStarred: false,
        message: "Failed to star ledger",
      };
    }
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_CREATE,
      resource: ledgerResource(ledgerId),
    });
    try {
      const giteaClient = await this.giteaClientFactory.getUserApiClient(
        identity.userId,
      );

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
    identity,
    ledgerId,
  }: {
    identity: Identity;
    ledgerId: string;
  }): Promise<StarLedgerResult> {
    let ledgerOwner: string;
    let ledgerName: string;
    try {
      ({ ledgerOwner, ledgerName } = parseLedgerId(ledgerId));
    } catch (error) {
      workflowLogger.error("Failed to unstar ledger", { ledgerId, error });
      return {
        success: false,
        isStarred: true,
        message: "Failed to unstar ledger",
      };
    }
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_DELETE,
      resource: ledgerResource(ledgerId),
    });
    try {
      const giteaClient = await this.giteaClientFactory.getUserApiClient(
        identity.userId,
      );

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
    identity,
    args,
  }: {
    identity: Identity;
    args: ListLedgersParams;
  }): Promise<LedgerData[]> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_CATALOG_READ,
      resource: userResource(identity.userId),
    });
    // A pin remains a disclosure ceiling during discovery, on every adapter.
    // Resolve the target through the protected metadata path so revoked access
    // is checked here too. The one-item catalog has no later pages.
    if (identity.ledgerScope) {
      const ledger = await this.getLedger({
        identity,
        ledgerId: identity.ledgerScope,
      });
      return (args.page ?? 1) > 1 ? [] : [ledger];
    }
    const userId = identity.userId;
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
    identity,
    args,
  }: {
    identity: Identity;
    args: ListLedgersParams;
  }): Promise<LedgerData[]> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_CATALOG_READ,
      resource: userResource(identity.userId),
    });
    const userId = identity.userId;
    const { favaApiClient, favaUser } =
      await this.favaClientFactory.getApiContext(userId);
    const ledgers = await this.listUserOwnedLedgersPage(
      favaApiClient,
      favaUser.username,
      args,
    );
    return restrictToPin(identity, ledgers);
  }

  private async listUserOwnedLedgersPage(
    favaApiClient: FavaApiClient,
    username: string,
    args: ListLedgersParams,
  ): Promise<LedgerData[]> {
    const data = await unwrapFavaResponse(
      favaApiClient.ledgers.listUserLedgers(username, {
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
    const identity = systemIdentity(userId);
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_CATALOG_READ,
      resource: userResource(userId),
    });
    const { favaApiClient, favaUser } =
      await this.favaClientFactory.getApiContext(userId);
    const ledgers: LedgerData[] = [];
    let page = 1;
    for (;;) {
      const pageResult = await this.listUserOwnedLedgersPage(
        favaApiClient,
        favaUser.username,
        { page, limit: OWNED_LEDGERS_PAGE_SIZE },
      );
      ledgers.push(...pageResult);
      if (pageResult.length < OWNED_LEDGERS_PAGE_SIZE) break;
      page += 1;
    }

    // Empty ledgers have nothing to parse — skip the Fava call entirely.
    const nonEmptyLedgers = ledgers.filter((ledger) => !ledger.empty);
    const { results, errors } = await processBatch(
      nonEmptyLedgers,
      async (ledger) => {
        // No caller to authorize as: the admin endpoint above names the
        // subject by email. Exempt under a name that greps (w3/m9).
        const counts = await this.ledgerDataService.getEntriesCountPerType({
          ledgerId: ledger.id,
          identity,
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
    identity,
    args,
  }: {
    identity: Identity;
    args: SearchLedgersParams;
  }): Promise<LedgerData[]> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_CATALOG_READ,
      resource: userResource(identity.userId),
    });
    const userId = identity.userId;
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

    const ledgers = results.data.map((ledger) =>
      mapToLedger(ledger as FavaLedgerPublic, this.config.gitea),
    );
    return restrictToPin(identity, ledgers);
  }

  async getLedger({
    ledgerId,
    identity,
  }: {
    ledgerId: string;
    identity?: Identity;
  }): Promise<LedgerData> {
    await this.authorizeContent(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_METADATA_READ,
    );
    const userId = identity?.userId;
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
    // Public reads use an anonymous Gitea client. Strip permissions defensively
    // so a future upstream behavior change cannot expose an elevated view.
    if (!userId) {
      return { ...ledger, permissions: undefined };
    }
    return ledger;
  }

  async getLedgerFile({
    ledgerId,
    identity,
    args,
  }: {
    ledgerId: string;
    identity?: Identity;
    args: GetLedgerFileParams;
  }): Promise<LedgerFileData | null> {
    await this.authorizeContent(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_FILES_READ,
    );
    const userId = identity?.userId;
    assertSafeRepoPath(args.path);
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
    identity,
    args,
  }: {
    ledgerId: string;
    identity?: Identity;
    args: GetLedgerDirContentParams;
  }): Promise<LedgerFileData[]> {
    await this.authorizeContent(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_FILES_READ,
    );
    const userId = identity?.userId;
    if (args.dirPath !== null && args.dirPath !== undefined) {
      assertSafeRepoPath(args.dirPath, "dirPath");
    }
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
    identity,
  }: {
    ledgerId: string;
    identity?: Identity;
  }): Promise<LedgerAttributesData> {
    await this.authorizeContent(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_REPORTS_READ,
    );
    const userId = identity?.userId;
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
    identity,
  }: {
    ledgerId: string;
    identity?: Identity;
  }): Promise<LedgerOptionsData> {
    await this.authorizeContent(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_REPORTS_READ,
    );
    const userId = identity?.userId;
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
    identity,
  }: {
    ledgerId: string;
    identity?: Identity;
  }): Promise<FavaOptionsData> {
    await this.authorizeContent(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_REPORTS_READ,
    );
    const userId = identity?.userId;
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
    identity,
  }: {
    ledgerId: string;
    identity?: Identity;
  }): Promise<BcioOptionsData> {
    await this.authorizeContent(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_REPORTS_READ,
    );
    const userId = identity?.userId;
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
    identity,
  }: {
    ledgerId: string;
    identity?: Identity;
  }): Promise<boolean | undefined> {
    // Only check if the user is authenticated.
    if (!identity) {
      return undefined;
    }

    let ledgerOwner: string;
    let ledgerName: string;
    try {
      ({ ledgerOwner, ledgerName } = parseLedgerId(ledgerId));
    } catch {
      return false;
    }

    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_SOCIAL_STAR_STATUS_READ,
      resource: ledgerResource(ledgerId),
    });

    try {
      const giteaClient = await this.giteaClientFactory.getUserApiClient(
        identity.userId,
      );
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
