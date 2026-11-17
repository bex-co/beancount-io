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
# It also pins the address handling: Gitea is a private service on bex and has no
# public address, so the wrapper must say so and still start it; where a platform
# does give one, that becomes ROOT_URL, and an operator's own value wins. And it
# pins that an administrator left in the database by an earlier Gitea service is
# given this service's password, which is what the API and the ledger present.
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

echo "== a private service has no public address and keeps Gitea's own default"
# The Blueprint makes Gitea a pserv, so the platform sets no RENDER_EXTERNAL_URL.
docker run -d --name "$NET-a" --network "$NET" "${ENV_ARGS[@]}" "$IMAGE" >/dev/null
wait_log "$NET-a" "schema gitea ensured" 30
check "says it is private" 1 "$(docker logs "$NET-a" 2>&1 | grep -c 'no public address; Gitea is private')"
check "invents no public address" 0 "$(docker logs "$NET-a" 2>&1 | grep -c 'bex-entrypoint: public address')"
wait_log "$NET-a" "Starting Gitea" 60
check "Gitea starts" 1 "$(docker logs "$NET-a" 2>&1 | grep -c 'Starting Gitea')"
docker rm -f "$NET-a" >/dev/null

echo "== where the platform does give a public address, it becomes ROOT_URL"
docker run -d --name "$NET-a" --network "$NET" "${ENV_ARGS[@]}" \
  -e RENDER_EXTERNAL_URL=https://git-x9.example.test -e RENDER_EXTERNAL_HOSTNAME=git-x9.example.test \
  "$IMAGE" >/dev/null
wait_log "$NET-a" "schema gitea ensured" 30
check "uses the platform's address" 1 "$(docker logs "$NET-a" 2>&1 | grep -c 'public address https://git-x9.example.test/$')"
docker rm -f "$NET-a" >/dev/null

echo "== an address the operator set wins over the platform's"
docker run -d --name "$NET-a" --network "$NET" "${ENV_ARGS[@]}" \
  -e RENDER_EXTERNAL_URL=https://git-x9.example.test -e GITEA__server__ROOT_URL=https://git.mycorp.test/ \
  "$IMAGE" >/dev/null
wait_log "$NET-a" "schema gitea ensured" 30
check "keeps the operator's" 1 "$(docker logs "$NET-a" 2>&1 | grep -c 'public address https://git.mycorp.test/$')"
docker rm -f "$NET-a" >/dev/null

echo "== a service created again, with a new generated password, still owns its administrator"
# The account is a row in the shared Postgres; the password is generated per
# service. Deleting and creating the Gitea service (bex's only way to change its
# type) keeps the row and changes the password the API and ledger are handed.
ADMIN_ARGS=(
  -e GITEA__security__INSTALL_LOCK=true -e FAVA_API_ADMIN_USER=beancount_admin
  -e GITEA_ADMIN_EMAIL=admin@example.test
)
signs_in() { # container, password -> HTTP status of an authenticated request
  docker exec "$1" curl -s -o /dev/null -w '%{http_code}' -u "beancount_admin:$2" http://localhost:3000/api/v1/user
}
docker run -d --name "$NET-a" --network "$NET" "${ENV_ARGS[@]}" "${ADMIN_ARGS[@]}" \
  -e FAVA_API_ADMIN_PASSWORD=first-generated-password "$IMAGE" >/dev/null
wait_log "$NET-a" "New user 'beancount_admin' has been successfully created" 180
check "first boot creates the administrator" 200 "$(signs_in "$NET-a" first-generated-password)"
docker rm -f "$NET-a" >/dev/null
docker run -d --name "$NET-a" --network "$NET" "${ENV_ARGS[@]}" "${ADMIN_ARGS[@]}" \
  -e FAVA_API_ADMIN_PASSWORD=second-generated-password "$IMAGE" >/dev/null
wait_log "$NET-a" "password set from this deployment" 180
check "the wrapper says it set the password" 1 "$(docker logs "$NET-a" 2>&1 | grep -c 'already exists; password set from this deployment')"
check "the new password signs in" 200 "$(signs_in "$NET-a" second-generated-password)"
check "the old password no longer does" 401 "$(signs_in "$NET-a" first-generated-password)"
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
