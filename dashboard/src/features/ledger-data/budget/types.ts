export interface BudgetValue {
  number?: string;
  currency?: string;
}

export interface BudgetEntry {
  date: string;
  entry_hash: string;
  directive_type: string;
  type: string;
  values: (string | BudgetValue)[];
}

export interface BudgetHistoryEntry {
  date: string;
  interval: string;
  amount: string;
  entry_hash: string;
}

export interface BudgetGroup {
  account: string;
  interval: string;
  currency: string;
  /** Latest (most recent) budget amount for display */
  amount: string;
  entry_hash: string;
  /** Effective date of the entry being deleted (set when deleting a specific history row) */
  date?: string;
  /** All budget entries for this account and currency, sorted by date ascending */
  budgetHistory: BudgetHistoryEntry[];
}
