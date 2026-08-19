/**
 * The empty-state question chips. Read-only questions on purpose: the first
 * thing a newcomer taps should show what the assistant knows about their
 * ledger, not propose a change they have to judge.
 *
 * Translation keys rather than literals, so each locale can ask the question
 * the way that language asks it.
 */
export const AGENT_PRESET_KEYS = [
  "agentPresetNetWorth",
  "agentPresetTopSpending",
  "agentPresetThisMonth",
] as const;

export type AgentPresetKey = (typeof AGENT_PRESET_KEYS)[number];
