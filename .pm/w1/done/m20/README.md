# w1 · m20 — Optional accounting tools in the independent engine

**Worker:** worker1 **Goal:** users explicitly enable Beangulp and Beanprice through bea while preserving the isolated frontend, small base installation, and reviewed licensing basis **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Provision reviewed optional features in the engine environment — **DONE** | 60m | w1/m19/t012 |
| t002 | Execute Beangulp identify extract and archive independently — **DONE** | 60m | t001 |
| t003 | Execute Beanprice quote retrieval independently — **DONE** | 45m | t001 |
| t004 | Verify base and optional engine installations — **DONE** | 60m | t002, t003 |
| t005 | Adoption surface — **DONE** | 25m | t004 |
| t006 | Simplify — **DONE** | 30m | t005 |
| t007 | CI + test coverage — **DONE** | 45m | t005, t006 |
| t008 | Closeout — **DONE** | 15m | t007 |

## Definition of done

- m19 is complete. Beangulp, Beanprice, configured importers, and quote providers execute in selected engine processes; they are never imported into the bea frontend.
- The supported bea ingest group delegates identify, extract, and archive through the user's upstream configuration lifecycle, including hooks, batch inputs, deduplication, dry runs, collisions, and output/file effects.
- bea price delegates the selected Beanprice version and matches deterministic current/historical quote and provider-error fixtures. bea add price and existing import preview/apply behavior retain their meanings.
- A documented bea-level opt-in provisions reviewed, hash-pinned optional engine dependencies without separate upstream package installations. Base installations remain free of optional packages under ADR012.
- Every supported optional profile preserves the resolved base licensing basis, required notices/source delivery, lifecycle ownership, and frontend isolation in actual artifacts/installations.
- CLI checks and installed base/optional rehearsals pass. ADR014 optional coverage and publication status are accurate; m21 owns the remaining cross-skill onboarding updates.

## Source + Goal linkage

- **Source:** User request to realign m20 on 2026-09-11; [ADR014](../../../docs/adrs/ADR014-cli-beancount-parity.md) and [ADR012](../../../docs/adrs/ADR012-cli-beangulp-not-a-hard-dependency.md).
- **Goal linkage:** **A1 — Agent-native accounting:** complete import/archive and quote workflows remain available through bea. **A2 — Frictionless onboarding:** optional functionality is enabled through one supported bea choice.
- **Expected outcome:** Users activate a selected accounting feature once and run it through bea without installing or managing another Python accounting CLI.
- **Why now:** Sequence after m19/t012 so optional packages reuse the proven launcher, provisioning, and release checks without reintroducing in-process coupling.
- **Closing tasks:** Adoption surface is included because command and optional-install choices are customer/agent-facing.

## Boundaries

Python extras must not pull optional accounting libraries into the frontend environment. Optional activation may use engine profiles or equivalent package-managed selection, with exact licenses reviewed before distribution. Follow ADR014's ordinary command/file/result contracts and preserve ADR012's optionality.
