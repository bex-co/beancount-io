# w3 · m6 — Port the ledger vocabulary reads to REST and MCP together

**Worker:** worker3 **Goal:** The eleven reads that tell a caller what a ledger *contains* — its payees, accounts, currencies, tags, links, narrations, years, commodities, events, errors, and metadata — are reachable from REST and from MCP, ported as one family rather than twice. **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | `v1Route` declarations for the eleven vocabulary reads | 45m | — | — **DONE**
| t002 | The same eleven as MCP resource templates | 45m | — | — **DONE**
| t003 | Lower both ratchet ceilings, and prove they hold | 20m | t001, t002 | — **DONE**
| t004 | Adoption surface | 20m | t003 | — **DONE**
| t005 | Simplify | 20m | t004 | — **DONE**
| t006 | Test coverage | 30m | t004 | — **DONE**
| t007 | Closeout | 20m | t006 | — **DONE**

## Amended during t001 — ten, not eleven

`Query.ledgerMeta` was in the family by name and does not belong in it by argument. It is a **legacy resolver**, kept for older mobile builds and on the removal path, and its `restExempt` says so: *"a public REST twin would extend its life rather than end it."* That reason is still true, and porting it would work directly against the removal. It stays deferred, with its existing reason intact.

The other ten are ported. Their old `restExempt` was `dashboardShaped` — *"the response is assembled for one screen"* — which is true of `accountHierarchy` and `homeCharts`, the verbs that category was written for, and false of a `string[]` of payees. **That is a fifth instance of ADR 0008's failure mode**: a category outrunning its argument, and it is why this family looked settled.

## Definition of done

Each of the eleven verbs answers on `GET /api-gateway/v1/{owner}/{name}/…` and is addressable as an MCP resource template; both routes call the same service, so neither can drift from the other; `docs/openapi/v1.json` regenerated and the completeness test green; the ratchet ceilings from m5 are lowered by eleven on each surface and CI proves the new numbers hold; a resource read and a REST read against a revoked grant are both refused; `yarn test`, `yarn lint`, `yarn typecheck` pass.

## Why these eleven

They are what an agent needs before it can write a correct transaction: which payees already exist, which accounts are open, which currencies the book uses, which tags are in play. Today an agent has to reconstruct all of it through `runBqlQuery` — which works and is exactly the "already reachable" argument the table used to defer them — but it means every session re-derives the ledger's vocabulary instead of reading it.

They are also the most uniform family in the table: eleven list-shaped reads over one ledger, no pagination questions, no new services. If porting-by-family is going to work as a pattern, this is where the pattern gets proven cheaply.

## Closeout notes (2026-08-25)

**Ported: 10.** REST 24 → 34 (gap 80 → 70); MCP 9 → 19 (gap 91 → 81).

**Cost per verb: low, and the reason generalizes.** The ten differ only in a path segment and which `ILedgerDataService` method they call, so they are one `VOCABULARY_READS` list that both surfaces build from — ten routes and ten templates from one array. That is what made the family cheap, and it is the property to look for when picking the next one, not "how many verbs".

**One bug this found in m5's own work.** `countDeferred` counted a verb as present on MCP only if it had a *tool*, ignoring `mcpResource`. Porting ten reads as resources left the MCP number stubbornly at 91 until that was fixed. A resource is presence on the surface; the ratchet now says so.

**Also corrected here:** `ledgerMeta` excluded as legacy (above), and `R.dashboardShaped` was retired from all ten — a fifth instance of a category outrunning its argument.

## Source + Goal linkage

- **Source:** `backend-cluster/backend-v2/docs/ADR0008-surface-parity.md` — the first porting slice. ADR 0008's sequencing listed REST (step 5) after the MCP port (step 3); this milestone does them together, because both surfaces need the same service calls and the same authorization tests, and serializing them means opening each verb family twice.
- **Goal linkage:** **A1 — agent-native accounting.** Eleven verbs is 14% of the 80-verb REST gap and 12% of the 95-verb MCP gap in one pass, and they are the ones standing between an agent and a correctly-written transaction. Secondary **A3** — the v1 REST surface is what a non-agent integrator reads first, and a ledger you cannot enumerate is one you cannot integrate against.
- **Expected outcome:** An agent asks what payees and accounts exist instead of inferring them; a curl user can enumerate a ledger without learning BQL. Measured by the ratchet ceilings falling by eleven on both surfaces.
- **Why now:** m5 makes the counts honest and proves the resource primitive. This is the first slice that spends that groundwork, and it is deliberately the easy one — a uniform family with no design questions — so that the porting-by-family pattern is tested before it meets Plaid's eleven admin verbs, where "can a REST caller drive this at all" is a real question.
- **Adoption surface task included:** both surfaces gain user- and agent-facing endpoints.

## Dependencies

t002 needs m5/t004's resource layer. **t001 needs nothing** — the REST half can start immediately and in parallel with m5, since `v1Route` is already proven by the 24 routes on the surface today.
