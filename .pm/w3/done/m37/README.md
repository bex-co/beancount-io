# w3 · m37 — Render BQL inventory results as amounts, not raw JSON

**Worker:** worker3 **Goal:** a BQL result column of ledger positions reads as amounts on screen and in its CSV export **Status:** done

Severity: **major**. Package: dashboard. The Query page is the ledger's general-purpose analysis surface; its most common aggregate (`sum(position)`) is currently unreadable. A working control for the identical payload already exists inside the same package (Holdings), so this is a wiring and placement problem, not a new formatting design.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Move the inventory cell formatter into shared common code | 30m | — | — **DONE**
| t002 | Render BQL result inventory cells as amounts | 30m | t001 | — **DONE**
| t003 | Export BQL inventory cells as amounts in CSV | 30m | t001 | — **DONE**
| t004 | Verify the query-result adoption surface | 15m | t002, t003 | — **DONE**
| t005 | Simplify the shared cell-formatting changes | 15m | t004 | — **DONE**
| t006 | Test inventory cells across renderer, export and edge shapes | 45m | t004 | — **DONE**
| t007 | Close and archive the BQL inventory rendering milestone | 10m | t005, t006 | — **DONE**

Implementation totals 90 minutes; all seven tasks total 175 minutes. Two consumers plus a cross-feature move of the formatter make this more than a sub-hour edit.

## Reproduction and evidence

Production https://beancount.io, 2026-09-12, isolated headless Chrome (Playwright MCP `--headless --isolated`), English/light, authenticated QA account on its own synthetic `example` ledger, 1440×1000. Local/fetched main `84231f9c`; deployed SHA unverified. Read-only — no ledger write, and the query is a `SELECT`.

Open `/ledger/<owner>/example/query?query=SELECT%20account%2C%20sum(position)%20AS%20total%20WHERE%20year%20%3D%202017%20GROUP%20BY%20account%20ORDER%20BY%20account%20LIMIT%205` and press **Execute Query**. The `total` column renders, verbatim:

```
Assets:US:BofA:Checking   {"USD":"-3623.17"}
Assets:US:ETrade:Cash     {"USD":"469.61"}
Assets:US:ETrade:GLD      {}
Assets:US:ETrade:ITOT     {"ITOT":"9"}
Assets:US:ETrade:VEA      {}
```

**Download CSV** on that same result writes the same JSON into the spreadsheet:

```csv
account,total
Assets:US:BofA:Checking,"{""USD"":""-3623.17""}"
Assets:US:ETrade:GLD,{}
```

API control — `POST /api-gateway/v1/ledgers/<owner>/example/query` with `accept: application/json` returns HTTP 200 and declares the column `{"name":"total","dtype":"Inventory"}` with cells `{"USD":"-3623.17"}`, `{}`, `{"ITOT":"9"}`. The identical request with `accept: text/plain` returns HTTP 200 and the shell table `-3623.17 USD`, `469.61 USD`, `9 ITOT`. The data and its unit are present in both representations; only the browser table and its export fail to use them.

Working control in the same package: the Holdings page consumes the identical `{currency: number}` cells from the same `QueryShell` operation and renders `5317.06 USD`, `2 GLD`, `18 ITOT`; its Export CSV writes `5317.06 USD`. Same session, same ledger.

The empty `{}` cells are **not** part of this defect's cause. `backend-cluster/ledger/src/features/ledger/service/ledger-shell-mappers.ts:34-57` documents that dropping a zero-net balance is a deliberate port of fava's `SimpleCounterInventory`/`simple_units`. Do not change that serialization, and do not treat fava parity as a bug. A zero-net inventory must simply render as an empty cell rather than the literal characters `{}`.

Verified evidence under `dashboard/tmp/qa-20260912/` (gitignored, local only): `bql-inventory.json` (rendered column, JSON API rows, text-shell control, Holdings control) and `bql-inventory-export.csv` (the downloaded export).

### Affected column types (added by the 2026-09-13 sweep)

Same production ledger, authenticated, one `queryShell` call per probe. The first row of each result, with the column type the server declared:

| Probe | `dtype` | Cell the API returns | Renders as |
| --- | --- | --- | --- |
| `sum(position)` | `Inventory` | `{"USD":"2754.06"}` | `{"USD":"2754.06"}` ❌ |
| `cost(position)` | `Amount` | `{"USD":"3490.52"}` | `{"USD":"3490.52"}` ❌ |
| `units(position)` | `Amount` | `{"USD":"3490.52"}` | `{"USD":"3490.52"}` ❌ |
| `position` | `Position` | `"3490.52 USD"` | `3490.52 USD` ✅ |
| `number` | `Decimal` | `"3490.52"` | `3490.52` ✅ |

Two consequences for this milestone's scope:

- **`Amount` must be in scope.** `cost(position)` and `units(position)` are book-value and quantity — the two aggregates a holdings or cost-basis question reaches for — and both are broken exactly like `Inventory`. A fix keyed on `dtype === "Inventory"` alone leaves them rendering JSON. On-screen reproduction: `?query=SELECT%20account%2C%20cost(position)%20AS%20book_value%2C%20units(position)%20AS%20qty%20LIMIT%203` renders `{"USD":"3490.52"}` in both columns.
- **`Position` is resolved and is NOT affected**, closing this milestone's stated unknown. The server already serializes it to the display string `"3490.52 USD"`, so it never reaches the object branch. Formatting it would be a regression.

