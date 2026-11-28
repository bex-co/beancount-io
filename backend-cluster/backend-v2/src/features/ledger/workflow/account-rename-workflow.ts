import { logger } from "@/shared/logger";
import { BadUserInputError, NotFoundError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  ledgerResource,
  type IAuthorizationService,
} from "@/server/api/authorization";
import type {
  ILedgerGeneratedFileWriter,
  ILedgerRepoService,
  LedgerFileEntry,
} from "@/features/ledger/service/ledger-repo-service";
import type { ILedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { gateFileWrite } from "@/features/ledger/utils/file-write-gate";
import { commitRename } from "@/features/ledger/utils/rename-write-race";
import { LEDGER_ENTRY_POINT } from "@/features/ledger/utils/ledger-entry-point";
import {
  accountFolder,
  documentRoots,
} from "@/features/ledger/utils/document-folders";
import {
  lexesAsAccount,
  loadsAsAccount,
} from "@/features/ledger/utils/account-matcher";
import {
  accountNamesAt,
  accountNamesUnder,
  accountTokenOffsets,
  accountsRenamedByCommit,
  renameAccountAt,
  renameAccountName,
} from "@/features/ledger/utils/account-rename";
import type {
  BankMappingMove,
  CommitTextChange,
  IAccountRenameWorkflow,
  ILedgerBankMappings,
  MovedBankMapping,
  RenameAccountInput,
  RenameAccountResult,
} from "./account-rename-workflow.types";

/** What to do next when no loaded file names the account to rename. */
const ACCOUNT_NOT_FOUND_HINT =
  "No file the ledger loads names this account or one under it. Read the ledger's account list and pass one of its names as from; account names are case-sensitive.";

/** The fix-it every refusal of a non-UTF-8 file gives (`assertWritableText`). */
const NOT_UTF8_HINT =
  "Re-encode the file as UTF-8 and write it whole — replace its full content, or push it with git.";

type RepoDeps = Pick<
  ILedgerRepoService,
  | "getFilesContent"
  | "checkProjectedFiles"
  | "projectedSourceFiles"
  | "listDirContent"
> &
  ILedgerGeneratedFileWriter;

/** A file a rename moves out of an account's documents folder, at the sha it was listed with. */
type DocumentMove = { from: string; to: string; sha: string };

/**
 * Rename one account, and every account under it, across a hosted ledger's
 * loaded files in one commit (w1/m43; contract in `.pm/w1/m43/done/t001.md`).
 * Read, rename, gate the projection on new bean-check errors, then commit with
 * each file's sha, so a file changed since the read refuses the whole rename.
 * The account's documents folders move in the same commit (w31/149); bank
 * mappings move after it, and back after a revert of it (w31/150).
 */
export class AccountRenameWorkflow implements IAccountRenameWorkflow {
  private readonly logger = logger.child({ module: "account-rename" });

  constructor(
    private readonly ledgerRepo: RepoDeps,
    private readonly ledgerData: Pick<ILedgerDataService, "getErrors">,
    private readonly authorization: Pick<
      IAuthorizationService,
      "authorizeOrThrow"
    >,
    private readonly bankMappings: ILedgerBankMappings,
  ) {}

  async renameAccount({
    identity,
    ledgerId,
    input,
  }: {
    identity: Identity;
    ledgerId: string;
    input: RenameAccountInput;
  }): Promise<RenameAccountResult> {
    const { from, to, dryRun = false, allowInvalid = false } = input;
    // Write authority first: a read-only credential is FORBIDDEN, whatever
    // else is wrong with the request.
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_FILES_WRITE,
      resource: ledgerResource(ledgerId),
    });
    assertRenamable(from, to);
    // The files the ledger actually loads: an account in a file nothing
    // includes counts nowhere, so it is not part of the ledger to rename.
    const paths = await this.ledgerRepo.projectedSourceFiles({
      ledgerId,
      identity,
      overlays: [],
    });
    const files = (
      await this.ledgerRepo.getFilesContent({ ledgerId, identity, paths })
    ).map((file) => ({
      ...file,
      offsets: accountTokenOffsets(file.content, from),
    }));
    const names = new Set(
      files.flatMap((file) => accountNamesAt(file.content, file.offsets, from)),
    );
    if (names.size === 0) {
      throw new NotFoundError("Account", from, ACCOUNT_NOT_FOUND_HINT);
    }
    const accounts = [...names].map((name) => ({
      from: name,
      to: renameAccountName(name, from, to)!,
    }));
    const existing = accountNamesUnder(
      files.map((file) => file.content),
      to,
    );
    const merged = accounts.find(
      (account) => existing.has(account.to) && !names.has(account.to),
    );
    if (merged) {
      throw new BadUserInputError(
        `${merged.to} is already in the ledger; renaming ${merged.from} onto it would merge the two accounts. Rename to an account the ledger does not use.`,
      );
    }
    const changed = files
      .filter((file) => file.offsets.length > 0)
      .map((file) => {
        if (file.lossy) {
          // Rewriting would replace its undecodable bytes with U+FFFD.
          throw new BadUserInputError(
            `${file.path} is not valid UTF-8, so the rename cannot rewrite it without changing its other bytes`,
            "path",
            NOT_UTF8_HINT,
          );
        }
        return {
          ...file,
          renamed: renameAccountAt(file.content, file.offsets, from, to),
        };
      });
    const documents = await this.documentMoves({
      ledgerId,
      identity,
      entryPoint: files.find((file) => file.path === LEDGER_ENTRY_POINT)
        ?.content,
      loaded: new Set(paths),
      from,
      to,
    });
    // Independent reads: the mappings need only the ledger, not the verdict.
    // A preview reports new errors; only a commit is refused for them (w23/219).
    // An error the ledger had that names the account is the same error under
    // its new name, not a new one (w31/114).
    const [validation, mappings] = await Promise.all([
      gateFileWrite(
        { ledgerRepo: this.ledgerRepo, ledgerData: this.ledgerData },
        identity,
        ledgerId,
        changed.map((file) => ({
          path: file.path,
          content: file.renamed.text,
        })),
        dryRun || allowInvalid,
        { account: { from, to } },
      ),
      this.mappingMoves(ledgerId, identity, (account) =>
        renameAccountName(account, from, to),
      ),
    ]);
    const lines = changed.reduce(
      (count, file) => count + file.renamed.changes.length,
      0,
    );
    const moved =
      documents.length === 0
        ? ""
        : `, ${documents.length} document${documents.length === 1 ? "" : "s"} moved`;
    const summary = `${from} to ${to}: ${lines} line${lines === 1 ? "" : "s"} in ${changed.length} file${changed.length === 1 ? "" : "s"}${moved}`;
    let commit: string | undefined;
    let mappingsUpdated = false;
    if (!dryRun) {
      ({ commit } = await commitRename(() =>
        this.ledgerRepo.changeGeneratedFiles({
          ledgerId,
          identity,
          operations: [
            ...changed.map((file) => ({
              operation: "update" as const,
              path: file.path,
              content: file.renamed.text,
              sha: file.sha,
            })),
            ...documents.map((move) => ({
              operation: "move" as const,
              path: move.to,
              from_path: move.from,
              sha: move.sha,
            })),
          ],
          message: `Rename ${from} to ${to}`,
        }),
      ));
      this.logger.info("Renamed account", {
        ledgerId,
        files: changed.length,
        lines,
        documents: documents.length,
      });
      mappingsUpdated = await this.moveBankMappings({
        ledgerId,
        moves: mappings,
      });
    }
    const leftBehind =
      !dryRun && !mappingsUpdated
        ? `; ${mappings.length} bank mapping${mappings.length === 1 ? " still names" : "s still name"} ${from}: map ${mappings.length === 1 ? "it" : "them"} to ${to} again`
        : "";
    return {
      message: `${dryRun ? "Would rename" : "Renamed"} ${summary}${leftBehind}`,
      from,
      to,
      accounts,
      files: changed.map((file) => ({
        path: file.path,
        changes: file.renamed.changes,
      })),
      documents: documents.map((move) => ({ from: move.from, to: move.to })),
      bankMappings: reportMappingMoves(mappings, mappingsUpdated),
      validation,
      dryRun,
      ...(commit !== undefined && { commit }),
    };
  }

  async revertedBankMappings({
    identity,
    ledgerId,
    subject,
    files,
  }: {
    identity: Identity;
    ledgerId: string;
    subject: string;
    files: CommitTextChange[];
  }): Promise<BankMappingMove[]> {
    const renamed = accountsRenamedByCommit(subject, files);
    if (renamed.size === 0) return [];
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_FILES_WRITE,
      resource: ledgerResource(ledgerId),
    });
    return this.mappingMoves(ledgerId, identity, (account) =>
      renamed.get(account),
    );
  }

  async moveBankMappings({
    ledgerId,
    moves,
  }: {
    ledgerId: string;
    moves: BankMappingMove[];
  }): Promise<boolean> {
    if (moves.length === 0) return true;
    try {
      await this.bankMappings.remap(
        moves.map(({ id, plaidItemId, to }) => ({
          id,
          plaidItemId,
          ledgerAccount: to,
        })),
      );
      return true;
    } catch (error) {
      // The commit stands; the result says which mappings it left behind,
      // so the next bank sync does not post to an account that is gone.
      this.logger.error("Bank mappings not updated after the commit", {
        ledgerId,
        error,
      });
      return false;
    }
  }

  /** Every member's mappings whose account `rename` gives another name. */
  private async mappingMoves(
    ledgerId: string,
    identity: Identity,
    rename: (account: string) => string | undefined,
  ): Promise<BankMappingMove[]> {
    const mappings = await this.bankMappings.list({ ledgerId, identity });
    return mappings.flatMap(({ id, plaidItemId, name, ledgerAccount }) => {
      const to = rename(ledgerAccount);
      return to === undefined
        ? []
        : [{ id, plaidItemId, plaidAccount: name, from: ledgerAccount, to }];
    });
  }

  /**
   * The moves that keep `from`'s documents with it (w31/149): every file
   * under its folder in each `option "documents"` root the entry point
   * declares, its descendants' folders included, to the same place under
   * `to`'s folder. Without them the folder names an account no entry uses,
   * and discovery drops every statement in it without a word, as stock
   * Beancount does. A file the ledger loads stays, since an include names it
   * where it is. Refused when `to`'s folder already holds a file, so two
   * folders never merge.
   */
  private async documentMoves({
    ledgerId,
    identity,
    entryPoint,
    loaded,
    from,
    to,
  }: {
    ledgerId: string;
    identity: Identity;
    entryPoint: string | undefined;
    loaded: ReadonlySet<string>;
    from: string;
    to: string;
  }): Promise<DocumentMove[]> {
    const moves: DocumentMove[] = [];
    if (entryPoint === undefined) return moves;
    const moving = new Set<string>();
    for (const root of documentRoots(entryPoint, LEDGER_ENTRY_POINT)) {
      const source = accountFolder(root, from);
      const target = accountFolder(root, to);
      const leaving = (
        await this.filesUnder(ledgerId, identity, source)
      ).filter((file) => !loaded.has(file.path) && !moving.has(file.path));
      if (leaving.length === 0) continue;
      const arriving = leaving.map((file) => ({
        from: file.path,
        to: `${target}${file.path.slice(source.length)}`,
        sha: file.sha,
      }));
      const left = new Set(leaving.map((file) => file.path));
      const landing = new Set(arriving.map((move) => move.to));
      const held = (await this.filesUnder(ledgerId, identity, target)).find(
        (file) => !left.has(file.path) || landing.has(file.path),
      );
      if (held) {
        throw new BadUserInputError(
          `${held.path} is already in ${target}, the documents folder of ${to}; moving ${source} there would merge two folders. Move or remove the files in ${target} first, or rename to another account.`,
          "to",
        );
      }
      for (const move of arriving) moving.add(move.from);
      moves.push(...arriving);
    }
    return moves;
  }

  /** Every file under `folder`, at any depth; none when there is no such folder. */
  private async filesUnder(
    ledgerId: string,
    identity: Identity,
    folder: string,
  ): Promise<LedgerFileEntry[]> {
    const files: LedgerFileEntry[] = [];
    const pending = [folder];
    while (pending.length > 0) {
      // Git keeps no empty folder, so a missing one lists as NOT_FOUND (w23/014).
      const entries = await this.ledgerRepo
        .listDirContent({ ledgerId, identity, dirPath: pending.pop() })
        .catch((error: unknown) => {
          if (error instanceof NotFoundError) return [];
          throw error;
        });
      for (const entry of entries) {
        if (entry.type === "dir") pending.push(entry.path);
        else files.push(entry);
      }
    }
    return files;
  }
}

