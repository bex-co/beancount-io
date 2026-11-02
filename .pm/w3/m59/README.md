# w3 · m59 — Ledger creation: personal modules in the setup specification, builder, and CLI

**Worker:** worker3 **Goal:** a personal ledger can also carry investments, a rental property, or a side business as name-spaced modules, chosen through the same setup specification on REST, GraphQL, MCP, hosted CLI, and local `bea init`. **Status:** in progress (t001–t004 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Add the three modules to the catalog and conformance fixtures — **DONE** | 60m | w3/m53/t005 |
| t002 | Accept `modules` in the hosted builder, create, and preview on all three surfaces — **DONE** | 90m | t001 |
| t003 | Build modules in the Python engine and add `--module` to `bea init` and hosted create — **DONE** | 60m | t001, t002 |
| t004 | Run cross-engine conformance for every module — **DONE** | 45m | t002, t003 |
| t005 | Adoption surface | 30m | t004 |
| t006 | Simplify | 20m | t005 |
| t007 | Test coverage | 45m | t005 |
| t008 | Closeout | 10m | t006, t007 |

## Definition of done

- `setup.modules` accepts `investments@1`, `rental-property@1` (with an optional ASCII property name, default `Property1`), and `side-business@1` with `preset: personal@1` on REST, GraphQL, MCP, `bea cloud ledger create --module`, and `bea init --module`; each opens exactly the PRFAQ001 Appendix A.9 accounts once, and the files do not depend on module order.
- A non-empty `modules` with any other preset, an unknown module, or a repeated one is refused identically on every surface and creates nothing.
- `previewLedgerSetup` and the REST/GraphQL preview report every module account, and a first account may name a selected module's account.
- Appendix A.9's acceptance scenario passes on both engines, with one fixture per module plus one with all three.
- Omitting `modules` produces byte-identical files to today's `personal@1` output.

## Source + Goal linkage

- **Source:** [PRFAQ001](../../../docs/prfaqs/PRFAQ001-ledger-creation.md) §3, §4, §5 and Appendix A.9, and [ADR021](../../../docs/adrs/ADR021-backend-v2-ledger-creation-experience.md) setup specification, adopted 2026-10-27 ("one purpose per ledger, modules under personal"); purpose-step wireframe `docs/images/ADR021-wireframe-purpose.svg`.
- **Goal linkage:** A2 — Frictionless onboarding: a household that also invests, rents out a property, or freelances gets its real structure on day one instead of hand-writing `open` directives; A1 — agents express the same choice through `setup.modules` and `--module`.
- **Expected outcome:** the most common Beancount household shape (everyday money plus brokerage, property, or side income — the shape `docs/skills/first-year-investor.md` builds by hand today) is created in one step on every surface. Signal: share of personal ledgers created with at least one module; fewer manual `open` directives in a ledger's first week.
- **Why now:** the creation flows shipped in m54 are single-select; the rework to the 2026-10-27 design ([649](../649.md)) needs `setup.modules` first, so the contract lands before any client renders the module list. Adoption surface is included (t005) because this adds API fields, CLI flags, and catalog entries that agents and the `beancount-init` skill must discover.
