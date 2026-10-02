# Route loading: primary content before optional panels

Ledger routes gate on primary content. Since the public-ledger SEO work,
an initial public overview also allows a bounded README read: its explanation
is content a visitor should be able to read before JavaScript. Optional panels
otherwise own their queries and render honest pending states:

| Route | Awaited (gates the route) | Optional, panel-owned |
| --- | --- | --- |
| `/ledger/$owner/$name` (layout) | `GetLedger` — its failure is the route error (not found, private) | `GetLedgerEntriesCountPerType` — `DirectiveUsageIndicator` (owner-only sidebar gauge) renders nothing until the real count exists, so there is never a false `0 / max` |
| `/ledger/$owner/$name/` (overview) | `GetLedgerOverview` and `GetLedgerOverviewValuation` — both are primary; the page owns report failure states. Initial public SSR additionally settles `GetLedgerFile` within a 1,000 ms file-read deadline after access is resolved. | Private/client-navigation README, and `GetLedgerAccountMeta` (`useAccountMeta` → cash-flow Sankey, explicit pending state, heuristics only after a failure) |

In the browser the overview loader starts README and account metadata
alongside the overview through `prefetchOptionalQuery`, so on client
navigation they usually land together; it never waits for them. During SSR,
only a ledger whose authorized result says `private: false` gets the bounded
README read. Account metadata and counts remain client-only.

The public read starts alongside primary work and reuses the parent's ledger
request/cache. It uses `no-cache` until a timely successful response explicitly
writes the request-scoped cache. On a deadline/navigation abort, the transport
is cancelled and late results cannot write that cache even if cancellation is
ignored. The loader returns a matching ledger/path snapshot with decoded content
or an unavailable outcome. `useLedgerReadme` uses that snapshot for initial
rendering and only enables live Apollo reads after hydration, preserving the
fast-prefetch race protection. A successful SSR response therefore needs no
equivalent hydration refetch; timeout/failure recovery intentionally retries in
the browser. A missing/empty README settles as an absent explanation.

The one-second budget is a deliberate maximum file wait, not a claim of zero
added public TTFB. Normal fixture reads at 400 ms fit within it; a two-second
optional delay must fall back. The deadline begins after existing ledger access
resolution and overlaps report requests. Report/backend latency outside this
file read is not bounded by it. No shared cross-request README/HTML cache or
crawler-specific rendering is used.

Declared `cash-flow-role` metadata stays authoritative: while the directives
are loading, the Sankey reserves its space with a pending state instead of
drawing the heuristic layout as if it were final. A failed or unsupported
metadata query degrades to the name heuristics exactly as before.

## Public overview validation: October 2

The current baseline is `28171bf7`, including the cost and market-valuation
queries. Its production output was saved before editing, then compared with the
candidate using anonymous `open_ledger/stock-example` responses recorded by the
same fixture script. No credentials or private ledger data were recorded.

Initial baseline observations used three fresh browser contexts at 390×844,
400 ms per fixture operation, no browser network/CPU throttling, and an
additional 2,000 ms on `GetLedgerFile` for the slow-file case:

| Baseline case | TTFB range | Financial-position DOM range | README prose DOM range |
| --- | ---: | ---: | ---: |
| Normal file | 860–1,585 ms | 876–1,624 ms | 1,637–2,532 ms |
| Slow file | 896–2,467 ms | 928–2,507 ms | 3,658–5,431 ms |

All six baseline documents omitted the README prose initially and had three
titles after hydration. There were no page errors. These runs had concurrent
local test activity and substantial variance; they are diagnostic ranges, not a
controlled performance claim or production Core Web Vitals. DOM appearance is
also not the same as first paint or LCP.

The selected file deadline is **1,000 ms after public access resolves**, shared
by every visitor. It accommodates the normal 400 ms fixture response and bounds
the slow file's wait. The authorized ledger read may overlap the primary report
queries; its own duration remains governed by the existing route. The new
deadline does not change that access check or bound total document time.

Regression tests exercise a real Apollo client and controllable transport:
public access deduplication, absent/empty/malformed files, private/denied access,
abort, failure/retry, and a transport that ignores cancellation. Late file
responses cannot mutate the serialized cache. DOM hydration tests preserve the
surrounding heading even when the browser cache already holds a different file
or a missing result; later cache updates and deletion still render. The document
head test covers SSR, hydration, report navigation and browser back.

