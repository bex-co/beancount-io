# ADR 0008: Reaching GraphQL / REST / MCP parity

- Status: Accepted, unimplemented. The target is every verb on all three surfaces; this record says how to get there, what the one structural boundary is, and how the guard changes from excusing gaps to closing them.
- Date: 2026-08-25
- Decision owners: Backend (the verb table, the three surfaces, the drift guards)
- Scope: how the 143 verbs in `src/server/api/op-class.ts`'s `VERB_TABLE` reach all three surfaces. Extends ADR 0006 D3 (one decision, three dialects) and D9 test 1 (parity is a test). MCP's transport contract stays in [ADR 0007](./ADR007-backend-v2-mcp-surface.md).

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

The gap is 134 verbs on MCP and 119 on REST — 95 and 80 once D4 takes the out-of-scope verbs off both. Those numbers look forbidding, and one class inside them is doing most of the intimidating.

### The `session-only` wall

34 of the 143 — a quarter of the table — are `session-only`. That class is not "nobody got to it yet." It is ADR 0006 D3's deliberate statement that **no scope in the vocabulary can unlock these**: account lifecycle, billing, credential minting. The vocabulary is three ledger scopes wide precisely so that a token granted "manage my ledger" cannot also delete the account.

So these 34 are not a parity backlog. Reaching them from MCP or REST would mean widening the scope vocabulary, which is ADR 0006 D3's decision to re-open, not this one's. They are the largest of three exclusions that D4 names; **parity's denominator is 104, not 143**.

## Decision Drivers

- **The goal is a verb reachable from any of the three clients**, not three hand-maintained implementations. Whatever gets 95 verbs onto MCP has to be mostly mechanical or it will not happen.
- **Tool count is a real constraint, and it is a constraint on _tools_.** Agent selection accuracy degrades as a flat tool list grows. That is why the previous framing treated 50 read verbs as unreachable — and it is why the answer is to stop putting reads in the tool list at all.
- **An exemption should expire.** A reason that is true today and unexamined for a year is how the current table accumulated three false statements (below).
- **Structural limits are worth naming precisely**, so that everything else is understood to be work rather than principle.

## Decision

### D1 — Parity is the target; the exemption field becomes a debt register

`mcpExempt` / `restExempt` stop meaning "this verb does not belong here" and start meaning one of exactly two things:

- **`structural:`** — the verb cannot exist on this surface for a reason that will not change (a GraphQL response cannot stream an archive; a `session-only` op has no scope that unlocks it).
- **`deferred:`** — it is not built yet, and the entry names what unblocks it.

Anything that is neither is a decision waiting to be made, not an exemption. The distinction is the whole point: today's table cannot tell the two apart, so 134 absences all read as settled.

### D2 — MCP reads become Resources, not Tools

This is the unlock, and it is why the 50-read gap was never really about effort.

MCP has three server primitives, and the previous framing used one. [Resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources) are application-driven data addressed by URI: `resources/list` and `resources/templates/list` both **paginate**, templates take RFC 6570 parameters, and — decisively — **a resource does not compete with tools for the model's selection attention.** The 50-read tool-count objection simply does not apply to them.

So the 50 in-scope `read` verbs still missing from MCP become resource templates:

```
beancount://{owner}/{name}/income-statement{?from,to,interval}
beancount://{owner}/{name}/balance-sheet{?date}
beancount://{owner}/{name}/accounts
beancount://{owner}/{name}/commodities
```

`runBqlQuery` stays a tool: composing a query is an action the model takes, not context it reads. The rule is the split MCP itself draws — **a resource is something the client fetches; a tool is something the model decides to do.**

This also retires the largest exemption category in the table. "Already reachable through `runBqlQuery`" (30 rows) was an argument for not adding 30 _tools_. It says nothing about resources, and a report the client can address by URI is strictly better than one the model has to reconstruct in BQL.

### D3 — MCP writes and admin stay tools, grouped by shape

