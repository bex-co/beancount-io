import type { Context } from "koa";
import { giteaClientForRequest } from "@/server/auth";
import { RequestScopedGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import { getCacheHelper } from "@/foundation/clients/build-cache";
import {
  loadCachedFileMapForRepo,
  type GiteaCommitClient,
} from "@/foundation/clients/load-cached-ledger-file-map";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { LedgerFinanceService } from "@/features/ledger/service/ledger-finance-service";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { LedgerShellService } from "@/features/ledger/service/ledger-shell-service";
import { LedgerAccountService } from "@/features/ledger/service/ledger-account-service";
import { LedgerEntryService } from "@/features/ledger/service/ledger-entry-service";

/**
 * Per-request service construction: the transplanted donor services are
 * stateless orchestration classes, so instantiating them per request around the
 * request's own Gitea client is cheap and preserves the Python access model
 * (the forwarded credential does every Gitea call, including cache-key
 * resolution). The CacheHelper is process-wide; access safety comes from the
 * SHA resolution running under the caller's credential.
 */
export function servicesForRequest(ctx: Context) {
  const client = giteaClientForRequest(ctx);
  const factory = new RequestScopedGiteaClientFactory(client);
  const cache = getCacheHelper();
  return {
    client,
    finance: new LedgerFinanceService(factory, cache),
    data: new LedgerDataService(factory, cache),
    journal: new LedgerJournalService(factory, cache),
    shell: new LedgerShellService(factory, cache),
    account: new LedgerAccountService(factory, cache),
    entry: new LedgerEntryService(factory, cache),
  };
}

/** FileMap + parsed snapshot for the engine-direct routes (options/plugins/hierarchy). */
export async function loadSnapshotForRequest(ctx: Context, ledgerId: string) {
  const client = giteaClientForRequest(ctx);
  const [ledgerOwner, ledgerName] = [
    ledgerId.slice(0, ledgerId.indexOf("/")),
    ledgerId.slice(ledgerId.indexOf("/") + 1),
  ];
  const { files, entryPoint, repoPaths } = await loadCachedFileMapForRepo(
    client as unknown as GiteaCommitClient,
    getCacheHelper(),
    ledgerOwner,
    ledgerName,
  );
  const snapshot = await parseLedgerFiles(files, entryPoint, { repoPaths });
  return { files, entryPoint, snapshot };
}

export function ledgerIdOf(ctx: Context): string {
  return `${ctx.params.owner}/${ctx.params.repo_name}`;
}
