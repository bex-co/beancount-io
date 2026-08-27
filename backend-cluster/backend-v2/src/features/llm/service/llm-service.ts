import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { IAssetStorageService } from "@/features/s3/service/asset-storage-service";
import { assertTempAssetOwnership } from "@/features/s3/service/asset-storage-service";
import type { IAiCfoUsageService } from "@/features/feature-usage/service/ai-cfo-usage-service";
import type { AppConfig } from "@/config/config";
import { LedgerAccountService } from "@/features/ledger/service/ledger-account-service";
import {
  assertLedgerAuthorization,
  type AuthorizeLedgerDeps,
} from "@/features/ledger/utils/authorize-ledger";
import type { Identity } from "@/server/api/identity";
import { LLMClient } from "../utils/llm-client";
import { extractTransactionsFromFile } from "../utils/extract-transactions-from-file";
import { extractReceiptFromFile } from "../utils/extract-receipt-from-file";
import { recommendAccounts } from "../utils/recommend-accounts";
import { categorizeTransactions } from "../utils/categorize-transactions";
import { parseLedgerId } from "@/shared/str";
import { DirectiveType } from "@/foundation/fava";
import {
  ResourceLimitReachedError,
  BadUserInputError,
  InternalServerError,
} from "@/shared/errors";
import type { RecentTransactionExample } from "../types";

// Domain types (transport-agnostic, no TypeGraphQL decorators)
export type ParsedTransaction = {
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
 * Every verb takes the caller's real `Identity`, never a rebuilt one: the two
 * ledger-reading verbs feed it straight to the authorization seam, so a
 * ledger-pinned or scope-narrowed credential stays narrow all the way down
 * (w3/m9). `parseFile` names no ledger, so it has nothing to authorize against
 * beyond the transport gate's op class — it takes an `Identity` anyway so that
 * no signature here invites a caller to hand over a bare userId out of habit.
 */
export interface ILLMService {
  parseFile(
    identity: Identity,
    s3ObjectKey: string,
    fileFormat: string,
  ): Promise<ParseFileResult>;
  parseReceipt(
    identity: Identity,
    s3ObjectKey: string,
    ledgerId: string,
  ): Promise<ParseReceiptResult>;
  suggestCategories(
    identity: Identity,
    ledgerId: string,
    transactions: TransactionToCategorizeDomain[],
  ): Promise<CategorySuggestionResult[]>;
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
    private readonly config: Pick<AppConfig, "blockeden">,
    models: AuthorizeLedgerDeps["models"],
    db: AuthorizeLedgerDeps["db"],
  ) {
    this.llmClient = new LLMClient(config.blockeden.accessKey);
    this.ledgerAccountService = new LedgerAccountService(
      favaClientFactory,
      models,
      db,
    );
  }

  async parseFile(
    identity: Identity,
    s3ObjectKey: string,
    fileFormat: string,
  ): Promise<ParseFileResult> {
    const { userId } = identity;
    const usageCheck = await this.aiCfoUsageService.check(userId);
    if (!usageCheck.allowed) {
      throw new ResourceLimitReachedError(
        "AI CFO Token",
        usageCheck.maxAllowed,
        usageCheck.currentCount,
      );
    }

    // The key is the only handle on the upload — check it belongs to the
    // caller before fetching metadata or minting a read URL.
    assertTempAssetOwnership(s3ObjectKey, userId);

    const { contentType } =
      await this.assetStorage.getObjectMetadata(s3ObjectKey);
    const { downloadUrl } =
      await this.assetStorage.generateDownloadUrl(s3ObjectKey);

    const { transactions, tokenUsage } = await extractTransactionsFromFile({
      llmClient: this.llmClient,
      fileUrl: downloadUrl,
      format: fileFormat,
      mediaType: contentType,
    });

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
  ): Promise<ParseReceiptResult> {
    // Fail before any LLM spend or S3 work when the credential is pinned to a
    // different ledger than the one named.
    assertLedgerAuthorization(identity, ledgerId, "read");
    const { userId } = identity;
    const usageCheck = await this.aiCfoUsageService.check(userId);
    if (!usageCheck.allowed) {
      throw new ResourceLimitReachedError(
        "AI CFO Token",
        usageCheck.maxAllowed,
        usageCheck.currentCount,
      );
    }

    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    // The key is the only handle on the upload — check it belongs to the
    // caller before fetching metadata or minting a read URL.
    assertTempAssetOwnership(s3ObjectKey, userId);
    const { contentType } =
      await this.assetStorage.getObjectMetadata(s3ObjectKey);

    if (
      !contentType?.startsWith("image/") &&
      contentType !== "application/pdf"
    ) {
      throw new BadUserInputError(
        "s3ObjectKey must be an image (JPEG, PNG, GIF, WEBP) or PDF file",
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
      date: txn.date || null,
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
  ): Promise<CategorySuggestionResult[]> {
    // The journal and plugin reads below go straight to Fava with no seam of
    // their own; assert here so a mismatched ledger never reaches them.
    assertLedgerAuthorization(identity, ledgerId, "read");
    const { userId } = identity;
    const usageCheck = await this.aiCfoUsageService.check(userId);
    if (!usageCheck.allowed) {
      throw new ResourceLimitReachedError(
        "AI CFO Token",
        usageCheck.maxAllowed,
        usageCheck.currentCount,
      );
    }

    if (!this.config.blockeden.accessKey) {
      throw new InternalServerError(
        "LLM categorization is not configured. Please set BLOCKEDEN_ACCESS_KEY environment variable.",
      );
    }

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

    const { suggestions, tokenUsage } = await categorizeTransactions(
      this.llmClient,
      {
        transactions,
        existingAccounts,
        recentExamples: recentExamples.slice(0, 30),
        autoAccounts,
      },
    );

    await this.aiCfoUsageService.addTokenUsage(
      userId,
      tokenUsage.inputTokens + tokenUsage.outputTokens,
    );

    return suggestions.map((s) => ({
      rowIndex: s.rowIndex,
      targetAccount: s.targetAccount,
      confidence: s.confidence,
      source: "llm" as const,
      reasoning: s.reasoning,
    }));
  }
}
