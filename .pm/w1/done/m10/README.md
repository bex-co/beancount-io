# w1 · m10 — Complete REST, MCP, and GraphQL operation and behavior parity

**Worker:** worker1 **Goal:** Every eligible customer operation is usable through REST, MCP, and GraphQL with equivalent supported inputs, domain results, side effects, and authorization behavior. **Status:** done

**Estimated effort:** 32h 15m across 34 tasks. This is one completion milestone, as requested; tasks may be split inside this milestone if implementation shows that a batch exceeds an hour. Keep the four closing tasks last and update dependencies and the coverage map when splitting.

## Scope and baseline

The 2026-09-06 repository audit found 144 registered verbs. Applying the current `isReachableOn` predicate gives:

| Surface | Eligible operations | Present | Deferred |
| --- | ---: | ---: | ---: |
| GraphQL | 105 | 105 | 0 |
| REST | 111 | 58 | 53 |
| MCP, tools and resources combined | 107 | 44 | 63 |

[The baseline coverage map](./COVERAGE.md) names every eligible verb and assigns every current gap to an implementation task. All 53 REST gaps are among the 63 MCP gaps. Counts measure registered operations, not URLs or tool names; grouped tools and reusable route variants must prove that each mapped operation can actually execute.

The previous work in w3/m5–m8 completed the registry/resource foundation and selected read and bank families. It left the remaining families and several parameter differences unfinished. This milestone owns the entire current eligible remainder plus material differences in operations already mapped to all three surfaces.

### What parity means here

- Every eligible operation has a usable adapter on each eligible surface. A real authorized client must be able to complete it; discovery-only registrations and always-denied stubs do not count.
- Supported arguments, defaults, optional filters, sorting, pagination, result fields, numeric/currency representations, and mutation effects are equivalent. Transport-specific naming and envelopes may differ through documented, tested mappings.
- A preview supported by one adapter must have equivalent checks and no-write behavior on its eligible twins. Explicitly rejecting a supported preview does not establish parity; an operation may reject preview only when the agreed operation contract offers none on any surface.
- Existing credential ceilings, ownership and collaborator relationships, ledger restrictions, quotas, concurrency checks, and per-call authorization remain intact. A common operation class or canonical action is not proof of equivalent behavior.
- MCP accepts explicit ledger selection for unpinned grants, preserves existing pinned calls, and exposes discovery/account operations without inventing a ledger target. Broader OAuth grants require explicit consent and correct resource audiences.
- Existing structural exceptions remain explicit: credential-policy exclusions, the three browser Plaid Link ceremonies, the two named screen projections, and the current per-surface archive/stream/foreign-wire exclusions. Do not expand these lists or remove eligible legacy rows to manufacture zero debt.
- GraphQL remains a compatibility contract. REST/OpenAPI and MCP schemas are updated through their owning tools. Reuse protected application services and feature descriptors; a catch-all GraphQL tunnel, approximate BQL query, or raw file edit does not replace a structured operation's contract.
- Account deletion and any other eligibility/credential contradiction must be resolved explicitly in t001 before claiming a successful adapter. An unresolved case keeps this milestone open.

