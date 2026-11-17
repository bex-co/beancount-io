# deploy/docker — single-host Docker Compose deployment

Run the full Beancount.io service on a general-purpose Docker host: dashboard,
backend API, ledger service, Gitea, two PostgreSQL databases, Redis, and Caddy.
This target is intended for a persistent Linux server or VM. For local macOS
development, use [`../docker-mac/`](../docker-mac/) instead.

The topology follows Docker's production guidance: application code stays in
the images, state uses named volumes, services restart automatically, readiness
is health-gated, and container logs are bounded. Caddy is the only HTTP service
published on the host and obtains and renews TLS certificates automatically.

## Prerequisites

- A current Docker Engine with the Compose v2 plugin.
- A checkout of this repository on the deployment host.
- Three public DNS names pointing at the host, for example
  `books.example.com`, `api.books.example.com`, and `git.books.example.com`.
- Inbound TCP 80 and 443. UDP 443 enables HTTP/3 but is optional.
- Enough resources to build three Node images and run eight long-lived
  containers. Start with 4 GB RAM and monitor the host under your workload.
- At least 20 GB of free disk before the first build. The backend image
  carries its full dependency tree (about 4.5 GB), and the build needs headroom
  for intermediate layers; budget additional space for ledger data.

Caddy's public certificate flow requires the DNS records to resolve to this
host and ports 80/443 to be reachable. If another reverse proxy already owns
those ports, do not run the bundled Caddy service unchanged; add a local
Compose override that removes its port mappings and joins your proxy network.

## First boot

```zsh
cd deploy/docker
cp .env.example .env
chmod 600 .env
```

Edit `.env`:

1. Set `APP_DOMAIN`, `API_DOMAIN`, `GIT_DOMAIN`, and `ACME_EMAIL`.
2. Replace every `change-me` value. `openssl rand -hex 32` produces values that
   are both strong and safe inside the generated PostgreSQL URI.
3. Configure optional integrations only when you need them. AI stays off until
   you set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`; the `bea ask` model proxy
   needs `OPENAI_API_KEY`.

Validate without starting containers, then build and start the stack:

```zsh
docker compose config --quiet
docker compose up -d --build
docker compose ps --all
```

Two one-shot services should finish with exit code 0:

- `gitea-init` creates the Gitea administrator idempotently.
- `backend-migrate` applies pending backend database migrations before the API
  is allowed to start.

Once the health checks pass, open:

| Service | URL |
| --- | --- |
| Dashboard | `https://<APP_DOMAIN>` |
| API | `https://<API_DOMAIN>/api-gateway/` |
| Gitea | `https://<GIT_DOMAIN>` |

### OAuth signing key

