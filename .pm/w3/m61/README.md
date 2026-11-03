# w3 · m61 — Retry-safe entry writes: one `requestId` contract across REST, GraphQL, and MCP

**Worker:** worker3 **Goal:** a caller that retries an entry write after a timeout or a dropped reply gets the first result instead of a duplicate entry, and no user experience gets worse than today's. **Status:** todo (t001–t007 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Backend: `requestId` idempotency on the three entry-write services — **DONE** | 150m | — |
| t002 | Contracts: REST, GraphQL, and MCP accept `requestId` in parity — **DONE** | 60m | t001 |
| t003 | Dashboard: every entry save sends a `requestId` and handles in-progress — **DONE** | 90m | t002 |
| t004 | Mobile: every entry save sends a `requestId` and handles in-progress — **DONE** | 90m | t002 |
| t005 | Adoption surface — **DONE** | 30m | t003, t004 |
| t006 | Simplify — **DONE** | 20m | t005 |
| t007 | Test coverage — **DONE** | 60m | t005 |
| t008 | Closeout | 10m | t006, t007 |

## Definition of done

Owner decision 2026-11-02 ([003](./source-003.md)): copy ledger creation's `requestId` idempotency (ADR021) to entry writes. Acceptance follows its "never worse than today" table:

- A call without `requestId` behaves exactly as today and never touches Redis.
- The same `requestId` and the same request within 24 hours returns the first result and writes nothing. The same id with a different request is refused as a validation error. A repeat while the first attempt is still writing gets a retryable in-progress answer. A failed write releases the id.
- **Redis unavailable:** the write proceeds unprotected and is logged; saving never fails because of the idempotency store.
- A crash between the commit and marking the record done never produces a duplicate.
- One `requestId` covers a whole bulk request. The three convergence points are `LedgerEntryService.addBulkEntries` (REST `/entries`, GraphQL `bulkEntries` and legacy `addEntries`, MCP `addLedgerEntries`), `appendDirectiveText` (REST `/directives/text`, GraphQL/MCP `appendLedgerText`), and `insertReceiptTransaction` (REST, GraphQL, MCP). All behave identically, with parity tests.
- Dashboard and mobile attach a `requestId` to every entry save and mint a new one whenever the content changes. A double-tap records one entry. On in-progress they retry automatically with bounded backoff, so the user sees "saving" and then success. After the bounded retries they say the entry may already be saved and refresh the journal, with no endless spinner.
- MCP tool descriptions, the REST/OpenAPI contract, and agent-facing docs tell callers to send a `requestId` on retries.

## Source + Goal linkage

- **Source:** promoted from [003](./source-003.md) (major, 2026-09-15). Unblocked 2026-11-02 by an owner decision; the full UX acceptance table is recorded there.
- **Goal linkage:** A1, agent-native accounting. Agents and API clients retry on timeouts, and a retry must never double-post to a ledger.
- **Expected outcome:** an MCP or API writer can resend a timed-out `addLedgerEntries` with the same `requestId` and get one entry. Web and mobile users who double-tap or retry after a slow save see one entry. Signals: duplicate-directive reports drop to zero, and the parity suite covers `requestId` on all three surfaces.
- **Why now:** the 90-second write timeout is only a mitigation, the decision was made 2026-11-02, and the creation-side mechanism (`ledger-workflow.ts`) is a proven template. Adoption surface is included (t005) because API, MCP, and both clients change.
