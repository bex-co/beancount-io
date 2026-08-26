import { ForbiddenError, NotFoundError } from "@/shared/errors";
import type { CacheHelper } from "@/shared/cache";
import { buildLedgerRepoAssetKey } from "@/features/s3/service/asset-storage-service";
import { parseLedgerId } from "@/shared/str";
import { unwrapFavaResponse } from "@/foundation/fava";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { IAssetStorageService } from "@/features/s3/service/asset-storage-service";
import { mintArchiveTicket } from "@/features/ledger/api/rest/v1/archive-ticket";
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
    private readonly cacheHelper: CacheHelper,
    private readonly config: Pick<AppConfig, "server" | "jwt">,
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

  /**
   * Return a URL that downloads the ledger's `main.zip` archive.
   *
   * An authenticated caller gets the v1 single-use ticket URL — the same
   * capability `POST /archive-tickets` mints — so what the URL leaves behind in
   * an access log, a Referer header, or browser history is a spent,
   * one-archive capability rather than the caller's session JWT, which is what
   * the `?token=<JWT>` URL this replaces embedded.
   *
   * Anonymous callers can only be reading a public ledger (authorizeLedger
   * refuses everything else) and have no identity to bind a ticket to, so they
   * get the credential-free legacy URL — the ledger service forwards those
   * requests to Gitea with no credential at all.
   */
  async getLedgerArchiveDownloadUrl(
    ledgerId: string,
    identity?: Identity,
  ): Promise<string> {
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const adminClient = this.favaClientFactory.getAdminClient();
    await unwrapFavaResponse(
      adminClient.ledgers.getLedger(ledgerOwner, ledgerName),
      "get ledger",
      () => new NotFoundError("Ledger", ledgerId),
    );

    await authorizeLedger(identity, ledgerId, "read", this.authDeps);

    const baseUrl = this.config.server.url.replace(/\/$/, "");

    if (identity?.userId) {
      if (!this.config.jwt.secret) {
        // Without a signing secret every ticket would verify against an empty
        // key — the same refusal the v1 route makes.
        throw new ForbiddenError("Archive tickets are not configured");
      }
      const { ticket } = await mintArchiveTicket(
        { userId: identity.userId, ledgerId, archive: "main.zip" },
        this.config.jwt.secret,
        this.cacheHelper,
      );
      return `${baseUrl}/api-gateway/v1/ledgers/${encodeURIComponent(ledgerOwner)}/${encodeURIComponent(ledgerName)}/archive/main.zip?ticket=${encodeURIComponent(ticket)}`;
    }

    // The legacy route addresses the ledger as one `owner%2Fname` segment.
    return `${baseUrl}/api-gateway/ledgers/${encodeURIComponent(ledgerId)}/archive/main.zip`;
  }
}
