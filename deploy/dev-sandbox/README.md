# deploy/dev-sandbox — full dev stack + the Ask-AI sandbox

Run everything the Ask-AI sandbox chat needs, locally, from this repository:

- the **compose half** (like [`../docker-mac/`](../docker-mac/), on its own
  ports): dashboard, backend-v2, ledger service, Gitea, PostgreSQL ×2, Redis,
  plus a `devdns` sidecar;
- the **agent-box worker** (`backend-cluster/agent-box`) under `wrangler dev`
  on the host — it is a Cloudflare Worker with a Durable-Object container
  binding, so it cannot live inside compose;
- optionally, a **local Ollama model impersonating the Anthropic API**, so the
  in-sandbox Claude Code agent works with zero cloud credentials.

This is the target to use when developing or demoing
`http://localhost:42610/ledger/<owner>/<name>/ask?mode=sandbox`.

## Quick start

```zsh
cd deploy/dev-sandbox
./up.sh          # builds + starts everything; idempotent, re-run any time
```

`up.sh` creates `.env` from `.env.example` on first run (generated secrets,
your LAN IP for the Gitea clone URL), brings up compose, provisions Gitea and
the database, writes `backend-cluster/agent-box/.dev.vars` with the shared
`ADMIN_TOKEN`, sets up the local model (default `qwen3:32b` via Ollama), and
starts `wrangler dev` on `:8787`.

Then:

1. Open http://localhost:42610 and sign up (`/auth/sign-up`). The 4-digit
   email OTP is **printed to backend logs** in dev:
   `docker compose logs backend-v2 | grep -i otp`.
2. Create a ledger on the welcome page (default `my-book`).
3. Open `http://localhost:42610/ledger/<username>/my-book/ask?mode=sandbox`
   and chat. The first turn is slow: the sandbox container image is built,
   the ledger repo is cloned, and the ACP bridge bootstraps.

Stop everything with `./down.sh` (data survives in `./data/`).

## Ports

| Host port | Service    | URL                                       |
| --------- | ---------- | ----------------------------------------- |
| 42610     | dashboard  | http://localhost:42610                    |
| 42611     | backend-v2 | http://localhost:42611/api-gateway/, `/healthz` |
| 42612     | gitea      | http://localhost:42612                    |
| 8787      | agent-box  | http://localhost:8787/healthz (wrangler dev, host process) |
| 11434     | ollama     | http://localhost:11434 (host process, local-model mode) |

Ports deliberately do not overlap docker-mac's 42600-42602, so both stacks can
run side by side. Check conflicts: `lsof -iTCP:42610-42612 -sTCP:LISTEN`.

## How the sandbox path is wired

```
browser ──POST /api-gateway/ask-agent──▶ backend-v2 (compose)
   backend-v2 ──HTTP + x-admin-token──▶ agent-box control plane (wrangler dev :8787, host)
      agent-box ──Durable Object──▶ Cloudflare Sandbox container (docker, host)
         container: git clone http://<LAN-IP>:42612/<owner>/<name>.git
         container: claude-agent-acp (Claude Code) ⇄ ANTHROPIC_BASE_URL
   backend-v2 ◀──ACP bridge WebSocket── http://8080-<sandbox>-<token>.host.docker.internal:8787
```

Three pieces of glue make this work locally:

- **Shared `ADMIN_TOKEN`** — backend-v2's token must equal the worker's
  (`agent-box/.dev.vars`); `up.sh` keeps them in sync. Without it the control
  plane returns 401.
- **`devdns`** — the harness bridge preview URL is a *subdomain* of
  `host.docker.internal`, which Docker's embedded DNS cannot resolve. The
  `devdns` dnsmasq sidecar (static IP `172.28.100.53`) answers
  `*.host.docker.internal` with the host gateway and forwards everything else
  to embedded DNS; backend-v2's `dns:` points at it.
- **LAN-IP clone URL** — the sandbox container clones the ledger from Gitea,
  so `EXTERNAL_GITEA_HOST_NAME` must be reachable from inside that container
  *and* stay an IP/localhost so the URL is generated as plain `http://`.
  `up.sh` detects and pins your LAN IP; re-run with a fresh `.env` (or edit it)
  when your network changes.

## Model credentials

Default is **local-model mode**: `ANTHROPIC_BASE_URL` points at the host's
Ollama (`:11434`), `ANTHROPIC_AUTH_TOKEN=ollama`, and `ollama-models.sh`
aliases the Claude model ids the backend pins (`claude-sonnet-4-5-*`, Haiku
small/fast ids) to `DEV_SANDBOX_LOCAL_MODEL` (default `qwen3:32b` — pull it
first, or point at any tool-calling model you have). Ollama's native Anthropic
`/v1/messages` compatibility does the rest. Note the base URL also applies to
backend-v2's own LLM features.

To use the real Anthropic API instead: in `.env` set
`ANTHROPIC_API_KEY=sk-ant-...`, clear `ANTHROPIC_AUTH_TOKEN`, and **delete the
`ANTHROPIC_BASE_URL` line** (an empty value crashes backend-v2 at startup),
then `docker compose up -d backend-v2`.

## Common commands

```zsh
./up.sh                          # (re)start everything, reapply provisioning
./down.sh                        # stop compose + wrangler (+ ollama if we started it)
docker compose ps                # compose status + health
docker compose logs -f backend-v2
tail -f tmp/wrangler.log         # agent-box worker + sandbox container logs
./apply-migrations.sh            # show pending backend migrations (--yes applies)
docker compose logs backend-v2 | grep -i otp   # sign-up OTP in dev
```

## Troubleshooting

- **Chat fails immediately** — check `tmp/wrangler.log`. A 401 means
  `ADMIN_TOKEN` drifted between `.env` and `agent-box/.dev.vars`; re-run
  `./up.sh` and restart wrangler.
- **"git clone failed"** in the first turn — `EXTERNAL_GITEA_HOST_NAME` in
  `.env` is stale (network changed) or not container-reachable. Fix and
  `docker compose up -d backend-v2`.
- **Model errors (404 model not found)** — re-run `./ollama-models.sh`; the
  Claude model id must exist as an Ollama alias.
- **Bridge never becomes ready** — verify devdns:
  `docker compose exec backend-v2 nslookup foo.host.docker.internal` should
  answer with the host gateway IP.
- **First turn is very slow** — expected: wrangler builds the sandbox image
  (large base) and the bridge installs `@agentclientprotocol/claude-agent-acp`
  in-container on first session.

## Caveats

- Everything here is local-only development: default database passwords,
  `NODE_ENV=development`, no TLS, and (in local-model mode) a non-Claude model
  answering as Claude. For the production topology see [`../docker/`](../docker/).
- `wrangler dev` state (Durable Objects, container images) lives under
  `backend-cluster/agent-box/.wrangler/`; sandbox containers are plain docker
  containers named by wrangler — `./down.sh` stops the ones it can identify.
- The Git-over-SSH proxy is intentionally not wired in this target; use
  `../docker-mac/` for that.
