# deploy/bex — beancount.io on bex, without persistent disks

[bex](https://github.com/bex-co/bex) is a Render-compatible PaaS. The Blueprint
lives at the repo root as [`render.yaml`](../../render.yaml) — that filename is
canonical per bex ADR049; `bex.yml` is a deprecated alias and there is no
application-level `bex.yaml`.

## What runs where

| `deploy/mac` compose | on bex | why |
|---|---|---|
| `dashboard` | `beancount-dashboard` (web) | |
| `backend-v2` | `beancount-api` (web) | |
| `ledger` | `beancount-ledger` (pserv) | no public port, matching the compose invariant |
| `postgres-backend` | `beancount-backend-db` (managed Postgres) | |
| `redis` | `beancount-cache` (managed Key Value) | `noeviction` — it holds auth tokens |
| `gitea` + its `postgres` | **not deployed** | see below |

**Gitea is deliberately absent.** Bare git repos need a filesystem, and
service-attached disks are a bex non-goal (`.pm/DO_NOT_DO.md`: bex is
stateless-first). `GITEA_HOST_NAME` therefore points at a Gitea that lives
somewhere else. Everything else in the stack is genuinely stateless: the ledger
service reads ledgers through Gitea's HTTP `contents`/`raw` API and never
clones to disk.

## Deploy

The bex CLI can only *validate* a Blueprint — applying one is a REST/MCP/
dashboard operation.

```zsh
bex blueprints validate ./render.yaml

curl -X POST https://api.bex.co/v1/blueprints/deploy \
  -H "Authorization: Bearer $BEX_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg m "$(cat render.yaml)" \
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
| `FAVA_API_ADMIN_PASSWORD` | api | Gitea admin password |
| `ADMIN_TOKEN` | api | must match the ledger's `BACKEND_V2_ADMIN_TOKEN` byte for byte |
| `BACKEND_V2_ADMIN_TOKEN` | ledger | empty ⇒ the directive-limit check fails **open** |
| `BLOCKEDEN_ACCESS_KEY` | api | seeded with the `.env.example` placeholder so the service boots; replace for real AI features |

`AUTH_SECRET`, `COOKIE_SECRETS`, and `METRICS_API_TOKEN` are `generateValue`
and need no action. Gitea admin user creation is still a one-time
`gitea admin user create` on whatever host runs Gitea.

## Things that bit us, so they don't bite you again

- **Ports are not yours to choose.** bex injects `PORT` (App CRD `port`,
  default 3000) and a runtime env var beats the image `ENV`, so every service
  listens on 3000 regardless of its Dockerfile. Internal addresses are
  `<slug>:3000`. The Blueprint schema rejects a `port` field.
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
  the ledger's `/healthz` is shallow and is.
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
- **One-off jobs and `bex ssh` were both unusable here** —
  `POST /v1/services/{id}/jobs` fails within milliseconds whatever `planId` is
  passed, and the SSH gateway closes the connection before offering a key. So
  neither is a fallback for "run this once against the database".

## Not available on bex

Persistent disks, PR preview environments, external log/metric drains, object
storage (`ea objects`), Workflows, and per-resource region selection are all
platform non-goals and are rejected before any write, with a source location.
