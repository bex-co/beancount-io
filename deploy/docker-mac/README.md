# deploy/docker-mac — full local stack on macOS

Run the whole beancount.io service — dashboard, backend API, ledger service,
Gitea, PostgreSQL ×2, Redis — on a Mac with Docker Desktop or
[OrbStack](https://orbstack.dev/), built entirely from this repository.

## Quick start

```zsh
cd deploy/docker-mac
cp .env.example .env            # then set the change-me values (see .env.example)
docker compose up -d --build    # builds dashboard, backend-v2, ledger images
./post-docker-compose-up-build.sh
```

The post script is idempotent: it creates the Gitea admin user (from
`FAVA_API_ADMIN_USER` / `FAVA_API_ADMIN_PASSWORD` in `.env`) and applies
backend-v2's database migrations. Re-run it any time.

Then open the dashboard at **http://localhost:42600**.

## Ports

Only three host ports are published, deliberately contiguous so one command
checks for conflicts: `lsof -iTCP:42600-42602 -sTCP:LISTEN`.

| Host port | Service    | URL                                        |
|-----------|------------|--------------------------------------------|
| 42600     | dashboard  | http://localhost:42600                     |
| 42601     | backend-v2 | http://localhost:42601/api-gateway/ (GraphQL), `/healthz` |
| 42602     | gitea      | http://localhost:42602 (web UI, HTTP clone) |

Everything else — both PostgreSQL instances, Redis, and the ledger service —
is **not** published to the host. They are reachable only inside the compose
network:

```zsh
docker compose exec postgres psql -U postgres gitea
docker compose exec postgres-backend psql -U postgres backend
docker compose exec redis redis-cli
docker compose exec backend-v2 wget -qO- http://ledger:8000/healthz
```

To temporarily publish one for a GUI client, drop a gitignored
`docker-compose.override.yml` next to this file, e.g.:

```yaml
services:
  postgres-backend:
    ports:
      - "42605:5432"
```

## Common commands

```zsh
docker compose up -d --build    # (re)build and start everything
docker compose ps               # status + health
docker compose logs -f          # logs (add a service name to filter)
docker compose down             # stop (data survives in ./data/)
./apply-migrations.sh           # show pending backend migrations (--yes applies)
```

## Data

All state lives in `./data/` (gitignored): `gitea/`, `postgres/`,
`postgres-backend/`, `redis/`. Delete a subdirectory (while stopped) to reset
that service; on next start Gitea/PostgreSQL re-initialize and the post script
re-provisions.

## Git over SSH (optional)

Git-over-SSH terminates in backend-v2's SSH proxy (one policy enforcement
point), not in Gitea. It is off by default. To enable:

1. Set `SSH_PROXY_ENABLED=true` in `.env` and fill `SSH_PROXY_HOST_KEY` with
   Gitea's existing host key: `./print-ssh-host-key.sh > /tmp/hostkey` (see the
   script header for the safe one-liner).
2. Uncomment the `42607:42607` port mapping under `backend-v2` in
   `docker-compose.yml`.
3. `docker compose up -d backend-v2`.

## Caveats

- `backend-cluster/backend-v2` intentionally does not commit its `yarn.lock` (see its
  `.gitignore`). A local checkout that has run `yarn install` bakes that
  lockfile into the image; a fresh clone resolves dependencies unpinned.
- AI features need a real `BLOCKEDEN_ACCESS_KEY` (or Anthropic/OpenAI keys);
  the placeholder in `.env.example` only lets the server boot. Stripe, Plaid,
  SendGrid, and S3 uploads are likewise disabled until their keys are set.
- This stack is for local use: default database passwords, `NODE_ENV=development`,
  no TLS. For the production-oriented topology (reverse proxy, named volumes,
  and no directly published application ports), see [`../docker/`](../docker/).

## Production OAuth

Set `DASHBOARD_URL` to the public HTTPS dashboard front door; it is also the
production OAuth issuer and interaction origin. Keep `OAUTH_JWKS` in the secret
manager. If no valid signing JWKS is available, backend-v2 continues serving
legacy login and API traffic while OAuth endpoints return `503`.
