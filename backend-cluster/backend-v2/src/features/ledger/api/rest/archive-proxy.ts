import type { RouterContext } from "@koa/router";
import fetch from "node-fetch";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { NotFoundError, UnauthenticatedError } from "@/shared/errors";
import { parseLedgerId } from "@/shared/str";

/**
 * Streaming a ledger archive from the ledger service.
 *
 * Shared by the v1 ticket-authenticated route and the legacy `?token=` one, so
 * the two differ only in how the caller proved the right to the bytes — which
 * is the whole point of the v1 route, and the only thing that should differ.
 */
export async function streamLedgerArchive(
  ctx: RouterContext,
  layers: AppLayers,
  config: Pick<AppConfig, "favaApi">,
  args: {
    ledgerId: string;
    archive: string;
    /**
     * Whose ledger credentials to use. `null`/`undefined` means an anonymous
     * read of a public ledger, which falls back to the owner's credentials.
     */
    userId?: string | null;
  },
): Promise<void> {
  const { ledgerOwner, ledgerName } = parseLedgerId(args.ledgerId);

  const user = args.userId
    ? await layers.database.models.user.getById(layers.database.db, args.userId)
    : await layers.database.models.user.getUserByUsername(
        layers.database.db,
        ledgerOwner,
      );
  if (!user) {
    throw new UnauthenticatedError("User not found");
  }

  const baseUrl = config.favaApi.baseUrl.replace(/\/$/, "");
  const basicAuth = Buffer.from(
    `${user.ledger_username}:${user.ledger_password}`,
  ).toString("base64");

  const response = await fetch(
    `${baseUrl}/ledgers/${ledgerOwner}/${ledgerName}/archive/${args.archive}`,
    { method: "GET", headers: { Authorization: `Basic ${basicAuth}` } },
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
  ctx.body = response.body;
}
