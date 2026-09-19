# Login continuations lose the fragment delimiter

**Severity:** major. **Package:** dashboard. Reproduced signed out on production, 2026-09-17, isolated Chromium 149.0.7827.55, widths 1440 and 390. Source inspected at `26d54a9db7d33c31a549bd12a0454a1c01f3f038`; production asset `main-BIr0jJni.js`, exact deployed SHA unverified.

## Reproduction and impact

1. Open `/ledger/open_ledger/example?time=2016#overview-recent-activity-heading`.
2. Click Star while signed out.
3. Login's decoded `next` is `/ledger/open_ledger/example?time=2016overview-recent-activity-heading`: the fragment becomes part of the time filter. Direct read-only navigation to that emitted continuation produces the invalid-input report error. Repeated at desktop and fresh narrow widths.
4. On `/ledger/open_ledger#ledger-collection-heading`, click Follow while signed out. Login emits `/ledger/open_ledgerledger-collection-heading`, corrupting the username path instead.

Expected: preserve the original path, query and fragment as separate URL components. The plain ledger URL without a fragment is a passing control. Source guards return before any Star/Follow mutation; the initial Star request observation also recorded zero GraphQL mutations. No account was authenticated and no star/follow relationship was changed. Actual completed authentication is unverified; the malformed emitted targets and public replay are reproduced.

## Root cause and scope

`src/common/hooks/use-login-next-path.ts:16` concatenates router pathname, searchStr and hash without inserting `#`. TanStack Router's parsed location hash excludes that delimiter (`@tanstack/router-core` router.ts strips it when parsing), unlike native `window.location.hash`. Both Star and Follow consume this hook. The same concatenation exists in `src/common/lib/auth/auth.ts:129` and `src/routes/ledger.$ledgerOwner.$ledgerName.tsx:54`; these two guarded continuations are source-traced, not authenticated browser reproductions.

Use correctly serialized router-relative destinations consistently across all three producers, retaining the safe-redirect validator and valid fragment encoding. Do not change native-window hash consumers or strip fragments as a workaround. A server request cannot recover a fragment that the browser never sent; scope guard acceptance to locations actually available to the client/guard.

## Deduplication and evidence

Completed w3/104 added Star/Follow continuations (hook history `af04f1a0`); completed w3/170 hardened safe-next URL validation. Neither owns this component-serialization defect. Preserve both contracts, including unsafe-next rejection. Existing requireAuth tests use empty hashes and do not cover the observed router shape.

Local evidence: `dashboard/tmp/qa-20260917/login-next-hash.json`. No credentials or private data are required to reproduce the public examples. No product fix has been made.

Additional evidence: `dashboard/tmp/qa-20260917/login-return-invalid-report-390.png` shows Error loading data / invalid information after directly replaying the emitted malformed continuation. This remains a public URL replay, not an authenticated login completion.
