# w4 · m8 — Localized Google Play listing from the canonical metadata

**Worker:** worker1 **Goal:** the Google Play listing is generated from the same canonical metadata as the App Store listing and is live in all 13 shipped languages, including the Bulgarian and Persian listings Apple cannot offer **Status:** done

## Block history

**Blocked 2026-09-14 by `/loop-worker w4` triage; every implementation task is complete.** The reviewed Play edit was applied and verified at the API level on 2026-09-10: all 16 locales' text and image checksums match plan `b4921f16…5cf5636f`. The public listing does not show it. On 2026-09-14 the public store page for `io.beancount.android` still carries the previous title ("Beancount") and the previous English description, and none of the generated en-US, `bg`, or `fa` copy appears. Whether the change is in Google Play review, held by managed publishing, or rejected is visible only in Play Console, which this worker cannot access.

**Rechecked 2026-09-28 by `/loopx w4`:** the copy is now public. Fresh unauthenticated requests to all 16 locale pages match their canonical title, short description, and full description, including [Bulgarian](https://play.google.com/store/apps/details?id=io.beancount.android&hl=bg&gl=US) and [Persian](https://play.google.com/store/apps/details?id=io.beancount.android&hl=fa&gl=US). `verify-play` also passes for all 16 locales against the newer reviewed plan `c0a8eb2bea8ced4237ae6bc8424480685b9447448428a91244ed185bb6a3c324` (2026-09-26), including image counts, order, and checksums. Public artwork still differs: the Bulgarian overview screenshot displays the old $106,826.05 net worth and bottom tabs, while the API's reviewed image displays the newer $117,649.49 market value, valuation explanation, and floating tabs. This is a visible content difference, not just CDN encoding. The public original-size PNG hashes to `4ef92fc878434f9c15c2871410fc361be3e0e90842fbc539c1dc0d8e1a5c5a50`; the API image hashes to `803278cacb19f7f4c2da15bc0c1a632b730d13a76fdd43e1d0c53072e26a6f54`. No edit was committed or published during this read-only verification. The first API request returned 503; one retry completed successfully.

**Previous unblock condition (cleared below):** confirm the current artwork's review/publishing state and publish it if managed publishing is holding it, then verify the public screenshots and feature graphics against the reviewed plan, including `bg` and `fa`. Public copy is already verified; artwork publication remains unconfirmed. When the complete localized listing is public, move this directory back to `.pm/w4/m8/` and run `/pm done w4/m8/t008`. The workstream checkbox stays unchecked until then.

Board repair in the same move: t004–t007 already recorded `status: done` but still sat in the open tree; they now live under `done/` with their rows marked.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Pull the current Google Play listing baseline — **DONE** | 35m | — |
| t002 | Generate Play listing copy from the canonical metadata — **DONE** | 45m | t001 |
| t003 | Derive Play screenshots and the feature graphic — **DONE** | 50m | — |
| t004 | Plan and apply steps for the Play listing, with docs — **DONE** | 50m | t002, t003 |
| t005 | Adoption surface — **DONE** | 25m | t004 |
| t006 | Simplify — **DONE** | 25m | t005 |
| t007 | Test coverage — **DONE** | 45m | t005 |
| t008 | Closeout — **DONE** | 15m | t006, t007 |

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
- 2026-09-28: all 16 public locales' title and descriptions match canonical metadata; current API text/artwork parity passes. Public screenshots lag the current reviewed artwork, so closeout remains blocked as detailed above. Current mobile CI also passes its mobile and store metadata/artwork jobs at `7e452b51`: https://github.com/bex-co/beancount-io/actions/runs/36516070367.

## Definition-of-done assessment (2026-09-10, t008)

- Baseline recorded and English-only assumption confirmed before generation: MET (done/t001.md — live API baseline 2026-09-09, only en-US).
- Plan prints every locale's diff with no credentials: MET (16 locale sections, credential scan clean, SHA-256 `b4921f1697ffee42c3218ce4ac7fd7ba454e3e62b3aab73d7fedfcca5cf5636f` stable).
- After apply, the listing shows localized title/descriptions, three phone screenshots, and a feature graphic in all 13 languages incl. `bg`/`fa`: MET AT THE API LEVEL (`apply-play` + `verify-play`: all 16 locales' text and image checksums match the reviewed plan). PUBLIC VISIBILITY PENDING — Play review/publishing state and sampled public listings still need a human Play Console check.
- Validators enforce Play limits and pass in CI; screenshots gitignored; no credential committed: MET (`metadata:validate`, `screenshots:validate`, macOS CI job, `tmp/` ignored, secret scan in the release flow).
- Localization doc and `mobile-release` skill describe the Play steps exactly as they run: MET (t005 walk-through; every command re-executed as written).
- t008 stays open until the console/public-listing check lands; `/pm done` runs only then.

- Scoped simplification removed an unnecessary plan-builder type cast and avoided unused icon reads during phone rendering. The reviewed publication plan retained SHA-256 `b4921f1697ffee42c3218ce4ac7fd7ba454e3e62b3aab73d7fedfcca5cf5636f`.


## Unblocked — 2026-10-10

The public listing now satisfies the remaining publication condition. Fresh unauthenticated US storefront requests in all16 mapped locales match all48 canonical title, short-description and full-description fields. Each locale exposes three ordered phone screenshots and one feature graphic in the public app-detail data; the screenshot order also matches the rendered web gallery. All64 original public PNGs have the expected 1080×1920 or1024×500 dimensions and match freshly generated canonical artwork byte-for-byte, including Bulgarian and Persian. The matched64-image manifest SHA-256 is `5c673765a82c0343cf7c08a1a7b069d9964793ef3d224475ac3d0711665f6ef2`. Bulgarian overview is the previously reviewed `803278cacb19f7f4c2da15bc0c1a632b730d13a76fdd43e1d0c53072e26a6f54`; its feature graphic is `ce086f2cbdc6bcb180c1ed39e48970f7aacc9adec1df0d9f4cd0bde969593191`. Bulgarian overview/ownership/reports and the Persian phone/feature images were visually inspected. The newer valuation display and localized captions are public.

The comparison also establishes a local renderer distinction rather than concealing it: the font-capable full ImageMagick SVG delegate matches all16 feature graphics and three Chromium-rendered Persian screenshots, while its45 other phone images differ around SVG overlays. With the installed standard ImageMagick SVG renderer and the same actual Arial Unicode MS font exposed through an ignored local font map, all48 phone screenshots reproduce the public reviewed images exactly. No screenshot source, caption, font file, package dependency or lockfile changed. The full-builder negative comparison and the exact standard-renderer comparison are retained separately under ignored `mobile/tmp/public-play-m8/` with fresh public listing/download evidence and a repeatable verifier.

All closeout checks pass: mobile formatting, lint (including unused-code/GraphQL checks), typecheck,2244 unit tests, metadata validation (104 files, zero errors/warnings), the full148-image build, and screenshot order/dimension/opacity validation. The all48-phone reproduction and subsequent complete148-image validation also pass. Public visibility is observed directly; no private Play Console status or fresh authenticated API parity is claimed, and no remote edit or publication was performed. Historical API parity/review evidence above remains unchanged. The implementation in `ec8297a7` and the reviewed artwork update in `0c6fb507` already shipped; only the public closeout record remains to archive.
