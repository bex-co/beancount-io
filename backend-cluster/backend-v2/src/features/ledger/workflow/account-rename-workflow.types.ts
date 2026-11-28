import type { Identity } from "@/server/api/identity";
import type { WriteValidation } from "@/features/ledger/utils/bean-check-errors";
import type { AccountRenameChange } from "@/features/ledger/utils/account-rename";

export interface RenameAccountInput {
  from: string;
  to: string;
  dryRun?: boolean;
  allowInvalid?: boolean;
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
   * Each file moved from a renamed account's folder under an
   * `option "documents"` root to the same place under the new name's folder,
   * in the same commit (w31/149).
   */
  documents: { from: string; to: string }[];
  /**
   * Each bank mapping that named a renamed account. `updated` is false on a
   * preview, and on a commit whose mapping update failed: that mapping still
   * names the old account, and `message` says so.
   */
  bankMappings: MovedBankMapping[];
  validation: WriteValidation;
  dryRun: boolean;
  /** The commit a real write made (w23/m42); absent on a preview. */
  commit?: string;
}

/** A bank mapping a rename, or the revert of one, points at another account. */
export interface MovedBankMapping {
  /** The caller's own bank account; null for another member's. */
  plaidAccount: string | null;
  from: string;
  to: string;
  /** False on a preview, and when the update after the commit failed. */
  updated: boolean;
}

/** A mapping to move: which row, and the account it names now and next. */
export interface BankMappingMove {
  id: string;
  plaidItemId: string;
  plaidAccount: string | null;
  from: string;
  to: string;
}

/** One file a commit modified, as its parent and the commit hold it. */
export interface CommitTextChange {
  before: string;
  after: string;
}

export interface IAccountRenameWorkflow {
  renameAccount(params: {
    identity: Identity;
    ledgerId: string;
    input: RenameAccountInput;
  }): Promise<RenameAccountResult>;
  /**
   * The bank mappings that reverting a commit moves back (w31/150): none
   * unless `subject` names a rename and every file the commit modified is
   * exactly that rename of its parent. Then each mapping, every member's,
   * that names an account the commit renamed goes back to its name before.
   */
  revertedBankMappings(params: {
    identity: Identity;
    ledgerId: string;
    subject: string;
    files: CommitTextChange[];
  }): Promise<BankMappingMove[]>;
  /**
   * Point each mapping at its `to`, after the commit that renames its account
   * landed. False when the update failed: the commit stands, and every
   * mapping still names its `from`.
   */
  moveBankMappings(params: {
    ledgerId: string;
    moves: BankMappingMove[];
  }): Promise<boolean>;
}

/**
 * One bank-account mapping that posts into a ledger (w1/m43/t003). `name` is
 * the bank account as its owner sees it, given only for the caller's own
 * connections: another member's bank is never named to the caller.
 */
export interface LedgerBankMapping {
  id: string;
  plaidItemId: string;
  ledgerAccount: string;
  name: string | null;
}

/** A ledger's bank mappings, every member's, and how to point them elsewhere. */
export interface ILedgerBankMappings {
  list(params: {
    ledgerId: string;
    identity: Identity;
  }): Promise<LedgerBankMapping[]>;
  remap(changes: Omit<LedgerBankMapping, "name">[]): Promise<void>;
}
