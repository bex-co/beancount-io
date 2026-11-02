# w23 — Worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty.

## Milestones

- [x] **m1** — [Fence concurrent same-entry updates](./done/m1/README.md) (7 tasks) ← promoted from `w23/085` 2026-10-25
- [x] **m2** — [Fix the journal filter mini-language](./done/m2/README.md) (8 tasks) ← promoted from `w23/089` 2026-10-26
- [x] **m3** — [Unify mutation-tool parameter naming](./done/m3/README.md) (7 tasks) ← promoted from `w23/090` 2026-10-26
- [x] **m4** — [Guard deleting an included file](./done/m4/README.md) (7 tasks) ← promoted from `w23/091` 2026-10-26
- [x] **m5** — [Handle oversize BQL queries](./done/m5/README.md) (8 tasks) ← promoted from `w23/092` 2026-10-26
- [x] **m6** — [Complete the typed entry schema](./done/m6/README.md) (10 tasks) ← promoted from `w23/094` 2026-10-26
- [x] **m7** — [Preview every mutation with dry_run](./done/m7/README.md) (9 tasks) ← promoted from `w23/095` 2026-10-26
- [x] **m8** — [Unify bank-tool parameter naming](./done/m8/README.md) (8 tasks) ← promoted from `w23/096` 2026-10-26
- [x] **m9** — [Unify the universal write-flag spellings](./done/m9/README.md) (8 tasks) ← promoted from `w23/097` 2026-10-26
- [x] **m10** — [Unify the account-journal param spellings](./done/m10/README.md) (8 tasks) ← promoted from `w23/098` 2026-10-26
- [x] **m11** — [Unify the temp-asset object-key spellings](./done/m11/README.md) (8 tasks) ← promoted from `w23/100` 2026-10-26
- [x] **m12** — [Refuse unknown keys on every REST GET query](./done/m12/README.md) (8 tasks) ← promoted from `w23/113` 2026-10-26
- [x] **m13** — [Preview lifecycle mutations with dry_run](./done/m13/README.md) (9 tasks) ← promoted from `w23/120` 2026-10-26
- [x] **m14** — [Render NULL cells honestly in BQL results](./done/m14/README.md) (8 tasks) ← promoted from `w23/122` 2026-10-27
- [x] **m15** — [Gate file writes on new bean-check errors](./done/m15/README.md) (7 tasks) ← promoted from `w23/149` 2026-10-30
- [x] **m16** — [Disclose unpriced report conversions](./done/m16/README.md) (7 tasks) ← promoted from `w23/180` 2026-10-30
- [ ] **m17** — [Make createPullRequest work reliably](./blocked/m17/README.md) (8 tasks) ← promoted from `w23/082` 2026-10-31 — **blocked:** t008 needs a fresh QA key (the `.env` token returns 401), then a rerun of the original repro against the deployed build
- [ ] **m18** — [Bind ledger pins to the repository ID](./blocked/m18/README.md) (9 tasks) ← promoted from `w23/065` 2026-11-01 — **blocked:** t009 needs a fresh QA key (the `.env` token returns 401), then a rerun of the rename repro
- [ ] **m19** — [Fill balances.discrepancy from the validator](./blocked/m19/README.md) (8 tasks) ← promoted from `w23/196` 2026-11-01 — **blocked:** t008 needs a fresh QA key (the `.env` token returns 401), then a rerun of the repro

## Dropped

- ~~**046**~~ — social follower/following/starred lists answer an unknown user with an empty success — dropped 2026-10-21: documented behavior (`backend-cluster/backend-v2/docs/mcp.md`, social reads: "returns an empty page on upstream failure, so an empty result does not establish that the user has no followers or stars")
- ~~**088**~~ — `appendLedgerText` ignores its documented `pushtag`/`pushmeta` handling — dropped 2026-10-25: invalid probes; dated push/pop is a syntax error in real beancount too (verified on PyPI beancount 3.2.3), and undated push/pop applies tags, consumes the lines, and refuses unbalanced pops naming the line, exactly as documented
- ~~**126**~~ — `meta` dict cells render as blank `str` on every surface — dropped 2026-10-27: dup of `w23/blocked/022.md` line-59 coverage (engine yields null for meta cells; parity triple + entry control recorded there)

