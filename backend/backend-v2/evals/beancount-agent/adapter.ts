import { AGENT_SYSTEM_PROMPT } from "../../src/features/ai-agent/service/agent-handler/beancount-agent";

/**
 * promptfoo prompt function — display-only. Shows the real system prompt
 * alongside the fixture's user message; the eval provider
 * (evals/providers/beancount-agent-provider.ts) constructs the real
 * BeancountAgent directly and ignores this return value.
 */
export default function renderPrompt(context: {
  vars: { params: { userMessage: string } };
}): string {
  return `${AGENT_SYSTEM_PROMPT}\n\n---\n\nUser: ${context.vars.params.userMessage}`;
}
