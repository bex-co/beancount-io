#!/usr/bin/env bash
#
# Print Gitea's existing SSH host key for backend-v2's policy-enforcing SSH
# proxy. Redirect stdout to a protected scratch file; never paste the private
# key into terminal history or commit it.
#
# Usage:
#   ./print-ssh-host-key.sh > tmp/gitea-host-key
#   ./print-ssh-host-key.sh --fingerprint

set -euo pipefail

cd "$(dirname "$0")"

GITEA_SERVICE="${GITEA_SERVICE:-gitea}"
KEY_PATH="${GITEA_HOST_KEY_PATH:-/data/ssh/ssh_host_ed25519_key}"

if [ "${1:-}" = "--fingerprint" ]; then
    docker compose exec -T "$GITEA_SERVICE" ssh-keygen -lf "${KEY_PATH}.pub"
    exit 0
fi

if [ -t 1 ]; then
    cat >&2 <<'WARN'
This command outputs a PRIVATE KEY. Redirect it to the gitignored tmp/ folder:

  mkdir -p tmp
  ./print-ssh-host-key.sh > tmp/gitea-host-key

See README.md for the remaining SSH setup steps.
WARN
    exit 1
fi

docker compose exec -T "$GITEA_SERVICE" cat "$KEY_PATH"
