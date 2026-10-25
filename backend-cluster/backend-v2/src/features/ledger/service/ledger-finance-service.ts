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
import type {
  OverviewPublic,
  IncomeStatementDataPublic,
  BalanceSheetDataPublic,
  TrialBalanceDataPublic,
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
}

export type HoldingsParams = BaseParams & {
  account?: string;
  conversion?: string;
  groupBy?: HoldingsGrouping;
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
      conversionTarget: target,
      asOf: new Date().toISOString().slice(0, 10),
    });
  }
}
