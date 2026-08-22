import Handlebars from "handlebars";
import {
  type TransactionToCategorize,
  type RecentTransactionExample,
} from "../../types";

export const CATEGORIZATION_SYSTEM_PROMPT =
  "You are a financial transaction categorization assistant for a Beancount accounting system. You provide accurate, consistent categorizations based on transaction details and user account structure.";

const CATEGORIZATION_TEMPLATE = `You are categorizing financial transactions for a Beancount double-entry accounting system.

**User's Existing Accounts:**
{{{existingAccounts}}}
{{#if recentExamples}}

**Recent Transaction Examples from User's Ledger:**
{{{recentExamples}}}
{{/if}}

**Transactions to Categorize:**
{{{transactions}}}

**Instructions:**
1. CRITICAL: Set each suggestion's \`rowIndex\` to the EXACT rowIndex given for that transaction below. Never renumber, reindex, or reorder — rowIndex is an opaque identifier, not a position.
2. For each transaction, suggest the BEST target account
3. Prefer EXISTING accounts from the user's list when appropriate
{{{accountConstraint}}}
6. Provide confidence score (0.0 to 1.0):
   - 0.9-1.0: Very confident (exact match or common merchant)
   - 0.7-0.9: Confident (good pattern match)
   - 0.5-0.7: Moderate (reasonable guess)
   - 0.0-0.5: Low (ambiguous transaction)
7. Provide brief reasoning (1 sentence)`;

const template = Handlebars.compile(CATEGORIZATION_TEMPLATE);

export function buildCategorizationPrompt({
  transactions,
  existingAccounts,
  recentExamples = [],
  autoAccounts = false,
}: {
  transactions: TransactionToCategorize[];
  existingAccounts: string[];
  recentExamples?: RecentTransactionExample[];
  autoAccounts?: boolean;
}): string {
  const existingAccountsText =
    existingAccounts.length > 0
      ? existingAccounts.join("\n")
      : "No existing accounts yet";

  const recentExamplesText =
    recentExamples.length > 0
      ? recentExamples
          .slice(0, 20)
          .map(
            (e) =>
              `- Payee: "${e.payee}" | Description: "${e.narration}" → Account: ${e.account}`,
          )
          .join("\n")
      : "";

  const transactionsText = transactions
    .map(
      (t) =>
        `Row ${t.rowIndex}: Date: ${t.date} | Payee: "${t.payee}" | Description: "${t.description}" | Amount: ${t.amount}`,
    )
    .join("\n");

  const accountConstraint = autoAccounts
    ? `4. If no existing account fits, suggest a NEW account following Beancount conventions:
   - Expenses:Category:Subcategory (for spending)
   - Income:Category (for income)
   - Assets:Category (for asset purchases)
5. Common expense categories: Food, Transport, Shopping, Entertainment, Utilities, Healthcare, etc.`
    : `4. CRITICAL: You MUST ONLY suggest accounts from the existing accounts list above. Do NOT create new accounts.
5. If you cannot find a suitable existing account, skip the transaction (do not include it in suggestions).`;

  return template({
    existingAccounts: existingAccountsText,
    recentExamples: recentExamplesText,
    transactions: transactionsText,
    accountConstraint,
  });
}
