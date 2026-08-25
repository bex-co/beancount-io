# ADR 0008: Reaching GraphQL / REST / MCP parity

- Status: Accepted, unimplemented. The target is every verb on all three surfaces; this record says how to get there, what the one structural boundary is, and how the guard changes from excusing gaps to closing them.
- Date: 2026-08-25
- Decision owners: Backend (the verb table, the three surfaces, the drift guards)
- Scope: how the 143 verbs in `src/server/api/op-class.ts`'s `VERB_TABLE` reach all three surfaces. Extends ADR 0006 D3 (one decision, three dialects) and D9 test 1 (parity is a test). MCP's transport contract stays in [ADR 0007](./ADR0007-mcp-surface.md).

## Context

ADR 0006 made parity testable but not obligatory: `surface-parity.test.ts` requires that a missing verb carry a written reason, not that it stop being missing. That was the right first move — it turned invisible gaps into arguable ones — and the table now records 143 verbs with a reason on every absence.

The reasons have been doing a second job they were not meant for: standing in for a decision nobody made. **Parity is the goal.** This record replaces "every absence is excused" with "every absence is scheduled or structural."

### Where the three surfaces actually stand

143 verbs, by the op class that decides which scope unlocks them:

| Class          | Total   | On MCP | On REST |
| -------------- | ------- | ------ | ------- |
| `read`         | 55      | 3      | 13      |
| `write`        | 25      | 3      | 8       |
| `admin`        | 27      | 3      | 3       |
| `session-only` | 34      | 0      | 0       |
| `public`       | 2       | 0      | 0       |
| **Total**      | **143** | **9**  | **24**  |

The gap is 134 verbs on MCP and 119 on REST. Those numbers look forbidding, and one class inside them is doing most of the intimidating.

### The `session-only` wall

34 of the 143 — a quarter of the table — are `session-only`. That class is not "nobody got to it yet." It is ADR 0006 D3's deliberate statement that **no scope in the vocabulary can unlock these**: account lifecycle, billing, credential minting. The vocabulary is three ledger scopes wide precisely so that a token granted "manage my ledger" cannot also delete the account.

So these 34 are not a parity backlog. Reaching them from MCP or REST would mean widening the scope vocabulary, which is ADR 0006 D3's decision to re-open, not this one's. **Parity's denominator is 109, not 143**, and the remaining 34 are a separate question that should be asked on its own terms rather than smuggled in as a parity chore.

## Decision Drivers

- **The goal is a verb reachable from any of the three clients**, not three hand-maintained implementations. Whatever gets 109 verbs onto MCP has to be mostly mechanical or it will not happen.
- **Tool count is a real constraint, and it is a constraint on _tools_.** Agent selection accuracy degrades as a flat tool list grows. That is why the previous framing treated 52 read verbs as unreachable — and it is why the answer is to stop putting reads in the tool list at all.
- **An exemption should expire.** A reason that is true today and unexamined for a year is how the current table accumulated three false statements (below).
- **Structural limits are worth naming precisely**, so that everything else is understood to be work rather than principle.

## Decision

### D1 — Parity is the target; the exemption field becomes a debt register

`mcpExempt` / `restExempt` stop meaning "this verb does not belong here" and start meaning one of exactly two things:

- **`structural:`** — the verb cannot exist on this surface for a reason that will not change (a GraphQL response cannot stream an archive; a `session-only` op has no scope that unlocks it).
- **`deferred:`** — it is not built yet, and the entry names what unblocks it.

Anything that is neither is a decision waiting to be made, not an exemption. The distinction is the whole point: today's table cannot tell the two apart, so 134 absences all read as settled.

### D2 — MCP reads become Resources, not Tools

This is the unlock, and it is why the 52-read gap was never really about effort.

MCP has three server primitives, and the previous framing used one. [Resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources) are application-driven data addressed by URI: `resources/list` and `resources/templates/list` both **paginate**, templates take RFC 6570 parameters, and — decisively — **a resource does not compete with tools for the model's selection attention.** The 52-read tool-count objection simply does not apply to them.

