#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_yarn() {
  local package_dir="$1"
  (cd "$repo_root/$package_dir" && yarn lint:deadcode)
}

run_npm() {
  local package_dir="$1"
  (cd "$repo_root/$package_dir" && npm run lint:deadcode)
}

run_yarn dashboard
run_yarn mobile
run_yarn backend-cluster/backend-v2
run_yarn backend-cluster/ledger
run_npm backend-cluster/agent-box
run_yarn backend-cluster/idl/backend-v2-admin-cli
run_yarn backend-cluster/idl/beancount-ledger-cli
run_yarn backend-cluster/idl/gitea-cli
(cd "$repo_root/cli" && make deadcode)
(cd "$repo_root/cli" && uv run vulture ../scripts/check-agent-guidance.py ../skills/scripts/ci-check.py --min-confidence 100)
