# w3 · m22 — Localize relative timestamps and date calendars

**Worker:** worker3 **Goal:** relative timestamps and date-calendar text follow the active application language **Status:** todo

## Tasks (in order)

| id   | title                                                                     | est | depends_on       |
| ---- | ------------------------------------------------------------------------- | --- | ---------------- |
| t001 | Provide date locales and relative-time formatting for the active language | 55m | —                |
| t002 | Localize profile and commit timestamps                                    | 30m | t001             |
| t003 | Localize feed, ledger-row and bank-sync timestamps                        | 25m | t001             |
| t008 | Apply the active locale to calendar dates and controls                    | 35m | t001             |
| t004 | Adoption surface — verify localized dates and calendars                   | 20m | t002, t003, t008 |
| t005 | Simplify the formatting changes                                           | 20m | t004             |
| t006 | Test language transitions, isolation and browser behavior                 | 50m | t004, t005       |
| t007 | Close out the verified localization repair                                | 15m | t006             |

Eight tasks, 250 minutes total; 145 minutes of implementation. This exceeds
a sub-hour note because one formatter must support fifteen languages without
undoing lazy loading or SSR isolation, then cover seven relative-time consumers
and the common calendar. The calendar evidence extends this locale-integration
group instead of creating a second competing locale loader.

## Reproduced finding

Severity: **minor**. Package: **dashboard**. Production
`https://beancount.io`, 2026-09-08, Chrome 152, light, browser locale zh-CN.
Fresh 1440×1000 and 390×844 contexts. Local HEAD `a315c273`, fetched main
`cc3f4c2f`; implicated sources are unchanged there. Deployed SHA unverified.

1. As a guest open `/ledger/open_ledger?lang=zh`. The document language is zh,
   the collection heading is **账簿**, and its count is **显示 43 本账簿中的 12 本**.
2. Its first public ledger card displays **已更新 6 days ago**. The joined date
   is correctly rendered as **2025年12月**. Both fresh widths reproduce this.
3. Open the same profile with `?lang=en`: it renders **Updated 6 days ago**
   and English count labels, with the identical underlying timestamp.
4. With the QA session, open
   `/ledger/open_ledger/budgeting-envelopes/commits?lang=zh`. The history route
   selects a commit automatically. Both the list entry and detail metadata
   display **25 days ago** while the document language remains zh.
5. The exercised commit is `7442e53b0b8541117539b4df6f0e3408af3910d0`.
   Its keyboard-focusable exact-time tooltip correctly displays
   **2026年8月14日 GMT-7 19:40:27** in this matching browser/application locale.
   Desktop and narrow repeats agree.

The relative phrases are generated UI, not untranslated user-authored ledger
descriptions or commit messages. The installed Chinese date-fns locale produces
**6 天前** and **25 天前** for these durations.

## Data and source trace

- Public profile GraphQL and REST return Dell's exact
  `2026-09-02T07:23:14.000Z`; it matches the card's datetime attribute.
  The profile producer maps `repo.updated_at` to a Date in
  `backend-cluster/backend-v2/src/features/gitea/user-profile/service/user-profile-service.ts:496–504`.
- Commit list/detail GraphQL and REST all return the exact author date
  `2026-08-14T19:40:27-07:00`, matching both rendered datetime attributes.
  The producer preserves that upstream string in
  `features/gitea/commits/service/commits-service.ts:163–167` and lines270–274.
  All API controls return HTTP200 with no GraphQL errors. No API repair
  is indicated; live MCP was not exercised.
- Seven dashboard files call `formatDistanceToNow` with `addSuffix` but no
  locale. There is no application call to date-fns `setDefaultOptions`.
  Profile strings use reactive i18n, but this separate formatter does not.
- The lockfile pins date-fns4.1.0. Its `formatDistanceToNow.js:91` forwards
  options to `formatDistance.js:94`, which falls back to the default locale;
  `_lib/defaultLocale.js:1` identifies that default as enUS. The downloaded
  tarball matches npm registry integrity; its existing zh-CN formatter was
  executed directly for the two Chinese controls.

