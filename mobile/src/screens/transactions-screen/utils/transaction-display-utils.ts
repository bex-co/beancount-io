import { formatLedgerDate } from "../../../common/date-format";
import { getAccountRoot, type RootNames } from "../../../common/account-root";
import {
  currencyMinorUnits,
  isFiatCurrency,
  labelRowAmount,
} from "../../../common/currency-util";
import { amountScale } from "../../../common/number-utils";
import { isEquityConversion } from "../../../common/tx-category";
import { addExact } from "../../multi-postings-transaction/postings-utils";
import {
  JournalDirectiveType,
  JournalPosting,
  JournalTransaction,
  isJournalTransaction,
} from "../types";

export type JournalSection = {
  isoDate: string;
  displayDate: string;
  data: JournalDirectiveType[];
};

/** Default scale: money reads with cents, so 1.5 shows as 1.50. */
const MIN_FRACTION_DIGITS = 2;
/** Most recorded digits a commodity amount is padded out to. */
const COMMODITY_RECORDED_DIGITS = 8;

/** `Intl.NumberFormat` rejects anything above this. */
const MAX_FRACTION_DIGITS = 20;

/**
 * Unsigned magnitude for display.
 *
 * @param scale - Fraction digits the source recorded (see `amountScale`). Acts
 *   as the maximum, so a crypto reward of 0.004 ETH survives instead of
 *   rounding to 0.00.
 * @param operatingCurrency - The ledger's first `operating_currency`, which
 *   decides whether USD may read as "$" (`labelRowAmount`).
 */
export const formatAmount = (
  value: number,
  currency: string,
  scale = MIN_FRACTION_DIGITS,
  heldAtCost = false,
  operatingCurrency?: string,
  exact?: string,
): string => {
  // The display floor is the currency's minor unit: "1,500 JPY" as account
  // detail shows it, not "1,500.00 JPY" (w21/070). Only for a national
  // currency: a share count or a points balance keeps the digits it was
  // recorded with, as Money flow shows it, and so do units held at a cost,
  // whatever their ticker spells (BND, AMD, NOK) (w21/445, w21/506, w21/601).
  const minimumFractionDigits =
    !heldAtCost && isFiatCurrency(currency)
      ? currencyMinorUnits(currency)
      : Math.min(COMMODITY_RECORDED_DIGITS, scale);
  const maximumFractionDigits = Math.min(
    MAX_FRACTION_DIGITS,
    Math.max(minimumFractionDigits, scale),
  );
  const formatted =
    exact !== undefined && PLAIN_DECIMAL.test(exact) && needsExactDigits(exact)
      ? groupedExact(exact, minimumFractionDigits)
      : Math.abs(value).toLocaleString("en-US", {
          minimumFractionDigits,
          maximumFractionDigits,
        });
  return labelRowAmount(formatted, currency, operatingCurrency);
};

/** A plain decimal, which `addExact` can add without a float. */
const PLAIN_DECIMAL = /^[+-]?\d+(\.\d+)?$/;

/**
 * Whether an amount holds more significant digits than a double does: past
 * that, the double prints digits the ledger never wrote, so the exact string is
 * used (w21/970).
 */
const needsExactDigits = (exact: string): boolean =>
  exact.replace(/\D/g, "").replace(/^0+/, "").length > 15;

/** An exact decimal, unsigned and grouped by thousands, padded to `minimumFractionDigits`. */
const groupedExact = (exact: string, minimumFractionDigits: number): string => {
  const [whole = "0", fraction = ""] = exact.replace(/^[+-]/, "").split(".");
  const padded = fraction.padEnd(minimumFractionDigits, "0");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return padded ? `${grouped}.${padded}` : grouped;
};

/** The exact sum of legs given as decimal strings, or undefined if one is not plain. */
const exactSum = (numbers: readonly string[]): string | undefined => {
  let sum = "0";
  for (const number of numbers) {
    const trimmed = number.trim();
    if (!PLAIN_DECIMAL.test(trimmed)) return undefined;
    sum = addExact(sum, trimmed);
  }
  return sum;
};

