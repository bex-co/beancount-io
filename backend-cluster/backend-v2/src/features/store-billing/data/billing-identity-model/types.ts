import type { DbExecutor } from "@/drizzle/drizzle";

export interface BillingIdentity {
  userId: string;
  appleAppAccountToken: string;
  googleObfuscatedAccountId: string;
  createdAt: Date;
}

export interface IBillingIdentityModel {
  /** The account's identifiers, created on first use and stable afterwards. */
  findOrCreate(db: DbExecutor, userId: string): Promise<BillingIdentity>;
}
