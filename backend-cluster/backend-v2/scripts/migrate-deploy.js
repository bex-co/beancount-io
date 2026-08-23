/**
 * Apply pending Drizzle migrations, then exit.
 *
 * This is the deploy-time counterpart of deploy/mac/apply-migrations.sh, meant
 * to run as a platform pre-deploy step so a failed migration fails the deploy
 * and leaves the previous revision serving.
 *
 * `drizzle-kit migrate` is deliberately not used: it exits 1 with an empty
 * stderr and applies nothing (see the shell script's header). This drives
 * drizzle-orm's own migrator, which is the documented path and reports errors.
 *
 * Plain CommonJS on purpose — it runs with bare `node`, no ts-node, no aliases.
 */
const path = require("node:path");

const { drizzle } = require("drizzle-orm/node-postgres");
const { migrate } = require("drizzle-orm/node-postgres/migrator");
const { Client } = require("pg");

const MIGRATIONS_FOLDER = path.join(__dirname, "..", "src", "drizzle", "migrations");

async function main() {
  const connectionString = process.env.POSTGRES_BACKEND_URI;
  if (!connectionString) {
    throw new Error("POSTGRES_BACKEND_URI is not set");
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
    console.log("migrations applied");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`migration failed: ${error.stack || error.message}`);
  process.exit(1);
});
