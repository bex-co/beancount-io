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
   * meaningful: it declares an income target rather than a spending cap.
   */
  number: string;
  currency: string;
  date: Date;
};

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
}: BudgetEntryInput): AddEntryInput {
  return {
    type: "BUDGET" as LedgerEntryType,
    budget: {
      account: account.trim(),
      interval: interval.toUpperCase() as BudgetInterval,
      date: getFormatDate(date),
      amount: {
        number: number.trim(),
        currency: currency.trim().toUpperCase(),
      },
    },
  };
}
