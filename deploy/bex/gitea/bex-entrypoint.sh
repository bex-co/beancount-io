#!/bin/sh
# Tell Gitea its own public address, give it its schema in the shared Postgres,
# create the backend's Gitea administrator or give the existing one this
# deployment's password (in the background, after Gitea reports healthy), then
# hand over to the stock entrypoint.
set -eu

# The Blueprint makes Gitea a private service: it has no public address, so the
# platform sets no RENDER_EXTERNAL_URL and Gitea keeps its own default
# (http://localhost:3000/). Nobody opens that address; the API and the ledger
# reach Gitea by its internal name, and anything Gitea reports as a link to
# itself (html_url, clone_url) is not for a browser.
#
# Where a platform does give the service a public address (it is made a web
# service, say), use it for Gitea's ROOT_URL and DOMAIN unless the operator set
# them. A second deployer of the Blueprint is given a different hostname when the
# first choice is taken, so it cannot be written into the Blueprint.
if [ -n "${RENDER_EXTERNAL_URL:-}" ]; then
    : "${GITEA__server__ROOT_URL:=${RENDER_EXTERNAL_URL%/}/}"
    : "${GITEA__server__DOMAIN:=${RENDER_EXTERNAL_HOSTNAME:-}}"
    export GITEA__server__ROOT_URL GITEA__server__DOMAIN
    echo "bex-entrypoint: public address ${GITEA__server__ROOT_URL}"
else
    echo "bex-entrypoint: no public address; Gitea is private (ROOT_URL ${GITEA__server__ROOT_URL:-left at the Gitea default})"
fi

# Gitea shares the backend's database (one managed Postgres in total) and keeps
# its tables in a schema of its own. Nothing else creates it, and it must not
# wait on the API: the platform gives a service a limited time to become ready
# and does not retry afterwards, and the API can start much later than Gitea.
ensure_schema() {
    schema="${GITEA__database__SCHEMA:-}"
    [ -n "$schema" ] || return 0
    case "$schema" in
        *[!a-z0-9_]* | [0-9]*)
            echo "bex-entrypoint: GITEA__database__SCHEMA must be a plain lowercase name" >&2
            exit 1
            ;;
    esac
    host="${GITEA__database__HOST%%:*}"
    port=5432
    case "$GITEA__database__HOST" in *:*) port="${GITEA__database__HOST##*:}" ;; esac
    # The database may still be coming up on a first deploy. Say why each
    # attempt fails (libpq's message names no password), so a wrong host or
    # credential does not look like a hang.
    attempt=0
    while [ "$attempt" -lt 60 ]; do
        attempt=$((attempt + 1))
        if error=$(PGPASSWORD="${GITEA__database__PASSWD:-}" psql -v ON_ERROR_STOP=1 -qtA \
            "host=$host port=$port dbname=${GITEA__database__NAME:-gitea} user=${GITEA__database__USER:-gitea} sslmode=${GITEA__database__SSL_MODE:-require} connect_timeout=5" \
            -c "CREATE SCHEMA IF NOT EXISTS \"$schema\"" 2>&1); then
            echo "bex-entrypoint: schema $schema ensured"
            return 0
        fi
        echo "bex-entrypoint: schema $schema not created yet (attempt $attempt/60): $error" >&2
        sleep 5
    done
    echo "bex-entrypoint: could not create schema $schema" >&2
    exit 1
}

create_admin() {
    for _ in $(seq 1 90); do
        wget -qO- http://localhost:3000/api/healthz >/dev/null 2>&1 && break
        sleep 5
    done
    export GITEA_WORK_DIR=/data GITEA_CUSTOM=/data/gitea
    if su-exec git gitea --config /data/gitea/conf/app.ini admin user list 2>/dev/null |
        grep -Fq "$FAVA_API_ADMIN_USER"; then
        # The account outlives this service: it is a row in the shared Postgres,
        # while the password is generated per service. A Gitea service that was
        # deleted and created again (the only way to change its type) arrives
        # with a new password, which the API and the ledger are given too. Make
        # the account match, or every request they send is refused.
        if su-exec git gitea --config /data/gitea/conf/app.ini admin user change-password \
            --username "$FAVA_API_ADMIN_USER" \
            --password "$FAVA_API_ADMIN_PASSWORD" \
            --must-change-password=false >/dev/null; then
            echo "bex-entrypoint: admin '$FAVA_API_ADMIN_USER' already exists; password set from this deployment"
        else
            echo "bex-entrypoint: admin '$FAVA_API_ADMIN_USER' exists but its password could not be set" >&2
        fi
    else
        su-exec git gitea --config /data/gitea/conf/app.ini admin user create \
            --username "$FAVA_API_ADMIN_USER" \
            --password "$FAVA_API_ADMIN_PASSWORD" \
            --email "$GITEA_ADMIN_EMAIL" \
            --admin --must-change-password=false
    fi
}

ensure_schema

if [ -n "${FAVA_API_ADMIN_PASSWORD:-}" ]; then
    create_admin &
fi

exec /usr/bin/entrypoint "$@"
