# w4 · m8 — Localized Google Play listing from the canonical metadata

**Worker:** worker1 **Goal:** the Google Play listing is generated from the same canonical metadata as the App Store listing and is live in all 13 shipped languages, including the Bulgarian and Persian listings Apple cannot offer **Status:** in progress (t001–t004 done; Play Console review state and public-listing sampling pending)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Pull the current Google Play listing baseline — **DONE** | 35m | — |
| t002 | Generate Play listing copy from the canonical metadata — **DONE** | 45m | t001 |
| t003 | Derive Play screenshots and the feature graphic — **DONE** | 50m | — |
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

## Implementation evidence

- The authenticated baseline confirms en-US was the only existing Play locale (8 phone screenshots, 1 feature graphic). Detailed evidence is in done/t001.md.
- Canonical generation, 16-locale offline plans, reviewed-plan confirmation, remote-drift checks, edit validation/commit, and text/image parity verification are implemented.
- Local checks: 1,547 unit tests; formatting, lint/type checks; metadata validation; all 148 screenshot assets; agent-guidance and skills validation. Deliberate mutations were detected for credential redaction, JWT signing, edit cleanup, locale mapping, image dimensions/captions, canonical-copy derivation, text limits/trimming, plan output, parity checks, and validation-before-commit.
- Draft PR: https://github.com/bex-co/beancount-io/pull/175. Hosted CI passed at 907dc51258c165d5746fd3fe47415445c0556f7d: https://github.com/bex-co/beancount-io/actions/runs/34309723072 (mobile checks, metadata validation, all 148 assets built and validated). Skills, agent guidance, and secret scanning also passed. CI uses imagemagick-full for font discovery; font selection preserves Arial Unicode output when available and supports system-font fallbacks with tested glyph coverage.
- 2026-09-10: the reviewed plan (`b4921f16…5cf5636f`) was applied with user authorization and the helper verified all 16 locales' copy and image checksums against the live API.
- Pending: Play Console review/publishing state and sampled public listings (incl. `bg`, `fa`), plus final closeout. Public availability is not claimed until the console check lands.

## Definition-of-done assessment (2026-09-10, t008)

- Baseline recorded and English-only assumption confirmed before generation: MET (done/t001.md — live API baseline 2026-09-09, only en-US).
- Plan prints every locale's diff with no credentials: MET (16 locale sections, credential scan clean, SHA-256 `b4921f1697ffee42c3218ce4ac7fd7ba454e3e62b3aab73d7fedfcca5cf5636f` stable).
- After apply, the listing shows localized title/descriptions, three phone screenshots, and a feature graphic in all 13 languages incl. `bg`/`fa`: MET AT THE API LEVEL (`apply-play` + `verify-play`: all 16 locales' text and image checksums match the reviewed plan). PUBLIC VISIBILITY PENDING — Play review/publishing state and sampled public listings still need a human Play Console check.
- Validators enforce Play limits and pass in CI; screenshots gitignored; no credential committed: MET (`metadata:validate`, `screenshots:validate`, macOS CI job, `tmp/` ignored, secret scan in the release flow).
- Localization doc and `mobile-release` skill describe the Play steps exactly as they run: MET (t005 walk-through; every command re-executed as written).
- t008 stays open until the console/public-listing check lands; `/pm done` runs only then.

- Scoped simplification removed an unnecessary plan-builder type cast and avoided unused icon reads during phone rendering. The reviewed publication plan retained SHA-256 `b4921f1697ffee42c3218ce4ac7fd7ba454e3e62b3aab73d7fedfcca5cf5636f`.
