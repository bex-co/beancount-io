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
- [x] **m18** — [Bind ledger pins to the repository ID](./done/m18/README.md) (9 tasks) ← promoted from `w23/065` 2026-11-01
- [x] **m19** — [Fill balances.discrepancy from the validator](./done/m19/README.md) (8 tasks) ← promoted from `w23/196` 2026-11-01
- [x] **m20** — [Diff the BQL engine against stock beanquery in a release gate](./done/m20/README.md) (8 tasks) ← `/pm-brainstorm for w23` 2026-11-05; prerequisite [212](./done/212.md) shipped first
- [x] **m21** — [Guard write-preview behavior with a parity matrix](./done/m21/README.md) (8 tasks) ← `/pm-brainstorm w23` 2026-11-05, proposal 1
- [x] **m22** — [Refuse NUL bytes in every string parameter by contract](./done/m22/README.md) (6 tasks) ← `/pm-brainstorm w23` 2026-11-05, proposal 2
- [x] **m23** — [Stress every parameter with hostile values, not just NUL](./done/m23/README.md) (8 tasks) ← `/pm-brainstorm w23` 2026-11-07, proposal 1
- [x] **m24** — [Replay the MCP contract against production in one command](./done/m24/README.md) (7 tasks) ← `/pm-brainstorm w23` 2026-11-07, proposal 2
- [x] **m25** — [Slim down tools/list](./done/m25/README.md) (7 tasks) ← `/pm-brainstorm w23` 2026-11-07, proposal 3
- [x] **m26** — [Give dry_run previews their own wider rate bucket](./done/m26/README.md) (8 tasks) ← `/pm-brainstorm w23` 2026-11-07, proposal 5; owner decision to widen (reverses [222](./done/222.md))
- [x] **m27** — [Replay the m23 and m26 contracts against production](./done/m27/README.md) (7 tasks) ← `/pm-brainstorm w23` 2026-11-07, proposal 1
- [x] **m28** — [Give every paginated read one has-more envelope](./done/m28/README.md) (9 tasks) ← `/pm-brainstorm w23` 2026-11-07, proposal 2
- [x] **m29** — [Add preview-commit, stale-hash and filter journeys to the agent eval](./done/m29/README.md) (8 tasks) ← `/pm-brainstorm w23` 2026-11-07, proposal 3; hosted baseline waived by owner 2026-11-07
- [x] **m30** — [Make every MCP failure carry an actionable hint](./done/m30/README.md) (7 tasks) ← `/pm-brainstorm w23` 2026-11-07, proposal 4
- [x] **m31** — [Validate every MCP tool result against its published outputSchema](./done/m31/README.md) (8 tasks) ← promoted from `w23/230`; `/pm-brainstorm for w23` 2026-11-08, proposal 1
- [x] **m32** — [Make the MCP endpoint answer every HTTP verb and header consistently](./done/m32/README.md) (8 tasks) ← `/pm-brainstorm for w23` 2026-11-08, proposal 2; absorbs `w23/229`
- [x] **m33** — [Make every tool, parameter and recipe the docs and hints name resolve](./done/m33/README.md) (8 tasks) ← `/pm-brainstorm for w23` 2026-11-08, proposal 3
- [x] **m34** — [Make a ledger timeout tell the agent what happened and how to retry](./done/m34/README.md) (8 tasks) ← `/pm-brainstorm for w23` 2026-11-08, proposal 4; from `w23/done/209`
- [ ] **m35** — [Offer argument completion for MCP prompts and resource templates](./blocked/m35/README.md) (8 tasks) ← `/pm-brainstorm for w23` 2026-11-08, proposal 5; evidence-gated — **blocked:** no evaluated host is known to send `completion/complete`; needs an observed host call (billed agent-eval run) before building
- [x] **m36** — [Give the same bad call the same failure on REST, GraphQL and MCP](./done/m36/README.md) (9 tasks) ← `/pm-brainstorm for w23` 2026-11-10, proposal 4; absorbs `w1/194`, `w1/205`
- [x] **m37** — [Turn the numeric claims in docs/mcp.md into executable checks](./done/m37/README.md) (8 tasks) ← `/pm-brainstorm for w23` 2026-11-10, proposal 5; absorbs `w1/200`, `w1/203`, `w1/196`
- [x] **m38** — [Key every per-ledger mechanism on one canonical ledger identity](./done/m38/README.md) (9 tasks) ← `/pm-brainstorm more for w23` 2026-11-10, proposal 1; user request via /pmx, 2026-11-10; user routed to w23; absorbs `w1/234`, `w1/235`
- [x] **m39** — [Prove a preview and its commit give the same verdict](./done/m39/README.md) (10 tasks) ← `/pm-brainstorm more for w23` 2026-11-10, proposal 2; user request via /pmx, 2026-11-10; user routed to w23; absorbs `w1/236`, `w1/227`
- [x] **m40** — [Run what the served text tells an agent to run](./done/m40/README.md) (10 tasks) ← `/pm-brainstorm more for w23` 2026-11-10, proposal 3; user request via /pmx, 2026-11-10; user routed to w23; absorbs `w1/224`, `w1/226`, `w1/230`
- [x] **m41** — [Diff the report engine against stock beancount in a release gate](./done/m41/README.md) (9 tasks) ← `/pm-brainstorm more for w23` 2026-11-10, proposal 4; user request via /pmx, 2026-11-10; user routed to w23; absorbs `w1/229`
- [x] **m42** — [Name the commit every write makes, and let an agent undo it](./done/m42/README.md) (10 tasks) ← `/pm-brainstorm more for w23` 2026-11-10, proposal 5; user request via /pmx, 2026-11-10; user routed to w23; source `w1/228`
- [x] **m43** — [Accept directive metadata on every typed entry and gate the journal round trip](./done/m43/README.md) (9 tasks) ← `/pm-brainstorm more for w23` 2026-11-10, proposal 6; user request via /pmx, 2026-11-10; user routed to w23; absorbs `w1/233`
- [ ] **m44** — [Get every MCP result to text-only and tools-only hosts in full](./m44/README.md) (10 tasks) ← user report 2026-11-08 (claude.ai connector showed only summaries; root cause fixed in `f58c89d64`) and the 2026-11-13 MCP channel review

