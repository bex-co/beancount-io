# w1 · m43 — Rename an account across a hosted ledger in one previewed commit

**Worker:** worker1 **Goal:** an agent or app renaming `Assets:Bank:Checking` to `Assets:Bank:Main` on a hosted ledger makes one call on REST, GraphQL or MCP. It previews every line that would change, then commits once; every directive that named the account, or an account under it, now names the new one; bank-account mappings follow; and the commit can be undone with `revertCommit`. **Status:** blocked (t001–t005, t007–t009 done; t006 waits on a deploy; t010 waits on t006)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Write the rename contract — **DONE** | 30m | — |
| t002 | Rename workflow: a lexer-aware rewrite of every loaded file, gated and committed once — **DONE** | 90m | t001 |
| t003 | Bank-account mappings follow the rename — **DONE** | 45m | t002 |
| t004 | `renameAccount` on MCP, REST and GraphQL, with parity rows — **DONE** | 75m | t002, t003 |
| t005 | Document the operation and record the new tool for directory review — **DONE** | 30m | t004 |
| t006 | Rename and undo on the hosted endpoint after the deploy — **BLOCKED** (deploy) | 30m | t005, t009 |
| t007 | Adoption surface — **DONE** | 30m | t005 |
| t008 | Simplify — **DONE** | 15m | t007 |
| t009 | Test coverage — **DONE** | 45m | t007, t008 |
| t010 | Closeout | 15m | t006, t009 |

Production verification (t006) runs after Test coverage so it checks the revision that closes the milestone, as w1/m41 did.

## Blocked

**Milestone blocked 2026-11-13.** Everything but the hosted check is shipped and green: the workflow, bank mappings, the three surfaces with parity proof, the docs, adoption surfaces, Simplify and Test coverage. **Unblock:** backend-v2 deployed at or after `0b532b6e3`, plus [w23/242](../../../w23/242.md) deployed for the undo step. Then the worker runs t006 and closes t010. **Who can clear it:** the operator (deploy).

## Definition of done

- On REST, GraphQL and MCP, renaming an account on a multi-file synthetic ledger with `dry_run` returns every changed line per file and writes nothing; the same call without `dry_run` makes exactly one commit and returns its `commit` sha.
- After the commit, no posting or directive names the old account or an account under it; strings, comments and string metadata are byte-identical; `bean-check` has no error the ledger did not have; every account's balance under its new name equals the old balance.
- Prefix neighbours are untouched (renaming `Assets:Check` leaves `Assets:Checking` alone). A target that is already open, an invalid account name, or a stale ledger HEAD is refused with the documented code and nothing is written. A read-only credential is `FORBIDDEN`.
- Plaid account mappings that named the old account, or an account under it, name the new one after the commit, and the preview lists them.
- The operation is in the op-class registry and the surface-parity gate, the v1 OpenAPI snapshot and the CLI's pinned spec are regenerated, and `yarn test` passes in `backend-cluster/backend-v2`.
- t006 records a preview, a commit and a `revertCommit` undo of that commit on the hosted endpoint, with the deployed revision it observed.

## Source + Goal linkage

- **Source:** [w1/228](../../done/228.md) (from `/qa-find-bugs-mcp`, 2026-11-10): renaming an account on a hosted ledger "is only possible as a whole-file rewrite, because `old_string` must match exactly once". `/pm-brainstorm for w1`, 2026-11-13, item 2; routed by the user via `/pmx` the same day. No surface has an account rename today, so this is new capability on all three, not a parity gap. [w2/m46](../../../w2/blocked/m46/README.md) covers renames in the local `bea` skill only.
- **Goal linkage:** **A1 — Agent-native accounting:** an agent can reorganize a hosted ledger, not only append to it, with the same preview, new-error gate and undo every other write has.
- **Expected outcome:** "rename X to Y" is one previewed, reversible call instead of a hand-written whole-file rewrite per file. Signals: fewer whole-file `updateLedgerFiles` rewrites in MCP QA, and rename calls once shipped.
- **Why now:** w1/228 is blocked waiting for exactly this decision. The other half of that note shipped in [w23/m42](../../../w23/done/m42/README.md): every write returns its `commit` sha and `revertCommit` undoes one, so a multi-file rename can now be named and reversed. That undo currently fails in production ([w23/242](../../../w23/242.md)); t006 needs it fixed and deployed. **Risk:** the ChatGPT app is in review ([w6/m11](../../../w6/blocked/m11/README.md)); a new tool changes the reviewed list, so t005 records its annotations without resubmitting. Adoption surface is included because this adds an agent-facing tool and API.

## Out of scope

- Merging two accounts (renaming onto one that is already open).
- A dashboard or mobile rename UI.
- Rewriting account names inside strings, comments or string metadata.
