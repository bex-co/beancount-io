#!/usr/bin/env bash
#
# Local-model mode: make the host's Ollama impersonate the Anthropic API for
# the Ask-AI sandbox. backend-v2 pins Claude model ids (ask-agent-route.ts),
# and Claude Code inside the sandbox may also call a small/fast Haiku model —
# so alias each of those ids to DEV_SANDBOX_LOCAL_MODEL. Aliases are created
# with `ollama create` + a Modelfile (weights are shared, not duplicated)
# because the alias must also raise num_ctx: Claude Code's system prompt alone
# overflows the typical 4k default and silently breaks tool calling.
#
# Reads DEV_SANDBOX_LOCAL_MODEL / OLLAMA_MODELS from the environment (up.sh
# sources .env first). Safe to re-run.
#
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p tmp

MODEL="${DEV_SANDBOX_LOCAL_MODEL:-qwen3:32b}"
NUM_CTX="${DEV_SANDBOX_LOCAL_MODEL_CTX:-32768}"
# The Claude model ids that will hit Ollama's /v1/messages endpoint:
#   - claude-sonnet-5 (+ dated variant): ASK_AGENT_MODEL pinned in backend-v2
#   - the Haiku ids: Claude Code's default small/fast model across versions
ALIASES=(
    "claude-sonnet-5"
    "claude-sonnet-5-20250929"
    "claude-haiku-4-5-20251001"
    "claude-3-5-haiku-20241022"
)

if [ -n "${OLLAMA_MODELS:-}" ]; then
    export OLLAMA_MODELS
fi

if ! command -v ollama > /dev/null 2>&1; then
    echo "❌ ollama is not installed (brew install ollama), and ANTHROPIC_BASE_URL" >&2
    echo "   points at :11434. Install it or configure a real Anthropic key in .env." >&2
    exit 1
fi

if ! curl -sf http://localhost:11434/api/version > /dev/null 2>&1; then
    echo "🚀 Starting ollama serve (log: tmp/ollama.log)..."
    export OLLAMA_CONTEXT_LENGTH="$NUM_CTX"
    nohup ollama serve > tmp/ollama.log 2>&1 &
    echo $! > tmp/ollama.pid
    for _ in $(seq 1 30); do
        curl -sf http://localhost:11434/api/version > /dev/null 2>&1 && break
        sleep 1
    done
    if ! curl -sf http://localhost:11434/api/version > /dev/null 2>&1; then
        echo "❌ ollama serve did not come up — check tmp/ollama.log" >&2
        exit 1
    fi
fi

if ! ollama show "$MODEL" > /dev/null 2>&1; then
    echo "❌ Local model '$MODEL' is not available in Ollama." >&2
    echo "   Pull it first (ollama pull $MODEL) or set DEV_SANDBOX_LOCAL_MODEL in .env" >&2
    echo "   to a model you already have (ollama list)." >&2
    exit 1
fi

MODELFILE="$(mktemp)"
trap 'rm -f "$MODELFILE"' EXIT
printf 'FROM %s\nPARAMETER num_ctx %s\n' "$MODEL" "$NUM_CTX" > "$MODELFILE"
for alias in "${ALIASES[@]}"; do
    ollama create "$alias" -f "$MODELFILE" > /dev/null 2>&1
done
echo "✅ Ollama serving; aliases → $MODEL (num_ctx=$NUM_CTX): ${ALIASES[*]}"
