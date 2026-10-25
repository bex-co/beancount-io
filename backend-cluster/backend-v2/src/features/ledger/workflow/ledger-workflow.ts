import { isUtf8 } from "buffer";
import {
  assertNoPortableTwin,
  listingOf,
} from "@/features/ledger/utils/portable-twin";
import { enhanceLegacyJournal } from "@/features/ledger/utils/legacy-journal";
import type {
  LegacyJournalQuery,
  LegacyJournalResult,
} from "./ledger-workflow.types";
import { resolveLegacyLedgerId } from "@/features/ledger/utils/resolve-legacy-ledger";
import { assertAmountsFitEngineDecimal } from "@/features/ledger/utils/engine-decimal";
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
  LEDGER_DESCRIPTION_MAX,
  LedgerTemplate,
} from "./ledger-workflow.types";
import { createLedger as createLedgerOperation } from "@/features/ledger/operations/create-ledger";
import { listDirectory } from "@/features/ledger/utils/directory-listing";
import {
  BadUserInputError,
  ConflictError,
  DomainError,
  ErrorCategory,
  InternalServerError,
  NotFoundError,
  ValidationError,
} from "@/shared/errors";
import {
  buildLedgerFiles,
  CREATE_REQUEST_ID_MAX,
  previewLedgerSetup,
  type LedgerSetup,
  type LedgerSetupPreview,
  type LedgerSetupValidation,
} from "@/features/ledger/setup/build-ledger";
import { CACHE_KEYS, TTL, type CacheHelper } from "@/shared/cache";
import { operationNotAllowedFromCause } from "@/features/ledger/utils/operation-not-allowed-from-cause";
import { filterNullish } from "@/shared/tools";
import { processBatch } from "@/shared/batch-processor";
import { logger } from "@/shared/logger";
import { GITEA_PAGE_SIZE, readGiteaPages } from "@/shared/gitea-pages";
import { systemIdentity, type Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  anonymousPrincipal,
  ledgerResource,
  type IAuthorizationService,
  userResource,
} from "@/server/api/authorization";
import {
  assertPortableRepoPath,
  assertSafeRepoPath,
} from "@/features/ledger/utils/safe-repo-path";
import { toBeanCheckErrors } from "@/features/ledger/utils/bean-check-errors";
import { assertKeepsEntryPoint } from "@/features/ledger/utils/ledger-entry-point";
import { assertExplicitFileContentSize } from "@/features/ledger/utils/explicit-file-size";
import { assertWritableText, decodeFileContent } from "@/shared/file-content";
import { posix } from "path";
import {
  formatIncludeLine,
  globMatches,
  includeTargetFor,
  isGlobPattern,
  isUrlTarget,
  parseIncludeLine,
  resolveIncludeTarget,
} from "@/features/ledger/utils/include-target";

const workflowLogger = logger.child({ module: "ledger-workflow" });

// Each miss is a real git clone + beancount parse (see beancount-ledger-v2's
// load-cached-ledger-file-map.ts), so directive-count fan-out stays deliberately narrow.
const DIRECTIVE_COUNT_CONCURRENCY = 3;

/**
 * Refuses a description the repository host would reject as a bare
 * "[Description]: MaxSize". Gitea counts characters, not UTF-16 units.
 */
function assertDescriptionLength(description: string | null | undefined) {
  const length = description == null ? 0 : [...description].length;
  if (length > LEDGER_DESCRIPTION_MAX) {
    throw new BadUserInputError(
      `description is ${length} characters; a ledger description can be at most ${LEDGER_DESCRIPTION_MAX}`,
      "description",
    );
  }
}

