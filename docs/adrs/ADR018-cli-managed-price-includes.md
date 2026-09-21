# ADR 018: Managed price includes in the `bea` CLI

- Status: Accepted (2026-09-19), documenting the design shipped as `.pm` milestone w1/m29 (commits `4ed7e101`…`358ba4dc`).
- Decision owner: CLI (`cli/`)
- Contract mirrored: [ADR 015](ADR015-ledger-managed-price-includes.md). Implements the CLI row of [PRFAQ002](../prfaqs/PRFAQ002-include-live-price.md) FAQ 16, and its FAQ 12 requirement 5 ("controlled cache files for the local loader") and FAQ 9 compatibility boundary.

## Authentication amendment — 2026-09-21

[PRFAQ003](../prfaqs/PRFAQ003-cli-live-prices.md) supersedes the anonymous-feed
assumption in the original decision. Production prices accept the existing
cloud login as a bearer; no public anonymous mount is required. CLI 0.3.0
relays saved login or `BEA_TOKEN` through the child environment, without
importing frontend auth into the engine. Only HTTPS `beancount.io` (default
port 443) with an exact `/prices/<ALIAS>` path receives it. Custom allowed
origins and redirects never receive credentials. Local/offline loads do not
require login. Tokens never enter argv, ledger files, cached feed metadata,
exports or diagnostics.

Explicit refresh collects every source outcome and fails with the full result
when any source fails, even if cached prices remain usable. Strict refresh
also fails on stale observations; offline refresh refuses before changing any
refresh window. Ordinary reports include the exact load's `price_sources` in
JSON and warn about observation age and refresh errors in text. This source
freshness is separate from valuation completeness and is not calendar-aware.

Deterministic fixture and real subprocess tests cover authentication scope,
login expiry, per-source refresh failure and unchanged cached data. Installed
artifact smokes use synthetic credentials and an HTTPS fixture transport.
`make live-prices` explicitly tests authenticated production refresh, valuation,
offline replay, export and manual precedence; the checked-in evidence contains
only public source metadata. Routine unit tests never need a personal login.

## Context

PRFAQ002 promises that `include "https://beancount.io/prices/BTC-USD"` values a holding at market. ADR 015 settled that contract for the hosted ledger service on 2026-09-15. The CLI has to honor the same line, and three facts about the local environment fix its design space:

1. **Upstream Beancount resolves includes as filesystem paths, not as a file map.** A local Beancount 3.2.3 probe of the exact BTC-USD include, with sockets disabled, produced no entries and `File glob "https://beancount.io/prices/BTC-USD" does not match any files`. There is no in-memory file map to overlay the way `loadCachedFileMapForRepo` is overlaid hosted-side (ADR 015 section 6), so the same decision needs a different mechanism.
2. **Every `bea` verb loads the ledger, and they must agree.** `check`, `list`, `query`, `report`, `import`, and write validation each reach Beancount through their own call site (`ledger/reader.py`, `query.py`, `importing.py`, `fava/beans/load.py`, `ledger/write.py`, `ledger/adding.py`). A report-only implementation would leave a connected book inconsistent between commands — `bea report` valuing a holding that `bea check` calls unpriced.
3. **The CLI has no server or request scope.** There is no shared process cache or Redis. The original design assumed anonymous feeds; the authentication amendment above reuses the existing cloud credential for managed price access. Concurrent `bea` invocations are separate processes that can race on the same cache directory.

## Decision

The CLI mirrors ADR 015's policy, fetch, validation, caching, and precedence rules decision-for-decision, and realizes them locally by **staging a rewritten shadow of the include closure beside the customer's files** and by **caching feed revisions on disk under XDG**. Resolution happens once, engine-side, in a single wrapper that every load path calls.

### 1. The policy, fetch, and validation are a line-by-line mirror

`bea_engine/managed_prices.py` restates ADR 015 sections 2, 3, 4, and 10 with the same constants and the same refusal reasons: the `MANAGED_PRICE_ORIGINS` allowlist (default `https://beancount.io`, empty disables the feature), the exact `/prices/<ALIAS>` path with `[A-Za-z0-9._-]{1,64}`, no user info, query, or fragment; a 5-second timeout, `Accept: text/plain`, refused redirects, a 1 MiB incrementally-read body cap, and at most 16 distinct URLs per load; the price-only grammar with the four allowlisted metadata keys, one commodity pair per feed agreeing with the header, finite positive decimals, real calendar dates, zero directives treated as failure, and any other directive rejecting the body whole without partial ingestion; and the alias/pair identity check comparing aliases ignoring case and separators.

Mirroring rather than sharing is deliberate: the two engines are a Python process and a TypeScript service with no runtime coupling, and PRFAQ002 FAQ 16 forbids cross-package runtime imports. The cost is two implementations of one contract; the mitigation is that the contract is fixed in ADR 015 and both sides are tested against equivalent fixtures.

