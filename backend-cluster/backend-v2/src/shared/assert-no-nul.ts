import { BadUserInputError } from "@/shared/errors/domain-errors";

/**
 * The git host cannot store U+0000 in its text columns and answers a 5xx for
 * one, which the gateway reports as an outage or an internal fault. A free-text
 * parameter forwarded to it is refused here instead, on every surface; the
 * byte is never stripped silently (w23/210).
 */
export function assertNoNul(value: string | null | undefined, field: string) {
  if (value?.includes("\u0000")) {
    throw new BadUserInputError(
      `${field} must not contain a NUL (U+0000) character`,
      field,
    );
  }
}
