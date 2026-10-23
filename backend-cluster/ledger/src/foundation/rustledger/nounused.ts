import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { directiveAccounts } from "./auto-accounts";
import { closeLocations, openLocations } from "./block-index";
import {
  beancountPluginRuns,
  collectLedgerPlugins,
} from "./plugins/collect-plugins";

const CHECKS = new Set([
  "beancount.plugins.nounused",
  "beancount.plugins.pedantic",
]);
const CLOSE_TREE = "beancount.plugins.close_tree";
/** rustledger's own finding, a warning, which the server does not show. */
const RUSTLEDGER = /^Account '.*' is opened but never used$/u;

/**
 * Beancount's `nounused` (or `pedantic`) refuses an opened account no other
 * directive names: "Unused account 'X'", an error on its `open` line. The
 * engine's says so as a warning, unlocated, which the server drops as advice
 * (w21/188), and its `pedantic` does not run it, so a ledger bean-check
 * refuses read as healthy (w21/739). Declared, its warnings are replaced by
 * Beancount's errors, over the booked stream (`directives`).
 */
export function reconcileNounusedErrors(
  errors: readonly BeancountError[],
  directives: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  const runs = beancountPluginRuns(files[entryPoint], "nounused");
  if (runs.length === 0) return [...errors];
  // Plugins run in the order declared: close_tree's closes are uses only
  // when it runs first; declared after, an idle child it closed read as used
  // (w21/757).
  const plugins = collectLedgerPlugins(files[entryPoint]);
  const checkAt = plugins.findIndex((name) => CHECKS.has(name));
  const closeTreeAt = plugins.indexOf(CLOSE_TREE);
  const written =
    closeTreeAt !== -1 && checkAt < closeTreeAt
      ? closeLocations(files, entryPoint)
      : null;
  const opened = new Set<string>();
  const used = new Set<string>();
  for (const directive of directives) {
    if (directive.type === "open") opened.add(directive.account);
    else if (
      directive.type === "close" &&
      written !== null &&
      !written.has(directive.account)
    ) {
      continue;
    } else {
      for (const account of directiveAccounts(directive)) used.add(account);
    }
  }
  const unused = [...opened].filter((account) => !used.has(account));
  const lines = unused.length > 0 ? openLocations(files, entryPoint) : null;
  // Each run reports again, as bean-check does for a plugin declared twice.
  return [
    ...errors.filter((error) => !RUSTLEDGER.test(error.message)),
    ...runs
      .flatMap(() => unused)
      .map((account): BeancountError => {
        const at = lines?.get(account);
        return {
          message: `Unused account '${account}'`,
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
  ];
}
