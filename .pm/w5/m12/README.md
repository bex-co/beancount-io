# w5 · m12 — Graduate a CSV workflow into a tested, maintainable importer

**Worker:** worker1 **Goal:** an existing CSV user graduates to a reusable importer, preserves imported history, and repairs bank-format drift through either installed agent **Status:** in progress (t001, t002, t003, t004 done)

**Estimate:** 4h15m implementation; 6h including standing closing tasks (9 tasks). Priority 1 in the approved proposal.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Package graduation, overlap, and bank-format drift fixtures — **DONE** | 45m | — |
| t002 | Package the supported authoring environment and ingest runner — **DONE** | 60m | w5/m12/t001 |
| t003 | Write the graduation and repair walkthrough with executable checkpoints — **DONE** | 60m | w5/m12/t002 |
| t004 | Rehearse importer graduation and repair through Claude Code — **DONE** | 45m | w5/m12/t003 |
| t005 | Rehearse importer graduation and repair through Codex | 45m | w5/m12/t003 |
| t006 | Adoption surface | 25m | w5/m12/t004, w5/m12/t005 |
| t007 | Simplify | 20m | w5/m12/t006 |
| t008 | Test coverage | 45m | w5/m12/t006, w5/m12/t007 |
| t009 | Closeout | 15m | w5/m12/t007, w5/m12/t008 |

## Definition of done

- A self-contained walkthrough starts from previously imported synthetic CSV history and confirmed import configuration, then produces a reusable importer with reviewed golden files through either installed agent.
- Both agents reuse the confirmed account, date, and sign settings. Ambiguous new semantics require clarification; golden output is reviewed against source rows before acceptance.
- The documented authoring environment matches the supported Beangulp version and the wired runner works through bea ingest. Source-only extraction is explicitly distinguished from balanced, validated ledger writes.
- Overlapping history adds zero duplicate entries; genuinely new activity appears exactly once. Source identities remain compatible with prior imports, and bea check passes after approved writes.
- A minimal repair accepts the renamed bank headers while preserving the old golden files and rejecting an unrelated CSV. No unreviewed golden rewrite is used to hide changed behavior.
- Declining runner wiring preserves the existing runner and ledger. Real Claude Code and Codex sessions record versions, intervention counts, elapsed time, and checkpoint results; unavailable or failing sessions cannot satisfy closeout.
- Required skills structural and behavioral checks and agent-guidance checks pass. The walkthrough and its limitations are discoverable from the customer suite's entry points.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w5`, both proposals approved with `$pm for all for w5` on 2026-09-28. Builds on [w2/m2's authoring skill](../../w2/done/m2/README.md), [w1/m21's managed-engine integration](../../w1/done/m21/README.md), the [current authoring instructions](../../../skills/.claude/skills/beancount-importer-author/SKILL.md), and the [CLI import guide](../../../cli/docs/IMPORTING.md).
- **Goal linkage:** **A1 — Agent-native accounting** and **A2 — Frictionless onboarding**. A person whose bank needs a reusable importer can graduate from repeated CSV imports without losing confirmed mappings or duplicating prior entries.
- **Expected outcome:** Both installed agents complete one documented graduation and repair journey with correct extraction and ledger effects. Record completion time, corrective interventions, and duplicate counts as rehearsal signals, not production adoption metrics or proof of general model reliability.
- **Why now:** The authoring skill and managed-engine integration already exist, and w5's first-month and migration journeys are complete. The remaining customer asset connects an existing ledger to the separate authoring environment, managed execution, and subsequent imports. w5 has capacity while m5 and 015 retain independent external blockers.
- **Adoption surface:** included because the shipped assets are customer- and agent-facing. Preserve equivalent discovery and workflow semantics for Claude Code and Codex and document actual platform limits.

## Boundaries and dependencies

- Implementation belongs in skills/; root discovery pointers may change during Adoption surface. Reuse existing importer-author eval fixtures, upstream Beangulp's golden harness, source identity conventions, and the shipped journey helpers where appropriate. Use skills/tmp/ for synthetic workspaces and raw session artifacts.
- Use only the already supported Beangulp optional profile and its dependencies plus the standard library. Authoring uses the documented separate project environment; execution uses public bea commands. Do not install arbitrary packages into the managed engine, read private engine paths, or decide blocked 015's product question.
- This is a customer walkthrough and executable checkpoint asset, not a replacement authoring skill, accounting engine, importer framework, or general benchmark system. Do not recreate w2/m2 or w1/m21.
- Preserve the distinction between the beangulp.Ingest runner used by bea ingest and a CONFIG-based bea import configuration. Show the supported categorization and validated-write handoff explicitly rather than feeding unbalanced extraction directly into the ledger.
- Scope any demonstrated CLI defect as a separate prerequisite repair. Never edit expected ledger results or weaken checkpoints to conceal it; a required unpublished repair remains a release prerequisite for ordinary-install acceptance.
- m12 and m13 are independent. m5 and 015 retain their existing unblock conditions. Rehearsal closeout requires access to both authenticated agents; if unavailable, record the exact missing access and owner with /pm block.
- No hosted ledger export, bank linking, deployment, new MCP stack, or new runtime dependency is needed. Publish synthetic summaries only.