So the 52 `read` verbs become resource templates:

```
beancount://{owner}/{name}/income-statement{?from,to,interval}
beancount://{owner}/{name}/balance-sheet{?date}
beancount://{owner}/{name}/accounts
beancount://{owner}/{name}/commodities
```

`runBqlQuery` stays a tool: composing a query is an action the model takes, not context it reads. The rule is the split MCP itself draws — **a resource is something the client fetches; a tool is something the model decides to do.**

This also retires the largest exemption category in the table. "Already reachable through `runBqlQuery`" (30 rows) was an argument for not adding 30 _tools_. It says nothing about resources, and a report the client can address by URI is strictly better than one the model has to reconstruct in BQL.

### D3 — MCP writes and admin stay tools, grouped by shape

46 verbs (`write` 22 + `admin` 24) belong in the tool list, and 46 tools would be exactly the problem D2 avoids. They group, and the table already shows the pattern: `editLedgerFiles` is one tool covering three verbs (`create` / `update` / `delete`) through an `operation` discriminator.

Grouping is legitimate when the members share a shape and an authorization class, and illegitimate when it exists only to flatter the tool count — a tool whose `operation` enum spans unrelated domains is one tool in the listing and several in the model's head. Each group needs its family named in the table so the grouping is reviewable.

### D4 — `session-only` is the boundary, and it is 34 verbs

Named here so that no future reader mistakes it for undone work. These reach neither MCP nor REST because ADR 0006 D3 gave them no scope, deliberately. They carry `structural:` under D1.

Changing that is a scope-vocabulary decision — a fourth scope, or a class of ops requiring step-up authentication — and it belongs in its own ADR against ADR 0006 D3. Nothing in this record should be read as proposing it.

### D5 — REST parity is mechanical, and its bar is different

85 achievable verbs are missing from REST (119 minus the 34 structural). REST needs no new primitive: `v1Route({...})` plus a line in `v1/index.ts` mounts, validates, and documents an endpoint from one declaration, and the OpenAPI snapshot makes each addition a reviewable diff.

ADR 0006 D7's "small on purpose" stays true as a _sequencing_ rule, not a cap: the bar is that a caller who has never read the schema can do the thing with curl in ten minutes, which orders the work — the verbs a curl user reaches for first go first — without excusing the tail.

### D6 — The guard ratchets: absences may fall, never rise

`surface-parity.test.ts` keeps its current checks and gains one. A checked-in count per surface, asserted as a ceiling:

```ts
const MAX_DEFERRED = { gql: 0, rest: 85, mcp: 100 };
```

Adding a verb without its REST and MCP twins fails CI until the number is _raised in the same diff_ — which is the point: raising it is a visible, arguable act, and lowering it is the work. `structural:` entries are counted separately and are not expected to move.

### D7 — The two mechanical checks the current guard cannot make

Both catch defects found in the table today, and both are conditions on the row rather than judgements about the prose:

1. **An escape hatch must be able to do the job.** An exemption citing a read-only alternative must not sit on a `write` or `admin` verb.
2. **An exemption that depends on another decision must cite it by id**, so changing that decision can enumerate what it re-opens.

## Defects found (2026-08-25)

All three are one-line fixes. They matter because each was true when written and stopped being true with nothing to notice — the failure mode D1 and D7 exist to catch.

| Where                                      | Problem                                                                                                                                                                                                         | Fix                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `Mutation.bulkEntries` (`write`)           | Excused as "already reachable through `runBqlQuery`", which is read-only and cannot append a directive. The category was written for reads — 29 of the 30 rows carrying it are reads — and applied to one write | Point at `editLedgerFiles`, which does reach it |
| `Query.listLedgers` (`read`)               | "Not agent-shaped" was true only because ADR 0007 D3 pinned each credential to one ledger. Under ADR 0007 D11 it inverts into the first call an unpinned agent must make                                        | Cite the dependency; reverse when D11 lands     |
| `M.notAgentShaped` (the category, 59 rows) | Argues against degrading "selection accuracy for **the four** that matter". There are seven tools — ADR 0006 D6 added the API-key ones later                                                                    | Say seven, or stop counting in prose            |