The final local production build was measured with the same three-context
fixture setup:

| Candidate case | TTFB range | Financial-position DOM range | README prose DOM range | Initial README |
| --- | ---: | ---: | ---: | --- |
| Normal file | 1,281–2,136 ms | 1,297–2,173 ms | 1,297–2,170 ms | Present in all three |
| Slow file (+2,000 ms) | 1,837–4,706 ms | 1,852–4,807 ms | 4,577–7,799 ms | Deadline fallback in all three |

The normal candidate sends the explanation in the document, with one server
file request and no equivalent hydration request. The slow candidate sends its
fallback and makes one intentional browser retry. All six hydrated documents had
one authored title, one description, the slashless canonical and no page errors
or horizontal mobile overflow. The README card started about 498 px down at
390×844, compared with roughly 5,000 px in the original live-page audit.

This is an explicit latency tradeoff. With the simulated request chain, the
normal README read adds about one 400 ms backend round trip after access; a slow
read can consume its one-second budget. The broad measured ranges include local
CPU/scheduling contention and are not evidence of an overall speedup. The timer
bounds the file operation's scheduled wait, not total TTFB or event-loop stalls.
A desktop client-navigation check with the slow file still showed primary
content at 1,024 ms and README at 3,001 ms, with only a browser file request.

Additional production-build browser checks:

- JavaScript-disabled stock-example renders prose, headings, four code blocks
  and tables. Its authored README has no Markdown links; an augmented synthetic
  fixture renders an ordinary documentation link without JavaScript and strips
  an injected script through the unchanged sanitizer.
- French and Chinese UI keep the authored English explanation, one H1 and
  correctly localized HTML language/alternates. Canonicals retain supported
  `lang` while removing explicit time/tracking parameters. Report and Journal
  links, followed by browser back, retain one metadata owner.
- Missing, empty, malformed and failed files remove the pending card without
  losing reports. A successful README remains visible when the report fails or
  an explicit empty period is selected. Deadline reads recover in the browser.
- A synthetic authorized private ledger has no initial README, makes its file
  request only in the browser, retains the financial-first default and emits
  noindex without a canonical. A denied ledger returns 404, one generic title
  and description, noindex, no canonical and no README; hydration has no page
  errors. These are synthetic access checks, not a production permission change.
- The owned social PNG returns `200 image/png` at 256×256 from the local build
  and from the public host using anonymous curl, including a Twitterbot user
  agent. Metadata advertises the matching small summary card.

Reproduce against the current source by recording `stock-example` once, building
with both `VITE_API_URL` and `VITE_SSR_API_URL` pointed at the fixture, and running
the generated server on another local port. Use `--base-delay-ms 400`, then add
`--delay-ops GetLedgerFile --delay-ms 2000`. Inspect `/__log` for server/browser
request counts. Test fixtures and screenshots remain ignored under `tmp/`;
the regression tests carry the permanent synthetic failure/race coverage.

The changed metadata and sitemap generator have not been verified in a deployed
release. Deployment, fresh sitemap generation (including its 24-hour application
and one-hour HTTP caches), and live URL membership remain release checks.

## Historical measurements: September 6 optional-panel change

The tables below describe the original w2/m23 change, before the September 26
market-valuation query and October public-README exception. They are retained as
the rationale for keeping other optional work nonblocking, not current timing
claims.

### Delay injection, request accounting and correctness

Everything below uses the public `open_ledger/example` ledger recorded through
`scripts/perf-fixture-api.mjs` (Node built-ins only): anonymous public reads
are recorded once, then replayed with a simulated 400 ms backend latency per
operation and, in the delay configurations, an extra 2,000 ms on the three
optional operations (`GetLedgerEntriesCountPerType`, `GetLedgerFile`,
`GetLedgerAccountMeta`). Owner-only behaviour uses the fixture's
`--synthetic-owner` mode (a made-up free-tier profile that owns the recorded
ledger); no real credentials or user data are involved.

Baseline: commit `aa0cbd3e`, production build. Candidate: this change.
Chrome 152 (macOS), viewport 1280×800, 4× CPU slowdown, 40 ms latency,
10 Mbit/s down, 5 Mbit/s up, a fresh browser context with the HTTP cache
disabled per navigation; one warm-up plus three measured navigations per
configuration; medians below, ranges in the tables. `primary` is the first
appearance of the Financial Position section; `README` and `Sankey` are the
rendered README card and the cash-flow canvas; `hydrated` is the
`html.lang` signal from `LanguageSync`.

