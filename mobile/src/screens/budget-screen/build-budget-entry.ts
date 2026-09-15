import { getFormatDate } from "../../common/format-util";
import type {
  AddEntryInput,
  BudgetInterval,
  LedgerEntryType,
} from "../../generated-graphql/types";

export type BudgetEntryInput = {
  account: string;
  /** Uppercase schema cadence, e.g. "MONTHLY". */
  interval: string;
  /**
   * Amount as typed. Kept a string all the way to the server so the ledger
   * records exactly what the user entered, and because a negative amount is
   * meaningful: it declares an income target rather than a spending cap. The
   * one change is the sign of an income target (see `incomeRoot`).
   */
  number: string;
  currency: string;
  date: Date;
  /**
   * The ledger's income root (`name_income`). A budget on an account under it
   * is an income target and is stored negative whatever sign was typed, so the
   * user does not have to know the convention for its status to read right.
   */
  incomeRoot?: string;
};

function isIncomeAccount(account: string, incomeRoot?: string): boolean {
  return (
    Boolean(incomeRoot) &&
    (account === incomeRoot || account.startsWith(`${incomeRoot}:`))
  );
}

/** A target typed as the positive amount someone hopes to earn, stored negative. */
function asIncomeTarget(amount: string): string {
  if (amount.startsWith("-")) return amount;
  const unsigned = amount.replace(/^\+/u, "");
  return Number(unsigned) === 0 ? unsigned : `-${unsigned}`;
}

/**
 * Build the single schema input that writes a Beancount `custom "budget"`
 * directive. There is no update mutation: revising a budget means adding a
 * newer-dated entry, which supersedes the previous one from its date.
 */
export function buildBudgetEntry({
  account,
  interval,
  number,
  currency,
  date,
  incomeRoot,
}: BudgetEntryInput): AddEntryInput {
  const trimmedAccount = account.trim();
  const amount = number.trim();
  return {
    type: "BUDGET" as LedgerEntryType,
    budget: {
      account: trimmedAccount,
      interval: interval.toUpperCase() as BudgetInterval,
      date: getFormatDate(date),
      amount: {
        number: isIncomeAccount(trimmedAccount, incomeRoot)
          ? asIncomeTarget(amount)
          : amount,
        currency: currency.trim().toUpperCase(),
      },
    },
  };
}
