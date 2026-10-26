# Shared Time edits reset report interval choices

**Severity:** minor. **Owner:** dashboard. Production `https://beancount.io`,2026-10-25; owned isolated headless Chromium156.0.8078.47, anonymous public synthetic `open_ledger/example`, English/light/UTC. All eight fresh report/viewport cases reproduce at natural latency, without modeled report responses, failed reads or delayed scripts.

## Reproduce

Open one of these report views with Time2016-04:

| Page | Route after `/ledger/open_ledger/example` | Chosen view |
| --- | --- | --- |
| Account | `/account/Liabilities%3AUS%3AChase%3ASlate?time=2016-04&account=Expenses%3AFood&filter=payee%3A%22E%5B.%5DB%5B.%5D%27s+Beer+and+Wine%22&view=changesOverTime` | Changes Over Time |
| Balance Sheet | `/balance-sheet?time=2016-04&view=assets` | Assets |
| Income Statement | `/income-statement?time=2016-04&view=expenses` | Expenses |
| Cash Flow | `/cash-flow?time=2016-04&view=byActivity` | By Activity |

1. Choose **Weekly** using **Select time period**. The selector shows Weekly and a genuine report read requests `interval: weekly` for2016-04.
2. Edit the shared **Time** field to **2016** and Tab to apply. At390px use the actual Filters sheet, close the account suggestion popup and then the sheet normally.
3. After the healthy scoped read settles, the selected chart view is retained, but the interval has become **Monthly**. The new report request sends `interval: monthly,time: 2016`, although the reader never selected Monthly. The previous interval-control node is disconnected.
4. Reselect Weekly. It works immediately and requests the correct weekly2016 report. Change Time back to2016-04: Monthly returns again. This repeats independently on all four pages at both widths, yielding16 observed unrequested resets.

The Account example makes the regrouping concrete. Weekly April has five calendar rows, with two nonzero movements **−26.13 USD** and **−8.76 USD**. After the Time edit it shows12 monthly rows and one **−34.89 USD** April movement. Explicitly restoring Weekly for2016 produces53 weekly/partial-week rows, with the same two nonzero movements. Independent Decimal/ISO-calendar checks against the four actual journal entries confirm all values and dates. The arithmetic is correct for each requested interval; the defect is the unrequested change of granularity.

Working controls: all initial Weekly selections and all eight manual Weekly recoveries succeed. On Account, changing only Changes Over Time→Account Balance keeps Weekly, while the two Time edits reset it. Existing URL-backed chart views remain selected in every case. All26 matching observed report reads are HTTP200 without GraphQL errors; retained cases have zero page/console errors, hosted writes or mutation attempts.

## Cause and bounded repair

Four page owners initialize `timeInterval` with local useState and their Monthly query default:

- `features/reports/account/index.tsx:404–406`
- `features/reports/balance-sheet/index.tsx:49–51`
- `features/reports/income-statement/index.tsx:55–57`
- `features/reports/cash-flow/index.tsx:66–68`

Paths above are under `dashboard/src/`. `common/components/ledger-layout/index.tsx:51–81` detects a changed shared account/filter/time scope;:180–193 intentionally replaces Outlet with ReportLoadingState. That destroys these page-owned interval values. The newly mounted page initializes Monthly, so both the selector and query change. Native node-disconnection controls corroborate the remount. The URL-backed selected view survives the same boundary.

Keep the interval in validated page-scoped state that survives this boundary, following the established URL preference contract. Keep Monthly as the default and omit the default param; preserve valid explicit selections through period/account/expression edits and bookmarks/reload. Retain supported enum/fallback behavior and existing view/mode/offset/shared search fields. Keep the preference scoped to its report/ledger, with no global cookie/localStorage store.

Wire client queries and server reads coherently: Balance Sheet and Income Statement loaders currently hardcode their defaults at `loader.ts:21`; Cash Flow does so at `loader.ts:59`. A new explicit interval must reach those prefetch variables as well as the page query, avoiding initial server/client disagreement or a monthly result beneath a Weekly label. Preserve the outer pending guard, settled-data protections, scoped retry, conversion, legend choices, exports and Account journal state. No API, backend or dependency change is needed.

All production IntervalSelect consumers were audited. The four page owners above supply their values; statement content components render the passed controls, and Cash Flow also renders a control in its read-error branch. The select itself is controlled and correctly emits Weekly. Trial Balance has no such interval selector; no new interval control is requested there.

## Dedupe and policy

All5,729 board markdowns across queues/states/tombstones and7 open milestone READMEs checked at fetched main **28fe6fb116211b6489a07c8ee50249b263baf67a**, with targeted page/layout history. [142](../done/142.md) explicitly decided chart choice is a view preference that outlives a shared-scope edit. [174](../done/174.md) repaired Account's view but explicitly left interval preference policy unverified. This new independent evidence covers that missing choice on Account and the three interval-bearing statements. Keep those actual view repairs closed; record one interval-consumer residual of their family, not four historical finding groups.

[998](../done/998.md) handles bar mode, [M16](../done/m16/README.md) inner report-read view lifetime, [M51](../done/m51/README.md) legend selection, and1024/1025 sibling legend owners. [099](../done/099.md) protects Account pending interval/conversion data. None retains the interval across the outer scope remount. Existing honest pending behavior remains required. No interval-retention correction appears in the targeted histories through this fetched main.

## Deployed source and evidence

Actual loaded route maps and observed parent-route maps contain complete modules identical to both local source and fetched main:

| Module under `dashboard/src/` | SHA-256 |
| --- | --- |
| `features/reports/account/index.tsx` | `3a14195cbe47a395fdf2e42b0efdf2bd5c8fffa5be8aae63792110d9782b335c` |
| `features/reports/balance-sheet/index.tsx` | `7310affd5638a9fe37bcc9ca5c1ba299c93aeea37cefad675cf0daeca835c22b` |
| `features/reports/income-statement/index.tsx` | `0d76ee8bc938998f787cedbd4ca0056e411ca9c83cb32097fe46ab0ecdf40694` |
| `features/reports/cash-flow/index.tsx` | `868f00097abb168b06e1bb4ce37d1e20b3eee27148549e52d60cfd288a9bac8e` |
| `common/components/ledger-layout/index.tsx` | `8332445d5403e82d59cccf1d27a854a59577904e0b051d956ceeab7eea05f2c2` |

This needs implementation; whole deployed revision is unverified. Ignored evidence under `dashboard/tmp/qa-20261020/dashboard-loop/`: `report-interval-scope-{independent-control,source-audit,served-source,fresh-dedupe}` records, retained `credit-interval-scope-{1440,390-complete}-control.json`, six `statement-interval-scope-<report>-<width>-control.json` cases, native helpers and screenshots. Account and Income Statement390 screenshots were visually inspected; the first shows the monthly period table, the second the Monthly control and retained Expenses view.

All eight retained contexts, one preliminary narrow Account observer and one anonymous source context close, leaving the original root. The preliminary observer looked for a desktop tab rather than the actual narrow View combobox and is excluded; the completed narrow repeat supplies the evidence. Other locales/engines, physical screen readers, shared account/expression edits, other interval choices and repaired behavior remain unverified. No product implementation or formal test was authored by QA.
