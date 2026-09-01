#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_NAME
readonly CURRENT_PASSWORD_PATTERN='^v2_[A-Za-z0-9]{32}$'

usage() {
  cat <<EOF
Diagnose whether the backend database is ready for LedgerPasswordRotationJob
to be removed. This script is read-only and never selects ledger passwords.

Usage:
  POSTGRES_BACKEND_URI='postgresql://...' ./_infra/${SCRIPT_NAME}

DATABASE_URL is accepted as a fallback when POSTGRES_BACKEND_URI is unset.

Exit codes:
  0  Database is ready for removal (runtime checks are still required)
  1  Database contains blockers; do not remove the job
  2  The diagnostic could not run
EOF
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 2
}

# Invoked indirectly by the ERR trap below.
# shellcheck disable=SC2329
unexpected_error() {
  local exit_code=$?
  printf 'ERROR: diagnostic command failed (exit %s)\n' "$exit_code" >&2
  exit 2
}

trap unexpected_error ERR

if [[ ${1:-} == "--help" || ${1:-} == "-h" ]]; then
  usage
  exit 0
fi

if (( $# > 0 )); then
  usage >&2
  exit 2
fi

command -v psql >/dev/null 2>&1 || fail "psql is required but was not found in PATH"

database_url="${POSTGRES_BACKEND_URI:-${DATABASE_URL:-}}"
[[ -n "$database_url" ]] || fail \
  "POSTGRES_BACKEND_URI (or DATABASE_URL) is required"

printf 'Ledger password rotation database diagnostic\n'
printf '============================================\n'
printf 'Mode: read-only\n\n'

summary=""
if ! summary="$(
  psql "$database_url" \
    --no-psqlrc \
    --quiet \
    --tuples-only \
    --no-align \
    --field-separator '|' \
    --set ON_ERROR_STOP=1 <<SQL
BEGIN TRANSACTION READ ONLY;

WITH user_summary AS (
  SELECT
    count(*)::bigint AS total_users,
    count(*) FILTER (
      WHERE ledger_password ~ '${CURRENT_PASSWORD_PATTERN}'
    )::bigint AS exact_current_passwords,
    count(*) FILTER (
      WHERE left(ledger_password, 3) <> 'v2_'
    )::bigint AS legacy_candidates,
    count(*) FILTER (
      WHERE left(ledger_password, 3) <> 'v2_' AND NOT is_blocked
    )::bigint AS active_legacy_candidates,
    count(*) FILTER (
      WHERE left(ledger_password, 3) <> 'v2_' AND is_blocked
    )::bigint AS blocked_legacy_candidates,
    count(*) FILTER (
      WHERE left(ledger_password, 3) = 'v2_'
        AND ledger_password !~ '${CURRENT_PASSWORD_PATTERN}'
    )::bigint AS malformed_v2_passwords,
    count(*) FILTER (
      WHERE btrim(ledger_username) = ''
    )::bigint AS blank_usernames
  FROM users
), duplicate_summary AS (
  SELECT count(*)::bigint AS duplicate_username_groups
  FROM (
    SELECT lower(ledger_username)
    FROM users
    GROUP BY lower(ledger_username)
    HAVING count(*) > 1
  ) AS duplicate_usernames
)
SELECT
  total_users,
  exact_current_passwords,
  legacy_candidates,
  active_legacy_candidates,
  blocked_legacy_candidates,
  malformed_v2_passwords,
  blank_usernames,
  duplicate_username_groups,
  CASE
    WHEN total_users = 0 THEN '100.00'
    ELSE to_char(
      100.0 * exact_current_passwords / total_users,
      'FM999990.00'
    )
  END AS exact_current_percent
FROM user_summary
CROSS JOIN duplicate_summary;

COMMIT;
SQL
)"; then
  fail "could not query the database"
fi

summary="$(printf '%s\n' "$summary" | sed '/^[[:space:]]*$/d' | tail -n 1)"
IFS='|' read -r \
  total_users \
  exact_current_passwords \
  legacy_candidates \
  active_legacy_candidates \
  blocked_legacy_candidates \
  malformed_v2_passwords \
  blank_usernames \
  duplicate_username_groups \
  exact_current_percent <<<"$summary"

for numeric_value in \
  "$total_users" \
  "$exact_current_passwords" \
  "$legacy_candidates" \
  "$active_legacy_candidates" \
  "$blocked_legacy_candidates" \
  "$malformed_v2_passwords" \
  "$blank_usernames" \
  "$duplicate_username_groups"; do
  [[ "$numeric_value" =~ ^[0-9]+$ ]] || fail "database returned an unexpected summary"
done

printf 'Summary\n'
printf '  Total backend users:                  %s\n' "$total_users"
printf '  Exact current passwords:              %s (%s%%)\n' \
  "$exact_current_passwords" "$exact_current_percent"
printf '  Legacy rotation candidates:           %s\n' "$legacy_candidates"
printf '    Active:                              %s\n' "$active_legacy_candidates"
printf '    Blocked:                             %s\n' "$blocked_legacy_candidates"
printf '  Malformed v2 passwords:                %s\n' "$malformed_v2_passwords"
printf '  Blank ledger usernames:                %s\n' "$blank_usernames"
printf '  Duplicate username groups (casefold):  %s\n' "$duplicate_username_groups"

if (( legacy_candidates > 0 )); then
  printf '\nLegacy candidates still selected by the job\n'
  psql "$database_url" \
    --no-psqlrc \
    --quiet \
    --set ON_ERROR_STOP=1 \
    --pset pager=off <<'SQL'
BEGIN TRANSACTION READ ONLY;

SELECT
  id AS user_id,
  ledger_username,
  CASE WHEN is_blocked THEN 'blocked' ELSE 'active' END AS account_status,
  create_at,
  update_at,
  last_seen_at
FROM users
WHERE left(ledger_password, 3) <> 'v2_'
ORDER BY is_blocked, create_at, id;

COMMIT;
SQL
fi

if (( malformed_v2_passwords > 0 )); then
  printf '\nMalformed v2 passwords ignored by the current job\n'
  psql "$database_url" \
    --no-psqlrc \
    --quiet \
    --set ON_ERROR_STOP=1 \
    --pset pager=off <<SQL
BEGIN TRANSACTION READ ONLY;

SELECT
  id AS user_id,
  ledger_username,
  char_length(ledger_password) AS password_length,
  update_at
FROM users
WHERE left(ledger_password, 3) = 'v2_'
  AND ledger_password !~ '${CURRENT_PASSWORD_PATTERN}'
ORDER BY update_at, id;

COMMIT;
SQL
fi

if (( blank_usernames > 0 )); then
  printf '\nUsers with blank ledger usernames\n'
  psql "$database_url" \
    --no-psqlrc \
    --quiet \
    --set ON_ERROR_STOP=1 \
    --pset pager=off <<'SQL'
BEGIN TRANSACTION READ ONLY;

SELECT id AS user_id, is_blocked, create_at, update_at
FROM users
WHERE btrim(ledger_username) = ''
ORDER BY create_at, id;

COMMIT;
SQL
fi

if (( duplicate_username_groups > 0 )); then
  printf '\nCase-insensitive duplicate ledger usernames\n'
  psql "$database_url" \
    --no-psqlrc \
    --quiet \
    --set ON_ERROR_STOP=1 \
    --pset pager=off <<'SQL'
BEGIN TRANSACTION READ ONLY;

SELECT
  lower(ledger_username) AS normalized_username,
  count(*) AS user_count,
  string_agg(id, ', ' ORDER BY id) AS user_ids,
  string_agg(ledger_username, ', ' ORDER BY id) AS stored_usernames
FROM users
GROUP BY lower(ledger_username)
HAVING count(*) > 1
ORDER BY lower(ledger_username);

COMMIT;
SQL
fi

blocker_count=$((
  legacy_candidates
  + malformed_v2_passwords
  + blank_usernames
  + duplicate_username_groups
))

printf '\nVerdict\n'
if (( blocker_count > 0 )); then
  printf '  NOT SAFE TO REMOVE LedgerPasswordRotationJob\n'
  printf '  Resolve every row/group reported above, then run this diagnostic again.\n'
  printf '  Gitea existence and username redirects cannot be inferred from this database.\n'
  exit 1
fi

printf '  DATABASE READY FOR REMOVAL\n'
printf '  Before deleting the job, also confirm that:\n'
printf '    1. every production backend instance uses the v2 password generator;\n'
printf '    2. this result remains clean through the deployment/observation window; and\n'
printf '    3. no recent LedgerPasswordRotationJob failures exist in production logs.\n'
exit 0
