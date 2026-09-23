# ADR 015: Managed price includes in the ledger service

- Status: Accepted (2026-09-15); section 3 amended 2026-09-16 (relayed caller credential, ADR 016 section 7). Implements the ledger-layer scope of `docs/prfaqs/PRFAQ002-include-live-price.md` (FAQ 16, "Ledger service" row).
- Decision owner: Ledger service (`backend-cluster/ledger`)

## Context

PRFAQ002 promises a one-line setup: `include "https://beancount.io/prices/BTC-USD"` in a ledger file supplies ordinary `price` directives that keep a holding valued at market. Today the hosted loader treats any URL include as a user error. `file-map-loader.ts` skips URL targets when it sweeps the repository, the WASM engine reports the include as a missing file, and `url-include-errors.ts` rewrites that report to "remote URLs are not supported".

Three facts measured on 2026-09-15 fix the design space:

1. **The engine key for a URL include is its join-and-normalize path.** A live probe against `@rustledger/wasm` 0.24.0 showed that `include "https://host/prices/BTC-USD"` in `main.bean` is looked up under `https:/host/prices/BTC-USD` (the double slash collapses), and under `sub/https:/host/prices/BTC-USD` when the include sits in `sub/x.bean`. Supplying the feed text under that key parses cleanly: 87 price directives, `valid: true`, and the `price-source`, `price-kind`, `observed-at`, and `provisional` metadata survive on each directive. Including the same URL from two directories doubles the directives. This is the same key `resolveIncludeTarget` already computes and `reportUrlIncludes` already relies on.
2. **The feed already matches the PRFAQ price-only contract.** `GET /prices/BTC-USD` returns `text/plain; charset=utf-8`, a strong `ETag`, `Cache-Control: public, max-age=60`, header comments naming the alias, commodity, quote, source, and a `revision`, and price directives carrying only the four allowlisted metadata keys. `HEAD` returns 405, so freshness checks must be conditional `GET`s. An unknown alias returns 404 with a plain-text reason. The revision and ETag change whenever the provisional spot changes, so most refreshes return 200, not 304.
3. **The committed-file cache is keyed by commit SHA and must stay price-free.** `load-cached-ledger-file-map.ts` caches the repository file map under the HEAD SHA and evicts only when HEAD moves. Anything baked into that value is pinned until the next push. The parsed-snapshot LRU in `snapshot-cache.ts` hashes the full file map, so any change to the materialized price text already produces a new snapshot key. The cache helper behind both is the process-local `cache-manager` store by default, with the same interface a Redis store would expose.

## Decision

The ledger service resolves allowlisted managed price URLs into validated, read-only virtual files that are overlaid onto the loaded file map after the SHA-keyed cache returns, backed by a separate feed cache whose refresh is driven by time stamps, never by cache expiry, and whose failures never evict the last validated revision.

### 1. Virtual files use the engine's own key

Each allowed URL include is materialized under `resolveIncludeTarget(includingPath, url)`, the key the engine looks up. Original files are never rewritten, so every source location in customer files is preserved. When one URL is included from several directories, the first key carries the feed text and the others carry a comment-only placeholder, so repeated includes never multiply entries.

### 2. URL policy and configuration

A URL is a managed price include only when its origin is in `MANAGED_PRICE_ORIGINS` (comma-separated, default `https://beancount.io` alone, matching PRFAQ002 section 15), its path is exactly `/prices/<ALIAS>` where `ALIAS` matches `[A-Za-z0-9._-]{1,64}`, and it carries no user info, query string, or fragment. Any other URL keeps the existing "not a repository path" error. Plain `http://` origins are not allowed unless an operator lists one explicitly. Setting the variable to an empty string disables managed prices entirely. Redirects are refused, so an allowlisted origin cannot escape to another host, and a feed that redirects (as `beancount.io/prices` does until the route is mounted) reports as unavailable rather than being fetched from wherever it points.

### 3. Bounded fetch

Fetches use Node's global `fetch` with a 5-second timeout, `Accept: text/plain`, `redirect: "error"`, and a 1 MiB body cap read incrementally. A ledger may resolve at most 16 distinct managed URLs per load. Materialized bytes count against the existing file-map byte and file limits. No ledger credential, ledger name, or private content is sent with a price request.

