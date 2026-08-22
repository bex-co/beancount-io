import { buildAccountRecommendationUserPrompt } from "../../src/features/llm/utils/recommend-accounts/prompts";

/**
 * promptfoo prompt function — display-only. Renders the real prompt template so
 * the CLI/web viewer shows exactly what's sent to the model; the eval provider
 * (evals/providers/llm-workflow-provider.ts) calls recommendAccounts()
 * directly and ignores this return value.
 */
export default function renderPrompt(context: {
  vars: {
    params: {
      transaction: {
        date: string;
        payee: string;
        description: string;
        amount: number;
      };
      accounts: string[];
    };
  };
}): string {
  const { transaction, accounts } = context.vars.params;
  return buildAccountRecommendationUserPrompt(
    transaction.date,
    transaction.payee,
    transaction.description,
    transaction.amount,
    accounts,
  );
}
