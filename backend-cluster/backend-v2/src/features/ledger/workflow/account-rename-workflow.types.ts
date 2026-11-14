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

export interface IAccountRenameWorkflow {
  renameAccount(params: {
    identity: Identity;
    ledgerId: string;
    input: RenameAccountInput;
  }): Promise<RenameAccountResult>;
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
