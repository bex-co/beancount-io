# w2 — General adoption worker queue (worker2)

**Worker:** worker2 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty. Existing milestones retain their historical order and source.

## Milestones

- [x] **m1** — beancount-reconcile: statement-vs-ledger diff + balance assertion (9 tasks) ← from /pm-brainstorm 2026-07-31 (skills-market research)
- [x] **m2** — beancount-importer-author: agent writes/repairs beangulp importers (8 tasks) ← from /pm-brainstorm 2026-07-31 (skills-market research)
- [x] **m3** — beancount-migrate: Mint/Monarch/QBO exports → working ledger (8 tasks) ← from /pm-brainstorm 2026-07-31 (skills-market research)
- [x] **m4** — beancount-ask: local BQL Q&A over the ledger (8 tasks) ← from /pm-brainstorm 2026-07-31 (skills-market research)
- [x] **m5** — beancount-close: month-end close ritual (8 tasks) ← from /pm-brainstorm 2026-07-31 (skills-market research) — sequenced after m1
- [x] **m6** — beancount-import: bank CSV/OFX to verified, deduplicated entries (10 tasks) ← from import-architecture design 2026-07-31
- [x] **m7** — Extensionless text preview: LICENSE and common repo files (9 tasks) ← from user report 2026-08-19 (TinySnow LICENSE shows `Unsupported file format ()`)
- [x] **m8** — Public-ledger index hygiene (9 tasks) ← from /pm-brainstorm 2026-08-20 (Search Console); policy corrected for social-accounting visibility 2026-08-20
- [x] **m9** — Search Console CTR hygiene for commit detail (7 tasks) ← from Search Console report 2026-08-21 (28-day window: near-page-one amazon commit 0% CTR)
- [x] **m10** — Self-canonical hygiene for all indexable dashboard pages (7 tasks) ← from /pm-brainstorm 2026-08-21 (Search Console: ?lang= variant dilution on account pages, no canonical on most indexable routes)
- [x] **m11** — Acquisition snippet CTR for login, sign-up and forgot-password (7 tasks) ← from Search Console Diagnosis C 2026-08-22 (generic `Sign In`/`Create Account` predict <3% CTR at position 4–20)
- [x] **m12** — Minimal centralized authz for mobile user deletion (7 tasks) ← from user-reported mobile deletion failure + `backend-v2/authz/README.md` 2026-08-28
- [x] **m13** — Centralized authz foundation for user identity and API credentials (8 tasks) ← from user decision 2026-08-28 after m12
- [x] **m14** — Centralized authz for billing and subscriptions (7 tasks) ← from user decision 2026-08-28 after m13
- [x] **m15** — Centralized authz for the social graph and starring (7 tasks) ← from user decision 2026-08-28 after m14
- [x] **m16** — Centralized authz for AI-assisted ingestion and assets (8 tasks) ← from user decision 2026-08-28 after m15
- [ ] **m17** — Centralized authz for ledger contents and reporting (9 tasks) ← from user decision 2026-08-28 after m16
- [x] **m18** — Centralized authz for ledger administration and collaboration (8 tasks) ← from user decision 2026-08-28 after m17
- [ ] **m19** — Centralized authz for bank connections and transaction sync (8 tasks) ← from user decision 2026-08-28 after m18
- [ ] **m20** — Retire distributed authorization gates after domain cutovers (8 tasks) ← from user decision 2026-08-28 after m19

## Centralized-authz migration contract for m14–m20

The pending domain milestones inherit the implementation boundary proven by m13:

- Keep one thin TypeScript PDP and one executable action-requirement catalog. Canonical actions and credential policy live there; transport aliases and operational rate/audit classes live in `op-class.ts`. Do not add a second `*-policy` file, authorization DSL, or endpoint-shaped FGA relations.
- Keep `.fga` limited to durable/source-derived relationship semantics. Update `model.fga` and its truth table in the same change only when a relationship or derived permission changes; credentials, scopes, request objects, operation IDs, system invocations, and contextual tuples stay out.
- Put the PEP in each protected public application-service method. Pass the resolved `Identity` explicitly; use a workflow only for genuine multi-service orchestration, never as an authorization-only wrapper. Transport operation IDs are audit metadata carried by isolated AsyncLocalStorage child contexts, with the canonical action as the direct-call fallback.
- Re-evaluate authoritative domain facts on every authorization call. Do not add an authorization decision memo, cross-request permission cache, tuple copy, OpenFGA runtime, service, SDK, or database. A repeated source read or owner predicate may remain when it is an intentional atomic defense-in-depth check.
- Keep policy-shaped denial messages, concealment, credential ceilings, relationship requirements, and audit class in the action catalog. Relationship denials are 403 or the catalog-declared concealment; source failures are logged and audited as errors and surface as service unavailable, never as a silent security denial.
- Preserve each operation's operational class and explicit rate-budget override independently from credential reachability. Preserve existing client-visible authentication/error contracts, domain validation, quotas, safe paths, transactional ordering, and actionable GraphQL/REST/MCP denial messages.
- Test behavior, not only resolver status: allow/deny matrices, exact capability ceilings, source outages, no-side-effect denial, per-call audit (including duplicate GraphQL roots), direct-call audit fallback, concurrent operation-ID isolation, data-layer ownership predicates, and cross-surface parity where exposed.
- Before closeout, run package checks plus a deployed development smoke test using current clients. Apply required migrations first and verify persisted audit rows and destructive/no-side-effect outcomes; a successful UI or HTTP response alone is not rollout evidence. Production deployment remains a separate explicit action.
