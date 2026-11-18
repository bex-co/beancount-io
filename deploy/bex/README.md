# deploy/bex — beancount.io on bex

[bex](https://github.com/bex-co/bex) is a Render-compatible PaaS. The Blueprint
lives at the repo root as [`bex.yaml`](../../bex.yaml).

[![Deploy to bex.co](./deploy-to-bex.svg)](https://dashboard.bex.co/deploy?repo=https://github.com/bex-co/beancount-io&path=bex.yaml)

Click, choose the workspace that should own it, review the plan, and apply.
Nothing is created until you approve the preview.

> **Beta.** The first build is slow: bex builds one image at a time, so the four
> services can take 20–40 minutes to go live when its queue is busy. A rollout
> that misses bex's readiness deadline is marked failed and is not retried; if a
> service shows that, trigger a deploy of it again from the dashboard. A
> Blueprint created from this link has no push webhook, so later updates are
> manual ([Rolling out a change](#rolling-out-a-change)).

- **What you get:** the dashboard (the address you use and share), the API, the
  ledger service and Gitea (both private: no public address), Gitea's 10 GB disk,
  one managed Postgres and one Key Value. Sign-up needs no email step and no plan limits apply
  ([`SELF_HOST`](#self-hosting-no-verification-page-no-plan-limits)).
- **What it costs:** bex's preview shows about **33 USD a month** at the current
  Starter plans, billed to your workspace. Delete the resources to stop it.
- **What you fill in:** nothing. Every secret is generated; optional
  integrations are added later ([After the first deploy](#after-the-first-deploy)).
- **Then:** open the dashboard service's URL and sign up straight away. Until
  the first account exists, anyone who can reach that URL can be the one to
  create it; sign-up closes behind it (see the note under `SELF_HOST`).

The link carries `path=bex.yaml` because bex looks for `render.yaml` by default
and this repository keeps the manifest under the other name. Services build from
the repository and branch the Blueprint is linked to, so a fork deploys itself.

**That filename is not what bex discovers.** ADR049 makes `render.yaml`
canonical and `bex.yml` a deprecated `.yml` alias, and says there is no
application-level `bex.yaml`. This works because the deploy path below posts
the manifest *inline* — `POST /v1/blueprints/deploy` takes the file's
contents, not its path — and because an explicitly configured Blueprint path
always beats discovery. If you ever connect this repo as a Git-backed
Blueprint on default discovery, it will not find `bex.yaml`: configure the
path explicitly, or rename the file to `render.yaml`.

## What runs where

| `deploy/docker-mac` compose | on bex | why |
|---|---|---|
| `dashboard` | `beancount-dashboard` (web) | |
| `backend-v2` | `beancount-api` (web) | |
| `ledger` | `beancount-ledger` (pserv) | no public port, matching the compose invariant |
| `postgres-backend` | `beancount-backend-db` (managed Postgres) | |
| `redis` | `beancount-cache` (managed Key Value) | `noeviction` — it holds auth tokens |
| `gitea` | `beancount-gitea` (pserv + 10 GB disk) | bare repos need a filesystem; private, only the API and the ledger reach it |
| `postgres` (Gitea's) | a second schema `gitea` in `beancount-backend-db` | one Postgres instance in total |

**Gitea runs on a persistent disk.** bex supports one disk per paid web/private
service (see the persistent-disks page), at the cost of a single instance and a
stop-then-start deploy. Git-over-SSH is off (no TCP routing).

**Gitea is a private service.** It has no public address: its login page, its
API and its public pages are not on the internet, and only the API and the
ledger service reach it, by its internal address. Git over HTTP is the job of
the API's own Git proxy (`backend-v2` `git-proxy-handler.ts`), which
authenticates a request before it forwards it to Gitea. The clone address the
API reports is learned from Gitea's own `ROOT_URL` (see
[Where ledger clone addresses come from](#where-ledger-clone-addresses-come-from)),
and a private Gitea's is a loopback one, so cloning from your own deployment
is not wired up yet
([ADR 029](../../docs/adrs/ADR029-deploy-self-hosting-contract.md), decision 3).
There is no Gitea web page to
open, by design: ledgers are used through the dashboard, `bea` and the API. A
private service has no `RENDER_EXTERNAL_URL`, so Gitea keeps its default
`ROOT_URL` (`http://localhost:3000/`), and any link Gitea builds for itself
(`html_url`, `clone_url`) is not one a browser can open.
`deploy/bex/gitea/` wraps the stock image so the first boot also creates the
backend's admin account. Gitea connects as the instance's single owner role,
because bex cannot create a second one; isolation from the backend is by
schema, not by role (the owner role also cannot `CREATE DATABASE` on bex).

Its schema is created for you, by Gitea's own wrapper before Gitea starts
(`CREATE SCHEMA IF NOT EXISTS`, retrying while the database comes up). It must
not wait on the API: bex gives a service a limited time to become ready and does
not retry a failed rollout, and the API can start much later than Gitea (it
builds last). `init-gitea-db.sql` is the same statement, for a deployment that
does not use this wrapper; run it with
`bex psql <postgres-id> -f deploy/bex/init-gitea-db.sql` (`bex psql` needs
`psql` on PATH, e.g. `brew install libpq`).

## Deploy

Use the button at the top. To do the same from a terminal, a Blueprint is a
REST/MCP/dashboard operation (the bex CLI can only *validate* one). Name the
workspace that should own it with `ownerId`: the older
`POST /v1/blueprints/deploy` defaults to the `bex` workspace, not your active
one.

```zsh
bex blueprints validate ./bex.yaml

# preview first: nothing is created, and it lists any input you would be asked for
curl -X POST https://api.bex.co/v1/blueprints/preview \
  -H "Authorization: Bearer $BEX_ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"ownerId":"<workspace id>","repo":"https://github.com/bex-co/beancount-io","branch":"main","path":"bex.yaml"}'

# create it (same body, no input to supply)
curl -X POST https://api.bex.co/v1/blueprints \
  -H "Authorization: Bearer $BEX_ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"ownerId":"<workspace id>","name":"beancount","repo":"https://github.com/bex-co/beancount-io","branch":"main","path":"bex.yaml"}'
```

Re-applying an unchanged file is a no-op; the Blueprint is an idempotent upsert.

### Rolling out a change

A Blueprint made from a public repository URL gets no push webhook, so pushing
is not enough:

1. `POST /v1/blueprints/<id>/sync` with `{"ownerId":"…"}` applies manifest
   changes (environment variables, start commands).
2. Code changes need a build: `POST /v1/services/<id>/deploys` with
   `{"commitId":"<sha>","clearCache":"do_not_clear"}`. A deploy with no commit
   replays the previous image instead of building.
3. Builds run one at a time per platform queue and the API builds last, so a full
   rollout can take most of an hour. A rollout that misses its readiness
   deadline is marked failed and is not retried: deploy it again.

## Check a deployment

Open the dashboard service's URL and sign up (that account is the stack's
first, and sign-up closes behind it), or run the smoke test, which does the same
in a real browser and cleans up after itself. Run it on a fresh deploy, before
anyone has signed up:

```zsh
npm i playwright-core            # once, wherever you run it (this package does not depend on it)
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium \
  node dashboard/scripts/qa/run-self-host-sign-up.mjs --url https://<your dashboard address>
```

It signs up a throwaway account (random address and password, nothing
hard-coded), then checks that the visitor lands signed in with no verification
page, that the browser keeps an HttpOnly, Secure cookie for that host, that a
reload keeps the session, that a ledger can be created (which exercises the
ledger service and Gitea), that a second ledger is allowed (no plan limit), that
sign-up is closed behind the account, that ledger clone addresses name this
stack and lead to a Git host asking for credentials, that OAuth discovery names
this host and its authorization endpoint redirects the browser (what the mobile
app and MCP clients sign in through), and that the page logged no errors. It
then deletes the account, unless you pass
`--keep`. On a stack that verifies email, or one that has already closed sign-up
because it has an account, it reports "skipped" instead of failing (the first
only unless you pass `--require-self-host`). Exit code 0 means passed or skipped, 1 a
check failed, 2 it could not run.

## After the first deploy

The deploy asks for nothing. Every secret is generated (`AUTH_SECRET`,
`COOKIE_SECRETS`, `METRICS_API_TOKEN`, `ADMIN_TOKEN`, Gitea's secrets and admin
password), and values two services must share are copied between them rather
than typed twice (`ADMIN_TOKEN` into the ledger's `BACKEND_V2_ADMIN_TOKEN`,
Gitea's admin password into the API's `FAVA_API_ADMIN_PASSWORD`). The OAuth
signing key is derived from `AUTH_SECRET` at start
(`src/config/jwks`, switched on by `OAUTH_JWKS_FROM_AUTH_SECRET`; set `OAUTH_JWKS` yourself to use your own),
so OAuth and MCP discovery work out of the box. Rotating `AUTH_SECRET`
rotates that key and signs everyone out.

Optional integrations are deliberately not declared, so they are not asked for.
The server boots without them; add the ones you want in the dashboard's
Environment tab (an environment variable you add there is kept across syncs):

| variable | what it enables |
|---|---|
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | AI features; with neither, they fail with "LLM is not configured". `LLM_MODEL` / `LLM_FALLBACK_MODEL` override the models. Never set `ANTHROPIC_BASE_URL` or `OPENAI_BASE_URL` to an empty string |
| `OPENAI_API_KEY` (and optionally `OPENAI_BASE_URL`) | `bea ask`: its model proxy forwards to OpenAI with this key. With none it answers "Model proxy is not configured. Set OPENAI_API_KEY." |
| `TEMP_ASSETS_AWS_S3_*`, `PERM_ASSETS_AWS_S3_*` (`BUCKET`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`) | receipt and attachment uploads |
| `SEND_GRID_API_KEY` | mail: password recovery and, if you turn `SELF_HOST` off, sign-up codes |
| `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` (and optionally `OIDC_NAME`, `OIDC_LINK_BY_EMAIL`, `OIDC_ALLOWED_EMAILS`) | sign-in with your own identity provider; see the backend-v2 README |

## Self-hosting: no verification page, no plan limits

`SELF_HOST=true` (set on `beancount-api` in `bex.yaml`) is for a stack its
operator runs for their own users. It is an explicit opt-in, never inferred
from a missing `SEND_GRID_API_KEY`, so a managed deployment that loses its key
still fails instead of opening up. With it on:

- **Sign-up needs no email verification and the code page never appears.**
  `signUp` creates the account and answers already signed in; nothing is mailed
  and there is no code to enter. The public `verifySignUpOtp` still checks the
  real code, so the flag does not open a way to guess one.
- **Every plan limit is lifted.** Everyone resolves to the top tier: unlimited
  ledgers, collaborators, directives and AI-assistant tokens, and billing is
  never asked for a user's plan.
- **Sign-up closes once the first account exists.** With no verification and no
  limits, an open door would let anyone who finds the address use your disk and
  your model key. Afterwards `signUp` answers `FORBIDDEN`, the sign-in page
  offers no "Sign up", and `/auth/sign-up` sends the visitor to sign in. The
  first account is whoever signs up first, so **sign up as soon as the deploy
  is up**. There is no way yet to add a second account; deleting the only
  account reopens sign-up.
- The sign-up page leaves out the hosted service's Terms and Privacy Policy
  line: those do not bind a stack its own operator runs.
- The email address is **not** proven to belong to the person signing up, and
  forgot-password and other mail still do not work without `SEND_GRID_API_KEY`:
  the forgot-password page says the server cannot send email, and you restore
  access as described in [A user forgot their password](#a-user-forgot-their-password).
- The API logs a warning at boot.

The value is read forgivingly: `true`, `1`, `yes`, `y` and `on` mean on, in any
case; unset, empty, `false`, `0`, `no`, `n` and `off` mean off. Anything else
(`ture`, `enabled`) is treated as off, and the API says so in its boot log. To
go back to a managed setup, set `SELF_HOST` to
`"false"` (an omitted env var is kept, so removing the line from `bex.yaml`
alone does not turn it off) and set `SEND_GRID_API_KEY`.

### Upgrading a stack that is already running

Read this before you sync a newer Blueprint into a stack that holds data. Four
things behave differently, and the last one needs a backup first:

- **Sign-up closes.** A stack that already has any account stops taking
  sign-ups: `signUp` answers `FORBIDDEN` and the sign-in page drops "Sign up".
  Existing accounts keep working. There is no way yet to add another account.
- **More `SELF_HOST` values count as on.** Only `true` used to; now `1`, `yes`,
  `y` and `on` do too. A stack that had one of those set was running as a
  managed deployment (email verification, plan limits) and becomes a self-host,
  which also closes sign-up once it has an account. Set `"false"` to keep the
  old behavior. The API's boot log says what it read.
- **`bea ask` needs `OPENAI_API_KEY`.** Its model proxy no longer goes through
  BlockEden, so `BLOCKEDEN_ACCESS_KEY` is ignored. Without an OpenAI key it
  answers "Model proxy is not configured. Set OPENAI_API_KEY."
- **Gitea changes from a web service to a private one, and bex will not do that
  in place.** The sync stops with "a service's type cannot be changed after it
  is created; delete the service and create it again". Run on a live stack on
  2026-11-16: the API had already been updated when the sync stopped, so the
  stack kept working with the new API and the old, still public, Gitea, and no
  repository was touched. Every later sync stops the same way until Gitea is
  created again, and deleting the service deletes its disk and every repository
  on it. To finish the upgrade:
  1. Back up every ledger ([Back up and restore](#back-up-and-restore)).
  2. Delete the `beancount-gitea` service, then sync the Blueprint. bex creates
     the private service with an empty disk and redeploys the API and the
     ledger service.
  3. Deploy the dashboard by hand: its Blueprint entry did not change, so the
     sync leaves it on the old commit.
  4. Restore each ledger as described below. Until you do, the old ledgers are
     still listed (their records are in Postgres) but cannot be opened or
     cloned.

  The new Gitea service generates a new administrator password. The wrapper
  gives it to the existing administrator account at start; without that (before
  2026-11-16) every ledger page answered "Page not found" after this step.

## Back up and restore

A ledger is a Git repository, so a clone is a complete backup of its files and
history. Accounts, API keys and settings live in the managed Postgres; this
procedure does not cover them, and restoring a Postgres dump into a new stack
has not been tried.

Back up, with a personal access token that can read the ledger:

```zsh
git clone --mirror https://<any name>:<token>@<api address>/git/<owner>/<ledger>.git
```

Restore into a stack where the ledger is gone or cannot be opened. The server
refuses a forced push to a ledger's main branch, so the backup is merged on top
of the new ledger's first commit instead of replacing it:

1. In the dashboard, delete the ledger if it is still listed, and create one
   with the same name.
2. Clone the new ledger, merge the backup into it, and push:

   ```zsh
   git clone https://<any name>:<token>@<api address>/git/<owner>/<ledger>.git restore
   cd restore
   git fetch ../<ledger>.git main
   git merge --allow-unrelated-histories -X theirs -m "Restore from backup" FETCH_HEAD
   git push origin HEAD
   ```

Run on a live stack on 2026-11-16, after its Gitea service and disk had been
deleted: the restored ledger opened in the dashboard with the backup's files
and every earlier commit, under one merge commit. `-X theirs` makes the backup
win where the new ledger's starter file has the same name.

## A user forgot their password

Without `SEND_GRID_API_KEY` the server cannot mail a reset link, and the
dashboard's forgot-password page says so and tells the user to ask you. Issue
them a one-time reset link from the admin API:

```zsh
curl -sS -X POST "https://<beancount-api address>/api/admin/password-reset-link" \
  -H "x-admin-token: $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

`ADMIN_TOKEN` is generated for you: copy it from the `beancount-api` service's Environment tab and paste it into `read -rs ADMIN_TOKEN; export ADMIN_TOKEN`, which keeps it off the screen and out of history. The address is that service's own `*.onbex.co` URL, not the dashboard's (the dashboard forwards only `/api-gateway/*` and `/.well-known/*`). The answer is
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

To rotate `ADMIN_TOKEN`, set a new value (`openssl rand -hex 32`) on
`beancount-api` in the Environment tab, check that `beancount-ledger`'s
`BACKEND_V2_ADMIN_TOKEN` shows the same value (set it if not), and deploy both.

## Sign-in on the platform hostnames

The sign-in cookie must reach the dashboard (it renders on the server from it).
The generated `*.onbex.co` hostnames share no parent domain you own, and bex
reserves every name under onbex.co, so a dashboard host and a separate API host
cannot share a cookie. Instead the browser talks to the dashboard host only:

- The dashboard forwards `/api-gateway/*` and `/.well-known/*` to the API when
  `API_PROXY_URL` is set (`dashboard/server/api-gateway-proxy.ts`, put together
  in `bex.yaml` from the API's internal address). The OAuth issuer is the
  dashboard host, so the OAuth and MCP discovery documents must be answered
  there, as the docker deployment's Caddyfile does. Unset, the handler does
  nothing.
- `dashboard/.env.production` bakes `VITE_API_URL` as the relative
  `/api-gateway/`, true on any host. The server side never reads it (it uses the
  runtime `SSR_API_URL`).
- The API sets the cookie for the dashboard host alone through
  `AUTH_COOKIE_DOMAIN` (unset or blank keeps `.beancount.io`, so existing
  deployments are unaffected). Never use `.onbex.co`: other bex tenants share it
  and would receive the cookie.

### No address is written into the Blueprint

bex assigns each service its hostname from its name, and when another workspace
already holds the name the hostname becomes `<name>-<suffix>`. A second deployer
of this Blueprint therefore gets a different address than yours, so none is
written into `bex.yaml`. The options considered:

1. **Derive it per request** from the forwarded host. Rejected: the OAuth issuer
   is fixed when the API starts, and trusting a request header for it invites
   host-header attacks.
2. **Ask the deployer for it after the first deploy** (a prompt, then a sync).
   Rejected: a newcomer cannot know the address before it exists, which defeats
   one-click deploy.
3. **The API learns it at start from the dashboard.** Chosen. The dashboard is
   the one public entry point and bex tells it its own address
   (`RENDER_EXTERNAL_URL`); it serves that at `/_internal/public-url`
   (`dashboard/server/public-url.ts`, inert where the variable is unset). The
   API's start command runs `scripts/resolve-public-url.js`, which asks once
   (retrying while the dashboard starts) and derives `DASHBOARD_URL` (the OAuth
   issuer), `AUTH_COOKIE_DOMAIN` (that host alone) and `EXTRA_ALLOWED_ORIGINS`.

It only acts when `PUBLIC_URL_FROM` is set. Anything you set yourself is kept,
so a custom domain works by setting `DASHBOARD_URL` (the rest follows from it).
If the address cannot be learned the container exits instead of starting with
the API's built-in default, which is beancount.io's own address. Gitea has no
public address on bex (it is a private service), so its entrypoint derives
`ROOT_URL` and `DOMAIN` from `RENDER_EXTERNAL_URL` only where a platform sets
one, for example if you make it a web service, and says in its log which case it
is in.

Internal addresses get the same treatment. bex builds a service's internal
address from its slug (`beancount-dashboard-496p:3000`), not its name, and the
slug gains a suffix exactly when the name is taken. So no internal address is
written down either: services reference each other with `fromService`
(`host` or `hostport`), and the start commands put the URLs together
(`SSR_API_URL`, `API_PROXY_URL`, `FAVA_API_URL`, `PUBLIC_URL_FROM`).

With your own domain you do not need the proxy: give the dashboard and API hosts
a shared parent, set `AUTH_COOKIE_DOMAIN` to it, and point `VITE_API_URL` at the
API host.

### Where ledger clone addresses come from

`EXTERNAL_GITEA_HOST_NAME` is not set on bex. A stack's Git address is chosen by one rule, the same on every self-hosted target:

- An explicit `GIT_PUBLIC_URL` wins: the address users clone from, with no trailing path to a repository (`https://<api address>/git`). Every ledger's `httpUrl` is built on it.
- Otherwise an explicit `EXTERNAL_GITEA_HOST_NAME` (with `EXTERNAL_GITEA_HTTP_PORT`) names a public Gitea, as the Docker targets do.
- Otherwise, with `SELF_HOST=true`, the API asks Gitea at start for the address it serves on (its `ROOT_URL`, which Gitea's wrapper derives from the public address the platform gives it, if it has one) and builds every ledger's `httpUrl`, and the AI assistant's pull-request links, from that. If Gitea does not answer within a few minutes, the API stops with an error naming `EXTERNAL_GITEA_HOST_NAME` rather than start with someone else's host.
- It never falls back to beancount.io's Git host.

**On bex the API sets `GIT_PUBLIC_URL` itself.** Gitea is a private service, so it has no address a client can open; users clone through the API's own Git proxy instead. The API's start command builds `GIT_PUBLIC_URL` from the address the platform gives the API service (`RENDER_EXTERNAL_URL`, the variable the dashboard already reads for its own address) and `/git`, where the proxy listens, so a ledger's clone address is `https://<api address>/git/<owner>/<repo>.git`. The path prefix matters: the hosted service reaches the same proxy through a Caddy rewrite to `/git{uri}`, which bex has no equivalent of. The dashboard's address does not forward `/git/*`, so the clone address names the API's. Git asks for a username and password: the account's email address and its password. A value you set yourself in the Environment tab is kept (for example behind a custom domain); with the variable unset and the platform giving no address, the API falls back to asking Gitea, which on bex yields the dead `http://localhost:3000/…` address described below.

The AI assistant leaves out its pull-request link here: that link is a page of Gitea's own, and Gitea has no public address, while the proxy forwards git's requests and nothing else.

bex serves Git over HTTPS only: it has no TCP routing (nor does Render, whose public ports are HTTP(S) alone), so `SSH_PROXY_ENABLED` is `false` and ledger responses (REST, GraphQL and MCP alike) carry `sshUrl: null`. `bea cloud ledger clone`, which clones over SSH, refuses such a ledger; from `bea` 0.4.1 it also prints the `git clone <httpUrl>` command and says to use a personal access token as the password. The dashboard's clone menu shows only the HTTP address. Clone with `git clone <httpUrl>` instead.

**Run on a live bex on 2026-11-16.** The platform set `RENDER_EXTERNAL_URL` for the API service, so the clone address was `https://<api address>/git/<owner>/<repo>.git`; cloning with a personal access token, a small push, a 20 MB push and a 200 MB push (84 seconds) worked through the platform's ingress, and the repositories survived a restart and a redeploy of Gitea. Not examined: how many proxies sit in front for the per-address rate limit (`TRUSTED_PROXY_HOPS`). If a platform gives the API no address, the clone address falls back to the one Gitea reports, which is `http://localhost:3000/<owner>/<repo>.git` here (Gitea's `ROOT_URL` stays at its default when it has no public address); set `GIT_PUBLIC_URL` yourself in that case. Decision 3 in [ADR 029](../../docs/adrs/ADR029-deploy-self-hosting-contract.md) has the reasoning.

To clone over HTTPS, use any username and a personal access token as the password, minted in the dashboard under Settings → API keys (`/settings/api-keys`). The account password still works for now, with a `remote:` hint to switch: backend-v2's `gitHttp.passwordAuth` ships as `warn`. It lives in `backend-cluster/backend-v2/src/config/config.ts` as `allow`, `warn`, or `deny`, and is not an environment variable, so refusing passwords is a code change and a redeploy. A Git client that keeps offering an old password is cleared with `printf 'protocol=https\nhost=<git host>\n\n' | git credential reject`, the host's Keychain item on macOS, or its line in `~/.git-credentials`.

## Things that bit us, so they don't bite you again

- **Ports follow the image.** The platform probes the image's declared
  (`EXPOSE`) port and routes internal traffic there: dashboard and Gitea 3000,
  ledger 8000, API 4104. An injected `PORT=3000` can override an app's
  listener, so the API pins `PORT=4104` in the Blueprint; without it the rollout
  waits forever on a port nothing listens on. Internal addresses are
  `<slug>:<image port>`. The Blueprint schema rejects a `port` field.
- **Docker builds get no build args.** Only native-runtime builds receive env
  (via a BuildKit secret). The dashboard's browser-facing `VITE_*` values
  therefore come from the committed `dashboard/.env.production`, which
  `.dockerignore` must **not** exclude.
- **SSR cannot use the public URL.** A pod dialing its own ingress is blocked
  (Traefik runs on hostNetwork, and tenant egress denies host/remote-node), so
  `SSR_API_URL` is an internal address read at runtime by
  `dashboard/src/config/config.server.ts`.
- **`/healthz` on the API is a deep check** that 500s when any dependency is
  down, including Gitea. It is deliberately not the platform health check path;
  the ledger's `/healthz` is, and it checks only itself — it parses a
  one-directive ledger through its own worker pool and 503s when the engine
  cannot, memoized for 5s so polling cannot starve the pool and bounded by a 2s
  deadline so a queued probe cannot stall the check. Saturation (full
  queue, timed-out task) stays healthy on purpose: restarting a merely busy
  service drops in-flight work and deepens the backlog. It was a static 200
  until a poisoned worker thread 500'd every real request for 10.5h while the
  platform saw a healthy service.
- **`fromService.envVarKey` cannot reference a `generateValue` variable** —
  validation rejects it as "no such plainly-defined variable".
- **Auto-deploy on push did not fire** for this repo; trigger a deploy with
  `POST /v1/services/{id}/deploys`.
- **`preDeployCommand` cannot reach your own managed Postgres.** The pre-deploy
  Job runs in `BEX_BUILD_NAMESPACE`, the database lives in the workspace
  namespace, and cross-namespace traffic to a datastore ClusterIP is denied
  (ADR043 D8: *"A datastore ClusterIP is RFC1918, so it is denied — connection
  timeouts"*). A migration there dies with `connect ETIMEDOUT <clusterIP>:5432`
  after consuming the whole pre-deploy budget, and fails the deploy. Run
  migrations from a live instance instead:

  ```zsh
  bex ssh srv-<id>          # lands in the workspace namespace
  yarn migrate:deploy
  ```

  Note that **removing the line from the Blueprint does not unset it** — an
  omitted field preserves the service's existing value. Write
  `preDeployCommand: ""` explicitly.

  What this Blueprint actually does is fold the migration into
  `dockerCommand`, so it runs at container start where the database *is*
  reachable. drizzle-orm's migrator is idempotent and `numInstances` is 1, so
  there is no concurrent-migration hazard; a failed migration crashloops the
  container instead of serving against an unmigrated schema.
- **The namespace quota leaves no room for a rolling update.** With all three
  services running, a new revision's surge pod cannot be scheduled: the deploy
  sits in `update_in_progress` until the health gate expires and reports *"the
  deploy did not become healthy within the health-gate window"*, while the old
  pod keeps serving. Suspending one service frees the slot and the rollout
  completes immediately. Raise the plan's `pods`/cpu/memory quota
  (`quotaForPlan` in `lego/backend/internal/store/namespaces.go`) or expect to
  suspend something on every deploy.
- **One-off jobs and `bex ssh` were both unusable here** —
  `POST /v1/services/{id}/jobs` fails within milliseconds whatever `planId` is
  passed, and the SSH gateway closes the connection before offering a key. So
  neither is a fallback for "run this once against the database".

## Not available on bex

PR preview environments, external log/metric drains, object
storage (`ea objects`), Workflows, and per-resource region selection are all
platform non-goals and are rejected before any write, with a source location.
