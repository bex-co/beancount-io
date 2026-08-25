#!/usr/bin/env bash
#
# Stop the dev-sandbox stack: compose services, the wrangler-dev agent-box
# worker (and any sandbox containers it spawned), and — only if up.sh started
# it — the local ollama server. Data survives in ./data/.
#
set -euo pipefail
cd "$(dirname "$0")"

echo "🛑 Stopping compose stack..."
docker compose down

if [ -f tmp/wrangler.pid ]; then
    PID="$(cat tmp/wrangler.pid)"
    if kill -0 "$PID" 2>/dev/null; then
        echo "🛑 Stopping wrangler dev (pid $PID)..."
        # wrangler forks workerd children; kill the process group when possible.
        kill "$PID" 2>/dev/null || true
    fi
    rm -f tmp/wrangler.pid
fi

# Sandbox containers wrangler spawned (wrangler tags the built image
# cloudflare-dev/sandbox:<hash>).
SANDBOXES="$(docker ps -q --filter "ancestor=cloudflare-dev/sandbox" 2>/dev/null || true)"
if [ -n "$SANDBOXES" ]; then
    echo "🛑 Stopping leftover sandbox containers..."
    # shellcheck disable=SC2086
    docker stop $SANDBOXES > /dev/null || true
fi

if [ -f tmp/ollama.pid ]; then
    PID="$(cat tmp/ollama.pid)"
    if kill -0 "$PID" 2>/dev/null; then
        echo "🛑 Stopping ollama serve (pid $PID, started by up.sh)..."
        kill "$PID" 2>/dev/null || true
    fi
    rm -f tmp/ollama.pid
fi

echo "✅ dev-sandbox stopped (service data kept in ./data/)"