Primary implementation is in `backend-cluster/backend-v2/`. t005 separately owns the necessary dashboard consent change. Run commands from each owning package and follow its guidance; no new cross-package imports or duplicate authorization engine.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Freeze the operation and behavior parity contract — **DONE** | 60m | — |
| [t002](./done/t002.md) | Make grouped operation mappings and parity contracts executable — **DONE** | 60m | t001 |
| [t003](./done/t003.md) | Support explicit MCP ledger selection and account-scoped calls — **DONE** | 60m | t002 |
| [t004](./done/t004.md) | Align OAuth grants and discovery with explicit MCP targets — **DONE** | 60m | t003 |
| [t005](./done/t005.md) | Make MCP consent clearly distinguish ledger restrictions — **DONE** | 45m | t004 |
| [t006](./done/t006.md) | Reach structured BQL and full report parameters through MCP — **DONE** | 60m | t003 |
| [t007](./done/t007.md) | Complete ledger discovery and metadata adapters — **DONE** | 60m | t003, t004 |
| [t008](./done/t008.md) | Expose ledger creation, updates, and deletion — **DONE** | 60m | t003, t004 |
| [t009](./done/t009.md) | Expose user SSH public-key reads and mutations — **DONE** | 60m | t003 |
| [t010](./done/t010.md) | Expose collaborator lists and permission reads — **DONE** | 45m | t003 |
| [t011](./done/t011.md) | Expose collaborator changes and leaving a ledger — **DONE** | 60m | t010 |
| [t012](./done/t012.md) | Complete statement, overview, account, and document reads — **DONE** | 60m | t006 |
| [t013](./done/t013.md) | Complete journal variants and source-file reads — **DONE** | 60m | t006 |
| [t014](./done/t014.md) | Expose latest commit, history, and commit details — **DONE** | 60m | t003 |
| [t015](./done/t015.md) | Complete document and archive download contracts — **DONE** | 60m | t003, t002 |
| [t016](./done/t016.md) | Expose structured bulk and legacy entry insertion — **DONE** | 60m | t003, t002 |
| [t017](./done/t017.md) | Expose optimistic entry-slice updates and deletions — **DONE** | 60m | t016 |
| [t018](./done/t018.md) | Complete file rename and align existing file mutation behavior — **DONE** | 60m | t003, t002 |
| [t019](./done/t019.md) | Expose self profile and public configuration reads — **DONE** | 60m | t003 |
| [t020](./done/t020.md) | Expose account deletion with unchanged credential policy — **DONE** | 60m | t001, t004, t002 |
| [t021](./done/t021.md) | Expose public social discovery and ledger starring — **DONE** | 60m | t003, t002 |
| [t022](./done/t022.md) | Expose pull-request inspection, creation, and review — **DONE** | 60m | t003, t014 |
| [t023](./done/t023.md) | Expose file and receipt parsing contracts — **DONE** | 60m | t003, t002 |
| [t024](./done/t024.md) | Expose category suggestions, receipt insertion, and AI usage — **DONE** | 60m | t023, t016 |
| [t025](./done/t025.md) | Expose temporary asset upload and download URLs — **DONE** | 45m | t003, t002 |
| [t026](./done/t026.md) | Align existing API-key arguments and result contracts — **DONE** | 45m | t003, t002 |
| [t027](./done/t027.md) | Align bank read filters and mutation preview behavior — **DONE** | 60m | t003, t006 |
| [t028](./done/t028.md) | Verify cross-surface refusals, budgets, and audit context — **DONE** | 60m | t026, t027, t020, t022, t024, t025, t018, t011, t008, t009, t019, t021, t012, t013, t015, t007, t014, t017 |
| [t029](./done/t029.md) | Require zero operation and parameter parity debt — **DONE** | 60m | t028, t007, t014, t017 |
| [t030](./done/t030.md) | Verify complete client workflows against a development deployment — **DONE** | 60m | t029, t005 |
| [t031](./done/t031.md) | Adoption surface — **DONE** | 45m | t030 |
| [t032](./done/t032.md) | Simplify — **DONE** | 60m | t031 |
| [t033](./done/t033.md) | Test coverage — **DONE** | 60m | t031, t032 |
| [t034](./done/t034.md) | Closeout — **DONE** | 30m | t033 |

## Definition of done

