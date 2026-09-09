# w4 · m8 — Localized Google Play listing from the canonical metadata

**Worker:** worker1 **Goal:** the Google Play listing is generated from the same canonical metadata as the App Store listing and is live in all 13 shipped languages, including the Bulgarian and Persian listings Apple cannot offer **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Pull the current Google Play listing baseline | 35m | — |
| t002 | Generate Play listing copy from the canonical metadata | 45m | t001 |
| t003 | Derive Play screenshots and the feature graphic | 50m | — |
| t004 | Plan and apply steps for the Play listing, with docs | 50m | t002, t003 |
| t005 | Adoption surface | 25m | t004 |
| t006 | Simplify | 25m | t005 |
| t007 | Test coverage | 45m | t005 |
| t008 | Closeout | 15m | t006, t007 |

## Definition of done

- The Play baseline is recorded and the assumption that the listing was English-only is confirmed or corrected before any generation work lands.
- A plan run prints every locale's diff with no credentials; after apply, the Play listing shows localized title, short and full descriptions, three phone screenshots, and a feature graphic in all 13 languages, and the Bulgarian and Persian listings exist.
- `yarn metadata:validate` and `yarn screenshots:validate` enforce the Play limits and pass in CI; generated screenshots stay gitignored; no service-account file or token is committed.
- `docs/app-store-localization.md` and the `mobile-release` skill describe the Play steps exactly as they run.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w4`, 2026-09-08 (user approved all four milestones with `/pm for them all for w4`)
- **Goal linkage:** **A3 — Community & distribution**: the app ships 13 locales and the App Store listing is localized in 14, but nothing in the repo manages the Play listing; Android users searching in their language, including Bulgarian and Persian speakers, currently meet an English page.
- **Expected outcome:** Play installs and store-listing conversion per locale become measurable and the listing stays in sync with the App Store copy on every release.
- **Why now:** the App Store pipeline just settled (release receipts, parity checks, deterministic screenshots), so the Play side copies its shape instead of inventing one. The API client choice in t001 may need a dependency decision from the user.
- **Adoption surface:** included because this ships store-facing copy and release tooling that the mobile README, localization doc, and `mobile-release` skill describe.
