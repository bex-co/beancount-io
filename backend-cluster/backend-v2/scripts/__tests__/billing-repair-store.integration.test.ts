import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { createRepairStore } from "../billing-repair-store";
import {
  applyUserRepair,
  planUserRepair,
  rollbackRepair,
} from "../reconcile-billing-core";
import { PaidCustomerPostgresModel } from "../../src/features/stripe/data/paid-customer-model/postgres-impl";
import { SubscriptionService } from "../../src/features/stripe/service/subscription-service";
import { SUBSCRIPTION_PERIOD_VERIFICATION_VERSION } from "../../src/features/stripe/service/subscription-plan";
import { AuthorizationService } from "../../src/server/api/authorization";
let container: StartedPostgreSqlContainer;
let pool: Pool;
beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:17-alpine").start();
  pool = new Pool({ connectionString: container.getConnectionUri() });
  await pool.query(
    "CREATE TABLE users(id text PRIMARY KEY, create_at timestamp NOT NULL DEFAULT now())",
  );
  await pool.query(`CREATE TABLE paid_customers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id text NOT NULL,client_id text NOT NULL,stripe_customer_id text NOT NULL,
    current_period_end timestamp,email text,name text,phone text,created_at timestamp NOT NULL DEFAULT now(),updated_at timestamp NOT NULL DEFAULT now(),UNIQUE(user_id,client_id))`);
  await pool.query(
    "INSERT INTO paid_customers(user_id,client_id,stripe_customer_id,current_period_end) VALUES ('historical','beancount-web-prod','cus_historical','2038-01-01')",
  );
  await pool.query(
    readFileSync(
      join(
        process.cwd(),
        "src/drizzle/migrations/0020_verified_subscription_period.sql",
      ),
      "utf8",
    ),
  );
  expect(
    (
      await pool.query(
        "SELECT current_period_end, period_verification_version FROM paid_customers WHERE user_id='historical'",
      )
    ).rows,
  ).toEqual([
    {
      current_period_end: new Date("2038-01-01T00:00:00"),
      period_verification_version: null,
    },
  ]);
}, 120000);
afterAll(async () => {
  await pool?.end();
  await container?.stop();
});
beforeEach(async () => {
  await pool.query("TRUNCATE paid_customers");
  await pool.query(`INSERT INTO paid_customers(user_id,client_id,stripe_customer_id,current_period_end)
 VALUES ('u','beancount-web-prod','cus_live',null),('u','beancount-web-dev','cus_old','2038-01-01')`);
});
const load = async () =>
  [
    {
      id: "sub_live",
      customer: "cus_live",
      clientId: "beancount-web-prod",
      status: "active",
      livemode: true,
      items: {
        data: [
          {
            price: { id: "price_1SyPdcEqsEqs2tLVCWEgU1PZ" },
            current_period_end: 2000000000,
          },
        ],
      },
    },
  ] as any;
