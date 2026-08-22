import Handlebars from "handlebars";

const ACCOUNT_RECOMMENDATION_SYSTEM_TEMPLATE = `You are a Beancount double-entry accounting assistant. Your task is to recommend the correct source account and target account for a single financial transaction.

## BEANCOUNT DOUBLE-ENTRY RULES

Every transaction moves money between exactly two accounts:
- sourceAccount: where money comes FROM
- targetAccount: where money goes TO

For an EXPENSE (amount is negative):
- sourceAccount = the payment method (e.g. Assets:Cash, Assets:Checking, Liabilities:CreditCard:Visa)
- targetAccount = the expense category (e.g. Expenses:Food:Groceries, Expenses:Transport)

For INCOME (amount is positive):
- sourceAccount = the income source (e.g. Income:Salary, Income:Freelance)
- targetAccount = the receiving account (e.g. Assets:Checking, Assets:Savings)

## INSTRUCTIONS

1. Choose accounts ONLY from the provided list when possible.
2. If the list contains no suitable account for a side, omit that field entirely (do not invent accounts).
3. Set confidence to reflect certainty:
   - 0.9–1.0: clear match (well-known merchant type + obvious account)
   - 0.7–0.9: confident but not certain
   - 0.5–0.7: reasonable guess
   - 0.0–0.5: ambiguous
4. Provide a single-sentence reasoning explaining your choice.`;

const ACCOUNT_RECOMMENDATION_USER_TEMPLATE = `Recommend accounts for this transaction:

Date: {{date}}
Payee: {{payee}}
Description: {{description}}
Amount: {{amount}} ({{direction}})

Available accounts:
{{{accountList}}}

Pick sourceAccount and targetAccount from the list above. Omit either field if no suitable account exists in the list.`;

const systemTemplate = Handlebars.compile(
  ACCOUNT_RECOMMENDATION_SYSTEM_TEMPLATE,
);
const userTemplate = Handlebars.compile(ACCOUNT_RECOMMENDATION_USER_TEMPLATE);

export function buildAccountRecommendationSystemPrompt(): string {
  return systemTemplate({});
}

export function buildAccountRecommendationUserPrompt(
  date: string,
  payee: string,
  description: string,
  amount: number,
  accounts: string[],
): string {
  return userTemplate({
    date,
    payee,
    description,
    amount: String(amount),
    direction: amount < 0 ? "expense (money OUT)" : "income (money IN)",
    accountList:
      accounts.length > 0 ? accounts.join("\n") : "No accounts provided.",
  });
}
