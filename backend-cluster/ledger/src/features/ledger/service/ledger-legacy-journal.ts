/**
 * V1 legacy-journal pipeline — port of the Python `legacy.get_legacy_journal`
 * (`fava.serialisation.serialise` + cursor pagination + enhanced filters),
 * lifted from the donor branch's reviewed implementation and re-shaped for the
 * HTTP wire (raw serialised entries, no GraphQL enhancement).
 *
 * PARITY NOTE (documented divergence): the V1 detailed `entry_hash` was
 * beancount's `hash_entry(entry)` with meta folded in (filename/lineno), which
 * the rustledger wire cannot reproduce — the engine's occurrence-disambiguated
 * entry ID is emitted instead. Parity suites mask `entry_hash` accordingly.
 */
import type { DirectiveJson } from "@rustledger/wasm";
import {
  getDirectiveSourceId,
  type EntrySourceLocation,
} from "@/foundation/rustledger";
import type { PostingCostJson, PostingJson } from "@rustledger/wasm";

/** beancount class name for each rustledger directive tag. */
const DIRECTIVE_CLASS: Record<DirectiveJson["type"], string> = {
  transaction: "Transaction",
  balance: "Balance",
  open: "Open",
  close: "Close",
  commodity: "Commodity",
  pad: "Pad",
  event: "Event",
  note: "Note",
  document: "Document",
  price: "Price",
  query: "Query",
  custom: "Custom",
};

export type LegacyEntry = Record<string, unknown>;

export interface LegacyJournalArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  searchQuery?: string;
  accountFilter?: string;
  amountMin?: number;
  amountMax?: number;
  entryTypes?: string[];
  sortBy?: string;
  sortOrder?: string;
  detailed?: boolean;
}

/** Per-unit cost number for a rustledger cost (mirrors `Cost.number`). */
function costNumberToPerUnit(
  number: PostingCostJson["number"],
  unitsNumber: string | undefined,
): string {
  if (!number) return "0";
  switch (number.kind) {
    case "per_unit":
      return number.value;
    case "total": {
      if (!unitsNumber) return number.value;
      const units = Math.abs(parseFloat(unitsNumber));
      if (!units) return number.value;
      return String(parseFloat(number.value) / units);
    }
    case "compound":
    case "per_unit_from_total":
      return number.per_unit;
    default:
      return "0";
  }
}

/**
 * Render a posting's `amount` position string, exactly as fava's
 * `_serialise_posting`: units + optional `{cost}` + optional ` @ price`.
 */
function renderPositionString(posting: PostingJson): string {
  if (!posting.units) {
    return "";
  }
  let str = `${posting.units.number} ${posting.units.currency}`;
  if (posting.cost) {
    const parts: string[] = [];
    const perUnit = costNumberToPerUnit(
      posting.cost.number,
      posting.units.number,
    );
    parts.push(`${perUnit} ${posting.cost.currency ?? ""}`.trim());
    if (posting.cost.date) parts.push(posting.cost.date);
    if (posting.cost.label) parts.push(`"${posting.cost.label}"`);
    str = `${str} {${parts.join(", ")}}`;
  }
  if (posting.price) {
    str += ` @ ${posting.price.number} ${posting.price.currency}`;
  }
  return str;
}

