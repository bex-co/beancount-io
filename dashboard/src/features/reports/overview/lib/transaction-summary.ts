import type {
  JournalPosting,
  JournalTransaction,
} from "@/common/types/journal";
import {
  absDecimalNumber,
  negateDecimalNumber,
  parseDecimalNumber,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";
import type { CurrencyAmount } from "./overview-utils";
import { prioritizeCurrency } from "./overview-utils";

export type TransactionSummaryKind =
  | "income"
  | "expense"
  | "transfer"
  | "mixed";

export type TransactionSummary = {
  kind: TransactionSummaryKind;
  amounts: CurrencyAmount[];
  accounts: string[];
  status: "cleared" | "pending" | "other";
};

function isAccountWithin(account: string, root: string): boolean {
  return account === root || account.startsWith(`${root}:`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Does this account satisfy the account filter the reader typed?
 *
 * The search box accepts anything, and the ledger's own filter
 * (`foundation/rustledger/directive-filter.ts`) matches an account by a whole
 * component **or** a case-insensitive unanchored regex, falling back to literal
 * equality when the pattern will not compile. Summarising with a plain
 * exact-or-subtree test disagreed with that: typing `Checking` returned the
 * right transactions but matched none of their postings, so every row lost its
 * amount while `Assets:US:BofA:Checking` worked.
 *
 * This is a deliberately small local copy of those two rules. Importing the
 * ledger package into the browser bundle would cost far more than it saves.
 */
function makeAccountMatcher(filter: string): (account: string) => boolean {
  const component = new RegExp(`(^|:)${escapeRegExp(filter)}(:|$)`);
  let pattern: RegExp | null = null;
  try {
    pattern = new RegExp(filter, "i");
  } catch {
    pattern = null;
  }
  return (account: string): boolean =>
    component.test(account) ||
    (pattern ? pattern.test(account) : account === filter);
}

/** A posting's units as the ledger's decimal, or null when it is not one. */
function postingDecimal(posting: JournalPosting): string | null {
  return parseDecimalNumber(String(posting.units.number));
}

/**
 * Each currency's exact total, as the ledger's decimals: doubles turned
 * +9007199254740993 − 9007199254740992 into 0 and hid the one-dollar net, and
 * cut a digit from large income (w4/1034). `value` stays for ordering.
 */
function sumPostings(
  postings: JournalPosting[],
  negate = false,
): CurrencyAmount[] {
  const totals = new Map<string, string[]>();
  for (const posting of postings) {
    const exact = postingDecimal(posting);
    if (exact === null) continue;
    totals.set(posting.units.currency, [
      ...(totals.get(posting.units.currency) ?? []),
      negate ? negateDecimalNumber(exact) : exact,
    ]);
  }
  return Array.from(totals, ([currency, amounts]) => {
    const exact = sumDecimalNumbers(amounts);
    return { currency, value: Number(exact), exact };
  }).filter((amount) => amount.value !== 0);
}

function uniqueAccounts(postings: JournalPosting[]): string[] {
  return Array.from(new Set(postings.map((posting) => posting.account)));
}

function getStatus(flag: string): TransactionSummary["status"] {
  if (flag === "*") return "cleared";
  if (flag === "!") return "pending";
  return "other";
}

export function summarizeTransaction({
  transaction,
  accountFilter,
  preferredCurrency,
  incomeRoot,
  expensesRoot,
}: {
  transaction: JournalTransaction;
  accountFilter: string;
  preferredCurrency: string;
  incomeRoot: string;
  expensesRoot: string;
}): TransactionSummary {
  const postings = transaction.postings ?? [];

  if (accountFilter) {
    const matchesFilter = makeAccountMatcher(accountFilter);
    const selected = postings.filter((posting) =>
      matchesFilter(posting.account),
    );
    const counterparties = postings.filter(
      (posting) => !matchesFilter(posting.account),
    );
    return {
      kind: "mixed",
      amounts: prioritizeCurrency(sumPostings(selected), preferredCurrency),
      accounts: uniqueAccounts(
        counterparties.length ? counterparties : selected,
      ),
      status: getStatus(transaction.flag),
    };
  }

  const expensePostings = postings.filter((posting) =>
    isAccountWithin(posting.account, expensesRoot),
  );
  const mixedExpense =
    expensePostings.length > 0 &&
    postings.some(
      (posting) =>
        isAccountWithin(posting.account, incomeRoot) ||
        (!isAccountWithin(posting.account, expensesRoot) &&
          posting.cost != null &&
          posting.units.currency !== posting.cost.currency),
    );
  // A payroll carries salary and its deductions; a sale carries a gain and its
  // commission. Costed purchases and loss sales can carry only expenses, whose
  // total is still just a fee or realized loss, not the transaction amount.
  // Say there are several postings and let the entry itself explain them.
  if (mixedExpense) {
    return {
      kind: "mixed",
      amounts: [],
      accounts: uniqueAccounts(postings),
      status: getStatus(transaction.flag),
    };
  }

  if (expensePostings.length > 0) {
    return {
      kind: "expense",
      amounts: prioritizeCurrency(
        sumPostings(expensePostings, true),
        preferredCurrency,
      ),
      accounts: uniqueAccounts(postings),
      status: getStatus(transaction.flag),
    };
  }

  const incomePostings = postings.filter((posting) =>
    isAccountWithin(posting.account, incomeRoot),
  );
  if (incomePostings.length > 0) {
    return {
      kind: "income",
      amounts: prioritizeCurrency(
        sumPostings(incomePostings, true),
        preferredCurrency,
      ),
      accounts: uniqueAccounts(postings),
      status: getStatus(transaction.flag),
    };
  }

  if (postings.length === 2) {
    const [first, second] = postings;
    const firstExact = postingDecimal(first);
    const secondExact = postingDecimal(second);
    if (
      first.units.currency === second.units.currency &&
      firstExact !== null &&
      secondExact !== null &&
      Math.abs(Number(sumDecimalNumbers([firstExact, secondExact]))) < 1e-9
    ) {
      const exact = absDecimalNumber(firstExact);
      return {
        kind: "transfer",
        amounts: [
          { currency: first.units.currency, value: Number(exact), exact },
        ],
        accounts: uniqueAccounts(postings),
        status: getStatus(transaction.flag),
      };
    }
  }

  return {
    kind: "mixed",
    amounts: [],
    accounts: uniqueAccounts(postings),
    status: getStatus(transaction.flag),
  };
}