it("applies, verifies, repeats without writes and rolls back a real PostgreSQL transaction", async () => {
  const store = createRepairStore(pool);
  const original = await store.read("u");
  const plan = await planUserRepair("u", original, load);
  const journal = jest.fn();
  const after = await applyUserRepair(plan, store, load, journal);
  expect(journal).toHaveBeenCalledTimes(1);
  expect(after.find((row) => row.clientId.endsWith("prod"))?.period).toBe(
    "2033-05-18T03:33:20.000Z",
  );
  expect(after.find((row) => row.clientId.endsWith("dev"))?.period).toBeNull();
  const repeat = await planUserRepair("u", await store.read("u"), load);
  expect(repeat.changes).toEqual([]);
  expect(await applyUserRepair(repeat, store, load, journal)).toEqual(after);
  expect(journal).toHaveBeenCalledTimes(1);
  await store.compareAndSet(rollbackRepair(plan, after));
  expect((await store.read("u")).map((row) => row.period)).toEqual(
    original.map((row) => row.period),
  );
});
it("rejects a concurrent webhook/cache change before any transaction writes", async () => {
  const store = createRepairStore(pool);
  const plan = await planUserRepair("u", await store.read("u"), load);
  await pool.query(
    "UPDATE paid_customers SET updated_at=clock_timestamp(),current_period_end='2035-01-01' WHERE client_id='beancount-web-prod'",
  );
  await expect(store.compareAndSet(plan)).rejects.toThrow(
    "Concurrent billing update",
  );
  expect(
    (await store.read("u")).find((row) => row.clientId.endsWith("dev"))?.period,
  ).toBe("2038-01-01T00:00:00.000Z");
});
it("requires verification before a future live period can serve cached paid status", async () => {
  const model = new PaidCustomerPostgresModel();
  const db = drizzle(pool);
  // The future test row must not satisfy the status cache fast path.
  expect(await model.findByUserIdWithActivePeriod(db, "u")).toBeNull();
  const live = (await model.findByUserIdAndClientId(
    db,
    "u",
    "beancount-web-prod",
  ))!;
  const unverified = (await model.updateCustomerById(db, live.id, {
    currentPeriodEnd: new Date("2038-01-01T00:00:00Z"),
  }))!;
  expect(unverified.periodVerificationVersion).toBeUndefined();
  expect(
    await model.updatePeriodIfUnchanged(
      db,
      unverified,
      unverified.currentPeriodEnd!,
      SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
      "PREMIUM",
    ),
  ).toBe(true);
  expect(await model.findByUserIdWithActivePeriod(db, "u")).toMatchObject({
    id: live.id,
    userId: "u",
    clientId: "beancount-web-prod",
    stripeCustomerId: "cus_live",
    periodVerificationVersion: SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
  });
  expect(
    await model.findByUserIdWithActivePeriod(db, "someone-else"),
  ).toBeNull();
  await model.updateCustomerById(db, live.id, {
    currentPeriodEnd: new Date(0),
  });
  expect(await model.findByUserIdWithActivePeriod(db, "u")).toBeNull();
});
it("normal request compare-and-set cannot overwrite a newer webhook or another customer", async () => {
  const model = new PaidCustomerPostgresModel();
  const db = drizzle(pool);
  const live = (await model.findByUserIdAndClientId(
    db,
    "u",
    "beancount-web-prod",
  ))!;
  // Use the model's millisecond precision for the initial version, then advance it.
  await model.updateCustomerById(db, live.id, {
    currentPeriodEnd: new Date(2000000000000),
  });
  expect(
    await model.updatePeriodIfUnchanged(
      db,
      live,
      new Date(1900000000000),
      SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
      "PREMIUM",
    ),
  ).toBe(false);
  const fresh = (await model.findByUserIdAndClientId(
    db,
    "u",
    "beancount-web-prod",
  ))!;
  expect(fresh.periodVerificationVersion).toBeUndefined();
  expect(
    await model.updatePeriodIfUnchanged(
      db,
      { ...fresh, stripeCustomerId: "cus_foreign" },
      new Date(2100000000000),
      SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
      "PREMIUM",
    ),
  ).toBe(false);
  expect(
    await model.updatePeriodIfUnchanged(
      db,
      fresh,
      new Date(2100000000000),
      SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
      "PREMIUM",
    ),
  ).toBe(true);
  expect(
    (
      await model.findByUserIdAndClientId(db, "u", "beancount-web-dev")
    )?.currentPeriodEnd?.toISOString(),
  ).toBe("2038-01-01T00:00:00.000Z");
});

