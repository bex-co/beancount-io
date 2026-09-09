import type { JobFactory } from "../types";
import { probeLlm } from "@/features/llm/utils/llm-probe";

/**
 * Scheduled Path B liveness probe (ADR 0011 D6, w2/m30/t005). Complements the
 * fire-and-forget startup probe so a credential that dies mid-lifetime
 * (revoked key, provider outage) is caught within the interval rather than by
 * the next user to scan a receipt. `probeLlm` logs the outcome and never
 * throws.
 */
export const createLlmProbeJob: JobFactory = () => {
  return {
    schedule: "17 * * * *", // hourly, off the top of the hour
    task: async () => {
      await probeLlm();
    },
  };
};