Set `OAUTH_JWKS` in `.env` to a JSON JWK set stored only on the host (never in
git). Empty or invalid → backend boots and serves legacy login/API traffic, but
every `/oauth/*` and well-known OAuth metadata route returns `503
oauth_not_configured`, so the native mobile app cannot complete discovery.
`DASHBOARD_URL` / `SERVER_URL` are derived from `APP_DOMAIN` / `API_DOMAIN` in
Compose; see [`backend-v2` OAuth deployment contract](../../backend-cluster/backend-v2/README.md#oauth-deployment-contract)
for the reverse-proxy well-known routes.

The OAuth issuer is `https://<APP_DOMAIN>`, so the Caddyfile also sends
`/api-gateway/*` on the app domain to backend-v2 (GraphQL and
`/api-gateway/oauth/*`). Enter `https://<APP_DOMAIN>` as the server URL in the
mobile app; the API domain alone does not match the issuer.

If startup stops at either one-shot service, inspect it directly:

```zsh
docker compose logs gitea-init backend-migrate
docker compose logs backend-v2 ledger gitea
```

## Network and data model

Only Caddy publishes HTTP ports. Dashboard, backend-v2, and Gitea share its
edge network but expose no host ports. Ledger, both PostgreSQL services, and
Redis are reachable only on an internal Compose network. Gitea's SSH listener
is also internal unless you explicitly enable the policy-enforcing SSH overlay.

Persistent state lives in Docker named volumes:

- `caddy_data` and `caddy_config` — certificates and Caddy state.
- `gitea_data` — Git repositories, attachments, and Gitea configuration.
- `postgres_gitea_data` and `postgres_backend_data` — relational data.
- `redis_data` — append-only Redis state, including authentication data.

`docker compose down` preserves these volumes. `docker compose down -v`
deletes them and is therefore a full, destructive reset.

Back up all six volumes together from a stopped stack, or use application-aware
online backups (`gitea dump`, `pg_dump`, and Redis persistence) and test the
restore procedure. Keep `.env` in the same protected backup set: its Gitea
encryption keys are required to read some persisted secrets.

## Routine operations

```zsh
docker compose ps --all
docker compose logs -f                 # add a service name to filter
docker compose up -d                   # apply environment/config changes
docker compose up -d --build           # rebuild after source changes
docker compose pull caddy gitea postgres-gitea postgres-backend redis
docker compose up -d                   # roll forward pulled dependency images
docker compose down                    # stop while preserving data
```

For a repository upgrade, back up first, review the release diff, pull the
desired commit, and run `docker compose up -d --build`. Compose recreates the
changed app containers; `backend-migrate` reruns its idempotent migration before
the new backend starts. Changing `API_DOMAIN` requires a dashboard rebuild
because the browser-facing API URL is compiled into its bundle.

The default dependency image tags follow patch releases within their selected
major/minor lines. Pin full tags or image digests in `.env` if your rollout
policy requires byte-for-byte repeatability.

## Git over SSH (optional)

Ledger clone addresses name `GIT_DOMAIN`: this file sets `EXTERNAL_GITEA_HOST_NAME`
from it, and an explicit value always wins. (A self-hosted stack that sets none
learns the address from Gitea's `ROOT_URL` at start; it never uses
beancount.io's Git host. See `../bex/README.md`, "Where ledger clone addresses
come from".) With `SELF_HOST=true` and the SSH overlay below off, ledger
responses carry `sshUrl: null`, and `bea cloud ledger clone` says this
deployment serves no Git over SSH instead of trying; from `bea` 0.4.1 it
also prints the HTTPS `git clone` command and says the operator can turn on
Git over SSH (the SSH overlay below) for `bea` itself to clone.

Git over HTTPS works by default. Users clone `https://<GIT_DOMAIN>/git/<owner>/<ledger>.git`
with any username and a personal access token as the password, minted in the
dashboard under Settings → API keys (`/settings/api-keys`); every user of a
self-hosted stack can mint one. The account password is still accepted for
now, with a `remote:` hint to switch, because backend-v2's
`gitHttp.passwordAuth` ships as `warn`. It is a code setting in
`backend-cluster/backend-v2/src/config/config.ts` (`allow`, `warn`, or `deny`),
not an environment variable: to refuse passwords, change it to `deny` and
rebuild the image. A user whose Git client keeps sending an old password
clears it with
`printf 'protocol=https\nhost=<GIT_DOMAIN>\n\n' | git credential reject`, the
host's Keychain item on macOS, or its line in `~/.git-credentials`. See
`backend-cluster/backend-v2/docs/authentication-rate-limits.md`.

To publish SSH, backend-v2 must terminate the
connection so its write policy applies. It must present Gitea's existing private
host key; substituting a new key triggers the same client warning as a
man-in-the-middle attack.

After the base stack is healthy:

```zsh
mkdir -p tmp
./print-ssh-host-key.sh > tmp/gitea-host-key
chmod 600 tmp/gitea-host-key
```

Add the key to `.env` as one single-quoted multiline value:

```dotenv
SSH_PROXY_HOST_KEY='-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----'
```

Then publish the configured `SSH_PORT` (2222 by default):

```zsh
docker compose -f docker-compose.yml -f docker-compose.ssh.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.ssh.yml up -d backend-v2
rm -f tmp/gitea-host-key
```

Open that TCP port in the host firewall. Continue using both `-f` arguments for
future Compose operations while SSH is enabled. Disable it by bringing the
overlay project down and starting the base file again; do not rotate the host
key unless you also plan a known-hosts migration for every client.

## A user forgot their password

Without `SEND_GRID_API_KEY` the server cannot mail a reset link, and the
dashboard's forgot-password page says so and tells the user to ask you. Issue
them a one-time reset link from the admin API:

```zsh
curl -sS -X POST "https://<API_DOMAIN>/api/admin/password-reset-link" \
  -H "x-admin-token: $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

`ADMIN_TOKEN` is the value in `.env`; from this directory,
`export ADMIN_TOKEN="$(sed -n 's/^ADMIN_TOKEN=//p' .env)"` loads it without
printing it. The answer is
`{"ok":true,"resetUrl":"…/auth/reset-password/?token=…","expireAt":"…"}`. Send
`resetUrl` to the user over a channel you trust: it opens the dashboard's
reset-password page, works once, and expires after an hour. Setting the new
password signs the user out everywhere, and they sign in with it. An unknown
address answers 404, a blocked user 403, and a missing or wrong token 401. The
server never writes the link to its logs, so do not paste it into yours.

**The admin API is public.** It is served on the API's own address, reachable
by anyone who can reach that address, and `ADMIN_TOKEN` is the only thing
guarding it: the token can sign in as any user, reset any password and run
migrations. Keep it out of shell history and chat, treat it like a root
password, and rotate it if it may have leaked.

To rotate `ADMIN_TOKEN`, put a new value (`openssl rand -hex 32`) in `.env` and
run `docker compose up -d`; Compose recreates `backend-v2` and `ledger`, which
share it.

## Configuration notes and limitations

- `.env` contains live credentials. It is gitignored; keep mode 0600 and never
  paste its values into logs, issues, or Compose files.
- The Gitea administrator is created only when absent. Changing
  `FAVA_API_ADMIN_PASSWORD` later does not change the existing Gitea password;
  update both deliberately with Gitea's admin CLI.
- Set `AUTH_COOKIE_DOMAIN` in `.env` to a parent domain that contains both
  `APP_DOMAIN` and `API_DOMAIN` (for example `.books.example.com`). Blank keeps
  the beancount.io default, which a browser rejects on your domain, so sign-up
  ends back on the login page. The backend logs a warning at boot when
  `DASHBOARD_URL` is not under beancount.io and this is unset.
- Changing either database password in `.env` does not rotate the password of
  an already-initialized PostgreSQL role. Perform a coordinated database-role
  rotation; an environment-only change will break connectivity.
- Do not set `ANTHROPIC_BASE_URL` to an empty string. The backend's Anthropic
  SDK rejects an empty URL at startup. Export a real non-empty value in the
  Compose environment only when using a compatible endpoint.
- The optional Discourse OIDC client is not exposed here. Its issuer and
  callback are currently tied to the official `beancount.io` deployment.
- This is a single-host deployment, not an HA control plane. Docker Compose
  does not provide multi-node failover, managed backups, or zero-downtime
  database upgrades.

## Design references

- [Docker: use Compose in production](https://docs.docker.com/compose/how-tos/production/)
- [Docker: health-gated startup order](https://docs.docker.com/compose/how-tos/startup-order/)
- [Gitea: installation with Docker](https://docs.gitea.com/next/installation/install-with-docker/)
- [Caddy: automatic HTTPS](https://caddyserver.com/docs/automatic-https)


## Application billing

Only the live application client `beancount-web-prod` is supported. Configure
`STRIPE_PRIVATE_KEY`, `STRIPE_PUBLIC_KEY` and `STRIPE_WEBHOOK_SECRET` through the
local secret environment when billing is needed. Retired `STRIPE_DEV_*` variables
and `?env=dev` do not enable test billing. Synthetic fixtures/isolated test runs
cover Stripe behavior without charging or redeeming live promotions. Deploy the
backend and dashboard together. A deployment without Stripe
credentials can run non-billing features but cannot verify paid subscriptions.
