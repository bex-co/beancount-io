# w3 · m8 — Port the bank-import family to REST and MCP

**Worker:** worker3 **Goal:** Everything a customer does with an already-linked bank — list it, inspect it, map its accounts, sync transactions, submit them to the ledger, unlink it — is reachable from REST and MCP. The browser ceremony stays a browser ceremony; nothing after it does. **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Decide what an agent may do to a bank link, and under which scope | 45m | — |
| t002 | `v1Route` declarations for the in-scope bank verbs | 60m | t001 |
| t003 | The same set on MCP — reads as resources, writes as a grouped tool | 60m | t001 |
| t004 | Lower both ratchet ceilings, and prove they hold | 20m | t002, t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 20m | t005 |
| t007 | Test coverage | 30m | t005 |
| t008 | Closeout | 20m | t007 |

## The fifteen, and the three that stay out

**In scope** — ordinary operations on a bank that is already linked:

```
getPlaidItems · getPlaidItem · getPlaidAccounts · getPlaidAccountsForLedger
refreshPlaidItemStatus · unlinkPlaidItem · reconcilePlaidAccounts
updatePlaidAccountMapping · updatePlaidAccountCurrency
getUnsyncedPlaidTransactions · suggestPlaidTransactionCategories
suggestPlaidAccountMapping · syncPlaidTransactions
submitPlaidTransactionsToLedger · deletePlaidTransactions
```

**Out of scope, permanently** — the operation *is* the hosted widget (ADR 0008 D4): `createPlaidLinkToken`, `createPlaidUpdateModeLinkToken`, `exchangePlaidPublicToken`. A customer links a bank in a browser once; there is no API to expose for that, and this milestone does not pretend otherwise.

## Definition of done

The fifteen answer under `/api-gateway/v1/…` and are reachable on MCP in the form t001 decided; the three ceremony verbs remain `structural:` and unexposed; `plaidBinding` is narrowed to those three; both ratchet ceilings drop by fifteen with CI proving the numbers tight; every write is authorized per call and refused after revocation; a sync against a ledger the caller cannot reach is refused; `docs/openapi/v1.json` regenerated; `yarn test`, `yarn lint`, `yarn typecheck` pass.

## Why this family matters most, and why it needs a decision first

*Import my bank transactions into my ledger* is close to the whole job of bookkeeping, and it is the half an agent currently cannot do. It can read a ledger and edit it, but the transactions have to arrive by hand — so the agent does the tedious part and the human does the tedious part too.

That is also why t001 comes first rather than jumping to routes. Nine of the fifteen are `admin`-class, and `unlinkPlaidItem` severs a bank connection while `syncPlaidTransactions` reaches a third party holding the customer's financial data. **Handing an agent the same reach a dashboard has is a decision, not a port**, and it should be made deliberately — including the option of leaving some of the fifteen REST-only.

## Source + Goal linkage

- **Source:** `backend-cluster/backend-v2/docs/ADR0008-surface-parity.md` D4a. `plaidBinding` excused twelve verbs with an argument that reaches three; this milestone is what D4a's correction is *for*.
- **Goal linkage:** **A1 — agent-native accounting.** An agent that can pull a customer's bank transactions and reconcile them into a ledger does the work the product exists for; one that cannot is a text editor with opinions. Secondary **A2** — bank import is the shortest path from a newcomer's empty ledger to one with real data in it.
- **Expected outcome:** Fifteen verbs off both ceilings — 19% of the REST gap and 16% of the MCP gap — and the bank-import workflow becomes scriptable and agent-drivable end to end after a one-time browser link.
- **Why now:** It is the largest single block of customer-facing verbs still missing, and it was invisible until D4a: the whole family was excused by a reason true of three. Doing it after m6 and m7 means the porting pattern is proven before it meets a family with real authorization stakes.
- **Adoption surface task included:** these are endpoints a person and an agent call directly.

## Dependencies

t003 needs m5/t004's resource layer. t002 needs nothing. Best sequenced after m7 so the parameter shape from m7/t001 is settled — but the real prerequisite is t001, which is this milestone's own.
