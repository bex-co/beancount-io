import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import type { Adapter, AdapterFactory, AdapterPayload } from "oidc-provider";
import { type DbExecutor } from "@/drizzle/drizzle";
import { oauthAdapterStorage } from "./schema";

export class PostgresAdapter implements Adapter {
  constructor(
    private readonly db: DbExecutor,
    public readonly model: string,
  ) {}

  async upsert(
    id: string,
    payload: AdapterPayload,
    expiresIn: number,
  ): Promise<void> {
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : null;
    const grantId = payload.grantId ?? null;
    const userCode = payload.userCode ?? null;
    const uid = payload.uid ?? null;
    const updatedAt = new Date();

    await this.db
      .insert(oauthAdapterStorage)
      .values({
        model: this.model,
        id,
        payload,
        grantId,
        userCode,
        uid,
        expiresAt,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: [oauthAdapterStorage.model, oauthAdapterStorage.id],
        set: { payload, grantId, userCode, uid, expiresAt, updatedAt },
      });
  }

  async find(id: string): Promise<AdapterPayload | undefined> {
    return this.findOneWhere(eq(oauthAdapterStorage.id, id));
  }

  async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
    return this.findOneWhere(eq(oauthAdapterStorage.userCode, userCode));
  }

  async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    return this.findOneWhere(eq(oauthAdapterStorage.uid, uid));
  }

  // Filters expired rows only — never filters on `payload.consumed`. A consumed
  // but unexpired row must still be returned: oidc-provider's own model layer
  // (the `isValid` getter) rejects consumed rows downstream, the adapter must not.
  private async findOneWhere(
    condition: ReturnType<typeof eq>,
  ): Promise<AdapterPayload | undefined> {
    const rows = await this.db
      .select({ payload: oauthAdapterStorage.payload })
      .from(oauthAdapterStorage)
      .where(
        and(
          eq(oauthAdapterStorage.model, this.model),
          condition,
          or(
            isNull(oauthAdapterStorage.expiresAt),
            gt(oauthAdapterStorage.expiresAt, new Date()),
          ),
        ),
      )
      .limit(1);

    return rows[0]?.payload;
  }

  // Atomic single-statement update — a read-then-write here would be a real
  // lost-update race across multiple pods sharing one Postgres, unlike the
  // single-process in-memory Map the previous adapter used.
  async consume(id: string): Promise<void> {
    await this.db
      .update(oauthAdapterStorage)
      .set({
        payload: sql`jsonb_set(${oauthAdapterStorage.payload}, '{consumed}', to_jsonb(${Math.floor(Date.now() / 1000)}::bigint))`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(oauthAdapterStorage.model, this.model),
          eq(oauthAdapterStorage.id, id),
        ),
      );
  }

  async destroy(id: string): Promise<void> {
    await this.db
      .delete(oauthAdapterStorage)
      .where(
        and(
          eq(oauthAdapterStorage.model, this.model),
          eq(oauthAdapterStorage.id, id),
        ),
      );
  }

  // Scoped to this.model only: oidc-provider calls revokeByGrantId once per
  // relevant model class (AccessToken/RefreshToken/AuthorizationCode/DeviceCode/
  // BackchannelAuthenticationRequest), not as a single cross-model call.
  async revokeByGrantId(grantId: string): Promise<void> {
    await this.db
      .delete(oauthAdapterStorage)
      .where(
        and(
          eq(oauthAdapterStorage.model, this.model),
          eq(oauthAdapterStorage.grantId, grantId),
        ),
      );
  }
}

export function createPostgresAdapterFactory(db: DbExecutor): AdapterFactory {
  return (name: string) => new PostgresAdapter(db, name);
}

// NULL expiresAt (e.g. dynamically-registered Client, RegistrationAccessToken,
// InitialAccessToken) is never swept: SQL `lt(NULL, x)` never matches.
export async function deleteExpiredOauthAdapterRecords(
  db: DbExecutor,
): Promise<void> {
  await db
    .delete(oauthAdapterStorage)
    .where(lt(oauthAdapterStorage.expiresAt, new Date()));
}