Trap for t002/t006: `dashboard/src/features/bql/components/__tests__/query-result-card.test.tsx:422-443` (`"should render object cells as JSON"`) currently **asserts** the broken output, so it must be replaced rather than kept green. Its fixture is `{ dtype: "Position", rows: [[{ number: 100, currency: "USD" }]] }` — a shape production never returns for `Position` (see the table above). Do not treat that fixture as evidence of a real payload shape.

## Root cause and repair boundary

- `dashboard/src/features/bql/components/query-result-card.tsx:128-130` renders every cell with `typeof cell === "object" && cell !== null ? JSON.stringify(cell) : String(cell ?? "")`. It never consults `result.table.types[i].dtype`, so every object-valued column is stringified.
- **Which dtypes are actually affected** (probed live 2026-09-13, same ledger, via `queryShell`; see "Affected column types" below): `Inventory` and `Amount` return objects and are broken; `Position`, `Decimal` and `str` already arrive as display strings and must not be touched.
- `dashboard/src/common/lib/export/csv.ts:32` applies the same `typeof value === "object" ? JSON.stringify(value) : String(value)` rule, which is why the export matches the screen.
- The correct rendering already exists in this package but in another feature: `dashboard/src/features/ledger-data/holdings/holdings-table.tsx:31-42` (`renderObject`, one `<number> <currency>` line per entry, via `formatNumber`) and `dashboard/src/features/ledger-data/holdings/utils.ts:1-8` (`csvObjectToString`, `"<number> <currency>"` joined by CRLF). `dashboard/CLAUDE.md` forbids one feature importing another feature's private helper, so the shared formatter has to move to `src/common/` and both features must consume it from there.
- Untouched since the dashboard import: `git log -S "JSON.stringify(cell)" -- dashboard/src/features/bql` returns only `af5339de`.

Keep the change inside `dashboard`. No API, GraphQL schema, REST contract, ledger-service or dependency change is needed or permitted here — the payload already carries everything required.

## Definition of done

- The reproduced query's `total` column renders `-3623.17 USD`, `469.61 USD` and `9 ITOT`, with the two zero-net rows as empty cells rather than `{}`.
- **Download CSV** for that same result writes those same amount strings, and a spreadsheet reader can sort and read the column.
- A multi-currency inventory cell (more than one key) renders every unit, and the CSV keeps every unit in one cell without breaking row structure or quoting.
- An `Amount` column renders and exports as an amount too: `SELECT account, cost(position) AS book_value, units(position) AS qty LIMIT 3` shows `3490.52 USD` in both columns on screen and in its CSV.
- Non-object cells — `str`, `Decimal`, `date`, `int`, `bool`, `null` — render and export exactly as they do today; the `Decimal` control `SELECT account, sum(number) …` is unchanged. A `Position` column keeps the server's own `3490.52 USD` string untouched.
- The Holdings table and its Export CSV are byte-identical to today's output after the formatter moves to `src/common/`, and no feature imports another feature's private helper.
- Column alignment, virtualization, row counts and the accessible table semantics shipped by [m28](../done/m28/README.md) still hold at 1440 and 390 widths.
- `yarn format:check && yarn lint && yarn test && yarn build` pass in `dashboard/`.

## Dedupe and limits

All open and `done/` queues searched for query-result, `Download CSV`, `renderObject`, `csvObjectToString`, inventory and JSON-cell terms. Completed [m28](../done/m28/README.md) repaired *layout and table semantics* of this same renderer (header/value alignment, virtual row indexes) and explicitly excluded query/data changes — it never touched cell value formatting, so this is not a reopen. Open [157](../157.md) is the ledger service's error *classification* for out-of-range integer results, a different package and a different failure. Completed `m18`/[113](../113.md) concern lot reductions against market prices in the engine, not display. `git log -S` shows no later fix on fetched main; this is not deployment lag.

Unverified: other locales, other ledgers, the chart view of a query result, and the patched behavior. `Position`-typed columns are no longer unverified — the 2026-09-13 sweep reproduced them live and found them unaffected (see "Affected column types").

Re-confirmed on production 2026-09-13 (authenticated, same `example` ledger, headless isolated Chromium 1440×1000): the defect is still live, still renders `{"USD":"5317.06"}` on screen, and **Download CSV** still writes `"{""USD"":""5317.06""}"`. Evidence `dashboard/tmp/qa-20260913/bql-inventory.csv` (gitignored, local only). That sweep also widened the scope to `Amount` and resolved the `Position` question above.

## Source + Goal linkage

- **Source:** continuous dashboard QA, 2026-09-12 — the query journey; evidence in `dashboard/tmp/qa-20260912/`.
- **Goal linkage:** **A1 — Agent-native accounting**: `sum(position)` is the standard BQL aggregate an agent or analyst reaches for, and both the on-screen table and the CSV it hands back must be readable ledger amounts rather than serialized objects.
- **Expected outcome:** a reader running the most common BQL aggregate on the Query page gets amounts they can read and export, matching what the text shell and the Holdings page already show for the same data.
- **Why now:** the correct formatter already exists one feature away, the payload already declares the column type, and the defect currently reaches both the primary analysis surface and its export. Adoption surface is included because the Query page is a user- and agent-facing surface.