**Amended 2026-09-16 (ADR 016 section 7).** One exception to the last sentence: a request to `beancount.io/prices/<ALIAS>` carries the *caller's own* credential as a `Cookie: authSess:beancount.io=<token>` header, relayed from backend-v2 through the forwarded-context envelope. That route sits behind beancount.io's own login gate — a plain GET answers 302 to `/auth/login`, which this section's redirect rule correctly refuses — so without it every managed price include reports as unavailable. The sentence above still holds as written: no *ledger* credential, ledger name, or private content is sent. This service holds no credential of its own here, mints nothing, and does not verify what it relays; beancount.io verifies it, exactly as it would had the caller fetched the URL directly. The cookie is scoped to that host's `/prices/` paths, redirects remain unfollowed, and a request with no caller fetches anonymously. Mounting `/prices/<ALIAS>` as a public route retires the exception.

### 4. Price-only validation

A fetched body is accepted only when every non-blank line is a `;` comment, a `price` directive of the form `YYYY-MM-DD price COMMODITY NUMBER QUOTE`, or an indented metadata line whose key is one of `price-source`, `price-kind`, `observed-at`, `provisional`. Every directive must name the same commodity and quote pair, and that pair must match the `; commodity:` and `; quote:` header comments when present. Numbers must be finite and positive; dates must be real calendar dates. A body with zero price directives is a failure, never an empty feed. Any other directive (transaction, open, option, plugin, include, and the rest) rejects the whole body without partial ingestion. The engine's included-file sanitizer still blanks option and plugin lines as defense in depth.

### 5. Feed cache: immutable revision plus mutable head

The feed cache reuses the file-map cache's pattern of an immutable value and a small pointer, through the same `CacheHelper`:

| Key | Value | TTL |
| --- | --- | --- |
| `ledger:price_feed_blob_v1:<sha256(url)>:<revision>` | exact validated bytes plus alias, commodity, quote, source, ETag, feed `revision` line, latest `observed-at`, `fetchedAt` | 24h |
| `ledger:price_feed_head_v1:<sha256(url)>` | current `revision`, `nextRefreshAt`, last error message | 24h |

`revision` is the ETag when the server sends one and the SHA-256 of the body otherwise. Refresh is decided by `nextRefreshAt` inside the head, not by key expiry, so an outage never makes the pointer disappear. A successful fetch sets `nextRefreshAt` five minutes ahead; a failed one sets it one minute ahead and records the error while the previous revision keeps serving. The ETag and fetch time live on the blob they describe, so a head whose blob was evicted offers no stale ETag and simply fetches again. Concurrent loads for one URL coalesce through the shared `lock` keyed by URL, across every ledger on the node. A 304 only advances the refresh time. A 200 validates, writes the new blob, repoints the head, and deletes the superseded blob. A validation failure, timeout, non-2xx status, or empty body never replaces or deletes the last good blob. A manual refresh, when a client surface needs one, is a head update that sets `nextRefreshAt` to zero; it ships with that surface.

### 6. Overlay after the SHA cache, never inside it

`loadCachedFileMapForRepo` keeps caching the committed file map by SHA exactly as before. After that value is retrieved, the loader scans the include closure for managed URLs, resolves each through the feed cache, and returns a new file map with the virtual files added. Unchanged books therefore pick up new prices on the next load once the refresh window passes, and a price refresh never fetches the repository again, never creates a commit, and never invalidates the committed-file cache. Because the snapshot key hashes file-map bytes, a new revision automatically means a new parse, and the refresh window bounds how often that happens.

### 7. Ledger-authored prices win

Before a feed is materialized, the loader collects every `price` directive declared in the customer's own files as `(date, base, quote)`. A managed directive whose date and pair, or date and reciprocal pair, collide with one of them is replaced by a comment line along with its metadata lines, so line numbers inside the virtual file stay stable. Precedence is therefore decided before `price-map.ts` sees the directives and never depends on include order.

### 8. Freshness is computed when read, status travels with the load

The cached load returns `managedPrices`, one record per resolved URL: url, alias, the includes that named it, commodity, quote, source, revision, ETag, `observedAt`, `fetchedAt`, `nextRefreshAt`, `freshness` (`recent`, `stale`, or `unavailable`), the last error when any, how many points the ledger shadowed, and the dates the engine actually sees (which is what lets counting reports recognize feed directives exactly). The committed-file loader type stays free of managed fields; callers that only count or list repository files ask for the committed map and never trigger a fetch. Freshness compares the latest `observed-at` with the current clock at read time: recent within ten minutes, stale beyond it, unavailable when no validated revision exists. An unchanged ETag can still become stale. Nothing about freshness is stored.

