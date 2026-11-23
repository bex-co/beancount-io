import { assertTempAssetKey } from "@/features/s3/temp-asset-key";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { IAssetStorageService } from "@/features/s3/service/asset-storage-service";
import type { IAiCfoUsageService } from "@/features/feature-usage/service/ai-cfo-usage-service";
import type { UsageReservation } from "@/features/feature-usage/service/feature-usage-service";
import type { AppConfig } from "@/config/config";
import { LedgerAccountService } from "@/features/ledger/service/ledger-account-service";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  ledgerResource,
  tempAssetResource,
  type IAuthorizationService,
  userResource,
} from "@/server/api/authorization";
import { LLMClient } from "../utils/llm-client";
import {
  isLlmConfigured,
  llmNotConfiguredError,
} from "../utils/fallback-language-model";
import { extractTransactionsFromFile } from "../utils/extract-transactions-from-file";
import { extractReceiptFromFile } from "../utils/extract-receipt-from-file";
import { recommendAccounts } from "../utils/recommend-accounts";
import { normalizeReceiptDate } from "../utils/normalize-receipt-date";
import { categorizeTransactions } from "../utils/categorize-transactions";
import { estimateCategorizationTokens } from "../utils/categorize-transactions/estimate-tokens";
import { assertSuggestBatchSize } from "../utils/suggest-categories-cap";
import { modelProxyError } from "../utils/model-proxy-error";
import { uploadedMediaType } from "../utils/media-type-utils";
import { parseLedgerId } from "@/shared/str";
import { DirectiveType } from "@/foundation/fava";
import {
  ResourceLimitReachedError,
  BadUserInputError,
  ConfigurationError,
} from "@/shared/errors";
import type { RecentTransactionExample } from "../types";
import { logger } from "@/shared/logger";

/** The output cap the raw proxy sends when a request names none (w3/m52/t001). */
const DEFAULT_PROXY_MAX_COMPLETION_TOKENS = 1500;

/** Image formats the parsing models read. */
const MODEL_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

/** Receipt formats the parsing models accept. */
const RECEIPT_CONTENT_TYPES = new Set([
  ...MODEL_IMAGE_TYPES,
  "application/pdf",
]);

const llmServiceLogger = logger.child({ module: "llm-service" });

/** What to do about an upload stored as the wrong type (w1/231). */
const UPLOAD_TYPE_HINT =
  "Upload the file again: pass its `mimeType` to generateTempAssetUploadUrl and PUT with the `uploadHeaders` it returns.";

// Domain types (transport-agnostic, no TypeGraphQL decorators)
type ParsedTransaction = {
  date: string;
  payee: string;
  description: string;
  amount: number;
};

export type ParseFileResult = { rows: ParsedTransaction[] };

export type ParseReceiptResult = Omit<ParsedTransaction, "date"> & {
  // null when the receipt has no clearly visible date; consumers default to today
  date: string | null;
  sourceAccount?: string;
  targetAccount?: string;
};

export type TransactionToCategorizeDomain = {
  rowIndex: number;
  date: string;
  payee: string;
  description: string;
  amount: number;
};

export type CategorySuggestionResult = {
  rowIndex: number;
  targetAccount: string;
  confidence: number;
  source: "llm";
  reasoning?: string;
};

/**
 * Every public verb takes the caller's real `Identity` and makes its canonical
 * PDP decision before quota, S3, ledger, or model work. Receipt parsing and
 * categorization compose current ledger relationships with AI/asset authority;
 * file parsing composes exact-self AI use with the uploader-bound temp key.
 */
export interface ILLMService {
  parseFile(
    identity: Identity,
    s3ObjectKey: string,
    fileFormat: string,
    platform?: "web" | "mobile",
  ): Promise<ParseFileResult>;
  parseReceipt(
    identity: Identity,
    s3ObjectKey: string,
    ledgerId: string,
    platform?: "web" | "mobile",
  ): Promise<ParseReceiptResult>;
  suggestCategories(
    identity: Identity,
    ledgerId: string,
    transactions: TransactionToCategorizeDomain[],
    platform?: "web" | "mobile",
  ): Promise<CategorySuggestionResult[]>;
  invokeOpenAI(
    identity: Identity,
    request: Readonly<Record<string, unknown>>,
  ): Promise<unknown>;
}