| Consumer                                                                         | Relative field and scope                                                                         |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `features/user-profile/components/repository-list-item.tsx:72`                   | Updated time; LedgerCollection and Starred cards. Collection live-proven, Starred source-traced. |
| `features/user-profile/components/profile-activity.tsx:119`                      | Recent activity; same profile page, source-traced.                                               |
| `features/git/commits/components/commit-list-item.tsx:83`                        | Commit history list, live-proven.                                                                |
| `features/git/commits/components/commit-metadata.tsx:36`                         | Commit detail metadata, live-proven.                                                             |
| `features/ledger-list/components/feed-card.tsx:33`                               | Ledger activity and blog feed cards, source-traced.                                              |
| `features/ledger-list/pages/dashboard-page/components/dashboard-sidebar.tsx:142` | Ledger-row updated time, source-traced.                                                          |
| `features/plaid/pages/plaid-connections/components/bank-item.tsx:155`            | Last bank sync, source-traced; no bank connection was opened or changed.                         |

## Repair and definition of done

Use the existing date-fns dependency with an explicit locale derived from the
active application language. Share the resolution/formatting through dashboard
common infrastructure and update the seven callers. Respect the fifteen-language
catalog and the existing per-router/per-SSR-request localization in
`src/i18n/init.ts`. Do not use mutable global date-fns defaults or eagerly
import every locale into the initial bundle.

For the calendar, reuse the active-language resolution while retaining the
DayPicker-specific label extensions. The pinned package exports individual
`react-day-picker/locale/*` modules whose locale objects also support date-fns
formatting. Use the smallest shared mapping/loading arrangement that preserves
the existing locale budget; do not copy its translations into fifteen new maps.
Pass that locale to DatePicker's Calendar and remove the browser-default month
override, using upstream localized formatting or the same explicit locale.

- [ ] Fresh Chinese profile cards, commit list and commit detail use Chinese
      relative phrases; English still renders English for the same timestamps.
- [ ] Each mapped consumer uses the active application language, including when
      the browser preference differs. Source-only consumers are checked with
      local fixtures, not private profiles or real bank operations.
- [ ] Date values, suffix/duration semantics, datetime attributes, invalid-date
      fallbacks and existing exact-time/keyboard controls remain intact.
- [ ] Under active zh, the calendar month, weekdays, day names, selected/today
      qualifiers and navigation/dropdown names are Chinese, including in an
      en-US browser. Active en stays English in a zh-CN browser. Selecting
      September 15 still produces the same calendar date; language changes do
      not reinterpret an existing selected date or typed draft.
- [ ] Switching the active language updates these strings coherently. Locale
      loading/failure follows the existing language transition and retry
      behavior; settled non-English screens do not retain English durations.
- [ ] Concurrent SSR requests do not share mutable locale state; hydration and
      initial requests preserve the active-language-only loading contract.
- [ ] Focused regressions and dashboard format, lint, test, build and
      `yarn perf:locales` pass.

## Controls, exclusions and dedupe

Commit repeats have no page or console errors. The profile has the previously
recorded unrelated avatar mixed-content warning and two loopback-image errors,
but no page exception or GraphQL error. A failed image does not explain a
correct timestamp formatted in English. Fresh guest commit attempts redirected
to login; these endpoints explicitly require authentication. Retained commit
evidence uses the QA session transferred between browser contexts only in memory.
Temporary contexts were closed and the main QA language stayed English.

No author names/emails, follower identities, cookies or private ledger data were
retained. Relative ages will advance; reruns should compare languages for the
same timestamp rather than require these historical day counts.

Searched open/completed board records for relative timestamps, date localization
and English date strings and scanned open milestone summaries. 027 concerns
manual selection losing to an existing lang URL; here zh is already active.
m21 is social pagination, and m17 is commit-file navigation. Completed w2/m21
established lazy locale loading and SSR isolation; preserve its full contract.
Targeted history includes `af5339de`, `c7049813` and `5855c32a`; no fetched
main repair changes these calls. Other locales, live language transitions,
future/invalid timestamps, non-profile feeds, bank sync and patched behavior
remain unverified production scenarios.

## Calendar extension — fresh production evidence