## Dropped

- ~~**m17**~~ — Make createPullRequest work reliably — dropped 2026-11-02 (future maybe): production ledgers carry the deliberate main-only branch policy (`repo-branch-policy.ts`: catch-all rule `*` with push disabled), so Gitea refuses the temporary `pr-patch-*` branch every pull request needs, whether created alone or inside the commit (verified on production 2026-11-01/02). Owner decision 2026-11-02: keep the main-only policy. t001–t007 (single-commit flow, parity, docs, tests) had shipped and stay in the code. Revisit only if the owner later allows a `pr-patch-*` branch rule
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

- [x] [072](./done/072.md) — concurrent writes (append, add entries, exact-text edits) still lose with `SERVICE_UNAVAILABLE` on production after w23/017; the production lost-race signature differs

- [x] [207](./done/207.md) — read-only credential gets `NOT_FOUND`/`BAD_USER_INPUT` not `FORBIDDEN` from `deleteLedgerFiles`/`updateLedgerFiles` for a missing file or non-matching edit (REST 403); authorization runs after `prepare()`
- [x] [208](./done/208.md) — non-string `cursor` on tools/list, resources/list, resources/templates/list and prompts/list answers `-32603` with a raw Zod dump; other methods answer `-32602` `BAD_USER_INPUT`
- [x] [209](./done/209.md) — ledger-backed calls failed ~12 min starting at a 100 KB `runBqlQuery`; cause unverified, needs a non-production reproduction
- [x] [210](./done/210.md) — a NUL byte in `q` (catalog search), `username` (`social/profile`) or `collaborator` answers `SERVICE_UNAVAILABLE`/`INTERNAL_SERVER_ERROR`, not `BAD_USER_INPUT`
- [x] [211](./done/211.md) — ledger search `private` param is an effective no-op, confusingly overlapping with the real exclusive filter `isPrivate`
- [x] [212](./done/212.md) — BQL `FROM <column> <operator…>` (`FROM year > 2026`, `FROM date > …`, `FROM account ~ …`) is wrapped as a table and refused with a bogus `syntax error at position ~325` on all surfaces (regression from the FROM-fold rewrite)
- [x] [213](./done/213.md) — MCP endpoint accepts an empty JSON-RPC batch `[]` with `202` instead of `-32600 Invalid Request` (`mcp-route.ts:134` `every()` is vacuously true)
- [x] [214](./done/214.md) — `well-known-route.test.ts` registry-listing test fails on clean `main` (`server.json` 1.0.1 vs manifest/`serverInfo` 1.0.0; the test couples two version lifecycles)
- [x] [215](./done/215.md) — BQL `sum(1)` reports dtype `Decimal` where stock reports `int` (cell value agrees; found by the m20 oracle replay)
- [x] [216](./done/216.md) — BQL names a boolean-literal column `true` where stock keeps the source spelling `TRUE` (header text only; found by the m20 oracle replay)
- [x] [217](./done/217.md) — MCP `createLedgerFiles` CONFLICT hint says to overwrite "with `replace`", which no published MCP tool has (legacy `editLedgerFiles` wording at `ledger-repo-service.ts:514`)
- [x] [218](./done/218.md) — a NUL byte in a bank id (`accountId`, `itemId`, `transactionIds`) answers `INTERNAL_SERVER_ERROR`/`SERVICE_UNAVAILABLE`, not `BAD_USER_INPUT` (w23/210 class; found by MCP QA 2026-11-05)
- [x] [219](./done/219.md) — `appendLedgerText` `dry_run` previews an unbalanced transaction as a success while the commit is refused `UNBALANCED` (sibling `addLedgerEntries` refuses on `dry_run`; found by MCP QA 2026-11-05)
- [x] [220](./done/220.md) — a NUL byte in a file-tool commit message (`message`/`description`) answers `SERVICE_UNAVAILABLE` on commit while `dry_run` accepts it (w23/210 class; sibling of 218; found by MCP QA 2026-11-05)
- [x] [221](./done/221.md) — `updateEntrySource`/`deleteEntrySource` previews need `allowInvalid` to show a breaking edit; `addLedgerEntries` still refuses a budget on an unopened account on a preview 
- [x] [222](./done/222.md) — does a `dry_run` consume the write rate budget? measure it, then decide (preview-then-commit may cost double)
- [x] [223](./done/223.md) — backend-v2 `yarn lint:deadcode` is red on `main` (`isWithinRefreshReuseGrace`) and `CI (backend parity)` does not run it
- [x] [224](./done/224.md) — `make check-all` fails locally on a cluttered `$TMPDIR` (root-discovery budget), a nested `uv` picking CPython 3.15, and sandboxed signal tests
- [x] [225](./done/225.md) — backend-v2: format the 62 files prettier flags and gate `prettier --check` in CI (backend parity)
- [x] [226](./done/226.md) — table-driven test: every `ErrorCategory` maps to one MCP code and one HTTP status on REST, GraphQL and MCP
- [x] [227](./done/227.md) — `importStagedBankTransactions` retry after a lost reply: pin the error and document or reword it
- [x] [228](./done/228.md) — `docs/mcp.md`: short agent happy-path recipe after "Connect a client"
- [x] [232](./done/232.md) — REST and GraphQL refuse the owner-case variant of a pinned ledger that MCP admits (found by the m38 audit; from source, repro unverified)
- [x] [233](./done/233.md) — a file-write gate reads an unreadable baseline as "no errors", so every existing error reads as new (found by the m39 review; from source)
- [x] [234](./done/234.md) — REST and GraphQL rename return no validation block; MCP's rename does (found by the m39 review)
- [x] [235](./done/235.md) — the read-only QA token has two spellings (`QA_MCP_READ_ONLY_TOKEN` in the tooling, `QA_MCP_TOKEN_READONLY` in m31's Unblock line, which also puts keys on argv); check 5 and the read-only journey skip silently (found by MCP QA 2026-11-11)
- [x] [236](./done/236.md) — `entries-count` excludes managed price feed directives (Price 846 vs 936 in the journal and BQL, by design, ADR 015 §9) but the description and `docs/mcp.md` do not say so (found by MCP QA 2026-11-11)
- [x] [237](./done/237.md) — a one-character metadata key (`k`) passes the typed-entry token check and is refused late as `parse error: unexpected input (main.bean:90)`, where `Key` is refused up front by name; the published schema advertises no key pattern (found by MCP QA 2026-11-11)
- [x] [238](./done/238.md) — `addLedgerEntries` writes a `document`'s tags and links with no separator (`#t1#t2^l1^l2`), where stock beancount and the same tool's transactions use spaces; 20 of 21 typed variants match stock byte for byte (found by MCP QA 2026-11-11)
- [x] [239](./done/239.md) — `plaintext-journal` holds only transactions, balance assertions and pads (1132 of 2154 entries on the example ledger; faithful inside that scope) but no description or `docs/mcp.md` says so (found by MCP QA 2026-11-11)
- [x] [240](./done/240.md) — hosted bean-check differs from stock beancount on 5 of ~90 constructs: the engine accepts an unquoted booking method, duplicate `commodity` directives and duplicate metadata keys; `appendLedgerText` refuses slash dates and multi-line strings (found by MCP QA 2026-11-11)
- [x] [241](./done/241.md) — the API's make-public preview warns only "readable by anyone"; the dashboard's confirmation names files and history, and commit history exposes each author's email (found by MCP QA 2026-11-11)
- [ ] [242](./242.md) — `revertCommit` answers `INTERNAL_SERVER_ERROR` for every existing commit on MCP, REST and GraphQL on production after the 2026-11-12 deploy (unknown sha is a clean `NOT_FOUND`, a read-only key `FORBIDDEN`); `yarn mcp:conformance` has no check for it (found by MCP QA 2026-11-12)
- [ ] [243](./243.md) — `readLedgerFiles` returns a whole file when no range is given, and since `f58c89d64` that file also lands in the text block; decide on a bound that cannot lead to a truncated write-back (found in the 2026-11-13 MCP channel review)