/** Serialise one directive into the V1 `serialise()` shape. */
export function serialiseV1Directive(
  directive: DirectiveJson,
  sourceLocation?: EntrySourceLocation,
): LegacyEntry {
  const type = DIRECTIVE_CLASS[directive.type];
  const meta: Record<string, unknown> = {
    ...(directive.meta ?? {}),
    ...(sourceLocation ?? {}),
  };
  const base: LegacyEntry = { date: directive.date, meta, type };

  switch (directive.type) {
    case "transaction": {
      // `serialise()` folds tags/links into narration then deletes them.
      let narration = directive.narration ?? "";
      if (directive.tags.length > 0) {
        narration += " " + directive.tags.map((t) => `#${t}`).join(" ");
      }
      if (directive.links.length > 0) {
        narration += " " + directive.links.map((l) => `^${l}`).join(" ");
      }
      return {
        ...base,
        flag: directive.flag,
        payee: directive.payee ?? "",
        narration,
        postings: directive.postings.map((posting) => ({
          account: posting.account,
          amount: renderPositionString(posting),
        })),
      };
    }
    case "balance":
      return {
        ...base,
        account: directive.account,
        amount: {
          number: directive.amount.number,
          currency: directive.amount.currency,
        },
        tolerance: directive.tolerance ?? null,
        diff_amount: null,
      };
    case "open":
      return {
        ...base,
        account: directive.account,
        currencies:
          directive.currencies.length > 0 ? [...directive.currencies] : null,
        booking: directive.booking ?? null,
      };
    case "close":
      return { ...base, account: directive.account };
    case "note":
      return {
        ...base,
        account: directive.account,
        comment: directive.comment,
      };
    case "pad":
      return {
        ...base,
        account: directive.account,
        source_account: directive.source_account,
      };
    case "document":
      return {
        ...base,
        account: directive.account,
        filename: directive.path,
        tags: directive.tags ? [...directive.tags] : [],
        links: directive.links ? [...directive.links] : [],
      };
    case "event":
      // `serialise()` sets `ret["type"] = "Event"`, OVERWRITING the event's own
      // `type` field ("category"); only `description` survives.
      return {
        ...base,
        description: directive.value,
      };
    case "commodity":
      return {
        ...base,
        currency: directive.currency,
      };
    case "price":
      // `_asdict()` leaves `amount` as an Amount namedtuple, which
      // `_safe_serialize_for_json` renders as `[number, currency]`.
      return {
        ...base,
        currency: directive.currency,
        amount: [directive.amount.number, directive.amount.currency],
      };
    case "query":
      return {
        ...base,
        name: directive.name,
        query_string: directive.query_string,
      };
    case "custom":
      return {
        ...base,
        custom_type: directive.custom_type,
        values: (directive.values ?? []).map((v) =>
          v.type === "amount" ? [v.value.number, v.value.currency] : v.value,
        ),
      };
    default:
      return base;
  }
}

/** Abs max posting units-number — parity for the V1 `get_max_amount` sort key. */
function maxPostingAmount(directive: DirectiveJson): number {
  if (directive.type !== "transaction") return 0;
  const amounts: number[] = [];
  for (const posting of directive.postings) {
    if (posting.units && posting.units.number !== undefined) {
      amounts.push(Math.abs(parseFloat(posting.units.number)));
    }
  }
  return amounts.length > 0 ? Math.max(...amounts) : 0;
}

function directivePayee(directive: DirectiveJson): string {
  return directive.type === "transaction" ? (directive.payee ?? "") : "";
}

/**
 * The V1 `get_legacy_journal` algorithm over the rustledger directive stream
 * (date-sorted ascending, equivalent to fava's `ledger.all_entries`).
 */