/** A transaction's headline amount: one currency, never a cross-currency sum. */
export type EntryAmount = {
  /** Unsigned formatted magnitude, e.g. "$3,177.39" or "355.63 RGAGX". */
  text: string;
  /** Signed value, so callers decide the "+" prefix and the color. */
  value: number;
  currency: string;
};

/**
 * A trade whose money side cannot be told as one signed figure: the cash,
 * financing and book-value adjustments that settle a commodity were recorded
 * against several balance-sheet accounts. Their sum is a partial subtotal (it
 * excludes the commodity's costed leg), not money in or out, so callers show
 * a neutral "multiple postings" summary instead of a signed amount.
 */
export type MixedPostingsAmount = { mixed: true };

/** What a transaction headline shows: an amount, or the mixed summary. */
export type TransactionAmount = EntryAmount | MixedPostingsAmount;

export const isMixedPostingsAmount = (
  amount: TransactionAmount,
): amount is MixedPostingsAmount => "mixed" in amount;

/** Currency a posting is *priced* in, when it holds a commodity at cost. */
const moneyCurrencyOf = (p: JournalPosting): string | undefined =>
  p.cost?.currency ?? p.price?.currency ?? undefined;

const isBalanceSheet = (account: string, roots: RootNames): boolean => {
  const root = getAccountRoot(account, roots);
  return root === "assets" || root === "liabilities";
};

/** An Expenses or Income posting: the fee or rounding line of an exchange. */
const isFeeLine = (account: string, roots: RootNames): boolean => {
  const root = getAccountRoot(account, roots);
  return root === "expenses" || root === "income";
};

/**
 * The amount an exchange's fee and rounding lines leave, signed from the cash
 * side (spent is negative), or null when they are in several currencies or
 * cancel out, where the exchange stays neutral.
 */
const feeAmount = (
  lines: JournalPosting[],
  operatingCurrency?: string,
): TransactionAmount | null => {
  const currencies = new Set(lines.map((p) => p.units.currency));
  if (currencies.size !== 1) return null;
  const currency = lines[0]!.units.currency;
  let total = 0;
  let scale = 0;
  for (const p of lines) {
    const value = parseFloat(p.units.number);
    if (!Number.isFinite(value)) return null;
    total += value;
    scale = Math.max(scale, amountScale(p.units.number));
  }
  const value = -total;
  if (Math.abs(value) < 0.5 * 10 ** -scale) return null;
  return {
    text: formatAmount(value, currency, scale, false, operatingCurrency),
    value,
    currency,
  };
};

/**
 * A holding received or given at cost for income or an expense: a reinvested
 * dividend (+0.496 VTI {120 USD}, a 0.48 USD residue, Income −60 USD), an RSU
 * vest, a staking reward, shares given to charity. Every balance-sheet leg
 * moves the same way, so the money is the income or expense side: the
 * reinvested dividend read "+$0.48", its residue, or "+0.5 VTI" without one
 * (w21/712). A buy or a sale moves cash against the holding and still reads as
 * the cash.
 */
const incomeFundedAmount = (
  postings: JournalPosting[],
  roots: RootNames,
  operatingCurrency?: string,
): TransactionAmount | null => {
  const flows = postings.filter((p) => isFeeLine(p.account, roots));
  const sheet = postings.filter((p) => isBalanceSheet(p.account, roots));
  if (flows.length === 0 || !sheet.some((p) => p.cost?.currency)) return null;
  const directions = new Set(
    sheet.map((p) => Math.sign(parseFloat(p.units.number))),
  );
  if (directions.size !== 1) return null;
  const currencies = new Set(flows.map((p) => p.units.currency));
  if (currencies.size !== 1) return null;
  const currency = flows[0]!.units.currency;
  let total = 0;
  let scale = 0;
  for (const p of flows) {
    const value = parseFloat(p.units.number);
    if (!Number.isFinite(value)) return null;
    total += value;
    scale = Math.max(scale, amountScale(p.units.number));
  }
  const value = -total;
  if (Math.abs(value) < 0.5 * 10 ** -scale) return null;
  return {
    text: formatAmount(value, currency, scale, false, operatingCurrency),
    value,
    currency,
  };
};

