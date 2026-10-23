import type { BeancountError, DirectiveJson, FileMap } from "@rustledger/wasm";
import { openLocations } from "./block-index";
import { beancountPluginRuns } from "./plugins/collect-plugins";

/** rustledger's own finding, once per posting and without a location. */
const RUSTLEDGER = /^Posting to non-leaf account '.*' - has child accounts$/u;

/** What each account holds, as Beancount's `realization.postings_by_account`. */
function heldBy(directives: readonly DirectiveJson[]): Map<string, string[]> {
  const held = new Map<string, string[]>();
  const hold = (account: string, type: string) =>
    held.set(account, [...(held.get(account) ?? []), type]);
  for (const directive of directives) {
    switch (directive.type) {
      case "transaction":
        for (const posting of directive.postings) {
          hold(posting.account, "posting");
        }
        break;
      case "open":
      case "close":
      case "balance":
      case "note":
      case "document":
        hold(directive.account, directive.type);
        break;
      case "pad":
        hold(directive.account, "pad");
        hold(directive.source_account, "pad");
        break;
      case "custom":
        for (const value of directive.values ?? []) {
          if (value.type === "account") hold(String(value.value), "custom");
        }
        break;
      default:
        break;
    }
  }
  return held;
}

/** Accounts in the order Beancount walks its tree: by component, parents first. */
const byComponents = (a: string, b: string) => {
  const [x, y] = [a.split(":"), b.split(":")];
  for (let i = 0; i < Math.min(x.length, y.length); i += 1) {
    if (x[i] !== y[i]) return x[i]! < y[i]! ? -1 : 1;
  }
  return x.length - y.length;
};

/**
 * Beancount's `leafonly` (or `pedantic`) refuses an account with children that
 * holds anything but its open and balances: "Non-leaf account 'X' has
 * postings on it", once per account, on its `open` line. The engine's said
 * so once per posting, without a location, so a Notifications row could not
 * be opened and a parent with seven postings listed seven (w21/740). Declared,
 * its errors are replaced by Beancount's, over the booked stream.
 */
export function reconcileLeafOnlyErrors(
  errors: readonly BeancountError[],
  directives: readonly DirectiveJson[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  const runs = beancountPluginRuns(files[entryPoint], "leafonly");
  if (runs.length === 0) return [...errors];
  const held = heldBy(directives);
  const accounts = [...held.keys()];
  const parents = accounts
    .filter((account) =>
      accounts.some((other) => other.startsWith(`${account}:`)),
    )
    .filter((account) =>
      held.get(account)!.some((type) => type !== "open" && type !== "balance"),
    )
    .sort(byComponents);
  const opens = parents.length > 0 ? openLocations(files, entryPoint) : null;
  return [
    ...errors.filter((error) => !RUSTLEDGER.test(error.message)),
    ...runs
      .flatMap(() => parents)
      .map((account): BeancountError => {
        const at = opens?.get(account);
        return {
          message: `Non-leaf account '${account}' has postings on it`,
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
