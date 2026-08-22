import type { DirectiveJson } from "@rustledger/wasm";
import type { BcioOptionsPublic } from "@/foundation/ledger-api-types";

/**
 * beancount.io-specific file-routing options, parsed from `Custom` directives —
 * a port of fava-slim's `fava/core/bcio_options.py` (`BcioOptions` +
 * `parse_bcio_options`) for the rustledger snapshot.
 *
 * Options are declared in the ledger source as::
 *
 *   2000-01-01 custom "beancountio-option" "default_file" "main.bean"
 *
 * The custom `type` MUST be exactly `"beancountio-option"` — any other custom
 * directive (`fava-option`, `budget`, …) is ignored. The first positional value
 * is the option key (hyphens normalized to underscores), the second its value.
 *
 * Matching Python exactly:
 *   - Unknown keys are skipped (Python appends a `BcioOptionError`; the endpoint
 *     only returns the options, so we drop the error and leave the field at its
 *     default). See {@link parseBcioOptions} for the residual-error note.
 *   - A missing second value yields the empty string `""` (Python:
 *     `entry.values[1].value if len(entry.values) > 1 else ""`).
 *   - A non-string second value (number/amount/date/…) is skipped and the field
 *     keeps its default (Python raises `NotAStringBcioOptionError`).
 *   - Duplicate keys: last one wins (sequential `setattr`).
 *
 * File-routing resolution (which file an entry of a given type/date lands in)
 * is NOT done here — that lives in the backend-v2 layer
 * (`features/ledger/utils/entry-file-resolver.ts`). This function only exposes
 * the raw option values, mirroring the ledger layer.
 */

const BCIO_CUSTOM_TYPE = "beancountio-option";

/** The one string option with a non-null default. */
const DEFAULT_FILE_DEFAULT = "main.bean";

/**
 * String option keys, keyed by their normalized (underscore) form. Mirrors
 * `_STR_OPTS` in `bcio_options.py`. `default_file` is handled separately
 * because it carries a non-null default.
 */
const NULLABLE_STR_KEYS = [
  "transaction_file",
  "account_file",
  "price_file",
  "balance_file",
  "note_file",
  "pad_file",
  "budget_file",
  "receipt_base_folder",
  "receipt_storage",
  "document_file",
] as const;

type NullableStrKey = (typeof NULLABLE_STR_KEYS)[number];

const NULLABLE_STR_KEY_SET: ReadonlySet<string> = new Set(NULLABLE_STR_KEYS);

/** Fresh copy of the Fava default `BcioOptions` (all-null except `default_file`). */
function defaultBcioOptions(): BcioOptionsPublic {
  return {
    default_file: DEFAULT_FILE_DEFAULT,
    transaction_file: null,
    account_file: null,
    price_file: null,
    balance_file: null,
    note_file: null,
    pad_file: null,
    budget_file: null,
    receipt_base_folder: null,
    receipt_storage: null,
    document_file: null,
  };
}

/**
 * Parse the beancount.io file-routing options out of a parsed rustledger
 * snapshot. Scans every `Custom` directive whose type is `"beancountio-option"`
 * and produces the `BcioOptionsPublic` DTO the `getLedgerBcioOptions` endpoint
 * returns.
 *
 * @param directives - The full directive list from a rustledger parse
 *   (`getDirectives()` / `parseLedgerFiles(...).directives`). Non-custom and
 *   non-bcio directives are ignored.
 */
export function parseBcioOptions(
  directives: DirectiveJson[],
): BcioOptionsPublic {
  const options = defaultBcioOptions();

  directives.forEach((directive) => {
    if (directive.type !== "custom") return;
    if (directive.custom_type !== BCIO_CUSTOM_TYPE) return;

    const values = directive.values ?? [];
    // Python: `if not entry.values: raise MissingBcioOptionError` — a bcio
    // custom with no positional values is an error, so no option is set.
    if (values.length === 0) return;

    // Python: `str(entry.values[0].value).replace("-", "_")`. rustledger only
    // ever emits string keys here; coerce defensively to match `str(...)`.
    const rawKey = values[0].value;
    const key = String(rawKey).replace(/-/g, "_");

    // Python: `entry.values[1].value if len(entry.values) > 1 else ""`.
    const rawValue = values.length > 1 ? values[1].value : "";
    // Python: `if not isinstance(value, str): raise NotAStringBcioOptionError`.
    // A missing second value is the string "" and passes; any non-string
    // (number/amount/bool/date/null) is skipped, leaving the field at default.
    if (typeof rawValue !== "string") return;

    if (key === "default_file") {
      options.default_file = rawValue;
      return;
    }
    if (NULLABLE_STR_KEY_SET.has(key)) {
      options[key as NullableStrKey] = rawValue;
      return;
    }
    // Unknown key: Python records a `BcioOptionError`; the endpoint returns only
    // the options, so the field stays at its default and the error is dropped.
  });

  return options;
}
