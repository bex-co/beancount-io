import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";
import type { DbExecutor } from "@/drizzle/drizzle";
import { SubscriptionTier } from "@/features/stripe/service/stripe";
import { BillingIdentityPostgresModel } from "../billing-identity-model";
import { StoreBillingEventPostgresModel } from "../store-billing-event-model";
import {
  StoreEnvironment,
  StoreProvider,
  StoreSubscriptionPostgresModel,
  StoreSubscriptionStatus,
  type UpsertStoreSubscriptionInput,
} from "../store-subscription-model";

const MIGRATIONS = join(process.cwd(), "src/drizzle/migrations");
const FIRST_STORE_BILLING_MIGRATION = "0027_store_billing";

/** The migrations already on production, without this feature's. */
function migrationsBeforeStoreBilling() {
  const folder = mkdtempSync(join(tmpdir(), "migrations-"));
  cpSync(MIGRATIONS, folder, { recursive: true });
  const journalPath = join(folder, "meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  const end = journal.entries.findIndex(
    (entry: { tag: string }) => entry.tag === FIRST_STORE_BILLING_MIGRATION,
  );
  expect(end).toBeGreaterThan(0);
  journal.entries = journal.entries.slice(0, end);
  writeFileSync(journalPath, JSON.stringify(journal));
  return folder;
}

async function applyTo(connectionString: string, folder: string) {
  const client = new Client({ connectionString });
  await client.connect();
  await migrate(drizzle(client), { migrationsFolder: folder });
  await client.end();
}

async function tables(pool: Pool) {
  const { rows } = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
  );
  return rows.map((row) => row.tablename);
}

const T1 = new Date("2026-11-01T10:00:00Z");
const T2 = new Date("2026-11-01T11:00:00Z");

function purchase(
  overrides: Partial<UpsertStoreSubscriptionInput> = {},
): UpsertStoreSubscriptionInput {
  return {
    userId: "user-a",
    provider: StoreProvider.APP_STORE,
    environment: StoreEnvironment.PRODUCTION,
    externalId: "original-transaction",
    replacedById: null,
    productId: "io.beancount.premium.monthly",
    basePlanId: null,
    tier: SubscriptionTier.PREMIUM,
    cycle: "month",
    providerStatus: "1",
    status: StoreSubscriptionStatus.ACTIVE,
    accessEndsAt: new Date("2026-12-01T10:00:00Z"),
    willRenew: true,
    pendingProductId: null,
    acknowledgedAt: null,
    revokedAt: null,
    providerUpdatedAt: T1,
    lastVerifiedAt: T1,
    ...overrides,
  };
}

let container: StartedPostgreSqlContainer;
let pool: Pool;
let db: DbExecutor;
const subscriptions = new StoreSubscriptionPostgresModel();
const events = new StoreBillingEventPostgresModel();
const identities = new BillingIdentityPostgresModel();

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:17-alpine").start();
  pool = new Pool({ connectionString: container.getConnectionUri() });
  db = drizzle(pool);

  const previous = migrationsBeforeStoreBilling();
  await applyTo(container.getConnectionUri(), previous);
  rmSync(previous, { recursive: true });
  expect(await tables(pool)).not.toContain("store_subscriptions");
  await applyTo(container.getConnectionUri(), MIGRATIONS);
}, 120_000);

afterAll(async () => {
  await pool?.end();
  await container?.stop();
});

beforeEach(async () => {
  await pool.query(
    "TRUNCATE store_subscriptions, store_billing_events, billing_identities",
  );
});

describe("the store billing migration", () => {
  it("applies on top of the migrations already on production", async () => {
    expect(await tables(pool)).toEqual(
      expect.arrayContaining([
        "paid_customers",
        "store_subscriptions",
        "store_billing_events",
        "billing_identities",
      ]),
    );
  });

  it("applies to an empty database", async () => {
    await pool.query("CREATE DATABASE fresh");
    const uri = new URL(container.getConnectionUri());
    uri.pathname = "/fresh";
    await applyTo(uri.toString(), MIGRATIONS);

    const fresh = new Pool({ connectionString: uri.toString() });
    expect(await tables(fresh)).toContain("store_subscriptions");
    await fresh.end();
  });
});

