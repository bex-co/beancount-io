# w3 · m54 — Ledger creation: staged creation flow on dashboard and mobile

**Worker:** worker3 **Goal:** the m53 setup specification becomes a staged, resumable creation flow on web and native, where accepting every default still reaches a valid private ledger unasked. **Status:** todo (t001–t006 done; t007 Closeout remains)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Build the staged dashboard creation flow — **DONE** | 120m | w3/m53/t005 |
| t002 | Build the same staged flow on mobile — **DONE** | 90m | w3/m53/t005, t001 |
| t003 | Separate the fictional demo from real starters — **DONE** | 45m | t001 |
| t004 | Adoption surface — **DONE** | 30m | t002, t003 |
| t005 | Simplify — **DONE** | 20m | t004 |
| t006 | Test coverage — **DONE** | 45m | t004 |
| t007 | Closeout | 10m | t005, t006 |

## Definition of done

- A customer who accepts every default reaches a valid private ledger without answering a question, on dashboard and on mobile.
- A customer who picks a preset, a non-USD currency, and a `known` opening balance reviews exactly the files and accounts m53's preview promised before confirming.
- Currency suggestion follows ADR021 precedence (explicit selection, native hint, single-currency region, USD); language alone never selects a currency, and a correction survives re-renders, starter switches, validation errors, back navigation, and OTP retries.
- Abandoning the flow mid-way and returning resumes without duplicating the ledger (creation replays on m53's `requestId`).
- The fictional Sample activity is a clearly labelled learning ledger, never mixed into a real starter; the web create button and Starter copy no longer promise what the Starter does not contain.

## Source + Goal linkage

- **Source:** `/pm-brainstorm w3` 2026-10-20 candidate 2, from [PRFAQ001](../../../docs/prfaqs/PRFAQ001-ledger-creation.md) and [ADR021](../../../docs/adrs/ADR021-backend-v2-ledger-creation-experience.md), which record the current one-shot form, the "Save" button, and the stale Starter copy as known defects.
- **Goal linkage:** A2 — Frictionless onboarding.
- **Expected outcome:** first-time users finish creation and record a first transaction instead of stalling on a four-field form that front-loads every decision. Signals: signup-to-first-transaction completion, creation-flow abandonment by stage.
- **Why now:** sequenced directly after m53, whose specification, preview, and idempotent create this flow consumes; building UI first would hard-code a contract that does not exist yet. Adoption surface is included (t004) because both clients' creation journeys change.

## Earlier block (resolved 2026-11-02)

- **t003** — the shipped demo separation (creation choice + in-ledger identity) is done; the remaining list-identification criterion waits on an API-visible demo flag on the ledger directory surfaces. Unblock condition is written in t003.

## Earlier block (2026-10-20, resolved 2026-11-02)

Closeout (t007) cannot run: the milestone's definition of done is not fully met. t003's remaining criterion — a demo ledger identifiable as fictional in ledger lists — waits on an API-visible demo flag on the ledger directory surfaces. The Starter-copy correction is complete in [648](../done/648.md), shipped2f11faa72; it is no longer an unblock condition. The dashboard QA follow-ups below also remain required for closeout.

**Unblock:** the ledger directory surfaces (REST/GraphQL/MCP in parity) expose a demo flag sourced from the ledger's `bcio_demo` identity or recorded at creation, then the list criterion and recorded dashboard QA gates pass. Who can clear it: whoever next extends the ledger directory read in backend-v2 (for the flag), the W4 repair owners and the dashboard QA loop (for the linked client checks).

## Dashboard QA follow-ups — 2026-10-21

Closeout must also verify [W4/314](../../w4/done/314.md) and [W4/315](../../w4/done/315.md), independently reproduced against the deployed/current LedgerForm. Details Next attempts CreateLedger before the separate final confirmation at desktop/narrow widths; the read-only guard stops every request before transport. Review also names the retained Personal preset for real Starter/Sample choices while the captured payload chooses the correct kind. No ledger is created. The concrete repairs are owned by those W4 records; do not duplicate implementation tasks here. These follow-ups keep the review-before-create and truthful-review acceptance open in addition to the existing directory/demo and copy blockers.

[W4/316](../../w4/done/316.md) adds independently repeated opening-account state evidence: Personal→Portfolio displays Decide later while retaining/sending the old Personal account; an enabled amount without an account is omitted. A valid Portfolio account restores a successful preview. This dashboard repair is separate from the completed native W21/106 fix and must also pass before closeout. All creation attempts are stopped before transport.

[W4/317](../../w4/done/317.md) adds controlled browser-clock evidence for the dashboard's remaining UTC default: Pacific evening Books begin/real preview open dates are tomorrow, while explicit local-date correction works. This is separate from the completed native W21/051 fix. Closeout must verify the local default without rewriting explicit/resumed dates; no actual ledger or transaction is created by these checks.

[W4/320](../../w4/done/320.md) adds fresh desktop/narrow failure-resumption evidence: an ordinary close/reopen keeps setup/requestId, but a caught creation failure deletes the saved draft; closing that review and returning loses the fields and mints a new requestId. Every attempt is aborted before transport. Its W4 repair must pass the failed-request close/return contract before this milestone closes; it is independent of314's premature Next submission.

The same320 record also contains an independent desktop ownership control: cancelling an unchanged existing-ledger edit preserves a parked creation draft, while a preblocked failed UpdateLedger deletes it and forces a new creation identity. This shared-form cleanup path attempts no CreateLedger and must preserve the creation draft as well.

[W4/321](../../w4/done/321.md) records the remaining Template-choice hint: step1 reuses the final Review's Go back instruction instead of explaining the ready-made chart/preset choice. Both widths reproduce while preset selection works. This is separate from648's completed Starter copy and the native W21/051 hint fix.

## Update 2026-11-01 (`/loopx w3`)

[w3/m60](../done/m60/README.md) replaced the creation surfaces the dashboard QA follow-ups above were filed against: both clients now create in two steps with no review page, no Books begin, and no Starter card. The behaviors those follow-ups protected are carried as tests there — create only from the final action (W4/314), the summary naming the chosen start (W4/315), opening accounts following the preset (W4/316), local-day dates (W4/317), and a failed create keeping its draft and `requestId` (W4/320); W4/321's Template hint went with the Starter/Template cards. Their re-verification belongs to m60's flows, not to this milestone.

**Remaining Unblock:** only t003's list criterion — a demo flag on the ledger directory surfaces (REST/GraphQL/MCP in parity) and the badge in both clients' ledger lists — then closeout. Choosing the flag's source (read `bcio_demo` per listed ledger, or record it at creation) is the open contract decision. Who can clear it: whoever next extends the ledger directory read in backend-v2.

## Unblocked 2026-11-02 (`/unblock w3`)

The last blocker is cleared by an owner decision. Ledger lists do not need a demo badge, because the in-ledger demo identity is enough. So t003 is closed without a directory demo flag, and no backend contract is needed. The dashboard QA follow-ups were already carried by m60 (update above). Next: t007 Closeout. Verify the definition of done on the current creation flow, then run `/pm done w3/m54/t007`.
