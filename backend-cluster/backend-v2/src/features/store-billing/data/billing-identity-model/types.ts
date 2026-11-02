import type { InferSelectModel } from "drizzle-orm";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { billingIdentities } from "./schema";

export type BillingIdentity = InferSelectModel<typeof billingIdentities>;

export interface IBillingIdentityModel {
  /** The account's identifiers, created on first use and stable afterwards. */
  findOrCreate(db: DbExecutor, userId: string): Promise<BillingIdentity>;
}
