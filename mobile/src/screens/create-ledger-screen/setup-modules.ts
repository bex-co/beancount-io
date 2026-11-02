import type {
  LedgerSetupModule,
  LedgerSetupPreset,
} from "@/generated-graphql/types";

/**
 * The personal-only modules of the setup catalog (PRFAQ001 Appendix A.9) as
 * this screen lists them. The canonical catalog lives in backend-v2; a test
 * keeps this copy's ids and accounts equal to it.
 */
export interface SetupModuleOption {
  id: LedgerSetupModule;
  catalogId: string;
  titleKey: string;
  outcomeKey: string;
  /** The purposes it may join: the catalog's `allowedPresets`. */
  allowedPresets: LedgerSetupPreset[];
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
    id: "INVESTMENTS" as LedgerSetupModule,
    catalogId: "investments@1",
    titleKey: "createLedgerModuleInvestments",
    outcomeKey: "createLedgerModuleInvestmentsOutcome",
    allowedPresets: ["PERSONAL" as LedgerSetupPreset],
    accounts: [
      "Assets:Brokerage",
      "Income:Dividends",
      "Income:Interest",
      "Income:CapitalGains",
      "Expenses:Brokerage:Fees",
    ],
  },
  {
    id: "RENTAL_PROPERTY" as LedgerSetupModule,
    catalogId: "rental-property@1",
    titleKey: "createLedgerModuleRentalProperty",
    outcomeKey: "createLedgerModuleRentalPropertyOutcome",
    allowedPresets: ["PERSONAL" as LedgerSetupPreset],
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
    id: "SIDE_BUSINESS" as LedgerSetupModule,
    catalogId: "side-business@1",
    titleKey: "createLedgerModuleSideBusiness",
    outcomeKey: "createLedgerModuleSideBusinessOutcome",
    allowedPresets: ["PERSONAL" as LedgerSetupPreset],
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
    account.split(PROPERTY_PLACEHOLDER).join(name),
  );
}

/** The modules a purpose offers; none for a purpose that takes none. */
export function modulesFor(
  presetId: string | null | undefined,
): SetupModuleOption[] {
  return SETUP_MODULES.filter((module) =>
    module.allowedPresets.some((preset) => preset === presetId),
  );
}

/**
 * The modules a setup sends: those the purpose offers, in catalog order, the
 * rental with its property name when one was given.
 */
export function setupModules(
  presetId: string | null | undefined,
  selected: readonly string[],
  propertyName: string,
): { id: LedgerSetupModule; propertyName?: string }[] | undefined {
  const chosen = modulesFor(presetId).filter((module) =>
    selected.includes(module.id),
  );
  if (!chosen.length) return undefined;
  return chosen.map((module) => ({
    id: module.id,
    ...(module.takesPropertyName && propertyName.trim()
      ? { propertyName: propertyName.trim() }
      : {}),
  }));
}
