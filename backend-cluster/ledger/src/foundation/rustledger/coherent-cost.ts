import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { entryLocator } from "./block-index";
import { beancountPluginRuns } from "./plugins/collect-plugins";

/** A posting line's commodity, after its flag if it has one. */
const POSTING =
  /^\s+(?:[*!&#?%]\s*|[PSTCURM]\s+)?\S+\s+-?\d[\d,]*(?:\.\d+)?\s+(\S+)/u;

type Transaction = Extract<DirectiveJson, { type: "transaction" }>;

/**
 * Beancount's `coherent_cost` (or `pedantic`) refuses a commodity held both at
 * cost and without one: "Currency 'VTI' is used both with and without cost",
 * once per commodity, on the first transaction holding it without cost. The
 * engine does not run it, so such a ledger read as healthy where bean-check
 * refuses it (w21/740).
 */
export function coherentCostErrors(
  directives: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  const runs = beancountPluginRuns(files[entryPoint], "coherent_cost");
  if (runs.length === 0) return [];
  const withCost = new Map<string, Transaction>();
  const withoutCost = new Map<string, Transaction>();
  for (const directive of directives) {
    if (directive.type !== "transaction") continue;
    for (const posting of directive.postings) {
      const currency = posting.units?.currency;
      if (currency === undefined) continue;
      const first = posting.cost ? withCost : withoutCost;
      if (!first.has(currency)) first.set(currency, directive);
    }
  }
  const mixed = [...withoutCost].filter(([currency]) => withCost.has(currency));
  if (mixed.length === 0) return [];
  const locate = entryLocator(files, entryPoint);
  return runs.flatMap(() =>
    mixed.map(([currency, transaction]): BeancountError => {
      const at = locate(
        transaction.date,
        (line) => POSTING.exec(line)?.[1] === currency && !line.includes("{"),
        false,
      );
      return {
        message: `Currency '${currency}' is used both with and without cost`,
        code: "PLUGIN",
        phase: "plugin",
        hint: null,
        file: at?.file ?? null,
        line: at?.line ?? null,
        column: at ? 1 : null,
        end_line: null,
        end_column: null,
        severity: "error",
      };
    }),
  );
}
