import { getFormatDate } from "../../common/format-util";
import { currencyMinorUnits } from "../../common/currency-util";
import { parseExactAmount } from "../multi-postings-transaction/postings-utils";
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
   * one change is the sign: an income target is stored negative and any other
   * budget positive (see `incomeRoot`).
   */
  number: string;
  currency: string;
  date: Date;
  /**
   * The ledger's income root (`name_income`). A budget on an account under it
   * is an income target and is stored negative whatever sign was typed, so the
   * user does not have to know the convention for its status to read right.
   * Any other account's budget is stored positive whatever sign was typed: a
   * negative amount reads as an income target, so an Expenses cap typed "-500"
   * showed always red and "0% used" (w21/302). Unknown (the ledger's roots not
   * loaded) leaves the text as typed.
   */
  incomeRoot?: string;
};

/**
 * The amount typed, as the plain decimal the ledger parses, or null when it is
 * not a number. It reads what New Transaction reads (`parseExactAmount`): digits
 * from any keyboard, a decimal comma ("49,99"), and grouping where it is
 * unambiguous ("1,234.56", "1.234,56"), all written as `49.99`-style ASCII
 * (w21/514). The text is otherwise written verbatim, so `12..3`, `abc` or
 * `1e3` used to commit an unparsable `custom "budget"` line (w0/038): those
 * stay refused, as does a lone sign or more than 28 digits.
 */
function parseBudgetAmount(text: string, minorUnits?: number): string | null {
  return parseExactAmount(text.trim().replace(/^\+/u, ""), minorUnits);
}

/** Whether typed text is an amount the ledger can parse. */
export function isBudgetAmount(text: string): boolean {
  return parseBudgetAmount(text) !== null;
}

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

/** A spending cap typed with a sign: stored as the positive amount. */
function asSpendingCap(amount: string): string {
  return amount.replace(/^[+-]/u, "");
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
  const code = currency.trim().toUpperCase();
  const amount =
    parseBudgetAmount(number, currencyMinorUnits(code)) ?? number.trim();
  return {
    type: "BUDGET" as LedgerEntryType,
    budget: {
      account: trimmedAccount,
      interval: interval.toUpperCase() as BudgetInterval,
      date: getFormatDate(date),
      amount: {
        number: !incomeRoot
          ? amount
          : isIncomeAccount(trimmedAccount, incomeRoot)
            ? asIncomeTarget(amount)
            : asSpendingCap(amount),
        currency: code,
      },
    },
  };
}
