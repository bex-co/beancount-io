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

To have the backend report which commit it runs (`revision` on
`/.well-known/mcp.json`), build with `BEANCOUNT_REVISION=$(git rev-parse HEAD) docker compose up -d --build`; without it the image reports
`unknown`.

The post script is idempotent: it creates the Gitea admin user (from
`FAVA_API_ADMIN_USER` / `FAVA_API_ADMIN_PASSWORD` in `.env`) and applies
backend-v2's database migrations. Re-run it any time.

Then open the dashboard at **http://localhost:42600**.

To exercise paid API-key creation without contacting Stripe, add the local
test user's backend ID to `DEV_PREMIUM_USER_IDS` in `.env` and recreate
`backend-v2`. The override is accepted only when `NODE_ENV=development`.

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
- AI features need `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`); unset, the
  server still boots and AI calls fail with a clear "LLM is not configured"
  error. `BLOCKEDEN_ACCESS_KEY` only meters the `bea ask` model proxy. Stripe,
  Plaid, SendGrid, and S3 uploads are likewise disabled until their keys are
  set. An unconfigured AI feature or upload answers `CONFIGURATION_ERROR`
  (HTTP 503 on REST) on every API surface, with a hint naming the variables to
  set; the dashboard and `bea --json` show that hint.
- No mail leaves this stack: with `NODE_ENV=development` the API only logs that
  it suppressed a mail, even with `SEND_GRID_API_KEY` set, so the
  forgot-password page says the server cannot send email. To reset a local
  user's password, issue a one-time link with the `ADMIN_TOKEN` from `.env` and
  open the `resetUrl` it returns (the production targets document the same
  call, under "A user forgot their password"):

  ```zsh
  curl -sS -X POST http://localhost:42601/api/admin/password-reset-link \
    -H "x-admin-token: $(sed -n 's/^ADMIN_TOKEN=//p' .env)" \
    -H "Content-Type: application/json" -d '{"email":"you@example.com"}'
  ```
- This stack is for local use: default database passwords, `NODE_ENV=development`,
  no TLS. For the production-oriented topology (reverse proxy, named volumes,
  and no directly published application ports), see [`../docker/`](../docker/).

## Production OAuth

Set `DASHBOARD_URL` to the public HTTPS dashboard front door; it is also the
production OAuth issuer and interaction origin. Keep `OAUTH_JWKS` in the secret
manager. If no valid signing JWKS is available, backend-v2 continues serving
legacy login and API traffic while OAuth endpoints return `503`.

## Local OAuth (this stack)

Leave `OAUTH_JWKS` empty in `.env`. Backend-v2 mints an ephemeral development
signing key and advertises the localhost `SERVER_URL` / `DASHBOARD_URL` pair
from `.env.example`, so the mobile app's compatibility probe treats this stack
as a compatible issuer rather than production. See
[`backend-cluster/backend-v2/README.md`](../../backend-cluster/backend-v2/README.md)
("OAuth deployment contract") for the well-known routes a reverse-proxied
self-host must expose.

## Application billing

Only the live application client `beancount-web-prod` is supported. Configure
`STRIPE_PRIVATE_KEY`, `STRIPE_PUBLIC_KEY` and `STRIPE_WEBHOOK_SECRET` through the
local secret environment when billing is needed. Retired `STRIPE_DEV_*` variables
and `?env=dev` do not enable test billing. Synthetic fixtures/isolated test runs
cover Stripe behavior without charging or redeeming live promotions. Deploy the
backend and dashboard together. A deployment without Stripe
credentials can run non-billing features but cannot verify paid subscriptions.
