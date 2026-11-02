import { LedgerSetupModule } from "@/graphql/definitions";

/**
 * The personal-only modules of the setup catalog (PRFAQ001 Appendix A.9),
 * as the creation flow lists them. The canonical catalog lives in
 * backend-v2; a test keeps this copy's ids and accounts equal to it.
 */
export interface SetupModuleOption {
  id: LedgerSetupModule;
  catalogId: string;
  titleKey: string;
  outcomeKey: string;
  /** Account names; `<Name>` is the property name where the module has one. */
  accounts: string[];
  takesPropertyName?: boolean;
}

export const PROPERTY_PLACEHOLDER = "<Name>";
export const DEFAULT_PROPERTY_NAME = "Property1";
/** An ASCII account component: the catalog's `propertyName` pattern. */
export const PROPERTY_NAME_PATTERN = /^[A-Z0-9][A-Za-z0-9-]{0,63}$/;

export const SETUP_MODULES: SetupModuleOption[] = [
  {
    id: LedgerSetupModule.Investments,
    catalogId: "investments@1",
    titleKey: "page.dashboard.moduleInvestments",
    outcomeKey: "page.dashboard.moduleInvestmentsOutcome",
    accounts: [
      "Assets:Brokerage",
      "Income:Dividends",
      "Income:Interest",
      "Income:CapitalGains",
      "Expenses:Brokerage:Fees",
    ],
  },
  {
    id: LedgerSetupModule.RentalProperty,
    catalogId: "rental-property@1",
    titleKey: "page.dashboard.moduleRentalProperty",
    outcomeKey: "page.dashboard.moduleRentalPropertyOutcome",
    accounts: [
      "Income:Rent:<Name>",
      "Liabilities:Deposits:<Name>",
      "Expenses:Rental:<Name>:Repairs",
      "Expenses:Rental:<Name>:Insurance",
      "Expenses:Rental:<Name>:Management",
      "Expenses:Rental:<Name>:Other",
    ],
    takesPropertyName: true,
  },
  {
    id: LedgerSetupModule.SideBusiness,
    catalogId: "side-business@1",
    titleKey: "page.dashboard.moduleSideBusiness",
    outcomeKey: "page.dashboard.moduleSideBusinessOutcome",
    accounts: [
      "Assets:Business:Bank",
      "Income:Business:Services",
      "Expenses:Business:Software",
      "Expenses:Business:Supplies",
      "Expenses:Business:Travel",
      "Expenses:Business:Fees",
    ],
  },
];

/** The accounts a module opens, with the property name filled in. */
export function moduleAccounts(
  module: SetupModuleOption,
  propertyName: string,
): string[] {
  const name = propertyName.trim() || DEFAULT_PROPERTY_NAME;
  return module.accounts.map((account) =>
    account.replaceAll(PROPERTY_PLACEHOLDER, name),
  );
}
