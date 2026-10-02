# w3 · m52 — Make Ask-AI proxy limits and failures truthful

**Worker:** worker3 **Goal:** Preserve bounded model requests and report quota failures without confusing per-user monthly usage with shared provider capacity. **Status:** blocked (t001–t002 shipped; t003 external; t004–t007 dependent)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Preserve modern output caps and bound uncapped requests — **DONE** | 30m | — |
| t002 | Translate provider quota failures into safe product errors — **DONE** | 40m | t001 |
| t003 | Align enforced quota visibility across APIs and CLI | 90m | t002 — **BLOCKED** |
| t004 | Adoption surface — **BLOCKED** | 20m | t001, t002, t003 |
| t005 | Simplify — **BLOCKED** | 20m | t004 |
| t006 | Test coverage — **BLOCKED** | 20m | t004 |
| t007 | Closeout — **BLOCKED** | 10m | t005, t006 |

## Definition of done

- The real OpenAI-compatible route preserves either supported output-cap spelling, rejects conflicting caps, and supplies a modest documented default when neither is present.
- Recognized provider quota errors become safe product-owned 429 errors with the quota scope and validated reset information, without raw provider documents or links.
- Reported availability matches an operator-approved distinction between per-user monthly entitlement and shared provider capacity; REST, GraphQL, MCP, and CLI expose the same supported facts.
- Near-limit acceptance and refusal are verified against the supported provider contract; package checks, meaningful regressions, adoption review, and simplification pass.

## Source + Goal linkage

- **Source:** promoted [446](./source-446.md), retaining its original evidence and correction history.
- **Goal linkage:** A1 — coding agents can use Ask-AI without losing output caps or mistaking shared service capacity for their account entitlement.
- **Expected outcome:** capped requests reach the provider unchanged, refusals are readable and actionable, and quota displays describe the limit that can actually refuse a request.
- **Why now:** m51 shipped the CLI cap, but the proxy strips the SDK's `max_completion_tokens`; the remaining accounting work also needs an external contract and spans more than one hour. Adoption surface is included because both API consumers and CLI users see the results.

## Blocked

`t003`: the repository controls per-user monthly accounting, but the raw proxy uses one deployment provider credential. ADR 011 D4 deliberately leaves aggregate capacity upstream. No supported upstream usage/window/reservation interface is present here. A local monthly count cannot establish remaining shared capacity, and changing provider reservation policy or capacity cannot be achieved by this repository's code alone.

**Unblock:** the provider/operator supplies a supported contract for window usage, limits, reset times, and reservation behavior, or configures provider capacity so the published per-user entitlement can be honored; the product owner confirms how shared service availability is presented separately from account quota. Supply a reproducible near-limit verification setup. **Owners:** provider/deployment operator and product owner; backend/CLI maintainers implement the resulting public contract. `t004`–`t007` depend on this work and are blocked in dependency order. `t001` shipped in `18730f77` (outcome `231203e0`); `t002` shipped in `cff30747` (outcome `fb9d9dd5`). All partial code is committed and pushed; no uncommitted implementation remains.


Re-audited 2026-10-02: `LLMService.invokeModelProxy` still uses one deployment credential, and ADR 011 D4 still assigns aggregate capacity to the provider. The public repository has no supported usage/window/reservation read contract. The new safe refusal metadata cannot establish remaining availability. The milestone definition of done remains unmet until the external condition above holds; the remaining tasks are deliberately not marked done.
