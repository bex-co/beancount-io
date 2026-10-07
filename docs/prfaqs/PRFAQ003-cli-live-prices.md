# PRFAQ003 — Live Prices in the bea CLI

Status: CLI support released in [bea 0.3.0](https://github.com/bex-co/beancount-io/releases/tag/cli-v0.3.0) on 2026-09-21; the current release is 0.3.1, a bug-fix release ([package metadata](../../cli/pyproject.toml)). Authenticated production workflows, packaged installation and both public distribution channels are verified for 0.3.0. The launch copy is unpublished, and the product work in FAQ 15 is open with no owner assigned. No adoption measurements are implied.

Date: 2026-09-20 (America/Los_Angeles)

Scope: Authenticated managed price includes for local `bea` ledgers, using the existing `bea cloud` login, with automatic refresh, source status, offline reads, and portable exports.

Evidence baseline: repository commit `04f274d2`, the local `cli-v0.2.0` tag, and read-only production probes performed during this review. No customer interviews, adoption measurements, or new pricing commitments are implied.

**Decision:** The managed-price loader ships with reuse of the customer's CLI login. The live-prices page supplies the include lines, so customers can reach a useful local valuation without a new setup command or quote-provider account.

This document builds on [PRFAQ002](PRFAQ002-include-live-price.md), [ADR015](../adrs/ADR015-ledger-managed-price-includes.md), [ADR016](../adrs/ADR016-backend-cluster-forwarded-request-context.md), and [ADR018](../adrs/ADR018-cli-managed-price-includes.md). It uses the access model in PRFAQ002 FAQ 10: price feeds require a Beancount.io login and are not public.

## Release evidence — 2026-09-21

- Implementation: `3c86426b`; release: `c80a49fd` / `cli-v0.3.0`.
- [Release workflow](https://github.com/bex-co/beancount-io/actions/runs/35575551718): all 21 jobs passed, including all 12 wheel/sdist combinations across Linux, macOS and Windows with Python 3.12/3.14, two Homebrew rehearsals, publication, and five post-publication installation jobs.
- [PyPI 0.3.0](https://pypi.org/project/beancount-io/0.3.0/) wheel and sdist hashes match the validated GitHub artifacts. The public Homebrew tap points to the same 0.3.0 sdist.
- The exact GitHub-built wheel passed the authenticated production refresh, check, valuation, offline replay, export and manual-price-precedence journey. The [smoke record](../../cli/tests/managed_prices_live_status.json) stores only public feed metadata and was produced with 0.3.0.
- Deterministic installed smokes cover saved login, `BEA_TOKEN`, cached service failure and offline export without production credentials. Local package checks passed, and final price regressions passed 167 tests with one explicit anonymous-network probe skipped by default.

## Press release

*Proposed launch copy, written as if released. The engineering gates in FAQ 13 passed for 0.3.0 and the copy names that version. It is unpublished until the product work in FAQ 15 is done.*

**Beancount.io brings live prices to bea: keep your portfolio valued from the terminal**

*Sign in once, add a price include, and refresh the value of your local holdings without maintaining a quote-download script.*

Beancount.io today introduced live prices in `bea`, its command-line tool for plain-text accounting. People tracking investments can now use the same managed price includes in local ledgers that they use on Beancount.io. Their existing transactions and acquisition costs stay under their control, while supported valuation prices update when they run their reports.

Keeping investment books usually involves two jobs: recording what happened and maintaining prices for what is still held. A purchase may be entered once, but its market value changes every day. Live prices removes the recurring price-file maintenance for supported instruments.

Customers sign in with `bea cloud login`, choose their assets and quote currency at [beancount.io/live-prices](https://beancount.io/live-prices), and paste the generated includes into their ledger. For Bitcoin valued in US dollars, the connection is one line:

```beancount
include "https://beancount.io/prices/BTC-USD"
```

`bea` uses the saved login to retrieve prices and maintains a local cache. Customers can inspect each source's observation time, refresh it explicitly, or continue reading cached prices offline. A failed refresh preserves the last validated data and reports the problem. Export saves local price files for use with ordinary Beancount and Fava.

The ledger stays on the customer's machine. Price requests send the requested instrument pair and authentication credential to Beancount.io; they do not upload transactions, account names, holdings, or ledger files. No separate market-data provider key is required for the supported catalog.

Live prices is available in `bea` 0.3.0 and later through PyPI and Homebrew. The release notes identify the minimum supported version and link to the current catalog and setup guide.

## Customer FAQ

### 1. Who is this for?

People who already track investment holdings in local Beancount files and want to answer: “What are these holdings worth at the available market prices?” It also serves scripts and coding agents that need inspectable price sources, predictable failures, and reproducible exports.

The first useful result is a local valuation with a known source and observation time. This feature does not import brokerage transactions or reconstruct missing acquisition costs.

### 2. How do I start?

Install `bea` 0.3.0 or later, then sign in:

```bash
bea cloud login
```

Open [Live prices](https://beancount.io/live-prices), choose the currency in which you want to value your assets, select supported instruments, and copy the generated includes into your ledger. Choose the currency that matches your accounting needs; the page's language-based default is only a suggestion.

For a ledger containing Bitcoin holdings, add:

```beancount
include "https://beancount.io/prices/BTC-USD"
```

Then run:

```bash
bea --file main.bean price status
bea --file main.bean balance Assets --conversion USD
```

The include supplies prices; the ledger must already contain the holdings. One include covers the same commodity across accounts. A different quote currency requires a listed pair; changing a report's currency does not create a missing exchange rate.

### 3. Do I need a Beancount.io account or a hosted ledger?

An account and a valid CLI login are required to retrieve the authenticated feeds. A hosted ledger is not required. `bea cloud login` authorizes the CLI; it does not upload the local ledger.

The launch reuses the current price service's access policy. It introduces no new CLI-specific fee, but does not promise that every account or future instrument has identical entitlements. Product must confirm the launch catalog and applicable access requirements before publishing availability claims; that confirmation is outstanding.

Customers do not paste a token into an include, a Git repository, or a price-provider configuration. Existing automation can supply `BEA_TOKEN` using the CLI's established credential mechanism.

### 4. How live are the prices?

“Live” means maintained valuation data that refreshes on use, not a streaming trading quote. The existing cache checks for a new revision when its five-minute refresh window has elapsed. `bea price refresh` requests an immediate refresh:

```bash
bea --file main.bean price refresh
```

Source observation time is distinct from download time. The current CLI classifies observations as `recent` within ten minutes, `stale` after that, or `unavailable` when it has no validated revision. A successful download of an old observation must still appear stale.

The first release keeps these explicit age-based labels. It does not claim that they understand exchange calendars or distinguish a normal weekend close from an overdue update. Stock and fund examples may be promoted only with the source's actual delay and coverage disclosed; no blanket real-time-equity promise is part of this launch.

### 5. What happens if my login expires, the provider fails, or I am offline?

The CLI preserves the last validated revision and explains why a refresh could not complete. An expired login points to `bea cloud login`; an access refusal remains distinguishable from an unknown pair or provider outage. Reports do not silently launch a browser or wait for login.

```bash
bea --file main.bean --offline balance Assets --conversion USD
bea --file main.bean --strict-prices check
```

`--offline` makes no price requests and does not require a fresh login to read a saved cache. `--strict-prices` fails when a managed source is stale or unavailable. Without usable prices, normal reads preserve access to the books and identify missing valuation inputs, subject to the command's existing partial-result rules. They must not present acquisition cost or zero as a successfully refreshed market value.

An explicit `price refresh` that cannot refresh a source exits nonzero and names each failed source, even if a previous cache remains usable.

### 6. Does refreshing change my accounting records?

It can change the market valuation derived from prices. It does not change transaction dates, quantities, cash movements, acquisition lots, fees, or recorded cost. It does not create a sale or realized gain.

A ledger-authored price wins over a managed price for the same date and pair, including reciprocal-pair collisions. The source status reports how many managed points were shadowed. Managed entries are read-only, and merely reading or refreshing a ledger never commits changes to its source files.

### 7. Can I use the ledger with stock Beancount or Fava?

Yes, through an exported copy:

```bash
bea --file main.bean price export --output audit
```

The export contains local price files and rewritten relative includes, preserving the effective prices used after manual overrides. Stock tools read those files without fetching the managed URL or needing a Beancount.io token. No token belongs in the export.

The original URL include is a `bea` and Beancount.io extension; unmodified upstream tools do not fetch it. Export is an explicit snapshot operation and may refresh first under normal loading rules. To preserve an already cached revision without fetching, use `--offline` with export. A historical date filter alone does not freeze a provider's revision. Unrelated plugins and external documents retain their own portability requirements.

### 8. Can an agent or scheduled task use this?

Yes. Reuse a valid credential through the existing `BEA_TOKEN` mechanism and use the global machine-output options:

```bash
bea --file main.bean --json --no-input price status
bea --file main.bean --json --no-input price refresh
bea --file main.bean --json --no-input --strict-prices balance Assets --conversion USD
```

Source status includes revision, freshness, observation time, refresh timing, and any error. Failure output must follow the existing JSON envelope and exit-code conventions. `--no-input` never starts a login ceremony, and credentials never appear in normal output, debug output, or exported files.

## Internal FAQ

### 9. What did the review find, and how did the release resolve it?

The review at `04f274d2` found a working loader that could not authenticate. Implementation `3c86426b` added scoped credential relay, accurate refresh failure results and ordinary report provenance, and 0.3.0 added the authentication, cache and export journey to the installed-artifact smokes. No engineering gap from the review remains open.

| Area | Finding before the release | State in 0.3.0 and later |
| --- | --- | --- |
| Public discovery | Anonymous `GET /prices/options.json` returned 200; the live-prices page generates includes from that catalog. | The page remains the discovery path. No terminal picker was added. |
| Feed access | Anonymous `GET /prices/BTC-USD` returned 302 to login. | The CLI authenticates. A redirect to login is reported as an authentication problem, not followed. |
| Existing CLI login | The stored `bea cloud` credential was present and unexpired. Both Bearer and session-cookie requests returned 200, `text/plain`, an ETag, and 93 price directives. | Bearer authentication is the shipped path. [Fetcher](../../cli/src/bea_engine/managed_prices.py). |
| Loader and cache | [Managed loader](../../cli/src/bea_engine/managed_load.py), [feed validation](../../cli/src/bea_engine/managed_prices.py), and [disk cache](../../cli/src/bea_engine/managed_price_cache.py) existed in the checkout. | The common path was extended; there is no report-only downloader. |
| Command surfaces | [Price commands](../../cli/src/cli/commands/price.py) dispatched status, refresh, and export; [global options](../../cli/src/cli/main.py) included offline and strict-price modes. | The names are unchanged. |
| Credential handoff | The price fetcher constructed requests without authorization or cookies. | Closed. The fetcher attaches `Authorization: Bearer` to feed requests. |
| Release boundary | The inspected `cli-v0.2.0` tag predated managed includes and had the older `bean-price` forwarding command. | 0.3.0 is the minimum version; 0.3.1 is current. |
| Recorded live test | The [probe record](../../cli/tests/managed_prices_live_status.json) held the earlier anonymous 302 as pending. | Replaced. The record holds the authenticated 0.3.0 smoke and its six checks. |

The authenticated smoke covers one account and BTC-USD. It does not establish access for every token type, account, or asset, and it has not been re-recorded for 0.3.1. No secret values were recorded.

### 10. How should credential reuse work?

Use [`load_credentials()`](../../cli/src/cli/auth/credentials.py) in the frontend, preserving `BEA_TOKEN` precedence over the stored login. Provide the credential to the engine through the existing subprocess boundary; the engine must not import frontend authentication or API modules. Credential access must not make unrelated local commands require login.

The fetcher should attach `Authorization: Bearer <token>` only to the exact trusted HTTPS origin and an accepted `/prices/<ALIAS>` path. An additional origin in `MANAGED_PRICE_ORIGINS` does not automatically become a credential recipient. Reject user-info, query strings, fragments, nonstandard origins, and redirects according to the managed-source policy. Retain the five-second fetch budget, 1 MiB body cap, price-only validation, and sixteen-source limit.

The subprocess handoff must keep the token out of command-line arguments, request URLs, protocol responses, tracebacks, and persistent feed metadata. It must be reviewed with debug mode and exception paths, not only the happy path. HTTPS is required for this production CLI handoff even though the older hosted relay has a configurable HTTP exception.

The feed cache remains reusable across logins only while a given URL returns identical market data for every authorized caller. If access changes the returned content, introduce an appropriate account or entitlement cache partition before enabling that behavior. Logout does not retroactively delete a user's existing local market-data snapshot.

### 11. What is in the first release?

The release consists of saved-login reuse, the existing include syntax, automatic bounded refresh, status and error reporting, offline/strict modes, and a portable export. It must work across check, list, query, reports, imports, and write validation through the common loader. Existing ledgers without managed includes remain usable without network access or login.

The catalog defines which pairs are selectable; launch examples must also pass authenticated retrieval and validation. Catalog presence alone does not prove current feed availability. Use BTC-USD as the verified starting example and qualify any additional promoted examples before publication. CLI support does not create new asset coverage or data rights.

`bea price search` and `bea price connect`, automatic holdings inference, a terminal picker, streaming prices, and exchange-calendar-aware freshness are follow-ups. They are not dependencies for a useful launch, and the announcement must not show them as available commands. Existing `bean-price` forwarding and `bea add price` remain distinct supported workflows.

### 12. What failures must the experience distinguish?

| Situation | Required experience |
| --- | --- |
| No login or expired stored login when a network fetch is needed | Name the source and give `bea cloud login` as the next action; retain usable cache and existing partial-read behavior. |
| Server rejects a credential | Report an authentication or access error, without printing the token or claiming the instrument is unsupported. |
| Unknown alias / removed source | Name the unavailable pair and link to the catalog; do not synthesize a replacement symbol. |
| Timeout, rate limit, redirect, or invalid feed body | Preserve the last validated revision and report the cause and observation time. |
| Explicit refresh fails | Return nonzero using the existing error categories; report per-source successes and failures without claiming an all-success refresh. |
| Offline with usable cache | Read the identified cached revision without authentication or network activity. |
| Offline without cache | Report unavailable pricing; strict valuation fails and quantities remain inspectable through existing partial-read controls. |
| Export with an unavailable source | Refuse by default; the existing explicit `--allow-errors` escape hatch must disclose the incomplete export. |

### 13. What must pass before we announce availability?

| Gate | Acceptance evidence |
| --- | --- |
| Fresh installation | Test the exact PyPI artifact and Homebrew release candidate, not just a source checkout. Sign in, add BTC-USD to a synthetic ledger, inspect status, and obtain a converted balance. |
| Accounting integrity | A known holding produces the expected value from the retrieved revision. A refresh changes valuation when the quote changes and leaves customer source bytes, quantities, and cost unchanged. |
| Authentication | Stored login and `BEA_TOKEN` both work. Missing, expired, and server-rejected credentials produce the documented outcome. No credential is forwarded to an alternate origin or through a redirect. |
| Cache and failure | Exercise a new revision, 304, provider failure, malformed content, offline hit/miss, and strict mode. Failed refresh preserves good data and reports a nonzero refresh result. |
| Load-path consistency | Check, list, query, reports, import, and write validation resolve the same managed inputs; duplicate includes do not multiply entries and managed entries cannot be edited. |
| Portability | Export a ledger with manual overrides, disable network access, and verify the exported prices and balances with supported stock tools. Inspect all artifacts for credentials. |
| Machine contract | JSON status and refresh expose source outcomes, normal stdout contains no progress text, and noninteractive failure never opens a browser. |
| Release and discovery | Pass `make check-all` and package release checks, update the frontend/helper version pins together, publish both channels, and verify the public installation instructions name a version containing the change. |

The release evidence above records these gates passing for 0.3.0.

The live authenticated smoke test uses a designated test account supplied through protected credentials. It never commits a token. Interactive verification may explicitly reuse an authorized cloud login; unattended runs supply a protected test credential instead of relying on a developer login. The general test suite uses synthetic feeds and credentials; the release smoke establishes actual production compatibility.

### 14. How do we roll it out and measure success?

The credential and failure-handling changes are complete, and the release is on both channels. Two rollout steps are not done: verifying the release with a small opt-in group using local investment ledgers, and adding a CLI setup path to the existing marketing page. That path leads from selecting assets to login, include placement, status, and the first valuation. The [CLI README](../../cli/README.md) already carries those steps.

Use the same installation and first-valuation script against the publicly distributed release after publication. A successful package upload or source commit alone does not complete launch. If authenticated retrieval fails after launch, pause promotion, preserve cached/offline access, and release a fix; do not erase customer includes or weaken authentication to make the demo pass.

The pilot has not been run. Proposed targets, not measured results: at least 8 of 10 participants complete login-to-first-priced-report without help, with a median of five minutes or less after installation. Every acceptance fixture must preserve source bytes and produce the expected valuation and export. Investigate repeated refresh failures before widening promotion.

Measure onboarding through consented pilot observation and aggregate service health where available. Do not add silent ledger telemetry. Record whether participants return for a later valuation and whether they still need a manual download script; these answer the retention question better than counting installed packages alone.

### 15. What remains, and who owns it?

The CLI deliverables are complete: credential handoff, actionable authentication errors, refresh exit semantics, shared-loader regression coverage, generated command docs, and the packaged release. The remaining work is not scheduled and has no owner assigned.

| Remaining work | Area | Owner |
| --- | --- | --- |
| Add the CLI setup path to the marketing page and publish the launch copy with its minimum-version messaging. | Product / growth | Unassigned |
| Confirm the launch catalog and the access claims in FAQ 3 and FAQ 11, including the relationship between listed pairs and retrievable feeds. | Product / growth; price service | Unassigned |
| Run the 10-person pilot in FAQ 14 and record its results. | Product / growth | Unassigned |

The release kept the existing account gate, reused the customer's CLI identity, and shipped the smallest complete local workflow. A new authentication system, anonymous feeds, and new terminal discovery commands were not needed.
