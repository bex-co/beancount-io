# Bulk entry writes are not retry-safe after a false timeout

Mitigation for the original cold-start false 503: authenticated Fava clients
from `createFavaApi` now use a 90s write timeout (`FAVA_WRITE_TIMEOUT_MS`), so
a ~30s first budget write is less likely to abort after the ledger already
committed. Read/anonymous clients keep the 30s default.

Still open: `POST /entries/{owner}/{repo}/bulk` remains append-only with no
idempotency key. A genuine timeout (or network drop) after commit still lets a
manual retry duplicate the directive. Budgets collapse same-day duplicates in
the UI; other entry types would double-post visibly.

Severity: major for non-budget entry types. Estimate: half-day+ across ledger
contract + REST/GraphQL/MCP parity — keep as an inbox note until promoted.
Pillar: A1 — agent and API writers must be able to retry without corrupting the
ledger.

Earlier record: **Blocked 2026-09-15 by `/loop-worker w3`.** Still wanted: bulk entry writes remain append-only with no idempotency key, so a timeout after commit can duplicate on retry. The 90s write timeout is only mitigation. Fixing this properly needs one idempotency contract across REST, GraphQL and MCP (repo-wide surface-parity rule) — a product/API decision, not a single-package patch.

**Unblock:** decide the idempotency contract (key shape, storage, retry semantics) for all three surfaces, then `/pm unblock w3/003` and promote or implement. Who: maintainers / API owners.


**Unblocked 2026-11-02** (`/unblock w3`) — Owner decision: copy ledger creation's idempotency (`createLedger`'s `requestId`, ADR021; `backend-v2/src/features/ledger/workflow/ledger-workflow.ts`) onto entry writes. Callers may send an optional `requestId`. Under a per-user, per-ledger lock, Redis keeps `{requestHash, status: in-progress|done, result}` for 24 hours, keyed by user + ledger + requestId. The rules:
- same id and same request → the stored result, with no second write;
- same id and a different request → a validation refusal;
- a repeat while the first attempt runs → a retryable "in progress";
- a failed write releases the record.

The owner chose this over storing the id in the git commit, a sturdier option that costs about twice the work.

Owner requirement: **no user experience may be worse than today's.** These are acceptance criteria, each with a test:
- A call without `requestId` behaves exactly as today and never touches Redis.
- Dashboard and mobile attach a `requestId` on save. A double-tap records one entry, and the second tap silently gets the same result. A new id is minted whenever the form content changes, so users never see the id-conflict refusal.
- A retry while the first attempt runs: clients back off and retry automatically, so the user sees "saving" and then success. API/MCP callers get the retryable in-progress answer with a hint.
- A validation failure releases the id, so a corrected resubmit succeeds.
- **Redis unavailable:** the write proceeds unprotected and is logged; saving must never fail because of the idempotency store. This deliberately differs from ledger creation's strict store.
- Crash between the commit and marking the record done: never a duplicate. Clients stop retrying after a bounded number of tries, say the entry may already be saved, and refresh the journal; no endless spinner.
- One `requestId` covers a whole bulk request.
- REST, GraphQL and MCP (`addLedgerEntries`, `appendLedgerText`, and the bulk route) behave identically, with parity tests; CLI and agent docs recommend sending an id.

Next: this is more than an hour across backend-v2 and both clients, so promote it to a milestone (`/pm promote w3/003`) and implement.
