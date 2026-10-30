import { logger } from "@/shared/logger";
import { DomainError } from "@/shared/errors";
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
export { toWriteValidation };

/**
 * The ledger's current bean-check errors through the same call the `errors`
 * resource uses, or why that call failed.
 */
async function tryReadBeanCheckErrors(
  services: Partial<ValidationServices>,
  identity: Identity,
  ledgerId: string,
): Promise<{ errors: BeanCheckError[] } | { failure: string }> {
  try {
    // A composition without the check service has nothing to report.
    const getErrors = services?.ledgerData?.getErrors;
    if (!getErrors) return { errors: [] };
    const errors = await getErrors.call(services.ledgerData, {
      ledgerId,
      identity,
    });
    return { errors: toBeanCheckErrors(errors ?? []) };
  } catch (error) {
    validationLogger.warn("Post-write bean-check read failed", {
      ledgerId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Domain messages are written for callers; anything else is internal.
    return {
      failure:
        error instanceof DomainError
          ? error.message
          : "the ledger check failed",
    };
  }
}

/**
 * Read the ledger's current bean-check errors. Fail-open: a check failure
 * yields no errors, for callers that only want a baseline.
 */
export async function readBeanCheckErrors(
  services: Partial<ValidationServices>,
  identity: Identity,
  ledgerId: string,
): Promise<BeanCheckError[]> {
  const read = await tryReadBeanCheckErrors(services, identity, ledgerId);
  return "errors" in read ? read.errors : [];
}

/**
 * Run a write, then report bean-check's verdict around it: the same `errors`
 * check before and after, diffed by message+source. A failed check never fails
 * a write that already committed, but it is reported as `checked: false`
 * rather than as a clean ledger: deleting the entry point used to read "No
 * new bean-check errors" because the check after it could not load (w23/031).
 */
export async function withPostWriteValidation<T>(
  services: Partial<ValidationServices>,
  identity: Identity,
  ledgerId: string,
  write: () => Promise<T>,
): Promise<{ written: T; validation: WriteValidation }> {
  const before = await tryReadBeanCheckErrors(services, identity, ledgerId);
  const written = await write();
  const after = await tryReadBeanCheckErrors(services, identity, ledgerId);
  const validation = toWriteValidation(
    "errors" in before ? before.errors : [],
    "errors" in after ? after.errors : [],
  );
  const failure =
    "failure" in after
      ? after.failure
      : "failure" in before
        ? before.failure
        : undefined;
  return {
    written,
    validation:
      failure === undefined
        ? validation
        : { ...validation, checked: false, checkError: failure },
  };
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
  if (validation.checked === false)
    return `${wrote}. bean-check could not run, so the ledger is unverified: ${validation.checkError}`;
  const count = validation.newErrors.length;
  if (count === 0) return `${wrote}. No new bean-check errors.`;
  const first = validation.newErrors[0];
  const detail = first.source
    ? `${first.message} (${first.source})`
    : first.message;
  return `${wrote}. ${count} new bean-check error${count === 1 ? "" : "s"}: ${detail}`;
}
