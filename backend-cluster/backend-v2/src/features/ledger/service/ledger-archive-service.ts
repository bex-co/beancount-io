import { ARCHIVE_NOT_FOUND_HINT } from "@/shared/errors/lookup-hints";
import { Readable } from "node:stream";
import type { AppConfig } from "@/config/config";
import type { IModels } from "@/foundation/models";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  type IAuthorizationService,
} from "@/server/api/authorization";
import { getBasicAuthHeader } from "@/features/auth/utils/auth";
import {
  BadUserInputError,
  NotFoundError,
  UnauthenticatedError,
  ServiceUnavailableError,
} from "@/shared/errors";
import { parseLedgerId } from "@/shared/str";
import { archiveRef, assertSafeArchiveName } from "../utils/safe-archive-name";
import { authorizeLedger } from "../utils/authorize-ledger";

/**
 * How long Gitea may take to send response headers. It builds the whole
 * archive before its first byte, so this allows for a large one; the deadline
 * is cleared once headers arrive and the body then streams for as long as the
 * caller keeps reading.
 */
export const ARCHIVE_HEADERS_TIMEOUT_MS = 90_000;

/**
 * How long the commit lookup that precedes a full-SHA archive may take. It
 * reads one object, so anything slower is an upstream failure.
 */
const COMMIT_LOOKUP_TIMEOUT_MS = 10_000;

/**
 * A full-length object id. Gitea resolves any other reference itself and
 * answers 404 promptly when it does not exist, but takes a full SHA on trust
 * and never sends headers for one it does not have (w23/003).
 */
const FULL_COMMIT_ID_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;

export interface ArchiveRequest {
  ledgerId: string;
  archive: string;
  identity?: Identity;
}
/** An authorized archive download, still streaming from Gitea. */
export interface LedgerArchive {
  /** Gitea's body, never buffered here; destroying it ends the Gitea request. */
  body: Readable;
  contentType: string;
  contentDisposition?: string;
  /** Declared byte length, when Gitea sends one. */
  contentLength?: number;
}
export interface ILedgerArchiveService {
  download(args: ArchiveRequest): Promise<LedgerArchive>;
}
/** One authorized Gitea download shared by REST streams and MCP blobs. */
export class LedgerArchiveService implements ILedgerArchiveService {
  constructor(
    private readonly models: Pick<IModels, "user">,
    private readonly db: DbExecutor,
    private readonly config: Pick<AppConfig, "gitea">,
    private readonly authorization: IAuthorizationService,
  ) {}
  async download(args: ArchiveRequest): Promise<LedgerArchive> {
    assertSafeArchiveName(args.archive);
    const { ledgerOwner, ledgerName } = parseLedgerId(args.ledgerId);
    await authorizeLedger(
      args.identity,
      args.ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_ARCHIVE_READ,
      { authorization: this.authorization },
    );
    // An authorized public read sends no credential, so it cannot reach a
    // private repository even if authorization were wrong.
    let headers: Record<string, string> = {};
    if (args.identity) {
      const user = await this.models.user.getById(
        this.db,
        args.identity.userId,
      );
      if (!user) throw new UnauthenticatedError("User not found");
      headers = getBasicAuthHeader(user.ledger_username, user.ledger_password);
    }
    const repoUrl = `${this.config.gitea.internalBaseUrl}/api/v1/repos/${encodeURIComponent(ledgerOwner)}/${encodeURIComponent(ledgerName)}`;
    const ref = archiveRef(args.archive);
    if (FULL_COMMIT_ID_PATTERN.test(ref)) {
      const lookup = await this.fetchGitea(
        `${repoUrl}/git/commits/${ref}?stat=false&verification=false&files=false`,
        headers,
        COMMIT_LOOKUP_TIMEOUT_MS,
      );
      await lookup.body?.cancel();
      if (!lookup.ok) this.refuse(lookup.status, args.archive);
    }
    const response = await this.fetchGitea(
      `${repoUrl}/archive/${encodeURIComponent(args.archive)}`,
      headers,
      ARCHIVE_HEADERS_TIMEOUT_MS,
    );
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      this.refuse(response.status, args.archive);
    }
    const length = response.headers.get("content-length");
    return {
      body: Readable.fromWeb(
        response.body as Parameters<typeof Readable.fromWeb>[0],
      ),
      contentType:
        response.headers.get("content-type") ?? "application/octet-stream",
      contentDisposition:
        response.headers.get("content-disposition") ?? undefined,
      contentLength: length === null ? undefined : Number(length),
    };
  }

  /** A Gitea request whose headers must arrive within `timeoutMs`. */
  private async fetchGitea(
    url: string,
    headers: Record<string, string>,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { headers, signal: controller.signal });
    } catch {
      throw new ServiceUnavailableError("Ledger archive");
    } finally {
      clearTimeout(deadline);
    }
  }

  /**
   * Gitea's answer for a reference it cannot archive. Only an actual upstream
   * failure is "unavailable": a caller told to retry a typo with backoff
   * spends the shared download budget on a request that cannot succeed.
   */
  private refuse(status: number, archive: string): never {
    if (status === 404)
      throw new NotFoundError("Archive", archive, ARCHIVE_NOT_FOUND_HINT);
    if (status === 400 || status === 422)
      throw new BadUserInputError(
        `Archive '${archive}' does not name a branch, tag or commit`,
        "archive",
      );
    throw new ServiceUnavailableError("Ledger archive");
  }
}
