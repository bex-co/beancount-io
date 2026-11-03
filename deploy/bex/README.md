# deploy/bex — beancount.io on bex, without persistent disks

[bex](https://github.com/bex-co/bex) is a Render-compatible PaaS. The Blueprint
lives at the repo root as [`bex.yaml`](../../bex.yaml).

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

**Before the first Gitea boot** create its schema once (see
`init-gitea-db.sql`): `bex psql <postgres-id> -c 'CREATE SCHEMA IF NOT EXISTS gitea'`
(`bex psql` needs `psql` on PATH, e.g. `brew install libpq`).

## Deploy

The bex CLI can only *validate* a Blueprint — applying one is a REST/MCP/
dashboard operation.

```zsh
bex blueprints validate ./bex.yaml

curl -X POST https://api.bex.co/v1/blueprints/deploy \
  -H "Authorization: Bearer $BEX_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg m "$(cat bex.yaml)" \
        '{repo:"https://github.com/bex-co/beancount-io",branch:"main",bexYaml:$m}')"
```

Re-applying an unchanged file is a no-op. Applying is an idempotent upsert, so
this is also how you roll out an env change.

## After the first deploy

Four values are declared `sync: false`, i.e. seeded once and then owned by you.
Until the Gitea credentials are set the API cannot authenticate to Gitea at
all, so a fresh deploy cannot touch ledger data by accident.

| variable | service | note |
|---|---|---|
| `FAVA_API_ADMIN_PASSWORD` | api **and** gitea | Gitea admin password; set the same value on both |
| `ADMIN_TOKEN` | api | must match the ledger's `BACKEND_V2_ADMIN_TOKEN` byte for byte |
| `BACKEND_V2_ADMIN_TOKEN` | ledger | empty ⇒ the directive-limit check fails **open** |
| `BLOCKEDEN_ACCESS_KEY` | api | optional; only meters the `bea ask` model proxy. AI features come from `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`; the service boots with none set |

`AUTH_SECRET`, `COOKIE_SECRETS`, and `METRICS_API_TOKEN` are `generateValue`
and need no action. Gitea admin user creation is still a one-time
`gitea admin user create` on whatever host runs Gitea.

## Sign-up without a mail provider

Sign-up normally verifies an emailed OTP and needs `SEND_GRID_API_KEY` (a key
whose account has verified the `mail.beancount.io` sender). With no key,
`signUp` fails with `Email delivery is temporarily unavailable`
(`MAIL_PROVIDER_FAILURE` in the API log), and OTPs are never logged. The pending
session lives in Redis, but `beancount-cache` is internal-only
(`ipAllowList: []`, no external connection string), so `bex kv-cli` cannot reach
it from a laptop.

This Blueprint therefore sets `AUTH_SKIP_EMAIL_VERIFICATION=true` on
`beancount-api`. It is an explicit opt-in, never inferred from a missing key, so
a production deployment that loses its key still fails instead of opening up.
With it on:

- `signUp` creates the session but sends no mail;
- `verifySignUpOtp` accepts **any** code for a valid session id, so on the
  dashboard's code screen type any four digits;
- the email address is **not** proven to belong to the person signing up, and
  forgot-password and other mail still do not work;
- the API logs a warning at boot and per sign-up (never the session id, which is
  then the whole credential).

Because the public canary URL has no email check, bots can register accounts. To
turn it off: set `SEND_GRID_API_KEY`, delete the `AUTH_SKIP_EMAIL_VERIFICATION`
entry from `bex.yaml` (an omitted env var is kept, so set it to `"false"` or
remove it in the dashboard), and re-apply.

The browser calls the API cross-origin, so the API also needs
`EXTRA_ALLOWED_ORIGINS` set to the dashboard origin (already in `bex.yaml`);
CORS only trusts `*.beancount.io` otherwise.

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
