import { parseLedgerId } from "@/shared/str";
import { unwrapFavaResponse } from "@/foundation/fava";
import type { Identity } from "@/server/api/identity";
import {
  authorizeLedger,
  AuthorizedLedgerService,
} from "@/features/ledger/utils/authorize-ledger";
import {
  AUTHORIZATION_ACTIONS,
  type AuthorizationAction,
} from "@/server/api/authorization/authorization-contract";
import { BadUserInputError } from "@/shared/errors";
import { assertBulkEntriesSize } from "@/features/ledger/utils/bulk-entries-cap";
import {
  toReportedProjection,
  type ReportedProjection,
} from "@/features/ledger/utils/bean-check-errors";
import { directiveLimitExemptParams } from "@/features/ledger/operations/directive-limit-bypass";
import { normalizeJournalKinds } from "@/features/ledger/utils/journal-kinds";
import { assertAmountsFitEngineDecimal } from "@/features/ledger/utils/engine-decimal";

/**
 * The page a journal read asks for: limit 1–1000 (default 20), offset 0 or
 * more (default 0), both safe integers.
 *
 * Checked here because GraphQL's `Number` arguments arrive unchecked, and the
 * ledger pages with `items.slice(offset, offset + limit)`: a negative limit
 * silently dropped the last entries, a fraction truncated, and zero answered
 * an empty page beside a nonzero total (w6/007). REST and MCP refuse the same
 * values in their schemas; this holds GraphQL to that contract before any
 * authorization or ledger work, as the commits service does for its pages.
 */
function journalPage(query?: { limit?: number; offset?: number }): {
  limit: number;
  offset: number;
} {
  const limit = query?.limit ?? 20;
  const offset = query?.offset ?? 0;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
    throw new BadUserInputError(
      "limit must be an integer from 1 to 1000",
      "limit",
    );
  }
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new BadUserInputError(
      "offset must be a non-negative integer",
      "offset",
    );
  }
  return { limit, offset };
}

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
  /**
   * The feed URL when the entry comes from a managed price include (ADR 015),
   * else null: the entry is read-only, with no source file to open.
   */
  managed_source: string | null;
  /**
   * The entry hash of the source entry when this entry is a copy a plugin or a
   * pad generated from it (amortize_over, forecast, padding), else null. A copy
   * shares its source's text and checksum, so editing or deleting it changes the
   * source and every other copy: clients offer neither (w21/443).
   */
  generated_from: string | null;
};

export type PlaintextJournalResult = {
  content: string;
  /** Entries the filters select, before `offset`/`limit` (w23/044). */
  total: number;
  /** Whether entries remain after this page. */
  truncated: boolean;
};

/** The most entries one page of the plaintext export may hold. */
export const PLAINTEXT_PAGE_MAX = 1000;

type PlaintextJournalQuery = {
  account?: string;
  filter?: string;
  time?: string;
  /** Omitted, every entry: the dashboard's export reads the whole ledger. */
  limit?: number | null;
  offset?: number | null;
};

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

/**
 * The files a slice write rewrote, each once, as the ledger reports them; an
 * older ledger service sends none. MCP reports them as `wrote` (w23/042).
 */
type TouchedFiles = { files: string[] };

/** The affected block per file: stored replacement on update, removed slice on delete. */
type SlicePreview = Array<{ path: string; text: string }>;

/**
 * The ledger's projection check for the write, always reported — even under
 * `allowInvalid`, which suppresses only the refusal (w23/161).
 */
type ReportedWrite = { validation: ReportedProjection };

export type DeleteSliceResult = {
  message: string;
  dryRun: boolean;
  entryHash: string;
  /** Per-file affected text; populated on dry runs only (w23/m7/t003). */
  preview?: SlicePreview;
} & TouchedFiles &
  ReportedWrite;

export type DeleteMultiSlicesResult = {
  message: string;
  dryRun: boolean;
  /** How many entries were deleted — hashes are stale the moment they are. */
  deletedCount: number;
  /** Per-file affected text; populated on dry runs only (w23/m7/t003). */
  preview?: SlicePreview;
} & TouchedFiles &
  ReportedWrite;

export type UpdateSliceResult = TouchedFiles &
  ReportedWrite & {
    message: string;
    dryRun: boolean;
    entryHash: string;
    /** Per-file affected text; populated on dry runs only (w23/m7/t003). */
    preview?: SlicePreview;
    newSha256sum: string;
    /** The entry's public ID after the commit, re-read post-commit (w2/m26). */
    newEntryHash: string;
  };

export type JournalQueryParams = {
  account?: string;
  filter?: string;
  time?: string;
  /** Matched case-insensitively against `DirectiveType` (w23/006). */
  directiveTypes?: readonly string[] | null;
  transactionSubtypes?: readonly string[] | null;
  documentSubtypes?: readonly string[] | null;
  customSubtypes?: readonly string[] | null;
  limit?: number;
  offset?: number;
};

