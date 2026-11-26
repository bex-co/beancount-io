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
   are both strong and safe inside the generated PostgreSQL URI. Leave
   `OAUTH_JWKS_FROM_AUTH_SECRET=true` as it is ([OAuth signing key](#oauth-signing-key)).
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
| Mobile app server address | `https://<APP_DOMAIN>` ([Use the mobile app](#use-the-mobile-app)) |
| MCP endpoint | `https://<APP_DOMAIN>/api-gateway/mcp` ([Connect an MCP host](#connect-an-mcp-host)) |
| Git over HTTPS | `https://<API_DOMAIN>/git/<owner>/<ledger>.git` ([Git over HTTPS](#git-over-https)) |
| Gitea | `https://<GIT_DOMAIN>` |

If startup stops at either one-shot service, inspect it directly:

```zsh
docker compose logs gitea-init backend-migrate
docker compose logs backend-v2 ledger gitea
```

### OAuth signing key

The mobile app's sign-in, MCP hosts that sign in with OAuth, and every
`/oauth/*` route need a signing key. You do not have to make one:
`.env.example` sets `OAUTH_JWKS_FROM_AUTH_SECRET=true`, and with `OAUTH_JWKS`
empty the backend derives the key from `AUTH_SECRET`. It is the same key on
every restart, and there is nothing more to store or back up. To check it,
`curl -sS https://<APP_DOMAIN>/.well-known/oauth-authorization-server` answers
with `"issuer":"https://<APP_DOMAIN>"`, and the `jwks_uri` it names serves one
ES256 key.

- **Rotating `AUTH_SECRET` rotates the key.** Every OAuth client, the app and
  MCP hosts alike, is signed out and signs in again, as is every dashboard
  session the secret signed.
- **To use a key of your own,** put a private P-256 ES256 JWK set in
  `OAUTH_JWKS`, single-quoted, in `.env`. A supplied `OAUTH_JWKS` always wins
  over the derived key. After the first build, this prints one:

  ```zsh
  docker compose run --rm --no-deps -T --entrypoint node backend-v2 -e 'const c=require("node:crypto");const k=c.generateKeyPairSync("ec",{namedCurve:"P-256"}).privateKey.export({format:"jwk"});console.log(JSON.stringify({keys:[{...k,kid:c.randomUUID(),alg:"ES256",use:"sig"}]}))'
  ```

  Keep it with `.env`, never in Git, and run `docker compose up -d` to apply it.
- **An `.env` made before `.env.example` had the line** keeps OAuth off: the
  backend boots and serves the dashboard and the API, but every OAuth route
  answers `503 oauth_not_configured`, and the app says the server is not set
  up for sign-in yet. Add `OAUTH_JWKS_FROM_AUTH_SECRET=true` (or a key) to
  `.env` and run `docker compose up -d`.

`DASHBOARD_URL` and `SERVER_URL` are derived from `APP_DOMAIN` and
`API_DOMAIN` in Compose. The OAuth issuer is `https://<APP_DOMAIN>`, so the
Caddyfile also sends `/api-gateway/*` and `/.well-known/*` on the app domain to
backend-v2; see the [`backend-v2` OAuth deployment contract](../../backend-cluster/backend-v2/README.md#oauth-deployment-contract)
for the routes a different reverse proxy must forward.

### Use the mobile app

The App Store and Google Play apps can use this stack. On the app's welcome
screen, tap the gear (Server), enter `https://<APP_DOMAIN>`, tap **Test
connection**, then **Save**, and sign in. Enter the app domain, not the API
domain: the API domain does not match the OAuth issuer, and the app refuses it.

### Connect an MCP host

The MCP endpoint is `https://<APP_DOMAIN>/api-gateway/mcp`. A host that signs
in with OAuth finds this stack's sign-in from the endpoint itself. In Claude
Code:

```zsh
claude mcp add --transport http beancount https://<APP_DOMAIN>/api-gateway/mcp
```

then sign in from `/mcp`. A host that takes a header can instead send a
personal access token from Settings → Personal access tokens as
`Authorization: Bearer <token>`. The [MCP docs](../../backend-cluster/backend-v2/docs/mcp.md)
have the tools, the credentials, and notes for each client.

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

## Git over HTTPS

Git over HTTPS works by default, through backend-v2's Git proxy on the API
domain: users clone and push `https://<API_DOMAIN>/git/<owner>/<ledger>.git`.
This file sets `GIT_PUBLIC_URL` to `https://<API_DOMAIN>/git`, so ledgers'
`httpUrl`, the dashboard's Git Clone menu and `bea cloud git setup` all use
it. Gitea's own address, `https://<GIT_DOMAIN>`, takes neither a token nor the
account password. A stack started from this file before 2026-11-25 gave ledgers that
address; pull the update and run `docker compose up -d`.

Git signs in one of two ways:

- **With `bea` 0.5.0 or later**, once per machine, and then plain `git` asks
  for nothing:

  ```zsh
  export BEA_API_URL=https://<APP_DOMAIN>
  export BEA_DASHBOARD_URL=https://<APP_DOMAIN>
  bea cloud login
  bea cloud git setup
  git clone https://<API_DOMAIN>/git/<owner>/<ledger>.git
  ```

  `bea cloud git setup` mints a personal access token for Git and registers
  `bea` as Git's credential helper for `https://<API_DOMAIN>` alone; see
  `cli/docs/USAGE.md`, "Cloud: Git sign-in on a self-hosted server".
- **Without `bea`**, any username and a personal access token as the password,
  minted in the dashboard under Settings → Personal access tokens
  (`/settings/api-keys`); every user of a self-hosted stack can mint one.

The account password is still accepted for now, with a `remote:` hint to
switch, because backend-v2's `gitHttp.passwordAuth` ships as `warn`. It is a
code setting in `backend-cluster/backend-v2/src/config/config.ts` (`allow`,
`warn`, or `deny`), not an environment variable: to refuse passwords, change it
to `deny` and rebuild the image. A user whose Git client keeps sending an old
password clears it with
`printf 'protocol=https\nhost=<API_DOMAIN>\n\n' | git credential reject`, the
host's Keychain item on macOS, or its line in `~/.git-credentials`. See
`backend-cluster/backend-v2/docs/authentication-rate-limits.md`.

## Bring books in

A ledger here is a Git repository, so books come in with their history: from
another self-hosted stack, from beancount.io, or from a folder of Beancount
files. Two stacks are brought together ledger by ledger. Accounts, personal
access tokens, settings, bank connections and uploaded receipts do not move;
make them again on this stack.

1. Get a copy of the books, with their history:
   - **From another self-hosted stack**, clone the ledger there, signed in as
     that stack asks: on a Docker stack,
     `git clone https://<its API_DOMAIN>/git/<owner>/<ledger>.git old`.
   - **From beancount.io**, Git signs in with an SSH key. Add yours in the
     dashboard under Settings → SSH Keys, then, before you point `bea` at this
     stack (no `BEA_API_URL` set), run `bea cloud login` and
     `bea cloud ledger clone <owner>/<ledger> --dir old`.
   - **From a folder of files**, run `git init` and commit them in it.
2. In this stack's dashboard, create a ledger.
3. Clone it, merge the books into it, and push. Git signs in as in
   [Git over HTTPS](#git-over-https):

   ```zsh
   git clone https://<API_DOMAIN>/git/<owner>/<ledger>.git books
   cd books
   git fetch ../old HEAD
   git merge --allow-unrelated-histories -X theirs -m "Bring in my books" FETCH_HEAD
   git push origin HEAD
   ```

The server refuses a forced push to a ledger's `main`, so the history goes in
as one merge on top of the new ledger's first commit; `-X theirs` makes your
files win over the starter `main.bean`. The ledger reads `main.bean`, so make
that your main file or have it `include` yours. Then open the ledger in the
dashboard, or run `bea --file main.bean check` in the clone, to see that it
loads.

## Git over SSH (optional)

With `SELF_HOST=true` and the SSH overlay below off, ledger responses carry
`sshUrl: null`, and `bea cloud ledger clone` says this deployment serves no
Git over SSH instead of trying; from `bea` 0.4.1 it also prints the HTTPS
`git clone` command and says the operator can turn on Git over SSH for `bea`
itself to clone. SSH clone addresses name `GIT_DOMAIN`: this file sets
`EXTERNAL_GITEA_HOST_NAME` from it, and an explicit value always wins. (A
self-hosted stack that sets none learns the address from Gitea's `ROOT_URL` at
start; it never uses beancount.io's Git host. See `../bex/README.md`, "Where
ledger clone addresses come from".)

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
