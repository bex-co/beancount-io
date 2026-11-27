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
} from "@/features/ledger/service/ledger-repo-service";
import type { ILedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { gateFileWrite } from "@/features/ledger/utils/file-write-gate";
import { commitRename } from "@/features/ledger/utils/rename-write-race";
import {
  lexesAsAccount,
  loadsAsAccount,
} from "@/features/ledger/utils/account-matcher";
import {
  accountNamesAt,
  accountNamesUnder,
  accountTokenOffsets,
  renameAccountAt,
  renameAccountName,
} from "@/features/ledger/utils/account-rename";
import type {
  IAccountRenameWorkflow,
  ILedgerBankMappings,
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
  "getFilesContent" | "checkProjectedFiles" | "projectedSourceFiles"
> &
  ILedgerGeneratedFileWriter;

/**
 * Rename one account, and every account under it, across a hosted ledger's
 * loaded files in one commit (w1/m43; contract in `.pm/w1/m43/done/t001.md`).
 * Read, rename, gate the projection on new bean-check errors, then commit with
 * each file's sha, so a file changed since the read refuses the whole rename.
 * Bank mappings move after the commit.
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
    // Independent reads: the mappings need only the ledger, not the verdict.
    // A preview reports new errors; only a commit is refused for them (w23/219).
    // An error the ledger had that names the account is the same error under
    // its new name, not a new one (w31/114).
    const [validation, allMappings] = await Promise.all([
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
      this.bankMappings.list({ ledgerId, identity }),
    ]);
    const mappings = allMappings.flatMap((mapping) => {
      const renamed = renameAccountName(mapping.ledgerAccount, from, to);
      return renamed === undefined ? [] : [{ ...mapping, renamed }];
    });
    const lines = changed.reduce(
      (count, file) => count + file.renamed.changes.length,
      0,
    );
    const summary = `${from} to ${to}: ${lines} line${lines === 1 ? "" : "s"} in ${changed.length} file${changed.length === 1 ? "" : "s"}`;
    let commit: string | undefined;
    let mappingsUpdated = false;
    if (!dryRun) {
      ({ commit } = await commitRename(() =>
        this.ledgerRepo.changeGeneratedFiles({
          ledgerId,
          identity,
          operations: changed.map((file) => ({
            operation: "update" as const,
            path: file.path,
            content: file.renamed.text,
            sha: file.sha,
          })),
          message: `Rename ${from} to ${to}`,
        }),
      ));
      this.logger.info("Renamed account", {
        ledgerId,
        files: changed.length,
        lines,
      });
      try {
        if (mappings.length > 0) {
          await this.bankMappings.remap(
            mappings.map(({ id, plaidItemId, renamed }) => ({
              id,
              plaidItemId,
              ledgerAccount: renamed,
            })),
          );
        }
        mappingsUpdated = true;
      } catch (error) {
        // The commit stands; the result says which mappings it left behind,
        // so the next bank sync does not post to an account that is gone.
        this.logger.error("Bank mappings not updated after rename", {
          ledgerId,
          error,
        });
      }
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
      bankMappings: mappings.map((mapping) => ({
        plaidAccount: mapping.name,
        from: mapping.ledgerAccount,
        to: mapping.renamed,
        updated: mappingsUpdated,
      })),
      validation,
      dryRun,
      ...(commit !== undefined && { commit }),
    };
  }
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
