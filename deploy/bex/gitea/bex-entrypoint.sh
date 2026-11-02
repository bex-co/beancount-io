#!/bin/sh
# Create the backend's Gitea administrator exactly once, in the background
# after Gitea reports healthy, then hand over to the stock entrypoint.
set -eu

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
