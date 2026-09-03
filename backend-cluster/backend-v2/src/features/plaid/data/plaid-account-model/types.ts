import { type DbExecutor } from "@/drizzle/drizzle";

export interface PlaidAccount {
  id: string;
  plaidItemId: string;
  accountId: string;
  accountName: string;
  accountType: string;
  accountSubtype?: string;
  mask?: string;
  ledgerAccount?: string;
  currency: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlaidAccountInput {
  plaidItemId: string;
  accountId: string;
  accountName: string;
  accountType: string;
  accountSubtype?: string;
  mask?: string;
}

export interface UpdatePlaidAccountInput {
  ledgerAccount?: string | null;
  currency?: string;
  enabled?: boolean;
}

export interface IPlaidAccountModel {
  getById(db: DbExecutor, id: string): Promise<PlaidAccount | null>;
  getByAccountId(
    db: DbExecutor,
    accountId: string,
  ): Promise<PlaidAccount | null>;
  getByItemId(db: DbExecutor, plaidItemId: string): Promise<PlaidAccount[]>;
  getEnabledByItemId(
    db: DbExecutor,
    plaidItemId: string,
  ): Promise<PlaidAccount[]>;
  getEnabledByLedgerRepoIdAndUserId(
    db: DbExecutor,
    ledgerRepoId: number,
    userId: string,
  ): Promise<Array<PlaidAccount & { institutionName: string }>>;
  create(db: DbExecutor, input: CreatePlaidAccountInput): Promise<PlaidAccount>;
  updateForItem(
    db: DbExecutor,
    id: string,
    plaidItemId: string,
    input: UpdatePlaidAccountInput,
  ): Promise<boolean>;
  deleteForItem(
    db: DbExecutor,
    id: string,
    plaidItemId: string,
  ): Promise<boolean>;
}