export type AccountJournalQueryParams = {
  account: string;
  /** Shared report-stream AccountFilter; maps to ledger `filter_account`. */
  filterAccount?: string;
  filter?: string;
  time?: string;
  /** Matched case-insensitively against `DirectiveType` (w23/006). */
  directiveTypes?: readonly string[] | null;
  transactionSubtypes?: readonly string[] | null;
  documentSubtypes?: readonly string[] | null;
  customSubtypes?: readonly string[] | null;
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
    query?: PlaintextJournalQuery;
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
    /** Commit even when the delete adds bean-check errors (w21/m1). */
    allowInvalid?: boolean;
    /** Run every check and commit nothing (w23/m7/t003). */
    dryRun?: boolean;
  }): Promise<DeleteSliceResult>;

  deleteMultiSourceSlices(params: {
    ledgerId: string;
    identity: Identity;
    entries: { entryHash: string; sha256sum: string }[];
    /** Commit even when the deletes add bean-check errors (w21/m1). */
    allowInvalid?: boolean;
    /** Run every check and commit nothing (w23/m7/t003). */
    dryRun?: boolean;
  }): Promise<DeleteMultiSlicesResult>;

  updateSourceSlice(params: {
    ledgerId: string;
    identity: Identity;
    entryHash: string;
    sha256sum: string;
    newContent: string;
    /** Mobile writes are exempt from the directive limit; the default is web. */
    platform?: "web" | "mobile";
    /** Commit even when the edit adds bean-check errors (w21/m1). */
    allowInvalid?: boolean;
    /** Run every check and commit nothing (w23/m7/t003). */
    dryRun?: boolean;
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
    const page = journalPage(query);
    const kinds = normalizeJournalKinds(query);
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
      AUTHORIZATION_ACTIONS.LEDGER_JOURNAL_READ,
    );

    const data = await unwrapFavaResponse(
      favaApiClient.journal.getJournal(ledgerOwner, ledgerName, {
        account: query?.account || undefined,
        filter: query?.filter || undefined,
        time: query?.time || undefined,
        ...page,
        ...kinds,
      }),
      "get ledger journal entries",
    );
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

    // Entry hashes are content-derived, so a stale hash is a NORMAL outcome
    // after an edit: the ledger service answers 404/409, which unwrapFavaResponse
    // maps to NotFound/Conflict instead of an opaque 500.
    const ctx = await unwrapFavaResponse(
      favaApiClient.journal.getContext(ledgerOwner, ledgerName, entryHash),
      "get entry context",
    );
    return {
      entry: ctx.entry as unknown as Record<string, unknown>,
      balances_before: ctx.balances_before,
      balances_after: ctx.balances_after,
      sha256sum: ctx.sha256sum,
      slice: ctx.slice,
      managed_source: ctx.managed_source ?? null,
      generated_from: ctx.generated_from ?? null,
    };
  }

  async plaintextJournal(params: {
    ledgerId: string;
    identity: Identity | undefined;
    query?: PlaintextJournalQuery;
  }): Promise<PlaintextJournalResult> {
    const { ledgerId, identity, query } = params;
    // GraphQL's Int arguments arrive unchecked; REST and MCP parse the same
    // bounds in their query schema.
    const { limit, offset } = query ?? {};
    if (
      limit != null &&
      (!Number.isInteger(limit) || limit < 1 || limit > PLAINTEXT_PAGE_MAX)
    ) {
      throw new BadUserInputError(
        `limit must be an integer from 1 to ${PLAINTEXT_PAGE_MAX}`,
        "limit",
      );
    }
    if (offset != null && (!Number.isInteger(offset) || offset < 0)) {
      throw new BadUserInputError(
        "offset must be a non-negative integer",
        "offset",
      );
    }
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
      AUTHORIZATION_ACTIONS.LEDGER_JOURNAL_READ,
    );

    const data = await unwrapFavaResponse(
      favaApiClient.journal.plaintextJournal(ledgerOwner, ledgerName, {
        account: query?.account || undefined,
        filter: query?.filter || undefined,
        time: query?.time || undefined,
        limit: limit ?? undefined,
        offset: offset ?? undefined,
      }),
      "get plaintext journal",
    );
    return {
      content: data.content,
      total: data.total,
      truncated: data.truncated,
    };
  }

  async getAccountJournal(params: {
    ledgerId: string;
    identity: Identity | undefined;
    query: AccountJournalQueryParams;
  }): Promise<AccountJournalResult> {
    const { ledgerId, identity, query } = params;
    const page = journalPage(query);
    const kinds = normalizeJournalKinds(query);
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
      AUTHORIZATION_ACTIONS.LEDGER_JOURNAL_READ,
    );

    const data = await unwrapFavaResponse(
      favaApiClient.journal.getAccountJournal(ledgerOwner, ledgerName, {
        account: query.account,
        filter_account: query.filterAccount || undefined,
        filter: query.filter || undefined,
        time: query.time || undefined,
        ...page,
        with_children:
          query.with_children !== undefined ? query.with_children : true,
        conversion: query.conversion || "at_cost",
        ...kinds,
      }),
      "get account journal entries",
    );
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
    allowInvalid?: boolean;
    dryRun?: boolean;
  }): Promise<DeleteSliceResult> {
    const { ledgerId, identity, entryHash, sha256sum, allowInvalid, dryRun } =
      params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
      AUTHORIZATION_ACTIONS.LEDGER_ENTRIES_WRITE,
    );

    const data = await unwrapFavaResponse(
      favaApiClient.journal.deleteSourceSlice(ledgerOwner, ledgerName, {
        entry_hash: entryHash,
        sha256sum,
        ...(allowInvalid && { allowInvalid: true }),
        ...(dryRun && { dryRun: true }),
      }),
      "delete source slice",
    );
    return {
      message: data.message,
      dryRun: dryRun ?? false,
      entryHash: data.entry_hash,
      files: dryRun ? [] : (data.files ?? []),
      preview: (data.preview ?? []).map((file) => ({
        path: file.path,
        text: file.text,
      })),
      validation: toReportedProjection(data),
    };
  }

  async deleteMultiSourceSlices(params: {
    ledgerId: string;
    identity: Identity;
    entries: { entryHash: string; sha256sum: string }[];
    allowInvalid?: boolean;
    dryRun?: boolean;
  }): Promise<DeleteMultiSlicesResult> {
    const { ledgerId, identity, entries, allowInvalid, dryRun } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
      AUTHORIZATION_ACTIONS.LEDGER_ENTRIES_WRITE,
    );

    // GraphQL's entries argument arrives unchecked, so the schema maxItems
    // alone would leave that surface uncapped (w23/103).
    assertBulkEntriesSize(entries, "deleted");

    const data = await unwrapFavaResponse(
      favaApiClient.journal.deleteMultiSourceSlices(ledgerOwner, ledgerName, {
        entries: entries.map((e) => ({
          entry_hash: e.entryHash,
          sha256sum: e.sha256sum,
        })),
        ...(allowInvalid && { allowInvalid: true }),
        ...(dryRun && { dryRun: true }),
      }),
      "delete source slices",
    );
    return {
      message: data.message,
      dryRun: dryRun ?? false,
      deletedCount: data.deleted_hashes.length,
      files: dryRun ? [] : (data.files ?? []),
      preview: (data.preview ?? []).map((file) => ({
        path: file.path,
        text: file.text,
      })),
      validation: toReportedProjection(data),
    };
  }

  async updateSourceSlice(params: {
    ledgerId: string;
    identity: Identity;
    entryHash: string;
    sha256sum: string;
    newContent: string;
    platform?: "web" | "mobile";
    allowInvalid?: boolean;
    dryRun?: boolean;
  }): Promise<UpdateSliceResult> {
    const {
      ledgerId,
      identity,
      entryHash,
      sha256sum,
      newContent,
      platform = "web",
      allowInvalid,
      dryRun,
    } = params;
    const { favaApiClient, ledgerOwner, ledgerName } = await this.getClient(
      ledgerId,
      identity,
      AUTHORIZATION_ACTIONS.LEDGER_ENTRIES_WRITE,
    );
    // An empty edit would replace the entry with a blank line: a delete that
    // skipped the delete confirmation and reported "saved" (w21/120). REST,
    // GraphQL and MCP all edit through here.
    if (!newContent.trim()) {
      throw new BadUserInputError(
        "newContent is empty; delete the entry instead of saving it blank",
      );
    }
    // The slice commits verbatim; an amount past the engine's 28 digits would
    // read back rounded with no check failing (w23/081).
    assertAmountsFitEngineDecimal(newContent);

    const data = await unwrapFavaResponse(
      favaApiClient.journal.updateSourceSlice(
        ledgerOwner,
        ledgerName,
        {
          entry_hash: entryHash,
          sha256sum,
          new_content: newContent,
          ...(allowInvalid && { allowInvalid: true }),
          ...(dryRun && { dryRun: true }),
        },
        directiveLimitExemptParams(platform),
      ),
      "update source slice",
    );
    return {
      message: data.message,
      dryRun: dryRun ?? false,
      // The entry's NEW content-derived hash (the ledger service resolves it
      // from the committed content), not an echo of the request.
      entryHash: data.entry_hash,
      newSha256sum: data.new_sha256sum,
      newEntryHash: data.new_entry_hash,
      files: dryRun ? [] : (data.files ?? []),
      preview: (data.preview ?? []).map((file) => ({
        path: file.path,
        text: file.text,
      })),
      validation: toReportedProjection(data),
    };
  }
}