describe("store_subscriptions", () => {
  it("never stores one purchase for two accounts", async () => {
    const owned = await subscriptions.upsert(db, purchase());
    const again = await subscriptions.upsert(
      db,
      purchase({ userId: "user-b", providerUpdatedAt: T2 }),
    );

    expect(again.id).toBe(owned.id);
    expect(again.userId).toBe("user-a");
    expect(await subscriptions.findByUserId(db, "user-b")).toEqual([]);
    const { rows } = await pool.query(
      "SELECT count(*)::int AS count FROM store_subscriptions",
    );
    expect(rows).toEqual([{ count: 1 }]);
  });

  it("refuses a second row for a purchase at the database", async () => {
    await subscriptions.upsert(db, purchase());
    await expect(
      pool.query(
        `INSERT INTO store_subscriptions
           (id, user_id, provider, environment, external_id, product_id,
            provider_status, status, provider_updated_at, last_verified_at)
         VALUES ('ssub_other', 'user-b', 'APP_STORE', 'PRODUCTION',
           'original-transaction', 'p', '1', 'ACTIVE', now(), now())`,
      ),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("keeps sandbox and production purchases apart", async () => {
    await subscriptions.upsert(db, purchase());
    const sandbox = await subscriptions.upsert(
      db,
      purchase({ environment: StoreEnvironment.SANDBOX, userId: "user-b" }),
    );

    expect(sandbox.userId).toBe("user-b");
  });

  it("gives an unclaimed purchase to the first account that presents it", async () => {
    await subscriptions.upsert(db, purchase({ userId: null }));
    const claimed = await subscriptions.upsert(
      db,
      purchase({ userId: "user-b", providerUpdatedAt: T2 }),
    );

    expect(claimed.userId).toBe("user-b");
  });

  it("lets newer state replace older state", async () => {
    await subscriptions.upsert(db, purchase());
    const newer = await subscriptions.upsert(
      db,
      purchase({
        status: StoreSubscriptionStatus.GRACE,
        willRenew: false,
        providerUpdatedAt: T2,
      }),
    );

    expect(newer).toMatchObject({
      status: StoreSubscriptionStatus.GRACE,
      willRenew: false,
      providerUpdatedAt: T2,
    });
  });

  it("ignores a stale event and returns the state already stored", async () => {
    await subscriptions.upsert(db, purchase({ providerUpdatedAt: T2 }));
    const stale = await subscriptions.upsert(
      db,
      purchase({
        status: StoreSubscriptionStatus.EXPIRED,
        providerUpdatedAt: T1,
      }),
    );

    expect(stale).toMatchObject({
      status: StoreSubscriptionStatus.ACTIVE,
      providerUpdatedAt: T2,
    });
  });

  it("records a repeat read at the same provider time as a verification", async () => {
    await subscriptions.upsert(db, purchase());
    const verified = await subscriptions.upsert(
      db,
      purchase({ lastVerifiedAt: T2 }),
    );

    expect(verified.lastVerifiedAt).toEqual(T2);
  });
});

describe("store_billing_events", () => {
  const event = {
    provider: StoreProvider.GOOGLE_PLAY,
    environment: StoreEnvironment.PRODUCTION,
    externalEventId: "message-1",
  };

  it("records a redelivered notification once", async () => {
    const first = await events.record(db, event);
    const redelivery = await events.record(db, event);

    expect(first.isNew).toBe(true);
    expect(redelivery.isNew).toBe(false);
    expect(redelivery.event.id).toBe(first.event.id);
    await expect(
      pool.query(
        `INSERT INTO store_billing_events
           (id, provider, environment, external_event_id)
         VALUES ('sbev_other', 'GOOGLE_PLAY', 'PRODUCTION', 'message-1')`,
      ),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("keeps the same event ID apart across providers and environments", async () => {
    await events.record(db, event);
    const sandbox = await events.record(db, {
      ...event,
      environment: StoreEnvironment.SANDBOX,
    });
    const apple = await events.record(db, {
      ...event,
      provider: StoreProvider.APP_STORE,
    });

    expect([sandbox.isNew, apple.isNew]).toEqual([true, true]);
  });

  it("counts attempts, and clears the error once processed", async () => {
    const { event: recorded } = await events.record(db, event);
    await events.markFailed(db, recorded.id, "store read timed out");

    const failed = await events.record(db, event);
    expect(failed.event).toMatchObject({
      attempts: 1,
      lastError: "store read timed out",
      processedAt: null,
    });

    await events.markProcessed(db, recorded.id);
    const processed = await events.record(db, event);
    expect(processed.event).toMatchObject({ attempts: 2, lastError: null });
    expect(processed.event.processedAt).toBeInstanceOf(Date);
  });
});

describe("billing_identities", () => {
  it("returns the same identifiers on every read", async () => {
    const first = await identities.findOrCreate(db, "user-a");
    const second = await identities.findOrCreate(db, "user-a");

    expect(second).toEqual(first);
  });

  it("creates one identity when two requests race", async () => {
    const [first, second] = await Promise.all([
      identities.findOrCreate(db, "user-a"),
      identities.findOrCreate(db, "user-a"),
    ]);

    expect(second.appleAppAccountToken).toBe(first.appleAppAccountToken);
  });

  it("gives each account its own identifiers within the stores' limits", async () => {
    const a = await identities.findOrCreate(db, "user-a");
    const b = await identities.findOrCreate(db, "user-b");

    expect(a.appleAppAccountToken).not.toBe(b.appleAppAccountToken);
    expect(a.googleObfuscatedAccountId).not.toBe(b.googleObfuscatedAccountId);
    expect(a.appleAppAccountToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(a.googleObfuscatedAccountId.length).toBeLessThanOrEqual(64);
  });
});
