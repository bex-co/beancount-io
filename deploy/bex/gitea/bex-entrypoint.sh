#!/bin/sh
# Tell Gitea its own public address, create the backend's Gitea administrator
# exactly once (in the background, after Gitea reports healthy), then hand over
# to the stock entrypoint.
set -eu

# The platform assigns the hostname, and a second deployer of this Blueprint is
# given a different one when the first choice is taken, so it cannot be written
# into the Blueprint. bex tells the service its own address; use it unless the
# operator set Gitea's address themselves.
if [ -n "${RENDER_EXTERNAL_URL:-}" ]; then
    : "${GITEA__server__ROOT_URL:=${RENDER_EXTERNAL_URL%/}/}"
    : "${GITEA__server__DOMAIN:=${RENDER_EXTERNAL_HOSTNAME:-}}"
    export GITEA__server__ROOT_URL GITEA__server__DOMAIN
fi

create_admin() {
    for _ in $(seq 1 90); do
        wget -qO- http://localhost:3000/api/healthz >/dev/null 2>&1 && break
        sleep 5
    done
    export GITEA_WORK_DIR=/data GITEA_CUSTOM=/data/gitea
    if su-exec git gitea --config /data/gitea/conf/app.ini admin user list 2>/dev/null |
        grep -Fq "$FAVA_API_ADMIN_USER"; then
        echo "bex-entrypoint: admin '$FAVA_API_ADMIN_USER' already exists"
    else
        su-exec git gitea --config /data/gitea/conf/app.ini admin user create \
            --username "$FAVA_API_ADMIN_USER" \
            --password "$FAVA_API_ADMIN_PASSWORD" \
            --email "$GITEA_ADMIN_EMAIL" \
            --admin --must-change-password=false
    fi
}

if [ -n "${FAVA_API_ADMIN_PASSWORD:-}" ]; then
    create_admin &
fi

exec /usr/bin/entrypoint "$@"
