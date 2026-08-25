# w1 · m38 — Localize and optimize the App Store product page

**Worker:** worker1 **Goal:** Prospective users in every App Store-supported language that the mobile app ships see relevant, locale-native metadata and conversion-focused screenshots managed through a repeatable, review-gated `asc` workflow. **Status:** todo

## Tasks (in order)

| id   | title                                                                 | est   | depends_on             |
| ---- | --------------------------------------------------------------------- | ----- | ---------------------- |
| t001 | Pull the live ASC baseline and approve the locale/fallback matrix     | 45m   | —                      |
| t002 | Define localized positioning, terminology, and screenshot narrative   | 1h    | t001                   |
| t003 | Author Western European App Store metadata                            | 1h30m | t002                   |
| t004 | Author Slavic metadata and refresh English and Simplified Chinese     | 1h    | t002                   |
| t005 | Build locale-native keyword fields and pass local quality checks      | 1h30m | t003, t004             |
| t006 | Automate next-version metadata scaffolding and locale coverage        | 1h    | t003, t004             |
| t007 | Build the localized screenshot template and manifest                  | 1h    | t002                   |
| t008 | Render localized first-three iPhone and iPad screenshot sets          | 1h30m | t007                   |
| t009 | Replace the direct screenshot uploader with guarded asc workflows     | 45m   | t007                   |
| t010 | Stage and apply the next App Store version through reviewed asc plans | 1h    | t005, t006, t008, t009 |
| t011 | Verify remote parity and release without an auto-submit race          | 45m   | t010                   |
| t012 | Document the localized ASC release workflow                           | 30m   | t011                   |
| t013 | Simplify                                                              | 30m   | t012                   |
| t014 | Test coverage                                                         | 1h    | t012                   |
| t015 | Closeout                                                              | 15m   | t014                   |

## Definition of done

- The next editable iOS version contains complete app-info and version metadata for `en-US`, `zh-Hans`, `ca`, `de-DE`, `es-ES`, `es-MX`, `fr-FR`, `fr-CA`, `nl-NL`, `pt-BR`, `pt-PT`, `ru`, `sk`, and `uk`.
- Bulgarian (`bg`) and Persian (`fa`) remain supported inside the app and have an explicit primary-listing fallback because App Store Connect does not offer those metadata localizations; neither is falsely mapped to an unrelated locale.
- Names, subtitles, descriptions, promotional text, release notes, URLs, and keywords satisfy Apple's field limits; `asc metadata validate` passes; keyword checks report no duplicate phrases, title/subtitle overlap, malformed separators, or filler added only to exhaust the limit.
- Each target localization has three ordered, locale-native screenshots for both `APP_IPHONE_65` and `APP_IPAD_PRO_3GEN_129`. They communicate financial overview, plain-text/Git ownership, and reporting depth; contain only deterministic public demo data; and meet Apple's dimensions and alpha-channel rules.
- `yarn bump` scaffolds every canonical version-localization file, requires fresh localized release notes, preserves the Android changelog path, and no longer treats the dead Fastlane iOS metadata as authoritative.
- Screenshot publication uses `asc screenshots plan` plus reviewed, confirmed application rather than the repository's direct App Store Connect upload implementation.
- The existing `1.20260821.44` submission is neither canceled nor mutated. Metadata and screenshots are applied to a subsequent `PREPARE_FOR_SUBMISSION` version before EAS auto-submit can move it into review.
- A clean pull from App Store Connect matches the committed canonical metadata, remote screenshot sets have the intended locale/device/order, the release reaches `READY_FOR_DISTRIBUTION`, and mobile package checks pass.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` on 2026-08-24, live read-only `asc` inspection of app `1527950512`, and the existing metadata/screenshot workflow under `mobile/metadata/` and `mobile/scripts/`.
- **Goal linkage:** **Pillar 4 — Plain-text fidelity**, plus the board's cross-cutting 13-locale quality bar. Locale-native store copy makes the app's user-owned Beancount files, Git history, and non-proprietary data model understandable before installation; localized analytics screenshots show what users can learn from that same plain-text source without claiming unsupported store locales.
- **Expected outcome:** App Store Search impressions, product-page views, first-time downloads, and conversion increase in the supported-language territories; future releases retain full locale coverage without manual source-of-truth drift.
- **Why now:** The app ships 13 in-app locales but the live version exposes only `en-US` and `zh-Hans` metadata, the committed canonical metadata lags the submitted version, and the current submission is already waiting for review. Staging the next version preserves that review while closing the largest ready-made distribution gap. A dedicated documentation task is included because this non-UI milestone changes the public App Store listing and mobile release workflow.