/**
 * A corporate action: every posting is a held lot (it has a cost), and the cost
 * of what left equals the cost of what arrived in each cost currency. A split
 * (-10 NVDA {1200 USD}, +100 NVDA {120 USD}) or a merger (-10 OLDCO {100 USD},
 * +5 NEWCO {200 USD}) moves no money, yet read as shares gained or lost in
 * money colours (w21/571). Its size is the largest leg, unsigned and neutral.
 */
const corporateActionAmount = (
  postings: JournalPosting[],
  roots: RootNames,
  operatingCurrency?: string,
): TransactionAmount | null => {
  if (
    postings.length < 2 ||
    !postings.every((p) => p.cost?.currency && isBalanceSheet(p.account, roots))
  ) {
    return null;
  }
  const costs = new Map<string, number>();
  let largest: JournalPosting | null = null;
  for (const p of postings) {
    const units = parseFloat(p.units.number);
    const unitCost = parseFloat(p.cost!.number ?? "");
    if (!Number.isFinite(units) || !Number.isFinite(unitCost)) return null;
    costs.set(
      p.cost!.currency,
      (costs.get(p.cost!.currency) ?? 0) + units * unitCost,
    );
    if (
      largest === null ||
      Math.abs(units) > Math.abs(parseFloat(largest.units.number))
    ) {
      largest = p;
    }
  }
  if ([...costs.values()].some((net) => Math.abs(net) >= 0.005) || !largest) {
    return null;
  }
  const currency = largest.units.currency;
  return {
    text: formatAmount(
      Math.abs(parseFloat(largest.units.number)),
      currency,
      amountScale(largest.units.number),
      true,
      operatingCurrency,
    ),
    value: 0,
    currency,
  };
};

/**
 * The one number to show for a transaction, in a single currency.
 *
 * Netting Assets/Liabilities postings answers "what moved in or out", but the
 * legs are only commensurable when they share a currency: a fund purchase pairs
 * `-3,177.39 USD` with `+355.63 RGAGX`, and adding those produces a number that
 * means nothing. So legs are bucketed by currency and summed within a bucket,
 * never across.
 *
 * With several buckets the pick goes by meaning, never by comparing numbers
 * in different units (w21/057):
 *
 * - A trade, where some posting holds a commodity `{cost}`, shows the bucket
 *   its cost or price is quoted in: the cash side.
 * - An exchange between own accounts (every posting on the balance sheet, no
 *   cost) has no direction, so it reads unsigned and neutral, sized by its
 *   operating-currency leg, or else its alphabetically first currency, so the
 *   same exchange reads the same whichever leg carries the `@`.
 * - Anything else (a card purchase that also earns miles) shows the operating
 *   currency, then the currency an Expenses posting is in, then the bucket a
 *   price is quoted in, then the largest magnitude. When no
 * Assets/Liabilities posting exists at all (an Income → Expenses entry, say),
 * fall back to the single largest posting.
 *
 * That preferred money bucket is a genuine money leg only while it belongs to
 * one account (a brokerage cash account, fees included). A financed purchase
 * (a cash down payment plus a mortgage) or a disposal that also writes off
 * improvements and depreciation spreads it over several accounts, and its sum
 * is then an unexplained partial subtotal, so that trade is reported as mixed.
 *
 * @param operatingCurrency - The ledger's first `operating_currency`, when known.
 * @param roots - The ledger's renamed roots, so `Activos:Banco` counts as a
 *   balance-sheet leg and `Gastos:…` as spending (w21/073).
 * @returns The amount; `{ mixed: true }` for a trade whose money side spans
 *   several balance-sheet accounts; or null when the transaction has no usable
 *   posting.
 */
