import { parseLedgerId } from "@/shared/str";
import { unwrapFavaResponse } from "@/foundation/fava";
import { filterNullish } from "@/shared/tools";
import type { Identity } from "@/server/api/identity";
import {
  authorizeLedger,
  AuthorizedLedgerService,
} from "@/features/ledger/utils/authorize-ledger";
import type {
  AttributesPublic,
  CommodityPairWithPricesPublic,
  EventPublic,
  DocumentPublic,
  TransactionPublic,
  BeancountErrorPublic,
  AccountLastEntryPublic,
  EntriesCountPerTypePublic,
  AccountReportPublic,
  DateAndBalanceWithAccountBalancePublic,
} from "@/foundation/fava";

type BaseParams = { ledgerId: string; identity: Identity | undefined };
type FilterParams = { account?: string; filter?: string; time?: string };
type ConversionParams = FilterParams & {
  conversion?: string;
  interval?: string;
};
type AccountReportParams = ConversionParams & { accountName: string };

export interface ILedgerDataService {
  getAttributes(params: BaseParams): Promise<AttributesPublic>;

  getCommodities(params: BaseParams): Promise<CommodityPairWithPricesPublic[]>;

  getEvents(params: BaseParams & FilterParams): Promise<EventPublic[]>;

  getDocuments(params: BaseParams & FilterParams): Promise<DocumentPublic[]>;

  getPayeeTransactions(
    params: BaseParams & { payee: string },
  ): Promise<TransactionPublic | null>;

  getNarrationTransactions(
    params: BaseParams & { narration: string },
  ): Promise<TransactionPublic | null>;

  getPayeeAccounts(params: BaseParams & { payee: string }): Promise<string[]>;

  getErrors(params: BaseParams): Promise<BeancountErrorPublic[]>;

  getCurrencies(params: BaseParams): Promise<string[]>;

  getSourceFiles(params: BaseParams): Promise<string[]>;

  getTags(params: BaseParams): Promise<string[]>;

  getYears(params: BaseParams): Promise<string[]>;

  getLinks(params: BaseParams): Promise<string[]>;

  getNarrations(params: BaseParams): Promise<string[]>;

  getPayees(params: BaseParams): Promise<string[]>;

  getAccountLastEntries(
    params: BaseParams & FilterParams,
  ): Promise<AccountLastEntryPublic[]>;

  getEntriesCountPerType(
    params: BaseParams & FilterParams,
  ): Promise<EntriesCountPerTypePublic[]>;

  getAccountReport(
    params: BaseParams & AccountReportParams,
  ): Promise<AccountReportPublic>;

  getIntervalTotals(
    params: BaseParams & AccountReportParams,
  ): Promise<DateAndBalanceWithAccountBalancePublic[]>;
}

