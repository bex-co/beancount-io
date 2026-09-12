# deploy/docker-single-psql — single-host deployment on one shared PostgreSQL

The same stack as [`../docker/`](../docker/) — dashboard, backend API, ledger
service, Gitea, Redis, and Caddy — with Gitea and backend-v2 sharing **one**
PostgreSQL server instead of running one server each. This trades some
isolation for roughly one less database container's worth of memory and one
fewer thing to patch, back up, and monitor.

Use `../docker/` unless you specifically want the shared server. Everything not
described below is identical to that target, including TLS, the private
network, the Git-over-SSH overlay, and the upgrade procedure — read its README
alongside this one.

## What is shared and what is not

One `postgres` service, one `postgres_data` volume, two tenants:

| | Database | Owning login role | Connects as |
| --- | --- | --- | --- |
| Gitea | `GITEA_DB_NAME` (`gitea`) | `GITEA_DB_USER` | that role only |
| backend-v2 | `BACKEND_DB_NAME` (`beancount`) | `BACKEND_DB_USER` | that role only |

They share a server process, its memory and CPU, its WAL, its `max_connections`
budget, its major version, and its backup and restore lifecycle. They do not
share a database, a role, a password, or table visibility: `postgres-init`
revokes `CONNECT` from `PUBLIC` on both databases, so neither role can open the
other's. The superuser exists to run that provisioning and nothing else — no
application is configured with it.

`postgres-init` is a one-shot service that runs on every `up`, creating the
roles and databases when absent and reconciling owners, passwords, and grants
when present. It deliberately does not use `/docker-entrypoint-initdb.d`, which
only runs against an empty data directory.

## First boot

```zsh
cd deploy/docker-single-psql
cp .env.example .env
chmod 600 .env
```

Edit `.env`: set `APP_DOMAIN`, `API_DOMAIN`, `GIT_DOMAIN`, and `ACME_EMAIL`,
then replace every `change-me` value including the new
`POSTGRES_SUPERUSER_PASSWORD`. `openssl rand -hex 32` produces values that are
strong and safe inside the generated PostgreSQL URI.

```zsh
docker compose config --quiet
docker compose up -d --build
docker compose ps --all
```

Three one-shot services should finish with exit code 0, in this order:

- `postgres-init` provisions the two roles and databases on the shared server.
- `gitea-init` creates the Gitea administrator idempotently.
- `backend-migrate` applies pending backend migrations before the API starts.

Then open `https://<APP_DOMAIN>`, `https://<API_DOMAIN>/api-gateway/`, and
`https://<GIT_DOMAIN>` as in `../docker/README.md`.

If startup stalls, the shared server makes the ordering worth checking first:

```zsh
docker compose logs postgres-init gitea-init backend-migrate
docker compose logs postgres backend-v2 gitea
```

## Trade-offs and limitations of sharing the server

Everything here is a consequence of the shared server, not a defect. If any of
them is unacceptable for your deployment, use `../docker/` instead.

- **One connection budget.** Both applications draw from
  `POSTGRES_MAX_CONNECTIONS` (200 by default). Gitea's pool is capped by
  `GITEA_DB_MAX_OPEN_CONNS` (50) because its own default is unlimited; without
  that cap a Gitea burst can exhaust the server and the backend starts failing
  with `sorry, too many clients already`. Keep the cap plus the backend pool
  (node-pg defaults to 10 per process) plus headroom below the budget.
- **No resource isolation.** A heavy Gitea query, a runaway `VACUUM`, or a
  large restore competes with backend transactions for CPU, I/O, and shared
  buffers. There is no per-tenant quota — PostgreSQL does not offer one here.
- **One blast radius.** A crash, disk-full, corrupted data directory, or a
  `docker compose down -v` now takes both applications down together. The
  separate-server target loses only one.
- **Coupled maintenance.** A restart, parameter change, or major-version
  upgrade is a full-stack outage, and both databases must be ready for the same
  PostgreSQL major version at the same time.
- **Coupled backups.** A cluster-level backup (`pg_basebackup`, PITR, or a
  volume snapshot) captures both databases at once, which is convenient — but
  restoring the cluster to an earlier point rolls **both** back. Restoring one
  application alone requires per-database `pg_dump` / `pg_restore`; take those
  separately if you want independent recovery.
- **Database and role names must differ.** `postgres-init` fails fast if
  `GITEA_DB_NAME` equals `BACKEND_DB_NAME` or the two roles collide, because
  merging Gitea's tables with the backend's Drizzle migrations is very hard to
  unwind.
- **Not a migration path.** This target starts an empty cluster. It cannot
  consolidate the two existing volumes of a running `../docker/` deployment;
  moving requires `pg_dump` from each old server and `pg_restore` into the new
  databases.
- **Superuser password rotation.** Changing `POSTGRES_SUPERUSER_PASSWORD` after
  first boot does not rotate the initialized superuser role — the image only
  applies `POSTGRES_PASSWORD` at cluster creation — and the mismatch makes
  `postgres-init` fail on the next `up`. Rotate it with `ALTER ROLE` and update
  `.env` in the same maintenance window. The two application passwords are
  different: `postgres-init` reapplies those from `.env` on every boot.

## Data and backups

Persistent state lives in Docker named volumes: `caddy_data`, `caddy_config`,
`gitea_data`, `postgres_data`, and `redis_data` — five instead of the six in
`../docker/`. `docker compose down` preserves them; `docker compose down -v` is
a full destructive reset of both databases.

For application-aware backups, dump the two databases separately so they can be
restored independently:

```zsh
docker compose exec postgres pg_dump -U "$GITEA_DB_USER" -Fc "$GITEA_DB_NAME" > tmp/gitea.dump
docker compose exec postgres pg_dump -U "$BACKEND_DB_USER" -Fc "$BACKEND_DB_NAME" > tmp/backend.dump
```

Back these up together with `gitea_data`, Redis persistence, and `.env`, and
test the restore.

## Validation

```zsh
docker compose --env-file .env.example config --quiet
SSH_PROXY_HOST_KEY=placeholder docker compose --env-file .env.example \
  -f docker-compose.yml -f docker-compose.ssh.yml config --quiet
```

## Design references

- [PostgreSQL: managing databases and privileges](https://www.postgresql.org/docs/16/managing-databases.html)
- [PostgreSQL: `max_connections` and resource consumption](https://www.postgresql.org/docs/16/runtime-config-connection.html)
- [Gitea: installation with Docker](https://docs.gitea.com/next/installation/install-with-docker/)
- [`../docker/README.md`](../docker/README.md) for the shared topology, TLS,
  SSH overlay, and upgrade procedure.