- [ ] Every eligible operation in COVERAGE.md has executable, schema-checked bindings on its eligible surfaces. Newly added eligible verbs are covered too; all baseline verbs remain accounted for.
- [ ] The checked-in deferred counts are exactly `{ gql: 0, rest: 0, mcp: 0 }`. Eligibility and named exclusions are reviewed independently, with no denominator reduction or reclassification used to hide unfinished work.
- [ ] Grouped MCP tools have branch-level coverage for every mapped operation. An unknown discriminator, wrong canonical action, or unreachable branch fails the gate.
- [ ] A path-filtered GitHub Actions job runs parity, operation-coverage, and behavior-contract checks on ordinary backend adapter/schema changes and on relevant dependency/tooling/workflow changes. The zero-debt invariant is enforced in CI, not only by local commands.
- [ ] Optional report inputs (`account`, `filter`, `time`, `interval`, `conversion`), paging, structured BQL and text results, legacy mappings, and all other material contract differences identified in t001 work through actual adapters.
- [ ] Pinned + omitted/same ledger succeeds, pinned + different ledger refuses, unpinned + explicit ledger authorizes that target, and unpinned + missing target gives an actionable error. Discovery and account operations work without fabricated ledger IDs; existing pinned clients remain compatible.
- [ ] API-key expiry and restriction arguments, bank filters/previews, file SHA/atomicity/rename semantics, structured entries, source-slice edits, downloads, and administrative/assisted workflows have equivalent successful effects and meaningful failure behavior.
- [ ] Existing credential policy is preserved, including exact-self/account rules, no API-key self-minting, paid-plan key creation, scope narrowing, ledger-pin inheritance, and per-call relationship checks. No unresolved credential/audience reachability decision remains.
- [ ] Real REST routing, GraphQL execution, and an MCP client exercise shared nontrivial fixtures. Tests compare normalized results and persisted effects; they do not discard unsupported optional inputs or merely assert mocked service calls.
- [ ] Wrong audience, insufficient scope, wrong owner/ledger, stale grants/hashes, invalid inputs, quotas, rate limits, and dependency outages retain their intended meaning, audit context, and no-side-effect guarantees.
- [ ] OpenAPI, MCP schemas/manifest, GraphQL compatibility, documentation, and both Claude Code and Codex workflows agree with the verified contract. Named structural exceptions are visible to integrators.
- [ ] Required owning-package gates and isolated development workflow checks pass on the final change set. Skipped required checks, mocked-only rollout evidence, and unverified production claims do not satisfy closeout.
- [ ] Adoption surface, Simplify, Test coverage, and Closeout are complete; /pm moves this milestone and all completed tasks to the prescribed done paths and updates the w1 index.

## Source + Goal linkage

- **Source:** Explicit user request on 2026-09-06 to arrange one milestone in w1 achieving REST/MCP/GraphQL parity, following the repository MCP research and live parity audit. Sources are `backend-cluster/backend-v2/src/server/api/op-class.ts`, `src/server/api/__tests__/surface-parity.test.ts`, and [ADR 0008](../../../docs/adrs/ADR008-backend-v2-surface-parity.md). Prior completed work: [w3/m5](../../w3/done/m5/README.md), [w3/m6](../../w3/done/m6/README.md), [w3/m7](../../w3/done/m7/README.md), and [w3/m8](../../w3/done/m8/README.md).
- **Goal linkage:** **A1 — Agent-native accounting**: agents can discover ledgers and complete accounting, collaboration, and supported ingestion workflows through MCP. **A2 — Frictionless onboarding**: documented credentials, selection, and parameters work consistently. **A3 — Community & distribution**: integrators can select REST, MCP, or GraphQL without discovering missing business capabilities.
- **Expected outcome:** An authorized integrator or coding agent can choose any eligible surface for the same workflow, obtain equivalent results, and understand deliberate protocol/credential boundaries. CI reports zero operation and parameter debt and fails when a new divergence appears.
- **Why now:** The shared services, centralized authorization, registration fragments, and initial parity tests already exist. The audit found 53 REST and 63 MCP gaps with no pending milestone owning completion; leaving them as documented exemptions would preserve the gap indefinitely.
- **Adoption surface:** Included because this ships public API contracts, MCP tools/resources, consent behavior, and client setup instructions. Existing w1 mobile OAuth rollout/consent milestones must retain their behavior; they do not replace any parity task here.