**Credential boundary:** only the canonical production HTTPS price request may receive the frontend-relayed bearer. No ledger name or content is sent. Ordinary local usage stays account-free.

### 2. Resolution is staged beside the source, never in place

`bea_engine/managed_load.py` captures the include closure, then writes a shadow of every closure file through `candidate_file` — the same beside-source staging that write validation already uses, so relative documents, plugins, and globs keep working paths — and loads the staged root. In each staged copy, local includes expand to their staged twins, and the first managed include for a URL is rewritten to that feed's effective file.

The customer's own files are never touched during a read. Entry and error filenames are mapped back to the originals before anything leaves the loader, as are `options["filename"]` and `options["include"]`, so every diagnostic names the file the customer wrote. Feed entries keep their cache paths as filenames, exactly as hosted entries keep their virtual paths — that is what makes a managed entry identifiable downstream.

A ledger with no managed include is detected from the closure and loaded by calling `loader.load_file` directly, with no staging and no overhead.

### 3. One wrapper, every load path

`managed_load.load_file` is a drop-in for `loader.load_file`, and `load_with_sources` returns the same load plus per-source records. Every load path calls one of the two: directive reads, query, import, the vendored Fava loader, write validation, and the add/append paths. No command can see a different ledger than another.

### 4. Repeated includes, deduplicated by URL

Managed includes are grouped by canonical URL. The first include line for a URL carries the feed; every other occurrence is swapped for a comment-only placeholder that preserves the line count. Including the same feed from two files therefore never multiplies entries — the same guarantee ADR 015 section 1 gives with placeholder virtual files.

### 5. Ledger-authored prices win, decided on the feed text

Before staging, every `(date, base, quote)` the customer's own files declare is collected textually — the same approach as the hosted collector, so both engines shadow the same points. A managed point whose date and pair, or date and reciprocal pair, collides is replaced by a comment, with its metadata lines commented in place, so the line count and every line number inside the revision stay stable. Precedence is settled before Beancount builds a price map and never depends on include order, satisfying PRFAQ002 FAQ 7.

The resulting effective text is written once per `(revision, ledger)` beside the revision in the cache, so the status view and the portable export read the exact bytes the load parsed.

### 6. The feed cache is an immutable revision under a mutable head, on disk

`bea_engine/managed_price_cache.py` reproduces ADR 015 section 5 on the filesystem, under `<XDG_CACHE_HOME>/bea/managed-prices/<sha256(url)[:32]>/`:

| File | Contents |
| --- | --- |
| `head.json` | serving `revision`, `next_refresh_at`, `last_error` |
| `<revision>.beancount` | the exact validated bytes |
| `<revision>.json` | ETag, `fetched_at`, and the validated feed summary |
| `<revision>.effective.<ledger>.beancount` | section 5's precedence-applied text, per ledger |

Refresh is driven by `next_refresh_at` inside the head, never by file expiry, so nothing can make the last good revision disappear during an outage. A success sets it 300 seconds ahead; a failure sets it 60 seconds ahead and records the error while the previous revision keeps serving. The ETag lives on the blob it describes, so a head whose blob went missing offers no stale ETag and simply fetches again. A 200 validates, writes the blob, repoints the head, then deletes the superseded blob and its per-ledger effective texts. A validation failure, timeout, non-2xx, redirect, oversized body, or non-UTF-8 body never replaces or deletes the last good blob.

**Concurrency is handled by write ordering, not by locking.** Every write is an atomic rename, blob before head, so a concurrent `bea` process can only ever observe a complete revision. Two simultaneous loads may both fetch; the only cost is a redundant conditional GET, because feeds are idempotent bytes. This is the one place the local design does less than hosted, which coalesces through a shared lock — a process-local lock cannot coalesce across processes, and a file lock would add a failure mode worth more than the duplicated request.

### 7. Freshness is computed at read time and travels with the load

Each resolved URL yields a `ManagedSource`: url, alias, the include lines that named it, commodity, quote, source, revision, ETag, `observed_at`, `fetched_at`, `next_refresh_at`, `freshness`, the last error, the shadowed count, and the dates the engine actually sees. Freshness compares the latest `observed-at` with the clock at read time — recent within 600 seconds, stale beyond, unavailable with no validated revision — and is never stored. A feed with no parseable `observed-at` reads stale: without an observation age there is nothing fresh to claim.

### 8. Offline and strict are global modes

Two modes exist locally that the hosted contract does not need:

- `--offline` reads the head and its blob only, makes no network call, and writes nothing. PRFAQ002 FAQ 8 requires it; with no cache it reports the source unavailable while the books stay readable.
- `--strict-prices` fails the load, naming the source and its cause, when any managed source is stale or unavailable, for automation that must not silently degrade.

