# Gitea Feature

## Purpose

Git server integration — wraps Gitea API for commits, PRs, user profiles, and activity feed.

## Sub-Domain Architecture

Each sub-domain has its own `api/` + `service/` directories:

| Sub-domain      | Description                                                       |
| --------------- | ----------------------------------------------------------------- |
| `commits/`      | Commit history resolver + service                                 |
| `pull-request/` | PR list/detail resolver + service                                 |
| `feed/`         | Activity feed with caching, HTML parsing, activity transformation |
| `user-profile/` | Gitea user profile resolver + service (with test fixtures)        |

## Shared Infrastructure

- **`client/gitea-api.ts`** — Auto-generated Gitea API client. **DO NOT MODIFY** — regenerate with `yarn generate-gitea-client`
- **`service/gitea-client-factory.ts`** — Creates authenticated Gitea clients (Basic Auth or token-based)
- **`api/git-proxy-handler.ts`** — Proxies raw Git HTTP requests to Gitea

## Feed Caching

`feed-service.ts` caches parsed activity feeds in Redis via the shared
`cacheHelper` (`@/shared/cache`), keyed with `CACHE_KEYS.feed.*` and a `TTL.MIN_5`
TTL. Redis (not in-process) keeps the feed consistent across server instances.

### Feed Pipeline

```
Gitea RSS → cacheHelper (Redis) → html-utils.ts (parse HTML) → activity-transformer.ts → GraphQL response
```

## Adding a New Sub-Domain

1. Create `gitea/[name]/api/` + `gitea/[name]/service/`
2. Register resolver in `api-gateway.ts`
