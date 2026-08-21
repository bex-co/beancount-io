# w2 · m8 — Public-ledger index hygiene

**Worker:** worker2 **Goal:** maximize useful search visibility for social ledger content and acquisition pages while excluding transactional, private, thin, and parameterized URLs. **Status:** done

## Tasks (in order)

| id   | title                                                                                      | est | depends_on        |            |
| ---- | ------------------------------------------------------------------------------------------ | --- | ----------------- | ---------- |
| t001 | Document indexable surface: useful social/acquisition pages indexable; transactional/private noindex | 25m | —                 | — **DONE** |
| t002 | Add `robots` / `noindex` support to SEO helpers (`LedgerSEO` / `PageSEO` / `createHeadMeta`) | 35m | w2/m8/t001        | — **DONE** |
| t003 | Apply noindex to transactional/private/write/thin/parameterized surfaces                    | 45m | w2/m8/t002        | — **DONE** |
| t004 | Skip hreflang (and lang-alternate explosion) on noindex pages                              | 25m | w2/m8/t002        | — **DONE** |
| t005 | Smoke-check public journal/ask/login indexable; settings/editor still noindex              | 20m | w2/m8/t003, t004  | — **DONE** |
| t006 | Adoption surface                                                                           | 30m | w2/m8/t005        | — **DONE** |
| t007 | Simplify                                                                                   | 30m | w2/m8/t006        | — **DONE** |
| t008 | Test coverage                                                                              | 45m | w2/m8/t006        | — **DONE** |
| t009 | Closeout                                                                                   | 10m | w2/m8/t008        | — **DONE** |

## Definition of done

Public social/read pages, login/sign-up/forgot-password, the base ledger Ask/agent page, and read-only ledger file (`blob`) pages do **not** emit `noindex`. Reset tokens, OTP/welcome, logout/callback/consent/device-auth, private settings, file directory (`tree`) and write routes, bank-link/receipt, BQL query, ledger errors, auth-gated shells, prefilled Ask questions, and error pages **do**. Ask URLs canonicalize to the base agent page; blob URLs canonicalize without edit/line query parameters; `yarn lint && yarn test` pass in `dashboard/`.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-08-20 Search Console evidence; policy corrections 2026-08-20 for social accounting + acquisition/Ask visibility.
- **Goal linkage:** **A3 — Community & distribution** and **A2 — Frictionless onboarding** — public ledger content and login/sign-up/Ask should be findable.
- **Expected outcome:** Useful public social and acquisition pages can rank without indexing token URLs, internal tools, or query-generated duplicates.
- **Why now:** The overview-only policy was too restrictive, while indexing every route was too broad; route purpose and crawl value need to drive the boundary.
- **Adoption surface:** included.

## Policy (canonical)

See `dashboard/src/common/lib/seo/indexability.ts`.

## Verification

- 2026-08-20: robots helper + hreflang gating shipped. Final audit keeps useful social reads, login/sign-up/forgot-password, and base Ask/agent indexable; transactional/private/write/thin/parameterized routes remain noindex. OAuth consent and receipt gaps were closed, and Ask deep links canonicalize to the base agent page.
- GitHub parity review: GitHub robots excludes `/*/tree/` but not `/*/blob/`. Beancount.io therefore keeps directory tree and create/upload routes noindex, exposes read-only blob pages with path-aware titles and stable canonicals, strips UI query state from hreflang, and forces ledger loader error states to noindex.
