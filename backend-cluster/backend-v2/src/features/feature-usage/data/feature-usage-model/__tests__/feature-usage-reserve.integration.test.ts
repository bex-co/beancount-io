import { join } from "node:path";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import type { DbExecutor } from "@/drizzle/drizzle";
import { FeatureUsagePostgresModel } from "../postgres-impl";

const MIGRATIONS = join(process.cwd(), "src/drizzle/migrations");
const MONTH = "2026-11";
const LIMIT = 20_000;

let container: StartedPostgreSqlContainer;
let pool: Pool;
let db: DbExecutor;
const model = new FeatureUsagePostgresModel();

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:17-alpine").start();
  // Enough connections that the reservations below really run in parallel.
  pool = new Pool({ connectionString: container.getConnectionUri(), max: 20 });
  db = drizzle(pool);
  await migrate(db, { migrationsFolder: MIGRATIONS });
}, 120_000);

afterAll(async () => {
  await pool?.end();
  await container?.stop();
});

beforeEach(async () => {
  await pool.query("TRUNCATE feature_usage");
});

const reserve = (tokens: number, limit = LIMIT) =>
  model.reserveAndGetCount(db, "usr_alice", "ai_cfo", MONTH, tokens, limit);
const count = () => model.getCount(db, "usr_alice", "ai_cfo", MONTH);

describe("reserveAndGetCount", () => {
  it("creates the month's row with the first reservation", async () => {
    await expect(reserve(5_000)).resolves.toBe(5_000);
    await expect(count()).resolves.toBe(5_000);
  });

  it("adds while the count is below the limit and refuses once it is reached", async () => {
    await reserve(15_000);
    await expect(reserve(8_000)).resolves.toBe(23_000);
    await expect(reserve(1)).resolves.toBeNull();
    await expect(count()).resolves.toBe(23_000);
  });

  it("admits parallel reservations only while the limit is unspent", async () => {
    const tokens = 3_000;
    const results = await Promise.all(
      Array.from({ length: 40 }, () => reserve(tokens)),
    );

    const admitted = results.filter((r) => r !== null).length;
    expect(admitted).toBe(Math.ceil(LIMIT / tokens));
    const total = await count();
    expect(total).toBe(admitted * tokens);
    expect(total).toBeLessThanOrEqual(LIMIT + tokens);
  });
});

describe("releaseCount", () => {
  it("subtracts from the month's count without going below zero", async () => {
    await reserve(5_000);
    await model.releaseCount(db, "usr_alice", "ai_cfo", MONTH, 1_200);
    await expect(count()).resolves.toBe(3_800);
    await model.releaseCount(db, "usr_alice", "ai_cfo", MONTH, 10_000);
    await expect(count()).resolves.toBe(0);
  });

  it("creates no row for a month that has none", async () => {
    await model.releaseCount(db, "usr_alice", "ai_cfo", MONTH, 1_200);
    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM feature_usage",
    );
    expect(rows[0].n).toBe(0);
  });
});
