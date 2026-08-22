import { createHash } from "node:crypto";
import type {
  DirectiveJson,
  PostingCostJson,
  PostingJson,
} from "@rustledger/wasm";

/**
 * Fava-EXACT entry hashing — a faithful port of
 * `beancount.core.compare.hash_entry` / `stable_hash_namedtuple`, the function
 * fava-slim's `fava.beans.funcs.hash_entry` delegates to and which the
 * source-slice / entry-context deep links key on.
 *
 * The upstream algorithm (see `beancount/core/compare.py`) walks a directive
 * NamedTuple field-by-field in declaration order and folds each field into a
 * single running MD5:
 *
 *   - list / set / frozenset fields → each element is hashed independently
 *     (a nested NamedTuple recurses through the same routine; anything else is
 *     `md5(str(element))`), the element hashes are **sorted**, then folded into
 *     the running hash in that sorted order (so element order — and frozenset
 *     non-determinism — never affects the result);
 *   - every other field → `md5.update(str(field).encode())`.
 *
 * The `str()` of each Python value is what actually gets hashed, so this port
 * reproduces those exact string forms (`"3000.00 USD"` for an Amount,
 * `"Cost(number=Decimal('100.00'), currency='USD', date=datetime.date(2024, 2, 1), label=None)"`
 * for a booked Cost, `"None"` for a missing optional, an ISO `"YYYY-MM-DD"` for a
 * date, and so on).
 *
 * ## meta is EXCLUDED (`exclude_meta=True` semantics)
 *
 * `beancount`'s default `hash_entry(entry)` hashes `entry.meta`, which always
 * carries `filename` and `lineno` (plus `__tolerances__` on transactions).
 * `rustledger`'s `DirectiveJson` deliberately does **not** expose filename /
 * lineno / tolerances, so the meta-inclusive hash is not reproducible from a
 * `DirectiveJson` alone. This port therefore reproduces the
 * `exclude_meta=True` variant — the one `compare.hash_entries(..., exclude_meta=True)`
 * uses for content-identity — which ignores the `meta` (and `diff_amount`)
 * fields on every directive and posting. That makes the hash stable across
 * parses and fully determined by the `DirectiveJson` payload. See this module's
 * test for golden values captured from the real Python `beancount`.
 */

/** Python `repr()` of a string: single-quoted, backslash/quote-escaped. */
function pyStrRepr(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `'${escaped}'`;
}

/** Python `str(datetime.date(...))` — ISO `YYYY-MM-DD` (as the wire already is). */
function dateStr(isoDate: string): string {
  return isoDate;
}

/** Python `repr(datetime.date(y, m, d))` — ints, no leading zeros, `", "` sep. */
function dateRepr(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `datetime.date(${Number(year)}, ${Number(month)}, ${Number(day)})`;
}

/** MD5 hex digest of a UTF-8 string (matches `hashlib.md5(s.encode()).hexdigest()`). */
function md5Hex(value: string): string {
  return createHash("md5").update(value, "utf8").digest("hex");
}

/**
 * A single field's contribution: a running MD5 accumulator that mirrors the
 * mutable `hashlib.md5()` object in `stable_hash_namedtuple`.
 */
class RunningHash {
  private readonly hash = createHash("md5");

  /** Fold a scalar field: `md5.update(str(value).encode())`. */
  public updateStr(value: string): void {
    this.hash.update(value, "utf8");
  }

  /**
   * Fold a list/set/frozenset field: each element's own hash is computed, the
   * hashes are sorted, then folded in sorted order.
   */
  public updateCollection(elementHashes: string[]): void {
    for (const subhash of [...elementHashes].sort()) {
      this.hash.update(subhash, "utf8");
    }
  }

  public hexdigest(): string {
    return this.hash.digest("hex");
  }
}

/** Python `str(Amount)` → `"{number} {currency}"` (number is the source string). */
function amountStr(number: string, currency: string): string {
  return `${number} ${currency}`;
}

/**
 * The cost's number string, distinct per cost kind. The `per_unit` kind is
 * beancount-exact (`Decimal('N')` for a booked `10 HOOL {100.00 USD}`); the
 * other kinds are NOT byte-exact to beancount's booked per-unit repr (documented
 * parity gap) but each yields a STABLE, DISTINCT string so a cost-bearing posting
 * never collides with a cost-less one — and two different costs never collide.
 * Returning `null` here (only for a cost with no number) collapses to `"None"`.
 */
function costNumberStr(
  number: NonNullable<PostingCostJson["number"]>,
): string | null {
  switch (number.kind) {
    case "per_unit":
      return number.value;
    case "per_unit_from_total":
      return number.per_unit;
    case "total":
      // Prefix so a total `{{100 USD}}` never hashes as a per-unit `{100 USD}`.
      return `total:${number.value}`;
    case "compound":
      return `compound:${number.per_unit}+${number.total}`;
    default:
      return null;
  }
}

