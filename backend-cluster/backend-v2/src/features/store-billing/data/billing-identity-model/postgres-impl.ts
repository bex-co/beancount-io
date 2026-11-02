import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { DbExecutor } from "@/drizzle/drizzle";
import { nanoidBase58 } from "@/shared/nanoid-base58";
import { billingIdentities } from "./schema";
import type { BillingIdentity, IBillingIdentityModel } from "./types";

/** Google allows up to 64 characters; this keeps the value well inside that. */
const GOOGLE_ACCOUNT_ID_LENGTH = 32;

export class BillingIdentityPostgresModel implements IBillingIdentityModel {
  async findOrCreate(db: DbExecutor, userId: string): Promise<BillingIdentity> {
    const existing = await this.find(db, userId);
    if (existing) return existing;

    const [created] = await db
      .insert(billingIdentities)
      .values({
        userId,
        appleAppAccountToken: randomUUID(),
        googleObfuscatedAccountId: nanoidBase58(GOOGLE_ACCOUNT_ID_LENGTH),
      })
      .onConflictDoNothing({ target: billingIdentities.userId })
      .returning();
    // A concurrent first use won the insert, so its row is the identity.
    return created ?? this.find(db, userId);
  }

  private async find(db: DbExecutor, userId: string) {
    const [identity] = await db
      .select()
      .from(billingIdentities)
      .where(eq(billingIdentities.userId, userId))
      .limit(1);
    return identity;
  }
}
