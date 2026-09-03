import { parseLedgerId } from "@/shared/str";
import { InternalServerError } from "@/shared/errors";
import type {
  DirectiveType,
  TransactionSubtype,
  DocumentSubtype,
  CustomSubtype,
} from "@/foundation/fava";
import type { Identity } from "@/server/api/identity";
import {
  authorizeLedger,
  AuthorizedLedgerService,
} from "@/features/ledger/utils/authorize-ledger";
import {
  AUTHORIZATION_ACTIONS,
  type AuthorizationAction,
} from "@/server/api/authorization/authorization-contract";

export type JournalResult = {
  total: number;
  data: Record<string, unknown>[];
  is_empty: boolean;
};

export type EntryContextResult = {
  entry: Record<string, unknown>;
  balances_before?: Record<string, string[]> | null;
  balances_after?: Record<string, string[]> | null;
  sha256sum: string;
  slice: string;
};

export type PlaintextJournalResult = { content: string };

export type AccountJournalResult = {
  items: {
    entry: Record<string, unknown>;
    change: Record<string, string>;
    balance: Record<string, string>;
  }[];
  total: number;
  account: string;
  with_children: boolean;
};

export type DeleteSliceResult = { message: string; entryHash: string };

export type DeleteMultiSlicesResult = {
  message: string;
  deletedHashes: string[];
};

export type UpdateSliceResult = {
  message: string;
  entryHash: string;
  newSha256sum: string;
};

export type JournalQueryParams = {
  account?: string;
  filter?: string;
  time?: string;
  directiveTypes?: DirectiveType[];
  transactionSubtypes?: TransactionSubtype[];
  documentSubtypes?: DocumentSubtype[];
  customSubtypes?: CustomSubtype[];
  limit?: number;
  offset?: number;
};

export type AccountJournalQueryParams = {
  account: string;
  filter?: string;
  time?: string;
  limit?: number;
  offset?: number;
  with_children?: boolean;
  conversion?: string;
};

export interface ILedgerJournalService {
  getJournal(params: {
    ledgerId: string;
    identity: Identity | undefined;
    query?: JournalQueryParams;
  }): Promise<JournalResult>;

  getContext(params: {
    ledgerId: string;
    identity: Identity | undefined;
    entryHash: string;
  }): Promise<EntryContextResult>;

  plaintextJournal(params: {
    ledgerId: string;
    identity: Identity | undefined;
    query?: { account?: string; filter?: string; time?: string };
  }): Promise<PlaintextJournalResult>;

  getAccountJournal(params: {
    ledgerId: string;
    identity: Identity | undefined;
    query: AccountJournalQueryParams;
  }): Promise<AccountJournalResult>;

  deleteSourceSlice(params: {
    ledgerId: string;
    identity: Identity;
    entryHash: string;
    sha256sum: string;
  }): Promise<DeleteSliceResult>;

  deleteMultiSourceSlices(params: {
    ledgerId: string;
    identity: Identity;
    entries: { entryHash: string; sha256sum: string }[];
  }): Promise<DeleteMultiSlicesResult>;

  updateSourceSlice(params: {
    ledgerId: string;
    identity: Identity;
    entryHash: string;
    sha256sum: string;
    newContent: string;
  }): Promise<UpdateSliceResult>;
}

