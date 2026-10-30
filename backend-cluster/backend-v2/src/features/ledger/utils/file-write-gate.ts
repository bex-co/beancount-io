import { NewLedgerErrorsError } from "@/shared/errors";
import {
  LOAD_ERROR_CODE,
  LOAD_PARSE_SUMMARY_PATTERN,
  PARSE_ERROR_CODE,
  type WriteValidation,
} from "./bean-check-errors";

/**
 * The file-write twin of the entry gate (w23/m15): a file commit that would
 * add bean-check errors the ledger did not have is refused with
 * VALIDATION_FAILED naming each, unless the caller says `allow_invalid`
 * (`allowInvalid` on REST). Errors the ledger already had never block, so a
 * write that fixes or merely keeps them passes. The verdict is always
 * computed — the override suppresses only the refusal — and is returned so
 * the commit can report it.
 */
export function assertFileWriteValid(
  validation: WriteValidation,
  allowInvalid: boolean,
): WriteValidation {
  const { newErrors } = validation;
  if (allowInvalid || newErrors.length === 0) return validation;
  const detail = newErrors
    .map((error) =>
      error.source ? `${error.message} (${error.source})` : error.message,
    )
    .join("; ");
  const hasParseError = newErrors.some((error) =>
    error.code !== undefined
      ? error.code === PARSE_ERROR_CODE ||
        (error.code === LOAD_ERROR_CODE &&
          LOAD_PARSE_SUMMARY_PATTERN.test(error.message))
      : /parse error/i.test(error.message),
  );
  throw new NewLedgerErrorsError("files", newErrors.length, detail, {
    hasParseError,
  });
}