/** The refusal for a spent assisted-AI quota, whether checked or reserved. */
function assistedQuotaReached({
  maxAllowed,
  currentCount,
}: {
  maxAllowed: number;
  currentCount: number;
}): ResourceLimitReachedError {
  return new ResourceLimitReachedError(
    "AI CFO Token",
    maxAllowed,
    currentCount,
    undefined,
    { limitOwner: "REQUESTER" },
  );
}

function getFormatFromContentType(contentType: string): string {
  if (contentType === "application/pdf") return "pdf";
  if (contentType.startsWith("image/")) {
    const sub = contentType.split("/")[1];
    return sub === "jpeg" ? "jpg" : sub;
  }
  return "image";
}

export class LLMService implements ILLMService {
  private readonly llmClient: LLMClient;
  private readonly ledgerAccountService: LedgerAccountService;

  constructor(
    private readonly favaClientFactory: IFavaClientFactory,
    private readonly assetStorage: IAssetStorageService,
    private readonly aiCfoUsageService: IAiCfoUsageService,
    private readonly config: Pick<AppConfig, "openai">,
    private readonly authorization: IAuthorizationService,
  ) {
    this.llmClient = new LLMClient();
    this.ledgerAccountService = new LedgerAccountService(
      favaClientFactory,
      authorization,
    );
  }

  /**
   * Fail with a clear domain error before any quota, S3, or ledger work when
   * no LLM provider credential is present (ADR 0011 D5) — the alternative is
   * a masked INTERNAL_SERVER_ERROR from deep inside the model call.
   */
  private assertLlmConfigured(): void {
    if (!isLlmConfigured()) throw llmNotConfiguredError();
  }

  private async assertAssistedQuotaAvailable(
    userId: string,
    platform: "web" | "mobile",
  ): Promise<void> {
    if (platform === "mobile") return;

    const usageCheck = await this.aiCfoUsageService.check(userId);
    if (!usageCheck.allowed) throw assistedQuotaReached(usageCheck);
  }

  /**
   * Hold a model call's estimated tokens against the quota, or refuse when
   * the quota is spent. The hold is atomic, so calls in flight together pass
   * the quota by at most one reservation. Mobile is not gated (null).
   */
  private async reserveAssistedTokens(
    userId: string,
    platform: "web" | "mobile",
    estimatedTokens: number,
  ): Promise<UsageReservation | null> {
    if (platform === "mobile") return null;

    const reservation = await this.aiCfoUsageService.reserve(
      userId,
      estimatedTokens,
    );
    if (!reservation.allowed) throw assistedQuotaReached(reservation);
    return reservation;
  }

  /** Record what the call really used, settling its reservation if it had one. */
  private async settleAssistedTokens(
    userId: string,
    reservation: UsageReservation | null,
    usedTokens: number,
  ): Promise<void> {
    if (reservation) {
      await this.aiCfoUsageService.settle(userId, reservation, usedTokens);
    } else if (usedTokens > 0) {
      await this.aiCfoUsageService.addTokenUsage(userId, usedTokens);
    }
  }

