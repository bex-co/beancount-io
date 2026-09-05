# Report chart performance

The shared chart wrapper starts a dynamic client import when a chart-using route
module evaluates. Server rendering and Suspense reserve the requested dimensions;
failed downloads show the existing translated error and a reload button. Empty
series retain their existing empty state. Loading starts before the first chart
effect so above-fold charts do not wait for another hydration round trip.

## Registry inventory

`src/common/components/react-echarts/runtime.ts` registers ECharts core with:

| Registration | Consumers |
| --- | --- |
| Bar | Income statement, cash flow, overview distributions, BQL, budget |
| Line | Balance sheet, overview trends, commodity prices, BQL, budget |
| Pie | Overview distributions |
| Sankey | Overview income/expense flow |
| Treemap | Balance-sheet hierarchy |
| Grid | Category/value axes for bar and line charts |
| Tooltip | Item/axis tooltips, including cross/shadow axis pointers |
| Legend | Plain and scroll legends |
| Title | Hierarchy charts |
| DataZoomInside | Overview distribution navigation |
| LabelLayout | Label positioning |
| CanvasRenderer | All browser charts |

Other imports from `echarts` are erased TypeScript option types. The chart instance
ref uses the matching `echarts/core` type. Tests additionally register SVG solely
for headless registry checks; that renderer is absent from the production entry.
See the [ECharts selective-import documentation](https://echarts.apache.org/handbook/en/basics/import/)
when introducing another chart feature.

## Production comparison (2026-09-05)

Baseline: commit `7b7b35ed`, production build. Candidate: m22 chart changes.
Same public `open_ledger/example` ledger, Chrome 152, viewport 1280×800,
4× CPU slowdown, 40 ms latency, 10 Mbit/s download and 5 Mbit/s upload.
Each navigation used a fresh browser context with cache disabled. Public GraphQL
read responses were warmed and held in a local proxy for both versions. One
warmup plus three measured navigations per report; no authentication or user data.

| Measurement | Baseline | Candidate |
| --- | ---: | ---: |
| Chart-containing chunk, raw bytes | 1,122,615 | 638,005 |
| Chart-containing chunk, gzip bytes | 371,683 | 213,937 |
| Income statement first chart, median | 3,414 ms | 3,025 ms |
| Income statement measured range | 3,404–3,437 ms | 3,006–3,367 ms |
| Overview first chart, median | 3,823 ms | 3,374 ms |
| Overview measured range | 3,798–3,824 ms | 3,355–3,489 ms |

Chart gzip bytes fell 42.4%. First chart is measured two animation frames after
Canvas insertion, a rendering-readiness proxy rather than animation completion.
Neither candidate median regressed relative to the observed baseline range.
Small local samples do not establish production percentiles or conversion gains.

The baseline income-statement trace downloaded `index-DnCbAyih.js` from 68–2,813 ms.
The candidate downloaded the separate `client-CDWydkMj.js` from 2,198–2,765 ms;
its manifest marks the client as a dynamic entry. Login downloaded no chart client.
The local server sent uncompressed assets, so network body sizes are raw bytes;
gzip sizes above are computed from production files with Node's `gzipSync` at level 9.

To reproduce, build both revisions with `yarn build`, serve their `.output`
directories with `yarn start`, and use the same API responses and browser settings.
Record the Network panel JS requests and first Canvas insertion for
`/ledger/open_ledger/example/income-statement` and `/ledger/open_ledger/example/`.
Use `.output/public/.vite/manifest.json` to identify the client dynamic entry,
then gzip its referenced file. Keep the baseline build before rebuilding the
candidate. Follow [the locale measurement guide](./performance-locales.md) for
shared setup and compare samples under the same conditions.

## Lifecycle evidence and regression checks

Instrumented client execution showed `init → setOption → setOption` on the
baseline mount. The candidate produces `init → setOption`; subsequent option
changes update the same instance. Theme recreation applies the current option
and loading state once. Resize listeners and disposal remain intact. No broad
memoization or speculative remount changes are included.

Adjacent tests exercise all five real chart registrations, zoom and legend
actions, dimensions while loading, refs, empty state, download failure feedback,
option updates, theme recreation, loading, resize, and cleanup. Browser checks
exercise report Canvas rendering, hover tooltips, resize, dark theme, failed-chunk
reload recovery, and CSV/Markdown/print
exports for income statement, balance sheet, and cash flow. Statement export
content remains covered by the existing report suite.

Run from `dashboard/`:

```sh
yarn vitest run src/common/components/react-echarts/__tests__
yarn format:check
yarn lint
yarn test
yarn build
yarn perf:locales
```
