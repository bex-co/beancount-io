import { buildAccountMappingPrompt } from "../../src/features/llm/utils/suggest-account-mapping/prompts";

/**
 * promptfoo prompt function — display-only. Renders the real prompt template so
 * the CLI/web viewer shows exactly what's sent to the model; the eval provider
 * (evals/providers/llm-workflow-provider.ts) calls suggestAccountMapping()
 * directly and ignores this return value.
 */
export default function renderPrompt(context: {
  vars: { params: Record<string, unknown> };
}): string {
  return buildAccountMappingPrompt(
    context.vars.params as Parameters<typeof buildAccountMappingPrompt>[0],
  );
}
