import { NotFoundError } from "@/shared/errors";
import { buildLedgerRepoAssetKey } from "@/features/s3/service/asset-storage-service";
import { parseLedgerId } from "@/shared/str";
import { unwrapFavaResponse } from "@/foundation/fava";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { IAssetStorageService } from "@/features/s3/service/asset-storage-service";
import type { AppConfig } from "@/config/config";
import type { Identity } from "@/server/api/identity";
import {
  authorizeLedger,
  type AuthorizeLedgerDeps,
  AuthorizedLedgerService,
} from "@/features/ledger/utils/authorize-ledger";

export interface ILedgerAssetService {
  getAssetDownloadUrl(
    ledgerRepoId: number,
    filename: string,
    identity?: Identity,
  ): Promise<string>;
  getLedgerArchiveDownloadUrl(
    ledgerId: string,
    identity?: Identity,
    token?: string,
  ): Promise<string>;
}

export class LedgerAssetService
  extends AuthorizedLedgerService
  implements ILedgerAssetService
{
  constructor(
    favaClientFactory: IFavaClientFactory,
    models: AuthorizeLedgerDeps["models"],
    db: AuthorizeLedgerDeps["db"],
    private readonly assetStorage: IAssetStorageService,
    private readonly config: Pick<AppConfig, "server">,
  ) {
    super(favaClientFactory, models, db);
  }

  /**
   * Validate that the caller has access to the ledger identified by its stable
   * numeric repoId, then return a presigned S3 download URL for the asset.
   *
   * `ledgerRepoId` has to be resolved to the `owner/name` id `authorizeLedger`
   * expects before the seam can run — that resolution is itself one Fava
   * admin lookup, unavoidable given the two identifiers' different shapes.
   */
  async getAssetDownloadUrl(
    ledgerRepoId: number,
    filename: string,
    identity?: Identity,
  ): Promise<string> {
    const adminClient = this.favaClientFactory.getAdminClient();
    const ledger = await unwrapFavaResponse(
      adminClient.admin.getLedgerByRepoId(ledgerRepoId),
      "get ledger",
      () => new NotFoundError("Ledger", String(ledgerRepoId)),
    );

    await authorizeLedger(identity, ledger.full_name, "read", this.authDeps);

    const objectKey = buildLedgerRepoAssetKey(ledgerRepoId, filename);
    const { downloadUrl } =
      await this.assetStorage.generateDownloadUrl(objectKey);
    return downloadUrl;
  }

  async getLedgerArchiveDownloadUrl(
    ledgerId: string,
    identity?: Identity,
    token?: string,
  ): Promise<string> {
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const adminClient = this.favaClientFactory.getAdminClient();
    const ledger = await unwrapFavaResponse(
      adminClient.ledgers.getLedger(ledgerOwner, ledgerName),
      "get ledger",
      () => new NotFoundError("Ledger", ledgerId),
    );

    await authorizeLedger(identity, ledgerId, "read", this.authDeps);

    const baseUrl = this.config.server.url.replace(/\/$/, "");
    const archivePath = `/api-gateway/ledgers/${ledgerId}/archive/main.zip`;
    return ledger.private && token
      ? `${baseUrl}${archivePath}?token=${token}`
      : `${baseUrl}${archivePath}`;
  }
}
