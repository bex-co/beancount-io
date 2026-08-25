#!/usr/bin/env bash
#
# Apply backend-v2's pending database migrations.
#
# `yarn migrate` (drizzle-kit) does not work here: it exits 1 with an empty
# stderr and applies nothing, whether or not there is anything to apply. So
# this drives drizzle-orm's own migrator instead, which is the same code the
# library documents, reports its errors, and runs inside the backend-v2
# container where the migration files and dependencies already are.
#
# The migrator decides what to run by timestamp, not by hash: it takes the
# latest `created_at` in `drizzle.__drizzle_migrations` and applies every
# migration in `meta/_journal.json` whose `when` is greater, in one transaction.
#
# Usage:
#   ./apply-migrations.sh            # show what is pending, apply nothing
#   ./apply-migrations.sh --yes      # apply
#
set -euo pipefail

cd "$(dirname "$0")"

APPLY=0
while [ $# -gt 0 ]; do
    case "$1" in
        --yes|-y)  APPLY=1 ;;
        --dry-run) APPLY=0 ;;
        -h|--help) sed -n '3,17p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "Unknown argument: $1" >&2; exit 2 ;;
    esac
    shift
done

SERVICE="${BACKEND_SERVICE:-backend-v2}"

run_node() {
    docker compose exec -T "$SERVICE" node -e "$1"
}

PENDING_JS='
const fs = require("fs");
const journal = JSON.parse(fs.readFileSync("/app/src/drizzle/migrations/meta/_journal.json", "utf8"));
const { Client } = require("pg");
(async () => {
  const client = new Client({ connectionString: process.env.POSTGRES_BACKEND_URI });
  await client.connect();
  let last = 0;
  try {
    const r = await client.query("SELECT max(created_at) AS m FROM drizzle.__drizzle_migrations");
    last = Number(r.rows[0].m || 0);
  } catch {
    // No journal table yet: everything is pending.
  }
  const pending = journal.entries.filter((e) => e.when > last);
  console.log("applied through: " + (last || "(nothing)"));
  console.log("pending: " + pending.length);
  for (const e of pending) console.log("  " + e.tag);
  await client.end();
})().catch((e) => { console.error("ERROR: " + (e.stack || e.message)); process.exit(1); });
'

APPLY_JS='
const { drizzle } = require("drizzle-orm/node-postgres");
const { migrate } = require("drizzle-orm/node-postgres/migrator");
const { Client } = require("pg");
(async () => {
  const client = new Client({ connectionString: process.env.POSTGRES_BACKEND_URI });
  await client.connect();
  await migrate(drizzle(client), { migrationsFolder: "/app/src/drizzle/migrations" });
  console.log("migrations applied");
  await client.end();
})().catch((e) => { console.error("ERROR: " + (e.stack || e.message)); process.exit(1); });
'

echo "Service : $SERVICE"
echo "Mode    : $([ "$APPLY" = 1 ] && echo APPLY || echo 'DRY RUN')"
echo

run_node "$PENDING_JS"

if [ "$APPLY" != 1 ]; then
    echo
    echo "Dry run — nothing applied. Re-run with --yes."
    exit 0
fi

echo
run_node "$APPLY_JS"
echo
run_node "$PENDING_JS"
