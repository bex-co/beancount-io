# w2 · m35 — Public ledgers that explain themselves in search and on first visit

**Worker:** worker2

**Goal:** Make public ledger examples discoverable, understandable before JavaScript finishes, and useful to a newcomer arriving from search or a shared link.

**Status:** blocked — 12 of 13 tasks complete; implementation pushed to main, awaiting the production deployment target/access for deployed closeout.

**Research date:** 2026-10-02

**Numbering:** this SEO work was drafted locally as m34. Synchronizing `origin/main` before publication revealed that m34 had already been committed for the separate ledger-catalog pagination milestone. This work moved to the next available ID, m35, preserving both scopes and their task histories.

**Source baseline:** local `main` at `28171bf7`; separately observed production responses on 2026-10-02. The live deployment revision was not independently established.

Materialized through `/pm` on 2026-10-02 after the user approved this research and requested implementation as a goal. The research below preserves its original observations; the task record and implementation notes track changes and validation. Production publication was separately authorized on continuation; closeout requires the deployed artifact checks specified below.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Capture the current public-page baseline and bound README SSR — **DONE** | 45m | — |
| [t002](./done/t002.md) | Server-render public overview README without hydration races — **DONE** | 60m | t001 |
| [t003](./done/t003.md) | Present the public narrative before financial widgets — **DONE** | 50m | t002, t004 |
| [t004](./done/t004.md) | Consolidate ledger document metadata and authored titles — **DONE** | 60m | — |
| [t005](./done/t005.md) | Choose the latest active public money-movement month — **DONE** | 35m | t003 |
| [t006](./done/t006.md) | Traverse every public repository page for sitemap generation — **DONE** | 50m | — |
| [t007](./done/t007.md) | Keep sitemap refreshes complete and URLs canonical — **DONE** | 50m | t006 |
| [t008](./done/t008.md) | Use a working dashboard-owned social preview image — **DONE** | 30m | t004 |
| [t009](./done/t009.md) | Verify the complete public journey and performance tradeoff — **DONE** | 60m | t002, t003, t004, t005, t007, t008 |
| [t010](./done/t010.md) | Adoption surface — **DONE** | 30m | t009 |
| [t011](./done/t011.md) | Simplify — **DONE** | 30m | t010 |
| [t012](./done/t012.md) | Test coverage and required package gates — **DONE** | 60m | t010, t011 |
| [t013](./t013.md) | Closeout after final artifact verification | 15m | t012 |

## Implementation and validation record

