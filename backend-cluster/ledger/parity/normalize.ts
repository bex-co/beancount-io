import {
  normalizeShadowDifferences,
  type ShadowJson,
} from "@/foundation/rustledger/shadow-normalization";

export type { ShadowJson };

/**
 * Volatile response fields that legitimately differ between two live services
 * answering the same request (clocks, per-request identity). Masked to a
 * placeholder BEFORE comparison, per operation. Keep this list minimal and
 * documented — every entry is a field parity deliberately does not compare.
 */
const VOLATILE_FIELDS: Record<string, string[]> = {
  healthCheck: ["timestamp"],
};

export function maskFields(value: ShadowJson, fields: string[]): ShadowJson {
  return maskVolatile(value, fields);
}

function maskVolatile(value: ShadowJson, fields: string[]): ShadowJson {
  if (Array.isArray(value)) {
    return value.map((v) => maskVolatile(v, fields));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, ShadowJson> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = fields.includes(k) ? "<volatile>" : maskVolatile(v, fields);
    }
    return out;
  }
  return value;
}

/**
 * Normalize one service's response payload for comparison against the other
 * service's payload for the same request.
 *
 * Layer 1 — the donor branch's `normalizeShadowDifferences` (the byte-level
 * allowlist golden-validated against the Python oracle):
 *  - decimal scale: trailing zeros trimmed from numeric strings ("2950.00" → "2950")
 *  - omitted-null parity: null `cost`/`cost_children`, null/empty `meta` dropped
 *  - journal/account meta: `filename`/`lineno` source coordinates dropped
 *    (unavailable on the Rustledger wire)
 *  - `entry_hash` masked for journal/accounts operations (location-dependent)
 *
 * Layer 2 — live-vs-live volatility: per-operation VOLATILE_FIELDS masking
 * (e.g. `healthCheck.timestamp`).
 *
 * Everything else is compared strictly — a difference that survives this
 * function is a parity failure.
 */
const OPERATION_ALIASES: Record<string, string> = {
  // getContext serialises an entry like the journal ops — same meta rules
  getContext: "getJournal",
};

/** Per-operation deep-path masks beyond simple field names. */
function opSpecificMask(operation: string, value: ShadowJson): ShadowJson {
  if (operation === "queryShell") {
    // rustledger names aggregate columns differently than beanquery
    // ("sum" vs "sum(position)") — documented BQL-dialect divergence
    // (donor parity checklist risk #1). Values/rows still compared strictly.
    return maskVolatile(value, ["name"]);
  }
  if (operation === "getLegacyJournal") {
    // Two Python leaks the rustledger wire deliberately does not reproduce:
    // 1. beancount's internal __tolerances__/__automatic__ meta keys;
    // 2. document tags/links rendered via `str(frozenset)` (the Python
    //    `_safe_serialize_for_json` misses frozenset — `isinstance(x, set)` is
    //    False — and emits "frozenset({'receipt'})"). v2 emits real arrays;
    //    canonicalize BOTH to sorted arrays for comparison.
    const canonSet = (v: ShadowJson): ShadowJson => {
      if (typeof v === "string" && v.startsWith("frozenset(")) {
        const names = [...v.matchAll(/'([^']*)'/g)].map((m) => m[1]);
        return names.sort();
      }
      if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
        return [...(v as string[])].sort();
      }
      return v;
    };
    const strip = (v: ShadowJson): ShadowJson => {
      if (Array.isArray(v)) return v.map(strip);
      if (v !== null && typeof v === "object") {
        const out: Record<string, ShadowJson> = {};
        for (const [k, child] of Object.entries(v)) {
          if (k === "__tolerances__" || k === "__automatic__") continue;
          out[k] =
            k === "tags" || k === "links" ? canonSet(child) : strip(child);
        }
        return out;
      }
      return v;
    };
    return strip(value);
  }
  return value;
}

export function normalizeForParity(
  operation: string,
  value: ShadowJson,
): ShadowJson {
  const effectiveOp = OPERATION_ALIASES[operation] ?? operation;
  let normalized = normalizeShadowDifferences(effectiveOp, value);
  const volatile = VOLATILE_FIELDS[operation];
  if (volatile) {
    normalized = maskVolatile(normalized, volatile);
  }
  return opSpecificMask(operation, normalized);
}