The third is the same failure one level up: a category written once and reused 59 times is what makes the closed set valuable, and also what lets a number in its prose go stale in 59 places at once.

## Sequencing

1. **Fix the three defects** and split every exemption into `structural:` / `deferred:` (D1). Until that split exists, no count means anything.
2. **Land the MCP resource layer** (D2) — capability declaration, `resources/templates/list`, one template to prove the shape end to end. This is the highest-leverage step: it converts 52 verbs from "argued impossible" to "mechanical".
3. **Port the reads** onto templates, in the order a real agent session needs them.
4. **Group the writes** (D3), naming each family in the table.
5. **REST tail** (D5), ordered by the ten-minute-curl bar.
6. **Turn on the ratchet** (D6) once the counts are honest, so step 3–5 can only move it down.

## Alternatives Considered

### 143 flat MCP tools (rejected)

The objection that killed the previous framing, and it is a real one — a flat list that long measurably degrades tool selection. D2 makes it moot for reads rather than arguing with it.

### Leave the table as reasons-only, close gaps ad hoc (rejected)

What the previous draft of this ADR recommended. It optimizes for defensible prose over reachable verbs, and the three defects above are what a year of that produces.

### One generic `callGraphQL` tool (rejected)

Perfect parity in one tool, and it makes the agent write GraphQL against a 143-verb schema it cannot see — trading a tool-selection problem for a query-construction problem, with no schema-level authorization story. `runBqlQuery` is the bounded version of this idea and is already there.

### Generate all three surfaces from one declaration (deferred, not rejected)

The honest long answer: if every verb declared its shape once, parity would be structural rather than maintained. It is a large refactor of working code and would block every step above behind it. D2 and D5 are the tractable path; revisit once the counts are near zero and the remaining cost is visibly duplication.

## Consequences

### Positive

- The 52-read gap stops being a debate and becomes a port, because Resources are the primitive it always needed.
- `structural:` vs `deferred:` makes the real boundary — 34 `session-only` verbs — legible, and everything else visibly work.
- The ratchet makes adding an unpaired verb a decision someone has to defend in the diff.

### Negative

- A resource layer is new surface area on the MCP server: capability declaration, URI scheme, template resolution, and per-resource authorization that must go through the same `authorizeLedger` seam every tool uses. Nothing here comes free.
- Resources are application-driven — a host that never surfaces them means an agent that never reads them. Some clients will need the tool form anyway, and the split will not be as clean in practice as D2 makes it sound.
- The ratchet's ceiling can be raised, and a number that can be raised will be raised under deadline.

## Open Questions

- Does the URI scheme belong on `beancount://` or on `https://beancount.io/...`? The spec reserves `https://` for resources the client can fetch itself, which these are not — but a custom scheme is one more thing to document.
- Should reads be reachable **both** ways during the transition, or does a resource replace `runBqlQuery` for the reports it covers? Both is friendlier and doubles the surface.
- Does D6's ceiling belong per surface, or per surface × class? A ceiling that lets 20 reads land while an admin verb slips through is not measuring the risky thing.
- Do the 34 `session-only` verbs deserve their own ADR now, or after the 109 are done?

## References

Internal:

- `src/server/api/op-class.ts` — `VERB_TABLE`, the `OpClass` vocabulary, the exemption categories
- `src/server/api/__tests__/surface-parity.test.ts` — the guard D6 and D7 extend
- `src/features/ledger/api/rest/v1/` — `v1Route` and the one-declaration pattern D5 relies on
- `src/features/ai-agent/api/mcp-tools.ts` — the seven tools behind the nine MCP verbs
- `docs/ADR0007-mcp-surface.md` — MCP's transport contract; D3 and D11 are the dependency this record's D7 is about

External:

- [MCP Resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources) — URI addressing, templates, pagination, subscriptions
- [RFC 6570](https://datatracker.ietf.org/doc/html/rfc6570) — URI templates, the parameter form D2's templates use
