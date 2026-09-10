---
status: open # open -> planned (target /plan-draft consumed it) -> done (target plan executed)
date: 2026-09-10
target: beancount-io
origin_plan: .claude/plans/2026-09-10-sankey-balanced-cash-flow.md
plan:
---

# Handoff: `editLedgerFiles` silently drops all but the last `update` op per file

## Context

Surfaced while executing Phase E of the origin plan (rewriting `vanenshi/ledgers`
through the `beancount-local` MCP write tools). Three separate multi-op commits
reported success while applying only part of what was sent; the loss was caught only
because a task-level BQL gate disagreed with the reported result.

## Problem

Two defects in
`backend-cluster/backend-v2/src/features/ai-agent/tools/edit-ledger-files-tool.ts`.

**1. Commit path does not chain multiple `update` ops on the same path — silent write loss.**

- `projectContents` (the dry-run projection) chains correctly:
  `edit-ledger-files-tool.ts:128` bases each op on the previous op's result.
- The commit path does not: `edit-ledger-files-tool.ts:232` computes every op as
  `cached.content.replace(...)` against `fileCache` — the *original* file
  (`edit-ledger-files-tool.ts:198`) — and pushes a full-file `content` with the *same*
  `sha` for each op. The ledger service applies them in order, so **the last op wins and
  every earlier op on that file is discarded**.
- Nothing reports this. The tool returns `"Committed N change(s)"` and
  `"No new bean-check errors"`, because a dropped edit still leaves valid beancount —
  just wrong books. **The dry run is correct and the commit is not, so the preview lies**:
  a dry run of 6 ops showed all 12 intended line changes; the commit applied 6 of them.
- Observed 3/3 times with 2-op batches (E1, E2 1/3, E2 3/3 in the origin plan). Repaired
  by re-issuing each op in its own call.

**2. A 413 is reported to the caller as an availability error.**

- Each op carries a full base64 copy of the resulting file, so payload ≈ ops × filesize.
  Six ops on a ~180 KB `main.bean` produced 1,097,627 bytes against the ledger service's
  1,048,576 limit.
- Ledger service log: `{"message":"request entity too large","expected":1097627,` 
  `"limit":1048576,"path":"/ledgers/vanenshi/ledgers/change-files"}`.
- The caller instead sees `"commit failed: Ledger API is temporarily unavailable"`
  (`edit-ledger-files-tool.ts:155`), which reads as a transient outage and invites retry.
  Three retries were spent before the ledger service log revealed the real cause.

## Contract

- **Chaining.** Multiple ops targeting one path must compose, exactly as
  `projectContents` already does. Either build each op's content from the running
  projection, or collapse all ops for a path into a single `update` carrying the final
  projected content and one `sha`. `projectContents` is the reference semantics — commit
  and dry run must not diverge again.
- **No silent partial success.** If the commit cannot apply every op as sent, it must
  fail loudly. Two ops on the same path sharing a `sha` is a conflict, not an overwrite.
- **Payload.** Do not send N full copies of one file. Collapsing per path (above) fixes
  the common case; if a single file still exceeds the limit, surface that as a
  size/validation error naming the limit.
- **Error mapping.** A 4xx from the ledger service must not be reported as
  `"temporarily unavailable"`. Surface at minimum the status and the service's own
  message, so a 413/400 is distinguishable from a real outage and is not retried.

## Acceptance

- [ ] A single `editLedgerFiles` call with 2+ `update` ops on the same file applies
  **all** of them — regression test asserting the committed content, not just the
  returned summary.
- [ ] The committed result equals the `dry_run: true` projection for the same input
  (test asserting commit ≡ projection for a multi-op batch).
- [ ] A batch whose ops cannot all be applied returns an error rather than a success
  summary.
- [ ] A payload over the ledger service's body limit surfaces a size/validation error
  naming the limit — not `"temporarily unavailable"`; regression test on the error
  mapping for a 413 from `/ledgers/:owner/:name/change-files`.
- [ ] Manual: repeat the origin plan's E1 (comment block + account opens in one call)
  and confirm both land.