export function runLegacyJournal(
  allDirectives: DirectiveJson[],
  args: LegacyJournalArgs,
  entryIds: Map<DirectiveJson, string>,
  sourceLocations: Map<string, EntrySourceLocation>,
): LegacyEntry[] {
  const {
    first,
    after,
    last,
    before,
    searchQuery,
    accountFilter,
    amountMin,
    amountMax,
    entryTypes,
    sortBy = "date",
    sortOrder = "desc",
    detailed = false,
  } = args;

  const entryTypesList = (entryTypes ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  let entries = [...allDirectives];

  const isYmd = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const isDigits = (s: string): boolean => /^\d+$/.test(s);
  const afterDate = after && isYmd(after) ? after : null;
  const beforeDate = before && isYmd(before) ? before : null;
  const afterInt =
    after && !afterDate && isDigits(after) ? parseInt(after, 10) : null;
  const beforeInt =
    before && !beforeDate && isDigits(before) ? parseInt(before, 10) : null;

  if (afterDate || beforeDate) {
    entries = entries.filter((entry) => {
      if (afterDate && entry.date <= afterDate) return false;
      if (beforeDate && entry.date >= beforeDate) return false;
      return true;
    });
  }

  const searchLower = searchQuery ? searchQuery.toLowerCase() : "";
  if (
    searchQuery ||
    accountFilter ||
    amountMin !== undefined ||
    amountMax !== undefined ||
    entryTypesList.length > 0
  ) {
    entries = entries.filter((entry) => {
      if (
        entryTypesList.length > 0 &&
        !entryTypesList.includes(DIRECTIVE_CLASS[entry.type])
      ) {
        return false;
      }

      if (searchQuery) {
        let searchableText = "";
        if (entry.type === "transaction") {
          if (entry.payee) searchableText += entry.payee.toLowerCase() + " ";
          if (entry.narration) {
            searchableText += entry.narration.toLowerCase() + " ";
          }
          for (const posting of entry.postings) {
            searchableText += posting.account.toLowerCase() + " ";
          }
        }
        if (!searchableText.includes(searchLower)) return false;
      }

      if (accountFilter) {
        let accountMatch = false;
        let regex: RegExp | null = null;
        try {
          regex = new RegExp(accountFilter, "i");
        } catch {
          regex = null;
        }
        const test = (account: string): boolean =>
          regex
            ? regex.test(account)
            : account.toLowerCase().includes(accountFilter.toLowerCase());
        if (entry.type === "transaction") {
          for (const posting of entry.postings) {
            if (test(posting.account)) {
              accountMatch = true;
              break;
            }
          }
        } else if ("account" in entry && typeof entry.account === "string") {
          accountMatch = test(entry.account);
        }
        if (!accountMatch) return false;
      }

      if (
        (amountMin !== undefined || amountMax !== undefined) &&
        entry.type === "transaction"
      ) {
        let amountMatch = false;
        for (const posting of entry.postings) {
          if (posting.units) {
            const amount = Math.abs(parseFloat(posting.units.number));
            if (amountMin !== undefined && amount < amountMin) continue;
            if (amountMax !== undefined && amount > amountMax) continue;
            amountMatch = true;
            break;
          }
        }
        if (!amountMatch) return false;
      }

      return true;
    });
  }

  if (sortBy === "date" || sortBy === "amount" || sortBy === "payee") {
    const reverse = sortOrder.toLowerCase() === "desc";
    const keyed = entries.map((entry, index) => ({ entry, index }));
    const cmp = (a: DirectiveJson, b: DirectiveJson): number => {
      if (sortBy === "date")
        return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      if (sortBy === "payee") {
        const pa = directivePayee(a);
        const pb = directivePayee(b);
        return pa < pb ? -1 : pa > pb ? 1 : 0;
      }
      const ma = maxPostingAmount(a);
      const mb = maxPostingAmount(b);
      return ma < mb ? -1 : ma > mb ? 1 : 0;
    };
    keyed.sort((a, b) => {
      const base = cmp(a.entry, b.entry);
      if (base !== 0) return reverse ? -base : base;
      return a.index - b.index;
    });
    entries = keyed.map((k) => k.entry);
  }

  let startIdx = 0;
  let endIdx = entries.length;
  if (afterInt !== null) startIdx = afterInt + 1;
  if (beforeInt !== null) endIdx = beforeInt;
  let paginated = entries.slice(startIdx, endIdx);

  if (first !== undefined && last !== undefined) {
    if (first < paginated.length) paginated = paginated.slice(0, first);
    if (last < paginated.length) paginated = paginated.slice(-last);
  } else if (first !== undefined) {
    paginated = paginated.slice(0, first);
  } else if (last !== undefined) {
    paginated = paginated.slice(-last);
  }

  return paginated.map((directive) => {
    const entryId = entryIds.get(directive);
    const serialised = serialiseV1Directive(
      directive,
      sourceLocations.get(getDirectiveSourceId(directive) ?? entryId ?? ""),
    );
    if (!detailed) return serialised;
    const cleanedMeta = { ...(serialised.meta as Record<string, unknown>) };
    delete cleanedMeta.__tolerances__;
    delete cleanedMeta.__automatic__;
    delete cleanedMeta.filename;
    delete cleanedMeta.lineno;
    return {
      ...serialised,
      meta: cleanedMeta,
      entry_hash: entryId,
      entry_type: directive.type,
    };
  });
}
