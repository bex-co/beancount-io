# w1 · m19 — Independent Beancount engine and complete bea command parity

**Worker:** worker1 **Goal:** one bea installation supplies native parity and existing ledger features through a separate, reviewed engine without frontend Beancount imports **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Record ADR014 license and distribution requirements | 45m | — |
| t013 | Resolve the audited engine dependency license conflict | 60m | t001 |
| t014 | Package the independent ledger command helper | 60m | t013 |
| t015 | Provision the managed engine for PyPI installations | 60m | t014 |
| t016 | Provision the separate engine through Homebrew | 45m | t015 |
| t017 | Keep engine reuse repair and upgrades consistent | 45m | t015, t016 |
| t002 | Run native commands in the independent engine process | 45m | t014, t015, t016 |
| t003 | Delegate bean-check validation | 30m | t002 |
| t004 | Delegate bean-format and migrate its default | 45m | t002 |
| t005 | Delegate native and extended query modes across the boundary | 60m | t002 |
| t006 | Expose the complete bean-doctor command group | 45m | t002 |
| t007 | Expose bean-example and treeify | 30m | t002 |
| t018 | Move directive reads and shared ledger utilities to the helper | 60m | t002 |
| t019 | Move validated directive writes to the helper | 60m | t018 |
| t020 | Move balances and Fava reports to the helper | 60m | t018 |
| t021 | Move init and import accounting operations to the helper | 60m | t019 |
| t022 | Keep AI SDKs separate from ledger execution | 45m | t005, t019 |
| t023 | Enforce frontend isolation and complete artifact materials | 60m | t017, t003, t004, t005, t006, t007, t020, t021, t022 |
| t008 | Verify one installation across all commands and both channels | 60m | t023 |
| t009 | Adoption surface | 25m | t008 |
| t010 | Simplify | 30m | t009 |
| t011 | CI + test coverage | 45m | t009, t010 |
| t012 | Closeout | 15m | t011 |

## Definition of done

- One documented Homebrew or PyPI bea installation supplies the frontend and automatically provisioned separate engine. Customers do not install Beancount/Beanquery or configure engine paths themselves.
- All six ADR014 native commands run as child processes with supported inputs/options, streams, exit status, terminal/signal behavior, and file effects. All doctor operations and interactive query handlers have conformance evidence.
- The frontend never loads Beancount, Beanquery, or Fava through startup, native, add/list, balance/report, init/import, or ask paths. Engine-dependent existing features run through an independently invocable helper with documented business-level inputs/results.
- Exact values, strict/lenient reads, full-ledger validation, atomic writes, append-only alignment, import-id deduplication, preview/apply, and AI tool behavior remain covered. Cloud and optional AI SDKs stay in the frontend.
- The audited engine dependency compatibility issue has a documented supported resolution. Applicable notices, full licenses, metadata, and corresponding-source delivery are verified in actual frontend/engine/helper artifacts and installed Homebrew contents.
- PyPI first-use provisioning, Homebrew provisioning, offline reuse, absent/conflicting global tools, failure recovery, and normal upgrades pass clean-artifact rehearsals. Reuse existing w2/m25 release tooling and state publication status accurately.
- CLI checks pass, ADR014 records verified evidence, and m20/m21 remain explicitly pending for optional ecosystem and skills follow-up work.

## Source + Goal linkage

- **Source:** User replanning request on 2026-09-11 and [ADR014](../../../docs/adrs/ADR014-cli-beancount-parity.md); builds on the completed w1/m11–m18 CLI/skills work.
- **Goal linkage:** **A2 — Frictionless onboarding:** one installation maintains the complete local toolchain. **A1 — Agent-native accounting:** agents retain validated writes and precise reads through public commands. **A3 — Community & distribution:** release claims have verifiable artifact and license evidence.
- **Expected outcome:** A newcomer installs bea once and uses all default local commands without global bean-* tools or frontend engine imports.
- **Why now:** Native subprocess wrappers alone leave engine imports in other workflows. Finish the entire boundary and license/artifact requirements before m20 adds optional packages.
- **Closing tasks:** Adoption surface is included because installation, flags, outputs, and recovery are customer/agent-facing. Tasks retain their existing IDs; newly added t013–t023 are placed in dependency order before the standing closing tasks.

## Boundaries

ADR014 is the implementation contract. Ordinary CLI/file/result communication supports an independent-program design; separate downloads, two venvs, or JSON alone do not establish GPL compliance. t001 records obligations, t013 resolves the audited Beancount/regex combination, and t023/t008 verify artifacts. Keep unresolved conditions open. No backend/API changes or upstream accounting reimplementation are included.