### 9. Read-only boundaries

Virtual keys are never in `sourceFiles`, never counted toward the directive limit, never offered as entry targets, and never written. A write that resolves to a virtual key (editing or deleting a managed price entry through a source slice, or projecting a change onto that path) fails with an `OPERATION_NOT_ALLOWED` error that names the managed source. Document validation and repository inventory ignore virtual keys because they are not repository blobs.

### 10. Errors stay inspectable

When a managed URL has no validated revision, the engine's missing-file report is rewritten to name the include as written, its file and line, and to say the managed source is unavailable; the cause (a timeout, a 429, "body contained a transaction directive", and so on) travels in that source's status record, because the parse runs in a worker that has no access to the feed cache. A URL that fails the policy in section 2 gets a distinct message saying it is not an allowed managed price source and why. The feed cache also refuses a body whose header alias disagrees with the requested alias (compared ignoring case and separators, so `BTC-USD` and `BTCUSD` agree), or whose commodity pair differs from the revision it would replace, so a wrong instrument can never silently replace a right one. The books remain loadable in both cases: accounts, balances, and queries work, and the valuation simply lacks that pair.

## Consequences

- A refresh costs one conditional GET and one re-parse of the ledger, at most once per five minutes per URL per node. Coalescing keeps parallel dashboard panels on one fetch.
- Directive counts for tier limits exclude managed prices, so a price feed can never push a ledger over its free-tier limit.
- The journal and price views show managed entries with their virtual path as the file name. Editing them is refused with a precise error until the dashboard hides that action.
- Each node has its own feed cache under the default in-process store. Moving the cache helper to Redis shares revisions across nodes with no change to this design.
- Follow-ups outside this ADR: exposing `managedPrices` through backend-v2 on REST, GraphQL, and MCP with the dashboard freshness labels; snapshots and export; the instrument catalog; and a manual refresh endpoint. The `bea` CLI loader mirrors this contract locally; see [ADR 018](ADR018-cli-managed-price-includes.md).

**Amended 2026-09-23 (w2/m32).** Two of the follow-ups above have shipped: the status surface and the manual refresh.

- **Status.** The ledger service returns the section 8 records at `GET /reports/{owner}/{repo}/managed-prices` without parsing the ledger, minus the engine-only `effectiveDates`. backend-v2 exposes them under `ledger.reports.read` as `GET /api-gateway/v1/ledgers/{owner}/{name}/managed-prices`, the GraphQL query `getLedgerManagedPrices`, and the MCP resource `beancount://{owner}/{name}/managed-prices`.
- **Refresh.** Section 5's manual refresh is `POST …/managed-prices/refresh`, the mutation `refreshLedgerManagedPrices`, and the MCP tool `refreshManagedPrices`. Under the feed lock it zeroes each included URL's head `nextRefreshAt`, keeping the revision and last error, then returns the re-resolved status. It is gated on `ledger.entries.write`, not a read: the fetch it spends is shared by every ledger on the node, so read-only and anonymous viewers of a public ledger cannot trigger it.
- **Dashboard.** The commodities page shows each source's freshness, timestamps, last error and a Refresh prices action. The journal entry panel no longer offers Edit or Delete on managed entries, which retires the "until the dashboard hides that action" caveat above.

Snapshots and export, and the instrument catalog, remain open.

## Alternatives considered

- **Bake prices into the SHA-keyed file map.** Rejected: the cache invalidates only on push, so an untouched ledger would show stale prices for hours.
- **Rewrite the include line to a repository-style virtual path.** Rejected: it changes customer bytes during a read, which breaks the source-slice contract, and the engine already resolves the URL to a deterministic key.
- **Drive refresh by cache key expiry.** Rejected: a pointer that expires during an outage takes the last good revision with it. Time stamps inside a long-lived head keep the fallback available.
- **Delete the cached feed on a failed refresh.** Rejected by PRFAQ002 FAQ 8: a bad refresh must never replace a good cache entry with nothing.
- **Add the feed revision to the file-map cache key.** Rejected: it would store one full copy of the ledger per price revision.
