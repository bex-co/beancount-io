#!/usr/bin/env bash
#
# Print Gitea's SSH host key, for use as SSH_PROXY_HOST_KEY.
#
# The SSH proxy takes over the published SSH port. Presenting a *new* host key
# there gives every client that has connected before:
#
#   @@@@ WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED! @@@@
#
# which is the same message a man-in-the-middle produces, and git refuses to
# continue until the user edits known_hosts. Reusing Gitea's existing key makes
# the switch invisible instead.
#
# The key is a secret. It is printed to stdout so it can be piped into an .env
# file that is never committed; do not paste it into a shell history.
#
# Usage:
#   ./print-ssh-host-key.sh                    # print it (stdout must be redirected)
#   ./print-ssh-host-key.sh --fingerprint      # print only the fingerprint
#
set -euo pipefail

cd "$(dirname "$0")"

GITEA_SERVICE="${GITEA_SERVICE:-gitea}"
KEY_PATH="${GITEA_HOST_KEY_PATH:-/data/ssh/ssh_host_ed25519_key}"

if [ "${1:-}" = "--fingerprint" ]; then
    docker compose exec -T "$GITEA_SERVICE" \
        sh -c "ssh-keygen -lf ${KEY_PATH}.pub"
    exit 0
fi

if [ -t 1 ]; then
    cat >&2 <<'WARN'
This prints a PRIVATE KEY to your terminal. Redirect it instead, e.g.

  ./print-ssh-host-key.sh > /tmp/hostkey && \
    SSH_PROXY_HOST_KEY="$(cat /tmp/hostkey)" docker compose up -d backend-v2 && \
    rm -f /tmp/hostkey

Re-run with output redirected to continue.
WARN
    exit 1
fi

docker compose exec -T "$GITEA_SERVICE" cat "$KEY_PATH"
