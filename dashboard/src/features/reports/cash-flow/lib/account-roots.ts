import type { CashFlowRoot } from "../config";

/**
 * A ledger's own names for the five Beancount roots
 * (`option "name_income" "Revenus"`) mapped to their types. Without it every
 * root is read by its English name.
 */
export type AccountRoots = ReadonlyMap<string, CashFlowRoot>;

/** The `name_*` options as the ledger read returns them. */
type RootOptions = {
  nameAssets?: string | null;
  nameLiabilities?: string | null;
  nameEquity?: string | null;
  nameIncome?: string | null;
  nameExpenses?: string | null;
};

const DEFAULT_NAMES: Record<CashFlowRoot, string> = {
  Assets: "Assets",
  Liabilities: "Liabilities",
  Equity: "Equity",
  Income: "Income",
  Expenses: "Expenses",
};

function rootNames(options?: RootOptions | null): Record<CashFlowRoot, string> {
  return {
    Assets: options?.nameAssets || DEFAULT_NAMES.Assets,
    Liabilities: options?.nameLiabilities || DEFAULT_NAMES.Liabilities,
    Equity: options?.nameEquity || DEFAULT_NAMES.Equity,
    Income: options?.nameIncome || DEFAULT_NAMES.Income,
    Expenses: options?.nameExpenses || DEFAULT_NAMES.Expenses,
  };
}

/** The ledger's root names as a name → type map. */
export function ledgerAccountRoots(options?: RootOptions | null): AccountRoots {
  return new Map(
    Object.entries(rootNames(options)).map(([type, name]) => [
      name,
      type as CashFlowRoot,
    ]),
  );
}

/**
 * The five interval reads' `accountName`s: the producer reads each as a
 * prefix, so English literals returned nothing for renamed roots (w4/1022).
 */
export function cashFlowRootVariables(options?: RootOptions | null) {
  const names = rootNames(options);
  return {
    incomeRoot: names.Income,
    expensesRoot: names.Expenses,
    assetsRoot: names.Assets,
    liabilitiesRoot: names.Liabilities,
    equityRoot: names.Equity,
  };
}

/**
 * An account under a renamed root, read under its type's English name
 * (`Revenus:Salary` as `Income:Salary`), so the root tables and the cash
 * heuristics apply to it (w4/1020, w4/1022). Other accounts are unchanged.
 */
export function accountAsRootType(
  accountName: string,
  roots?: AccountRoots,
): string {
  if (!roots) return accountName;
  const separator = accountName.indexOf(":");
  const head = separator === -1 ? accountName : accountName.slice(0, separator);
  const type = roots.get(head);
  return type ? type + accountName.slice(head.length) : accountName;
}
