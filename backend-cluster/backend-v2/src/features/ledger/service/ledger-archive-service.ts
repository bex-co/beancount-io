import { Readable } from "node:stream";
import fetch, { type Response } from "node-fetch";
import type { AppConfig } from "@/config/config";
import type { IModels } from "@/foundation/models";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  type IAuthorizationService,
} from "@/server/api/authorization";
import {
  NotFoundError,
  UnauthenticatedError,
  ServiceUnavailableError,
} from "@/shared/errors";
import { parseLedgerId } from "@/shared/str";
import { assertSafeArchiveName } from "../utils/safe-archive-name";
import { authorizeLedger } from "../utils/authorize-ledger";
export interface ArchiveRequest {
  ledgerId: string;
  archive: string;
  identity?: Identity;
}
export interface ILedgerArchiveService {
  download(args: ArchiveRequest): Promise<Response>;
}
/** One authorized upstream download shared by REST streams and MCP blobs. */
export class LedgerArchiveService implements ILedgerArchiveService {
  constructor(
    private readonly models: Pick<IModels, "user">,
    private readonly db: DbExecutor,
    private readonly config: Pick<AppConfig, "favaApi">,
    private readonly authorization: IAuthorizationService,
  ) {}
  async download(args: ArchiveRequest): Promise<Response> {
    assertSafeArchiveName(args.archive);
    const { ledgerOwner, ledgerName } = parseLedgerId(args.ledgerId);
    await authorizeLedger(
      args.identity,
      args.ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_ARCHIVE_READ,
      { authorization: this.authorization },
    );
    let authorization = "Anonymous";
    if (args.identity) {
      const user = await this.models.user.getById(
        this.db,
        args.identity.userId,
      );
      if (!user) throw new UnauthenticatedError("User not found");
      authorization = `Basic ${Buffer.from(`${user.ledger_username}:${user.ledger_password}`).toString("base64")}`;
    }
    const baseUrl = this.config.favaApi.baseUrl.replace(/\/$/, "");
    let response: Response;
    try {
      response = await fetch(
        `${baseUrl}/ledgers/${encodeURIComponent(ledgerOwner)}/${encodeURIComponent(ledgerName)}/archive/${encodeURIComponent(args.archive)}`,
        { method: "GET", headers: { Authorization: authorization } },
      );
    } catch {
      throw new ServiceUnavailableError("Ledger archive");
    }
    if (!response.ok) {
      if (response.body instanceof Readable) response.body.destroy();
      if (response.status === 404)
        throw new NotFoundError("Archive", args.archive);
      throw new ServiceUnavailableError("Ledger archive");
    }
    return response;
  }
}
