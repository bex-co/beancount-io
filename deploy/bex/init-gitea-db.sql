-- One-time: give Gitea its own database inside the single managed Postgres.
-- Run as the instance owner (the role the backend uses):
--   bex psql <postgres-id> -c 'CREATE DATABASE gitea'
-- CREATE DATABASE cannot run inside a transaction or a function, so it is a
-- plain statement; re-running it errors harmlessly with "already exists".
CREATE DATABASE gitea;