/**
 * Python `str(Cost(...))` for a *booked* cost. Reproduces the NamedTuple repr
 * `Cost(number=Decimal('N'), currency='C', date=datetime.date(y, m, d), label=L)`.
 *
 * A cost with no number at all returns `null` (→ `"None"`); every cost kind that
 * carries a number produces a distinct `Cost(...)` repr, so a held-at-cost
 * posting is never hashed as cost-less (which would let two materially different
 * entries share an id). See {@link costNumberStr} for the per-kind number.
 */
function costRepr(cost: PostingCostJson, fallbackDate: string): string | null {
  if (!cost.number) return null;
  const numberStr = costNumberStr(cost.number);
  if (numberStr === null) return null;
  const numberRepr = `Decimal('${numberStr}')`;
  const currencyRepr =
    cost.currency === undefined ? "None" : pyStrRepr(cost.currency);
  const isoDate = cost.date ?? fallbackDate;
  const dateReprStr = isoDate ? dateRepr(isoDate) : "None";
  const labelRepr = cost.label === undefined ? "None" : pyStrRepr(cost.label);
  return `Cost(number=${numberRepr}, currency=${currencyRepr}, date=${dateReprStr}, label=${labelRepr})`;
}

/**
 * Hash a single Posting NamedTuple in field order:
 * `account, units, cost, price, flag` (meta is excluded).
 * `units`/`cost`/`price`/`flag` `str()` to `"None"` when absent.
 */
function hashPosting(posting: PostingJson, txnDate: string): string {
  const running = new RunningHash();
  running.updateStr(posting.account);
  running.updateStr(
    posting.units
      ? amountStr(posting.units.number, posting.units.currency)
      : "None",
  );
  running.updateStr(
    posting.cost ? (costRepr(posting.cost, txnDate) ?? "None") : "None",
  );
  running.updateStr(
    posting.price
      ? amountStr(posting.price.number, posting.price.currency)
      : "None",
  );
  running.updateStr(posting.flag ?? "None");
  return running.hexdigest();
}

/**
 * Fava-EXACT `hash_entry` over a `rustledger` `DirectiveJson`, reproducing
 * `beancount.core.compare.hash_entry(entry, exclude_meta=True)` byte-for-byte.
 *
 * Returns the lowercase 32-char MD5 hex digest fava uses as the entry hash in
 * source-slice / entry-context endpoints.
 */
export function hashEntry(directive: DirectiveJson): string {
  const running = new RunningHash();

  switch (directive.type) {
    case "transaction": {
      // Fields: date, flag, payee, narration, tags, links, postings.
      running.updateStr(dateStr(directive.date));
      running.updateStr(directive.flag);
      // payee: absent on the wire ⇒ Python None ⇒ str(None) == "None".
      running.updateStr(directive.payee ?? "None");
      // narration: never None in beancount; empty narration is dropped on the
      // wire but is `''` (empty string) on the Python side, not None.
      running.updateStr(directive.narration ?? "");
      running.updateCollection(directive.tags.map((tag) => md5Hex(tag)));
      running.updateCollection(directive.links.map((link) => md5Hex(link)));
      running.updateCollection(
        directive.postings.map((posting) =>
          hashPosting(posting, directive.date),
        ),
      );
      return running.hexdigest();
    }
    case "balance": {
      // Fields: date, account, amount, tolerance (diff_amount excluded).
      running.updateStr(dateStr(directive.date));
      running.updateStr(directive.account);
      running.updateStr(
        amountStr(directive.amount.number, directive.amount.currency),
      );
      running.updateStr(directive.tolerance ?? "None");
      return running.hexdigest();
    }
    case "open": {
      // Fields: date, account, currencies, booking.
      running.updateStr(dateStr(directive.date));
      running.updateStr(directive.account);
      if (directive.currencies.length === 0) {
        // `open Assets:X` is `currencies=None` in beancount; rustledger
        // normalizes it to `[]`, so restore Python's `str(None)` hash input.
        running.updateStr("None");
      } else {
        running.updateCollection(
          directive.currencies.map((currency) => md5Hex(currency)),
        );
      }
      running.updateStr(directive.booking ?? "None");
      return running.hexdigest();
    }
    case "close": {
      // Fields: date, account.
      running.updateStr(dateStr(directive.date));
      running.updateStr(directive.account);
      return running.hexdigest();
    }
    case "commodity": {
      // Fields: date, currency.
      running.updateStr(dateStr(directive.date));
      running.updateStr(directive.currency);
      return running.hexdigest();
    }
    case "pad": {
      // Fields: date, account, source_account.
      running.updateStr(dateStr(directive.date));
      running.updateStr(directive.account);
      running.updateStr(directive.source_account);
      return running.hexdigest();
    }
    case "note": {
      // Fields: date, account, comment, tags, links.
      running.updateStr(dateStr(directive.date));
      running.updateStr(directive.account);
      running.updateStr(directive.comment);
      // rustledger's note carries no tags/links; beancount defaults them to the
      // empty frozenset, which folds in nothing.
      running.updateCollection([]);
      running.updateCollection([]);
      return running.hexdigest();
    }
    case "event": {
      // Fields: date, type, description.
      running.updateStr(dateStr(directive.date));
      running.updateStr(directive.event_type);
      running.updateStr(directive.value);
      return running.hexdigest();
    }
    case "price": {
      // Fields: date, currency, amount.
      running.updateStr(dateStr(directive.date));
      running.updateStr(directive.currency);
      running.updateStr(
        amountStr(directive.amount.number, directive.amount.currency),
      );
      return running.hexdigest();
    }
    case "document": {
      // Fields: date, account, filename, tags, links.
      running.updateStr(dateStr(directive.date));
      running.updateStr(directive.account);
      running.updateStr(directive.path);
      running.updateCollection(
        (directive.tags ?? []).map((tag) => md5Hex(tag)),
      );
      running.updateCollection(
        (directive.links ?? []).map((link) => md5Hex(link)),
      );
      return running.hexdigest();
    }
    case "query": {
      // Fields: date, name, query_string.
      running.updateStr(dateStr(directive.date));
      running.updateStr(directive.name);
      running.updateStr(directive.query_string);
      return running.hexdigest();
    }
    case "custom": {
      // Fields: date, type, values. Each value is a Python `ValueType(value,
      // dtype)` NamedTuple; hashing recurses over `str(value)` and `str(dtype)`.
      // `dtype` is a parser-internal type marker not carried on the wire, so
      // Custom hashing cannot be reproduced exactly from a DirectiveJson (see
      // parity gaps in the module test). Best-effort: hash date + type only,
      // which is stable but NOT byte-equal to beancount when values are present.
      running.updateStr(dateStr(directive.date));
      running.updateStr(directive.custom_type);
      running.updateCollection([]);
      return running.hexdigest();
    }
    default:
      return running.hexdigest();
  }
}

