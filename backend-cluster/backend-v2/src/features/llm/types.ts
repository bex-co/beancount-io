export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type ParsedTransaction = {
  date: string;
  payee: string;
  description: string;
  amount: number;
};

export type ExtractTransactionsResult = {
  transactions: ParsedTransaction[];
  tokenUsage: TokenUsage;
};

export type AccountRecommendation = {
  sourceAccount: string | null;
  targetAccount: string | null;
  confidence: number;
  reasoning: string;
};

export interface RecentTransactionExample {
  payee: string;
  narration: string;
  account: string;
}

export interface TransactionToCategorize {
  rowIndex: number;
  date: string;
  payee: string;
  description: string;
  amount: number;
}

export interface BankAccountToMap {
  accountId: string;
  accountName: string;
  accountType: string;
  accountSubtype?: string;
  mask?: string;
}

export interface BankAccountMappingSuggestion {
  accountId: string;
  suggestedAccount: string;
  confidence: number;
  reasoning: string;
}
