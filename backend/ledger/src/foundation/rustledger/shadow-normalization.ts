export type ShadowJson =
  | null
  | boolean
  | number
  | string
  | ShadowJson[]
  | { [key: string]: ShadowJson };

/**
 * Apply only documented wire-level differences to the shadow corpus. Journal
 * metadata is compared normally except for source coordinates unavailable on
 * the Rustledger wire.
 */
export function normalizeShadowDifferences(
  operation: string,
  value: ShadowJson,
): ShadowJson {
  const journal =
    operation === "getJournal" || operation === "getAccountJournal";

  const visit = (item: ShadowJson): ShadowJson => {
    if (typeof item === "string" && /^-?\d+\.\d+$/.test(item)) {
      return item.replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1");
    }
    if (Array.isArray(item)) return item.map(visit);
    if (item !== null && typeof item === "object") {
      const normalized: Record<string, ShadowJson> = {};
      for (const [key, child] of Object.entries(item)) {
        if ((key === "cost" || key === "cost_children") && child === null) {
          continue;
        }
        if (
          key === "meta" &&
          (child === null ||
            (typeof child === "object" &&
              !Array.isArray(child) &&
              Object.keys(child).length === 0))
        ) {
          continue;
        }
        if (journal && key === "meta") {
          if (
            typeof child !== "object" ||
            child === null ||
            Array.isArray(child)
          ) {
            normalized[key] = visit(child);
            continue;
          }
          const metadata = Object.fromEntries(
            Object.entries(child)
              .filter(
                ([metaKey]) => metaKey !== "filename" && metaKey !== "lineno",
              )
              .map(([metaKey, metaValue]) => [metaKey, visit(metaValue)]),
          );
          if (Object.keys(metadata).length > 0) normalized[key] = metadata;
          continue;
        }
        if (operation === "getLedgerAccounts" && key === "meta") continue;
        if (
          (journal || operation === "getLedgerAccounts") &&
          key === "entry_hash"
        ) {
          normalized[key] = "<engine-entry-id>";
          continue;
        }
        normalized[key] = visit(child);
      }
      return normalized;
    }
    return item;
  };

  return visit(value);
}
