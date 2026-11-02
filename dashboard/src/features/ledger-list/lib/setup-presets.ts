import { LedgerSetupPreset } from "@/graphql/definitions";

/**
 * The dashboard's copy of the setup catalog (ADR021): preset identities,
 * outcomes, and account names. The canonical catalog lives in backend-v2;
 * `setup-presets.test.ts` pins this copy to the same ids and accounts the
 * API accepts, and a preset's accounting is always built server-side from
 * the specification this form sends — never from this list.
 */
export interface SetupPreset {
  id: LedgerSetupPreset;
  /** Translation keys for the preset's name and outcome (locale catalogs). */
  titleKey: PresetTranslationKey;
  outcomeKey: PresetTranslationKey;
  /** Accounts the preset opens; asset/liability ones can take an opening balance. */
  accounts: { name: string; money: boolean }[];
}

export type PresetTranslationKey =
  | "page.dashboard.presetPersonal"
  | "page.dashboard.presetPersonalOutcome"
  | "page.dashboard.presetFreelance"
  | "page.dashboard.presetFreelanceOutcome"
  | "page.dashboard.presetBusiness"
  | "page.dashboard.presetBusinessOutcome"
  | "page.dashboard.presetPortfolio"
  | "page.dashboard.presetPortfolioOutcome"
  | "page.dashboard.presetRental"
  | "page.dashboard.presetRentalOutcome"
  | "page.dashboard.presetShared"
  | "page.dashboard.presetSharedOutcome"
  | "page.dashboard.presetCommunity"
  | "page.dashboard.presetCommunityOutcome"
  | "page.dashboard.presetBlank"
  | "page.dashboard.presetBlankOutcome";

const money = (name: string) => ({ name, money: true });
const category = (name: string) => ({ name, money: false });

export const SETUP_PRESETS: SetupPreset[] = [
  {
    id: LedgerSetupPreset.Personal,
    titleKey: "page.dashboard.presetPersonal",
    outcomeKey: "page.dashboard.presetPersonalOutcome",
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
    id: LedgerSetupPreset.Freelance,
    titleKey: "page.dashboard.presetFreelance",
    outcomeKey: "page.dashboard.presetFreelanceOutcome",
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
    id: LedgerSetupPreset.Business,
    titleKey: "page.dashboard.presetBusiness",
    outcomeKey: "page.dashboard.presetBusinessOutcome",
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
    id: LedgerSetupPreset.Portfolio,
    titleKey: "page.dashboard.presetPortfolio",
    outcomeKey: "page.dashboard.presetPortfolioOutcome",
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
    id: LedgerSetupPreset.Rental,
    titleKey: "page.dashboard.presetRental",
    outcomeKey: "page.dashboard.presetRentalOutcome",
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
    id: LedgerSetupPreset.SharedExpenses,
    titleKey: "page.dashboard.presetShared",
    outcomeKey: "page.dashboard.presetSharedOutcome",
    accounts: [
      money("Assets:MemberReceivables"),
      money("Liabilities:MemberPayables"),
      category("Expenses:Shared"),
      category("Equity:OpeningBalances"),
    ],
  },
  {
    id: LedgerSetupPreset.Community,
    titleKey: "page.dashboard.presetCommunity",
    outcomeKey: "page.dashboard.presetCommunityOutcome",
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
    id: LedgerSetupPreset.Blank,
    titleKey: "page.dashboard.presetBlank",
    outcomeKey: "page.dashboard.presetBlankOutcome",
    accounts: [],
  },
];
