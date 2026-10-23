import type { LedgerSetupPreset } from "@/generated-graphql/types";
import { toAsciiNumerals } from "../../common/ascii-numerals";
import { currencyMinorUnits } from "../../common/currency-util";
import { utcDate } from "../../common/calendar-date";
import { getFormatDate } from "../../common/format-util";
import { parseExactAmount } from "../multi-postings-transaction/postings-utils";
import setupCurrencies from "./setup-currencies.json";

/**
 * The mobile copy of the setup catalog (ADR021): preset identities and
 * account names. The canonical catalog lives in backend-v2; the ledger's
 * accounting is always built server-side from the specification this
 * screen sends, never from this list.
 */
export interface SetupPreset {
  id: LedgerSetupPreset;
  titleKey: string;
  outcomeKey: string;
  accounts: { name: string; money: boolean }[];
}

const money = (name: string) => ({ name, money: true });
const category = (name: string) => ({ name, money: false });

export const SETUP_PRESETS: SetupPreset[] = [
  {
    id: "PERSONAL" as LedgerSetupPreset,
    titleKey: "createLedgerPresetPersonal",
    outcomeKey: "createLedgerPresetPersonalOutcome",
    accounts: [
      money("Assets:Cash"),
      money("Assets:Bank"),
      money("Liabilities:CreditCard"),
      money("Liabilities:Loan"),
      category("Income:General"),
      category("Expenses:Food"),
      category("Expenses:Housing"),
      category("Expenses:Transport"),
      category("Expenses:Utilities"),
      category("Expenses:Health"),
      category("Expenses:Other"),
      category("Equity:OpeningBalances"),
    ],
  },
  {
    id: "FREELANCE" as LedgerSetupPreset,
    titleKey: "createLedgerPresetFreelance",
    outcomeKey: "createLedgerPresetFreelanceOutcome",
    accounts: [
      money("Assets:Bank"),
      money("Assets:Cash"),
      money("Liabilities:CreditCard"),
      category("Income:Services"),
      category("Expenses:Software"),
      category("Expenses:Supplies"),
      category("Expenses:Travel"),
      category("Expenses:Fees"),
      category("Equity:OwnerContributions"),
      category("Equity:OwnerDrawings"),
    ],
  },
  {
    id: "BUSINESS" as LedgerSetupPreset,
    titleKey: "createLedgerPresetBusiness",
    outcomeKey: "createLedgerPresetBusinessOutcome",
    accounts: [
      money("Assets:Bank"),
      money("Assets:Cash"),
      category("Income:Sales"),
      category("Income:Services"),
      category("Expenses:Operating"),
      category("Equity:Capital"),
      category("Equity:RetainedEarnings"),
      category("Equity:OpeningBalances"),
    ],
  },
  {
    id: "PORTFOLIO" as LedgerSetupPreset,
    titleKey: "createLedgerPresetPortfolio",
    outcomeKey: "createLedgerPresetPortfolioOutcome",
    accounts: [
      money("Assets:BrokerCash"),
      money("Assets:Holdings"),
      category("Income:Dividends"),
      category("Income:Interest"),
      category("Expenses:Fees"),
      category("Equity:OpeningBalances"),
    ],
  },
  {
    id: "RENTAL" as LedgerSetupPreset,
    titleKey: "createLedgerPresetRental",
    outcomeKey: "createLedgerPresetRentalOutcome",
    accounts: [
      money("Assets:Bank"),
      money("Assets:Cash"),
      category("Income:Rent"),
      category("Expenses:Repairs"),
      category("Expenses:Insurance"),
      category("Expenses:Management"),
      category("Expenses:PropertyOther"),
      money("Liabilities:Deposits"),
      category("Equity:OpeningBalances"),
    ],
  },
  {
    id: "SHARED_EXPENSES" as LedgerSetupPreset,
    titleKey: "createLedgerPresetShared",
    outcomeKey: "createLedgerPresetSharedOutcome",
    accounts: [
      money("Assets:MemberReceivables"),
      money("Liabilities:MemberPayables"),
      category("Expenses:Shared"),
      category("Equity:OpeningBalances"),
    ],
  },
  {
    id: "COMMUNITY" as LedgerSetupPreset,
    titleKey: "createLedgerPresetCommunity",
    outcomeKey: "createLedgerPresetCommunityOutcome",
    accounts: [
      money("Assets:Cash"),
      money("Assets:Bank"),
      category("Income:Dues"),
      category("Income:Contributions"),
      category("Income:Events"),
      category("Expenses:Projects"),
      category("Expenses:Events"),
      category("Expenses:Administration"),
      category("Equity:OpeningBalances"),
    ],
  },
  {
    id: "BLANK" as LedgerSetupPreset,
    titleKey: "createLedgerPresetBlank",
    outcomeKey: "createLedgerPresetBlankOutcome",
    accounts: [],
  },
];

