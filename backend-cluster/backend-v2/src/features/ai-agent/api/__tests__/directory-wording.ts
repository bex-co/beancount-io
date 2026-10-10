/**
 * What the Claude and ChatGPT connector directories refuse in served text
 * (ADR 019, 2026-10-09 amendment). Written independently of `mcp-errors.ts`'s
 * own pattern, so narrowing that one cannot quietly weaken these checks.
 */

/** Plan or upsell wording: OpenAI forbids displaying plans or promoting upgrades. */
// "Subscriptions" alone is spending a ledger tracks (a streaming service),
// so only plan contexts count.
export const PLAN_WORDING =
  /upgrade|premium|pricing|\bpaid (plan|feature|tier)|\bplans?\b|subscription (plan|tier|required)/i;

/** Directions to the model: Claude rejects text that tells it how to behave. */
export const STEERING_WORDING =
  /\b(use this|use when|start with|start here|call after|prefer|follow|branch on|do not|don't|always|never call)\b/i;
