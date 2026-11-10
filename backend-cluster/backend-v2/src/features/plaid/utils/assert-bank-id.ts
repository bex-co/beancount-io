import { assertNoNul } from "@/shared/assert-no-nul";
import { BadUserInputError } from "@/shared/errors";

/**
 * A caller-supplied bank id, refused as the caller's mistake before any
 * lookup when it can name nothing.
 *
 * A NUL byte cannot reach Postgres or the policy evaluator (w23/218). An empty
 * or blank id was dropped from the authorization locator, so it was authorized
 * as the ledger-level bank resource and then failed on whatever ran next — a
 * database error on sync, "Unauthorized access to Item" on refresh, NOT_FOUND
 * on an account mapping (w1/189).
 */
export function assertBankId(value: string, field: string): void {
  assertNoNul(value, field);
  if (value.trim() === "") {
    throw new BadUserInputError(`${field} must not be empty`, field);
  }
}

export function assertBankIds(values: readonly string[], field: string): void {
  for (const value of values) assertBankId(value, field);
}