On 2026-09-08, open `/ledger/open_ledger/minimax/budget?lang=zh` with the
QA session, choose **添加预算**, then **选择日期**. The public ledger grants
pull/push, not admin. In fresh 1440×1000 and 390×844 en-US browser contexts,
the dialog and **今天** button are Chinese but the calendar displays **Sep**,
**Su Mo Tu We Th Fr Sa**, and the grid name **September 2026**. Its accessibility
names include **Choose the Month**, **Go to the Next Month**, and
**Tuesday, September 15th, 2026**. A second fresh pass reproduced both widths.

The matching zh/zh-CN control changes only the month dropdown to **9月**;
weekday and accessibility text remain English. Conversely, active en in a
zh-CN browser gets a Chinese month dropdown inside an English calendar.
Keyboard selection of September 15 closes the popup and produces **09/15/2026**
in every repeat. This is untranslated generated UI, not a date-value failure.
All documents return HTTP 200, with no console/page errors. No forms were
submitted; the fresh-repeat mutation guards saw zero attempts. All temporary
contexts closed, and the main session remained English.

Source trace, unchanged at local `a315c273` and fetched main `853a4942`:

- `dashboard/src/common/components/ui/date-picker.tsx:158–165` supplies no
  locale to Calendar, although its surrounding text already uses translations.
- `ui/calendar.tsx:36–40` overrides month formatting with
  `toLocaleString("default")`, which follows the browser instead of the app.
- Registry-integrity-verified react-day-picker **9.13.0** sets enUS in
  `classes/DateLib.js:463`. `helpers/getLabels.js:23–40` resolves the optional
  locale's label extensions. `locale/zh-CN.js:4–37` already contains Chinese
  navigation, dropdown and selected/today wording. Its month formatter uses
  the supplied date library. Plain date-fns locales alone lack these labels.
- A local control executed the pinned zh-CN callbacks with date-fns 4.1.0's
  real formatter through the documented date-library argument: **九月**,
  **星期二**, **2026年9月15日 星期二**, **选择月份**, **前往下个月**,
  and **今天，2026年9月15日 星期二，已选择**. The same extended locale produces
  **6 天前** for the relative-time control. This is a library control, not a
  patched-production claim. See the version-nine
  [locale guide](https://daypicker.dev/v9/localization/changing-locale) and
  [translation guide](https://daypicker.dev/v9/guides/translation); the live
  docs show 9.14.0, so the inspected 9.13.0 artifact establishes pinned behavior.

DatePicker is the only consumer of the common Calendar. Its seven consumers
are Budget Add, Journal Transaction/Balance/Note/Open Account, Accounts Open
Account, and Receipt Review. Budget is live-proven; the others are source-only
blast radius. Other `<Calendar>` matches are icons. No API date/schema changes
are needed. Keep text parsing and required-state work in m24 and navigation
bounds in069; coordinate their changes to the same component. Completed
w2/m21's lazy loading and SSR isolation remain required. Targeted history
`af5339de` and `aeec496b` and all open/completed board searches show no repair
of this integration. Other languages, live language transitions with an open
calendar, native assistive technology and patched rendering remain unverified.

Verified ignored calendar evidence: `calendar-locale-evidence.json`,
`calendar-locale-helper-control.json`, `calendar-dependency-check.json`, and
`calendar-chinese-ui-english-{1440,390}.png` (each 250×339), under the same QA
directory. These crops contain only the calendar.

## Source + Goal linkage

- **Source:** repeated dashboard QA for w3, 2026-09-08, public profile and
  authenticated public commit-history/detail journeys at both widths.
- **Goal linkage:** **A2 — Frictionless onboarding**, with **A3 — Community &
  distribution** credibility: non-English visitors can read freshness cues
  while evaluating public example ledgers and their history.
- **Expected outcome:** the selected language covers generated relative dates
  and date-calendar controls as well as headings, without changing source data
  or requiring English.
- **Why now:** recently improved discovery exposes these dates throughout the
  entry journey; use the existing localization architecture before proliferating
  independent per-component locale maps.
- **Adoption surface:** included because this changes visible public and
  authenticated dashboard behavior; no new package or skill is introduced.

Verified ignored evidence in `dashboard/tmp/qa-20260907-w3-loop/`:
`relative-time-localization-evidence.json`,
`relative-time-dependency-check.json`, two `profile-relative-zh-*.png`,
two `commit-list-relative-zh-*.png`, and two `commit-relative-zh-*.png`.
Crops contain only timestamp text, without author or account identities.