43 in-scope verbs (`write` and `admin`) belong in the tool list, and 43 tools would be exactly the problem D2 avoids. They group, and the table already shows the pattern: `editLedgerFiles` is one tool covering three verbs (`create` / `update` / `delete`) through an `operation` discriminator.

Grouping is legitimate when the members share a shape and an authorization class, and illegitimate when it exists only to flatter the tool count — a tool whose `operation` enum spans unrelated domains is one tool in the listing and several in the model's head. Each group needs its family named in the table so the grouping is reviewable.

### D4 — Parity's scope is the customer-facing surface, and it is 104 verbs

"Every verb on every surface" is the wrong target because not every verb is a thing a customer does. The scope is **an operation a ledger owner — or an agent acting for them — performs on their own accounting data.** Everything else is excluded by name, so that the remainder is understood to be work.

| Excluded                  | Count | Why                                                                                                                                                                                                                            |
| ------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `session-only`            | 34    | Account lifecycle, billing, credential minting. ADR 0006 D3 deliberately gave these no scope, so that a token granted "manage my ledger" cannot also delete the account. Not accounting work, and no credential can reach them |
| Browser-ceremony verbs    | 3     | The operation **is** a hosted widget: `createPlaidLinkToken`, `createPlaidUpdateModeLinkToken`, `exchangePlaidPublicToken`. There is no API to expose — the customer's action happens inside Plaid Link                        |
| Screen-shaped projections | 2     | `Query.accountHierarchy`, `Query.homeCharts` — a specific dashboard's layout. The customer-facing thing is the underlying data, which is in scope on its own                                                                   |

**143 − 34 − 3 − 2 = 104.** Of those, 9 are on MCP and 24 on REST. None of the 5 newly-excluded verbs is on either surface today, so this scoping does not retire any existing work.

Two things this rules out. It is not a size argument — 104 is most of the table, and the exclusions are five verbs plus a class that was already structural. And it is not a permanent judgement about Plaid or dashboards: it names _ceremonies_ and _projections_, so a Plaid operation that is neither is in scope, which is exactly what D4a is about.

#### D4a — "browser ceremony" means the ceremony, not the domain

`plaidBinding` reads _"Bank binding runs through the Plaid Link browser widget, which an agent cannot drive."_ True — of three verbs. It is applied to **twelve**, and the other Plaid verbs are ordinary operations on a bank that is already linked:

```
getPlaidItems · getPlaidItem · getPlaidAccounts · getPlaidAccountsForLedger
unlinkPlaidItem · reconcilePlaidAccounts · updatePlaidAccountMapping
updatePlaidAccountCurrency · refreshPlaidItemStatus
getUnsyncedPlaidTransactions · suggestPlaidTransactionCategories
suggestPlaidAccountMapping · syncPlaidTransactions
submitPlaidTransactionsToLedger · deletePlaidTransactions
```

Nothing about those needs a browser. And the last three are among the most customer-facing operations in the product: _import my bank transactions into my ledger_ is close to the whole job. An agent that can read and edit a ledger but cannot pull the transactions into it is doing the tedious half.

This is the same failure as the three defects in the table, one level up again: **a reason that is true for part of a family, applied to the family.** The rule that follows — an exemption may only cover the rows its argument actually reaches — is what D7's checks are the mechanical half of.

### D5 — REST parity is mechanical, needs no new primitive, and ports alongside MCP

80 in-scope verbs are missing from REST (104 minus the 24 already there). REST needs no new primitive: `v1Route({...})` plus a line in `v1/index.ts` mounts, validates, and documents an endpoint from one declaration, and the OpenAPI snapshot makes each addition a reviewable diff. That asymmetry is worth stating — **MCP needs a primitive proven before it can port; REST does not** — because it is the only reason the two are not symmetric, and it does not imply REST comes second.

The two surfaces are missing largely the _same verbs_: 30 of REST's 80 are ledger reads, and those are precisely the reads MCP wants as resource templates. So they port together, per family, over one service call. Porting them separately would mean two passes over each family and two adapters free to drift, which is exactly what ADR 0006 D1's one-verb-one-behaviour rule exists to prevent.

