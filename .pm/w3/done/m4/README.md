# w3 · m4 — Beancount MCP endpoint: make it connectable and keep it conformant

**Worker:** worker3 **Goal:** A coding agent can connect an MCP client to a Beancount.io deployment — hosted or self-hosted — get the seven ledger tools with a published output contract, and diagnose a deployment that isn't connectable without reading the source. **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Declare `outputSchema` on the seven MCP tools | 45m | — | — **DONE**
| t002 | MCP conformance check runnable against any deployment | 45m | t001 | — **DONE**
| t003 | Document connecting an MCP client | 45m | t001 | — **DONE**
| t004 | Adoption surface | 20m | t001, t002, t003 | — **DONE**
| t005 | Simplify | 20m | t004 | — **DONE**
| t006 | Test coverage | 30m | t004 | — **DONE**
| t007 | Closeout | 20m | t006 | — **DONE**

## Definition of done

`tools/list` returns all seven tools each carrying a non-empty `outputSchema`, and a success result validates against it; `yarn mcp:conformance <base-url>` runs ADR 0007's seven-point checklist against any deployment, naming the check that failed rather than throwing; the repo documents the endpoint path, the ledger-scoped credential requirement, and what each failed check means, in a form a reader can follow without opening the source; `yarn test`, `yarn lint`, and `yarn typecheck` pass in `backend-cluster/backend-v2/`.

## How the definition of done was verified (2026-08-24)

- **`outputSchema` published** — asserted against a real `tools/list` response, not the descriptor table: `src/features/ai-agent/api/__tests__/mcp-output-schema.test.ts`. The union the tools already defined could not be registered directly — the MCP SDK normalizes a discriminated union to `undefined`, which publishes nothing *and* fails every call with `Cannot read properties of undefined`. `mcpOutputSchema` derives the publishable object form from that same union, so there is still one source of truth for the payload.
- **Conformance script** — run live against production (2 pass, 2 fail, 3 skip; exits non-zero naming `2 discovery-resolves` and `6 error-masking`) and against the local Docker stack (3 pass, 1 fail, 3 skip). Its own pass paths, including the three credential-gated checks, are covered by `scripts/__tests__/mcp-conformance.test.ts` against a real socket.
- **Documentation** — `backend-cluster/backend-v2/README.md` "Connecting an MCP client", surfaced from the root `README.md`. The `403` text quoted there was checked against `ForbiddenError`'s actual category and status.
- **Gates** — `yarn test` (2614 tests, 193 suites), `yarn lint`, `yarn typecheck` all pass. New guards were each confirmed to fail against the code as it stood before their change.

## Source + Goal linkage

- **Source:** `backend-cluster/backend-v2/docs/ADR0007-mcp-surface.md` — the MCP surface's contract, written after a live probe of the endpoint found that the parts of that contract living outside a tool handler had never been anyone's stated responsibility. This milestone carries the ADR's remaining in-repo decisions: D8 (`outputSchema`) and the D9/D10 conformance tooling.
- **Goal linkage:** **A1 — agent-native accounting.** MCP is the surface a coding agent connects to; it is the most direct expression of the pillar. An endpoint whose tools publish no output contract, and whose operators have no way to check whether their deployment is connectable, is agent-native in name only. Secondary **A3** — `deploy/docker/` self-hosters are a real audience, and a conformance check they can run against their own stack is the difference between "it works" and "we think it works".
- **Expected outcome:** Someone running Beancount.io — hosted or self-hosted — can point an MCP client at it, receive seven tools with validatable output, and when it doesn't work get told which of the seven checks failed. Measured by MCP clients completing `tools/list` against a deployment.
- **Why now:** ADR 0007's other decisions landed with the ADR (D2 method set, D6 refusal dialect, D7 error masking, D9 guards); these are the remainder that can land entirely in this public monorepo. The conformance script is sequenced first among the two follow-ons because it is what makes the rest verifiable — including for the deployment work that lives outside this repo.
- **Adoption surface task included:** the endpoint, its tool contract, and its documentation are all things a coding agent or an operator touches directly.

## Out of repo scope

Three of ADR 0007's decisions cannot land here and are deliberately not tasks on this board: edge routing for the public path (D1), seeding the OAuth signing key into a deployment's secret store (D4), and applying schema migrations to a running database (D10). Those are operator actions on a specific deployment, not changes to this monorepo. The conformance check from t002 is what lets an operator confirm each one, which is the in-repo half of the problem.
