import { NewLedgerErrorsError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import type { ILedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import {
  LOAD_ERROR_CODE,
  LOAD_PARSE_SUMMARY_PATTERN,
  PARSE_ERROR_CODE,
  toBeanCheckErrors,
  toWriteValidation,
  type BeanCheckError,
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
function assertFileWriteValid(
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

/** What the gate needs of the ledger services, REST and MCP alike. */
export interface FileWriteGateServices {
  ledgerRepo: Pick<ILedgerRepoService, "checkProjectedFiles">;
  ledgerData?: {
    getErrors?: (params: {
      ledgerId: string;
      identity: Identity;
    }) => Promise<Parameters<typeof toBeanCheckErrors>[0]>;
  };
}

/**
 * Run the gate over a file write: bean-check over the projected contents
 * (`null` projects a deletion) against the ledger's current errors. The
 * baseline read is fail-open, as in the post-write verdict — a check that
 * cannot run reads no errors, so the projection alone decides.
 */
export async function gateFileWrite(
  services: FileWriteGateServices,
  identity: Identity,
  ledgerId: string,
  overlays: { path: string; content: string | null }[],
  allowInvalid: boolean,
): Promise<WriteValidation> {
  const getErrors = services.ledgerData?.getErrors;
  let before: BeanCheckError[] = [];
  if (getErrors) {
    try {
      before = toBeanCheckErrors(
        (await getErrors.call(services.ledgerData, { ledgerId, identity })) ??
          [],
      );
    } catch {
      before = [];
    }
  }
  const projected = toBeanCheckErrors(
    await services.ledgerRepo.checkProjectedFiles({
      ledgerId,
      identity,
      overlays,
    }),
  );
  return assertFileWriteValid(
    toWriteValidation(before, projected),
    allowInvalid,
  );
}
