# w3 · m9 — Restore defense in depth on the Plaid services

**Worker:** worker3 **Goal:** A Plaid service method authorizes as the caller who invoked it, not as a full-power session — so the transport scope gate stops being the only thing standing between a narrow token and a bank connection. **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Thread the caller's identity through `IPlaidItemService` | 45m | — | — **DONE**
| t002 | Same for `IPlaidSyncService`, and name the system path at the scheduler | 45m | t001 | — **DONE**
| t003 | Simplify | 20m | t002 | — **DONE**
| t004 | Test coverage | 45m | t002 | — **DONE**
| t005 | Closeout | 20m | t004 | — **DONE**

## The problem, precisely

Every Plaid service method takes `userId: string` and authorizes with `trustedIdentity(userId)`:

```ts
// identity.ts
export function trustedIdentity(userId: string): Identity {
  return { userId, method: "session", scopes: EMPTY_SCOPES, capabilityExempt: true };
}
// op-class.ts — capabilityExempt short-circuits to allowed: true
```

So `authorizeLedger` inside the service checks ledger *membership* and never scope. For GraphQL that is harmless — a browser session is full-power by construction, which is exactly what `capabilityExempt` was written to express. For a scoped token it means **the transport gate is the only enforcement**, and these are the verbs that sever a bank connection, call a third party on the customer's behalf, and write real transactions.

The ledger services do not have this shape: they take the caller's `Identity` and hand it to `authorizeLedger`, so a narrow token stays narrow all the way down.

## What this does not do

**It does not delete `trustedIdentity`.** The scheduler (`plaid-sync-job`, `plaid-webhook-processor-job`) calls these services with no request identity at all — a cron run has no caller — and that is a legitimate need. The fix is to make the exemption **a decision visible at the call site** instead of an invisible default inside every method: request paths pass the identity they already hold, and the scheduler passes an explicitly-named system identity.

## Definition of done

`IPlaidItemService` and `IPlaidSyncService` take `identity: Identity` where they took `userId: string`; every request-driven call site passes the caller's real identity; the scheduler and webhook processor pass an explicitly-named system identity, so `grep` finds every place the exemption is claimed; a test proves a `ledger.read`-only token is refused a write-tier Plaid verb *by the service*, not only by the transport gate; `yarn test`, `yarn lint`, `yarn typecheck` pass.

## Closeout notes (2026-08-25)

**Done:** `IPlaidItemService` (16 methods) and `IPlaidSyncService` (4) take `identity: Identity`; the two `assertLedger*` helpers pass it straight to `authorizeLedger`. `systemIdentity` is exported and used at the scheduler and webhook call sites, so `grep systemIdentity` enumerates every remaining claim. No `trustedIdentity` call survives in either Plaid service — only the comments explaining what changed.

**Five more sites outside Plaid claim the same exemption**, found by the DoD's grep and left in place because they are outside this milestone:

```
src/features/ledger/workflow/ledger-receipt-workflow.ts   ×2
src/features/ledger/workflow/ledger-workflow.ts           ×1
src/features/llm/service/llm-service.ts                   ×2
```

Each deserves the same read: does a caller exist at that point, or not? Worth its own milestone rather than a drive-by — they are workflows, not services, and the answer may legitimately differ.

**A verification hole I was relying on, now closed.** I had been counting type errors with `tsc … | grep -c "error TS"`. `tsc` colorizes its output, so the string is actually `error<ESC>[0m<ESC>[90m TS2304` and that grep matches almost nothing — it reported **0 errors on a file with an undefined variable**. Every check in this milestone used `--pretty false`. Anything earlier that leaned on that grep alone was not verified as strongly as it looked; the `yarn typecheck` runs were fine, since yarn fails on a non-zero exit.

## Source + Goal linkage

- **Source:** found while deciding w3/m8/t001 — "handing an agent the same reach a dashboard has is a decision, not a port". Deciding it surfaced that the reach is currently wider than the gate suggests.
- **Goal linkage:** **A1 — agent-native accounting.** m8 puts the bank-import family in front of agents. An agent holding a narrowed credential should be narrowed everywhere, not only at the door. Shipping m8 on the current shape would mean the first genuinely destructive verbs an agent can reach are also the ones with the least depth behind them.
- **Expected outcome:** A scoped credential is enforced twice — at the gate and in the service — for every Plaid verb, matching what the ledger services already do. Observable as a test that revokes at the service layer with the gate wide open.
- **Why now:** It is m8's prerequisite and it is cheaper before the port than after: fifteen verbs about to gain two new surfaces each, and every one of them would inherit the shallow shape.
- **Adoption surface task omitted:** nothing user- or agent-facing changes. This is an internal authorization refactor; the surfaces it protects arrive in m8.
