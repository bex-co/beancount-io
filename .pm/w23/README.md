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
- [ ] **m14** — [Render NULL cells honestly in BQL results](./m14/README.md) (8 tasks) ← promoted from `w23/122` 2026-10-27

## Dropped

- ~~**046**~~ — social follower/following/starred lists answer an unknown user with an empty success — dropped 2026-10-21: documented behavior (`backend-cluster/backend-v2/docs/mcp.md`, social reads: "returns an empty page on upstream failure, so an empty result does not establish that the user has no followers or stars")
- ~~**088**~~ — `appendLedgerText` ignores its documented `pushtag`/`pushmeta` handling — dropped 2026-10-25: invalid probes; dated push/pop is a syntax error in real beancount too (verified on PyPI beancount 3.2.3), and undated push/pop applies tags, consumes the lines, and refuses unbalanced pops naming the line, exactly as documented
- ~~**126**~~ — `meta` dict cells render as blank `str` on every surface — dropped 2026-10-27: dup of `w23/blocked/022.md` line-59 coverage (engine yields null for meta cells; parity triple + entry control recorded there)

## Inbox


- [149](./blocked/149.md) — file writes COMMIT bean-check-invalid content (no validation gate; entry writes refuse) [major] — **blocked:** commit-invalid documented on all surfaces; owner picks entry-style gate (→ milestone) vs documented behavior
- [150](./blocked/150.md) — journal subtype filters pass non-family directives through and `total` counts them (`pending` → 13 rows, 0 transactions) — **blocked:** family-scoping documented on all surfaces; owner picks narrow-to-matches, split counts, or documented passthrough
- [x] [151](./done/151.md) — BQL refuses post-`;` tails stock drops (strictness is right; trailing `--` comments swept up)
- [x] [152](./done/152.md) — same-type composite equality escapes 128's guard on bare `weight`/`amount`/`other_accounts`/`accounts` (constant-False; stock refuses)
- [x] [153](./done/153.md) — ledger projects numeric `id`s where stock projects hash hex strings (silent value + type change)
- [x] [154](./done/154.md) — BQL `+` refuses string concatenation stock performs (`'a'+'b'` → `ab`)
- [155](./155.md) — BQL `str()` refuses composite inputs stock stringifies (position, inventory, set)
- [156](./156.md) — report `conversion` silently ignores unresolvable targets (`BOGUS`/unpriced → USD figures, no error)
- [157](./157.md) — double-quoted identifiers silently become string literals outside FROM (`"account"` → `account`)
- [158](./158.md) — journal `time` passes all Opens through regardless of month (`2026-08` → 9 rows + 12 January Opens)
- [159](./159.md) — report `interval` ignored on four surfaces, unvalidated on the fifth (`month`≡default, `BOGUS`≡`month`)
- [160](./160.md) — decimal literals past Decimal precision silently round to fit (`...334.9`→MAX; stock exact)
- [161](./161.md) — `allowInvalid:true` suppresses error detection, not just refusal (`errorsAfter: 0` for invalid content)
- [162](./162.md) — BQL rejects Unicode whitespace stock accepts (NBSP/VTAB/EMSP), bogus position-0 error
- [163](./163.md) — typed balance pre-check ignores `cost`/`totalPrice`, refuses stock-valid transactions (`@` passes, `{}`/`@@` cannot)
- [164](./164.md) — statically type SELECT expressions for empty/all-NULL dtypes (literals/columns/functions/operators; kills the `row_number` phantom)
- [165](./165.md) — BQL refuses date arithmetic stock supports (`date ± int` day shifts, `date − date` day count)
- [166](./166.md) — mid-period `FROM OPEN ON` drops stock's opening-summary rows (26/36, 0/12; CLOSE ON clean)
- [167](./167.md) — bare `price` flips Amount→`str` on all-NULL/empty (no Amount name rule; 136/164 cover neither)
- [168](./168.md) — text results render zero rows as the empty string (no headers, no marker; empty-marker decision)
- [169](./169.md) — `weight`/`account_balance` dtypes flip on empty (wrong-family rule / missing rule; stock says Amount)
- [170](./170.md) — BQL `meta` splits by table (`k: v`/`str` postings vs `k=v`/`object` entries; stock one dict)
- [171](./171.md) — typed posting tags/links render stock-invalid beancount; backend check blind, reads blank (m6 "holds live" disproven)
- [172](./172.md) — entry-source tools mark `entryHash` optional but refuse calls without it, on MCP, REST, and GraphQL alike
- [173](./173.md) — MCP-only required-ness lies, bank-id (8 tools) and file-message (3 tools) aliases: schema optional, runtime required
- [174](./174.md) — `allowInvalid` commits syntactically unparseable text on the typed path (cost.date unvalidated); all three surfaces
- [175](./175.md) — bank-submit nested keys camel-only on REST/GraphQL while the MCP bank tool dual-accepts (w23/140 followup)
- [176](./176.md) — BQL column/alias references case-sensitive on the engine; stock case-insensitive (tables + functions agree)
- [177](./177.md) — string literals behind aliases still sniff dtypes (w23/146 followup)
- [178](./178.md) — REST stale-`sha` conflicts keep the generic entry hint (w23/147 followup)
- [179](./179.md) — `GROUP BY balance` silently collapses every inventory into one group
- [082](./blocked/082.md) — `createPullRequest` fails on production: Gitea 500 while creating the `pr-patch-*` branch, on MCP and REST alike — **blocked:** needs the Gitea server-log cause for one failing branch create (owner), then a production rerun
- [080](./blocked/080.md) — `/api-gateway/mcp` accepts any `Origin` (the MCP transport spec says a bad `Origin` MUST get 403); owner picks validate vs document — **blocked:** owner picks 403-on-foreign-Origin vs documented non-validation
- [075](./blocked/075.md) — typed BQL results return NULL as `""` (undocumented), so a missing payee or price reads as an empty string — **blocked:** documented as `""` (option a shipped); owner picks `null` on REST/MCP, `null` everywhere, or keeping `""`
- [072](./blocked/072.md) — concurrent writes (append, add entries, exact-text edits) still lose with `SERVICE_UNAVAILABLE` on production after w23/017; the production lost-race signature differs — **blocked:** needs one losing call's host status and body from the production ledger-service log (owner), then a post-deploy rerun
- [065](./blocked/065.md) — a ledger-pinned credential keeps the old name after a rename — **blocked:** owner picks repository-ID pins, canonical-name pins, or an accurate refusal (credential trust boundary)
- [059](./blocked/059.md) — every product-created ledger ships `auto_accounts`, so a misspelt account is silently opened — **blocked:** owner picks drop-plugin (which also limits AI categorization to existing accounts) vs report-new-accounts
- [022](./blocked/022.md) — report rustledger BQL gaps upstream (`cost(sum(position))`, `neg`/`filter_currency`, `meta('lineno')`, `AT value`, `BALANCES FROM`) — **blocked:** filing in an external tracker needs the user's approval
- [026](./blocked/026.md) — streaming archive route for MCP OAuth clients over 8 MiB (option 1 from 023) — **blocked:** an ADR 0007 trust-boundary decision for the owner
- [124](./blocked/124.md) — unquoted `FROM accounts` resolves table-first on MCP (12) vs column-first on stock (34) — **blocked:** owner picks ledger stock-parity (fold) vs table-first-everywhere (CLI w3/247 agreement)