Both are top-level `bea` options that reach the engine through `MANAGED_PRICE_OFFLINE` / `MANAGED_PRICE_STRICT` on the helper's environment, so every load-bearing helper call honors them without threading a flag through each command's argv. An explicit flag wins over the inherited environment.

### 9. Status, refresh, and export are the customer surface

`bea price` gains three subcommands ahead of its existing `bean-price` passthrough:

- `bea price status` — every managed source with freshness, revision, observed-at, next refresh, shadowed count, and last error, as a table or as JSON.
- `bea price refresh` — zeroes each head's `next_refresh_at` and re-resolves, reporting `previous → new` per source.
- `bea price export [--output DIR] [--allow-errors]` — the portable export below.

Anything else still forwards to upstream `bean-price`, so a quotes job file literally named `status` must be passed by path.

### 10. The portable export satisfies the compatibility boundary

`bea price export` writes a self-contained copy: every closure file with its includes rewritten to relative targets, and each feed at `prices/<ALIAS>.beancount` carrying a `custom "bea-managed-source"` marker (alias, url, revision, observed-at, fetched-at, shadowed count) followed by the exact effective text the load parsed. Files outside the root's directory land under `_shared/`. Exporting into a directory that already holds a closure file is refused rather than overwriting it. An unavailable source refuses the export naming it, unless `--allow-errors` accepts the marker alone.

The result is checkable by unmodified upstream Beancount and values the ledger identically — PRFAQ002 FAQ 9's portability gate, and the reason URL resolution can remain a Beancount.io extension without stranding anyone's books.

### 11. Feed files are read-only

A write whose destination resolves inside the feed cache fails with a `UsageError` naming the managed source it came from and pointing at the override: declare a price directive in your own ledger file. This is ADR 015 section 9's read-only boundary expressed against paths instead of virtual keys.

### 12. An unavailable source degrades, it does not break the ledger

When no validated revision exists, the include line is swapped for an `; managed price source unavailable: …` comment and a loader error is appended naming the include as written, its file and line, the cause, and `Run bea price status to inspect the source`. Accounts, balances, and queries keep working; only that pair's valuation is missing. A URL that fails the section 1 policy is left alone entirely, so Beancount reports it exactly as it does today.

## Consequences

- A connected ledger costs at most one conditional GET per URL per 5 minutes per machine, plus one staged copy of the include closure per load. An unconnected ledger costs nothing.
- Local caches are per machine and not shared, so two machines refresh independently. This is correct for a CLI and needs no coordination.
- Duplicate fetches are possible when `bea` runs concurrently on one ledger. Accepted: feeds are idempotent and the blob-then-head ordering keeps every reader consistent.
- The policy and validation rules now exist twice, here and in `backend-cluster/ledger`. A change to the contract must land in both, and ADR 015 stays the single source of truth for what the rules are.
- Verification uses deterministic local fixtures plus explicit authenticated production smoke. The original anonymous 302 record was a historical authentication requirement, not evidence of an unmounted feed; the amendment replaces that acceptance assumption. Publication remains gated by installed-artifact tests and the release workflow.
- Out of scope here and still open in PRFAQ002 section 19: provider selection, the instrument catalog, the final canonical URL format, the `?commodity=` mapping syntax, and date-range parameters.

## Alternatives considered

- **Rewrite the customer's include line in place.** Rejected: it changes customer bytes during a read, which breaks the source-slice contract the writer depends on and would corrupt a file if a read were interrupted.
- **Resolve into a temporary tree copied away from the source.** Rejected: relative documents, plugin paths, and include globs are resolved relative to each file's directory, so a relocated tree changes their meaning. Staging beside the source keeps every relative path true, which is why write validation already works that way.
- **Resolve in the `bea` frontend before launching the helper.** Rejected: ADR 014 forbids the frontend from loading Beancount, and the include closure cannot be walked faithfully without it. Resolution belongs on the engine side of that boundary.
- **Resolve only in the report path.** Rejected by PRFAQ002 FAQ 11: a connected book would be valued by `bea report` and unpriced by `bea check`, and write validation would reject prices the reports had just used.
- **Share one resolver package between the CLI and the ledger service.** Rejected: it would be a cross-package runtime dependency between a Python wheel and a TypeScript service, which PRFAQ002 section 16 rules out. The duplication is bounded by a written contract.
- **Lock the cache directory to coalesce concurrent fetches.** Rejected: a stale lock is a worse failure than a duplicated idempotent GET, and atomic blob-then-head ordering already guarantees every reader sees a complete revision.
- **Keep the last good revision on a failed refresh only until it expires.** Rejected by PRFAQ002 FAQ 8 for the same reason ADR 015 rejected it: a bad refresh must never replace a good cache entry with nothing.