/**
 * ## Occurrence disambiguation
 *
 * {@link hashEntry} is a pure CONTENT hash — two byte-identical entries (e.g. two
 * identical coffee purchases on the same day) produce the SAME value, because
 * `DirectiveJson` exposes no filename/lineno to tell them apart. A bare content
 * hash would then make edit / delete / context resolve to the WRONG duplicate
 * (the first match). The entry ID therefore appends a 0-based OCCURRENCE index:
 * the k-th occurrence of a base hash (in directive-stream order) is `base` for
 * k=0 and `base:k` thereafter. Unique entries — the overwhelming majority — keep
 * their stable content hash unchanged; only genuine duplicates gain a suffix.
 *
 * The counterpart resolvers ({@link "./source-slice".findEntrySlice},
 * {@link "./source-slice".entryBalances}) parse the suffix and select the k-th
 * match. This is exact for duplicates within one file (stream order == file
 * order under beancount's stable date sort); duplicates split ACROSS files can
 * still map by file-walk order (a documented edge, no worse than the old
 * always-first behaviour).
 */

/** Build an entry ID from its base content hash and 0-based occurrence index. */
export function entryIdFor(baseHash: string, occurrence: number): string {
  return occurrence === 0 ? baseHash : `${baseHash}:${occurrence}`;
}

/** Split an entry ID into `{ base, occurrence }` (occurrence defaults to 0). */
export function parseEntryId(entryId: string): {
  base: string;
  occurrence: number;
} {
  const sep = entryId.lastIndexOf(":");
  if (sep === -1) return { base: entryId, occurrence: 0 };
  // Only the canonical plain-decimal suffix `entryIdFor` emits counts as an
  // occurrence. A lenient `Number()` parse would accept "" (=0), "1e1", or
  // "0x2" and resolve a mangled/truncated ID to a plausible entry — the
  // delete/update paths would then act on the WRONG duplicate instead of
  // failing not-found.
  const suffix = entryId.slice(sep + 1);
  if (!/^\d+$/u.test(suffix)) {
    return { base: entryId, occurrence: 0 };
  }
  return { base: entryId.slice(0, sep), occurrence: Number(suffix) };
}

/**
 * Assign every directive its occurrence-disambiguated entry ID, keyed by object
 * identity so a caller can look the ID up again after filtering/reordering the
 * stream (the `DirectiveJson` references are preserved by those operations).
 * Occurrence is counted in the given (stream) order.
 */
export function buildEntryIdMap(
  directives: DirectiveJson[],
): Map<DirectiveJson, string> {
  const counts = new Map<string, number>();
  const ids = new Map<DirectiveJson, string>();
  for (const directive of directives) {
    const base = hashEntry(directive);
    const occurrence = counts.get(base) ?? 0;
    counts.set(base, occurrence + 1);
    ids.set(directive, entryIdFor(base, occurrence));
  }
  return ids;
}