/**
 * Orchestration for the ledger feature. Owns the cross-service coordination the
 * ledger resolvers used to inline (Fava client provisioning, tier checks,
 * locking, DTO mapping) so the resolvers become thin transport adapters.
 *
 * Dependencies are narrow injected interfaces (no `IService`); request data
 * (`userId`) is passed per method. See backend-v2/AGENTS.md "Workflow layer".
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
    platform?: "web" | "mobile";
  }): Promise<LedgerData>;
  previewLedgerSetup(params: {
    identity: Identity;
    setup: LedgerSetup;
  }): Promise<LedgerSetupPreview & { validation: LedgerSetupValidation }>;
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
  /**
   * `getLedger` plus the caller's `isStarred`, for the surfaces that return
   * one serialized object (REST and the MCP `metadata` resource). GraphQL
   * resolves the same field on demand.
   */
  getLedgerMetadata(params: {
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

/** One ledger-service catalog call. */
type CatalogPageReader = (query: ListLedgersParams) => Promise<LedgerData[]>;

/** Ledgers `[offset, offset + count)` of a catalog. */
interface CatalogWindow {
  offset: number;
  count: number;
}

/**
 * The window a caller's `page`/`limit` asks for when one upstream call cannot
 * serve it: no paging at all means the whole catalog, and a `limit` above
 * GITEA_PAGE_SIZE spans several upstream pages. `null` means one call with
 * the caller's own arguments, so page-only and small-page reads keep exactly
 * the ledger service's semantics.
 */
function catalogWindow({
  page,
  limit,
}: ListLedgersParams): CatalogWindow | null {
  if (page == null && limit == null) return { offset: 0, count: Infinity };
  if (limit == null || limit <= GITEA_PAGE_SIZE) return null;
  // The ledger service parseInt()s both values, and Gitea reads a page below 1
  // as page 1.
  const count = Math.trunc(limit);
  const offset = (Math.max(1, Math.trunc(page ?? 1)) - 1) * count;
  // GraphQL and the owned-ledgers query accept any number. Past 2^53 page
  // arithmetic is inexact, and the ledger service would read the exponent form
  // `1e+21` as page 1, so such a request keeps the single call it always made.
  return Number.isSafeInteger(offset) ? { offset, count } : null;
}

async function readCatalogWindow(
  readPage: CatalogPageReader,
  { offset, count }: CatalogWindow,
): Promise<LedgerData[]> {
  const skip = offset % GITEA_PAGE_SIZE;
  const end = skip + count;
  const ledgers = await readGiteaPages(readPage, {
    firstPage: Math.floor(offset / GITEA_PAGE_SIZE) + 1,
    enough: (read) => read.length >= end,
  });
  return ledgers.slice(skip, end);
}

function readCatalog(
  readPage: CatalogPageReader,
  args: ListLedgersParams,
): Promise<LedgerData[]> {
  const window = catalogWindow(args);
  return window
    ? readCatalogWindow(readPage, window)
    : readPage({ page: args.page, limit: args.limit });
}

interface CreateRequestRecord {
  requestHash: string;
  status: "in-progress" | "done";
  ledger?: LedgerData;
}

/**
 * Search's own arguments, held to the catalog's other lists (w23/019).
 *
 * The repository host refuses a bad `sort` or `mode` itself, but ignores a
 * bad `order`, a `limit` of 0 (returning every match) and a negative id
 * filter, so a typo like `order=dsc` came back as the default with no signal.
 * Checked here so GraphQL, whose `Number` arguments arrive unchecked, refuses
 * the same values the REST and MCP schema do.
 */
function assertSearchArgs(args: SearchLedgersParams): void {
  const page = args.page ?? undefined;
  if (page !== undefined && (!Number.isSafeInteger(page) || page < 1)) {
    throw new BadUserInputError("page must be a positive integer", "page");
  }
  const limit = args.limit ?? undefined;
  if (
    limit !== undefined &&
    (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
  ) {
    throw new BadUserInputError(
      "limit must be an integer from 1 to 100",
      "limit",
    );
  }
  for (const field of [
    "uid",
    "priorityOwnerId",
    "teamId",
    "starredBy",
  ] as const) {
    const id = args[field] ?? undefined;
    if (id !== undefined && (!Number.isSafeInteger(id) || id < 1)) {
      throw new BadUserInputError(`${field} must be a positive integer`, field);
    }
  }
  const order = args.order ?? undefined;
  if (order !== undefined && order !== "asc" && order !== "desc") {
    throw new BadUserInputError('order must be "asc" or "desc"', "order");
  }
}

/**
 * Refuse file text holding an amount past the engine's 28 digits (w23/081).
 * These mutations also carry binary uploads (receipt PDFs from the file
 * uploader), which never reach the engine as amounts and skip the scan.
 */
function assertFileTextFitsEngineDecimal(base64Content: string): void {
  const bytes = Buffer.from(base64Content.replace(/\s/g, ""), "base64");
  if (!isUtf8(bytes)) return;
  assertAmountsFitEngineDecimal(bytes.toString("utf-8"));
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
    private readonly authorization: IAuthorizationService,
    /** Strict store for creation idempotency records (ADR021); optional so
     * requestId-less creation works in consumers that do not wire Redis. */
    private readonly createIdempotencyStore?: Pick<
      CacheHelper,
      "getStrict" | "setStrict" | "delStrict"
    >,
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
    platform = "web",
  }: {
    identity: Identity;
    input: CreateLedgerCommand;
    platform?: "web" | "mobile";
  }): Promise<LedgerData> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_CREATE,
      resource: userResource(identity.userId),
    });
    const userId = identity.userId;
    assertDescriptionLength(input.description);
    if (input.setup && input.template) {
      throw new ValidationError(
        "setup",
        "setup and template are mutually exclusive",
      );
    }
    if (
      input.requestId != null &&
      (input.requestId.length < 1 ||
        input.requestId.length > CREATE_REQUEST_ID_MAX)
    ) {
      // An empty id would silently turn idempotency off below.
      throw new ValidationError(
        "requestId",
        `requestId must be 1-${CREATE_REQUEST_ID_MAX} characters`,
      );
    }
    const files = input.setup
      ? buildLedgerFiles(input.setup)
      : input.template === LedgerTemplate.SAMPLE
        ? ledgerWithMultipleFilesTemplate
        : defaultLedgerTemplate;
    // ADR021: a setup's files are validated before the ledger service is
    // called, so a new ledger never starts with a bean-check error (w23/048).
    if (input.setup) {
      const validation = await this.checkSetupFiles(userId, files);
      if (!validation.ok) {
        const [first] = validation.errors;
        throw new ValidationError(
          "setup",
          `the ledger this setup creates would not load: ${first.message}${
            first.source ? ` (${first.source})` : ""
          }`,
        );
      }
    }
    const ledgerCreate: LedgerCreate = {
      name: input.name,
      description: input.description,
      // A ledger is financial records: an omitted or null `private` keeps it
      // private. Left unset, the repository host would create it public
      // (w1/173). Publishing takes an explicit `private: false`.
      private: input.private ?? true,
      files,
    };

    const lockKey = LOCK_KEYS.LEDGER.create(userId);
    return lock.acquire(lockKey, async () => {
      // Idempotent creation (ADR021): inside the per-user lock, a repeated
      // requestId with the same request returns the original ledger, the
      // same id with a different request is a validation error, and a repeat
      // while the first attempt runs reports in-progress instead of creating
      // a second ledger. Records expire after 24 hours.
      const store = this.createIdempotencyStore;
      const idempotency =
        input.requestId && store
          ? {
              store,
              key: CACHE_KEYS.ledger.createRequestByUserAndId(
                userId,
                input.requestId,
              ),
              hash: JSON.stringify({
                name: input.name,
                description: input.description ?? null,
                private: input.private ?? null,
                template: input.template ?? null,
                setup: input.setup ?? null,
              }),
            }
          : null;
      if (idempotency) {
        const raw = await idempotency.store.getStrict<string>(idempotency.key);
        const record = raw ? (JSON.parse(raw) as CreateRequestRecord) : null;
        if (record) {
          if (record.requestHash !== idempotency.hash) {
            throw new ValidationError(
              "requestId",
              "requestId was already used with a different creation request",
            );
          }
          if (record.status === "done" && record.ledger) {
            return record.ledger;
          }
          throw new ConflictError(
            "Ledger creation",
            "A creation with this requestId is still in progress",
            {
              hint: "Wait a few seconds and repeat the same call with the same requestId: once the first attempt finishes it returns that ledger, or that attempt's refusal. Send a new requestId only to start a separate creation.",
            },
          );
        }
        await idempotency.store.setStrict(
          idempotency.key,
          JSON.stringify({
            requestHash: idempotency.hash,
            status: "in-progress",
          }),
          TTL.HOUR_24,
        );
      }

      let ledger: LedgerData;
      try {
        const { favaApiClient } =
          await this.favaClientFactory.getApiContext(userId);

        // Tier enforcement + Fava ledger creation lives in the cross-service
        // operation (still shared with the auth signup flow); the workflow owns
        // the lock + client provisioning around it.
        ledger = await createLedgerOperation({
          favaApiClient,
          models: this.models,
          postgresDb: this.db,
          stripe: this.stripe,
          config: this.config,
          ledgerCreate,
          userId,
          platform,
        });
      } catch (error) {
        // A refused or failed attempt is finished, not in progress: release
        // the requestId so the documented retry runs again and returns its
        // real outcome instead of CONFLICT for 24 hours (w23/008). Still
        // inside the per-user lock, so no concurrent attempt can slip in.
        // The attempt's own error is what the caller needs; a failed release
        // is logged by the strict store and must not replace it.
        if (idempotency) {
          await idempotency.store
            .delStrict(idempotency.key)
            .catch(() => undefined);
        }
        throw error;
      }

      if (idempotency) {
        await idempotency.store.setStrict(
          idempotency.key,
          JSON.stringify({
            requestHash: idempotency.hash,
            status: "done",
            ledger,
          }),
          TTL.HOUR_24,
        );
      }
      return ledger;
    });
  }

  async previewLedgerSetup({
    identity,
    setup,
  }: {
    identity: Identity;
    setup: LedgerSetup;
  }): Promise<LedgerSetupPreview & { validation: LedgerSetupValidation }> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_CREATE,
      resource: userResource(identity.userId),
    });
    const preview = previewLedgerSetup(setup);
    return {
      ...preview,
      validation: await this.checkSetupFiles(identity.userId, preview.files),
    };
  }

  /**
   * bean-check over the files a setup would create, through the ledger
   * service's repository-free check: the preview reports it and creation
   * refuses on it, as ADR021 requires (w23/048).
   */
  private async checkSetupFiles(
    userId: string,
    files: Record<string, string>,
  ): Promise<LedgerSetupValidation> {
    const { favaApiClient } =
      await this.favaClientFactory.getApiContext(userId);
    const errors = toBeanCheckErrors(
      await unwrapFavaResponse(
        favaApiClient.reports.checkLedgerFiles({
          files: Object.entries(files).map(([path, text]) => ({
            path,
            content: Buffer.from(text, "utf8").toString("base64"),
          })),
        }),
        "check setup files",
      ),
    );
    return {
      ok: errors.length === 0,
      errors: errors.map(({ message, source }) => ({
        message,
        ...(source !== undefined && { source }),
      })),
    };
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
    assertDescriptionLength(input.description);
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
    // A new file: its name has to work on every checkout (w23/054).
    assertPortableRepoPath(input.path);
    assertExplicitFileContentSize(input.content, "base64");
    assertFileTextFitsEngineDecimal(input.content);
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
    // Nor be one an existing file's on macOS and Windows (w21/770).
    await assertNoPortableTwin(input.path, (dir) =>
      unwrapFavaResponse(
        favaApiClient.ledgers.getLedgerDirContent(
          ledgerOwner,
          ledgerName,
          filterNullish({ dir_path: dir }),
        ),
        "check new file path",
      ),
    );
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
    assertExplicitFileContentSize(input.content, "base64");
    assertFileTextFitsEngineDecimal(input.content);
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
    assertKeepsEntryPoint(input.path, "deleted");

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
    assertPortableRepoPath(input.newPath, "newPath");
    assertKeepsEntryPoint(input.oldPath, "renamed", "oldPath");
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
      (cause) =>
        operationNotAllowedFromCause("read ledger file for rename", cause),
    );
    if (!oldFile) {
      // NOT_FOUND, as a missing file is on every read and edit path; it was
      // BAD_USER_INPUT here alone (w5/051).
      throw new NotFoundError("File", input.oldPath);
    }
    const existingTarget = await unwrapFavaResponse(
      favaApiClient.ledgers.getLedgerFile(ledgerOwner, ledgerName, {
        path: input.newPath,
      }),
      "read ledger file for rename",
      (cause) =>
        operationNotAllowedFromCause("read ledger file for rename", cause),
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
    const keptFiles: string[] = [];
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
        if (entry.type === "dir") {
          pendingDirs.push(entry.path);
          continue;
        }
        if (entry.path !== input.oldPath) keptFiles.push(entry.path);
        if (entry.type === "file" && /\.(bean|beancount)$/.test(entry.path))
          beanFiles.push(entry.path);
      }
    }
    // Nor be one a kept file's on macOS and Windows (w23/068). The file
    // renamed is gone, so changing only its own letter case is not a twin.
    await assertNoPortableTwin(input.newPath, listingOf(keptFiles));
    // An include names a file relative to the file that declares it, so it
    // is matched on what it resolves to, not on its text (w23/029).
    const namesOldPath = (includingPath: string, line: string) => {
      const include = parseIncludeLine(line);
      if (!include || isUrlTarget(include.target)) return null;
      const resolved = resolveIncludeTarget(includingPath, include.target);
      if (isGlobPattern(resolved)) return null;
      return resolved === input.oldPath ? include : null;
    };
    let includingFiles: {
      path: string;
      content: string;
      lossy: boolean;
      sha: string;
    }[] = [];
    // A glob can't be rewritten for one file; refuse when the file falls out
    // of a pattern that includes it today.
    const lostGlobs: string[] = [];
    const candidates = beanFiles.filter(
      (path) => path !== input.oldPath && path !== input.newPath,
    );
    if (candidates.length > 0) {
      const contents = await unwrapFavaResponse(
        favaApiClient.ledgers.getLedgerFilesContent(ledgerOwner, ledgerName, {
          files: candidates,
        }),
        "read ledger files for rename",
        (cause) =>
          operationNotAllowedFromCause("read ledger files for rename", cause),
      );
      includingFiles = (contents ?? [])
        .map((file) => ({
          path: file.path,
          ...decodeFileContent(file),
          sha: file.sha,
        }))
        .filter(({ path, content }) => {
          const lines = content.split("\n");
          for (const line of lines) {
            const include = parseIncludeLine(line);
            if (!include || isUrlTarget(include.target)) continue;
            const pattern = resolveIncludeTarget(path, include.target);
            if (
              isGlobPattern(pattern) &&
              globMatches(pattern, input.oldPath) &&
              !globMatches(pattern, input.newPath)
            )
              lostGlobs.push(`${path} (include "${include.target}")`);
          }
          return lines.some((line) => namesOldPath(path, line));
        });
    }
    if (lostGlobs.length > 0) {
      throw new BadUserInputError(
        `${input.oldPath} is included by the glob in ${lostGlobs.join(", ")}, which ${input.newPath} would not match; a glob include can't be rewritten for one file`,
        "newPath",
        "Choose a new path the pattern still matches, or change the include line first.",
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

    const movedContent = this.movedIncludesContent(
      oldFile,
      input.oldPath,
      input.newPath,
      input.updateIncludes === true,
    );
    const preservedContent =
      movedContent ??
      (oldFile.encoding === "base64" && oldFile.content
        ? oldFile.content.replace(/\s/g, "")
        : Buffer.from(oldFile.content ?? "", "utf-8").toString("base64"));
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
    const updatedIncludes: string[] = movedContent ? [input.newPath] : [];
    for (const including of includingFiles) {
      // A rewrite re-encodes the whole including file (w23/030).
      assertWritableText(including, "updateIncludes");
      const rewritten = including.content
        .split("\n")
        .map((line) => {
          const include = namesOldPath(including.path, line);
          return include
            ? formatIncludeLine(
                include,
                includeTargetFor(including.path, input.newPath, include.target),
              )
            : line;
        })
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

  /**
   * The moved file's own relative includes resolve from its new folder, so a
   * move to another one pointed them at files that are not there (w23/056).
   * Returns the file's content with them rewritten, as base64, or `undefined`
   * when the move changes none of them and the bytes move as they are.
   */
  private movedIncludesContent(
    file: { content?: string | null; encoding?: string | null },
    oldPath: string,
    newPath: string,
    updateIncludes: boolean,
  ): string | undefined {
    if (
      !/\.(bean|beancount)$/.test(oldPath) ||
      posix.dirname(oldPath) === posix.dirname(newPath)
    ) {
      return undefined;
    }
    const decoded = decodeFileContent(file);
    const moved: string[] = [];
    const globs: string[] = [];
    const rewritten = decoded.content.split("\n").map((line) => {
      const include = parseIncludeLine(line);
      if (!include || isUrlTarget(include.target)) return line;
      const before = resolveIncludeTarget(oldPath, include.target);
      if (before === resolveIncludeTarget(newPath, include.target)) return line;
      if (isGlobPattern(before)) {
        globs.push(include.target);
        return line;
      }
      moved.push(include.target);
      return formatIncludeLine(
        include,
        includeTargetFor(newPath, before, include.target),
      );
    });
    if (globs.length > 0) {
      throw new BadUserInputError(
        `${oldPath} includes the glob "${globs[0]}" relative to its folder; in ${posix.dirname(newPath)} it would match other files, and a glob can't be rewritten`,
        "newPath",
        "Rename it within its folder, or change the include line first.",
      );
    }
    if (moved.length === 0) return undefined;
    if (!updateIncludes) {
      throw new BadUserInputError(
        `${oldPath} includes ${moved.map((target) => `"${target}"`).join(", ")} relative to its folder; pass updateIncludes: true to rewrite ${
          moved.length === 1 ? "it" : "them"
        } for ${newPath} in the same commit`,
        "updateIncludes",
        "Pass `updateIncludes: true` so the rename rewrites the `include` lines in the same commit.",
      );
    }
    // A rewrite re-encodes the whole file (w23/030).
    assertWritableText(
      { path: oldPath, lossy: decoded.lossy },
      "updateIncludes",
    );
    return Buffer.from(rewritten.join("\n"), "utf-8").toString("base64");
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
    return readCatalog(async (query) => {
      const data = await unwrapFavaResponse(
        favaApiClient.ledgers.listLedgers(query),
        "list ledgers",
      );
      return data.map((ledger) =>
        mapToLedger(ledger as FavaLedgerPublic, this.config.gitea),
      );
    }, args);
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
    const ledgers = await this.listUserOwnedLedgersCatalog(
      favaApiClient,
      favaUser.username,
      args,
    );
    return restrictToPin(identity, ledgers);
  }

  private listUserOwnedLedgersCatalog(
    favaApiClient: FavaApiClient,
    username: string,
    args: ListLedgersParams,
  ): Promise<LedgerData[]> {
    return readCatalog(async (query) => {
      const data = await unwrapFavaResponse(
        favaApiClient.ledgers.listUserLedgers(username, query),
        "list ledgers",
      );
      return data.map((ledger) =>
        mapToLedger(ledger as FavaLedgerPublic, this.config.gitea),
      );
    }, args);
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
    const ledgers = await this.listUserOwnedLedgersCatalog(
      favaApiClient,
      favaUser.username,
      {},
    );

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
    assertSearchArgs(args);
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

    const data = await listDirectory(args.dirPath, () =>
      unwrapFavaResponse(
        favaApiClient.ledgers.getLedgerDirContent(
          ledgerOwner,
          ledgerName,
          filterNullish({ dir_path: args.dirPath }),
        ),
        "get ledger directory content",
      ),
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

  async getLedgerMetadata({
    ledgerId,
    identity,
  }: {
    ledgerId: string;
    identity?: Identity;
  }): Promise<LedgerData> {
    const ledger = await this.getLedger({ ledgerId, identity });
    // GraphQL's isStarred is a field only an authenticated caller sees; REST
    // and MCP serialize this object, so they carried no star state at all
    // and could set a star but never read it back (w23/009).
    if (!identity) return ledger;
    try {
      const isStarred = await this.isLedgerStarred({ ledgerId, identity });
      return isStarred === undefined ? ledger : { ...ledger, isStarred };
    } catch (error) {
      // The star check has its own credential rule. A credential the
      // metadata read admits but that rule refuses still gets the metadata,
      // without a star state it may not see.
      if (
        error instanceof DomainError &&
        (error.category === ErrorCategory.FORBIDDEN ||
          error.category === ErrorCategory.NOT_FOUND)
      ) {
        return ledger;
      }
      throw error;
    }
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