export const selectTransactionAmount = (
  txn: JournalTransaction,
  operatingCurrency?: string,
  roots: RootNames = {},
): TransactionAmount | null => {
  const postings = txn.postings ?? [];
  if (!postings.length) return null;

  const corporateAction = corporateActionAmount(
    postings,
    roots,
    operatingCurrency,
  );
  if (corporateAction) return corporateAction;
  const incomeFunded = incomeFundedAmount(postings, roots, operatingCurrency);
  if (incomeFunded) return incomeFunded;

  const cashPostings = postings.filter((p) => isBalanceSheet(p.account, roots));
  // Units a lot is held in, whatever the commodity's ticker looks like.
  const heldAtCost = new Set(
    postings.filter((p) => p.cost?.currency).map((p) => p.units.currency),
  );

  if (cashPostings.length > 0) {
    // A sum is only as coarse as its finest leg, so a bucket carries the
    // widest scale any of its postings recorded.
    const byCurrency = new Map<
      string,
      {
        value: number;
        scale: number;
        legs: number;
        largestLeg: number;
        accounts: Set<string>;
        /** The legs' numbers as written, to sum without a float. */
        numbers: string[];
        /** The largest leg as written. */
        largestExact: string;
      }
    >();
    for (const p of cashPostings) {
      const value = parseFloat(p.units.number);
      if (!Number.isFinite(value)) continue;
      const currency = p.units.currency;
      const bucket = byCurrency.get(currency);
      const scale = amountScale(p.units.number);
      if (bucket) {
        bucket.value += value;
        bucket.scale = Math.max(bucket.scale, scale);
        bucket.legs += 1;
        if (Math.abs(value) > bucket.largestLeg) {
          bucket.largestExact = p.units.number;
        }
        bucket.largestLeg = Math.max(bucket.largestLeg, Math.abs(value));
        bucket.accounts.add(p.account);
        bucket.numbers.push(p.units.number);
      } else {
        byCurrency.set(currency, {
          value,
          scale,
          legs: 1,
          largestLeg: Math.abs(value),
          accounts: new Set([p.account]),
          numbers: [p.units.number],
          largestExact: p.units.number,
        });
      }
    }

    const buckets = Array.from(byCurrency.entries());
    if (buckets.length > 0) {
      let picked = buckets[0];
      if (buckets.length > 1) {
        const isTrade = postings.some((p) => p.cost?.currency);
        const operating = buckets.find(([c]) => c === operatingCurrency);
        // An exchange between your own accounts may carry a fee or a rounding
        // line (Expenses or Income). Only that line left, so it is the amount;
        // the cash that moved from one account to the other is neutral
        // (w21/570).
        const feeLines = postings.filter((p) => isFeeLine(p.account, roots));
        // The exchange is priced (`@ 1.09 USD`) on the money that moved, and
        // that money outweighs the fee: a priced hotel bill, or miles earned
        // at `@ 0.01 USD` beside a $100 purchase, are spending, and read as an
        // unsigned transfer or "−$95.00" when any price counted (w21/819).
        const weight = (p: JournalPosting) =>
          parseFloat(p.units.number) *
          (p.price ? parseFloat(p.price.number) : 1);
        const pricedMoney = postings.filter(
          (p) => p.price && isBalanceSheet(p.account, roots),
        );
        const movedWeight = pricedMoney.reduce(
          (sum, p) => sum + Math.abs(weight(p)),
          0,
        );
        const feeWeight = Math.abs(
          feeLines.reduce((sum, p) => sum + weight(p), 0),
        );
        const exchangeWithFee =
          !isTrade &&
          feeLines.length > 0 &&
          pricedMoney.length > 0 &&
          movedWeight > feeWeight &&
          postings.every(
            (p) =>
              isBalanceSheet(p.account, roots) || isFeeLine(p.account, roots),
          );
        if (exchangeWithFee) {
          const fee = feeAmount(feeLines, operatingCurrency);
          if (fee) return fee;
        }
        // Through Equity conversion legs rather than `@` (w21/818).
        const equityExchange =
          !isTrade &&
          !postings.some((p) => p.price) &&
          isEquityConversion(
            postings.map((p) => ({
              account: p.account,
              amount: parseFloat(p.units.number),
              currency: p.units.currency,
            })),
            roots,
          );
        if (
          !isTrade &&
          (exchangeWithFee ||
            equityExchange ||
            postings.every((p) => isBalanceSheet(p.account, roots)))
        ) {
          const [currency, bucket] =
            operating ??
            [...buckets].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))[0];
          const size =
            Math.abs(bucket.value) < 0.5 * 10 ** -bucket.scale
              ? bucket.largestLeg
              : Math.abs(bucket.value);
          return {
            text: formatAmount(
              size,
              currency,
              bucket.scale,
              heldAtCost.has(currency),
              operatingCurrency,
            ),
            value: 0,
            currency,
          };
        }
        const expenseCurrencies = new Set(
          postings
            .filter((p) => getAccountRoot(p.account, roots) === "expenses")
            .map((p) => p.units.currency),
        );
        const spent = isTrade
          ? undefined
          : (operating ?? buckets.find(([c]) => expenseCurrencies.has(c)));
        if (spent) {
          picked = spent;
        } else {
          const moneyCurrencies = new Set(
            postings.map(moneyCurrencyOf).filter(Boolean),
          );
          const money = buckets.filter(([currency]) =>
            moneyCurrencies.has(currency),
          );
          const candidates = money.length > 0 ? money : buckets;
          picked = candidates.reduce((best, bucket) =>
            Math.abs(bucket[1].value) > Math.abs(best[1].value) ? bucket : best,
          );
          if (money.length > 0 && picked[1].accounts.size > 1) {
            return { mixed: true };
          }
        }
      }
      const [currency, bucketPicked] = picked;
      const { value, scale, legs, largestLeg } = bucketPicked;
      // A transfer between two cash or liability accounts nets to zero in its
      // currency, yet the row still has to say how much moved. Its size is the
      // largest leg; a transfer has no in/out direction at the transaction
      // level, so the value stays zero and the amount renders unsigned.
      const netsToZero = Math.abs(value) < 0.5 * 10 ** -scale;
      if (netsToZero && legs > 1 && largestLeg > 0) {
        return {
          text: formatAmount(
            largestLeg,
            currency,
            scale,
            heldAtCost.has(currency),
            operatingCurrency,
            bucketPicked.largestExact.trim(),
          ),
          value: 0,
          currency,
        };
      }
      return {
        text: formatAmount(
          value,
          currency,
          scale,
          heldAtCost.has(currency),
          operatingCurrency,
          exactSum(bucketPicked.numbers),
        ),
        value,
        currency,
      };
    }
  }

  let max: JournalPosting | null = null;
  for (const p of postings) {
    const value = parseFloat(p.units.number);
    if (!Number.isFinite(value)) continue;
    if (
      max === null ||
      Math.abs(value) > Math.abs(parseFloat(max.units.number))
    )
      max = p;
  }
  if (max === null) return null;

  // With no Assets or Liabilities posting (an Income → Expenses statement, a
  // padding entry between equity accounts) nothing moved in or out, so like a
  // transfer the size is the largest leg and the value stays zero: the row
  // and the detail hero both render it unsigned and neutral (w21/003). Its
  // sign used to be whichever leg was largest, which read as money in or out.
  const currency = max.units.currency;
  return {
    text: formatAmount(
      Math.abs(parseFloat(max.units.number)),
      currency,
      amountScale(max.units.number),
      heldAtCost.has(currency),
      operatingCurrency,
      max.units.number.trim(),
    ),
    value: 0,
    currency,
  };
};

