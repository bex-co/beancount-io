# w3 · m40 — Make the account journal's "Units" column mean units

**Worker:** worker3 **Goal:** every column in the account journal shows what its header says, and its values stay attached to their headers **Status:** done

Severity: **major** (mislabelled financial data on the account detail page). Package: dashboard. The column headed **Units** renders the entry's *posting count*. The account's actual unit amounts are never shown anywhere on the page.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Decide and implement what the fourth account-journal column shows | 45m | — | — **DONE**
| t002 | Expose the journal list as a table with real column headers | 45m | t001 | — **DONE**
| t003 | Verify the account journal adoption surface | 15m | t002 | — **DONE**
| t004 | Simplify the journal table column wiring | 15m | t003 | — **DONE**
| t005 | Test column-to-header alignment on both journal consumers | 45m | t003 | — **DONE**
| t006 | Close and archive the account journal column milestone | 10m | t004, t005 | — **DONE**

Implementation totals 90 minutes; all six tasks total 175 minutes. Two consumers of one shared table, a data-source decision, and table semantics put this well past a sub-hour edit.

## Reproduction and evidence

Production https://beancount.io, 2026-09-12, isolated headless Chrome (Playwright MCP `--headless --isolated`), English/light, 1440×1000, authenticated QA account on its own synthetic `example` ledger. Local/fetched main `84231f9c`; deployed SHA unverified. Read-only.

Open `/ledger/<owner>/example/account/Assets%3AUS%3AETrade%3AGLD?time=2017`. The Account Journal table renders six columns:

| Date | F | Payee/Narration | **Units** | Change | Balance |
| --- | --- | --- | --- | --- | --- |
| 2017-08-27 | `*` | Buy shares of GLD | **`› 3`** | 2433.36 USD | 4559.80 USD |
| 2017-03-19 | `*` | Buy shares of GLD | **`› 3`** | 557.98 USD | 2126.44 USD |
| 2017-02-15 | `*` | Sell shares of GLD | **`› 4`** | -2090.00 USD | 1568.46 USD |

The value under **Units** is the entry's posting-count disclosure control, not units. This is a GLD account; the row's actual unit amount (the GLD quantity bought or sold) appears nowhere on the page. A reader scanning the column reads "Units 3" for a purchase of a different quantity entirely.

Second defect, same table: the accessibility tree exposes **no** `table`, `rowgroup`, `row`, `cell` or `columnheader` anywhere in the list. The six headers are plain generics, and each entry is one flat button whose accessible name concatenates the columns — `button "2017-08-27 * Buy shares of GLD Toggle postings 2433.36 USD 4559.80 USD"`. Two bare amounts arrive in sequence with nothing tying them to Change and Balance, so a screen-reader user cannot tell which is which. The plain `/journal` page shares the renderer and has the same missing semantics with its four columns (`Date`, `F`, `Payee/Narration`, `Postings`), though its headers are at least accurate.

Verified evidence under `dashboard/tmp/qa-20260912/` (gitignored, local only): `account-journal-units-column.json` and `account-journal-columns.png`.

## Root cause and repair boundary

- `dashboard/src/features/journal/components/journal-table.tsx:103-117` — in the `isAccountJournal` branch the header emits three desktop columns: `journal.unitsHeader` ("Units"), `journal.change`, `journal.balanceHeader`.
- `journal-table.tsx:252-270` — the matching body branch emits, in the same three slots: the `JournalPostingToggle`, `JournalAmounts balance={item.change}`, `JournalAmounts balance={item.balance}`. Slots 5 and 6 line up; slot 4 does not.
- The data does not exist in the item type: `JournalTableItem` (`journal-table.tsx:20-23`) is `{ directive, change?, balance? }` with no `units`. `features/reports/account/index.tsx:237-238` maps only `change` and `balance`, and the query `features/reports/account/graphql/account.graphql` requests `items { entry change balance }`. So the Units header has never had a source.
- The header row and both body branches are plain `div`/`span` markup; nothing emits table roles.
- Two production consumers share this component: `features/journal/pages/journal-page.tsx:15` (the `/journal` page) and `features/reports/account/index.tsx:31` (the account detail page). Any change must hold for both, including the narrow-viewport branches (`sm:hidden` / `sm:block`) that each render their own postings toggle.

Keep the change inside `dashboard`. The per-posting units for the displayed account are derivable client-side from the `entry` already in the payload, so **prefer that over widening the API**; adding a field to `getLedgerAccountJournal` would be a cross-package API-contract change and needs its own decision under the repo's REST/GraphQL/MCP parity rule. Relabelling the column is the acceptable cheaper alternative — what is not acceptable is a header that describes a different column.

## Definition of done

- No column header in either journal describes something other than the values beneath it, at 1440 and 390.
- The fourth account-journal column either shows the account's unit amount for the entry, or is labelled for what it actually contains — decided deliberately in t001 and recorded.
- If units are shown: multi-unit and zero cases render honestly, and non-transaction rows (Balance, Note, Pad, Price, Document, Custom) do not invent a value.
- The postings disclosure stays reachable and operable by keyboard in both journals, at both widths, and keeps its accessible name.
- Both journals expose a table with column headers and per-row cells, so each amount is announced with its column; the flag column has an accessible name rather than the bare letter `F`.
- `/journal` keeps its existing four columns and behavior; filters, pagination and the entry dialog are unchanged.
- `yarn format:check && yarn lint && yarn test && yarn build` pass in `dashboard/`.

## Dedupe and limits

All open and `done/` queues searched for `unitsHeader`, journal-table, account journal and column terms. Open [m30](../m30/README.md) is the account journal's *filter* application (which entries are returned) — a different layer of the same page; coordinate edits to `features/reports/account/index.tsx` without folding either into the other. Completed `m13` also concerned account journal filters. Completed [m28](../done/m28/README.md) fixed exactly this class — values disconnected from their columns — for the **BQL result table**, a different renderer; reuse its approach where it fits. Completed [m25](../done/m25/README.md) gave **Accounts and Holdings** table structure while keeping row actions usable, and is the closest precedent for keeping the postings toggle operable inside a real table. Open [m32](../m32/README.md) is the **statement hierarchy** tables. Note [189](../189.md) is a mobile rounding difference in the account journal, a different package and a different defect. None owns this column mismatch.

Unverified: other locales, other account types (only a commodity-holding asset account was exercised), a real screen reader, and the patched behavior.

## Source + Goal linkage

- **Source:** continuous dashboard QA, 2026-09-12 — the accounts journey; evidence in `dashboard/tmp/qa-20260912/`.
- **Goal linkage:** **A1 — Agent-native accounting**: the account detail page is where a reader or agent checks an account's activity, and a column headed "Units" that prints a posting count makes that page untrustworthy for the one thing it exists to do.
- **Expected outcome:** a reader — by eye or by screen reader — can read each account-journal row and know what every number means.
- **Why now:** the mislabelling is on the page most used to verify a single account, the data needed is already in the payload, and m28 already established the pattern for reconnecting values to columns. Adoption surface is included because this is user-facing on every account page.
