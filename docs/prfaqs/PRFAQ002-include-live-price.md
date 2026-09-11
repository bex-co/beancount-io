# PRFAQ002 — Include Live Price

Status: Proposal for review; no product changes implemented

Date: 2026-09-11

Scope: Managed crypto and stock prices, URL includes, portfolio valuation, local and hosted compatibility, and reproducible price snapshots

Research baseline: repository commit `a1c1bac8`, a local Beancount 3.2.3 compatibility probe, and primary documentation accessed 2026-09-11. Customer demand, provider contracts, and operating costs have not been validated. All URLs, interfaces, targets, and availability below describe the proposal unless identified as current behavior.

**Recommendation:** Let customers maintain an asset's valuation prices with one line:

```beancount
include "https://beancount.io/prices/BTCUSD"
```

Start with BTC and ETH quoted in USD, then a curated catalog of U.S. stocks and ETFs quoted in USD, gated on market-data redistribution rights. Deliver recent crypto reference prices, explicitly delayed stock prices, and daily history through ordinary Beancount `price` directives. Make source identity, freshness, manual overrides, and portable snapshots part of the first customer release. “Live” means automatically refreshed valuation data with a visible observation time and delay.

This follows [PRFAQ001's investment starter](PRFAQ001-ledger-creation.md#a4-investment-portfolio): record holdings and acquisition costs first, then offer prices when the customer requests market valuation. Creating books or recording a purchase does not require enabling a feed.

## Press release

*Proposed launch copy, written as if released. This is not an announcement of current availability.*

**Beancount.io introduces Include Live Price: keep portfolio values current with one line**

*Connect a supported asset once and get maintained prices in your own plain-text books.*

Beancount.io today introduced Include Live Price for people tracking crypto, stocks, and ETFs. Customers can select an investment in the dashboard or add a single include to their ledger, such as `include "https://beancount.io/prices/BTCUSD"`. Beancount.io supplies the prices used to value that holding and keeps them updated when customers open or refresh their reports.

Investors already record what they bought, what they paid, and what they still own. Maintaining another list of market prices adds repetitive work before they can answer a basic question: what are these holdings worth now? Include Live Price handles that maintenance, without requiring a separate quote script, scheduled job, or personal market-data API key for the supported catalog.

Every connected asset shows the instrument, quote currency, source, and time of its latest observation. Crypto reference prices refresh throughout the week. Stock prices show their published delay while the market is open and the latest completed close after the session. Reports identify missing or stale prices so customers can see how complete their valuation is.

Customers keep control of their books. Existing purchases, sales, fees, quantities, and recorded acquisition costs remain authoritative. A customer can supply their own dated price, disconnect a source, or save the prices behind a report. Exported snapshots contain standard Beancount files that can be checked and reopened offline.

Include Live Price is available through the dashboard and compatible `bea` releases, with the same hosted valuations available to mobile and API clients. The initial catalog and refresh schedules are published alongside each source. Broader market coverage will follow measured demand and data availability.

## Customer FAQ

### 1. Who is this for, and what job does it do?

The first customers are individual investors and households who already track supported crypto, stocks, or ETFs in Beancount and want current net worth, allocation, and unrealized valuation changes. Bookkeepers and agents managing those records need the same repeatable source and export behavior.

The job is: “I have recorded my holdings; keep their valuation prices up to date so I can review my portfolio.” Success is the first useful, visibly sourced valuation followed by weeks without routine manual price entry. The hypothesis is that this removes a recurring obstacle to using investment reports; we have not measured its frequency or retention impact.

### 2. How do I get started?

In an investment or commodity view, choose **Connect prices**, search for the asset, and review its full identity, ledger commodity, quote currency, history coverage, and update schedule. The preview shows the include line that will be added. Saving adds that line to a selected editable ledger file and refreshes the valuation. Repeating the same action does not add another include.

People editing files can add the line directly. Examples for the proposed initial catalog:

```beancount
include "https://beancount.io/prices/BTCUSD"
include "https://beancount.io/prices/ETHUSD"
include "https://beancount.io/prices/AAPLUSD"
```

Each line provides prices for one unit of the base commodity in the quote currency: `BTCUSD` means USD per BTC. It does not record a purchase or establish that the customer owns BTC. The dashboard suggests connections for holdings with missing prices; it never connects every discovered ticker automatically.

One include covers that commodity across accounts in the ledger. A portfolio with several assets uses several includes; customers do not need one per wallet, broker, or acquisition lot.

### 3. How live are the prices, and which markets come first?

The following are proposed release requirements, subject to provider qualification. Polling a provider more often cannot remove the provider's delay.

| Asset class | First-release coverage | Price and freshness contract |
| --- | --- | --- |
| Crypto | Native BTC and ETH, quoted in USD | A named provider's reference spot price, with a published methodology. Refresh at most every five minutes; mark stale when the observation is more than ten minutes old. Operates seven days a week. |
| Stocks and ETFs | A reviewed list of liquid U.S. listings, quoted in USD; AAPL and SPY are candidate acceptance instruments | A licensed consolidated reference price from the regular session, delayed by 15 minutes and labeled accordingly. Refresh at most every five minutes; mark stale when observation age exceeds 20 minutes during the session. Publish the unadjusted completed-session close within 60 minutes of close. |
| Later coverage | More crypto, non-U.S. listings, additional quote currencies, and licensed real-time stock data | Add only after identity, history, quality, rights, and cost gates pass. Publish each source's actual timing before enabling it. |

The connection preview and report show **Recent**, **Delayed**, **Market closed**, **Stale**, or **Unavailable**, with text and timestamps. Stock calendars include holidays, early closes, and daylight-saving changes. A Friday close can be the expected price on Sunday; a missing Monday update after the expected publication time is a problem. Trading halts have an explicit status and never look like a fresh trade.

Opening or refreshing a report checks the managed cache. An open screen displays when it was calculated and provides **Refresh prices**; streaming charts and continuous screen updates are later work. If stock data cannot meet the agreed delay or redistribution terms, keep stocks outside the released catalog until a revised offering is explicitly approved and described.

### 4. Does the include provide history or only today's price?

Both. By default it returns all daily history in the source's published coverage plus the latest eligible observation. Coverage has a visible start date and any known gaps; the service must not silently roll older prices out of a moving window. An optional date range can reduce a large file. Dates before available coverage remain unpriced.

Our proposed daily convention is the final eligible crypto observation before the end of each UTC day and the unadjusted regular-session close on each stock's exchange date. Today's newest observation is provisional until that day or session is finalized. Preserve the actual observation timestamp separately; never relabel yesterday's observation as today's quote. A midnight sample must be assigned according to its observation boundary, not an assumed provider date label.

For a historical report, use the latest eligible price on or before its requested valuation date. Never use today's price to fill an earlier gap. Carried prices keep their original dates and quality status. No interpolation or invented weekend stock observations are added.

Beancount prices have daily resolution. Source timestamps explain freshness but do not add intraday accounting semantics. The proposal supports daily historical valuation and a current indicative valuation; trade-time execution analysis requires separate data. See the upstream [price and same-day semantics](https://beancount.github.io/docs/beancount_language_syntax/#prices).

### 5. What changes in my investment reports?

Market value and any report derived from it can update. Recorded quantities, transaction cash flows, fees, acquisition lots, and cost amounts do not change when a quote changes. A missing acquisition cost remains unknown; it is never filled with a market price. Tax preparation still needs the transaction evidence and reviewed treatment described in PRFAQ001.

For a synthetic example, 0.5 BTC acquired at 80,000 USD per BTC has a recorded acquisition amount of 40,000 USD. A reference price of 92,000 USD values that holding at 46,000 USD, a 6,000 USD difference before fees and other adjustments. Refreshing to 94,000 USD changes its value to 47,000 USD and that difference to 7,000 USD. It creates no sale, cash receipt, or realized gain.

Prices support indicative portfolio values. They do not establish executable proceeds for a large or illiquid position. The product does not claim a verified portfolio return merely because every holding has a quote: cash flows, distributions, quantities, and costs must also be complete.

### 6. How do you prevent the wrong asset or currency from being used?

Short URLs are curated aliases, not a parser that guesses how to split arbitrary strings. `BTCUSD` is permanently assigned to native Bitcoin quoted in actual USD. The catalog records a stable instrument ID, asset class, full name, listing or network where relevant, quote currency, and source methodology. Once published, an alias must never be reassigned to a different instrument.

Stocks are identified by listing and share class, not ticker alone. Crypto tokens need network and contract identity where relevant; wrapped, bridged, and staked assets are separate instruments. A USD stablecoin is a separate commodity with a measured price, including during a depeg. No stablecoin is assumed to equal one USD, and a BTC/USDT price must not be relabeled BTC/USD.

The catalog provides an unambiguous canonical URL for every supported identity. Short aliases remain optional conveniences. If a ledger calls Bitcoin `XBT`, the connection preview can generate an explicit commodity mapping, provisionally `?commodity=XBT`, that changes only the emitted Beancount symbol. It cannot change the underlying instrument or relabel the quote currency. Ambiguous or unsupported searches require a deliberate selection or return no match.

The initial release supplies USD quotes. Customers reporting in EUR can retain explicit USD/EUR prices, but the product must show when a required conversion is unavailable. This feature does not promise new multi-hop conversion support in every report. Any later managed conversion must identify both observations, their dates, and the resulting conversion path.

### 7. Can I keep my own prices?

Yes. For the same valuation date and commodity pair, an explicit customer `price` directive takes precedence over a managed price, independent of include ordering. This applies to the reciprocal pair as well, so an inverse feed cannot bypass the override. The report identifies the selected source as **Manual**. A manual price for one day does not disable later managed prices.

Within the managed-price workflow, the priority is explicit local prices, then the selected managed source, then transaction-derived implicit prices. Preserve the existing behavior among local directives when no managed source is involved. If two different managed sources would supply the same mapped pair, require one to be selected; repeated includes of the same source are deduplicated.

The implementation must resolve this precedence consistently before valuation and export. Customers should not need to rearrange files to make an override win. Removing a connection stops future resolution for that source; previously exported files and saved snapshots remain available.

### 8. What happens if a provider is down, a price is missing, or I am offline?

Use the last validated cached observation when available, keeping its original date, timestamp, and visible stale status. An HTTP success or a fresh cache download cannot make an old observation recent. A bad refresh never replaces a good cache entry with an empty file.

Without a usable price, customers can still read transactions, check accounting balances, and see quantities. Reports list the unpriced holdings and label any converted total as partial; they never substitute zero or silently present acquisition cost as current market value. Automation receives the same per-source status and valuation completeness, with an explicit strict mode that fails if its required prices are missing, stale, or otherwise disallowed.

Offline mode makes no network requests and uses an identified cache or saved snapshot. If neither exists, it reports unavailable pricing while preserving access to the books. Syntax errors in the customer's own files remain normal ledger errors; the availability behavior is specific to managed price sources.

### 9. Can I reproduce month-end numbers or use ordinary Beancount tools?

Choose **Save price snapshot** to record every resolved source revision and exact price file used by a report, together with the ledger revision, report parameters, and engine version. A snapshot covers the whole valuation, including local overrides and required currency prices. Reopening it uses those inputs without refreshing. Freezing a report fixes its inputs; it does not certify that the books or prices are correct.

A date filter alone is insufficient: a provider can later correct an old observation. A saved snapshot keeps the old bytes, while a new snapshot can deliberately incorporate a correction. The interface shows the affected dates and changed values. Active, unsaved valuations can change as current-day observations and disclosed corrections arrive.

Export creates a self-contained copy with local price files and relative includes, for example:

```beancount
include "prices/BTCUSD.beancount"
```

The export retains the exact effective prices and source metadata, excludes duplicate managed prices suppressed by local overrides, and can be checked without Beancount.io. It includes the available ledger file set and a manifest of any unrelated dependencies that prevent full portability. Ordinary local files remain editable and versionable.

**Compatibility boundary:** URL resolution is a proposed Beancount.io and `bea` extension. Unmodified upstream Beancount does not fetch these URLs; use the exported local includes with upstream tools. The original ledger is never rewritten merely because a report is opened.

### 10. Do I need an account, a provider key, or a paid plan?

The recommendation is a public, cacheable endpoint for the basic licensed catalog, usable by local `bea` without a Beancount.io account or personal provider key. Hosted ledger access and edits retain their existing authentication and permissions. Local price fetching sends instrument requests to Beancount.io; quantities, account names, transactions, and wallet addresses stay local. IP addresses and requested instruments are still visible to the service and must be covered by its documented logging policy.

Beancount.io obtains provider data centrally. Upstream providers receive catalog queries rather than each customer's ledger. Paid tiers may later fund broader coverage or faster licensed data; public basic URLs must not acquire hidden subscription dependencies or require secrets embedded in ledger files. Commercial availability remains subject to the rights and economics gate in FAQ 13.

## Internal FAQ

### 11. What exists today, and what does the research establish?

This is a product and implementation study, not a deployed prototype. It includes no customer interviews, production usage analysis, provider procurement, or verification of the proposed public endpoints.

| Area | Verified baseline | Implication for this proposal |
| --- | --- | --- |
| Upstream loading | A local Beancount 3.2.3 probe of the exact BTCUSD include, with socket connections disabled, produced no entries and `File glob "https://beancount.io/prices/BTCUSD" does not match any files`. Upstream documents file-relative includes. [Include documentation](https://beancount.github.io/docs/beancount_language_syntax/#includes). | Serving a text endpoint alone cannot deliver the promised experience. Add managed resolution around existing loaders and an offline export path. |
| Hosted source loading | The hosted loader builds a file map from the ledger's Gitea files and resolves include targets as repository paths. [File-map loader](../../backend-cluster/ledger/src/foundation/rustledger/file-map-loader.ts). | Resolve supported managed URLs into validated, read-only virtual files before the engine consumes the file map. Preserve source locations for customer files. |
| Hosted caching | The repository file-map cache is keyed by Git commit SHA. [Cache implementation](../../backend-cluster/ledger/src/foundation/clients/load-cached-ledger-file-map.ts). | Keep this cache for committed files. Price-dependent results also need the resolved price revision set; otherwise unchanged books can keep showing old prices. |
| Existing valuation | The hosted price map keeps the last rate per day, adds inverse rates, and looks up the latest rate on or before a requested date. Unconvertible holdings remain in their original units. [Price map](../../backend-cluster/ledger/src/foundation/rustledger/price-map.ts). | Define feed precedence before building the map, and add completeness and freshness without another valuation engine. |
| Local CLI loading | Directive reads call upstream Beancount; report/check paths use vendored Fava loading. Write validation also loads the ledger. [Reader](../../cli/src/cli/directives/reader.py), [Fava loader](../../cli/src/fava/core/loader.py), [write validation](../../cli/src/cli/ledger_write.py). | Integrate a common package-local resolution policy across reads, reports, checks, imports, and write validation. A report-only implementation would leave connected books unusable in other commands. |
| Existing alternative | Upstream `beanprice` fetches market prices and renders Beancount syntax, including an update workflow. [Project documentation](https://github.com/beancount/beanprice). | Reuse standard price directives and investigate compatible source integrations. Our additional product value is managed setup, refresh, quality status, and snapshots; existing local quote workflows remain useful. |

Primary provider documentation illustrates why the data contract matters. CoinGecko supports stable coin IDs and a last-updated timestamp; our inference is to use identities and observation times rather than rely on symbols or HTTP retrieval time. [CoinGecko simple-price documentation](https://docs.coingecko.com/reference/simple-price).

Alpaca distinguishes a single-exchange IEX feed from consolidated SIP data and documents access-dependent delays. Its historical bars API distinguishes raw, split-adjusted, and dividend-adjusted data. Our inference is to specify the feed and adjustment policy explicitly rather than let provider account defaults determine customer valuations. These are evaluation examples, not selected vendors or evidence of redistribution rights. [Market-data FAQ](https://docs.alpaca.markets/us/docs/market-data-faq), [historical bars](https://docs.alpaca.markets/us/reference/stockbars).

### 12. What is the proposed feed and loading contract?

The public GET endpoint returns UTF-8 Beancount text, with `Content-Type: text/plain; charset=utf-8`, containing comments, `price` directives, and allowlisted metadata only. It represents a single resolved instrument, ledger commodity, quote currency, and source policy. Return a strong ETag for its exact bytes and support conditional requests. Catalog and API representations expose the same observation and coverage metadata.

Illustrative response excerpt; these prices and the provider name are synthetic:

```beancount
; Include Live Price — illustrative BTC/USD data
2026-09-10 price BTC 90000.00 USD
  price-source: "example-provider"
  price-kind: "daily-close"
  observed-at: "2026-09-10T23:59:59Z"
  provisional: FALSE

2026-09-11 price BTC 92000.00 USD
  price-source: "example-provider"
  price-kind: "reference-spot"
  observed-at: "2026-09-11T12:00:00Z"
  provisional: TRUE
```

The implementation design must preserve these requirements:

1. **A stable catalog and versioned policy.** Publish canonical instrument ID, aliases, ledger-symbol mapping, quote currency, provider/feed, price methodology, timezone/calendar, delay, history start, gaps, and correction policy. A source-methodology change is an explicit versioned migration, never a silent provider substitution under an unchanged meaning.
2. **Explicit range and revision semantics.** Proposed `from` and `to` parameters filter inclusive valuation dates; omitted bounds mean published coverage start and latest available date. They do not freeze corrections. An immutable `revision` identifies retained exact bytes; conflicting parameters are rejected. Never paginate or truncate an include invisibly. If a requested body exceeds limits, return a specific error and a supported range/export path.
3. **One coherent report input.** Resolve the complete include closure once per report operation, deduplicate identical requests, and pin its source revisions. Every panel and API field in that operation uses that set. Independent observations can have different times; expose them instead of implying simultaneous market quotes. Reuse a report snapshot token for follow-up panel requests.
4. **Separate market caching from ledger caching.** Fetch providers on a bounded schedule, coalesce requests across customers, and serve validated revisions through shared caches. Respect source publication delays. Key derived valuations by ledger revision, entry point, effective source revisions, override policy, and relevant report/engine options. Recompute freshness as time passes even when the ETag stays unchanged. A quote refresh must not create a Git commit or invalidate unrelated transaction data.
5. **Preserve ordinary ledger behavior.** Materialize managed data in virtual files for the hosted engine and controlled cache files for the local loader, without rewriting original files during reads. Keep remote data outside editable entry targets. Account checks remain possible when pricing is unavailable. Both engines consume equivalent effective price directives and decimal-string values; existing parser and valuation logic remain the accounting foundation.
6. **Inspectable failures.** Unknown or ambiguous identities, invalid ranges/mappings, unsupported currencies, oversized responses, and unavailable revisions have distinct errors. Rate limits use `429` with retry guidance; provider failures do not return a successful empty feed. Client fallback records the actual failure, cached revision, observation age, and completeness. Strict consumers can reject degradation.

Completed daily observations are retained with revision history. A correction produces a new feed revision, preserving saved ones. Snapshot manifests are private ledger artifacts; identical public price blobs can be shared without exposing which ledgers use them. Named hosted snapshots remain available until the customer deletes them or their ledger, subject to the published account lifecycle, and always have a downloadable form.

### 13. How should we choose providers and fund the service?

Qualify one primary source per initial asset class against a written matrix: supported identities, historical depth, timestamps, regular-session semantics, unadjusted prices, corrections, delistings, outage behavior, batch support, rate limits, and total cost. Compare representative observations against an independent reference during qualification. A secondary source may help detect anomalies; automatic substitution requires its own compatible, disclosed policy.

Market-data API access does not establish permission for this distribution model. Before publishing any instrument, confirm the actual terms for anonymous redistribution of raw price files, hosted display and calculations, local downloads, caching, attribution, delayed data, and retention of historical snapshots after a contract ends. Review each intended geography and asset class. Provider documentation alone is insufficient evidence. A catalog restricted to authenticated display would need a different proposal from the public include offered here.

The initial decision is to subsidize a small, broadly useful catalog if the approved budget permits. Model monthly licensing minimums plus provider calls, storage, egress, and support. Provider call volume should grow with supported instruments and refresh intervals, not ledger opens; report snapshot storage and public download traffic still require separate forecasts and limits. Show expected cost at 1,000, 10,000, and 100,000 monthly active connected ledgers, plus an anonymous-traffic scenario. Obtain a spending ceiling before public beta; do not publish speculative vendor prices as a business case.

Compare this service with improving documentation for `beanprice` or offering an explicit downloadable static file. Those are lower-operating-cost alternatives and remain useful escape paths. The managed include earns its additional cost only if users connect successfully, return to valuation reports, and substantially reduce price maintenance. Provider procurement and operational ownership precede broad implementation.

### 14. What investment-data mistakes must the design prevent?

Use unadjusted historical stock prices with the quantities recorded for those dates. If ten shares at 100 USD become twenty shares at 50 USD after a correctly recorded 2-for-1 split, both valuations are 1,000 USD. Applying a split-adjusted old price to the original ten-share holding would misstate the earlier value. Split detection may identify a review task, but this feature does not create corporate-action postings.

Cash dividends remain separately recorded cash and income. Do not insert dividend-adjusted or total-return series as ordinary market prices. Spin-offs, mergers, ticker changes, delistings, token migrations, redenominations, rebases, and staking rewards need correct instrument and quantity records. Preserve old identities and stop a retired source explicitly; never reuse its alias for a successor or pretend its last quote remains current indefinitely.

Validate finite positive decimal prices, expected identity/currency, timestamp plausibility, ordered history, and unique effective daily points. A zero or missing provider value is not proof an investment became worthless. Large genuine market moves and stablecoin depegs must remain representable; do not discard them solely because a percentage-change threshold fired. Quarantine suspect observations with a visible reason, compare against an independent reference where possible, and retain the last validated revision while resolving uncertainty.

Options, futures, leveraged derivatives, mutual-fund NAVs, NFTs, thinly traded tokens, and private assets are outside the first catalog. Their quotation units, valuation timing, or liquidity need separate contracts. This release also excludes trade execution, tax calculation, performance attribution, and automated corporate-action accounting.

### 15. How do we keep remote includes bounded and private?

Treat managed URLs as registered price requests rather than arbitrary remote file imports. Initially accept only HTTPS, the exact `beancount.io` host, and the documented `/prices/` routes and parameters. Reject URL credentials, alternate ports, unsupported schemes, and redirect-based destination changes. Hosted loading can route a validated identity directly to the price service instead of fetching an arbitrary customer-provided URL. Local HTTP resolution needs the equivalent origin and redirect restrictions.

Only the validated price-only format enters the engine. Reject transactions, account directives, options, plugins, nested includes, scripts, unexpected metadata, and mismatched commodities. Bound timeouts, retries, response and decompressed bytes, history points, unique feeds, and aggregate file-map size. Publish limits before beta and prove they fit the hosted loader's existing resource ceilings. Never run provider code or arbitrary plugins from a response.

Adding a managed include deliberately enables its price requests. Ordinary local ledgers keep working without a network dependency, and explicit offline mode never fetches. No ledger credentials, cookies, private source paths, or authorization headers are forwarded to providers or the public feed host. Operational logs minimize retention of IP and instrument combinations; product analytics count connection outcomes without collecting holdings or balances.

### 16. Which teams and product surfaces must deliver this together?

| Ownership | Required deliverable |
| --- | --- |
| TPM/product and data operations | Coverage and methodology decision, named provider/operator, rights and budget evidence, published freshness policies, incident and correction process, customer task study. |
| Backend API (`backend-v2`) | Catalog, managed data workflow, status and revision contracts, protected ledger connection/snapshot operations, and all eligible REST, GraphQL, and MCP adapters. Own scheduled ingestion and retained artifacts using the existing service infrastructure. |
| Ledger service | Safe include resolution, deterministic effective prices, price-aware valuation caching, revision propagation, completeness, and read-only source handling. Keep provider credentials and ingestion outside this package. |
| CLI | URL resolution across all load paths, refresh/offline/strict controls, source status in human and JSON output, and local snapshot/export operations. Ordinary local usage remains account-free. |
| Dashboard | Asset selection and preview, connect/disconnect, freshness and incomplete-valuation presentation, manual-source indication, snapshot review and export. |
| Mobile | Consume the same hosted valuation and source status. Existing screens must display incompleteness before connected ledgers launch; a native connection-management flow may follow. |
| IDL, documentation, and relevant ledger skills | Versioned contracts and generated clients; examples that distinguish a managed URL from an upstream-compatible local include. Update price-related skill guidance when the feature is implemented. |

Assign named accountable owners before implementation. Deliver package-scoped changes in dependency order against versioned contracts and shared conformance fixtures; do not introduce cross-package runtime imports.

Discovery, history, revisions, freshness, valuation completeness, connection management, snapshots, and export must have equivalent behavior on every eligible API surface. MCP reads can use resources; writes use tools. Preserve credential scopes, ledger permissions, limits, side effects, and failure behavior under the [required API parity workflow](../../backend-cluster/backend-v2/CLAUDE.md#required-api-parity-workflow). The public text feed is an additional representation of the same data contract, not an excuse to omit GraphQL or MCP behavior. Document the anonymous mount and its policy without widening existing credential permissions.

### 17. What is the rollout and how will we judge it?

| Stage | Observable outcome and gate |
| --- | --- |
| Qualification | Observe at least eight people across crypto, stock/ETF, mixed-portfolio, and local-CLI workflows attempting valuation with current tools. Record time, missing-price outcomes, and maintenance steps. Select providers and approve rights, costs, coverage, timing, and accountable owners. Complete the feed/resolver design before committing a release date. |
| Internal alpha | BTC/USD and ETH/USD work end to end in hosted reports and local `bea`, including history, source status, manual precedence, offline use, snapshots, and portable export. Run the acceptance cases below with synthetic data and both engines; provider outages must not prevent ordinary bookkeeping. |
| Private beta | Add the licensed stock/ETF catalog, session calendars, delayed observations, and unadjusted closes. Run a four-week cohort and source-quality observation period. Deliver eligible API parity and mobile completeness/status support before enrolling their users. |
| Public release | Publish the supported catalog and limits. Meet the usability, reliability, accounting, portability, and cost gates below. Ship compatible dashboard and CLI versions with an identifiable minimum version; older clients receive a useful compatibility path. |
| Expansion | Consider additional instruments, currencies, native mobile setup, and real-time entitlements using observed demand and costs. Re-run identity, licensing, quality, and export gates for each material expansion. |

Proposed targets, to be confirmed against the qualification baseline:

- **Activation:** At least 90% of eligible task-study participants reach a sourced valuation within 60 seconds of starting connection, without assistance. In beta, at least 99% of valid connection attempts produce a sourced value for the selected supported holding within 30 seconds of saving. Provider failures and missing prices count as unsuccessful attempts; track delivery of useful recovery guidance separately.
- **Maintenance saved:** At least an 80% reduction in manual price-maintenance actions for connected supported assets over four weeks. Measure voluntarily reported actions and aggregate product events; distinguish deliberate overrides from routine quote entry. Track weekly valuation use and four-week retention against a comparable baseline without claiming causality from an uncontrolled cohort.
- **Price reliability:** At least 99% of scheduled observation checks meet the published age/publication policy, per source and market calendar. Track stale, quarantined, missing-history, and unavailable states separately. Target 99.9% feed endpoint availability; serving stale data does not count as fresh delivery.
- **Performance and economics:** Target less than 250 ms p95 additional price-resolution latency for a warm ten-feed ledger, measured separately from engine/report time. Publish cold-load and export measurements at the supported limits. Stay within the approved spend ceiling, including anonymous downloads.
- **Accounting and reproducibility:** All mandatory acceptance fixtures pass on both engines and eligible API surfaces. Zero unexplained changes to transaction accounting or reopened snapshot values. Any confirmed wrong-asset mapping or changed immutable snapshot blocks rollout for the affected path.

Rollout controls stop new connections or provider refreshes while retaining validated caches and snapshot/export access. Disabling a feed produces an explicit source status, not a broken ledger include. Data operations must be able to quarantine an affected instrument, identify impacted revisions, publish a correction, and let customers review and export the changed valuation.

### 18. What must be demonstrated before release?

All amounts below are synthetic acceptance values. Implement executable fixtures with controlled clocks and provider responses; this document does not add those tests.

| Scenario | Required result |
| --- | --- |
| One-line setup | The exact BTCUSD include loads in compatible `bea` and hosted books, supplies the expected `price` entries, and updates valuation without editing transaction files or adding Git commits on refresh. |
| Basic valuation | The 0.5 BTC example in FAQ 5 yields 46,000 USD then 47,000 USD; units, acquisition amount, cash, and realized gains are identical across refreshes. |
| History and date boundary | An observation after the valuation date cannot value that date. A date before coverage stays unpriced. UTC midnight, exchange dates, daylight-saving changes, early closes, holidays, and an observation at the exact day boundary follow the published policy. |
| Within-day refresh and caching | New same-day data replaces the provisional effective point. Unchanged ledger SHA plus a new price revision updates the valuation. Every panel of one report uses one revision set; unchanged price bytes can still become stale. |
| Manual precedence | A same-date manual BTC/USD price wins with either include order and with an equivalent reciprocal override. A later managed date is still usable. Repeated identical includes do not multiply entries; competing managed sources cannot silently win by ordering. |
| Missing or stale data | Provider timeout, `429`, stale `200`, invalid decimal, wrong currency, and empty response preserve a valid cache with its real status. With no cache, units and accounting checks work, totals show incompleteness, and strict valuation fails. Recovery clears degradation only after validated fresh data arrives. |
| Stock split and dividend | Ten shares at 100 USD before a recorded 2-for-1 split and twenty at 50 USD afterward each value to 1,000 USD. A separately recorded dividend is not added again through an adjusted price. Missing corporate-action entries remain a visible data limitation. |
| Identity and conversion | Duplicate tickers, share classes, wrapped tokens, stablecoin depegs, ticker reuse, and retired instruments cannot be silently conflated. A supported explicit `XBT` mapping changes only the ledger symbol. A missing USD/EUR conversion leaves EUR valuation incomplete. |
| Frozen report | After a same-day change and a later provider correction, reopening a snapshot reproduces the original prices and numeric report using its pinned ledger, parameters, and engine. A new snapshot shows the revised inputs. An unavailable revision never falls back to latest. |
| Portability and CLI coverage | Exported local includes and effective prices validate and value equivalently with upstream Beancount and the hosted engine offline. Connected books remain usable for check, list, query, report, import, and write validation. Attempts to edit a virtual feed get a precise read-only error. |
| Bounded input and privacy | Disallowed origins, redirect escapes, nested includes, non-price directives, decompression overflow, oversized history, and feed-count exhaustion are rejected without partial ingestion. No ledger credentials or private ledger content leave through a price request. |
| API and client parity | The same connection, date, revision, override, permissions, failure, and completeness produce equivalent results through REST, GraphQL, and MCP. Dashboard and mobile display those states; old-client compatibility behavior is exercised. |

### 19. Which decisions remain open?

The proposal fixes the one-line interaction, accounting boundaries, explicit price identity and freshness, local override policy, snapshot requirement, and portable export. Before implementation, accountable owners must resolve:

- Which providers permit the public feed, retained snapshots, and intended use at an acceptable cost; the resulting exact stock/ETF launch list and earliest history dates.
- The final canonical instrument URL format, range/revision schema, commodity mapping syntax, and compatible CLI command/flag names. Preserve the simple BTCUSD alias throughout that design.
- Concrete response, history, concurrency, refresh, and per-ledger limits supported by measured engine and infrastructure capacity; price-data quotas must be explained separately from customer-authored transaction limits.
- The named operating owner, spending ceiling, cohort recruitment, and release schedule after qualification. Do not turn unvalidated targets into announced commitments.
