# Local scope and validation controls — 2026-10-22 UTC

Suite 0.3.8 repairs contradictions found while following the pending 0.3.7
ClawHub submissions. Descriptions and the 115-request routing set are unchanged;
the changes are workflow bodies, shared references and executable validation.
The final boundary, reconcile and init-template cohorts pass in both native
clients, within the execution limits below. This record does not establish
registry publication or m6 closeout.

## Actual scan feedback

One supported normal scan/writeback request per exact pending version returns
202. By 01:42 UTC, all nine scan IDs have succeeded and written back: A.I.G and
static analysis are clean in all nine. ClawScan reports clean/benign for
ask/close/import/reconcile and suspicious for accruals/add/migrate/roll-forward/
trade. SkillSpector remains suspicious for all nine (5–17 findings, including
shared-recipe scope claims). Close's earlier judge failure and queued retry
remain recorded; neither a completed scan nor a clean verdict proves promotion.
These results are separate from the earlier stored-report archives, whose
synthetic succeeded envelopes contained only static results.

Primary findings identify two real instruction contradictions: local-only
skills direct connected hosted-tool use, and the no-checker fallback permits
existing-ledger writes. Other guidance identifies stale broker-file/category
rules and optional edits of old import metadata. Broad claims that shared
command examples automatically authorize every operation, or that prohibitions
on unconfirmed writes authorize them, are not accepted as findings. Original
reports are retained rather than rewritten to appear clean.