### Cold SSR navigation to the overview (anonymous)

| Configuration | TTFB | Primary | README | Sankey canvas | Hydrated |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline, no injected delay | 859 ms (832–880) | 1,273 ms (1,228–1,276) | 1,331 ms (1,283–1,339) | 4,050 ms (3,987–4,066) | 3,463 ms (3,462–3,521) |
| Baseline, +2,000 ms on optional operations | 2,992 ms (2,932–3,008) | 3,308 ms (3,281–3,460) | 3,363 ms (3,330–3,460) | 6,462 ms (6,357–6,596) | 5,833 ms (5,744–5,989) |
| Candidate, no injected delay | 988 ms (858–1,046) | 1,376 ms (1,262–1,446) | 4,305 ms (4,255–4,375) | 4,478 ms (4,456–4,541) | 3,564 ms (3,515–3,636) |
| Candidate, +2,000 ms on optional operations | 1,023 ms (955–1,159) | 1,330 ms (1,329–1,569) | 6,341 ms (6,124–6,627) | 6,554 ms (6,314–6,775) | 3,737 ms (3,635–3,885) |

The injected delay moves baseline primary content by about 2.0 s because the
SSR document waits for every operation; the candidate's primary content and
hydration stay where they were without the delay. Without any injected delay
the candidate's cold TTFB and primary content sit in the same band as the
baseline (the medians are about 100 ms higher, with overlapping ranges across
three runs; the SSR request chain is identical in depth). The trade is visible
in the README and Sankey columns: the baseline server-rendered both, while the
candidate renders them after hydration from client-side requests, so on a cold
load they appear about three seconds later than before. On a slow backend that
trade protects primary content; on a fast one it defers two optional panels.

### Client navigation to the overview (from the income statement, anonymous)

| Configuration | Primary | README | Sankey canvas |
| --- | ---: | ---: | ---: |
| Baseline, no injected delay | 1,225 ms (1,207–1,680) | 1,225 ms (1,207–1,680) | 1,225 ms (1,207–1,680) |
| Baseline, +2,000 ms on optional operations | 3,370 ms (3,362–3,586) | 3,370 ms (3,362–3,586) | 3,370 ms (3,362–3,586) |
| Candidate, no injected delay | 1,262 ms (1,243–1,421) | 1,262 ms (1,243–1,421) | 1,262 ms (1,243–1,421) |
| Candidate, +2,000 ms on optional operations | 1,315 ms (1,132–1,323) | 2,940 ms (2,893–2,961) | 3,069 ms (2,976–3,087) |

On client navigation the candidate still starts README and account metadata
in the same tick as the overview (the fixture log shows all three received
within 10 ms), so without an injected delay every panel lands together, as
before. With the delay, primary content no longer waits: it renders at the
overview's own latency while the README skeleton and the Sankey pending state
hold their space until the slow requests return.

### Synthetic owner, +2,000 ms on optional operations

| Configuration | Primary (cold) | Usage gauge first text (cold) | Primary (client nav) |
| --- | ---: | --- | ---: |
| Baseline | 3,372 ms (3,292–3,395) | `2,051 / 5,000` at 3,321 ms — server-rendered, after the whole document waited for the count | 3,192 ms (3,171–3,197) |
| Candidate | 1,214 ms (1,212–1,221) | `2,051 / 5,000` at 5,735 ms — nothing rendered until the real count arrived after hydration | 1,130 ms (1,126–1,132) |

In every run of both builds the gauge's first rendered text was the real
count; no `0 / 5,000` was ever observed. On client navigation the sidebar
persists, so the gauge is already present and no count request is issued.

### Request accounting

Per navigation, from the fixture log (identical across the three measured
runs of every configuration; no console or page errors in any run):

