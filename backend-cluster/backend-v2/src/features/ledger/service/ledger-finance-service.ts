import { parseLedgerId } from "@/shared/str";
import { unwrapFavaResponse } from "@/foundation/fava";
import { filterNullish } from "@/shared/tools";
import { InternalServerError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import {
  authorizeLedger,
  AuthorizedLedgerService,
} from "@/features/ledger/utils/authorize-ledger";
import { AUTHORIZATION_ACTIONS } from "@/server/api/authorization/authorization-contract";
import {
  composeHoldings,
  holdingsDetailQuery,
  resolveHoldingsConversion,
} from "@/features/ledger/utils/holdings";
import type {
  HoldingsGrouping,
  HoldingsResult,
} from "@/features/ledger/utils/holdings";
import {
  mapRegisterRows,
  resolveRegisterConversion,
  selectRegisterRoot,
} from "@/features/ledger/utils/register";
import type { RegisterResult } from "@/features/ledger/utils/register";
import {
  composeGains,
  resolveGainsBounds,
} from "@/features/ledger/utils/gains";
import type { GainsResult } from "@/features/ledger/utils/gains";
import { assertValidAccountPattern } from "@/features/ledger/utils/account-matcher";
import { BadUserInputError } from "@/shared/errors";
import type {
  OverviewPublic,
  IncomeStatementDataPublic,
  BalanceSheetDataPublic,
  TrialBalanceDataPublic,
} from "@/foundation/fava";
import {
  DirectiveType,
  type AccountJournalEntryPublic,
  type BeancountOptionsPublic,
  type FavaApiClient,
  type JournalTransactionPublic,
} from "@/foundation/fava";

type BaseParams = { ledgerId: string; identity: Identity | undefined };
type ConversionParams = {
  account?: string;
  filter?: string;
  time?: string;
  conversion?: string;
  interval?: string;
};

export interface ILedgerFinanceService {
  getOverview(params: BaseParams & ConversionParams): Promise<OverviewPublic>;

  getIncomeStatement(
    params: BaseParams & ConversionParams,
  ): Promise<IncomeStatementDataPublic>;

  getBalanceSheet(
    params: BaseParams & ConversionParams,
  ): Promise<BalanceSheetDataPublic>;

  getTrialBalance(
    params: BaseParams & ConversionParams,
  ): Promise<TrialBalanceDataPublic>;

  getHoldings(params: HoldingsParams): Promise<HoldingsResult>;

  getRegister(params: RegisterParams): Promise<RegisterResult>;

  getCapitalGains(params: GainsParams): Promise<GainsResult>;
}

export type HoldingsParams = BaseParams & {
  account?: string;
  conversion?: string;
  groupBy?: HoldingsGrouping;
};

export type RegisterParams = BaseParams & {
  account: string;
  time?: string;
  conversion?: string;
};

export type GainsParams = BaseParams & {
  account?: string;
  time?: string;
  fromDate?: string;
  toDate?: string;
};

export class LedgerFinanceService
  extends AuthorizedLedgerService
  implements ILedgerFinanceService
{
  private async getClient(ledgerId: string, identity: Identity | undefined) {
    await authorizeLedger(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_REPORTS_READ,
      this.authDeps,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity?.userId,
    );
    return { favaApiClient, ledgerOwner, ledgerName };
  }

  async getOverview(
    params: BaseParams & ConversionParams,
  ): Promise<OverviewPublic> {
    const { ledgerId, identity, ...rest } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerOverview(
        ledgerOwner,
        ledgerName,
        filterNullish(rest),
      ),
      "get ledger overview",
    );
  }

  async getIncomeStatement(
    params: BaseParams & ConversionParams,
  ): Promise<IncomeStatementDataPublic> {
    const { ledgerId, identity, ...rest } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerIncomeStatement(
        ledgerOwner,
        ledgerName,
        filterNullish(rest),
      ),
      "get ledger income statement",
    );
  }

  async getBalanceSheet(
    params: BaseParams & ConversionParams,
  ): Promise<BalanceSheetDataPublic> {
    const { ledgerId, identity, ...rest } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerBalanceSheet(
        ledgerOwner,
        ledgerName,
        filterNullish(rest),
      ),
      "get ledger balance sheet",
    );
  }

  async getTrialBalance(
    params: BaseParams & ConversionParams,
  ): Promise<TrialBalanceDataPublic> {
    const { ledgerId, identity, ...rest } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerTrialBalance(
        ledgerOwner,
        ledgerName,
        filterNullish(rest),
      ),
      "get ledger trial balance",
    );
  }

  async getHoldings(params: HoldingsParams): Promise<HoldingsResult> {
    const { ledgerId, identity, account, conversion, groupBy } = params;
    if (account !== undefined) assertValidAccountPattern(account);
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    const options = await this.reportOptions(
      favaApiClient,
      ledgerOwner,
      ledgerName,
    );
    const target = resolveHoldingsConversion(
      conversion,
      options?.operating_currency ?? [],
    );
    const queryResult = await unwrapFavaResponse(
      favaApiClient.shell.queryShellPost(ledgerOwner, ledgerName, {
        query: holdingsDetailQuery(target),
      }),
      "get ledger holdings",
    );
    const result = queryResult.result;
    if (!("types" in result && "rows" in result)) {
      throw new InternalServerError("Holdings query returned no table");
    }
    return composeHoldings({
      columns: result.types.map((col) => col.name),
      rows: result.rows as (
        | string
        | number
        | boolean
        | null
        | Record<string, unknown>
      )[][],
      groupBy: groupBy ?? "account",
      account,
      roots: this.rootsOf(options),
      conversionTarget: target,
      asOf: new Date().toISOString().slice(0, 10),
    });
  }

  private rootsOf(options: BeancountOptionsPublic): string[] {
    return [
      options.name_assets,
      options.name_liabilities,
      options.name_equity,
      options.name_income,
      options.name_expenses,
    ].filter((root): root is string => typeof root === "string");
  }

  async getRegister(params: RegisterParams): Promise<RegisterResult> {
    const { ledgerId, identity, account, time, conversion } = params;
    assertValidAccountPattern(account);
    if (account === undefined || account === "") {
      throw new BadUserInputError(
        "Register needs an account. Name the account to list, such as Assets:Checking.",
      );
    }
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    const [options, postings, balances] = await Promise.all([
      this.reportOptions(favaApiClient, ledgerOwner, ledgerName),
      unwrapFavaResponse(
        favaApiClient.reports.getLedgerPostingsPerAccount(
          ledgerOwner,
          ledgerName,
          filterNullish({ time }),
        ),
        "get ledger postings per account",
      ),
      this.balanceAccounts(favaApiClient, ledgerOwner, ledgerName, time),
    ]);
    const roots = this.rootsOf(options);
    const root = selectRegisterRoot(
      account,
      postings.map((row) => row.account),
      balances,
      roots,
    );
    if (root === null) return { account: null, rows: [] };
    const target = resolveRegisterConversion(
      conversion,
      options?.operating_currency ?? [],
    );
    const items = await this.registerItems(
      favaApiClient,
      ledgerOwner,
      ledgerName,
      root,
      time,
      target,
    );
    if (items.length === 0) return { account: null, rows: [] };
    return { account: root, rows: mapRegisterRows(items, root) };
  }

  /** One options read: roots for the account matcher, operating currency. */
  private reportOptions(
    favaApiClient: Pick<FavaApiClient, "reports">,
    ledgerOwner: string,
    ledgerName: string,
  ): Promise<BeancountOptionsPublic> {
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerOptions(ledgerOwner, ledgerName),
      "get ledger options",
    );
  }

  /** Every page of a `{ items, total }` journal read, in order. */
  private async pageAll<T>(
    fetch: (offset: number) => Promise<{ items: T[]; total: number }>,
  ): Promise<T[]> {
    const all: T[] = [];
    let offset = 0;
    for (;;) {
      const page = await fetch(offset);
      all.push(...page.items);
      offset += page.items.length;
      if (page.items.length === 0 || offset >= page.total) break;
    }
    return all;
  }

  /** Accounts asserting a balance in the window, all pages. */
  private async balanceAccounts(
    favaApiClient: Pick<FavaApiClient, "journal">,
    ledgerOwner: string,
    ledgerName: string,
    time: string | undefined,
  ): Promise<string[]> {
    const items = await this.pageAll((offset) =>
      unwrapFavaResponse(
        favaApiClient.journal.getJournal(ledgerOwner, ledgerName, {
          ...filterNullish({ time }),
          directive_types: [DirectiveType.Balance],
          limit: 1000,
          offset,
        }),
        "get ledger balance accounts",
      ),
    );
    return items.flatMap((item) =>
      "account" in item && typeof item.account === "string"
        ? [item.account]
        : [],
    );
  }

  async getCapitalGains(params: GainsParams): Promise<GainsResult> {
    const { ledgerId, identity, account, time, fromDate, toDate } = params;
    const { start, end } = resolveGainsBounds(fromDate, toDate);
    if (account !== undefined) assertValidAccountPattern(account);
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    const [options, transactions] = await Promise.all([
      this.reportOptions(favaApiClient, ledgerOwner, ledgerName),
      this.journalTransactions(
        favaApiClient,
        ledgerOwner,
        ledgerName,
        time,
      ),
    ]);
    return composeGains({
      transactions,
      account,
      roots: this.rootsOf(options),
      start,
      end,
    });
  }

  /** The window's transactions, newest-first, all pages. */
  private async journalTransactions(
    favaApiClient: Pick<FavaApiClient, "journal">,
    ledgerOwner: string,
    ledgerName: string,
    time: string | undefined,
  ): Promise<JournalTransactionPublic[]> {
    const items = await this.pageAll((offset) =>
      unwrapFavaResponse(
        favaApiClient.journal.getJournal(ledgerOwner, ledgerName, {
          ...filterNullish({ time }),
          directive_types: [DirectiveType.Transaction],
          limit: 1000,
          offset,
        }),
        "get ledger transactions",
      ),
    );
    return items.flatMap((item) =>
      item.directive_type === DirectiveType.Transaction
        ? [item as JournalTransactionPublic]
        : [],
    );
  }

  /** The root's journal items, newest-first, all pages. */
  private registerItems(
    favaApiClient: Pick<FavaApiClient, "journal">,
    ledgerOwner: string,
    ledgerName: string,
    root: string,
    time: string | undefined,
    target: string | null,
  ): Promise<AccountJournalEntryPublic[]> {
    return this.pageAll((offset) =>
      unwrapFavaResponse(
        favaApiClient.journal.getAccountJournal(ledgerOwner, ledgerName, {
          account: root,
          ...filterNullish({ time }),
          with_children: true,
          ...(target === null ? {} : { conversion: target }),
          directive_types: [DirectiveType.Transaction, DirectiveType.Balance],
          limit: 1000,
          offset,
        }),
        "get ledger register",
      ),
    );
  }
}
