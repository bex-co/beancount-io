# Gitea Feature

Git-server integration for API reads, commits and pull requests, user activity, smart-HTTP proxying, SSH proxying, and push policy.

## Layout

- `client/gitea-api.ts` — generated Gitea API client. Never hand-edit; regenerate from the backend package with `yarn generate-gitea-client`.
- `service/gitea-client-factory.ts` — low-level Basic Auth, token, and anonymous clients.
- `commits/`, `pull-request/`, `feed/`, `user-profile/` — GraphQL resolvers and domain services.
- `api/git-proxy-handler.ts` — allowlisted smart-HTTP transport. It is not a general Gitea REST proxy.
- `ssh/` — SSH authentication and git-over-HTTP bridge.
- `policy/` — shared push-policy logic used by both HTTP and SSH transports.

Application services should depend on `IGiteaClientFactory` from `src/foundation/clients/gitea-client-factory.ts`; it provisions the appropriate low-level client without exposing user credentials.

## Social authorization

Public profile, follower, following, and starred-repository discovery remains
anonymous and is explicitly inventoried in `server/api/op-class.ts`. Protected
feed, follow/unfollow, star/unstar, and authenticated star-status methods take
the resolved `Identity` and authorize at their application boundary before
Gitea work. The PDP checks star targets against current Gitea readability on
every call; 403/404 is a relationship denial, while source outages are audited
service-unavailable errors. Never cache that decision or copy the social graph
into authorization tuples.

`getFeed` accepts a session or account-wide OAuth with `ledger.read`, checked
against the caller’s exact-self user resource. API keys and ledger-pinned
credentials cannot read the account-wide feed. REST `/api-gateway/v1/account/feed`
and MCP `beancount://account/feed` delegate to the same service; follow/unfollow
remain session-only.

## Push policy

- HTTP and SSH must enforce the same repository-path grammar, `refs/heads/main` rule, and directive-limit decision. Shared decisions belong in `policy/`; transport files should only parse/encode their protocol.
- The directive-limit gate asks about the ledger's current count, not the contents of the incoming pack. It deliberately fails open when the limit/count service cannot answer so users are not locked out of shrinking a ledger through the app.
- Keep refusal wording and sideband behavior aligned across both transports.
- The SSH proxy remains disabled unless both `SSH_PROXY_ENABLED` and `SSH_PROXY_HOST_KEY` are configured. The host key must be the existing Gitea host key or clients will receive a host-key-changed warning.

## Feed caching and sources

`feed/service/feed-service.ts` merges three sources and caches each through `CacheHelper` using `CACHE_KEYS.feed.*` and `TTL.MIN_5`. Keep parsing in `activity-content-parser.ts` / `html-utils.ts`, transformation in `activity-transformer.ts`, and Redis cache policy in the service.

- `BLOG`: `https://beancount.io/{locale}/blog/atom.xml` (English at the root), cached per locale.
- `CHANGELOG`: `https://beancount.io/{locale}/changelog/rss.xml`, cached per locale. A localized feed that fails or is empty falls back to the English feed, and the fallback is cached under the requested locale so the failure logs once per cache window. Item ids carry a `changelog:` prefix so client caches never merge a release with its blog copy.
- `LEDGER_RSS`: the caller's Gitea activity.

`getFeed(source:)` restricts the result to one source and rejects any other value; the merged feed keeps a release once, as the changelog entry, and a `BLOG`-only request excludes releases too. The feed keeps no per-user state: reading position lives in the dashboard's local storage, not the database.

When adding a GraphQL sub-domain, keep its resolver and service together and register the resolver in `src/server/graphql/resolver-registry.ts`.