## Inbox

- [x] [151](./done/151.md) — BQL refuses post-`;` tails stock drops (strictness is right; trailing `--` comments swept up)
- [x] [152](./done/152.md) — same-type composite equality escapes 128's guard on bare `weight`/`amount`/`other_accounts`/`accounts` (constant-False; stock refuses)
- [x] [153](./done/153.md) — ledger projects numeric `id`s where stock projects hash hex strings (silent value + type change)
- [x] [154](./done/154.md) — BQL `+` refuses string concatenation stock performs (`'a'+'b'` → `ab`)
- [x] [155](./done/155.md) — BQL `str()` refuses composite inputs stock stringifies (position, inventory, set)
- [x] [156](./done/156.md) — report `conversion` silently ignores unresolvable targets (`BOGUS`/unpriced → USD figures, no error)
- [x] [157](./done/157.md) — double-quoted identifiers silently become string literals outside FROM (`"account"` → `account`)
- [x] [159](./done/159.md) — report `interval` ignored on four surfaces, unvalidated on the fifth (`month`≡default, `BOGUS`≡`month`)
- [x] [160](./done/160.md) — decimal literals past Decimal precision silently round to fit (`...334.9`→MAX; stock exact)
- [x] [161](./done/161.md) — `allowInvalid:true` suppresses error detection, not just refusal (`errorsAfter: 0` for invalid content)
- [x] [162](./done/162.md) — BQL rejects Unicode whitespace stock accepts (NBSP/VTAB/EMSP), bogus position-0 error
- [x] [163](./done/163.md) — typed balance pre-check ignores `cost`/`totalPrice`, refuses stock-valid transactions (`@` passes, `{}`/`@@` cannot)
- [x] [164](./done/164.md) — statically type SELECT expressions for empty/all-NULL dtypes (literals/columns/functions/operators; kills the `row_number` phantom)
- [x] [165](./done/165.md) — BQL refuses date arithmetic stock supports (`date ± int` day shifts, `date − date` day count)
- [x] [166](./done/166.md) — mid-period `FROM OPEN ON` drops stock's opening-summary rows (26/36, 0/12; CLOSE ON clean)
- [x] [167](./done/167.md) — bare `price` flips Amount→`str` on all-NULL/empty (no Amount name rule; 136/164 cover neither)
- [x] [168](./done/168.md) — text results render zero rows as the empty string (no headers, no marker; empty-marker decision)
- [x] [169](./done/169.md) — `weight`/`account_balance` dtypes flip on empty (wrong-family rule / missing rule; stock says Amount)
- [x] [170](./done/170.md) — BQL `meta` splits by table (`k: v`/`str` postings vs `k=v`/`object` entries; stock one dict)
- [x] [171](./done/171.md) — typed posting tags/links render stock-invalid beancount; backend check blind, reads blank (m6 "holds live" disproven)

- [072](./blocked/072.md) — concurrent writes (append, add entries, exact-text edits) still lose with `SERVICE_UNAVAILABLE` on production after w23/017; the production lost-race signature differs — **blocked:** deployed per the owner; the rerun needs a fresh QA key (the `.env` token returns 401)

- [x] [207](./done/207.md) — read-only credential gets `NOT_FOUND`/`BAD_USER_INPUT` not `FORBIDDEN` from `deleteLedgerFiles`/`updateLedgerFiles` for a missing file or non-matching edit (REST 403); authorization runs after `prepare()`
- [ ] [208](./208.md) — non-string `cursor` on tools/list, resources/list, resources/templates/list and prompts/list answers `-32603` with a raw Zod dump; other methods answer `-32602` `BAD_USER_INPUT`
- [ ] [209](./209.md) — ledger-backed calls failed ~12 min starting at a 100 KB `runBqlQuery`; cause unverified, needs a non-production reproduction
- [ ] [210](./210.md) — a NUL byte in `q` (catalog search), `username` (`social/profile`) or `collaborator` answers `SERVICE_UNAVAILABLE`/`INTERNAL_SERVER_ERROR`, not `BAD_USER_INPUT`
