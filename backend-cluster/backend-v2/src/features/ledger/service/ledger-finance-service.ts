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
  type FavaApiClient,
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
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    const options = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerOptions(ledgerOwner, ledgerName),
      "get ledger options",
    );
    const target = resolveHoldingsConversion(
      conversion,
      options?.operating_currency ?? [],
    );
    const queryResult = await unwrapFavaResponse(
      favaApiClient.shell.queryShell(ledgerOwner, ledgerName, {
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

  private rootsOf(options: {
    name_assets?: string;
    name_liabilities?: string;
    name_equity?: string;
    name_income?: string;
    name_expenses?: string;
  } | null): string[] {
    if (options === null || options === undefined) return [];
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
      unwrapFavaResponse(
        favaApiClient.reports.getLedgerOptions(ledgerOwner, ledgerName),
        "get ledger options",
      ),
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

  /** Accounts asserting a balance in the window, all pages. */
  private async balanceAccounts(
    favaApiClient: Pick<FavaApiClient, "journal">,
    ledgerOwner: string,
    ledgerName: string,
    time: string | undefined,
  ): Promise<string[]> {
    const accounts: string[] = [];
    let offset = 0;
    for (;;) {
      const data = await unwrapFavaResponse(
        favaApiClient.journal.getJournal(ledgerOwner, ledgerName, {
          ...filterNullish({ time }),
          directive_types: [DirectiveType.Balance],
          limit: 1000,
          offset,
        }),
        "get ledger balance accounts",
      );
      for (const item of data.items) {
        if ("account" in item && typeof item.account === "string") {
          accounts.push(item.account);
        }
      }
      offset += data.items.length;
      if (data.items.length === 0 || offset >= data.total) break;
    }
    return accounts;
  }

  /** The root's journal items, newest-first, all pages. */
  private async registerItems(
    favaApiClient: Pick<FavaApiClient, "journal">,
    ledgerOwner: string,
    ledgerName: string,
    root: string,
    time: string | undefined,
    target: string | null,
  ): Promise<AccountJournalEntryPublic[]> {
    const items: AccountJournalEntryPublic[] = [];
    let offset = 0;
    for (;;) {
      const data = await unwrapFavaResponse(
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
      );
      items.push(...data.items);
      offset += data.items.length;
      if (data.items.length === 0 || offset >= data.total) break;
    }
    return items;
  }
}
