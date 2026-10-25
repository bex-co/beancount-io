import { BadUserInputError } from "@/shared/errors";
import { matchesAccountPattern } from "./account-matcher";
import { resolveConversionTarget } from "./report-conversion";
import {
  DirectiveType,
  type AccountJournalEntryPublic,
  type JournalAmountPublic,
  type JournalBalancePublic,
  type JournalPostingPublic,
  type JournalTransactionPublic,
} from "@/foundation/fava";

/**
 * One account's register, mirroring `bea report register`
 * (`cli/src/bea_engine/report.py`).
 *
 * Rows come from the ledger's account journal — per-entry change and
 * running balance computed with Fava's own conversion — reshaped to
 * CLI-like rows. Two deliberate deltas: rows are per entry, not per
 * posting (a transaction's subtree postings ride along in `postings`,
 * sharing the entry's converted change and balance, rather than
 * interpolating balances the price map could not price), and a time
 * window carries the opening balance forward (Fava's clamp) instead of
 * restarting at zero.
 */

type RegisterPosting = {
  account: string;
  amount: { number: string; currency: string };
  cost: { number: string; currency: string; date: string } | null;
};

export type RegisterRow = {
  date: string;
  entry: "transaction" | "balance";
  payee: string | null;
  narration: string | null;
  postings: RegisterPosting[];
  change: Record<string, string>;
  balance: Record<string, string>;
};

export type RegisterResult = {
  account: string | null;
  rows: RegisterRow[];
};

/**
 * Resolve the conversion target: an explicit currency or Fava mode,
 * `units` for none, or the ledger's single operating currency when
 * omitted — the CLI's default. The journal honors every mode, so all
 * four travel; lists (`USD,EUR`) are refused, as the CLI takes one.
 */
export function resolveRegisterConversion(
  conversion: string | undefined,
  operatingCurrencies: string[],
): string | null {
  if (conversion !== undefined && conversion.includes(",")) {
    throw new BadUserInputError(
      `Unsupported conversion "${conversion}": pass one currency code, "units", at_cost, or at_value.`,
    );
  }
  return resolveConversionTarget(conversion, operatingCurrencies, [
    "at_cost",
    "at_value",
  ]);
}

/**
 * The one subtree `pattern` names, or null when it spans several —
 * `_register_root` verbatim. `active` is the sorted accounts with
 * postings or balance assertions the pattern matches; a literal path
 * resolves through the candidate rule, a true regex through collapse.
 */
export function resolveRegisterRoot(
  pattern: string,
  active: readonly string[],
): string | null {
  if (active.length === 0) return null;
  const depth = pattern.split(":").length;
  const candidate = active[0]!.split(":").slice(0, depth).join(":");
  if (
    candidate.toLowerCase() === pattern.toLowerCase() &&
    active.every(
      (name) => name === candidate || name.startsWith(`${candidate}:`),
    )
  ) {
    return candidate;
  }
  const roots = active.filter((name) =>
    active.every(
      (other) => other === name || other.startsWith(`${name}:`),
    ),
  );
  return roots.length === 1 ? roots[0]! : null;
}

/** Whether the pattern resolves, and what it resolves to. */
export function selectRegisterRoot(
  pattern: string,
  postingAccounts: readonly string[],
  balanceAccounts: readonly string[],
  roots: readonly string[],
): string | null {
  const active = [...new Set([...postingAccounts, ...balanceAccounts])]
    .filter((name) => matchesAccountPattern(pattern, name, roots))
    .sort();
  const root = resolveRegisterRoot(pattern, active);
  if (active.length > 0 && root === null) {
    throw new BadUserInputError(
      `Register needs one account; '${pattern}' matches several: ${active.join(", ")}. Name one account to list.`,
    );
  }
  return root;
}

function mapAmount(amount: JournalAmountPublic): {
  number: string;
  currency: string;
} {
  return { number: amount.number, currency: amount.currency };
}

function mapPosting(posting: JournalPostingPublic): RegisterPosting {
  return {
    account: posting.account,
    amount: mapAmount(posting.units),
    cost:
      posting.cost === undefined || posting.cost === null
        ? null
        : {
            number: posting.cost.number,
            currency: posting.cost.currency,
            date: posting.cost.date,
          },
  };
}

function isSubtree(root: string, name: string): boolean {
  return name === root || name.startsWith(`${root}:`);
}

/**
 * Journal items, newest-first, to register rows, oldest-first. Each row
 * keeps the entry's converted change and running balance and the
 * subtree postings behind them; entries outside transaction/balance
 * cannot occur (the journal call filters kinds) and are skipped
 * defensively.
 */
export function mapRegisterRows(
  items: readonly AccountJournalEntryPublic[],
  root: string,
): RegisterRow[] {
  const rows: RegisterRow[] = [];
  for (const item of [...items].reverse()) {
    const entry = item.entry;
    if (entry.directive_type === DirectiveType.Transaction) {
      const transaction = entry as JournalTransactionPublic;
      rows.push({
        date: transaction.date,
        entry: "transaction",
        payee: transaction.payee ?? null,
        narration: transaction.narration ?? null,
        postings: transaction.postings
          .filter((posting) => isSubtree(root, posting.account))
          .map(mapPosting),
        change: { ...item.change },
        balance: { ...item.balance },
      });
    } else if (entry.directive_type === DirectiveType.Balance) {
      const balance = entry as JournalBalancePublic;
      rows.push({
        date: balance.date,
        entry: "balance",
        payee: null,
        narration: null,
        postings: isSubtree(root, balance.account)
          ? [{ account: balance.account, amount: mapAmount(balance.amount), cost: null }]
          : [],
        change: { ...item.change },
        balance: { ...item.balance },
      });
    }
  }
  return rows;
}
