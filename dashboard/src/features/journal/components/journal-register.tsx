import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerAmount } from "@/common/components/ledger-amount";
import {
  isPositiveDecimalNumber,
  negateDecimalNumber,
  parseDecimalNumber,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";
import {
  type JournalDirectiveType,
  isJournalTransaction,
} from "@/common/types/journal";
import { cn } from "@/common/lib/utils/utils";
import { deriveAccountUnits } from "@/features/journal/lib/derive-account-units";

/** One journal row: the entry, and on an account's journal what it did there. */
export type JournalTableItem = {
  directive: JournalDirectiveType;
  /** The account's change from this entry, in the page's conversion. */
  change?: Record<string, string>;
  /** Where the account stood after this entry. */
  balance?: Record<string, string>;
};

/**
 * An account's journal. Each row also says what the entry did to the account
 * and where the account then stood, as a bank register prints them, in the
 * same lines and days the Journal draws.
 */
export type JournalRegister = {
  account: string;
  /** Postings to the account's sub-accounts count as its own. */
  withChildren: boolean;
};

const amountsOf = (amounts?: Record<string, string>) =>
  Object.entries(amounts ?? {}).map(
    ([currency, number]) => [currency, String(number)] as const,
  );

/** Whether two amount maps hold the same figures, decimal for decimal. */
function sameAmounts(
  left: Record<string, string>,
  right: Record<string, string>,
): boolean {
  const currencies = Object.keys(left);
  if (currencies.length !== Object.keys(right).length) return false;
  return currencies.every((currency) => {
    const a = parseDecimalNumber(String(left[currency]));
    const b =
      currency in right ? parseDecimalNumber(String(right[currency])) : null;
    if (a === null || b === null) return false;
    return Number(sumDecimalNumbers([a, negateDecimalNumber(b)])) === 0;
  });
}

/**
 * Below `sm`, the currency a column heading already names stays unshown on
 * each figure (still read out), and any other unit sits under its figure,
 * smaller, as the Journal's own amounts set them on a phone.
 */
function phoneCurrencyClass(currency: string, quietCurrency?: string) {
  if (quietCurrency === undefined) return undefined;
  return currency === quietCurrency
    ? "max-sm:sr-only"
    : "max-sm:block max-sm:text-xs max-sm:font-normal max-sm:text-muted-foreground";
}

function Figures({
  amounts,
  signed = false,
  quietCurrency,
}: {
  amounts: ReadonlyArray<readonly [string, string]>;
  signed?: boolean;
  quietCurrency?: string;
}) {
  return amounts.map(([currency, number]) => (
    <span
      key={currency}
      className={cn(
        // On a phone a long commodity code may take a line of its own.
        "block sm:whitespace-nowrap",
        signed && isPositiveDecimalNumber(number) && "text-chart-2",
      )}
    >
      <LedgerAmount
        number={number}
        currency={currency}
        showPositiveSign={signed}
        currencyClassName={phoneCurrencyClass(currency, quietCurrency)}
      />
    </span>
  ));
}

/**
 * What the entry did to the account, signed as the Journal filtered to one
 * account writes it: money in with "+" in the money-in colour, money out with
 * "−". Every source digit stays (w2/119). Where the account holds the entry in
 * other units than the change is reported in (shares bought, shown at cost),
 * those units follow, quieter.
 */
export function RegisterChange({
  item,
  register,
  className,
  quietCurrencyOnPhone,
}: {
  item: JournalTableItem;
  register: JournalRegister;
  className?: string;
  /** The currency the column heading names on a phone. */
  quietCurrencyOnPhone?: string;
}) {
  const { t } = useTranslations();
  const change = amountsOf(item.change);
  const units = deriveAccountUnits(
    item.directive,
    register.account,
    register.withChildren,
  );
  const otherUnits =
    units && !sameAmounts(units, item.change ?? {}) ? amountsOf(units) : [];
  if (change.length === 0 && otherUnits.length === 0) return null;
  return (
    <span
      className={cn("block space-y-0.5 font-medium tabular-nums", className)}
    >
      <Figures amounts={change} signed quietCurrency={quietCurrencyOnPhone} />
      {otherUnits.length > 0 && (
        <span className="block text-xs font-normal text-muted-foreground">
          <span className="sr-only">{t("journal.unitsHeader")} </span>
          <Figures amounts={otherUnits} />
        </span>
      )}
    </span>
  );
}

/**
 * Where the account stood after the entry. Only a transaction moves it, so
 * any other entry leaves the place empty. `labelClassName` shows or hides the
 * word "Balance" before the figures: a phone, with no column heading in
 * sight, names it.
 */
export function RegisterBalance({
  item,
  className,
  labelClassName = "sr-only",
  quietCurrencyOnPhone,
}: {
  item: JournalTableItem;
  className?: string;
  labelClassName?: string;
  /** The currency the column heading names on a phone. */
  quietCurrencyOnPhone?: string;
}) {
  const { t } = useTranslations();
  const balance = amountsOf(item.balance);
  if (!isJournalTransaction(item.directive) || balance.length === 0)
    return null;
  return (
    // The word beside the figure it names, and further units beneath.
    <span
      className={cn(
        "flex flex-wrap items-baseline justify-end gap-x-1 tabular-nums",
        className,
      )}
    >
      <span className={labelClassName}>{t("journal.balanceHeader")} </span>
      <span className="space-y-0.5">
        <Figures amounts={balance} quietCurrency={quietCurrencyOnPhone} />
      </span>
    </span>
  );
}