export class LedgerJournalService
  extends AuthorizedLedgerService
  implements ILedgerJournalService
{
  /** Shared by all seven verbs: authorize, then hand back a ready Fava client. */
  private async getClient(
    ledgerId: string,
    identity: Identity | undefined,
    action: AuthorizationAction,
  ) {
    await authorizeLedger(identity, ledgerId, action, this.authDeps);
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity?.userId,
    );
    return { favaApiClient, ledgerOwner, ledgerName };
  }

  async getJournal(params: {
    ledgerId: string;
    identity: Identity | undefined;
    query?: JournalQueryParams;
  }): Promise<JournalResult> {
    const { ledgerId, identity, query } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
      AUTHORIZATION_ACTIONS.LEDGER_JOURNAL_READ,
    );

    const response = await favaApiClient.journal.getJournal(
      ledgerOwner,
      ledgerName,
      {
        account: query?.account || undefined,
        filter: query?.filter || undefined,
        time: query?.time || undefined,
        directive_types: query?.directiveTypes || undefined,
        limit: query?.limit ?? 20,
        offset: query?.offset ?? 0,
        transaction_subtypes: query?.transactionSubtypes || undefined,
        document_subtypes: query?.documentSubtypes || undefined,
        custom_subtypes: query?.customSubtypes || undefined,
      },
    );

    if (!response.data?.success) {
      throw new InternalServerError("Failed to get ledger journal entries");
    }

    const data = response.data.data;
    return {
      total: data.total,
      data: data.items as unknown as Record<string, unknown>[],
      is_empty: data.is_empty,
    };
  }

  async getContext(params: {
    ledgerId: string;
    identity: Identity | undefined;
    entryHash: string;
  }): Promise<EntryContextResult> {
    const { ledgerId, identity, entryHash } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
      AUTHORIZATION_ACTIONS.LEDGER_JOURNAL_READ,
    );

    const response = await favaApiClient.journal.getContext(
      ledgerOwner,
      ledgerName,
      entryHash,
    );

    if (!response.data?.success) {
      throw new InternalServerError("Failed to get entry context");
    }

    const ctx = response.data.data;
    return {
      entry: ctx.entry as unknown as Record<string, unknown>,
      balances_before: ctx.balances_before,
      balances_after: ctx.balances_after,
      sha256sum: ctx.sha256sum,
      slice: ctx.slice,
    };
  }

  async plaintextJournal(params: {
    ledgerId: string;
    identity: Identity | undefined;
    query?: { account?: string; filter?: string; time?: string };
  }): Promise<PlaintextJournalResult> {
    const { ledgerId, identity, query } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
      AUTHORIZATION_ACTIONS.LEDGER_JOURNAL_READ,
    );

    const response = await favaApiClient.journal.plaintextJournal(
      ledgerOwner,
      ledgerName,
      {
        account: query?.account || undefined,
        filter: query?.filter || undefined,
        time: query?.time || undefined,
      },
    );

    if (!response.data?.success) {
      throw new InternalServerError("Failed to get plaintext journal");
    }

    return { content: response.data.data.content };
  }

  async getAccountJournal(params: {
    ledgerId: string;
    identity: Identity | undefined;
    query: AccountJournalQueryParams;
  }): Promise<AccountJournalResult> {
    const { ledgerId, identity, query } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
      AUTHORIZATION_ACTIONS.LEDGER_JOURNAL_READ,
    );

    const response = await favaApiClient.journal.getAccountJournal(
      ledgerOwner,
      ledgerName,
      {
        account: query.account,
        filter: query.filter || undefined,
        time: query.time || undefined,
        limit: query.limit ?? 20,
        offset: query.offset ?? 0,
        with_children:
          query.with_children !== undefined ? query.with_children : true,
        conversion: query.conversion || "at_cost",
      },
    );

    if (!response.data?.success) {
      throw new InternalServerError("Failed to get account journal entries");
    }

    const data = response.data.data;
    return {
      items: data.items.map((item) => ({
        entry: item.entry as unknown as Record<string, unknown>,
        change: item.change,
        balance: item.balance,
      })),
      total: data.total,
      account: data.account,
      with_children: data.with_children,
    };
  }

  async deleteSourceSlice(params: {
    ledgerId: string;
    identity: Identity;
    entryHash: string;
    sha256sum: string;
  }): Promise<DeleteSliceResult> {
    const { ledgerId, identity, entryHash, sha256sum } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
      AUTHORIZATION_ACTIONS.LEDGER_ENTRIES_WRITE,
    );

    const response = await favaApiClient.journal.deleteSourceSlice(
      ledgerOwner,
      ledgerName,
      { entry_hash: entryHash, sha256sum },
    );

    if (!response.data?.success) {
      throw new InternalServerError("Failed to delete source slice");
    }

    const data = response.data.data;
    return { message: data.message, entryHash: data.entry_hash };
  }

  async deleteMultiSourceSlices(params: {
    ledgerId: string;
    identity: Identity;
    entries: { entryHash: string; sha256sum: string }[];
  }): Promise<DeleteMultiSlicesResult> {
    const { ledgerId, identity, entries } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
      AUTHORIZATION_ACTIONS.LEDGER_ENTRIES_WRITE,
    );

    const response = await favaApiClient.journal.deleteMultiSourceSlices(
      ledgerOwner,
      ledgerName,
      {
        entries: entries.map((e) => ({
          entry_hash: e.entryHash,
          sha256sum: e.sha256sum,
        })),
      },
    );

    if (!response.data?.success) {
      throw new InternalServerError("Failed to delete source slices");
    }

    const data = response.data.data;
    return { message: data.message, deletedHashes: data.deleted_hashes };
  }

  async updateSourceSlice(params: {
    ledgerId: string;
    identity: Identity;
    entryHash: string;
    sha256sum: string;
    newContent: string;
  }): Promise<UpdateSliceResult> {
    const { ledgerId, identity, entryHash, sha256sum, newContent } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
      AUTHORIZATION_ACTIONS.LEDGER_ENTRIES_WRITE,
    );

    const response = await favaApiClient.journal.updateSourceSlice(
      ledgerOwner,
      ledgerName,
      { entry_hash: entryHash, sha256sum, new_content: newContent },
    );

    if (!response.data?.success) {
      throw new InternalServerError("Failed to update source slice");
    }

    const data = response.data.data;
    return {
      message: data.message,
      entryHash: data.entry_hash,
      newSha256sum: data.new_sha256sum,
    };
  }
}
