import {
  buildCategorizationPrompt,
  CATEGORIZATION_SYSTEM_PROMPT,
} from "./prompts";

/** Fewer characters per token than typical English text, so the estimate errs high. */
const PROMPT_CHARS_PER_TOKEN = 3;
/** One suggestion object with its one-sentence reasoning. */
const OUTPUT_TOKENS_PER_TRANSACTION = 60;
/** The structured-output schema and the reply's framing. */
const FIXED_OVERHEAD_TOKENS = 200;

/**
 * A deliberately generous estimate of what one categorization call costs:
 * the prompt it sends plus an output allowance per transaction. The quota
 * reserves this before the model call and settles to the real usage after.
 */
export function estimateCategorizationTokens(
  params: Parameters<typeof buildCategorizationPrompt>[0],
): number {
  const promptChars =
    CATEGORIZATION_SYSTEM_PROMPT.length +
    buildCategorizationPrompt(params).length;
  return (
    Math.ceil(promptChars / PROMPT_CHARS_PER_TOKEN) +
    FIXED_OVERHEAD_TOKENS +
    params.transactions.length * OUTPUT_TOKENS_PER_TRANSACTION
  );
}