it("preserves microsecond versions written by reconciliation and rejects intervening writes", async () => {
  const store = createRepairStore(pool);
  const plan = await planUserRepair("u", await store.read("u"), load);
  await store.compareAndSet(plan);
  const model = new PaidCustomerPostgresModel();
  const db = drizzle(pool);
  const repaired = (await model.findByUserIdAndClientId(
    db,
    "u",
    "beancount-web-prod",
  ))!;
  // The maintenance transaction wrote PostgreSQL microseconds, which JS Date cannot retain.
  expect(
    await model.updatePeriodIfUnchanged(
      db,
      repaired,
      new Date(2000000000000),
      SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
      "PREMIUM",
    ),
  ).toBe(true);
  expect(
    await model.updatePeriodIfUnchanged(
      db,
      repaired,
      new Date(2100000000000),
      SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
      "PREMIUM",
    ),
  ).toBe(false);
});

function statusService() {
  const model = new PaidCustomerPostgresModel();
  const db = drizzle(pool);
  const stripe = { listSubscriptions: jest.fn(load) };
  const service = new SubscriptionService(
    stripe as any,
    {
      paidCustomer: model,
      storeSubscription: { findByUserId: async () => [] },
    } as any,
    db,
    new AuthorizationService({
      check: async ({ user, object }) => user === object,
    }),
  );
  const identity = {
    userId: "u",
    method: "session",
    scopes: new Set<string>(),
  } as const;
  return {
    model,
    db,
    stripe,
    read: () => service.subscriptionStatus(identity, "active"),
  };
}

it("revalidates a poisoned historical prod cache and never grants paid status from its future date", async () => {
  const t = statusService();
  await pool.query(
    "UPDATE paid_customers SET current_period_end='2038-01-01' WHERE client_id='beancount-web-prod'",
  );
  t.stripe.listSubscriptions.mockResolvedValue([]);
  expect(await t.read()).toEqual({
    hasActiveSubscription: false,
    subscriptions: [],
  });
  expect(t.stripe.listSubscriptions).toHaveBeenCalledTimes(1);
  expect(
    await t.model.findByUserIdAndClientId(t.db, "u", "beancount-web-prod"),
  ).toMatchObject({
    currentPeriodEnd: undefined,
    periodVerificationVersion: SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
  });
});

it("verifies an unchanged historical date once and then uses the paid cache", async () => {
  const t = statusService();
  const live = (await t.model.findByUserIdAndClientId(
    t.db,
    "u",
    "beancount-web-prod",
  ))!;
  await t.model.updateCustomerById(t.db, live.id, {
    currentPeriodEnd: new Date(2000000000000),
  });
  expect((await t.read()).hasActiveSubscription).toBe(true);
  t.stripe.listSubscriptions.mockRejectedValue(
    new Error("provider unavailable"),
  );
  expect((await t.read()).hasActiveSubscription).toBe(true);
  expect(t.stripe.listSubscriptions).toHaveBeenCalledTimes(1);
});

it("does not trust or modify a historical cache when Stripe is unavailable", async () => {
  const t = statusService();
  await pool.query(
    "UPDATE paid_customers SET current_period_end='2038-01-01' WHERE client_id='beancount-web-prod'",
  );
  const before = await t.model.findByUserIdAndClientId(
    t.db,
    "u",
    "beancount-web-prod",
  );
  t.stripe.listSubscriptions.mockRejectedValue(
    new Error("provider unavailable"),
  );
  await expect(t.read()).rejects.toThrow("provider unavailable");
  expect(
    await t.model.findByUserIdAndClientId(t.db, "u", "beancount-web-prod"),
  ).toEqual(before);
});

