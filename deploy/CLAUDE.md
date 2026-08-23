# Deployment Targets

Deployment configuration for the Beancount.io stack. Read the target's README before changing or running it.

## Targets

- `mac/` — full local stack through Docker Compose: dashboard, backend-v2, ledger, Gitea, two PostgreSQL instances, and Redis. Run Compose commands from `deploy/mac/`.
- `bex/` — operational notes for the bex PaaS deployment. The actual Blueprint is the repository-root `../bex.yaml`; bex has no persistent disks, so stateful services remain external.

## Safety and configuration

- `mac/.env` is local and gitignored. Commit placeholders only in `mac/.env.example`.
- Root `../bex.yaml` contains deployment structure, never credentials. Configure secrets in the deployment platform.
- Keep ledger/PostgreSQL/Redis internal unless a documented operational requirement says otherwise. `mac/docker-compose.yml` intentionally publishes only the user-facing development ports.
- Do not paste live keys, tokens, database dumps, or user data into Compose files, Blueprint files, READMEs, logs, or examples.
- Backend-v2 schema migrations are applied by `mac/apply-migrations.sh` locally and by the bex pre-deploy command. Preserve that ordering when changing startup behavior.
- The backend and ledger Docker build contexts point into `../backend-cluster/`; update deployment paths when either package moves.

## Validation

For local-stack changes, from `deploy/mac/`:

```zsh
docker compose config --quiet
```

Use `docker compose up -d --build` only when an actual stack run is needed; it mutates local containers and data under `mac/data/`. For bex changes, cross-check `../bex.yaml` against `bex/README.md` and the referenced service Dockerfiles.
