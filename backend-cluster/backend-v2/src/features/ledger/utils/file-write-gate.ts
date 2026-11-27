import { NewLedgerErrorsError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import type { ILedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import {
  atCurrentLines,
  atLinesBeforeEdits,
  checkFailureMessage,
  hasParseError,
  toBeanCheckErrors,
  toWriteValidation,
  type AccountRenaming,
  type BeanCheckError,
  type DroppedLines,
  type FileRenames,
  type LineEdits,
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
  { newErrors }: WriteValidation,
  allowInvalid: boolean,
): void {
  if (allowInvalid || newErrors.length === 0) return;
  const detail = newErrors
    .map((error) =>
      error.source ? `${error.message} (${error.source})` : error.message,
    )
    .join("; ");
  throw new NewLedgerErrorsError("files", newErrors.length, detail, {
    hasParseError: hasParseError(newErrors),
  });
}

/** A file as a write would leave it; `null` content projects a deletion. */
export type FileOverlay = { path: string; content: string | null };

/**
 * The files a set of ledger-service operations would leave: base64 contents
 * decoded to text, a delete as `null`.
 */
export function overlaysOf(
  operations: readonly {
    operation: string;
    path: string;
    content?: string | null;
  }[],
): FileOverlay[] {
  return operations.map((operation) => ({
    path: operation.path,
    content:
      operation.operation === "delete"
        ? null
        : Buffer.from(operation.content ?? "", "base64").toString("utf-8"),
  }));
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
 * (`null` projects a deletion) against the ledger's current errors. A baseline
 * that cannot be read cannot tell an error the write adds from one the ledger
 * already had, so the verdict says it was not checked and why, as the
 * post-write verdict does (w23/031), and nothing is refused on it (w23/233).
 *
 * Given the account the write renames (`account`), an error the ledger had
 * that names it matches its copy under the new name, in the preview and the
 * commit alike (w31/114).
 *
 * Given the lines the write drops (`droppedLines`) or replaces (`edits`, for
 * the files it edits rather than writes whole), a refusal or a `dryRun` names
 * each new error at its line in the file as it stands, since neither commits
 * (w31/102, w31/118). A commit's verdict keeps the line after the write, where
 * the error then lives, as its post-write read reports it.
 */
export async function gateFileWrite(
  services: FileWriteGateServices,
  identity: Identity,
  ledgerId: string,
  overlays: FileOverlay[],
  allowInvalid: boolean,
  {
    renames,
    account,
    droppedLines,
    edits,
    dryRun = false,
  }: {
    renames?: FileRenames;
    account?: AccountRenaming;
    droppedLines?: DroppedLines;
    edits?: LineEdits;
    dryRun?: boolean;
  } = {},
): Promise<WriteValidation> {
  const getErrors = services.ledgerData?.getErrors;
  const readBaseline = async (): Promise<
    { errors: BeanCheckError[] } | { failure: string }
  > => {
    // A composition without the check service has nothing to report.
    if (!getErrors) return { errors: [] };
    try {
      return {
        errors: toBeanCheckErrors(
          (await getErrors.call(services.ledgerData, {
            ledgerId,
            identity,
          })) ?? [],
        ),
      };
    } catch (error) {
      return { failure: checkFailureMessage(error) };
    }
  };
  // Independent reads: the baseline does not wait for the projection.
  const [before, projectedErrors] = await Promise.all([
    readBaseline(),
    services.ledgerRepo.checkProjectedFiles({ ledgerId, identity, overlays }),
  ]);
  if ("failure" in before) {
    return {
      ...toWriteValidation([], []),
      valid: false,
      checked: false,
      checkError: before.failure,
    };
  }
  const projection = toWriteValidation(
    before.errors,
    toBeanCheckErrors(projectedErrors),
    renames,
    account,
  );
  let newErrors = projection.newErrors;
  if (droppedLines) newErrors = atCurrentLines(newErrors, droppedLines);
  if (edits) newErrors = atLinesBeforeEdits(newErrors, edits);
  const current = { ...projection, newErrors };
  assertFileWriteValid(current, allowInvalid);
  return dryRun ? current : projection;
}

const LEDGER_FILE = /\.(bean|beancount)$/u;

/**
 * The ledger files a write creates or rewrites that no loaded file includes
 * (w1/227). Their entries count nowhere and bean-check never reads them, so
 * the write's verdict says nothing about them. Neither refused nor
 * auto-included: the owner keeps API file creation as it is and leaves the
 * entry point to the caller (w21/588). Empty when the ledger service cannot
 * answer, as the append's own check is (w23/062).
 */
export async function unloadedLedgerFiles(
  services: {
    ledgerRepo: Partial<Pick<ILedgerRepoService, "projectedSourceFiles">>;
  },
  identity: Identity,
  ledgerId: string,
  overlays: { path: string; content: string | null }[],
): Promise<string[]> {
  const written = overlays
    .filter((overlay) => overlay.content !== null)
    .map((overlay) => overlay.path)
    .filter((path) => LEDGER_FILE.test(path));
  const { projectedSourceFiles } = services.ledgerRepo;
  if (written.length === 0 || !projectedSourceFiles) return [];
  try {
    const loaded = new Set(
      await projectedSourceFiles.call(services.ledgerRepo, {
        ledgerId,
        identity,
        overlays,
      }),
    );
    return written.filter((path) => !loaded.has(path));
  } catch {
    return [];
  }
}

/**
 * The sentences a write's summary adds for {@link unloadedLedgerFiles}: what
 * an orphan means, and the one-commit way to split a ledger (w1/m45).
 */
export function unloadedNotice(paths: readonly string[]): string {
  const one = paths.length === 1;
  return `${paths.join(", ")} ${one ? "is" : "are"} not included by any loaded file: ${one ? "its" : "their"} entries don't count and were not checked. Include ${one ? "it" : "them"} from a loaded file; to move existing entries into a new file, moveEntrySources with includeFrom does both in one commit.`;
}
