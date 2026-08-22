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
  getEnabledByLedgerRepoId(
    db: DbExecutor,
    ledgerRepoId: number,
  ): Promise<Array<PlaidAccount & { institutionName: string }>>;
  create(db: DbExecutor, input: CreatePlaidAccountInput): Promise<PlaidAccount>;
  update(
    db: DbExecutor,
    id: string,
    input: UpdatePlaidAccountInput,
  ): Promise<void>;
  delete(db: DbExecutor, id: string): Promise<void>;
}