/**
 * Buckets entries into date sections, newest-page-first as the server returned
 * them.
 *
 * `searchQuery` filters client-side over the entries already loaded. The
 * transactions list leaves it empty — it searches server-side through
 * `JournalQueryInput.filter`, so paging is not capped at what is in memory. The
 * journal screen still passes one.
 */
export const groupToSections = (
  entries: JournalDirectiveType[],
  searchQuery = "",
  locale = "en",
): JournalSection[] => {
  const q = searchQuery.toLowerCase().trim();
  const filtered = q
    ? entries.filter((entry) => {
        if (isJournalTransaction(entry)) {
          return (
            entry.payee?.toLowerCase().includes(q) ||
            entry.narration?.toLowerCase().includes(q) ||
            entry.postings.some((p) => p.account.toLowerCase().includes(q))
          );
        }
        return entry.directive_type.toLowerCase().includes(q);
      })
    : entries;

  const groups = new Map<string, JournalDirectiveType[]>();
  for (const entry of filtered) {
    const isoDate = entry.date.slice(0, 10);
    if (!groups.has(isoDate)) groups.set(isoDate, []);
    groups.get(isoDate)!.push(entry);
  }

  return Array.from(groups.entries()).map(([isoDate, items]) => ({
    isoDate,
    displayDate: formatLedgerDate(isoDate, locale),
    data: items,
  }));
};
