#!/usr/bin/env bash
#
# One-time provisioning after `docker compose up -d --build`:
#   1. verify postgres + gitea are up
#   2. create the Gitea admin user (idempotent) from FAVA_API_ADMIN_* in .env
#   3. apply backend-v2's pending database migrations
#   4. print a health summary
#
# Safe to re-run at any time.
#
set -euo pipefail

cd "$(dirname "$0")"

echo "🔧 Post-startup configuration..."
echo "================================"
echo ""

if [ -f .env ]; then
    # shellcheck disable=SC1091
    set -a; . ./.env; set +a
fi
FAVA_API_ADMIN_USER=${FAVA_API_ADMIN_USER:-beancount_admin}
FAVA_API_ADMIN_PASSWORD=${FAVA_API_ADMIN_PASSWORD:-change-me-local-only}
GITEA_ADMIN_EMAIL=${GITEA_ADMIN_EMAIL:-admin@example.com}

echo "🔍 Checking PostgreSQL..."
if docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-gitea}" > /dev/null 2>&1; then
    echo "✅ PostgreSQL (gitea) is ready"
else
    echo "❌ PostgreSQL (gitea) is not ready"
    echo "   Check logs with: docker compose logs postgres"
    exit 1
fi

echo ""
echo "🔍 Checking Gitea HTTP..."
if curl -sf http://localhost:42602 > /dev/null 2>&1; then
    echo "✅ Gitea HTTP is responding"
else
    echo "❌ Gitea HTTP is not responding"
    echo "   Check logs with: docker compose logs gitea"
    exit 1
fi

echo ""
echo "👤 Creating Gitea admin user..."
if docker compose exec -T -u git gitea gitea --config /data/gitea/conf/app.ini admin user list 2>/dev/null | grep -q "$FAVA_API_ADMIN_USER"; then
    echo "✅ Gitea admin user '$FAVA_API_ADMIN_USER' already exists"
else
    CREATE_OUTPUT=$(docker compose exec -T -u git gitea gitea --config /data/gitea/conf/app.ini admin user create \
        --username "$FAVA_API_ADMIN_USER" \
        --password "$FAVA_API_ADMIN_PASSWORD" \
        --email "$GITEA_ADMIN_EMAIL" \
        --admin \
        --must-change-password=false 2>&1 || true)

    if echo "$CREATE_OUTPUT" | grep -q -E "successfully created|user already exists"; then
        echo "✅ Gitea admin user '$FAVA_API_ADMIN_USER' created"
    else
        echo "⚠️  Could not create the Gitea admin user (Gitea may still be initializing)."
        echo "$CREATE_OUTPUT" | sed 's/^/   /'
        echo "   Re-run this script, or create it manually:"
        echo "   docker compose exec -u git gitea gitea --config /data/gitea/conf/app.ini admin user create --username $FAVA_API_ADMIN_USER --password '<password>' --email $GITEA_ADMIN_EMAIL --admin --must-change-password=false"
    fi
fi

echo ""
echo "🗃️  Applying backend-v2 database migrations..."
./apply-migrations.sh --yes

echo ""
echo "🔍 Service health summary..."
SERVICES=("postgres" "postgres-backend" "redis" "gitea" "ledger" "backend-v2" "dashboard")
HEALTHY=0
TOTAL=${#SERVICES[@]}
for service in "${SERVICES[@]}"; do
    if docker compose ps "$service" 2>/dev/null | grep -q "Up"; then
        echo "  ✅ $service"
        HEALTHY=$((HEALTHY + 1))
    else
        echo "  ❌ $service (not running)"
    fi
done

echo ""
echo "📊 Status: $HEALTHY/$TOTAL services up"
if [ "$HEALTHY" -eq "$TOTAL" ]; then
    echo "🎉 All services are up. Dashboard: http://localhost:42600"
else
    echo "⚠️  Some services are not up. Check logs with: docker compose logs -f"
fi
