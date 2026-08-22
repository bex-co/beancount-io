import type { TransactionToCategorize } from "@/features/llm/types";
import type { PlaidTransaction, BeancountTransaction } from "../types";

/**
 * Maps Plaid transactions to the format expected by the categorization service
 */
export function mapToCategorizationFormat(
  transactions: PlaidTransaction[],
): TransactionToCategorize[] {
  return transactions.map((tx, index) => ({
    rowIndex: index,
    date: tx.date.toISOString().split("T")[0], // YYYY-MM-DD
    payee: tx.merchantName || tx.name,
    description: tx.name,
    amount: parseFloat(tx.amount),
  }));
}

/**
 * Builds Beancount transaction format from Plaid transaction and AI categorization
 */

export function buildBeancountTransaction(
  plaidTx: PlaidTransaction,
  sourceAccount: string,
  targetAccount: string,
  currency: string = "USD",
): BeancountTransaction {
  // Plaid amounts are positive for expenses, negative for income
  // We need to invert the sign for the expense account
  const amount = Math.abs(parseFloat(plaidTx.amount));
  const isExpense = parseFloat(plaidTx.amount) > 0;

  return {
    date: plaidTx.date.toISOString().split("T")[0],
    flag: plaidTx.isPending ? "!" : "*", // ! for pending, * for cleared
    payee: plaidTx.merchantName || undefined,
    narration: plaidTx.name,
    postings: [
      // Source account (bank account) - money going out/in
      {
        units: {
          number: isExpense ? `-${amount.toFixed(2)}` : amount.toFixed(2),
          currency,
        },
        account: sourceAccount,
      },
      // Target account (expense/income category)
      {
        units: {
          number: isExpense ? amount.toFixed(2) : `-${amount.toFixed(2)}`,
          currency,
        },
        account: targetAccount,
      },
    ],
  };
}
