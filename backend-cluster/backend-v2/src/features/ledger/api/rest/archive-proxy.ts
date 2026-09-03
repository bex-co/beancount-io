import type { RouterContext } from "@koa/router";
import fetch from "node-fetch";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { NotFoundError, UnauthenticatedError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import { parseLedgerId } from "@/shared/str";
import { assertSafeArchiveName } from "./safe-archive-name";
import { authorizeLedger } from "../../utils/authorize-ledger";
import { AUTHORIZATION_ACTIONS } from "@/server/api/authorization";

/**
 * Streaming a ledger archive from the ledger service.
 *
 * Shared by the identity-authenticated v1 route and the legacy public-compatible
 * route, so archive validation, upstream credentials, and response handling stay
 * consistent between them.
 */
export async function streamLedgerArchive(
  ctx: RouterContext,
  layers: AppLayers,
  config: Pick<AppConfig, "favaApi">,
  args: {
    ledgerId: string;
    archive: string;
    /** Omitted for a public-ledger read without a credential. */
    identity?: Identity;
  },
): Promise<void> {
  assertSafeArchiveName(args.archive);
  const { ledgerOwner, ledgerName } = parseLedgerId(args.ledgerId);
  await authorizeLedger(
    args.identity,
    args.ledgerId,
    AUTHORIZATION_ACTIONS.LEDGER_ARCHIVE_READ,
    { authorization: layers.services.authorization },
  );

  let authorization = "Anonymous";
  if (args.identity) {
    const user = await layers.database.models.user.getById(
      layers.database.db,
      args.identity.userId,
    );
    if (!user) {
      throw new UnauthenticatedError("User not found");
    }
    authorization = `Basic ${Buffer.from(
      `${user.ledger_username}:${user.ledger_password}`,
    ).toString("base64")}`;
  }

  const baseUrl = config.favaApi.baseUrl.replace(/\/$/, "");
  const response = await fetch(
    `${baseUrl}/ledgers/${encodeURIComponent(ledgerOwner)}/${encodeURIComponent(ledgerName)}/archive/${encodeURIComponent(args.archive)}`,
    { method: "GET", headers: { Authorization: authorization } },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new NotFoundError("Archive", args.archive);
    }
    ctx.throw(
      response.status,
      `Failed to download archive: ${response.statusText}`,
    );
  }

  for (const header of ["content-type", "content-disposition"]) {
    const value = response.headers.get(header);
    if (value) ctx.set(header, value);
  }
  ctx.set("Cache-Control", "private, no-store");
  ctx.body = response.body;
}