  async parseFile(
    identity: Identity,
    s3ObjectKey: string,
    fileFormat: string,
    platform: "web" | "mobile" = "web",
  ): Promise<ParseFileResult> {
    const { userId } = identity;
    assertTempAssetKey(s3ObjectKey, "objectKey");
    const format = typeof fileFormat === "string" ? fileFormat.trim() : "";
    if (format === "") {
      throw new BadUserInputError(
        "fileFormat must not be empty",
        "fileFormat",
        "Pass the file's format, such as csv, pdf, xlsx, json, or jpg.",
      );
    }
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.ASSISTED_FILE_PARSE,
      resource: [userResource(userId), tempAssetResource(s3ObjectKey)],
    });
    this.assertLlmConfigured();
    await this.assertAssistedQuotaAvailable(userId, platform);

    const stored = (await this.assetStorage.getObjectMetadata(s3ObjectKey))
      .contentType;
    const contentType = uploadedMediaType(stored, s3ObjectKey);

    // A statement may be a photo or a scan, but only in a format the models
    // read: an image of any other kind (an iPhone's HEIC, a TIFF) reached the
    // model, failed there and read as a generic parse error (w21/325, as
    // w21/108 did for receipts). Text, PDF and spreadsheet exports are not
    // images and are passed on as before.
    const mediaType = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (mediaType.startsWith("image/") && !MODEL_IMAGE_TYPES.has(mediaType)) {
      throw new BadUserInputError(
        `objectKey must name a CSV, OFX, QIF, spreadsheet or PDF export, or an image (JPEG, PNG, GIF, WEBP); it was uploaded as ${stored ?? "no type"}`,
        "objectKey",
        UPLOAD_TYPE_HINT,
      );
    }

    const { downloadUrl } =
      await this.assetStorage.generateDownloadUrl(s3ObjectKey);

    const { transactions, tokenUsage, removedDescriptionCount } =
      await extractTransactionsFromFile({
        llmClient: this.llmClient,
        fileUrl: downloadUrl,
        format,
        mediaType: contentType,
      });

    if (removedDescriptionCount) {
      llmServiceLogger.warn("Removed unsupported transaction descriptions", {
        removedDescriptionCount,
      });
    }

    await this.aiCfoUsageService.addTokenUsage(
      userId,
      tokenUsage.inputTokens + tokenUsage.outputTokens,
    );

    return {
      rows: transactions.map((txn) => ({
        date: txn.date,
        payee: txn.payee,
        description: txn.description,
        amount: txn.amount,
      })),
    };
  }

  async parseReceipt(
    identity: Identity,
    s3ObjectKey: string,
    ledgerId: string,
    platform: "web" | "mobile" = "web",
  ): Promise<ParseReceiptResult> {
    const { userId } = identity;
    assertTempAssetKey(s3ObjectKey, "objectKey");
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.ASSISTED_RECEIPT_PARSE,
      resource: [tempAssetResource(s3ObjectKey), ledgerResource(ledgerId)],
    });
    this.assertLlmConfigured();
    await this.assertAssistedQuotaAvailable(userId, platform);

    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const stored = (await this.assetStorage.getObjectMetadata(s3ObjectKey))
      .contentType;
    const contentType = uploadedMediaType(stored, s3ObjectKey);

    // Exactly the formats the models read. Any `image/*` used to pass, so an
    // iPhone's HEIC reached the model, failed there, and read only as "Could
    // not read receipt" (w21/108).
    if (!RECEIPT_CONTENT_TYPES.has(contentType ?? "")) {
      throw new BadUserInputError(
        `objectKey must name an image (JPEG, PNG, GIF, WEBP) or PDF file; it was uploaded as ${stored ?? "no type"}`,
        "objectKey",
        UPLOAD_TYPE_HINT,
      );
    }

    const { downloadUrl } =
      await this.assetStorage.generateDownloadUrl(s3ObjectKey);
    const format = getFormatFromContentType(contentType ?? "");

    const [{ transaction: txn, tokenUsage: parseTokenUsage }, accountItems] =
      await Promise.all([
        extractReceiptFromFile({
          llmClient: this.llmClient,
          fileUrl: downloadUrl,
          format,
          mediaType: contentType,
        }),
        this.ledgerAccountService.getAccountDirectives(
          ledgerOwner,
          ledgerName,
          identity,
        ),
      ]);

    const openAccounts = accountItems
      .filter((item) => !item.closedAt)
      .map((item) => item.account);

    const { recommendation, tokenUsage: recommendTokenUsage } =
      await recommendAccounts(this.llmClient, txn, openAccounts);

    const totalTokens =
      parseTokenUsage.inputTokens +
      parseTokenUsage.outputTokens +
      recommendTokenUsage.inputTokens +
      recommendTokenUsage.outputTokens;
    await this.aiCfoUsageService.addTokenUsage(userId, totalTokens);

    return {
      date: normalizeReceiptDate(txn.date),
      payee: txn.payee,
      description: txn.description,
      amount: txn.amount,
      sourceAccount: recommendation.sourceAccount ?? undefined,
      targetAccount: recommendation.targetAccount ?? undefined,
    };
  }

  async suggestCategories(
    identity: Identity,
    ledgerId: string,
    transactions: TransactionToCategorizeDomain[],
    platform: "web" | "mobile" = "web",
  ): Promise<CategorySuggestionResult[]> {
    const { userId } = identity;
    assertSuggestBatchSize(transactions);
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.ASSISTED_CATEGORIES_SUGGEST,
      resource: ledgerResource(ledgerId),
    });
    await this.assertAssistedQuotaAvailable(userId, platform);

    this.assertLlmConfigured();

    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const { favaApiClient } =
      await this.favaClientFactory.getApiContext(userId);

    const existingAccounts = await this.ledgerAccountService.getAccounts(
      ledgerOwner,
      ledgerName,
      "open",
      identity,
    );

    const journalResponse = await favaApiClient.journal.getJournal(
      ledgerOwner,
      ledgerName,
      { limit: 50, directive_types: [DirectiveType.Transaction] },
    );

    const recentExamples: RecentTransactionExample[] = [];
    if (journalResponse.data?.data?.items) {
      for (const item of journalResponse.data.data.items) {
        if ("payee" in item && "narration" in item && "postings" in item) {
          const payee = item.payee || "";
          const narration = item.narration || "";
          const targetPosting = item.postings.find(
            (p) =>
              !p.account.startsWith("Assets:") &&
              !p.account.startsWith("Liabilities:"),
          );
          if (targetPosting && payee) {
            recentExamples.push({
              payee,
              narration,
              account: targetPosting.account,
            });
          }
        }
      }
    }

    const ledgerPluginsResponse = await favaApiClient.reports.getLedgerPlugins(
      ledgerOwner,
      ledgerName,
    );
    const ledgerPlugins = ledgerPluginsResponse.data?.data || [];
    const supportAutoAccountsPlugins = [
      "beancount.plugins.auto_accounts",
      "beancount.plugins.auto",
    ];
    const autoAccounts = supportAutoAccountsPlugins.some((plugin) =>
      ledgerPlugins.includes(plugin),
    );

    const request = {
      transactions,
      existingAccounts,
      recentExamples: recentExamples.slice(0, 30),
      autoAccounts,
    };
    const reservation = await this.reserveAssistedTokens(
      userId,
      platform,
      estimateCategorizationTokens(request),
    );

    // A failed call settles to 0, releasing its reservation.
    let usedTokens = 0;
    try {
      const { suggestions, tokenUsage } = await categorizeTransactions(
        this.llmClient,
        request,
      );
      usedTokens = tokenUsage.inputTokens + tokenUsage.outputTokens;

      return suggestions.map((s) => ({
        rowIndex: s.rowIndex,
        targetAccount: s.targetAccount,
        confidence: s.confidence,
        source: "llm" as const,
        reasoning: s.reasoning,
      }));
    } finally {
      await this.settleAssistedTokens(userId, reservation, usedTokens);
    }
  }

  async invokeOpenAI(
    identity: Identity,
    request: Readonly<Record<string, unknown>>,
  ): Promise<unknown> {
    const boundedRequest =
      request.max_tokens === undefined &&
      request.max_completion_tokens === undefined
        ? {
            ...request,
            max_completion_tokens: DEFAULT_PROXY_MAX_COMPLETION_TOKENS,
          }
        : request;
    const response = await this.invokeModelProxy(
      identity,
      `${this.config.openai.baseUrl}/chat/completions`,
      boundedRequest,
      { Authorization: `Bearer ${this.config.openai.apiKey}` },
    );
    const usage = (response as { usage?: { total_tokens?: number } }).usage;
    await this.recordProxyUsage(identity.userId, usage?.total_tokens ?? 0);
    return response;
  }

  private async invokeModelProxy(
    identity: Identity,
    url: string,
    request: Readonly<Record<string, unknown>>,
    headers: Readonly<Record<string, string>> = {},
  ): Promise<unknown> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.AI_MODEL_INVOKE,
      resource: userResource(identity.userId),
    });
    if (!this.config.openai.apiKey) {
      throw new ConfigurationError(
        "Model proxy is not configured on this deployment",
        "Set OPENAI_API_KEY (see .env.example)",
      );
    }
    await this.aiCfoUsageService.assertQuotaAvailable(identity.userId);

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ ...request, stream: false }),
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      throw modelProxyError(
        upstream.status,
        text,
        upstream.headers.get("retry-after"),
      );
    }
    return upstream.json();
  }

  private async recordProxyUsage(
    userId: string,
    totalTokens: number,
  ): Promise<void> {
    if (totalTokens > 0) {
      await this.aiCfoUsageService.addTokenUsage(userId, totalTokens);
    }
  }
}
