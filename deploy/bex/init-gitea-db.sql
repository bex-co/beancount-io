-- Only needed when Gitea does not run through deploy/bex/gitea (whose entrypoint
-- runs the same statement). Gives Gitea its own schema inside the single managed Postgres.
-- The instance owner cannot CREATE DATABASE on bex, so isolation is by schema
-- (GITEA__database__SCHEMA=gitea); backend tables stay in `public`.
--   bex psql <postgres-id> -c 'CREATE SCHEMA IF NOT EXISTS gitea'
CREATE SCHEMA IF NOT EXISTS gitea;
