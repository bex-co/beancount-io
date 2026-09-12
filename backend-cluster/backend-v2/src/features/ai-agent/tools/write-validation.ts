import { logger } from "@/shared/logger";
import type { Identity } from "@/server/api/identity";
import type { ToolServices } from "./types";
import {
  toBeanCheckErrors,
  toWriteValidation,
  type BeanCheckError,
  type WriteValidation,
} from "@/features/ledger/utils/bean-check-errors";

const validationLogger = logger.child({ module: "tool:write-validation" });

type ValidationServices = Pick<ToolServices, "ledgerData">;

// Re-exported so the tools keep one import for the whole validation vocabulary
// while the shaping and diffing live beside the ledger they describe (w2/m28).
export { toBeanCheckErrors, toWriteValidation };

/**
 * Read the ledger's current bean-check errors through the same call the
 * `errors` resource uses. Fail-open: a check failure yields no errors rather
 * than turning a successful write into a failed one — the write happened, and
 * `errorsBefore`/`errorsAfter` still report what was observed.
 */
export async function readBeanCheckErrors(
  services: Partial<ValidationServices>,
  identity: Identity,
  ledgerId: string,
): Promise<BeanCheckError[]> {
  try {
    const getErrors = services.ledgerData?.getErrors;
    if (!getErrors) return [];
    const errors = await getErrors.call(services.ledgerData, {
      ledgerId,
      identity,
    });
    return toBeanCheckErrors(errors ?? []);
  } catch (error) {
    validationLogger.warn("Post-write bean-check read failed", {
      ledgerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Run a write, then report bean-check's verdict around it: the same `errors`
 * check before and after, diffed by message+source. The check is fail-open —
 * a read failure yields no errors rather than failing a write that already
 * committed.
 */
export async function withPostWriteValidation<T>(
  services: Partial<ValidationServices>,
  identity: Identity,
  ledgerId: string,
  write: () => Promise<T>,
): Promise<{ written: T; validation: WriteValidation }> {
  const before: BeanCheckError[] = await readBeanCheckErrors(
    services,
    identity,
    ledgerId,
  );
  const written = await write();
  const after: BeanCheckError[] = await readBeanCheckErrors(
    services,
    identity,
    ledgerId,
  );
  return { written, validation: toWriteValidation(before, after) };
}

/**
 * One-line verdict for the front of a write result: what was written and how
 * many new bean-check errors, if any, it introduced — plus the first new
 * error's message so the agent need not parse further to start fixing it.
 */
export function summarizeWrite(
  wrote: string,
  validation: WriteValidation,
): string {
  const count = validation.newErrors.length;
  if (count === 0) return `${wrote}. No new bean-check errors.`;
  const first = validation.newErrors[0];
  const detail = first.source
    ? `${first.message} (${first.source})`
    : first.message;
  return `${wrote}. ${count} new bean-check error${count === 1 ? "" : "s"}: ${detail}`;
}
