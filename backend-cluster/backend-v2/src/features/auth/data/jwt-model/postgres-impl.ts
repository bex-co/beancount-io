import { randomUUID } from "crypto";
import { eq, and, lt } from "drizzle-orm";
import { getExpireEpoch } from "@/shared/expire-epoch";
import { IJwtModel, UserId } from "./types";
import { jwts } from "./schema";
import { logger } from "@/shared/logger";
import { type DbExecutor } from "@/drizzle/drizzle";
import { signJwt, verifyJwt } from "@/features/auth/utils/jwt-crypto-utils";

const jwtLogger = logger.child({ module: "jwt-model" });

type Opts = {
  secret: string;
  expMins: number;
};

export class JwtPostgresModel implements IJwtModel {
  public secret: string;

  private expMins: number;

  constructor({ secret, expMins }: Opts) {
    this.secret = secret;
    this.expMins = expMins;
  }

  public async create(
    db: DbExecutor,
    userId: string,
    expiresInMins?: number,
  ): Promise<{ token: string; expireAt: Date }> {
    // A caller may only shorten the configured life, never extend it: the
    // narrowing exists for credentials that should live less than a browser
    // session, and an argument that could widen it would be a way to mint a
    // longer-lived token than the deployment configured.
    const lifetimeMins =
      expiresInMins === undefined
        ? this.expMins
        : Math.min(expiresInMins, this.expMins);
    const expireAt = new Date(getExpireEpoch(lifetimeMins));
    const createAt = new Date();

    // Generate UUID for new PostgreSQL JWTs (not ObjectId)
    // This allows distinguishing new tokens (UUID) from migrated tokens (ObjectId)
    const id = randomUUID();

    const result = await db
      .insert(jwts)
      .values({
        id,
        userId,
        expireAt,
        createAt,
        updateAt: createAt,
      })
      .returning();

    const record = result[0];

    const token = await signJwt(
      {
        jti: record.id,
        sub: userId,
        exp: Math.floor(expireAt.getTime() / 1000),
        iat: Math.floor(createAt.getTime() / 1000),
      },
      this.secret,
    );

    return { token, expireAt: record.expireAt };
  }

  public async revoke(db: DbExecutor, token: string): Promise<void> {
    const decoded = await verifyJwt(token, this.secret);
    if (!decoded) {
      return undefined;
    }
    await db.delete(jwts).where(eq(jwts.id, decoded.jti));
    return undefined;
  }

  public async verify(db: DbExecutor, token: string): Promise<UserId | null> {
    const decoded = await verifyJwt(token, this.secret);
    if (!decoded) {
      jwtLogger.debug("JWT signature verification failed", {
        secretPrefix: this.secret.substring(0, 10),
      });
      return null;
    }

    const result = await db
      .select()
      .from(jwts)
      .where(and(eq(jwts.id, decoded.jti), eq(jwts.userId, decoded.sub)))
      .limit(1);

    const found = result[0];
    if (!found) {
      return null;
    }

    return found.userId;
  }

  public async deleteByUserId(db: DbExecutor, userId: string): Promise<void> {
    await db.delete(jwts).where(eq(jwts.userId, userId));
  }

  public async deleteExpired(db: DbExecutor): Promise<void> {
    await db.delete(jwts).where(lt(jwts.expireAt, new Date()));
  }
}
