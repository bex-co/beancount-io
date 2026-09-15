# w3 · m38 — Give Accounts and Budget the head metadata every other ledger route has

**Worker:** worker3 **Goal:** every ledger route names itself in the tab, in history, to a screen reader, and to a crawler **Status:** done

Severity: **minor** (breadth, not data). Package: dashboard. Two of the twenty-one ledger routes emit **no head block at all** — no title, no description, no `og:title`, no canonical. On a public ledger they are indexable pages whose only title is the site name.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Add Accounts and Budget SEO strings to all 15 locales | 45m | — | — **DONE**
| t002 | Wire the head metadata into both route files | 20m | t001 | — **DONE**
| t003 | Verify the ledger-route metadata adoption surface | 15m | t002 | — **DONE**
| t004 | Simplify the route head wiring | 10m | t003 | — **DONE**
| t005 | Test that every ledger route emits head metadata | 40m | t003 | — **DONE**
| t006 | Close and archive the route metadata milestone | 10m | t004, t005 | — **DONE**

Implementation totals 65 minutes; all six tasks total 140 minutes. Thirty locale entries across fifteen files plus a route-coverage regression test put this past a sub-hour edit.

## Reproduction and evidence

Production https://beancount.io, 2026-09-12, isolated headless Chrome (Playwright MCP `--headless --isolated`), English/light, 1440×1000. Authenticated QA account on its own synthetic `example` ledger **and** the anonymous-readable public `open_ledger/example`. Local/fetched main `84231f9c`; deployed SHA unverified. Read-only.

Load each ledger route and read `document.title` after the page settles. Nineteen of twenty-one routes name themselves — `Overview - example`, `Journal - example`, `Balance Sheet - example`, `Holdings - example`, `Statistics - example`, `BQL Query - example`, `Smart Import - example`, `Ledger Settings - example`, `Files - example`, `Assets:US:Vanguard:RGAGX - example`, `Commit c010cc9 - example`, and so on. Two do not:

| route | title | description | og:title | canonical |
| --- | --- | --- | --- | --- |
| `/ledger/<owner>/<ledger>/accounts` | `Beancount.io` | absent | absent | absent |
| `/ledger/<owner>/<ledger>/budget` | `Beancount.io` | absent | absent | absent |
| `/ledger/<owner>/<ledger>/holdings` (control) | `Holdings - example` | present | present | present |

The same two routes behave identically on the public `open_ledger/example` ledger, where `/journal` and `/statistics` both carry a title, a description and a canonical. So these are two publicly reachable pages entering search with the site name as their only title, no description, and no canonical URL.

Verified evidence under `dashboard/tmp/qa-20260912/route-head-metadata.json` (gitignored, local only): the full route→title sweep, the four head tags per route, and the public-ledger repeat.

## Root cause and repair boundary

- `dashboard/src/routes/ledger.$ledgerOwner.$ledgerName.accounts.tsx` and `dashboard/src/routes/ledger.$ledgerOwner.$ledgerName.budget.tsx` declare only `component` (and, for accounts, `validateSearch`). Neither has a `head:` property.
- Every sibling route has one. The established shape is `ledger.$ledgerOwner.$ledgerName.holdings.tsx:11-20`: `head: ({ params, match }) => createHeadMeta(match.context.localization.i18n, getSEOMetadata(match.context.localization.i18n, "seo.ledgerHoldings.title", "seo.ledgerHoldings.description", { ledgerName: params.ledgerName }))`.
- The strings do not exist yet: `src/i18n/locales/seo/en.ts` has `seo.ledgerHoldings.title` / `.description` (`:157`, `:162`) but no `seo.ledgerAccounts.*` or `seo.ledgerBudget.*`. `dashboard/CLAUDE.md` requires every new key in the English feature locale **and** matching keys in the other 14 locales, and `src/test/translations.test.ts` checks locale shape — so both keys land in all 15 files.

Follow the existing helper exactly; do not introduce a new metadata mechanism, a per-route fallback in the root route, or a dependency. Keep the change inside `dashboard`.

**Interaction with completed [w2/m8](../../w2/done/m8/README.md)** (public-ledger index hygiene): that milestone's `robots`/`noindex` policy is applied *through* `createHeadMeta`, so a route with no head block cannot express a robots decision at all. Adding the head to these two routes means their indexability becomes explicit for the first time. m8's audit lists neither route. Decide each deliberately against m8's stated policy and record the decision in t003 — a ledger's account list and budget are ordinary public reads on a public ledger, like `/journal` and `/statistics`, which m8 left indexable. Do not silently flip any other route's robots value.

## Definition of done

- `/ledger/<owner>/<ledger>/accounts` and `/budget` each emit a localized title naming the page and the ledger, a description, an `og:title`, and a canonical URL, in the same shape as `/holdings`.
- The behavior holds on both a private authenticated ledger and the public `open_ledger/example`.
- `seo.ledgerAccounts.title` / `.description` and `seo.ledgerBudget.title` / `.description` exist in all 15 locale files and `src/test/translations.test.ts` passes.
- Switching the app language changes both titles, as it does for `/holdings`.
- A regression test enumerates the ledger routes and asserts none is missing head metadata, so the twenty-second route cannot ship without it.
- The robots/indexability decision for both routes is explicit and consistent with w2/m8's policy; no other route's robots value changes.
- `yarn format:check && yarn lint && yarn test && yarn build` pass in `dashboard/`.

## Dedupe and limits

All open and `done/` queues searched for SEO, page title, document title, canonical, `createHeadMeta` and `getSEOMetadata`. Completed [w2/m8](../../w2/done/m8/README.md) added `robots`/`noindex` support to the SEO helpers and audited which surfaces should be indexed; it never added head metadata to these two routes and its audit does not list them — this is an adjacent gap, coordinated above, not a reopen. `w4/m8` and `w4/m10` concern mobile store listings and the root README quality bar. Completed `172` mentions an SEO commit only inside its own file-history trace, for an unrelated auth component. No item owns dashboard route head coverage.

Unverified: the remaining locales' copy quality, social-card rendering, actual crawler behavior, and the patched behavior. Only titles and the four head tags were measured.

## Source + Goal linkage

- **Source:** continuous dashboard QA, 2026-09-12 — a route→title sweep across all ledger routes; evidence in `dashboard/tmp/qa-20260912/route-head-metadata.json`.
- **Goal linkage:** **A3 — Community & distribution**: two publicly reachable ledger pages currently offer a crawler nothing but the site name, and offer a reader nothing but "Beancount.io" in the tab, in history, and in a screen reader's page announcement.
- **Expected outcome:** every ledger route is identifiable in a tab strip, a history list, a bookmark, a screen reader and a search result — and a route-coverage test keeps it that way as routes are added.
- **Why now:** the helper, the pattern and the locale infrastructure all already exist; this is the cheapest remaining gap in a surface w2/m8 already invested in. Adoption surface is included because these are user- and crawler-facing pages.

## Robots decision

Accounts and Budget are **indexable** (default `createHeadMeta` / `LedgerPageSEO` without `noIndex`), matching w2/m8 ordinary public ledger reads. Budget was added to the indexability comment alongside accounts.