/**
 * Region → currency, copied byte for byte from the canonical setup catalog
 * (`backend-cluster/backend-v2/src/features/ledger/setup/currencies.json`,
 * ADR021) that the hosted builder and `bea init` share. A hand-rolled list
 * offered Bulgaria, Ukraine and Romania USD (w21/061); a drift test keeps the
 * copy equal to the catalog.
 */
const REGION_CURRENCY: Readonly<Record<string, string>> =
  setupCurrencies.regionCurrency;

/**
 * Suggest a currency from the device's region only (ADR021): the region
 * the OS reports for the locale, never its language. Falls back to USD.
 */
export function suggestCurrency(regionCode: string | null | undefined): string {
  const region = regionCode?.toUpperCase();
  if (!region || !/^[A-Z]{2}$/.test(region)) return "USD";
  return REGION_CURRENCY[region] ?? "USD";
}

/**
 * The day "Books begin" starts on: the device's own date. It used the UTC
 * date, so from 17:00 PDT the ledger began tomorrow, every preset account
 * opened tomorrow, and the first entry dated today — the app's default — was
 * refused as posting to an account not yet open (w21/051).
 */
export function defaultHistoryStart(now: Date = new Date()): string {
  return getFormatDate(now);
}

/**
 * The opening balance as the setup sends it, or null when it is not an
 * amount; "" for an empty field. A decimal comma is accepted, as in New
 * Transaction: the decimal pad offers only "," in most of the app's locales,
 * so `1234,56` used to read as an invalid amount (w21/051). In a currency with
 * no minor unit, `150,000` is thousands, not 150.000 (w21/697).
 */
export function openingAmountValue(
  input: string,
  currency = "",
): string | null {
  return input.trim()
    ? parseExactAmount(input, currencyMinorUnits(currency.trim().toUpperCase()))
    : "";
}

/**
 * Whether a resumed draft still owes its opening amount: the draft keeps the
 * account but not the amount, and an empty field would pass Next and send no
 * opening line at all (w21/500).
 */
export function openingAmountOwed(
  amountLost: boolean,
  openingAccount: string,
  amount: string,
): boolean {
  return amountLost && openingAccount !== "" && !amount.trim();
}

/**
 * The opening line a setup writes: only for an account the chosen preset
 * offers, and only with an amount. A typed amount under "Decide later" was
 * dropped without a word, and an account picked under another preset was
 * still sent: refused for Portfolio, written into a Blank ledger (w21/106).
 */
export function openingSelection(
  presetAccounts: readonly { name: string; money?: boolean }[],
  openingAccount: string,
  amount: string,
): { name: string; amount: string } | null {
  const offered = presetAccounts.some(
    (account) => account.money && account.name === openingAccount,
  );
  return offered && amount ? { name: openingAccount, amount } : null;
}

/**
 * Whether `code` is a currency the server accepts for a new ledger: the same
 * catalog it validates against, so a typo like `US` is refused on the form
 * instead of on Review in the server's words (w21/107).
 */
export function isSetupCurrency(code: string): boolean {
  return setupCurrencies.supportedCurrencies.includes(
    code.trim().toUpperCase(),
  );
}

/**
 * The currency and start date as the server receives them: trimmed. The form's
 * checks accept " USD" and "2026-10-21 ", but the server's validator refuses
 * them, so the error showed only after Create, in raw English (w21/330).
 */
export function setupFields(
  values: {
    currency: string;
    historyStart: string;
  },
  now: Date = new Date(),
): {
  operatingCurrency: string;
  historyStart: string;
} {
  return {
    operatingCurrency: (values.currency.trim() || "USD").toUpperCase(),
    // A cleared field is today on this phone, sent as a date: the server's own
    // fallback is the UTC day, tomorrow in the evening across the Americas
    // (w21/436).
    historyStart:
      toAsciiNumerals(values.historyStart).trim() || defaultHistoryStart(now),
  };
}

/**
 * Whether "Books begin" holds a real `YYYY-MM-DD` day, or nothing (today). A
 * `2026-04-31` rolls over to 1 May in `Date.parse`, so it reached the ledger
 * (w21/107).
 */
export function isHistoryStart(value: string): boolean {
  const trimmed = toAsciiNumerals(value).trim();
  if (!trimmed) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const [year, month, day] = trimmed.split("-").map(Number);
  // `utcDate`, not `Date.UTC`: a year of 0-99 would read as 1900-1999 (w21/043).
  const date = utcDate(year, month - 1, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
