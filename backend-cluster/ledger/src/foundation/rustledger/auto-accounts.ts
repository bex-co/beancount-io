import type { BeancountError, DirectiveJson } from "@rustledger/wasm";
import { collectLedgerPlugins } from "./plugins/collect-plugins";

const PLUGIN = "beancount.plugins.auto_accounts";
/** The engine's two ways of saying an account was never opened. */
const UNOPENED = [
  /^Account (\S+) was never opened$/u,
  /^Invalid reference to unknown account '(.+)'$/u,
];

/** The accounts a directive names, as Beancount's `get_entry_accounts`. */
function accountsOf(directive: DirectiveJson): string[] {
  switch (directive.type) {
    case "transaction":
      return directive.postings.map((posting) => posting.account);
    case "pad":
      return [directive.account, directive.source_account];
    case "balance":
    case "note":
    case "document":
    case "close":
      return [directive.account];
    default:
      return [];
  }
}

/**
 * Beancount's `auto_accounts` opens every account a directive names, on its
 * first use. The engine's opens none named only by a note or a close (a
 * parent `close_tree` closes, say), so it reported each as never opened,
 * where bean-check passes (w21/737). With the plugin declared, each such
 * account is opened before its first use, as Beancount does, and the engine's
 * error about it is dropped.
 */
export function openAutoAccounts(
  directives: readonly DirectiveJson[],
  errors: readonly BeancountError[],
  entryPointSource: string | undefined,
): { directives: DirectiveJson[]; errors: BeancountError[] } {
  const unopened = (error: BeancountError) =>
    error.code === "E1001"
      ? UNOPENED.map((pattern) => pattern.exec(error.message)?.[1]).find(
          (account) => account !== undefined,
        )
      : undefined;
  if (
    !collectLedgerPlugins(entryPointSource).includes(PLUGIN) ||
    !errors.some((error) => unopened(error) !== undefined)
  ) {
    return { directives: [...directives], errors: [...errors] };
  }
  const opened = new Set(
    directives.flatMap((directive) =>
      directive.type === "open" ? [directive.account] : [],
    ),
  );
  const missing = new Set(
    errors
      .map(unopened)
      .filter(
        (account): account is string =>
          account !== undefined && !opened.has(account),
      ),
  );
  const added = new Set<string>();
  const withOpens: DirectiveJson[] = [];
  for (const directive of directives) {
    for (const account of accountsOf(directive)) {
      if (!missing.has(account) || added.has(account)) continue;
      added.add(account);
      withOpens.push({
        type: "open",
        date: directive.date,
        account,
        currencies: [],
      });
    }
    withOpens.push(directive);
  }
  return {
    directives: withOpens,
    errors: errors.filter((error) => {
      const account = unopened(error);
      return account === undefined || !added.has(account);
    }),
  };
}
