# Localized App Store release workflow

Beancount ships 13 in-app languages. Apple accepts 11 of those languages as
App Store metadata through 14 regional localizations:

| Runtime language   | App Store localization(s) | Notes                                                           |
| ------------------ | ------------------------- | --------------------------------------------------------------- |
| English            | `en-US`                   | Primary listing and fallback                                    |
| Simplified Chinese | `zh-Hans`                 | Native listing                                                  |
| Catalan            | `ca`                      | Native listing                                                  |
| German             | `de-DE`                   | Native listing                                                  |
| Spanish            | `es-ES`, `es-MX`          | Region-specific terminology and search intent                   |
| French             | `fr-FR`, `fr-CA`          | Region-specific terminology and search intent                   |
| Dutch              | `nl-NL`                   | Native listing                                                  |
| Portuguese         | `pt-BR`, `pt-PT`          | Region-specific terminology and search intent                   |
| Russian            | `ru`                      | Native listing                                                  |
| Slovak             | `sk`                      | Native listing                                                  |
| Ukrainian          | `uk`                      | Native listing                                                  |
| Bulgarian          | —                         | Apple offers no `bg` metadata; inherits primary `en-US` listing |
| Persian            | —                         | Apple offers no `fa` metadata; inherits primary `en-US` listing |

`metadata/store-locales.json` is the authoritative mapping. Do not map
Bulgarian or Persian to an unrelated storefront locale, and do not add extra
English variants solely to obtain more keyword fields.

## Positioning and terminology

Every locale tells the same supported story, in this order:

1. Financial clarity: net worth, spending, budgets, cash flow, and reports.
2. Ownership: real Beancount plain-text files with Git history and direct editing.
3. Accounting depth: double-entry postings, multiple books and currencies,
   investments, receipt capture, search, and filters.

Listing terminology follows the shipped translations under `src/translations/`.
Regional variants are intentional: Spain uses _informes_ and _flujo de caja_,
Mexico uses _reportes_ and _flujo de efectivo_; France uses _patrimoine net_ and
_trésorerie_, Canada uses _valeur nette_ and _flux de trésorerie_; Brazil uses
_arquivo_, _celular_, and _patrimônio_, while Portugal uses _ficheiro_,
_telemóvel_, and _património_.

The first three screenshot captions mirror the same hierarchy. Their sources
are the deterministic public demo ledger in `docs/marketing-showcase/webp/`—not
a signed-in contributor account. The renderer replaces visible UI labels with
the corresponding shipped strings from `src/translations/`, then adds each
storefront's native caption. `metadata/screenshots.json` owns locale, device,
story, caption, source, dimensions, and order.

## Prepare locally

Never start by editing the version currently in review. Wait for it to reach a
terminal store state, then prepare a subsequent version locally before pushing
the version bump to `main`:

```zsh
cd mobile

# Optional read-only baseline; pull into ignored tmp/ so approved work is not overwritten.
mkdir -p tmp/asc-baseline
asc metadata pull --app 1527950512 --version <current-version> \
  --platform IOS --dir tmp/asc-baseline --force --output table

yarn bump
# Replace every blank metadata/version/<new-version>/* whatsNew and the new
# fastlane/metadata/android/en-US/changelogs/<build>.txt placeholder.

yarn metadata:validate
yarn screenshots:build
yarn screenshots:validate
```

`yarn bump` keeps `package.json`, Expo, iOS, and Android versions in sync. It
scaffolds all 14 version-localization files from `metadata/version-template/`
and deliberately blanks every `whatsNew`; validation fails until all localized
release notes are fresh. The Android changelog path remains intact. Fastlane is
not an iOS metadata authority.

Generated screenshot PNGs and raw comparison renders are ignored. The build
creates exactly 84 final assets: 14 locales × `APP_IPHONE_65` and
`APP_IPAD_PRO_3GEN_129` × three ordered stories. It strips alpha and uses
Apple-accepted `1284×2778` and `2064×2752` output sizes. The release plan runs
`asc screenshots validate` against every one of the 28 locale/device sets as
the upstream preflight. Because Apple accepts the iPad dimensions for multiple
display-type aliases, the review manifest pins each asset to the exact device
declared in `metadata/screenshots.json` before planning.

## Review-gated App Store Connect changes

Authentication belongs in the system keychain, or ignored `.asc/` state. Never
print, copy, or commit a token, credential identifier, or review artifact.

The release helper separates every remote mutation. The exact version must be
repeated as the third argument for `create`, `approve`, `apply-metadata`, and
`apply-screenshots`:

```zsh
# 1. Explicitly authorize creation of the editable record. This copies only
# stable metadata from the prior live version, excludes release notes, and
# pre-creates the manifest's blank version-localization resources so ASC can
# plan app-info and version changes without a cross-resource creation race.
./scripts/app-store-release.sh create <new-version> <new-version>

# 2. Read-only remote diff plus local screenshot review artifacts.
./scripts/app-store-release.sh plan <new-version>

# 3. Inspect metadata/plan.md, metadata/keywords-plan.md, and
# screenshots/index.html under .asc/releases/<new-version>/. After operator
# approval, record the local approvals.
./scripts/app-store-release.sh approve <new-version> <new-version>

# 4. Apply the reviewed metadata first. This creates the version-localization
# resources that screenshot planning needs.
./scripts/app-store-release.sh apply-metadata <new-version> <new-version>

# 5. Generate and inspect screenshots/plan.md now that all locales exist remotely.
./scripts/app-store-release.sh plan-screenshots <new-version>

# 6. Apply only the separately reviewed screenshot replacement plan.
./scripts/app-store-release.sh apply-screenshots <new-version> <new-version>

# 7. Pull remote metadata into ignored tmp/ and verify metadata, keywords, and
# screenshot source checksums, dimensions, processing state, and order.
./scripts/app-store-release.sh verify <new-version>
```

The helper refuses a missing/non-editable version, missing review artifacts, or
an inexact confirmation. Screenshot application uses upstream `asc screenshots
plan` and `asc screenshots apply --confirm --replace`; no repository code
handles bearer tokens or App Store upload requests.

Diff `tmp/asc-parity-<version>/app-info/` and
`tmp/asc-parity-<version>/version/<version>/` against the canonical files. Also
list every remote screenshot set and verify locale, display type, processed
state, count, dimensions, and order. The `verify` action performs those checks
and writes `metadata/releases/<version>.json`, a non-secret staging receipt tied
to a SHA-256 digest of the exact canonical metadata, screenshot manifest, and
public source captures, shipped UI translations, and screenshot renderer. Only
after metadata, screenshot source checksums, and keyword parity are clean
should that receipt and the version bump reach `main`. The release workflow
rejects a missing or stale receipt before it starts the EAS build and
auto-submit for an untagged version.

## Measurement

As of the 2026-08-24 baseline, live version `1.20260821.44` was
`READY_FOR_SALE` with only `en-US` and `zh-Hans` metadata. No existing App
Analytics report request was available, so no report was created or committed
during the read-only baseline. After the localized release, record only
thresholded aggregate impressions, product-page views, first-time downloads,
conversion, source type, and territory for a later 28-day comparison. Never
commit user-level analytics or private account data.
