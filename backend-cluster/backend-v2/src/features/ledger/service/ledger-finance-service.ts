import { parseLedgerId } from "@/shared/str";
import { unwrapFavaResponse } from "@/foundation/fava";
import { filterNullish } from "@/shared/tools";
import type { Identity } from "@/server/api/identity";
import {
  authorizeLedger,
  AuthorizedLedgerService,
} from "@/features/ledger/utils/authorize-ledger";
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
}

export class LedgerFinanceService extends AuthorizedLedgerService implements ILedgerFinanceService {
  private async getClient(ledgerId: string, identity: Identity | undefined) {
    await authorizeLedger(identity, ledgerId, "read", this.authDeps);
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
}