export class LedgerDataService extends AuthorizedLedgerService implements ILedgerDataService {
  private async getClient(ledgerId: string, identity: Identity | undefined) {
    // Every verb on this service is a read, so "read" is the only rel it ever
    // needs — the seam still runs on every call (ADR 0006 D4), it just never
    // has to ask for more.
    await authorizeLedger(identity, ledgerId, "read", this.authDeps);
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity?.userId,
    );
    return { favaApiClient, ledgerOwner, ledgerName };
  }

  async getAttributes(params: BaseParams): Promise<AttributesPublic> {
    const { ledgerId, identity } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerAttributes(ledgerOwner, ledgerName),
      "get ledger filter options",
    );
  }

  async getCommodities(
    params: BaseParams,
  ): Promise<CommodityPairWithPricesPublic[]> {
    const { ledgerId, identity } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerCommodities(ledgerOwner, ledgerName),
      "get ledger commodities",
    );
  }

  async getEvents(params: BaseParams & FilterParams): Promise<EventPublic[]> {
    const { ledgerId, identity, ...rest } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerEvents(ledgerOwner, ledgerName, rest),
      "get ledger events",
    );
  }

  async getDocuments(
    params: BaseParams & FilterParams,
  ): Promise<DocumentPublic[]> {
    const { ledgerId, identity, ...rest } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerDocuments(ledgerOwner, ledgerName, rest),
      "get ledger documents",
    );
  }

  async getPayeeTransactions(
    params: BaseParams & { payee: string },
  ): Promise<TransactionPublic | null> {
    const { ledgerId, identity, payee } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerPayeeTransactions(
        ledgerOwner,
        ledgerName,
        { payee },
      ),
      "get ledger payee transactions",
    );
  }

  async getNarrationTransactions(
    params: BaseParams & { narration: string },
  ): Promise<TransactionPublic | null> {
    const { ledgerId, identity, narration } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerNarrationTransactions(
        ledgerOwner,
        ledgerName,
        { narration },
      ),
      "get ledger narration transactions",
    );
  }

  async getPayeeAccounts(
    params: BaseParams & { payee: string },
  ): Promise<string[]> {
    const { ledgerId, identity, payee } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerPayeeAccounts(ledgerOwner, ledgerName, {
        payee,
      }),
      "get ledger payee accounts",
    );
  }

  async getErrors(params: BaseParams): Promise<BeancountErrorPublic[]> {
    const { ledgerId, identity } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerErrors(ledgerOwner, ledgerName),
      "get ledger errors",
    );
  }

  async getCurrencies(params: BaseParams): Promise<string[]> {
    const { ledgerId, identity } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerCurrencies(ledgerOwner, ledgerName),
      "get ledger currencies",
    );
  }

  /**
   * The ledger's Beancount source files (`main.bean` plus everything it
   * transitively `include`s) — i.e. the set of valid targets for a new entry.
   */
  async getSourceFiles(params: BaseParams): Promise<string[]> {
    const { ledgerId, identity } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerSourceFiles(ledgerOwner, ledgerName),
      "get ledger source files",
    );
  }

  async getTags(params: BaseParams): Promise<string[]> {
    const { ledgerId, identity } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerTags(ledgerOwner, ledgerName),
      "get ledger tags",
    );
  }

  async getYears(params: BaseParams): Promise<string[]> {
    const { ledgerId, identity } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerYears(ledgerOwner, ledgerName),
      "get ledger years",
    );
  }

  async getLinks(params: BaseParams): Promise<string[]> {
    const { ledgerId, identity } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerLinks(ledgerOwner, ledgerName),
      "get ledger links",
    );
  }

  async getNarrations(params: BaseParams): Promise<string[]> {
    const { ledgerId, identity } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerNarrations(ledgerOwner, ledgerName),
      "get ledger narrations",
    );
  }

  async getPayees(params: BaseParams): Promise<string[]> {
    const { ledgerId, identity } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerPayees(ledgerOwner, ledgerName),
      "get ledger payees",
    );
  }

  async getAccountLastEntries(
    params: BaseParams & FilterParams,
  ): Promise<AccountLastEntryPublic[]> {
    const { ledgerId, identity, ...rest } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerAccountLastEntries(
        ledgerOwner,
        ledgerName,
        filterNullish(rest),
      ),
      "get ledger account last entries",
    );
  }

  async getEntriesCountPerType(
    params: BaseParams & FilterParams,
  ): Promise<EntriesCountPerTypePublic[]> {
    const { ledgerId, identity, ...rest } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerEntriesCountPerType(
        ledgerOwner,
        ledgerName,
        filterNullish(rest),
      ),
      "get ledger entries by type",
    );
  }

  async getAccountReport(
    params: BaseParams & AccountReportParams,
  ): Promise<AccountReportPublic> {
    const { ledgerId, identity, accountName, ...rest } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerAccountReport(
        ledgerOwner,
        ledgerName,
        filterNullish({ ...rest, account_name: accountName }) as {
          account_name: string;
        },
      ),
      "get ledger account report",
    );
  }

  async getIntervalTotals(
    params: BaseParams & AccountReportParams,
  ): Promise<DateAndBalanceWithAccountBalancePublic[]> {
    const { ledgerId, identity, accountName, ...rest } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
    );
    return unwrapFavaResponse(
      favaApiClient.reports.getLedgerIntervalTotals(
        ledgerOwner,
        ledgerName,
        filterNullish({ ...rest, account_name: accountName }) as {
          account_name: string;
        },
      ),
      "get ledger interval totals",
    );
  }
}