ADR 0006 D7's "small on purpose" stays true as a _sequencing_ rule, not a cap: the bar is that a caller who has never read the schema can do the thing with curl in ten minutes, which orders the work — the verbs a curl user reaches for first go first — without excusing the tail.

### D6 — The gap is tracked exactly, and can only move by an edit

`surface-parity.test.ts` keeps its current checks and gains one: a checked-in count per surface, asserted with `toEqual` rather than as a ceiling.

```ts
const DEFERRED = { gql: 0, rest: 80, mcp: 91 };
```

The number then moves in _either_ direction only by someone editing that line — adding a verb without its twins fails until the count is raised, porting one fails until it is lowered. Raising it is a visible, arguable act; and asserting exactly keeps the number tight, where a ceiling with slack under it is how the next unpaired verb arrives unnoticed.

Two things are excluded before counting, and the difference between them matters:

- **Out of parity scope** (D4) — the 34 `session-only`, 3 Link-ceremony, and 2 screen-projection verbs. Not targets.
- **In scope, but the surface cannot carry it** — 6 on GraphQL (an archive's bytes, two event streams, two foreign wire formats) and 4 on MCP (the agent transports themselves; a tool for reaching one from inside a tool call would be circular). Targets, physically unreachable there.

Both come from named lists in `op-class.ts`, not from a marker pasted into each exemption string. **An exemption is an argument, and the same argument lands on in-scope and out-of-scope verbs alike** — "credential minting is unreachable by a token" excuses six `session-only` verbs and four in-scope ones, so a prose marker would have to be right in every row it was copied into. That is the failure this record exists to stop. Derive what can be derived.

This is also why MCP's number is 91 and not the 104 − 9 = 95 first stated here: four in-scope verbs are unreachable on MCP by construction.

### D7 — The two mechanical checks the current guard cannot make

Both catch defects found in the table today, and both are conditions on the row rather than judgements about the prose:

1. **An escape hatch must be able to do the job.** An exemption citing a read-only alternative must not sit on a `write` or `admin` verb.
2. **An exemption that depends on another decision must cite it by id**, so changing that decision can enumerate what it re-opens.

### D5a — The family parameter shape, settled once (w3/m7/t001)

The read families take date ranges, accounts, intervals and filters, and answering that per verb would produce sixteen APIs wearing one prefix. It is settled by **reusing what `/journal` already publishes** rather than by inventing:

| Parameter                 | Meaning                                  | Source                  |
| ------------------------- | ---------------------------------------- | ----------------------- |
| `account`                 | restrict to one account and its children | `journalQuerySchema`    |
| `filter`                  | Fava filter expression                   | `journalQuerySchema`    |
| `time`                    | Fava time expression                     | `journalQuerySchema`    |
| `interval` / `conversion` | period grouping and currency conversion  | the services' own names |
| `limit` / `offset`        | paging, `limit` capped at 1000           | `journalQuerySchema`    |

Reuse over invention is ADR 0006 D1 applied to parameters: a verb should behave the same everywhere, and that includes what you call its arguments. The MCP resource templates carry the identical names through RFC 6570 query expansion, so a caller moving between surfaces re-reads nothing.

**Amended by implementation: MCP takes required parameters on the path, and cannot take the optional ones at all.** The query-string spelling above is what REST publishes and what this record first specified for both. The MCP SDK's `UriTemplate.match` does not implement RFC 6570 form-style expansion — a `{?account,filter,time}` template matches no URI whatsoever, and a bare template stops matching the moment a caller appends `?` (verified against `@modelcontextprotocol/sdk` 1.30.0). Path parameters match, colons in account names included.

So a required parameter rides the path (`…/payee-transactions/{payee}`) and **optional filters are a REST-only capability**. A caller wanting a time-narrowed trial balance uses the REST route; the MCP resource answers unfiltered. This is a tooling limit rather than a decision, and it is the first case where the two surfaces differ in what a verb can be _asked_, not in whether it exists. Worth revisiting when the SDK's matcher grows form-style expansion, or by moving filters onto the path as an opaque segment if agents turn out to need them.

**The unbounded-response worry turned out to be already solved.** The three reads that can return a whole ledger's history — `journalEntries`, `getLedgerPlaintextJournal`, `getLedgerAccountJournal` — are exactly the three already covered by `GET /api-gateway/v1/ledgers/{owner}/{name}/journal`, which takes the same narrowing _and_ pages with `limit`/`offset`. They stay deferred against that endpoint rather than being ported and then bounded a second way. Nothing else in the family is unbounded.

## Defects found (2026-08-25)

The first three are one-line fixes; the fourth re-opens fifteen verbs. They matter because each was true when written and stopped being true with nothing to notice — the failure mode D1 and D7 exist to catch.

| Where                                      | Problem                                                                                                                                                                                                         | Fix                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `Mutation.bulkEntries` (`write`)           | Excused as "already reachable through `runBqlQuery`", which is read-only and cannot append a directive. The category was written for reads — 29 of the 30 rows carrying it are reads — and applied to one write | Point at `editLedgerFiles`, which does reach it                                                                                                                                                                                                                                                                                                                          |
| `Query.listLedgers` (`read`)               | "Not agent-shaped" was true only because ADR 0007 D3 pinned each credential to one ledger. Under ADR 0007 D11 it inverts into the first call an unpinned agent must make                                        | Cite the dependency; reverse when D11 lands                                                                                                                                                                                                                                                                                                                              |
| `M.plaidBinding` (the category, 12 rows)   | mixed                                                                                                                                                                                                           | Argues that bank binding runs through a browser widget an agent cannot drive — true of exactly 3 verbs. The other 9 it covers, plus 6 more Plaid verbs, are ordinary operations on an already-linked bank, including `syncPlaidTransactions` and `submitPlaidTransactionsToLedger` — importing bank transactions into a ledger, which is close to the whole customer job | Narrow the category to the three Link-ceremony verbs; the rest are in scope per D4a |
| `M.notAgentShaped` (the category, 59 rows) | Argues against degrading "selection accuracy for **the four** that matter". There are seven tools — ADR 0006 D6 added the API-key ones later                                                                    | Say seven, or stop counting in prose                                                                                                                                                                                                                                                                                                                                     |

The last two are the same failure one level up: a category written once and reused 59 times is what makes the closed set valuable, and also what lets a number in its prose go stale in 59 places at once.

## Sequencing

1. **Fix the three defects** and split every exemption into `structural:` / `deferred:` (D1). Until that split exists, no count means anything.
2. **Land the MCP resource layer** (D2) — capability declaration, `resources/templates/list`, one template to prove the shape end to end. This is the highest-leverage step: it converts 50 verbs from "argued impossible" to "mechanical".
3. **Turn on the ratchet** (D6) as soon as the counts are honest — before the porting, not after it, since its whole purpose is to keep the steps below from adding new gaps while closing old ones.
4. **Port by verb family, both surfaces in the same pass** — REST route and resource template over one service call. Not REST-then-MCP: the two need the same service, the same authorization test, and the same equivalence test, so serializing them means opening every family twice and inviting the two adapters to drift.
5. **Group the writes** (D3), naming each family in the table.
6. **The families where the surface question is real** — Plaid's eleven `admin` verbs are the clear case: `plaidBinding` excuses them from MCP because an agent cannot drive a browser widget, which says nothing about whether a REST caller can. Each such family needs its own answer, not the MCP one reused.

Order the families in step 4 by the ten-minute-curl bar and by what an agent needs before it can write a correct transaction — those turn out to be the same list.

### The families, and where each stands

Every one of the 80 in-scope verbs missing from REST is **also** missing from MCP, which is the evidence behind step 4 rather than an argument for it — porting them separately would mean opening each family twice.

| Family                     | Verbs | Milestone | Note                                                                                                                                              |
| -------------------------- | ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ledger vocabulary reads    | 11    | `w3/m6`   | Uniform, no arguments — where the porting pattern gets proven cheaply                                                                             |
| Report and journal reads   | 16    | `w3/m7`   | One design question: parameter and bounding shape for the family                                                                                  |
| Bank import (Plaid)        | 15    | `w3/m8`   | The D4a family. Needs an authorization decision before a port                                                                                     |
| Files and documents        | 10    | —         | Asset upload/download URLs raise a ticket-vs-header question like the archive route's                                                             |
| Ledger lifecycle and misc  | 10    | —         | `createLedger` / `deleteLedger` / star, plus `health` and `featureFlags` (`public`)                                                               |
| Collaboration and keys     | 8     | —         | All `admin`. Whether an agent should add collaborators is the same shape of question as m8/t001                                                   |
| Git and version history    | 7     | —         | Commits, pull requests. Reads are easy; the PR verbs need a decision                                                                              |
| Entry writing and receipts | 3     | —         | `addEntries`, `insertReceiptTransaction`, `suggestTransactionCategories` — overlap `editLedgerFiles`; decide whether they are twins or duplicates |

The four unplanned families are deliberately not milestones yet. Each carries a decision that m6–m8 will inform — what a family port actually costs, and how the two surfaces should diverge when they must — and materializing 32 speculative task files now would be recording guesses as plans.

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

- The 50-read gap stops being a debate and becomes a port, because Resources are the primitive it always needed.
- `structural:` vs `deferred:` makes the real boundary — 34 `session-only` verbs — legible, and everything else visibly work.
- The ratchet makes adding an unpaired verb a decision someone has to defend in the diff.

### Negative

- A resource layer is new surface area on the MCP server: capability declaration, URI scheme, template resolution, and per-resource authorization that must go through the same `authorizeLedger` seam every tool uses. Nothing here comes free.
- Resources are application-driven — a host that never surfaces them means an agent that never reads them. Some clients will need the tool form anyway, and the split will not be as clean in practice as D2 makes it sound.
- The ratchet's ceiling can be raised, and a number that can be raised will be raised under deadline.

## Open Questions

- ~~Does the URI scheme belong on `beancount://` or `https://`?~~ **Settled in w3/m5/t004: `beancount://{owner}/{name}/…`.** The spec reserves `https://` for resources a client can fetch directly from the web, and these cannot be — reaching one needs the caller's credential, a per-call ledger authorization, and this server in the path. Advertising them as `https://` would invite a client to fetch them itself and collect a 401 from somewhere it did not expect.
- Should reads be reachable **both** ways during the transition, or does a resource replace `runBqlQuery` for the reports it covers? Both is friendlier and doubles the surface. m5 shipped `ledgerFile` alongside the `readLedgerFiles` tool, so the first instance is "both" — one `VERB_TABLE` row now carries `mcp` and `mcpResource` together, which is at least cheap to reverse.
- Should a resource read be rate-limited on the same budget as a tool call? It is today. But an agent pulling six files into context is one logical act, and charging it six writes' worth of budget may be the wrong shape once the port grows.
- Does D6's ceiling belong per surface, or per surface × class? A ceiling that lets 20 reads land while an admin verb slips through is not measuring the risky thing.
- Do the 34 `session-only` verbs deserve their own ADR now, or after the 104 are done?

## References

Internal:

- `src/server/api/op-class.ts` — `VERB_TABLE`, the `OpClass` vocabulary, the exemption categories
- `src/server/api/__tests__/surface-parity.test.ts` — the guard D6 and D7 extend
- `src/features/ledger/api/rest/v1/` — `v1Route` and the one-declaration pattern D5 relies on
- `src/features/ai-agent/api/mcp-tools.ts` — the seven tools behind the nine MCP verbs
- `docs/adrs/ADR007-backend-v2-mcp-surface.md` — MCP's transport contract; D3 and D11 are the dependency this record's D7 is about

External:

- [MCP Resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources) — URI addressing, templates, pagination, subscriptions
- [RFC 6570](https://datatracker.ietf.org/doc/html/rfc6570) — URI templates, the parameter form D2's templates use
