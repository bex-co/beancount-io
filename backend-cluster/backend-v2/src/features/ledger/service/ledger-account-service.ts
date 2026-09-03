import type { Identity } from "@/server/api/identity";
import {
  authorizeLedger,
  AuthorizedLedgerService,
} from "@/features/ledger/utils/authorize-ledger";
import { createLedgerId } from "@/shared/str";
import { unwrapFavaResponse } from "@/foundation/fava";
import {
  getAllOpenEntries,
  getAllCloseEntries,
  getAccountEntryCounts,
} from "@/features/ledger/utils/account-entries";
import { logger } from "@/shared/logger";
import { AUTHORIZATION_ACTIONS } from "@/server/api/authorization/authorization-contract";

export type LedgerAccountDetail = {
  account: string;
  closeDate?: string | null;
  meta?: Record<string, string | number | boolean | null> | null;
  upToDateStatus?: string | null;
  balanceString?: string | null;
  lastEntry?: { date: string; entryHash: string } | null;
};

export type LedgerAccountDirectiveItem = {
  account: string;
  openedAt: string;
  closedAt?: string;
  balance?: Record<string, string>;
  entryCount: number;
  entryHash: string;
  closeEntryHash?: string;
  /** The `open` directive's metadata (e.g. `cash-flow-role`), when any. */
  meta?: Record<string, string | number | boolean | null>;
};

export interface ILedgerAccountService {
  getAccounts(
    ledgerOwner: string,
    ledgerName: string,
    status?: string,
    identity?: Identity,
  ): Promise<string[]>;
  getAccountsDetail(
    ledgerOwner: string,
    ledgerName: string,
    identity?: Identity,
  ): Promise<LedgerAccountDetail[]>;
  getAccountDirectives(
    ledgerOwner: string,
    ledgerName: string,
    identity?: Identity,
  ): Promise<LedgerAccountDirectiveItem[]>;
}

export class LedgerAccountService
  extends AuthorizedLedgerService
  implements ILedgerAccountService
{
  private readonly logger = logger.child({ module: "ledger-account-service" });
  async getAccounts(
    ledgerOwner: string,
    ledgerName: string,
    status?: string,
    identity?: Identity,
  ): Promise<string[]> {
    const items = await this.getAccountsDetail(
      ledgerOwner,
      ledgerName,
      identity,
    );
    if (status === "open") {
      return items.filter((a) => a.closeDate == null).map((a) => a.account);
    }
    if (status === "closed") {
      return items.filter((a) => a.closeDate != null).map((a) => a.account);
    }
    return items.map((a) => a.account);
  }

  async getAccountsDetail(
    ledgerOwner: string,
    ledgerName: string,
    identity?: Identity,
  ): Promise<LedgerAccountDetail[]> {
    const ledgerId = createLedgerId(ledgerOwner, ledgerName);
    await authorizeLedger(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_ACCOUNTS_READ,
      this.authDeps,
    );
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity?.userId,
    );
    const accounts = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerAccounts(ledgerOwner, ledgerName),
      "get ledger accounts",
    );
    return Object.entries(accounts).map(([account, data]) => ({
      account,
      closeDate: data.close_date,
      meta: data.meta,
      upToDateStatus: data.uptodate_status,
      balanceString: data.balance_string,
      lastEntry: data.last_entry
        ? { date: data.last_entry.date, entryHash: data.last_entry.entry_hash }
        : null,
    }));
  }

  async getAccountDirectives(
    ledgerOwner: string,
    ledgerName: string,
    identity?: Identity,
  ): Promise<LedgerAccountDirectiveItem[]> {
    const ledgerId = createLedgerId(ledgerOwner, ledgerName);
    await authorizeLedger(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_ACCOUNTS_READ,
      this.authDeps,
    );
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity?.userId,
    );

    this.logger.debug("Fetching account directives", {
      ledgerOwner,
      ledgerName,
    });

    const [openItems, closeItems, lastEntriesResponse, countMap] =
      await Promise.all([
        getAllOpenEntries(favaApiClient, ledgerOwner, ledgerName),
        getAllCloseEntries(favaApiClient, ledgerOwner, ledgerName),
        favaApiClient.reports.getLedgerAccountLastEntries(
          ledgerOwner,
          ledgerName,
        ),
        getAccountEntryCounts(favaApiClient, ledgerOwner, ledgerName),
      ]);

    const closeMap = new Map<string, { date: string; entry_hash: string }>(
      closeItems.map((item) => [
        item.account,
        { date: item.date, entry_hash: item.entry_hash },
      ]),
    );

    const balanceMap = new Map<string, Record<string, string>>(
      (lastEntriesResponse.data?.data ?? []).map((entry) => [
        entry.account,
        entry.balance,
      ]),
    );

    return openItems.map((item) => ({
      account: item.account,
      openedAt: item.date,
      closedAt: closeMap.get(item.account)?.date,
      closeEntryHash: closeMap.get(item.account)?.entry_hash,
      balance: balanceMap.get(item.account),
      entryCount: countMap.get(item.account) ?? 0,
      entryHash: item.entry_hash,
      meta: item.meta ?? undefined,
    }));
  }
}