it("preserves verification on metadata edits and invalidates it on period or binding writes", async () => {
  const t = statusService();
  await t.read();
  let live = (await t.model.findByUserIdAndClientId(
    t.db,
    "u",
    "beancount-web-prod",
  ))!;
  const updated = (await t.model.updateCustomerById(t.db, live.id, {
    name: "Updated name",
  }))!;
  expect(updated.periodVerificationVersion).toBe(
    SUBSCRIPTION_PERIOD_VERIFICATION_VERSION,
  );
  expect(
    (
      await t.model.updateCustomerById(t.db, live.id, {
        currentPeriodEnd: live.currentPeriodEnd,
      })
    )?.periodVerificationVersion,
  ).toBeUndefined();
  await t.read();
  live = (await t.model.findByUserIdAndClientId(
    t.db,
    "u",
    "beancount-web-prod",
  ))!;
  await t.model.updateByUserIdAndClientId(t.db, "u", live.clientId, {
    clientId: "beancount-web-other",
  });
  expect(
    (await t.model.findByUserIdAndClientId(t.db, "u", "beancount-web-other"))
      ?.periodVerificationVersion,
  ).toBeUndefined();
});

it("invalidates verification when a repair or rollback writes a period", async () => {
  const t = statusService();
  await t.read();
  const store = createRepairStore(pool);
  const original = await store.read("u");
  const plan = await planUserRepair("u", original, async () => []);
  const after = await store.compareAndSet(plan);
  expect(
    (await t.model.findByUserIdAndClientId(t.db, "u", "beancount-web-prod"))
      ?.periodVerificationVersion,
  ).toBeUndefined();
  await store.compareAndSet(rollbackRepair(plan, after));
  expect(
    (await t.model.findByUserIdAndClientId(t.db, "u", "beancount-web-prod"))
      ?.periodVerificationVersion,
  ).toBeUndefined();
});

it("runs the default CLI preview and bounded checkpoint/apply/rollback without provider or account writes", async () => {
  await pool.query("TRUNCATE paid_customers,users");
  await pool.query("INSERT INTO users(id) VALUES ('a'),('b'),('c')");
  await pool.query(
    "INSERT INTO paid_customers(user_id,client_id,stripe_customer_id,current_period_end) VALUES ('a','beancount-web-dev','cus_old','2038-01-01')",
  );
  const directory = mkdtempSync(join(tmpdir(), "billing-fixture-"));
  const run = (...args: string[]) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          "-r",
          "ts-node/register/transpile-only",
          "-r",
          "tsconfig-paths/register",
          "scripts/reconcile-billing.ts",
          ...args,
        ],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          env: {
            ...process.env,
            POSTGRES_BACKEND_URI: container.getConnectionUri(),
            STRIPE_PRIVATE_KEY: "sk_live_synthetic_fixture",
            DOTENV_CONFIG_QUIET: "true",
          },
        },
      ),
    );
  try {
    const file = join(directory, "preview.json");
    const summary = run("--output", file, "--limit", "2");
    const plan = JSON.parse(readFileSync(file, "utf8"));
    expect(summary).toMatchObject({
      scanned: 2,
      repairable: 1,
      remaining: 1,
      classifications: { "test-only": 1, "no-history": 1 },
    });
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect((await createRepairStore(pool).read("a"))[0].period).toBe(
      "2038-01-01T00:00:00.000Z",
    );
    const journal = join(directory, "apply.jsonl");
    expect(
      run(
        "--apply",
        file,
        "--fingerprint",
        plan.fingerprint,
        "--journal",
        journal,
      ),
    ).toMatchObject({ applied: 1, unchanged: 1 });
    expect((await createRepairStore(pool).read("a"))[0].period).toBeNull();
    const next = join(directory, "next.json");
    expect(
      run(
        "--output",
        next,
        "--limit",
        "2",
        "--after",
        plan.next,
        "--through",
        plan.through,
        "--created-before",
        plan.createdBefore,
      ),
    ).toMatchObject({ scanned: 1, remaining: 0 });
    expect(
      run("--rollback", journal, "--journal", join(directory, "undo.jsonl")),
    ).toEqual({ restored: 1 });
    expect((await createRepairStore(pool).read("a"))[0].period).toBe(
      "2038-01-01T00:00:00.000Z",
    );
    expect(
      Number((await pool.query("SELECT count(*) FROM users")).rows[0].count),
    ).toBe(3);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 30000);
