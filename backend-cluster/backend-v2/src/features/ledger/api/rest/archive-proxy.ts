import type { RouterContext } from "@koa/router";
import type { AppLayers } from "@/foundation/composition";
import type { ArchiveRequest } from "../../service/ledger-archive-service";

/** Both REST spellings stream the same protected archive download. */
export async function streamLedgerArchive(
  ctx: RouterContext,
  layers: AppLayers,
  args: ArchiveRequest,
): Promise<void> {
  const response = await layers.services.ledgerArchive.download(args);
  for (const header of ["content-type", "content-disposition"]) {
    const value = response.headers.get(header);
    if (value) ctx.set(header, value);
  }
  ctx.set("Cache-Control", "private, no-store");
  ctx.body = response.body;
}
