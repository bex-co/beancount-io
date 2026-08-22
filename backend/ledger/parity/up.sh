#!/usr/bin/env bash
# Bring up the dual-target parity stack, wait for health, and seed fixtures.
# Idempotent — safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.parity.yml"

$COMPOSE up -d --build

wait_for() {
  local url=$1 name=$2
  for _ in $(seq 1 45); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "✓ $name healthy"
      return 0
    fi
    sleep 2
  done
  echo "✗ $name did not become healthy: $url" >&2
  exit 1
}

wait_for http://localhost:13801/api/healthz "parity-gitea"
wait_for http://localhost:18002/healthz "parity-ledger-v2"

# Admin user for seeding (gitea CLI is idempotent-unfriendly; tolerate exists)
$COMPOSE exec -T -u git gitea gitea admin user create \
  --admin --username parityadmin --password parityadmin123 \
  --email parityadmin@example.com --must-change-password=false \
  2>/dev/null || echo "parityadmin already exists"

# The Python oracle (and its bean-example CLI) is retired — book-large is
# always skipped now; seed.ts handles BEAN_EXAMPLE_FILE being unset.

cd ..
yarn ts-node -r tsconfig-paths/register --transpile-only parity/seed.ts

echo "parity stack ready: v2=http://localhost:18002"
