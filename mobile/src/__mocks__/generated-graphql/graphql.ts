// Mock for generated GraphQL types and hooks
// Re-export types from generated code
export type {
  HomeChartsQuery,
  AccountHierarchyQuery,
  LedgerMetaQuery,
} from "../../generated-graphql/graphql";

// LedgerMeta type for legacy compatibility
export type LedgerMeta = {
  accounts: string[];
  currencies: string[];
  errors: number;
  options: {
    name_assets: string;
    name_expenses: string;
    name_income: string;
    name_liabilities: string;
    name_equity: string;
    operating_currency: string[];
  };
};

// Mock implementations for hooks
export const useLedgerMetaQuery = () => ({});
export const useHomeChartsQuery = () => ({});
export const useAccountHierarchyQuery = () => ({});
export const useAddEntriesMutation = () => [() => {}, {}];
export const useUserProfileQuery = () => ({});
