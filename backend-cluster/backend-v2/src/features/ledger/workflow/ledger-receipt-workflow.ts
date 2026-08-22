import { parseLedgerId } from "@/shared/str";
import { nanoidBase58 } from "@/shared/nanoid-base58";
import { fetchAssetAsBase64 } from "@/shared/fetch-asset-base64";
import { type BcioOptionsPublic, unwrapFavaResponse } from "@/foundation/fava";
import { InternalServerError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { IAssetStorageService } from "@/features/s3/service/asset-storage-service";
import type { ILedgerEntryService } from "@/features/ledger/service/ledger-entry-service";
import type { AppConfig } from "@/config/config";
import { trustedIdentity } from "@/server/api/identity";

const moduleLogger = logger.child({ module: "ledger-receipt-workflow" });

type ReceiptPostingInput = {
  account: string;
  amountNumber: string;
  amountCurrency: string;
};

export type InsertReceiptInput = {
  date: string;
  payee: string;
  description: string;
  postings: ReceiptPostingInput[];
  documentAccount: string;
};

export interface ILedgerReceiptWorkflow {
  insertReceiptTransaction(params: {
    ledgerId: string;
    receiptObjectKey: string;
    input: InsertReceiptInput;
    userId: string;
  }): Promise<{ success: boolean }>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function buildReceiptPath(
  date: string,
  payee: string,
  ext: string,
  id: string,
  baseFolder: string = "documents",
): string {
  const slug = slugify(payee) || "receipt";
  return `${baseFolder}/${date}-${slug}-${id}${ext}`;
}

function extractExt(objectKey: string): string {
  const lastDot = objectKey.lastIndexOf(".");
  if (lastDot === -1) return "";
  const ext = objectKey.slice(lastDot).toLowerCase();
  const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp"];
  return allowed.includes(ext) ? ext : "";
}

export class LedgerReceiptWorkflow implements ILedgerReceiptWorkflow {
  constructor(
    private readonly favaClientFactory: IFavaClientFactory,
    private readonly assetStorage: IAssetStorageService,
    private readonly ledgerEntry: ILedgerEntryService,
    private readonly config: Pick<AppConfig, "dashboard">,
  ) {}

  async insertReceiptTransaction(params: {
    ledgerId: string;
    receiptObjectKey: string;
    input: InsertReceiptInput;
    userId: string;
  }): Promise<{ success: boolean }> {
    const { ledgerId, receiptObjectKey, input, userId } = params;
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );

    const bcioResponse = await favaApiClient.reports.getLedgerBcioOptions(
      ledgerOwner,
      ledgerName,
    );
    const bcioData = bcioResponse.data.success
      ? bcioResponse.data.data
      : undefined;

    if (bcioData?.receipt_storage === "git") {
      return this.gitStrategy({
        ledgerId,
        receiptObjectKey,
        input,
        userId,
        bcioData,
      });
    }
    return this.s3Strategy({ ledgerId, receiptObjectKey, input, userId });
  }

  private async gitStrategy(params: {
    ledgerId: string;
    receiptObjectKey: string;
    input: InsertReceiptInput;
    userId: string;
    bcioData: BcioOptionsPublic | undefined;
  }): Promise<{ success: boolean }> {
    const { ledgerId, receiptObjectKey, input, userId, bcioData } = params;
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );

    const linkId = nanoidBase58(8);
    const linkTag = `rcpt_${linkId}`;

    const ext = extractExt(receiptObjectKey);
    const receiptBaseFolder = bcioData?.receipt_base_folder ?? "documents";
    const receiptPath = buildReceiptPath(
      input.date,
      input.payee,
      ext,
      linkId,
      receiptBaseFolder,
    );

    const { downloadUrl } =
      await this.assetStorage.generateDownloadUrl(receiptObjectKey);
    const fileBase64 = await fetchAssetAsBase64(downloadUrl);

    await unwrapFavaResponse(
      favaApiClient.ledgers.createLedgerFile(ledgerOwner, ledgerName, {
        path: receiptPath,
        content: fileBase64,
        message: `docs: add receipt ${receiptPath}`,
      }),
      "store receipt in ledger repository",
      () => {
        moduleLogger.error("Failed to store receipt in ledger repository", {
          ledgerOwner,
          ledgerName,
          receiptPath,
        });
        return new InternalServerError(
          "Failed to store receipt in ledger repository",
        );
      },
    );

    // Receipts don't get mobile directive-limit bypass treatment yet — no
    // caller of this workflow threads a platform through today.
    await this.ledgerEntry.addBulkEntries(
      trustedIdentity(userId),
      ledgerOwner,
      ledgerName,
      [
        {
          type: "document",
          entry: {
            date: input.date,
            account: input.documentAccount,
            filename: receiptPath,
            links: [linkTag],
          },
        },
        {
          type: "transaction",
          entry: {
            date: input.date,
            flag: "*",
            payee: input.payee,
            narration: input.description,
            postings: input.postings.map((p) => ({
              account: p.account,
              units: { number: p.amountNumber, currency: p.amountCurrency },
            })),
            links: [linkTag],
          },
        },
      ],
      "web",
    );

    return { success: true };
  }

  private async s3Strategy(params: {
    ledgerId: string;
    receiptObjectKey: string;
    input: InsertReceiptInput;
    userId: string;
  }): Promise<{ success: boolean }> {
    const { ledgerId, receiptObjectKey, input, userId } = params;
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);

    const adminClient = this.favaClientFactory.getAdminClient();
    const ledger = await unwrapFavaResponse(
      adminClient.ledgers.getLedger(ledgerOwner, ledgerName),
      "fetch ledger metadata",
    );
    const repoId = ledger.id;

    const { filename } = await this.assetStorage.copyTempToPermanent({
      objectKey: receiptObjectKey,
      scope: `repo_${repoId}`,
    });

    const receiptUrl = `${this.config.dashboard.url}/ledger_assets/${repoId}/static/${filename}`;

    // Receipts don't get mobile directive-limit bypass treatment yet — no
    // caller of this workflow threads a platform through today.
    await this.ledgerEntry.addBulkEntries(
      trustedIdentity(userId),
      ledgerOwner,
      ledgerName,
      [
        {
          type: "transaction",
          entry: {
            date: input.date,
            flag: "*",
            payee: input.payee,
            narration: input.description,
            postings: input.postings.map((p) => ({
              account: p.account,
              units: { number: p.amountNumber, currency: p.amountCurrency },
            })),
            meta: { receipt: receiptUrl },
          },
        },
      ],
      "web",
    );

    await this.assetStorage.deleteTempAsset(receiptObjectKey).catch((error) => {
      moduleLogger.warn("Failed to delete temp receipt asset after promotion", {
        receiptObjectKey,
        error,
      });
    });

    return { success: true };
  }
}
