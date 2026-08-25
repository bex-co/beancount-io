# w3 · m5 — Surface parity groundwork: honest counts and the MCP resource layer

**Worker:** worker3 **Goal:** The parity numbers mean something, they can only go down, and the primitive that makes 52 read verbs reachable from MCP exists and is proven end to end. **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Fix the three stale exemptions in `VERB_TABLE` | 30m | — | — **DONE**
| t002 | Split every exemption into `structural:` or `deferred:` | 45m | t001 | — **DONE**
| t003 | Guards: the parity ratchet, plus D7's two mechanical checks | 45m | t002 | — **DONE**
| t004 | MCP `resources` capability + one resource template, end to end | 45m | — | — **DONE**
| t005 | Adoption surface | 20m | t003, t004 | — **DONE**
| t006 | Simplify | 20m | t005 | — **DONE**
| t007 | Test coverage | 30m | t005 | — **DONE**
| t008 | Closeout | 20m | t007 | — **DONE**

## Definition of done — amended during t002

**The first clause below was not met as written, on purpose.** It called for every exemption string to begin `structural:` or `deferred:`. Prefixing them revealed why that cannot work: five categories genuinely span both — `credentialMinting` excuses six `session-only` verbs and four in-scope ones — because **an exemption is an argument, and the same argument lands on rows of both kinds**. A prose marker would have to be correct in every row it was pasted into, which is the exact failure ADR 0008 exists to stop.

So scope is derived instead, from two short named lists in `op-class.ts` (`isInParityScope`, `isReachableOn`) that cannot go stale. ADR 0008 D6 was rewritten to match, and the reasoning is recorded there rather than only here. Everything else in the clause below held.

A second correction fell out of it: the MCP count is **91, not 95**. Four in-scope verbs — the agent transports themselves — are unreachable on MCP by construction, which the original arithmetic missed.

## Definition of done

Every `mcpExempt` / `restExempt` / `gqlExempt` string in `VERB_TABLE` begins `structural:` or `deferred:`, and a test fails on any that does not; the three defects named in ADR 0008 are gone, each with a check that would catch its recurrence; `surface-parity.test.ts` asserts a checked-in per-surface ceiling on `deferred:` count, so an unpaired verb fails CI until someone raises the number in the same diff; the MCP server declares the `resources` capability, `resources/templates/list` returns at least one template, and `resources/read` on it returns real ledger data authorized through the same `authorizeLedger` seam every tool uses — with a read from a revoked grant refused; `yarn test`, `yarn lint`, `yarn typecheck` pass in `backend-cluster/backend-v2/`.

## Definition of done — what this milestone is NOT

It does not port the 52 read verbs. t004 proves the shape with one template; the port is a follow-on milestone. Nothing here changes the tool list, and no `deferred:` ceiling should fall except by t001's defect fixes.

## Source + Goal linkage

- **Source:** `backend-cluster/backend-v2/docs/ADR0008-surface-parity.md`, sequencing steps 1–2 plus the D6/D7 guards. The ratchet is pulled forward from step 6 because its stated purpose is to protect steps 3–5, which it cannot do if it lands after them.
- **Goal linkage:** **A1 — agent-native accounting.** An agent can reach 9 of 143 verbs today. The single largest reason — 52 read verbs judged too numerous for a flat tool list — dissolves once reads are Resources rather than Tools, because a resource does not compete for tool-selection attention. This milestone builds that primitive and makes the remaining gap countable instead of arguable.
- **Expected outcome:** The parity gap becomes a number that only falls, and the mechanism for closing its largest slice exists and is demonstrated. After this, "port the reports" is mechanical work rather than a design question.
- **Why now:** ADR 0008 found three exemptions that were true when written and silently stopped being. Every one of them argued against work that should happen. Until the exemptions are split and the ratchet is on, the table cannot tell a settled decision from an unexamined one — so any porting work done first would accumulate the same rot behind it.
- **Adoption surface task included:** t004 ships an agent-facing capability. An MCP client's view of this server changes.
