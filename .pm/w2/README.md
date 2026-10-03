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
- [x] **m17** — Centralized authz for ledger contents and reporting (9 tasks) ← from user decision 2026-08-28 after m16
- [x] **m18** — Centralized authz for ledger administration and collaboration (8 tasks) ← from user decision 2026-08-28 after m17
- [x] **m19** — Centralized authz for bank connections and transaction sync (8 tasks) ← from user decision 2026-08-28 after m18
- [x] **m20** — Retire distributed authorization gates after domain cutovers (8 tasks) ← from user decision 2026-08-28 after m19

- [x] **m21** — Load only the active language (8 tasks) ← from /pm-brainstorm dashboard performance 2026-09-05; user routed to w2
- [x] **m22** — Make reports download and initialize less chart code (8 tasks) ← from /pm-brainstorm dashboard performance 2026-09-05; user routed to w2 — depends on m21
- [x] **m23** — Show primary ledger content before optional panels finish (8 tasks) ← from /pm-brainstorm dashboard performance 2026-09-05; user routed to w2 — depends on m21
- [x] **m24** — Beancount.io CLI becomes `bea`: package `beancount-io`, `list`/`add`/`ask` command tree, automation contract (12 tasks) ← from TPM discussion 2026-09-06 (CLI naming and automation contract) + `cli/docs/PRFAQ.md`; user routed to w2
- [x] **m25** — `bea` distribution: PyPI trusted publishing, Homebrew tap, update notice, `bea upgrade` (9 tasks) ← from TPM discussion 2026-09-06; user routed to w2 — sequenced after m24
- [x] **m26** — MCP write path that cannot lose or silently break a ledger (10 tasks) ← from MCP field audit 2026-09-08 (rename data loss, silent unbalanced writes, empty dry run, broken PR path); user routed to w2
- [x] **m27** — MCP discoverability: the server explains itself to agents (9 tasks) ← from MCP field audit 2026-09-08 (three Claude Code sessions found no ledgers/errors/resources); user routed to w2 — sequenced after m26
- [x] **m28** — MCP results and failures an agent can act on (9 tasks) ← from MCP field audit 2026-09-08 (JSON-wrapped tables, four error dialects, 429 mid-session); user routed to w2 — sequenced after m27
- [ ] **m30** — [AI reliability hardening: ADR 0011 follow-ups](./blocked/m30/README.md) (11 tasks) ← from the 2026-09-07 receipt-parse outage diagnosis + ADR 0011 tier-3 discussion; user routed to w2 as one milestone 2026-09-09 — **blocked:** t006 Haiku eval needs an operator-supplied ANTHROPIC_API_KEY
- [x] **m31** — Include Live Price: managed price includes in the ledger service (11 tasks) ← from PRFAQ002 + ADR 015; user request 2026-09-15 to design, board, and implement the ledger layer
- [x] **m32** — [Managed price status on every client surface](./done/m32/README.md) (9 tasks) ← promoted [w2/026](./done/026.md) 2026-09-23; ADR 015 follow-up to m31
- [ ] **m34** — [Ledger catalogs list every ledger, not the first upstream page](./blocked/m34/README.md) (6 tasks) ← from user report 2026-10-01 (dashboard ledger switcher could not find `open_ledger/stock-example`), reproduced against the deployed site; user routed to w2 — **blocked:** t001–t005 shipped; closeout needs production backend-v2 deployed with the fix
- [ ] **m35** — [Public ledgers that explain themselves in search and on first visit](./blocked/m35/README.md) (13 tasks) ← public-ledger SEO research; materialized 2026-10-02 at user request — **blocked:** implementation pushed; deployed closeout needs the production target and access
- [ ] **m36** — [List the hosted MCP server on the official MCP Registry](./blocked/m36/README.md) (10 tasks) ← [ADR 019](../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md) open question "which directory comes first"; user decision 2026-10-02 to start with the easiest marketplace; registry research 2026-10-03 — **blocked:** t001–t005 and t007–t009 shipped; t006 needs the operator to set the production proof and the GitHub secret and publish, then t010 closes out

## Dropped

- ~~**m32**~~ — What's new on /ledger: localized changelog releases with unread flags — dropped 2026-09-21: the plan was written before implementation changed the design, and three of its done criteria no longer describe anything we want — a three-item blog rail, a ledger-shell header entry, and advancing the read watermark merely by leaving the page. What shipped instead is smaller: `/ledger` is two sections, What's new over Activity, with the blog dropped from the dashboard entirely (it publishes ~20 posts a day and none carry a `beancount` tag, so no collapsing made it worth the space), and the read position kept per device in local storage. The backend gained a `CHANGELOG` feed source with per-locale fetch, English fallback, and blog de-duplication, and no persistence. Re-file if the remaining ideas are wanted; the shipped work is in git history.
- ~~**m33**~~ — What's new everywhere: ledger-shell entry point and cross-device seen state — dropped 2026-09-21: the server-side changelog watermark was removed before shipping. Its only unique benefit was a mobile unread indicator, and the mobile home feed cannot load at all because `USER_SOCIAL_FEED_READ` is session-only while the app authenticates with OAuth (policy predates this work, `f07b3f79`). The dashboard now tracks its reading position in local storage, so no `users` column, migration, mutation, or authorization action is needed. The ledger-shell entry point was also built and removed: an icon-only control with an unread dot was judged not worth the header space.

## Cross-queue promotions and follow-ups

- [036](./blocked/036.md) — Mention the MCP Registry listing in the root and backend READMEs once `io.beancount/beancount` is live. Found during m36 t007 — **blocked:** waits on m36/t006 (the registry still answers 404)
- [034](./blocked/034.md) — Ledger counts read from one upstream page: the tier ledger-limit check counts owned ledgers inside the first 10 accessible ones, and `ledgersUsed` and the activity feed stop at 50. Found during m34. — **blocked:** repository owner must decide grandfathering before accurate counts tighten creation eligibility.
- [008](./done/008.md) — MCP prompts from the ledger skills: implemented on 2026-09-12. [w5/m5](../w5/blocked/m5/README.md) retains the approved proposal's remaining real-client verification and repairs for demonstrated workflow gaps; the completed implementation remains archived here.
- [009](./blocked/009.md) — Agent eval harness: core scope promoted to [w5/m4](../w5/done/m4/README.md) on 2026-09-12. Only the larger Plaid sandbox journey remains open here as a deferred follow-up. — **blocked:** needs sizing approval and a hosted QA-account path to link a Plaid sandbox item

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
