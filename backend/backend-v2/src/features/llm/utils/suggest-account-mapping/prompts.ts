import Handlebars from "handlebars";
import { type BankAccountToMap } from "../../types";

export const ACCOUNT_MAPPING_SYSTEM_PROMPT =
  "You are an assistant that maps a user's bank accounts to Beancount ledger accounts for a double-entry accounting system.";

const ACCOUNT_MAPPING_TEMPLATE = `You are mapping bank accounts from "{{institutionName}}" to Beancount ledger accounts.

**User's Existing Open Accounts:**
{{{existingAccounts}}}

**Bank Accounts to Map:**
{{{accounts}}}

**Instructions:**
1. For each bank account, suggest exactly ONE Beancount account.
{{{accountConstraint}}}
4. CRITICAL: Every bank account listed is a DIFFERENT account, even when they share the same institution and type (e.g. multiple currency sub-accounts at one bank). Give each accountId a DISTINCT suggestedAccount — never reuse the same suggestion for two different accountIds in this request.
5. Keep account names Beancount-safe: Title-case words, no spaces or special characters, colon-separated hierarchy.
6. Provide a confidence score (0.0 to 1.0):
   - 0.9-1.0: Very confident (e.g. currency/subtype clearly identifies the account)
   - 0.7-0.9: Confident (good match on name/type)
   - 0.5-0.7: Moderate (reasonable guess)
   - 0.0-0.5: Low (ambiguous)
7. Provide brief reasoning (1 sentence).`;

const template = Handlebars.compile(ACCOUNT_MAPPING_TEMPLATE);

export function buildAccountMappingPrompt({
  institutionName,
  accounts,
  existingAccounts,
  autoAccounts = false,
}: {
  institutionName: string;
  accounts: BankAccountToMap[];
  existingAccounts: string[];
  autoAccounts?: boolean;
}): string {
  const existingAccountsText =
    existingAccounts.length > 0
      ? existingAccounts.join("\n")
      : "No existing accounts yet";

  const accountsText = accounts
    .map(
      (a) =>
        `- accountId: ${a.accountId} | Name: "${a.accountName}" | Type: ${a.accountType}${a.accountSubtype ? ` | Subtype: ${a.accountSubtype}` : ""}${a.mask ? ` | Mask: ****${a.mask}` : ""}`,
    )
    .join("\n");

  const accountConstraint = autoAccounts
    ? `2. Prefer an EXISTING account from the list above only if there is strong evidence it represents the same real-world account. Otherwise, suggest a NEW account.
3. If no existing account fits, suggest a NEW account following Beancount conventions:
   - Assets:${institutionName}:{name-or-currency} for depository/investment accounts
   - Liabilities:${institutionName}:{name-or-currency} for credit/loan accounts`
    : `2. CRITICAL: You MUST ONLY suggest an account from the existing accounts list above. Do NOT create a new account.
3. If no existing account is a strong match, choose the closest/best-fit existing account instead and lower the confidence score accordingly — every bank account must receive a suggestion from the existing accounts list.`;

  return template({
    institutionName,
    existingAccounts: existingAccountsText,
    accounts: accountsText,
    accountConstraint,
  });
}
