import {
  absDecimalNumber,
  isPositiveDecimalNumber,
  parseDecimalNumber,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";
import type { JournalBalance, JournalAmount } from "@/common/types/journal";

/** The journal's difference is the actual balance minus the asserted amount. */
export function getBalanceFailure(directive: JournalBalance): {
  accumulated: JournalAmount | null;
  difference: JournalAmount;
  differenceLabel:
    | "journal.balanceTooLittle"
    | "journal.balanceTooMuch"
    | "journal.balanceOffBy";
} | null {
  const { amount, diff_amount: difference } = directive;
  if (!difference) return null;
  const delta = parseDecimalNumber(difference.number.replace(/,/g, ""));
  const asserted =
    amount && amount.currency === difference.currency
      ? parseDecimalNumber(amount.number.replace(/,/g, ""))
      : null;
  return {
    accumulated:
      asserted !== null && delta !== null
        ? {
            number: sumDecimalNumbers([asserted, delta]),
            currency: difference.currency,
          }
        : null,
    difference:
      delta === null
        ? difference
        : { ...difference, number: absDecimalNumber(delta) },
    differenceLabel: delta?.startsWith("-")
      ? "journal.balanceTooLittle"
      : delta && isPositiveDecimalNumber(delta)
        ? "journal.balanceTooMuch"
        : "journal.balanceOffBy",
  };
}
