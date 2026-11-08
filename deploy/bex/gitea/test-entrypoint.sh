#!/usr/bin/env bash
# Run the Gitea wrapper (bex-entrypoint.sh) against a real Postgres.
#
#     deploy/bex/gitea/test-entrypoint.sh      # needs docker
#
# What it pins: the wrapper creates Gitea's schema itself, before Gitea starts,
# instead of waiting for another service to; it refuses a schema name that is not
# a plain lowercase identifier; a second boot is harmless; and a database that is
# not up yet is waited for, not raced. These are the faults a clean second
# workspace showed, where Gitea missed its readiness deadline waiting on the API.
set -u

cd "$(dirname "$0")"
IMAGE=bex-gitea-wrapper-test
NET=bex-gitea-wrapper-test-net
PG=bex-gitea-wrapper-test-pg
ENV_ARGS=(
  -e GITEA__database__DB_TYPE=postgres -e GITEA__database__HOST=$PG
  -e GITEA__database__NAME=backend -e GITEA__database__USER=postgres
  -e GITEA__database__PASSWD=pw -e GITEA__database__SSL_MODE=disable
  -e GITEA__database__SCHEMA=gitea
)
failures=0

cleanup() {
  docker rm -f "$PG" "$NET-a" "$NET-b" "$NET-c" >/dev/null 2>&1
  docker network rm "$NET" >/dev/null 2>&1
  docker rmi "$IMAGE" >/dev/null 2>&1
}
trap cleanup EXIT
cleanup

check() { # description, expected, actual
  if [ "$2" = "$3" ]; then echo "ok   - $1"; else echo "FAIL - $1 (expected '$2', got '$3')"; failures=$((failures + 1)); fi
}
start_pg() {
  docker run -d --name "$PG" --network "$NET" -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=backend postgres:16-alpine >/dev/null
}
wait_pg() {
  for _ in $(seq 1 60); do docker exec "$PG" pg_isready -U postgres >/dev/null 2>&1 && return 0; sleep 1; done
  return 1
}
schema_rows() {
  docker exec "$PG" psql -U postgres -d backend -tAc "select count(*) from information_schema.schemata where schema_name='gitea'" 2>/dev/null
}
ensured() { docker logs "$1" 2>&1 | grep -c "schema gitea ensured"; }
wait_log() { # container, pattern, seconds
  for _ in $(seq 1 "$3"); do docker logs "$1" 2>&1 | grep -q "$2" && return 0; sleep 1; done
  return 1
}

docker build -q -t "$IMAGE" . >/dev/null || { echo "FAIL - image does not build"; exit 1; }
docker network create "$NET" >/dev/null

echo "== the schema is created, before Gitea starts"
start_pg; wait_pg
docker run -d --name "$NET-a" --network "$NET" "${ENV_ARGS[@]}" "$IMAGE" >/dev/null
wait_log "$NET-a" "schema gitea ensured" 30
check "schema exists after boot" 1 "$(schema_rows)"
check "wrapper said so" 1 "$(ensured "$NET-a")"
docker rm -f "$NET-a" >/dev/null

echo "== a second boot is harmless"
docker run -d --name "$NET-a" --network "$NET" "${ENV_ARGS[@]}" "$IMAGE" >/dev/null
wait_log "$NET-a" "schema gitea ensured" 30
check "second boot ensures it again" 1 "$(ensured "$NET-a")"
docker rm -f "$NET-a" >/dev/null

echo "== a name that is not a plain lowercase identifier is refused"
# Detached and time-boxed: a wrapper that did not refuse would keep running Gitea.
docker run -d --name "$NET-c" --network "$NET" "${ENV_ARGS[@]/SCHEMA=gitea/SCHEMA=git-ea}" "$IMAGE" >/dev/null
wait_log "$NET-c" "must be a plain lowercase name" 15
check "refused" 1 "$(docker logs "$NET-c" 2>&1 | grep -c 'must be a plain lowercase name')"
check "and did not start Gitea" 0 "$(docker logs "$NET-c" 2>&1 | grep -c 'Starting Gitea')"
docker rm -f "$NET-c" >/dev/null

echo "== a database that is not up yet is waited for"
docker rm -f "$PG" >/dev/null
docker run -d --name "$NET-b" --network "$NET" "${ENV_ARGS[@]}" "$IMAGE" >/dev/null
sleep 8
check "gitea has not started before the database exists" 0 "$(docker logs "$NET-b" 2>&1 | grep -c 'Starting Gitea')"
check "the wrapper says why it is waiting" 1 "$(docker logs "$NET-b" 2>&1 | grep -c 'not created yet' | sed 's/^[1-9][0-9]*$/1/')"
start_pg
wait_log "$NET-b" "schema gitea ensured" 90
check "schema exists once the database appears" 1 "$(schema_rows)"

echo
if [ "$failures" -eq 0 ]; then echo "all passed"; else echo "$failures failed"; exit 1; fi