/** Each mapping as a result reports it, without the rows it names. */
export function reportMappingMoves(
  moves: readonly BankMappingMove[],
  updated: boolean,
): MovedBankMapping[] {
  return moves.map(({ plaidAccount, from, to }) => ({
    plaidAccount,
    from,
    to,
    updated,
  }));
}

/** The rule a refused name breaks, as stock Beancount loads an account. */
const ACCOUNT_NAME_RULE =
  "Join a root and its components with colons (Expenses:Food:日本). The root is a capital letter followed by letters, digits or hyphens; the first component starts with a capital letter or a digit; each later component starts with an uppercase or titlecase letter, a caseless letter (such as CJK or Arabic), or a decimal digit. ASCII inside a component is limited to letters, digits and hyphens, and a name holds no spaces or control characters.";

/**
 * The refusals that need no read: names, the root, and a rename onto itself.
 * `to` must be a name stock Beancount loads, a non-Latin leaf included
 * (w31/013). `from` need only be one account token, its root or first
 * component starting with a caseless or titlecase letter: the hosted engine
 * loads `Expenses:日本`, which stock refuses, and renaming it is how a ledger
 * gets rid of it.
 */
function assertRenamable(from: string, to: string): void {
  for (const [name, value, loads] of [
    ["from", from, lexesAsAccount],
    ["to", to, loadsAsAccount],
  ] as const) {
    if (!loads(value)) {
      throw new BadUserInputError(
        `${name} ${JSON.stringify(value)} is not an account name Beancount loads. ${ACCOUNT_NAME_RULE}`,
        name,
      );
    }
  }
  if (from === to) {
    throw new BadUserInputError("from and to are the same account");
  }
  const [fromRoot] = from.split(":");
  const [toRoot] = to.split(":");
  if (fromRoot !== toRoot) {
    throw new BadUserInputError(
      `${from} is under ${fromRoot} and ${to} under ${toRoot}: moving an account to another root changes how every report reads it, so it is not a rename. Keep the ${fromRoot} root.`,
    );
  }
}