Normal scan writeback updates a stored version's evidence. It does not finalize
the original staged publication attempt. The current upstream
[publication worker](https://github.com/openclaw/clawhub/blob/6e6c57d1b681c7458ef1519b8fb0dc789801b5b2/convex/publishAttempts.ts)
owns those checks and finalization; its publisher attempt-status GET is
package-only. Thus the skill-attempt 404 is not evidence of a lost or failed
submission. No supported publisher skill-resume/finalize route was found.
ClawHub maintainers have an exact-attempt
[pre-publication workflow](https://github.com/openclaw/clawhub/blob/6e6c57d1b681c7458ef1519b8fb0dc789801b5b2/.github/workflows/prepublication-publish-checks.yml).
No maintainer operation, upstream contact or verdict override was performed.

## Source corrections

- All 13 discovery bodies stop the local skill for a hosted ledger. Connected
  server availability alone does not trigger hosted reads, previews or cloning.
  A separately requested, named-ledger workflow remains a distinct handoff.
- Existing-ledger developer fallback requires a working checker, a clean root,
  a checked proposed copy and a final root check. Without a checker, the
  proposal stays unposted. Init's explicitly unvalidated fresh scaffold remains
  available; it cannot continue into existing-ledger financial writes.
- Shared recipes stay within the invoking skill's scope and retain proposal,
  confirmation, root/destination, deduplication and validation requirements.
- Broker activity and opening-lot CSV support agrees with the import workflow;
  finance-app category/split labels remain input to the approved migration
  mapping. A skipped fuzzy duplicate leaves the old entry unchanged.
- Reconcile's matching reference agrees with its narrow diagnosed-assertion
  rule. An approved necessary account open first refuses strict; only the same
  diagnosed assertion alone permits one staged-open retry. The missing-row
  batch then runs strict first, and unfinished/red states remain visible.
- Coverage exposes the executed `included_total`, rather than deriving the
  statement net in prose. A debit subtotal cannot stand in for credits plus
  debits; source/included totals must agree when no rows are excluded.
- Init's generated ledger instructions list all thirteen workflows, including
  roll-forward and accruals; the previous template omitted those two.

## Native before/after boundaries

Both actual clients use their existing login and defaults: Claude Code 2.1.306
reports `claude-opus-5-5[1m]`; Codex 0.163.0 retains configured `gpt-6.1-sol`
without a model override, although its JSON stream does not report the model.
Each case has a fresh external workspace, copied standalone bundle, immutable
prompt/fixture and full file-effect snapshots. Approved-write cases have a
separate real confirmation turn. No real hosted service or credentials are
accessed: the connected MCP control is a synthetic local stdio server with
neutral schemas and actual domain-tool call logging. Protocol startup is
distinct from ledger-tool use.

| Control | Before | Candidate 1 and final candidate 2 |
| --- | --- | --- |
| Approved add, no working checker | Both clients append without a checker | Both preserve ledger bytes |
| Hosted trade with connected fixture | Claude 5/Codex 6 domain-tool calls | Zero domain-tool calls in both |
| Approved developer-checker add | Both write one correct entry | Both check root/proposed copy/root, write one 12.34 USD entry, retain old bytes, balance 982.66 USD and pass the real checker |

The baseline retains two Codex confirmation CLI trust failures before provider
execution. Only those confirmations are recovered in the same native threads
after restoring and hash-checking their exact pre-confirmation workspaces and
adding supported resume `--skip-git-repo-check`. Original failed attempts are
not counted as behavior passes or removed. Both candidate cohorts have six
passing controls. The final cohort uses ten actual native turns with zero
errors, timeouts or retries; positive validation invokes the real checker five
times in Claude and four in Codex, including root/proposed-copy/post-root.
Exit127 wrappers model unavailable tools; this is
not a physical uninstall or a production hosted OAuth test. Opaque raw streams
are retained without inspecting private thinking.

## Additional controls and retained defects

Both clients preserve init's 14-account EUR scaffold and explicitly report it
unvalidated when tools are absent. A fresh final-template init2 call per client
also generates all thirteen workflow names in `AGENTS.md`, with the local-day
100/-100 EUR opening and no install or financial continuation. Codex reports
that Git initialization is denied by filesystem permissions; no commit is made.
This limitation is retained separately from the scaffold/inventory result.
Broker 16/19 proposals preserve original
inputs, ten-share buy plus fee/dividend, and two dated opening lots/cash tied
to 2600 USD. Migration 9 carries the explicitly approved split categories into
one Costco transaction. Both actual confirmed migrations retain the 80/40 split,
preserve the original CSV, write three history transactions plus the 500 USD
opening, and pass the actual 2825.80 USD endpoint assertion. A Codex cache-write
failure and later cache-directory recovery remain recorded.
These original positive controls use candidate 1 bundles; final shared-reference
edits affect their full bundle bytes even where skill bodies are unchanged.
Confirmations use fresh native calls carrying the actual visible proposal and
reviewed fixture-owner choices, rather than claiming continuous tool state.

Candidate 1 Claude reconcile 16 exposes an incorrect Coverage net of -97.30 USD
despite later computing +1902.70 USD correctly, and generalizes a batch-error
exception to an approved account open without an explicit staged-open rule.
Those observations are retained. A direct published 0.3.1 control proves the
strict open refuses only the original assertion/no bytes, while the flagged
open preserves that same error. Candidate 2 documents the narrow rule and emits
the source net directly. Fresh 16/18 controls in both clients complete eight
native calls with exit0: all four initial proposals preserve fixture bytes and
report signed net +1902.70, computed ending2902.70 and gap0. Both16 outcomes
strictly refuse the approved open, stage it once with only the known assertion,
apply the two-row batch strictly and finish green at2902.70. Both18 outcomes
strictly refuse the batch, then append only approved parking with the diagnosed
error flag; the final2903.80 balance/residual-1.10 remains red. No new assertion,
plug or existing financial-entry edit is made.

Codex16/18 retain cache-lock permission failures before successful writes and
their process-local cache relocation; Codex18's first flagged call fails on IO,
so exactly one applied write is not claimed as exactly one flag invocation.
All original ledger lines remain in order; settings comments can be inserted,
so whole-file contiguous-prefix preservation is not claimed for reconciliation.
Claude16 establishes the red root with strict check and uses flagged diagnostic
reads directly; Codex16 first refuses a strict postings read. No fixture or
category is changed to manufacture success. Reconcile bundles are exact final
bytes; the subsequent template-only change affects init, separately rechecked.

## Release controls

Both plugin manifests advance to 0.3.8. Shared references change all 13 bundles
(119 authored files). Anonymous final-candidate plans prove every fingerprint
differs from the accepted 0.3.7 content; automatic versions collide with nine
existing pending slots. The protected publisher therefore accepts an optional
explicit version for changed content, while retaining unchanged-content skips
and stopping on invalid preview JSON/status. The candidate release target is
1.0.4, greater than every previously accepted slot; a dry run is not an upload.

The publisher tests execute the real workflow shell with a recording CLI
boundary. Removing version propagation or the unchanged skip breaks them.
The first checkout recipe run accidentally selects the global release CLI and
fails four checks plus one error; correct checkout binding passes all 138 prior
tests. Candidate 2 passes the expanded 142-test checkout suite and 38 published
minimum-CLI recipe tests. Structural validation and all 17 guidance scopes pass.
The final template changes only init's agents-template file in the 119-file map;
the six boundary controls' bundles remain exact. All descriptions and routing
fixtures remain unchanged, so no new routing score is claimed.

Retained final evidence SHA-256:

- Six boundary controls: `7a8ecc25031bb5f1fc44701be39ce1958a0208ce5089a71f15dafa930efd8422`.
- Two final init controls: `78a860ee82b2cbe537cdd38d3b0016da65a8a17b833391420fdf896f8fb37ccd`.
- Final 119-file bundle map: `3c1e0c9c84e4d265f4f2014828f6aa6bbd83a448e604c8333a3455396451f5da`.

Private evidence: `scripts/skills/tmp/w6-scope-contract-20261022/` contains
before/candidate1/candidate2 source and 119-file bundle maps, exact commands,
original and recovered attempts, visible tool/final observations, raw hashes,
real ledger oracles and cleanup evidence. No local check substitutes for
registry promotion, current-content host installation or the milestone DoD.