Implemented and pushed to `origin/main` on 2026-10-02 in [d5219cac](https://github.com/bex-co/beancount-io/commit/d5219cac97c640876c6fbb6abfba5e5150bbf7c6). Production deployment remains pending. The baseline research below remains historical evidence.

- Dashboard: bounded public README SSR, matching hydration snapshot, public narrative/layout, active-month default, consolidated route metadata and the owned summary image. Production-build browser checks cover initial HTML, no JavaScript, hydration, mobile, language/filter canonicals, report/journal/back navigation, private/denied access and file/report failure cases.
- Backend: complete repository traversal, stable user ordering, no partial-success cache replacement, shared generation and canonical encoded URLs. Full backend suite: **292 suites / 4,620 tests passed**; final focused follow-up: **5 suites / 92 tests passed**. Typecheck, build, Knip and touched ESLint/format checks pass. v1 OpenAPI has no drift; the generated internal OpenAPI snapshot changes only sitemap documentation.
- Dashboard final checks pass: `yarn format:check`, `yarn lint`, `yarn build`, and the full `yarn test --maxWorkers=1` run (**447 files / 4,949 tests passed, one existing skip**). Concurrent runs exposed locale-import timeouts; isolated retries and the complete serial run passed without changing timeouts, assertions or skipped tests.
- Current performance measurements, the selected 1,000 ms file-read deadline, request accounting, failure behavior and limits are in the [route-loading record](../../../../dashboard/docs/performance-route-loading.md#public-overview-validation-october-2). The change does not promise zero extra TTFB or improved Core Web Vitals. Deployment verification is still pending.
- Adoption guidance and the three simplify reviews are complete. The agent-guidance checker passes. Board task/link checks keep completed tasks outside the open tree.
- Adjacent validation limitation: regenerating the internal OpenAPI snapshot also exercised its admin CLI generator. Code generation succeeds, but that CLI's typecheck already references two admin endpoint paths absent from both baseline and current schemas. After normalizing the sitemap description, the baseline and current schemas are identical; this milestone changes no CLI source or operation contract.
- Publication preparation rebased onto `origin/main` at `6710d2de`. The two README conflicts preserve both upstream documentation and this milestone; dashboard sources were unchanged upstream. Backend integration validation passes after the merge: **294 suites / 4,849 tests**, plus typecheck; regenerating v1 OpenAPI produces no snapshot drift. The staged Git tree passes the secret scan, and agent guidance and milestone IDs/links pass their checks.
- GitHub CI for the shipped implementation `d5219cac` is green: [dashboard formatting, lint, full tests and production build](https://github.com/bex-co/beancount-io/actions/runs/37063767713), [backend typecheck, full tests and OpenAPI drift](https://github.com/bex-co/beancount-io/actions/runs/37063767514), [secret scan](https://github.com/bex-co/beancount-io/actions/runs/37063767624), and [agent guidance](https://github.com/bex-co/beancount-io/actions/runs/37063767557). These checks validate the source revision; they do not deploy it.
- Deployed closeout recheck at **2026-10-02 08:56:28 UTC** still shows the baseline behavior: anonymous overview HTML has two titles/two descriptions, no README prose and the previous external OG image URL; the public sitemap has 9,341 URLs with no `stock-example` entries. A post-push recheck at **20:57:32 UTC** again found two titles/descriptions, the previous external image URL and the same sitemap count/omission. The serving revision remains unverified. [t013](./t013.md#publication-and-cache-verification) records the deployment-target and cache checks required after publication authorization.

## Publication authorization

**Unblocked 2026-10-02** — the user requested continuation after the publication approval blocker was explained. Publication is now authorized; proceed with shipping, identify the serving deployment target, and verify the deployed artifacts before closeout.

## Blocked

**Blocked 2026-10-02** — publication is authorized and the implementation is pushed to `origin/main` in `d5219cac97c640876c6fbb6abfba5e5150bbf7c6`. The remaining production closeout cannot run because the active deployment target and authenticated administrative access are not established. The repository contains multiple deployment configurations; the available Bex login is expired, and no production administrative SSH connection is configured. The deployment operator can clear this dependency.

**Unblock:** provide the active production platform/service identity and authenticated access, or the production SSH alias and checkout/Compose location. Then deploy the reviewed dashboard/backend revision and verify the real overview, social image and fresh sitemap under the cache/revision checks below. No further publication approval is needed.

## Source + Goal linkage

- **Source:** the public SEO review of [stock-example](https://beancount.io/ledger/open_ledger/stock-example), followed by the request to investigate the current design before proposing fixes. Evidence combines anonymous HTML/API reads, a hydrated browser at desktop and 390 px mobile widths, repository source, tests, and commit history.
- **Goal linkage:** **A3 — Community & distribution**, with **A2 — Frictionless onboarding** secondary. Someone searching for a working Beancount stock-accounting example should discover a descriptive page and immediately understand how to inspect and reuse it.
- **Expected outcome:** healthy public example pages expose authored explanations in server-rendered HTML; their titles describe the ledger; sitemap generation includes repositories beyond the first upstream page; shared links show a working image. Search impressions and subsequent example engagement are downstream signals, not guaranteed ranking or conversion gains.
- **Why now:** the public ledger already contains substantial educational material and a meaningful title. Rendering, metadata ownership, and sitemap enumeration prevent that existing material from being presented consistently. Improve these foundations before writing more SEO copy or adding more example pages.
- **Prior work:** build on [w2/m8 indexability policy](../../done/m8/README.md), [w2/m10 canonical handling](../../done/m10/README.md), [w2/m23 optional-panel performance](../../done/m23/README.md), and [w4/m13 hydration/navigation stability](../../../w4/done/m13/README.md). Their accepted behavior remains relevant; this proposal is not a redo of those milestones.
- **Adoption surface:** included. Public ledger pages and their sharing/discovery surfaces are user-facing; the standing Adoption surface, Simplify, Test coverage, and Closeout tasks are appended after implementation.
- **Public record:** only public/synthetic examples and source evidence belong here. Keep credentials, account-level Search Console exports, session data, and private ledger content out of this document and future fixtures.

## Baseline state and evidence

| Area | Observed state | Interpretation |
| --- | --- | --- |
| Public access | The overview returns HTTP 200, permits crawling, and emits the expected self-canonical. Tracking/time parameters canonicalize to the clean page. | Preserve this working foundation. The problem is not a demonstrated blanket indexing block. |
| Explanatory content | Initial HTML has the README card label but none of the educational README prose. Hydrated content includes lot identification, purchases, dividends, reinvestment, splits, realized gains, runnable commands, and fictional-data disclosure. | The strongest explanatory content depends on browser execution. This does not prove that Google cannot render or index it. |
| Existing title data | Anonymous `GetLedger` returns `name: stock-example`, an empty repository `description`, and `options.title: Stock & ETF Cost-Basis Example — beancount.io`. | A useful authored title already exists. Start by using it; a new metadata API or hardcoded example registry is unnecessary. |
| Current metadata | Initial HTML contains two title tags and two description tags. The title is `Overview - stock-example`; the inspected hydrated document had three titles. | Two metadata systems overlap. Test the complete document, not only an isolated helper. |
| Initial reading order | On the inspected 390 × 844 viewport, the README heading begins approximately 5,000 px below the top of the ledger content. | The first visit is arranged as a financial workspace; the explanation is difficult to find. This is a usability observation, not a measured ranking factor. |
| Empty money movement | The selected month is January 2027; the public example's last income activity is April 2026 and last expense activity is May 2026. | Latest calendar bucket and latest activity month are different. This is not a browser clock error. |
| Ledger sitemap | The [ledger sitemap](https://beancount.io/api-gateway/sitemap.xml), rechecked at 07:13 UTC, contains 9,341 URLs and exactly 50 `open_ledger` overview entries, but no `stock-example` entry. Sibling examples are present. | Current coverage is incomplete. Existing indexation evidence does not make sitemap completeness unnecessary, and this omission does not establish the cause of low search visibility. |
| Sitemap URL form | Overview entries end in `/`; the tested slash URL redirects with 307 to the slashless canonical. | Emit the canonical URL directly; a redirect-policy redesign is unnecessary. |
| Sharing image | The image URL supplied to both OG and Twitter returns 404 with an HTML content type. | This is a broken sharing dependency, not proof of a direct organic-ranking penalty. |
| Localization and links | Fifteen language alternates plus `x-default` exist; sampled French/Chinese UI and canonical values match the requested language. The [examples guide](https://beancount.io/docs/examples) links to the ledger. | Preserve these behaviors. Do not call the ledger orphaned or claim that its English README has been translated. |

The initial overview already contains real balances, and the balance-sheet page contains account amounts. Do not describe the whole dashboard as an empty client-only shell. The journal's initial HTML is much thinner; that adjacent observation should inform later inventory work without changing the established public-read indexability policy in this milestone.

## Why the baseline implementation looks this way

### 1. README deferral is an intentional performance tradeoff

Before [afcd6bae](https://github.com/bex-co/beancount-io/commit/afcd6baece3c02664bbe3b78e31fbf9d48e34e42), the overview waited for the report, README, and account metadata together. The September 6 change completing w2/m23 made README and account metadata optional browser requests. In its recorded public fixture, injecting two seconds into optional requests changed cold primary-content readiness from 3,308 ms to 1,330 ms and client navigation from 3,370 ms to 1,315 ms. The record also explicitly acknowledges the cost: on fast cold loads, README appeared approximately three seconds later.

The current [optional-query helper](../../../../dashboard/src/common/apollo/prefetch.ts) exits during SSR. The [overview loader](../../../../dashboard/src/features/reports/overview/loader.ts) therefore cannot populate the initial cache with README content. [Reports guidance](../../../../dashboard/src/features/reports/AGENTS.md) explicitly requires this behavior. The [performance record](../../../../dashboard/docs/performance-route-loading.md) explains the original measurements and their limits.

**Design gap, inferred from those decisions:** README was classified as an optional financial-dashboard widget, without giving its public acquisition role a different initial-render contract. The proposed repair must consciously narrow that policy, not present the old optimization as an accidental bug.

The historical timing is not today's baseline. [be8e9eba](https://github.com/bex-co/beancount-io/commit/be8e9eba2aa86273695d83af9a8c1102598c8eeb) later added a second awaited overview query for market valuation. New measurements must include both current primary queries and preserve truthful valuation.

### 2. The hydration guard fixes a real race

[c4159705](https://github.com/bex-co/beancount-io/commit/c4159705961862f091099d8eb78528929e0c91c5) added `useHydrated()` to [ReadmeCard](../../../../dashboard/src/common/components/readme-card.tsx). A fast browser prefetch could otherwise replace the server skeleton before hydration reached the card, causing a mismatch and recovery. The [regression test](../../../../dashboard/src/common/components/__tests__/readme-card-hydration.test.tsx) protects surrounding DOM identity and covers present and absent README results.

[router.tsx](../../../../dashboard/src/router.tsx) extracts Apollo state once and restores that snapshot during hydration. The [SSR Apollo factory](../../../../dashboard/src/common/apollo/factory.server.ts) creates a request-scoped client and forwards the requesting identity. Starting an unawaited server query does not automatically put its eventual result into the serialized snapshot. Removing the guard alone, or enabling optional queries during SSR without a settled-data handoff, would reopen the race.

### 3. Route metadata and component metadata both own the page

The [overview route](../../../../dashboard/src/routes/ledger.$ledgerOwner.$ledgerName.index.tsx) emits generic slug-based metadata through `head()`. [LedgerPageSEO](https://github.com/bex-co/beancount-io/blob/28171bf7/dashboard/src/common/components/seo/ledger-page-seo.tsx) and [LedgerSEO](https://github.com/bex-co/beancount-io/blob/28171bf7/dashboard/src/common/components/seo/ledger-seo.tsx) emit another set through React metadata hoisting. The [ledger provider](../../../../dashboard/src/common/providers/ledger-provider/ledger-provider.tsx) uses repository `name` for `ledgerDisplayName`, despite already receiving `options.title`.

Both mechanisms existed in public import `af5339de`; this history does not establish an earlier migration rationale. Related repairs show why consolidation needs care:

- `54f9887d` fixed the same duplicate-emitter pattern on `/ledger`, using `PageSEO` as that page's owner.
- `b200c260` preserved path-aware public file titles after hydration.
- `6fbe3892` restored metadata on Accounts and Budget. Its [route metadata guard](../../../../dashboard/src/routes/__tests__/ledger-route-head-metadata.test.ts) requires ledger leaf routes to declare a head.

Consequently, blindly deleting route heads is not a suitable general repair. Choose one owner for the ledger route family and preserve the metadata and error behavior currently supplied by the other.

### 4. Reading order and period selection follow workspace defaults

[use-dashboard-layout.ts](../../../../dashboard/src/features/reports/overview/hooks/use-dashboard-layout.ts) puts README last after six financial widgets. Readers can reorder and hide widgets; preferences are stored per ledger under `ledger.<ledgerId>.overview.layout.v1`. SSR uses the default layout, with browser storage applied after hydration. The financial-workspace ordering already existed in the public import; no documented SEO rationale was found.

[money-movement-section.tsx](../../../../dashboard/src/features/reports/overview/components/money-movement-section.tsx) defaults to the final date returned by [overview-utils.ts](../../../../dashboard/src/features/reports/overview/lib/overview-utils.ts), including empty monthly buckets. Public source-file reads show five balance assertions and three price directives on January 1, 2027. Those valid directives extend the ledger's timeline into 2027 without creating income or expense activity. Do not delete them to make a widget look busier.

### 5. The sitemap's completeness assumption is wrong

[sitemap-service.ts](../../../../backend-cluster/backend-v2/src/features/sitemap/service/sitemap-service.ts) makes one `userListRepos({ limit: 100 })` call per user and comments that Gitea handles pagination internally. The [generated client](../../../../backend-cluster/backend-v2/src/features/gitea/client/gitea-api.ts) exposes `page` and `limit` and makes one request; it does not walk pages. This behavior was already present in backend import `a6dfc11c`; later directory/configuration changes did not repair it.

The exact deployed page-size cap remains **unproven**. Anonymous access to the external Gitea repository-list endpoint returned 401, so the public audit could not directly inspect page two or prove the stock ledger's page position. Exactly 50 visible examples strongly suggests a cap, but the definite defect is the absence of pagination, not a proven server setting.

Related completeness failures exist in the same generator:

- Users are fetched in offset pages of 1,000, up to 50,000, but the [database query](../../../../backend-cluster/backend-v2/src/features/auth/data/user-model/postgres-impl.ts) has no explicit ordering.
- A database failure breaks the loop and returns the users collected so far. A repository failure becomes `null`, disappearing from the batch error list and output.
- Partial output can therefore replace the cached XML as if generation succeeded. The file-cache TTL is 24 hours with stale-while-revalidate; the handler's one-hour HTTP cache header is a separate duration.
- The [existing tests](../../../../backend-cluster/backend-v2/src/features/sitemap/service/__tests__/sitemap-service.test.ts) do not exercise repository pagination, and one explicitly expects database failure to produce an empty sitemap.

### 6. Sharing relies on an external image provider

Both SEO components hardcode the same external OG generator, already present in `af5339de`. No dashboard-owned dynamic OG route was found. The current endpoint returns 404. The existing same-origin [logo](https://beancount.io/lgasset/logo.png) works, but is 256 × 256 and does not match the advertised large-image card. Replacing the dependency with an appropriate owned asset is sufficient; a new image service is not required.

## Proposed improvements, in order

These approved implementation units are mapped to the task table above. Keep changes scoped to one owning package per implementation unit; this milestone may coordinate dashboard and backend-v2 without introducing cross-package imports.

### R1 — Render public README content on the server with an explicit latency contract

**Owner:** dashboard. **Priority:** high. **Depends on:** current production-build baseline and the resolved public-ledger access result.

1. Introduce a narrow initial-SSR exception for an overview whose authorized ledger result says it is public. Use the real visibility field, not the `open_ledger` username, absence of a cookie, or crawler user-agent detection. Keep parent authorization/not-found behavior intact; parent and child loaders can overlap, so explicitly obtain or deduplicate the resolved ledger result.
2. Start primary report/valuation work promptly and fetch the existing `GetLedgerFile` operation concurrently once public visibility is established. Do not add an API, a privileged repository read, or an extra serial report-to-README round trip.
3. Await a bounded README result before finalizing the initial server render and Apollo snapshot. Carry an explicit initial outcome: present, absent, or unavailable. On successful reads, both the server and first client render use the same settled content; after hydration, normal query refreshes resume.
4. Preserve the existing skeleton/hydration protection on client-only paths and error/timeout recovery. A deadline must cancel and settle the query or isolate its late cache writes; `Promise.race` alone is not sufficient.
5. Initially use request-scoped caching only. Do not add a shared HTML/README cache: even public pages can contain identity-dependent permissions and star state, and visibility changes complicate invalidation.
6. Update the optional-panel rule in Reports `AGENTS.md` and the performance document to state this exception. Account metadata, sidebar counts, private-ledger browsing, and ordinary client navigation retain their nonblocking behavior.

**Performance decision:** fully visible uncached README HTML and zero added wait under arbitrarily slow storage cannot both be promised. Measure the current build, choose and record a finite README deadline before implementation is accepted, and report the additional cold public-SSR cost. Healthy responses within that deadline contain the explanation. Deadline/error cases keep primary content available and permit recovery after hydration; they are explicitly outside the full-README initial-HTML guarantee. Do not describe them as successful content SSR.

Streaming is an alternative to investigate only if this contract changes. TanStack supports deferred data, but streamed React segments may require reveal scripts, and this app currently snapshots Apollo once. A promise in serialized JSON or text inside a hidden segment is not acceptance evidence for visible content with JavaScript disabled.

**Acceptance:** healthy public fixtures expose readable headings, prose, code, and links in the JavaScript-disabled page; present/absent/empty/failure/deadline cases hydrate without recovery or DOM replacement; a successful SSR read does not cause an equivalent hydration refetch. A timed-out read followed by client recovery is counted as an intentional retry. Cross-ledger navigation, README edits/deletion, unauthorized/private access, and late responses preserve identity and freshness. Keep Markdown sanitization.

### R2 — Make the public introduction a first-visit surface

**Owner:** dashboard. **Priority:** high. **Depends on:** R1 for server content and R3 for the descriptive title.

1. Put the meaningful ledger title and a short authored introduction in the overview header before financial widgets. Include useful links into the explanation and reports. Preserve fictional-data disclosure for examples through their authored content; do not label arbitrary public ledgers fictional.
2. For public read-only visitors without saved customization, place the full README before the financial widget sequence and provide a way to jump to the reports. Render one full README instance.
3. Preserve existing saved order/hidden preferences and explicit reset behavior. Do not rewrite localStorage or change every owner's personalized dashboard. Resolve SSR defaults and post-hydration preferences using the existing layout-store contract.
4. Separate public narrative rendering from the report's empty/error branch. A ledger with a readable README can still explain itself when financial filters match nothing or the report request fails. Parent authorization failures must still prevent content rendering.
5. Make the visible page heading unambiguous. If Markdown headings are nested under the overview H1, apply a scoped heading offset in this context rather than changing every Markdown renderer consumer. Multiple H1s are a hierarchy issue here, not a claimed automatic SEO penalty.

**Acceptance:** on first visits at 390 px and desktop widths, the title and useful introduction appear before the first financial section. Saved layouts with README reordered/hidden remain respected; storage denial, no README, empty filters, and report errors remain usable. The narrative does not disclose data when the ledger access check fails.

### R3 — Give public ledger metadata one owner and use the existing authored title

**Owner:** dashboard. **Priority:** high. **Can proceed alongside:** R1; README-derived descriptions depend on R1's settled result.

1. Inventory the metadata emitted by the ledger route heads and JSX SEO components. Make route head management the proposed single owner for the migrated ledger family, supplying the complete metadata set and stopping the corresponding competing emissions. Keep root fallback behavior and unrelated page owners working.
2. Resolve the overview's human title from trimmed `options.title`, then repository `name`. Preserve the slug for routing and mutations. Scope presentation changes deliberately; do not silently rename every breadcrumb/sidebar through a global provider change.
3. Prefer an authored repository description. If blank, derive a short plain-text lead from the successfully loaded README, avoiding commands, tables, headings-only text, and raw HTML; otherwise retain a localized factual fallback. Use the same resolved values during SSR and hydration. Do not create a slug-to-keyword map or generate speculative SEO prose.
4. Preserve robots directives, canonical URLs, supported-language alternates, OG/Twitter, the Apple app banner, and path-aware file titles. Keep supported `lang` in canonicals and strip filter/tracking state as today. No blanket `noindex` for public reports, files, or journals.
5. Avoid appending the brand twice when the authored title already contains it. Keep English README text as authored on localized UI pages unless an actual translated source exists; do not pretend UI language selection translates ledger content.

**Acceptance:** actual full-document SSR, hydration, locale changes, overview-to-report navigation, another-ledger navigation, and Back produce exactly one `<title>` element and at most one `<meta name="description">`, with a description required for healthy public overview pages and one canonical where applicable. Preserve noindex/error decisions and file-title prefixes. Test empty/missing authored fields as well as the stock fixture's existing meaningful title. Source-text tests requiring `head()` do not replace document-level assertions.

### R4 — Use a relevant default money-movement month for public first visits

**Owner:** dashboard. **Priority:** medium. **Depends on:** a defined public read-only first-visit policy from R2.

1. For an unfiltered public read-only view without an explicit month choice, select the latest available month with income/expense activity. For the audited stock fixture this is May 2026, not January 2027.
2. Inspect account breakdowns as well as aggregate totals so offsetting categories do not make a populated month appear empty. Define the all-empty fallback explicitly using the existing interval list; do not invent activity where the payload cannot establish it.
3. Preserve explicit `time` filters, reader-selected empty months, navigation through empty intervals, and report/valuation period semantics. Do not modify the ledger's valid 2027 balance assertions or price directives.

**Acceptance:** trailing empty buckets select the last populated month only in the intended default case; zero aggregate with nonzero account activity is retained; explicit January 2027 and filtered ranges remain January 2027/filtered respectively; all-empty ledgers show an honest empty state. This is a first-visit relevance improvement, not an accounting or clock fix.

### R5 — Enumerate the complete public repository set in the sitemap

**Owner:** backend-v2. **Priority:** high. **Independent of:** dashboard changes.

1. Increment Gitea `page` explicitly for each user. Continue until an empty upstream page or trustworthy pagination metadata establishes completion. Do not stop merely because fewer than the requested 100 items arrive: an upstream cap below 100 would recreate this bug.
2. Traverse raw pages before applying the public-only filter; an all-private page is not the end of the repository list. Deduplicate repositories and reject repeated nonempty pages or a safety-limit overrun as incomplete traversal rather than looping indefinitely or silently publishing truncation.
3. Add stable ordering to the existing user pagination query. Surface database-page failures and safety-limit hits instead of returning an apparently complete prefix. A new enumeration framework or keyset migration is not required for this repair.
4. Keep the existing batch processor's ten-user concurrency and sequential repository pages inside each worker. Do not turn pagination into unbounded parallel requests. Preserve the unauthenticated public-data source.

**Acceptance:** a requested limit of 100 with actual pages of 50 + 1 + 0 includes the final repository; exact full final pages terminate correctly; private-only intermediate pages do not truncate output; duplicate/repeated pages cannot hang or claim completeness. Multiple user pages are deterministic. Verify the real stock ledger is included after successful deployed regeneration, rather than assuming a code change proves the live artifact changed.

### R6 — Publish only complete sitemap generations and use canonical URLs

**Owner:** backend-v2. **Priority:** medium, coupled to R5.

1. Propagate transient per-user and database failures to the generator with contextual diagnostics. Distinguish confirmed deleted/missing upstream users from timeout/5xx failures, so obsolete database records do not permanently prevent refresh. Upstream 401/403 and unexpected failures indicate incomplete generation, not a confirmed deleted user.
2. Replace the cache only after a complete successful traversal and valid XML render. Failed background refreshes must not replace the prior complete artifact with partial/empty success. A cold failure should reach the existing handler error response. Preserve the documented cache policy; do not claim that old cached discovery URLs determine current ledger authorization.
3. If complete traversal increases concurrent cold-load cost, share one in-process generation between cold requests and stale refreshes. Reuse the existing cache/worker mechanism; no distributed job system or new cache service is proposed.
4. Emit slashless overview/profile URLs after checking each route's canonical form, encode path segments correctly, and retain XML escaping. Preserve the existing seven-page inventory for this repair rather than expanding every report/filter combination.
5. Document the separate application and HTTP cache durations accurately. Check actual URL/byte counts after enumeration is fixed; if they exceed the sitemap protocol's limits, split the artifact before publication rather than imposing a silent completeness cap. The current observed artifact is below those limits.

**Acceptance:** failure on repository page two or user page two cannot overwrite a complete cache; a successful refresh replaces it; cold generation failure is observable; listed canonical overview URLs return 200 without redirect. Private repositories remain excluded and errors are not counted as successful empty users. Re-run the backend parity gate without new exemptions.

The sitemap is already an anonymous crawler artifact mounted through the existing public handler, not a missing customer GraphQL/MCP capability. This repair should not invent new protocol operations. If implementation instead changes a shared customer repository-list capability, apply the normal REST/GraphQL/MCP parity requirements to that capability.

### R7 — Replace the failing social-preview dependency with an owned asset

**Owner:** dashboard. **Priority:** medium for sharing. **Depends on:** R3's metadata ownership.

1. Add or reuse an appropriate branded raster sharing image under dashboard-owned `/lgasset/` and use an absolute same-origin URL. A static image is sufficient; dynamic per-ledger generation is not needed.
2. Keep card type, image dimensions, content type, and alt text consistent. If using the current square logo as an interim fallback, use a matching small-card presentation rather than advertising it as a large card.
3. Ensure the consolidated metadata path no longer uses the failing generator. Review other callers of the same helper to avoid maintaining two contradictory image defaults.

**Acceptance:** anonymous image fetch returns 200 and a decodable image with the declared dimensions/content type; initial HTML exposes correct OG/Twitter values; overview, report, and representative other shared-helper consumers keep useful previews. Do not attach a promised search-ranking gain to this change.

### R8 — Validate the complete public journey and measure the result

**Owners:** separate dashboard and backend-v2 verification units. **Priority:** required before closeout; depends on the changes being verified.

1. Record a current production-build baseline using public/synthetic data and the existing performance fixture. Measure primary-content readiness, README visibility, hydration errors, and request counts with normal latency, two-second README delay, deadline overrun, and upstream failure. Keep the older m23 numbers labeled as historical.
2. Verify the public overview as raw HTML, a JavaScript-disabled browser, and a hydrated browser at desktop/mobile widths. Then follow actual links into the journal and reports. Preserve existing docs-to-example links and use the existing login/SSH workflow for hosted-to-local reuse; do not introduce an export shortcut.
3. Recheck the actual deployed sitemap and image after the relevant caches refresh. Record status, content type, canonical/head counts, sample membership, and the verified revision when available. Deployment and Search Console submission are separate actions, not implied by this documentation request.
4. After release, use the existing Search Console tooling to compare finalized 28-day windows, separating the overview from report URLs and reporting language/query grouping explicitly. Check indexation and selected canonical separately from impressions/clicks. No analytics service, private-data publication, ranking guarantee, or waiting for a traffic increase is required to finish implementation.

## Secondary observations and excluded work

- **Robots discovery:** production `robots.txt` advertises CMS/localized sitemaps but not the ledger sitemap. The ledger sitemap is already submitted in Search Console. Production robots ownership was not found in the dashboard/deploy files inspected here. Record an owner-dependent follow-up to advertise it; do not add an ineffective `dashboard/public/robots.txt`, change another repository, or block the in-repo repairs on this. Preserve submission because the artifact lives under `/api-gateway/` while its URLs live under `/ledger/`.
- **Structured data:** no JSON-LD was found. Appropriate breadcrumbs could be a later enhancement once the visible hierarchy is settled. Absence is not an indexing failure; do not add fabricated reviews, FAQ content, Dataset claims, or markup solely to pursue rich results.
- **Journal SSR:** initial journal HTML is thin. Keep public journal indexability from m8 and treat deeper journal/report rendering inventory separately; the overview fixes must not be presented as a solution for every ledger route.
- **No content duplication project:** reuse the public ledger's existing title and README. No mass-generated landing pages, translated README claims without translations, keyword registry, broad URL renaming, or private-source dependency.
- **No accounting changes:** this milestone does not change postings, lots, valuation, realized gains, date semantics, API credential policy, or public/private authorization.
- **No new dependencies by default:** use the current router, Apollo, Markdown, image assets, and backend paging client. Ask before adding a dependency; never hand-edit a lockfile or generated client.

## Implementation validation matrix

| Boundary | Required checks |
| --- | --- |
| Public SSR content | Healthy README visible without JS; absent, empty, malformed, failed, and deadline cases settle deterministically; narrative survives report-empty/error states after successful ledger authorization. |
| Hydration and freshness | Fast browser completion before hydration; no root recovery; stable surrounding DOM; no redundant successful-read fetch; intentional timeout retry; edits/deletion and late old-ledger results. |
| Access isolation | Anonymous public, authorized owner, unauthorized private, missing ledger, public-to-private transition, and two synthetic ledgers. No protected content in unauthorized responses, and no cross-session or cross-ledger leakage through HTML or hydration payloads. |
| Performance | Current normal/delayed public cold SSR with a documented finite README budget; private/client-navigation and optional-metadata/count controls retain m23 behavior; market-value first render stays truthful. |
| Head metadata | Full SSR + hydration + navigation document, authored/missing fields, language changes, file path prefix, noindex/error policy, canonical/filter normalization, and one metadata owner. |
| Public layout | Mobile/desktop fresh visitor, owner, saved order/hidden settings, reset, denied storage, no README, and empty report filters. |
| Month selection | Trailing empty periods, offsetting categories, explicit empty month, explicit time range, and all-empty series. |
| Sitemap traversal | Upstream cap below requested limit; multiple pages/users; private-only page; repeated page; stable user order; page-two failure; complete-cache preservation; cold error; bounded concurrency. |
| Deployed artifacts | Fresh sitemap contains the sample and canonical eligible URLs exactly once; OG image returns decodable image data; no assumption that an older cached artifact proves the new code. |

For implementation, run focused behavior tests first, then the owning package's required gates from inside that package:

- **Dashboard:** `yarn format:check`, `yarn lint`, `yarn test`, `yarn build`. When Reports guidance changes, also run root `python3 scripts/check-agent-guidance.py`.
- **Backend-v2:** follow its scoped guidance; run the focused sitemap tests, `yarn typecheck`, `yarn test`, and `yarn generate-v1-openapi`, inspecting generated drift rather than editing generated output manually. Preserve the zero-debt API parity gate.
- **Adoption closeout:** check owning README instructions and existing public example links. Review root package tables and skill catalogs for applicable drift; no new package or skill is proposed, so unrelated documentation rewrites are unnecessary.

These are planned implementation checks. Task validation notes below must record which checks actually ran; this original checklist alone is not evidence of success.

## Definition of done

- Healthy public README-bearing overviews expose the authored explanation in visible initial HTML within the documented SSR contract, with tested failure/deadline behavior and no hydration or access-isolation regression.
- Public first visits present a descriptive title and introduction before financial widgets; saved dashboard customization remains respected.
- The ledger route family has one complete metadata owner, meaningful overview title/description fallbacks, and preserved canonical, language, error, file-title, and indexability behavior.
- Default public money-movement periods show relevant available activity without changing explicit filters, chosen periods, or ledger data.
- Complete sitemap traversal includes the previously omitted public sample; incomplete refreshes cannot masquerade as successful complete artifacts; generated URLs match their canonicals.
- Sharing metadata references a working owned image of the declared format and size.
- Meaningful regression checks, current performance evidence, native package gates, and post-deployment public smoke checks support each outcome. Traffic growth is measured afterward and is not a closeout gate.
- Apply the standard closing-task and archival workflow only after those outcomes actually hold. The milestone stays open until final artifact verification supports closeout.

## Primary external references

- [Google: JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) — rendering can make JS content indexable; server-rendered content also serves crawlers without JS.
- [Google: descriptive title links](https://developers.google.com/search/docs/appearance/title-link) — descriptive, distinctive titles and an unambiguous visible main title.
- [React: title rendering](https://react.dev/reference/react-dom/components/title) — separate components rendering titles can produce multiple head elements.
- [TanStack: document head management](https://tanstack.com/router/latest/docs/guide/document-head-management) and [deferred data loading](https://tanstack.com/router/latest/docs/guide/deferred-data-loading) — route-level ownership and the limits of treating deferred data as an SSR content solution.
- [Google: build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) — canonical URL inventory, submission/location, and the 50,000-URL/50 MB uncompressed limits. Sitemap presence is a discovery signal, not an indexing guarantee.
