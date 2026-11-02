import catalogJson from "./catalog.json";
import currenciesJson from "./currencies.json";
import fixturesJson from "./fixtures.json";

export type CapabilityState = "enabled" | "declined" | "deferred";
export type OpeningState = "unknown" | "zero" | "known";
export type ModuleId =
  | "investments@1"
  | "rental-property@1"
  | "side-business@1";
export type PresetId =
  | "personal@1"
  | "freelance@1"
  | "business@1"
  | "portfolio@1"
  | "rental@1"
  | "shared-expenses@1"
  | "community@1"
  | "blank@1";

interface SetupCatalogAccount {
  name: string;
  kind: string;
  required: boolean;
  /** Booking method written into the account's `open` line. */
  booking?: string;
}

interface SetupCatalogQuestion {
  id: string;
  prompt: string;
  effect: string;
  enablesAccounts: string[];
}

export interface SetupPreset {
  id: string;
  version: number;
  title: string;
  outcome: string;
  accounts: SetupCatalogAccount[];
  optionalQuestions: SetupCatalogQuestion[];
  categoryMeanings: Record<string, string>;
  evidenceRequirements: string[];
  firstResult: string;
  teachingExamples: string[];
  acceptanceScenario: {
    given: string;
    action: string;
    expected: Record<string, string>;
  };
}

interface SetupModuleParameter {
  id: string;
  /** The account-name segment this parameter replaces, e.g. `<Name>`. */
  placeholder: string;
  default: string;
  pattern: string;
  description: string;
}

/** A personal-only account group (PRFAQ001 Appendix A.9, ADR021). */
export interface SetupModule {
  id: string;
  version: number;
  title: string;
  outcome: string;
  allowedPresets: string[];
  parameters: SetupModuleParameter[];
  accounts: SetupCatalogAccount[];
  categoryMeanings: Record<string, string>;
  evidenceRequirements: string[];
  firstUse: string;
  teachingExamples: string[];
  acceptanceScenario: SetupPreset["acceptanceScenario"];
}

export interface SetupCatalog {
  catalogVersion: number;
  source: string;
  metadataKeys: Record<string, string>;
  capabilityStates: CapabilityState[];
  openingStates: OpeningState[];
  presets: SetupPreset[];
  modules: SetupModule[];
}

export interface SetupCurrencies {
  source: Record<string, string>;
  supportedCurrencies: string[];
  regionCurrency: Record<string, string>;
}

export const setupCatalog = catalogJson as unknown as SetupCatalog;
export const setupCurrencies = currenciesJson as unknown as SetupCurrencies;
export const setupFixtures = fixturesJson.fixtures;

export const presetById = (id: string): SetupPreset | undefined =>
  setupCatalog.presets.find((preset) => preset.id === id);

export const moduleById = (id: string): SetupModule | undefined =>
  setupCatalog.modules.find((module) => module.id === id);
