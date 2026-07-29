import type {
  JournalPosting,
  JournalTransaction,
} from "@/common/types/journal";
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

function sumPostings(
  postings: JournalPosting[],
  transform: (value: number) => number = (value) => value,
): CurrencyAmount[] {
  const totals = new Map<string, number>();
  for (const posting of postings) {
    const value = Number(posting.units.number);
    if (!Number.isFinite(value)) continue;
    totals.set(
      posting.units.currency,
      (totals.get(posting.units.currency) ?? 0) + transform(value),
    );
  }
  return Array.from(totals, ([currency, value]) => ({
    currency,
    value,
  })).filter((amount) => amount.value !== 0);
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
    const selected = postings.filter((posting) =>
      isAccountWithin(posting.account, accountFilter),
    );
    const counterparties = postings.filter(
      (posting) => !isAccountWithin(posting.account, accountFilter),
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
  if (expensePostings.length > 0) {
    return {
      kind: "expense",
      amounts: prioritizeCurrency(
        sumPostings(expensePostings, (value) => -value),
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
        sumPostings(incomePostings, (value) => -value),
        preferredCurrency,
      ),
      accounts: uniqueAccounts(postings),
      status: getStatus(transaction.flag),
    };
  }

  if (postings.length === 2) {
    const [first, second] = postings;
    const firstValue = Number(first.units.number);
    const secondValue = Number(second.units.number);
    if (
      first.units.currency === second.units.currency &&
      Number.isFinite(firstValue) &&
      Number.isFinite(secondValue) &&
      Math.abs(firstValue + secondValue) < 1e-9
    ) {
      return {
        kind: "transfer",
        amounts: [
          {
            currency: first.units.currency,
            value: Math.abs(firstValue),
          },
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
