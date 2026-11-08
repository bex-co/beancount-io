# deploy/bex — beancount.io on bex

[bex](https://github.com/bex-co/bex) is a Render-compatible PaaS. The Blueprint
lives at the repo root as [`bex.yaml`](../../bex.yaml).

[![Deploy to bex](https://dashboard.bex.co/images/deploy-to-bex-button.svg)](https://dashboard.bex.co/deploy?repo=https://github.com/bex-co/beancount-io&path=bex.yaml)

Click, choose the workspace that should own it, review the plan, and apply.
Nothing is created until you approve the preview.

- **What you get:** the dashboard (the one public address), the API, the ledger
  service (private), Gitea on a 10 GB disk, one managed Postgres and one Key
  Value. Sign-up needs no email step and no plan limits apply
  ([`SELF_HOST`](#self-hosting-no-verification-page-no-plan-limits)).
- **What it costs:** bex's preview shows about **33 USD a month** at the current
  Starter plans, billed to your workspace. Delete the resources to stop it.
- **What you fill in:** nothing. Every secret is generated; optional
  integrations are added later ([After the first deploy](#after-the-first-deploy)).
- **Then:** open the dashboard service's URL and sign up. Anyone who can reach
  that URL can register, so see the note under `SELF_HOST` before you share it.

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
| `gitea` | `beancount-gitea` (web + 10 GB disk) | bare repos need a filesystem |
| `postgres` (Gitea's) | a second schema `gitea` in `beancount-backend-db` | one Postgres instance in total |

**Gitea runs on a persistent disk.** bex supports one disk per paid web/private
service (see the persistent-disks page), at the cost of a single instance and a
stop-then-start deploy. Git-over-SSH is off (no TCP routing); HTTPS only.
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
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | AI features; with neither, they fail with "LLM is not configured". `LLM_MODEL` / `LLM_FALLBACK_MODEL` override the models. Never set `ANTHROPIC_BASE_URL` to an empty string |
| `TEMP_ASSETS_AWS_S3_*`, `PERM_ASSETS_AWS_S3_*` (`BUCKET`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`) | receipt and attachment uploads |
| `BLOCKEDEN_ACCESS_KEY` | metering for the `bea ask` model proxy |
| `SEND_GRID_API_KEY` | mail: password recovery and, if you turn `SELF_HOST` off, sign-up codes |

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
- The email address is **not** proven to belong to the person signing up, and
  forgot-password and other mail still do not work without `SEND_GRID_API_KEY`.
- The API logs a warning at boot.

Anyone who can reach the URL can register, so put it behind your own access
control if that matters. To go back to a managed setup, set `SELF_HOST` to
`"false"` (an omitted env var is kept, so removing the line from `bex.yaml`
alone does not turn it off) and set `SEND_GRID_API_KEY`.

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
the API's built-in default, which is beancount.io's own address. Gitea does the
same for itself in its entrypoint (`ROOT_URL` and `DOMAIN` from its own address).

Internal addresses get the same treatment. bex builds a service's internal
address from its slug (`beancount-dashboard-496p:3000`), not its name, and the
slug gains a suffix exactly when the name is taken. So no internal address is
written down either: services reference each other with `fromService`
(`host` or `hostport`), and the start commands put the URLs together
(`SSR_API_URL`, `API_PROXY_URL`, `FAVA_API_URL`, `PUBLIC_URL_FROM`).

Known gap: `EXTERNAL_GITEA_HOST_NAME`, used only to build the pull-request link
the AI assistant returns, is not set on bex and falls back to the code default.

With your own domain you do not need the proxy: give the dashboard and API hosts
a shared parent, set `AUTH_COOKIE_DOMAIN` to it, and point `VITE_API_URL` at the
API host.

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
