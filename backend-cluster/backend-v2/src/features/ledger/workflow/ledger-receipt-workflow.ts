import { assertTempAssetKey } from "@/features/s3/temp-asset-key";
import { parseLedgerId } from "@/shared/str";
import { nanoidBase58 } from "@/shared/nanoid-base58";
import { fetchAssetAsBase64 } from "@/shared/fetch-asset-base64";
import {
  type BcioOptionsPublic,
  type FavaApiClient,
  unwrapFavaResponse,
} from "@/foundation/fava";
import { InternalServerError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { IAssetStorageService } from "@/features/s3/service/asset-storage-service";
import type {
  ILedgerEntryWriter,
  LedgerEntryInput,
} from "@/features/ledger/service/ledger-entry-service";
import type { AppConfig } from "@/config/config";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  ledgerResource,
  tempAssetResource,
  type IAuthorizationService,
} from "@/server/api/authorization";

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

export type InsertReceiptResult = {
  success: boolean;
  /**
   * Files the committed entries landed in, for MCP's `wrote` (the bulk
   * route reports files, not lines). Absent when unresolvable (w23/083).
   */
  files?: string[];
  /**
   * The hash each committed entry now carries, in request order — under
   * git storage the document directive first, then the transaction.
   * Absent when unresolvable (w23/083).
   */
  entryHashes?: string[];
};

export interface ILedgerReceiptWorkflow {
  /**
   * Takes the caller's real `Identity`, not a bare userId, because the
   * composite receipt decision must include credential scopes and ledger pin
   * before either storage strategy starts.
   */
  insertReceiptTransaction(params: {
    ledgerId: string;
    receiptObjectKey: string;
    input: InsertReceiptInput;
    identity: Identity;
  }): Promise<InsertReceiptResult>;
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

/** The receipt's transaction, linked or annotated the way its storage needs. */
function receiptTransaction(
  input: InsertReceiptInput,
  extra: { links: string[] } | { meta: Record<string, string> },
): LedgerEntryInput {
  return {
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
      ...extra,
    },
  };
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
    private readonly ledgerEntryWriter: ILedgerEntryWriter,
    private readonly config: Pick<AppConfig, "dashboard">,
    private readonly authorization: IAuthorizationService,
  ) {}

  async insertReceiptTransaction(params: {
    ledgerId: string;
    receiptObjectKey: string;
    input: InsertReceiptInput;
    identity: Identity;
  }): Promise<InsertReceiptResult> {
    const { ledgerId, receiptObjectKey, input, identity } = params;
    // One composite decision precedes the options read, S3 promotion, file
    // commit, and ledger mutation. LedgerEntry's later authorization is
    // intentional defense in depth at the final write boundary.
    assertTempAssetKey(receiptObjectKey, "receiptObjectKey");
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.ASSISTED_RECEIPT_INSERT,
      resource: [tempAssetResource(receiptObjectKey), ledgerResource(ledgerId)],
    });
    const { userId } = identity;
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
        identity,
        bcioData,
        favaApiClient,
      });
    }
    return this.s3Strategy({ ledgerId, receiptObjectKey, input, identity });
  }

  private async gitStrategy(params: {
    ledgerId: string;
    receiptObjectKey: string;
    input: InsertReceiptInput;
    identity: Identity;
    bcioData: BcioOptionsPublic | undefined;
    favaApiClient: FavaApiClient;
  }): Promise<InsertReceiptResult> {
    const {
      ledgerId,
      receiptObjectKey,
      input,
      identity,
      bcioData,
      favaApiClient,
    } = params;
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);

    const linkId = nanoidBase58(8);
    const linkTag = `rcpt_${linkId}`;
    const transaction = receiptTransaction(input, { links: [linkTag] });
    // Checked before the receipt is stored: a refused entry — unbalanced, an
    // unknown account — used to leave the stored receipt behind, one more
    // with every retry (w23/058). Its document directive can only be checked
    // once the file exists.
    await this.ledgerEntryWriter.writeBulkEntries(
      identity.userId,
      ledgerOwner,
      ledgerName,
      [transaction],
      "web",
      false,
      true,
    );

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

    const stored = await unwrapFavaResponse(
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
    let committed: { files?: string[]; entryHashes?: string[] };
    try {
      committed = await this.ledgerEntryWriter.writeBulkEntries(
        identity.userId,
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
          transaction,
        ],
        "web",
      );
    } catch (error) {
      // Refused after all (the document directive, a lost race): take the
      // stored receipt back out rather than leave it unreferenced.
      await unwrapFavaResponse(
        favaApiClient.ledgers.deleteLedgerFile(ledgerOwner, ledgerName, {
          path: receiptPath,
          sha: stored.sha,
          message: `docs: remove receipt ${receiptPath}; its entry was refused`,
        }),
        "remove an unreferenced receipt",
      ).catch((cleanupError: unknown) => {
        moduleLogger.warn(
          "Failed to remove a receipt whose entry was refused",
          {
            ledgerOwner,
            ledgerName,
            receiptPath,
            error: cleanupError,
          },
        );
      });
      throw error;
    }

    return {
      success: true,
      ...(committed.files !== undefined && { files: committed.files }),
      ...(committed.entryHashes !== undefined && {
        entryHashes: committed.entryHashes,
      }),
    };
  }

  private async s3Strategy(params: {
    ledgerId: string;
    receiptObjectKey: string;
    input: InsertReceiptInput;
    identity: Identity;
  }): Promise<InsertReceiptResult> {
    const { ledgerId, receiptObjectKey, input, identity } = params;
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);

    // Checked before the upload is promoted, so a refused entry leaves no
    // permanent copy behind (w23/058); the receipt URL is not yet known and
    // does not change what is checked.
    await this.ledgerEntryWriter.writeBulkEntries(
      identity.userId,
      ledgerOwner,
      ledgerName,
      [receiptTransaction(input, { meta: { receipt: "" } })],
      "web",
      false,
      true,
    );

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
    const committed = await this.ledgerEntryWriter.writeBulkEntries(
      identity.userId,
      ledgerOwner,
      ledgerName,
      [receiptTransaction(input, { meta: { receipt: receiptUrl } })],
      "web",
    );

    await this.assetStorage.deleteTempAsset(receiptObjectKey).catch((error) => {
      moduleLogger.warn("Failed to delete temp receipt asset after promotion", {
        receiptObjectKey,
        error,
      });
    });

    return {
      success: true,
      ...(committed.files !== undefined && { files: committed.files }),
      ...(committed.entryHashes !== undefined && {
        entryHashes: committed.entryHashes,
      }),
    };
  }
}
