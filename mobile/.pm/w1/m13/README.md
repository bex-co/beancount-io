# w1 · m13 — Brand logos for transaction avatars

**Worker:** worker1 **Goal:** transaction rows show the real merchant's logo (Starbucks, Amazon, Uber, …) when the payee is recognized, making every transaction list scannable at a glance **Status:** todo

## Tasks (in order)

| id   | title                                                                  | est | depends_on |
| ---- | ---------------------------------------------------------------------- | --- | ---------- |
| t001 | Brand matcher: curated payee → brand/domain map, on-device match       | 45m | —          |
| t002 | `TransactionAvatar` component: logo with initials fallback             | 45m | t001       |
| t003 | Adopt `TransactionAvatar` in `JournalEntryItem` (home/reports/journal) | 30m | t002       |
| t004 | Adopt `TransactionAvatar` in account-detail `AccountEntryRow`          | 20m | t002       |
| t005 | UX pass: light/dark, loading, no layout shift                          | 30m | t003, t004 |
| t006 | Simplify: run `/simplify` over the milestone's changes                 | 30m | t003, t004 |
| t007 | Test coverage: brand matcher + fallback behavior                       | 30m | t003, t004 |

## Definition of done

In the app, transactions whose payee is a recognized brand (e.g. "Starbucks", "Uber Eats", "Amazon.com") render that brand's logo as the row avatar in all four transaction surfaces (home recent-transactions card, reports account-transactions card, full journal list, account-detail rows). Unrecognized payees, matched-but-offline rows, and failed logo loads render today's colored-initials avatar with identical 40×40 geometry — no layout shift, correct in light and dark. `yarn test:unit` passes with new matcher tests.

## Source + Goal linkage

- **Source:** `/pm` request 2026-07-13 ("use real-world brand logos for transaction avatars if recognized")
- **Goal linkage:** Pillar 3 (analytics & insights — "the user understands their money at a glance"): logos make merchant recognition instant when scanning transaction lists; plus the cross-cutting quality bar (delightful in light and dark, offline-tolerant via initials fallback).
- **Expected outcome:** beancount.io users scanning any transaction list identify merchants by logo instead of reading every payee — the Monarch-style polish this workstream targets, on the app's most-viewed rows.
- **Why now:** m12 just unified typography on these same rows, and m4/m8/m9/m10 made transaction rows the app's central surface. The initials avatar is currently duplicated in `journal-entry-item` and `account-entry-row`; consolidating into one `TransactionAvatar` now removes that duplication before m3 (Reports) adds a third consumer.

## Constraints

- **No new dependency.** Logos load via plain React Native `Image` from a keyless favicon endpoint (`https://www.google.com/s2/favicons?domain=<domain>&sz=128`); RN's native image cache handles reuse. If nicer logo quality is ever wanted (logo.dev API key, `expo-image` caching), that is explicitly out of scope and needs user approval.
- **Privacy:** payee text never leaves the device. Matching runs locally against a curated map; only the matched brand's domain (a constant from our own list) appears in the image URL.
