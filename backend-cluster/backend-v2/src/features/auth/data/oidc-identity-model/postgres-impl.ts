import { and, eq } from "drizzle-orm";
import type { DbExecutor } from "@/drizzle/drizzle";
import { prefixedNanoidBase58 } from "@/shared/nanoid-base58";
import { oidcIdentities } from "./schema";
import type { IOidcIdentityModel } from "./types";

const byUserAndIssuer = (userId: string, issuer: string) =>
  and(eq(oidcIdentities.userId, userId), eq(oidcIdentities.issuer, issuer));

export class OidcIdentityPostgresModel implements IOidcIdentityModel {
  async findUserId(
    db: DbExecutor,
    issuer: string,
    sub: string,
  ): Promise<string | null> {
    const [row] = await db
      .select({ userId: oidcIdentities.userId })
      .from(oidcIdentities)
      .where(
        and(eq(oidcIdentities.issuer, issuer), eq(oidcIdentities.sub, sub)),
      )
      .limit(1);
    return row?.userId ?? null;
  }

  async isLinked(db: DbExecutor, userId: string, issuer: string) {
    const [row] = await db
      .select({ id: oidcIdentities.id })
      .from(oidcIdentities)
      .where(byUserAndIssuer(userId, issuer))
      .limit(1);
    return row !== undefined;
  }

  async link(
    db: DbExecutor,
    input: { issuer: string; sub: string; userId: string },
  ): Promise<boolean> {
    const created = await db
      .insert(oidcIdentities)
      .values({ id: prefixedNanoidBase58("oidc_"), ...input })
      .onConflictDoNothing()
      .returning({ id: oidcIdentities.id });
    return created.length > 0;
  }

  async unlink(db: DbExecutor, userId: string, issuer: string) {
    await db.delete(oidcIdentities).where(byUserAndIssuer(userId, issuer));
  }

  async deleteByUserId(db: DbExecutor, userId: string) {
    await db.delete(oidcIdentities).where(eq(oidcIdentities.userId, userId));
  }
}
