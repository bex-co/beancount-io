import {
  type JournalDirectiveType,
  type JournalAmount,
  isJournalBalance,
  isJournalCustom,
  isJournalDocument,
  isJournalTransaction,
} from "@/common/types/journal";
import { useFormatLedgerNumber } from "@/common/hooks/use-format-ledger-number";
import { useTranslations } from "@/common/hooks/use-translations";
import { directiveTypeLabel } from "@/common/lib/beancount/directive-type-label";
import { formatDateISO } from "@/common/lib/format/format-date-iso";
import { getBalanceFailure } from "./journal-balance-details";
import type { BalanceStatus } from "./journal-balance-tone";

/** Bounded identity from the row's visible entry fields, never source metadata. */
export function useJournalEntryLabel(
  directive: JournalDirectiveType,
  balanceStatus: BalanceStatus,
): string {
  const { t } = useTranslations();
  const formatNumber = useFormatLedgerNumber();
  const formatAmount = (amount: JournalAmount) =>
    `${formatNumber(amount.number)} ${amount.currency}`;
  const parts = [formatDateISO(directive.date) ?? ""];
  if (isJournalTransaction(directive)) {
    parts.push(directive.payee ?? "", directive.narration ?? "");
  } else {
    parts.push(directiveTypeLabel(directive.directive_type, t));
    if (isJournalBalance(directive)) {
      // A Balance carries `amount` too, so it must not reach the Price branch.
      const failure = getBalanceFailure(directive);
      if (balanceStatus === "unchecked")
        parts.push(t("journal.balanceNotChecked"));
      parts.push(failure ? t("journal.balanceFailed") : directive.account);
      const { amount, tolerance } = directive;
      if (amount) {
        const assertion = formatNumber(amount.number);
        const margin = tolerance ? ` ~ ${formatNumber(tolerance)}` : "";
        parts.push(`${assertion}${margin} ${amount.currency}`);
      }
      if (failure) {
        if (failure.accumulated) {
          parts.push(
            t("journal.accumulated"),
            formatAmount(failure.accumulated),
          );
        }
        parts.push(
          t(failure.differenceLabel, {
            amount: formatAmount(failure.difference),
          }),
          directive.account,
        );
      }
    } else if (isJournalDocument(directive)) {
      parts.push(directive.account, directive.filename.split("/").pop() ?? "");
    } else if (isJournalCustom(directive)) {
      parts.push(directive.type);
      for (const value of directive.values) {
        if (["string", "number", "boolean"].includes(typeof value)) {
          parts.push(String(value));
        } else if (
          value &&
          typeof value === "object" &&
          "number" in value &&
          typeof value.number === "string" &&
          "currency" in value &&
          typeof value.currency === "string"
        ) {
          parts.push(
            formatAmount({
              number: value.number,
              currency: value.currency,
            }),
          );
        }
      }
    } else if ("comment" in directive) {
      parts.push(directive.comment);
    } else if ("description" in directive) {
      parts.push(directive.type, directive.description);
    } else if ("amount" in directive) {
      parts.push(`${formatAmount(directive.amount)}/${directive.currency}`);
    } else if ("currency" in directive) {
      parts.push(directive.currency);
    } else if ("account" in directive) {
      parts.push(directive.account);
      if ("source_account" in directive) parts.push(directive.source_account);
    }
  }

  const label = parts.join(" ").replace(/\s+/g, " ").trim();
  const characters = Array.from(label);
  return characters.length > 160
    ? `${characters.slice(0, 159).join("").trimEnd()}…`
    : label;
}
