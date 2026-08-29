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
- [ ] **m14** — Centralized authz for billing and subscriptions (7 tasks) ← from user decision 2026-08-28 after m13
- [ ] **m15** — Centralized authz for the social graph and starring (7 tasks) ← from user decision 2026-08-28 after m14
- [ ] **m16** — Centralized authz for AI-assisted ingestion and assets (8 tasks) ← from user decision 2026-08-28 after m15
- [ ] **m17** — Centralized authz for ledger contents and reporting (9 tasks) ← from user decision 2026-08-28 after m16
- [ ] **m18** — Centralized authz for ledger administration and collaboration (8 tasks) ← from user decision 2026-08-28 after m17
- [ ] **m19** — Centralized authz for bank connections and transaction sync (8 tasks) ← from user decision 2026-08-28 after m18
- [ ] **m20** — Retire distributed authorization gates after domain cutovers (8 tasks) ← from user decision 2026-08-28 after m19
