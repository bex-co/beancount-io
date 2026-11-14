# w1 · m45 — Move entries to another file in one atomic commit

**Worker:** worker1 **Goal:** an agent splitting or reorganizing a hosted ledger ("put August in `2026/08.bean`") moves a set of entries into another file, creating it and adding its `include` when asked, in one previewed commit. The ledger's balances and errors are exactly what they were, and no intermediate state with an orphan file or a broken balance assertion is ever committed. **Status:** in progress (t001–t004, t006–t008 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Write the move contract — **DONE** | 30m | — |
| t002 | Move workflow: delete the slices, append to the target and include it, gated and committed once — **DONE** | 75m | t001 |
| t003 | `moveEntrySources` on MCP, REST and GraphQL, with parity rows — **DONE** | 60m | t002 |
| t004 | Document the operation, add a split-by-year recipe, and record the new tool for directory review — **DONE** | 30m | t003 |
| t005 | Move and undo on the hosted endpoint after the deploy | 30m | t004, t008 |
| t006 | Adoption surface — **DONE** | 30m | t004 |
| t007 | Simplify — **DONE** | 15m | t006 |
| t008 | Test coverage — **DONE** | 45m | t006, t007 |
| t009 | Closeout | 15m | t005, t008 |

Production verification (t005) runs after Test coverage so it checks the revision that closes the milestone, as w1/m41 did.

## Definition of done

- On a synthetic ledger where a `balance` assertion in `main.bean` depends on three August transactions, moving those three entries to a new `2026/08.bean` with `includeFrom: main.bean` previews `valid: true` with the diff of both files, and the real call makes exactly one commit and returns its `commit` sha.
- After the commit, the ledger's error list and every account balance are identical to before, the entries' text is byte-identical in the target, and `main.bean` includes the new file once.
- A target that no loaded file includes, with no `includeFrom`, is refused naming the fix, and nothing is written. A stale `sha256sum` for any listed entry refuses the whole move.
- REST, GraphQL and MCP accept the same inputs and return the same results and failures; the parity gate and `yarn test` pass in `backend-cluster/backend-v2`.
- t005 records a move and its `revertCommit` undo on the hosted endpoint, with the deployed revision.

## Source + Goal linkage

- **Source:** [w1/228](../blocked/228.md) (from `/qa-find-bugs-mcp`, 2026-11-10): moving entries between files "previews `valid:false` whenever a balance assertion spans the move. Only 'create the file, then rewrite the whole main file' works, and it leaves an orphan file in between." [w1/227](../done/227.md) made that orphan visible (`notLoaded`) but did not remove the two-step path; the atomic `createPullRequest` route is blocked ([w3/645](../../w3/blocked/645.md)). `/pm-brainstorm for w1`, 2026-11-13, item 4; routed by the user via `/pmx` the same day.
- **Goal linkage:** **A1 — Agent-native accounting:** an agent can restructure a hosted ledger the way people organize theirs, safely, in one reviewed step.
- **Expected outcome:** splitting a ledger by year or by account is one call and one commit, which `revertCommit` undoes. Signals: success of reorganize requests in MCP QA, no `notLoaded` orphans left from splits.
- **Why now:** it shares [m43](../m43/README.md)'s machinery (`changeFiles` plus the projected new-error gate), and [m44](../m44/README.md) lets an agent collect every entry's hash and `sha256sum` in one call. The owner decided on 2026-10-30 (w21/588) that file creation never auto-includes; this operation adds an `include` only when the caller names `includeFrom`, and otherwise refuses, as `appendLedgerText` does for an unloaded path (w23/035). [w23/242](../../w23/242.md) must be fixed and deployed before t005's undo. **Risk:** a new tool during the ChatGPT review ([w6/m11](../../w6/blocked/m11/README.md)), handled in t004 without resubmitting. Adoption surface is included because this adds an agent-facing tool and API.

## Out of scope

- Moving whole files (`renameLedgerFile` already does this).
- Reordering entries inside one file.
