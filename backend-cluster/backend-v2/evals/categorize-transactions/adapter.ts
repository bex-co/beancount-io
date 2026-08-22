import { buildCategorizationPrompt } from "../../src/features/llm/utils/categorize-transactions/prompts";

/**
 * promptfoo prompt function — display-only. Renders the real prompt template so
 * the CLI/web viewer shows exactly what's sent to the model; the eval provider
 * (evals/providers/llm-workflow-provider.ts) calls categorizeTransactions()
 * directly and ignores this return value.
 */
export default function renderPrompt(context: {
  vars: { params: Record<string, unknown> };
}): string {
  return buildCategorizationPrompt(
    context.vars.params as Parameters<typeof buildCategorizationPrompt>[0],
  );
}