| Scenario | Baseline | Candidate |
| --- | --- | --- |
| Cold SSR, server side | `GetCurrentUser`, `GetLedger`, `GetLedgerEntriesCountPerType`, `GetLedgerOverview`, `GetLedgerFile`, `GetLedgerAccountMeta` | `GetCurrentUser`, `GetLedger`, `GetLedgerOverview` |
| Cold SSR, browser after hydration (anonymous) | sidebar and activity queries only (`GetLedgerAccounts`, `GetLedgerErrors`, `GetLedgerEvents`, `GetLedgerJournal`, `GetLedgerAttributes`) | the same, plus `GetLedgerFile` ×1 and `GetLedgerAccountMeta` ×1 |
| Cold SSR, browser after hydration (synthetic owner) | as above plus `ListLedgers`, `GetLatestLedgerCommit`, `GetCurrentUser` | as above plus `GetLedgerEntriesCountPerType` ×1 (the anonymous visitor never requests it) |
| Client navigation | `GetCurrentUser`, `GetLedgerOverview`, `GetLedgerFile`, `GetLedgerAccountMeta`, `GetLedgerJournal` | identical |

No operation is requested twice in any scenario: the SSR-prefetched
`GetLedger` and `GetLedgerOverview` are never re-requested by the browser,
and the browser-side prefetch of README and metadata is deduplicated with the
panels' own `useQuery`. The dehydrated cache of the candidate's SSR document
contains `getLedgerOverview` and `getLedger` but none of the three optional
operations; the baseline's contained all of them.

### Freshness and isolation

- Writes keep working as before: every write path clears `ROOT_QUERY` through
  `useApolloCacheClear`, which makes the active README, metadata, count and
  overview queries refetch. The overview page shows its loading state during
  that refetch exactly as it did before.
- Switching ledgers changes every query's `ledgerId` variable. `useAccountMeta`
  reports `pending` again for the new ledger instead of reusing the previous
  map, `ReadmeCard` returns to its skeleton, and `DirectiveUsageIndicator`
  renders nothing until the new count exists (its Vitest coverage pins each of
  these).
- A private or missing ledger still fails in the layout loader through
  `GetLedger`, so `LedgerRouteError` renders the same not-found experience.

## Reproducing

From `dashboard/`, with dependencies installed:

1. Build the revision under test with the browser pointed at the fixture, and
   serve it with SSR pointed at the same fixture (keep a copy of `.output` per
   revision, since `yarn build` overwrites it):

   ```sh
   VITE_API_URL=http://localhost:4499/api-gateway/ yarn build
   PORT=5173 SSR_API_URL=http://localhost:4499/api-gateway/ node .output/server/index.mjs
   ```

2. Record the public example ledger once (anonymous, read-only), then replay:

   ```sh
   yarn perf:fixture-api --port 4499 --store tmp/perf/fixtures.json --record
   # visit /ledger/open_ledger/example and /ledger/open_ledger/example/income-statement once, then restart:
   yarn perf:fixture-api --port 4499 --store tmp/perf/fixtures.json --base-delay-ms 400
   yarn perf:fixture-api --port 4499 --store tmp/perf/fixtures.json --base-delay-ms 400 \
     --delay-ops GetLedgerEntriesCountPerType,GetLedgerFile,GetLedgerAccountMeta --delay-ms 2000
   ```

   Add `--synthetic-owner` for the owner-only sidebar gauge. `GET /__log`
   lists every request with its origin (`ssr` or `browser`), operation and
   duration; `GET /__log/clear` resets it between navigations.

3. Drive Chrome with the browser settings above (Playwright or DevTools). Install
   the `html.lang` hydration probe from
   [the locale measurement guide](./performance-locales.md) before navigation,
   and a `MutationObserver` that records the first appearance of
   `#overview-financial-position-heading`, `.prose` inside the README card,
   `[aria-labelledby="overview-cash-flow-heading"] canvas`, and, for the
   owner scenario, the `N / M` text of the usage gauge. For client navigation,
   load `/ledger/open_ledger/example/income-statement`, wait for its chart,
   clear the fixture log, then click the sidebar Overview link and measure
   from the click.

4. Discard the first navigation and compare at least three further ones per
   configuration. Compare medians and ranges under identical settings; small
   local samples are not production percentiles.

## Limitations

- The fixture speaks HTTP/1.1, so Chrome queues the seventh concurrent request
  to it; on a cold candidate load the account-metadata request can wait one
  round trip behind the sidebar and activity queries. Production is served over
  HTTP/2, where that queue does not exist.
- The fixture's 400 ms base latency is a fixed stand-in for the measured
  350–500 ms production responses for this public ledger; real backends vary.
- Recorded responses are a snapshot of the public example ledger; re-record
  after schema changes.
- `GetCurrentUser` is requested by the root route on every navigation and
  twice per SSR document; that predates this change and is out of scope here.
