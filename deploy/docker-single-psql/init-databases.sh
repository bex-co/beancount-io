#!/bin/sh
#
# Create and reconcile the two tenants of the shared PostgreSQL server:
# one login role and one database for Gitea, one for backend-v2.
#
# Run by the one-shot `postgres-init` Compose service on every `up`, not by
# /docker-entrypoint-initdb.d — that directory only runs when the data
# directory is empty, so it could never reconcile an existing server. Every
# statement below is therefore written to be idempotent.
#
# Connects as the PostgreSQL superuser. The applications never do: each one
# gets a plain LOGIN role that owns exactly its own database.

set -eu

fail() {
    echo "init-databases: $1" >&2
    exit 1
}

for var in GITEA_DB_USER GITEA_DB_PASSWORD GITEA_DB_NAME \
    BACKEND_DB_USER BACKEND_DB_PASSWORD BACKEND_DB_NAME; do
    eval "value=\${$var:-}"
    [ -n "$value" ] || fail "$var must be set"
done

# On a shared server these are no longer separated by being on different
# hosts. Colliding names would put Gitea's tables and the backend's Drizzle
# migrations in one database, which corrupts both in ways that are painful to
# unwind — refuse to start instead.
[ "$GITEA_DB_NAME" != "$BACKEND_DB_NAME" ] ||
    fail "GITEA_DB_NAME and BACKEND_DB_NAME must differ on a shared server (both are '$GITEA_DB_NAME')"
[ "$GITEA_DB_USER" != "$BACKEND_DB_USER" ] ||
    fail "GITEA_DB_USER and BACKEND_DB_USER must differ on a shared server (both are '$GITEA_DB_USER')"

# `\gexec` runs the statement each SELECT builds. format()'s %I/%L quote the
# identifier and the password correctly, so a password containing a quote is
# handled rather than breaking the statement.
psql --no-psqlrc -v ON_ERROR_STOP=1 \
    -v gitea_user="$GITEA_DB_USER" \
    -v gitea_password="$GITEA_DB_PASSWORD" \
    -v gitea_db="$GITEA_DB_NAME" \
    -v backend_user="$BACKEND_DB_USER" \
    -v backend_password="$BACKEND_DB_PASSWORD" \
    -v backend_db="$BACKEND_DB_NAME" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'gitea_user', :'gitea_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'gitea_user')
\gexec

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'backend_user', :'backend_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'backend_user')
\gexec

-- Unlike a plain `POSTGRES_PASSWORD` image variable, this does apply a
-- password change from .env to an already-initialized role.
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'gitea_user', :'gitea_password')
\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'backend_user', :'backend_password')
\gexec

-- template0 + explicit UTF8 keeps both databases off whatever encoding a
-- customized template1 on the host might carry.
SELECT format('CREATE DATABASE %I OWNER %I ENCODING ''UTF8'' TEMPLATE template0', :'gitea_db', :'gitea_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'gitea_db')
\gexec

SELECT format('CREATE DATABASE %I OWNER %I ENCODING ''UTF8'' TEMPLATE template0', :'backend_db', :'backend_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'backend_db')
\gexec

SELECT format('ALTER DATABASE %I OWNER TO %I', :'gitea_db', :'gitea_user')
\gexec

SELECT format('ALTER DATABASE %I OWNER TO %I', :'backend_db', :'backend_user')
\gexec

-- Two tenants on one server can reach each other's database unless CONNECT is
-- taken away from PUBLIC. Owning the database also gives each role the public
-- schema through pg_database_owner (PostgreSQL 15+), so nothing else is needed
-- for Gitea's migrations or the backend's Drizzle migrator to create objects.
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'gitea_db')
\gexec

SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'backend_db')
\gexec

SELECT format('GRANT ALL ON DATABASE %I TO %I', :'gitea_db', :'gitea_user')
\gexec

SELECT format('GRANT ALL ON DATABASE %I TO %I', :'backend_db', :'backend_user')
\gexec
SQL

echo "init-databases: '$GITEA_DB_NAME' and '$BACKEND_DB_NAME' are ready"
