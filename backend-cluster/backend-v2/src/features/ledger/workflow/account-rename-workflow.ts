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
import type { WriteValidation } from "@/features/ledger/utils/bean-check-errors";
import { isValidAccountName } from "@/features/ledger/utils/account-matcher";
import {
  type AccountRenameChange,
  renameAccountInText,
  renamedAccounts,
} from "@/features/ledger/utils/account-rename";

/** What the rename does, as REST, GraphQL and MCP describe it (w1/m43). */
export const RENAME_ACCOUNT_DESCRIPTION =
  "Rename an account and every account under it across the ledger's loaded files in one commit: account tokens outside strings and comments, whole names only. Bank mappings move with it. Refused for an invalid name, another root, or a name the ledger already uses; new bean-check errors refuse the commit unless allowInvalid. revertCommit undoes the commit.";

export interface RenameAccountInput {
  from: string;
  to: string;
  dryRun?: boolean;
  allowInvalid?: boolean;
}

/**
 * One bank-account mapping that posts into this ledger (w1/m43/t003). `name`
 * is the bank account as its owner sees it, given only for the caller's own
 * connections: another member's bank is never named to the caller.
 */
export interface LedgerBankMapping {
  id: string;
  plaidItemId: string;
  ledgerAccount: string;
  name: string | null;
}

/** The ledger's bank mappings, every member's, and how to point them elsewhere. */
export interface LedgerBankMappings {
  list(params: {
    ledgerId: string;
    identity: Identity;
  }): Promise<LedgerBankMapping[]>;
  remap(
    changes: { id: string; plaidItemId: string; ledgerAccount: string }[],
  ): Promise<void>;
}

export interface RenameAccountResult {
  message: string;
  from: string;
  to: string;
  /** Each account the rename maps, `from`'s descendants included. */
  accounts: { from: string; to: string }[];
  /** Each loaded file the rename changes, with every line it rewrites. */
  files: { path: string; changes: AccountRenameChange[] }[];
  /**
   * Each bank mapping that named a renamed account. `updated` is false on a
   * preview, and on a commit whose mapping update failed: that mapping still
   * names the old account, and `message` says so.
   */
  bankMappings: {
    plaidAccount: string | null;
    from: string;
    to: string;
    updated: boolean;
  }[];
  validation: WriteValidation;
  dryRun: boolean;
  /** The commit a real write made (w23/m42); absent on a preview. */
  commit?: string;
}

/** What to do next when no loaded file names the account to rename. */
const ACCOUNT_NOT_FOUND_HINT =
  "No file the ledger loads names this account or one under it. Read the ledger's accounts (getLedgerContext, or the accounts resource) and pass one of them as from; account names are case-sensitive.";

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
 */
export class AccountRenameWorkflow {
  private readonly logger = logger.child({ module: "account-rename" });

  constructor(
    private readonly ledgerRepo: RepoDeps,
    private readonly ledgerData: Pick<ILedgerDataService, "getErrors">,
    private readonly authorization: Pick<
      IAuthorizationService,
      "authorizeOrThrow"
    >,
    /** Absent in a composition without bank connections: nothing to carry along. */
    private readonly bankMappings?: LedgerBankMappings,
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
    const files = await this.ledgerRepo.getFilesContent({
      ledgerId,
      identity,
      paths,
    });
    const accounts = renamedAccounts(
      files.map((file) => file.content),
      from,
      to,
    );
    if (accounts.length === 0) {
      throw new NotFoundError("Account", from, ACCOUNT_NOT_FOUND_HINT);
    }
    const sources = new Set(accounts.map((account) => account.from));
    const existing = new Set(
      renamedAccounts(
        files.map((file) => file.content),
        to,
        to,
      ).map((account) => account.from),
    );
    const merged = accounts.find(
      (account) => existing.has(account.to) && !sources.has(account.to),
    );
    if (merged) {
      throw new BadUserInputError(
        `${merged.to} is already in the ledger; renaming ${merged.from} onto it would merge the two accounts. Rename to an account the ledger does not use.`,
      );
    }
    const changed = files.flatMap((file) => {
      const renamed = renameAccountInText(file.content, from, to);
      if (renamed.changes.length === 0) return [];
      if (file.lossy) {
        // Rewriting would replace its undecodable bytes with U+FFFD.
        throw new BadUserInputError(
          `${file.path} is not valid UTF-8, so it cannot be rewritten without changing its other bytes. Fix its encoding first.`,
        );
      }
      return [{ ...file, renamed }];
    });
    const overlays = changed.map((file) => ({
      path: file.path,
      content: file.renamed.text,
    }));
    // A preview reports new errors; only a commit is refused for them (w23/219).
    const validation = await gateFileWrite(
      { ledgerRepo: this.ledgerRepo, ledgerData: this.ledgerData },
      identity,
      ledgerId,
      overlays,
      dryRun || allowInvalid,
    );
    // Read before the commit, so a preview lists what the commit will move.
    const mappings = (
      (await this.bankMappings?.list({ ledgerId, identity })) ?? []
    ).flatMap((mapping) => {
      const { ledgerAccount } = mapping;
      if (ledgerAccount !== from && !ledgerAccount.startsWith(`${from}:`)) {
        return [];
      }
      return [{ ...mapping, renamed: to + ledgerAccount.slice(from.length) }];
    });
    const lines = changed.reduce(
      (count, file) => count + file.renamed.changes.length,
      0,
    );
    const summary = `${from} to ${to}: ${lines} line${lines === 1 ? "" : "s"} in ${changed.length} file${changed.length === 1 ? "" : "s"}`;
    let commit: string | undefined;
    let mappingsUpdated = false;
    let mappingFailure = "";
    if (!dryRun) {
      ({ commit } = await this.ledgerRepo.changeGeneratedFiles({
        ledgerId,
        identity,
        operations: changed.map((file) => ({
          operation: "update" as const,
          path: file.path,
          content: file.renamed.text,
          sha: file.sha,
        })),
        message: `Rename ${from} to ${to}`,
      }));
      this.logger.info("Renamed account", {
        ledgerId,
        files: changed.length,
        lines,
      });
      if (mappings.length > 0) {
        try {
          await this.bankMappings!.remap(
            mappings.map((mapping) => ({
              id: mapping.id,
              plaidItemId: mapping.plaidItemId,
              ledgerAccount: mapping.renamed,
            })),
          );
          mappingsUpdated = true;
        } catch (error) {
          // The commit stands; say plainly which mappings it left behind, so
          // the next bank sync does not post to an account that is gone.
          this.logger.error("Bank mappings not updated after rename", {
            ledgerId,
            error,
          });
          mappingFailure = `; ${mappings.length} bank mapping${mappings.length === 1 ? " still names" : "s still name"} ${from}: map ${mappings.length === 1 ? "it" : "them"} to ${to} with mapBankAccount`;
        }
      }
    }
    return {
      message: dryRun
        ? `Would rename ${summary}`
        : `Renamed ${summary}${mappingFailure}`,
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

/** The refusals that need no read: names, the root, and a rename onto itself. */
function assertRenamable(from: string, to: string): void {
  for (const [name, value] of [
    ["from", from],
    ["to", to],
  ] as const) {
    if (!isValidAccountName(value)) {
      throw new BadUserInputError(
        `${name} ${JSON.stringify(value)} is not a valid account name (Root:Component, each component starting with a capital letter or digit).`,
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
