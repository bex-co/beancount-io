# Deployment Targets

Deployment configuration for the Beancount.io stack. Read the target's README before changing or running it.

## Targets

- `docker-mac/` — full local stack through Docker Compose: dashboard, backend-v2, ledger, Gitea, two PostgreSQL instances, and Redis. Run Compose commands from `deploy/docker-mac/`.
- `dev-sandbox/` — the docker-mac stack (on ports 42610-42612 plus a `devdns` dnsmasq sidecar) **plus the Ask-AI sandbox path**: the agent-box worker under host-side `wrangler dev` and optional local-model (Ollama) credentials. Use `./up.sh` / `./down.sh` from `deploy/dev-sandbox/`; the scripts also write `backend-cluster/agent-box/.dev.vars` (shared `ADMIN_TOKEN`).
- `docker/` — production-oriented, single-host Docker Compose deployment with Caddy-managed TLS, named volumes, health-gated initialization, and no directly published application or datastore ports. Run Compose commands from `deploy/docker/`.
- `bex/` — operational notes for the bex PaaS deployment. The actual Blueprint is the repository-root `../bex.yaml`; bex has no persistent disks, so stateful services remain external.

## Safety and configuration

- `docker-mac/.env` and `dev-sandbox/.env` are local and gitignored. Commit placeholders only in the matching `.env.example`. `dev-sandbox/up.sh` generates secrets into `.env` and mirrors `ADMIN_TOKEN` into `backend-cluster/agent-box/.dev.vars` (also gitignored) — keep those two in sync when editing either by hand.
- `docker/.env` is secret, host-specific, and gitignored. Commit placeholders only in `docker/.env.example`; keep production values out of Compose overrides and documentation.
- Root `../bex.yaml` contains deployment structure, never credentials. Configure secrets in the deployment platform.
- Keep ledger/PostgreSQL/Redis internal unless a documented operational requirement says otherwise. `docker-mac/docker-compose.yml` intentionally publishes only the user-facing development ports; `docker/docker-compose.yml` publishes only Caddy's HTTP(S) edge by default.
- Do not paste live keys, tokens, database dumps, or user data into Compose files, Blueprint files, READMEs, logs, or examples.
- Backend-v2 schema migrations are applied by `docker-mac/apply-migrations.sh` locally, the `docker` target's one-shot `backend-migrate` service, and the bex container start command. Preserve that ordering when changing startup behavior.
- The backend and ledger Docker build contexts point into `../backend-cluster/`; update deployment paths when either package moves.

## Validation

For Compose-target changes, from the changed directory (`deploy/docker-mac/`, `deploy/dev-sandbox/`, or `deploy/docker/`):

```zsh
docker compose config --quiet
```

For `docker/`, validation may use placeholders without creating a secret file:

```zsh
docker compose --env-file .env.example config --quiet
SSH_PROXY_HOST_KEY=placeholder docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.ssh.yml config --quiet
```

Use `docker compose up -d --build` only when an actual stack run is needed; it mutates containers and persistent data. For bex changes, cross-check `../bex.yaml` against `bex/README.md` and the referenced service Dockerfiles.
