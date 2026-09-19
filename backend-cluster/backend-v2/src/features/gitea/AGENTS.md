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

## Push policy

- HTTP and SSH must enforce the same repository-path grammar, `refs/heads/main` rule, and directive-limit decision. Shared decisions belong in `policy/`; transport files should only parse/encode their protocol.
- The directive-limit gate asks about the ledger's current count, not the contents of the incoming pack. It deliberately fails open when the limit/count service cannot answer so users are not locked out of shrinking a ledger through the app.
- Keep refusal wording and sideband behavior aligned across both transports.
- The SSH proxy remains disabled unless both `SSH_PROXY_ENABLED` and `SSH_PROXY_HOST_KEY` are configured. The host key must be the existing Gitea host key or clients will receive a host-key-changed warning.

## Feed caching

`feed/service/feed-service.ts` caches parsed activity feeds through `CacheHelper` using `CACHE_KEYS.feed.*` and `TTL.MIN_5`. Keep parsing in `activity-content-parser.ts` / `html-utils.ts`, transformation in `activity-transformer.ts`, and Redis cache policy in the service.

When adding a GraphQL sub-domain, keep its resolver and service together and register the resolver in `src/server/graphql/resolver-registry.ts`.
