#!/usr/bin/env bash
#
# One-command bring-up of the full development stack INCLUDING the Ask-AI
# sandbox path:
#
#   1. create .env from .env.example (generated secrets, LAN IP for Gitea)
#   2. docker compose up -d --build   (dashboard, backend-v2, ledger, gitea,
#                                      postgres ×2, redis, devdns)
#   3. provision.sh                   (gitea admin user + DB migrations)
#   4. write backend-cluster/agent-box/.dev.vars (shared ADMIN_TOKEN)
#   5. local-model mode: start `ollama serve` + alias the pinned Claude model
#      ids to DEV_SANDBOX_LOCAL_MODEL (skipped when ANTHROPIC_BASE_URL is not
#      an :11434 URL)
#   6. start agent-box under `wrangler dev` on :8787 (background, log in tmp/)
#
# Idempotent: safe to re-run any time.
#
set -euo pipefail
cd "$(dirname "$0")"

SCRIPT_DIR="$(pwd)"
REPO_ROOT="$(cd ../.. && pwd)"
AGENT_BOX_DIR="$REPO_ROOT/backend-cluster/agent-box"
WRANGLER_PORT=8787
mkdir -p tmp

# ── 1. .env ──────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
    cp .env.example .env
    gen() { openssl rand -hex 24; }
    sed -i '' \
        -e "s|^AUTH_SECRET=.*|AUTH_SECRET=$(gen)|" \
        -e "s|^COOKIE_SECRETS=.*|COOKIE_SECRETS=[\"$(gen)\"]|" \
        -e "s|^ADMIN_TOKEN=.*|ADMIN_TOKEN=$(gen)|" \
        -e "s|^FAVA_API_ADMIN_PASSWORD=.*|FAVA_API_ADMIN_PASSWORD=$(gen)|" \
        .env
    echo "✅ Created .env with generated secrets"
fi

# EXTERNAL_GITEA_HOST_NAME=auto ⇒ substitute the Mac's LAN IP: the ledger clone
# URL must be reachable from the host AND from inside the sandbox container,
# and only an IP (or localhost) keeps backend-v2 generating an http:// URL.
if grep -q '^EXTERNAL_GITEA_HOST_NAME=auto$' .env; then
    LAN_IP=""
    for iface in $(route -n get default 2>/dev/null | awk '/interface:/{print $2}') en0 en1; do
        LAN_IP="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
        [ -n "$LAN_IP" ] && break
    done
    if [ -z "$LAN_IP" ]; then
        echo "❌ Could not detect a LAN IP for EXTERNAL_GITEA_HOST_NAME." >&2
        echo "   Set it manually in .env (an IP reachable from docker containers)." >&2
        exit 1
    fi
    sed -i '' "s|^EXTERNAL_GITEA_HOST_NAME=auto$|EXTERNAL_GITEA_HOST_NAME=$LAN_IP|" .env
    echo "✅ EXTERNAL_GITEA_HOST_NAME=$LAN_IP (detected LAN IP)"
fi

# shellcheck disable=SC1091
set -a; . ./.env; set +a

# ── 2. compose stack ─────────────────────────────────────────────────────────
docker compose config --quiet
echo "🐳 Building and starting the compose stack (first build takes a while)..."
docker compose up -d --build

# ── 3. provisioning (gitea admin + migrations) ───────────────────────────────
./provision.sh

# ── 4. agent-box .dev.vars — ADMIN_TOKEN must match backend-v2's ─────────────
DEV_VARS="$AGENT_BOX_DIR/.dev.vars"
{
    echo "ADMIN_TOKEN=$ADMIN_TOKEN"
    # Keep the sandbox container alive between turns: without it wrangler dev
    # idle-stops the container mid-conversation and the bridge goes stale.
    echo "LOCAL_KEEP_ALIVE=1"
} > "$DEV_VARS"
echo "✅ Wrote agent-box .dev.vars (ADMIN_TOKEN shared with backend-v2)"

# ── 5. local model (Ollama impersonating the Anthropic API) ──────────────────
case "${ANTHROPIC_BASE_URL:-}" in
    *:11434*) ./ollama-models.sh ;;
    *) echo "ℹ️  ANTHROPIC_BASE_URL is not an Ollama URL — skipping local-model setup" ;;
esac

# ── 6. agent-box under wrangler dev ──────────────────────────────────────────
if curl -sf "http://localhost:$WRANGLER_PORT/healthz" > /dev/null 2>&1; then
    echo "✅ agent-box already answering on :$WRANGLER_PORT"
else
    if [ ! -d "$AGENT_BOX_DIR/node_modules" ]; then
        echo "📦 Installing agent-box dependencies..."
        (cd "$AGENT_BOX_DIR" && npm install --no-fund --no-audit)
    fi
    echo "🚀 Starting agent-box: wrangler dev on :$WRANGLER_PORT (log: tmp/wrangler.log)"
    (
        cd "$AGENT_BOX_DIR"
        nohup npx wrangler dev --port "$WRANGLER_PORT" \
            > "$SCRIPT_DIR/tmp/wrangler.log" 2>&1 &
        echo $! > "$SCRIPT_DIR/tmp/wrangler.pid"
    )
    printf "   waiting for /healthz"
    for _ in $(seq 1 120); do
        if curl -sf "http://localhost:$WRANGLER_PORT/healthz" > /dev/null 2>&1; then
            echo " — up"
            break
        fi
        printf "."
        sleep 2
    done
    if ! curl -sf "http://localhost:$WRANGLER_PORT/healthz" > /dev/null 2>&1; then
        echo ""
        echo "❌ agent-box did not come up — check tmp/wrangler.log" >&2
        exit 1
    fi
fi

echo ""
echo "🎉 dev-sandbox is up:"
echo "   dashboard   http://localhost:42610"
echo "   backend-v2  http://localhost:42611/healthz"
echo "   gitea       http://localhost:42612"
echo "   agent-box   http://localhost:$WRANGLER_PORT/healthz  (wrangler dev)"
echo ""
echo "   Ask-AI sandbox chat: http://localhost:42610/ledger/<owner>/<name>/ask?mode=sandbox"
