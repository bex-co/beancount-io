# w6 · m6.5 — Distribute the Beancount.io customer skills as one suite

**Worker:** worker1 **Goal:** A user discovers, installs and updates the customer ledger workflows through one versioned Beancount.io suite entry on each supported host. **Status:** blocked (9/12 tasks done; public suite 0.4.0 and standalone retirement pass; Hermes admission and third-party catalog refreshes remain)

## Scope and decisions

- Explicit owner request, 2026-10-22: create **m6.5** and execute the suite consolidation described in this conversation. The decimal milestone ID is explicitly requested; every task keeps the same ID and path.
- Preserve completed [m6](../../done/m6/README.md) and the thirteen immutable standalone ClawHub release histories. Consolidate distribution and version management while preserving individual skill triggers, responsibilities and canonical source files.
- Reuse existing Claude Code/Codex suite manifests. Confirm the real ClawHub/OpenClaw/Hermes package contracts before selecting a format; no new runtime dependency is authorized.
- Ship directly to main under the owner's standing instruction. Existing protected publishing credentials may be used; do not create new credentials, alter retained OAuth grants, send external messages or bypass host scanners.
- Existing Hermes init policy and filtered-search findings remain [039](../039.md) and [040](../040.md); this milestone records their actual effect on a supported suite route.
- Owner follow-through, 2026-10-22: clean up the previous scattered distribution entries too. Retire the thirteen owned standalone listings through reversible owner soft-delete, retain history/local copies, and update current guidance. This supersedes their initial continued-public-availability decision without rewriting completed m6 or t006 evidence.
- Owner follow-through, 2026-10-23 UTC: audit the other publication channels and update any scattered distribution there too. Preserve the existing one-plugin Claude Code/Codex channels, group the skills.sh collection, use the explicit whole customer-directory install, and track stale third-party index read-backs separately from owned releases.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](done/t001.md) | Confirm supported suite formats and existing ownership — **DONE** | 45m | — |
| [t002](done/t002.md) | Build one versioned customer-suite artifact — **DONE** | 60m | t001 |
| [t003](done/t003.md) | Ship protected publication and submit the suite — **DONE** | 45m | t002 |
| [t004](done/t004.md) | Verify native OpenClaw suite install and update — **DONE** | 45m | t003 |
| [t005](t005.md) | Verify the supported Hermes suite route — **BLOCKED** | 45m | t002 |
| [t006](done/t006.md) | Preserve legacy standalone installation compatibility — **DONE** | 30m | t002 |
| [t011](done/t011.md) | Retire the scattered standalone distribution entries — **DONE** | 30m | t004, t006 |
| [t012](t012.md) | Align the remaining distribution channels and verify catalog refreshes — **BLOCKED** | 45m | t004, t011 |
| [t007](done/t007.md) | Adoption surface — **DONE** | 30m | t002, t006 |
| [t008](done/t008.md) | Simplify — **DONE** | 20m | t007 |
| [t009](done/t009.md) | Test coverage — **DONE** | 45m | t007, t008 |
| [t010](t010.md) | Closeout — **BLOCKED** | 15m | t003, t004, t005, t009, t011, t012 |

## Definition of done

- One versioned suite package is accepted and publicly available through the selected supported registry route, built from canonical customer skill sources with matching provenance and MIT-0 licensing.
- A single native OpenClaw install exposes all thirteen intended workflows; supported discovery, update and transition from individual installs are verified in an isolated profile.
- Hermes has an exercised suite setup/update route using the same source inventory, with its native policy restrictions explicitly retained and no force-install or scanner bypass. An unavailable upstream route remains open with its unblock condition rather than being called delivered.
- Existing Claude Code and Codex suite installs remain valid. Legacy standalone ClawHub listings are retired without deleting historical evidence or existing local copies; current online install/update guidance targets the suite.
- Suite-first public documentation agrees with exact exercised commands and host limits; meaningful regression tests and owning-package checks pass.
- Other owned channel configuration presents the customer suite coherently; stale third-party indexes have actual refresh/read-back evidence rather than a claim that a source-only change updated them.
- Standing closing tasks are complete; /pm moves all tasks and this milestone into their done locations with consistent links and statuses.

## Source + Goal linkage

- **Source:** owner direction after m6 closeout, 2026-10-22: consolidate scattered skill distribution into one suite, then explicit “pm for m6.5 and execute it”.
- **Goal linkage:** **A3 — Community & distribution:** one product entry and release history. **A2 — Frictionless onboarding:** install and update the suite once. **A1 — Agent-native accounting:** sibling workflow handoffs retain their contracts and discovery.
- **Expected outcome:** a newcomer selects Beancount.io once and obtains the supported ledger workflows without assembling thirteen separately versioned installations.
- **Why now:** m6's verified standalone releases establish working source content and host baselines; the owner now selects suite distribution for subsequent publication. Reuse existing suite packaging and preserve that completed history. Adoption surface is included because install, update, discovery and release guidance change.

## Out of scope

- New accounting behavior, reworking skill descriptions/routing, MCP marketplace submissions, permanently deleting release history, new credentials, paid platform fees, and unsolicited upstream outreach.

## Hermes admission finding — 2026-10-22 UTC

The selected suite artifact is supported for ClawHub publication and OpenClaw content loading. Hermes's complete-suite route has the actual upstream admission gates in [t005](t005.md#blocked--2026-10-22-utc). Native publication, OpenClaw checks, compatibility guidance and regression tests continue; m6 remains done. No additional owner input is needed for these independent steps.

## Initial native and CI snapshot — 2026-10-22 UTC

The local suite installs as one skills-only native OpenClaw bundle: all 13 skills are visible/callable, all 53 authored package files match and all 48 projected skill/reference files preserve their bytes and reference closure. Legacy precedence and safe transition are complete in t006. Hosted CI passes 152 suite tests, 37 checker tests, 38 published-minimum recipes and 11 QA helper tests. The protected first publication run is 39859124712 at source d493eb1c7b4e427a209b8378219f46fc4b71a4f0; its main validation and environment approval pass, while publication was still active at that snapshot. Public install/update had not yet been verified; they subsequently pass as recorded below. No duplicate upload occurs.

## Independent closing work — 2026-10-22 UTC

Documentation records the current deliverable and its real limits, so it does not need to wait for a registry worker or a host-policy fix. Its dependencies are t002 and t006; Simplify and Test coverage still follow Adoption surface. Closeout explicitly depends on t003, t004, t005 and t009, retaining every actual publication/native-update/Hermes requirement. This dependency correction allows the independently verified adoption, review and tests to finish without declaring the suite distribution DoD met. t007–t009 are complete and archived; publication was still pending at this earlier snapshot.

## Earlier block — 2026-10-22 UTC

All independent implementation, local folder/ZIP installation, migration, documentation, simplification and test work is complete and archived. The remaining three tasks retain actual delivery requirements:

- **t004:** accepted ClawHub attempt zx76nyp6dz5nf2zc8yj77maemx8gr01a remains pending_checks because ClawScan timed out; TruffleHog is clean. The public package lookup returns 404, so real registry install/update cannot run yet. **Unblock:** ClawHub's service completes its existing attempt and makes 0.4.0 public; the repository worker verifies all 53 files and the native registry install/update without scanner override. No repository review or user approval remains.
- **t005:** Hermes v0.22.4 is still the latest official release. Its portable reader refuses the existing nested host metadata, and its default native installer refuses the complete suite as DANGEROUS/20 findings. **Unblock:** a compatible metadata/admission path preserves all intended workflows and host policy; then the repository worker verifies native suite discovery/update. Hermes maintainers own the init-policy gate, with w6/039 preserved.
- **t010:** the observable DoD still requires public registry distribution/native update and supported Hermes suite admission. **Unblock:** t004 and t005 meet those real conditions, then close and archive the milestone. Existing accepted content is not uploaded again to manufacture progress.

No additional owner input is necessary for the completed work. Exact stage, public/private lookup distinction, source versions and tests are recorded in the public suite-distribution guide. Completed m6 remains unchanged.

## Publication gate cleared — 2026-10-22 UTC

The original attempt zx76nyp6dz5nf2zc8yj77maemx8gr01a automatically finalized as published with both scanners clean and no error. t004 resumed public registry installation/update immediately; no upload was repeated. Earlier scanner-timeout paragraphs are retained as history. Hermes admission still independently prevents final milestone closure.

## Current blocker — Hermes only, 2026-10-22 UTC

The same accepted 0.4.0 attempt is published, both scanners are clean, the public 53-file map matches, native search returns one suite entry, and actual public install/managed update pass with all 13 skills. t004 is complete and archived. The client-timeout and Git-source failures above remain historical controls, not current publication blockers. No upload was repeated.

Nine tasks are complete, including the later owner-requested retirement in t011 below. t005 retains the actual Hermes portable metadata/default-scanner admission requirements. The subsequent owner request adds t012's third-party catalog read-backs; t010 depends on both. **Unblock:** Hermes provides a compatible supported admission path preserving workflows and host policy, and the affected catalogs refresh their stale source records; the repository worker verifies those results and closes the milestone only when its complete DoD holds. Existing w6/039 retains the init-policy finding.

## Standalone retirement follow-through — 2026-10-22 UTC

The owner requested cleanup after suite publication. t011 retires all thirteen standalone listings through ClawHub's owner soft-delete, with a suite migration reason and retained restore receipts. All thirteen anonymous lookups return 404, complete prefix pagination finds zero owned standalone entries, and unified search returns the one public suite. Native managed update still passes with all thirteen workflows and 53/53 matching files. Current installation guidance removes the old online install/update commands; historical m6 and release evidence remain intact. Fresh Hermes standalone installation is retired too, and full-suite Hermes admission remains explicitly unsupported. This narrow follow-through includes its own adoption review and verification; the earlier completed closing-task evidence is retained, and final Closeout now also depends on t011.

## Other channel follow-through — 2026-10-23 UTC

Claude Code and Codex already publish one shared-version suite. skills.sh still exposes historical individual rows, including contributor tools, so root `skills.sh.json` groups the complete customer suite first and labels development separately. A CI inventory gate and five regression cases prevent audience mixing and stale membership. Skills CLI 1.5.23 installs and refreshes the explicit customer folder for exactly thirteen workflows on both agents; a separate native update exceeded its 240-second window and is not called passing. Current guidance prefers versioned plugins and records the exercised whole-suite refresh.

skills.rest accepts one automatic customer-root index refresh, but its old paths/generated selectors and internal entries remain pending read-back. SkillsMP already groups the repository but retains old paths/descriptions; its inspected public contract provides no guaranteed refresh schedule or established owner edit/delete route. t012 retains these external index conditions. A separate optional Pack was explored but not published; it is not a prerequisite for updating the existing collection and no additional local-file permission is needed for this follow-through. No repeated submissions, artificial telemetry, unsolicited messages or new per-skill releases are used.

At 00:40 UTC the skills.sh condition clears independently: after one documented native maintainer install, the public repository page shows all thirteen customer workflows in **Beancount.io suite**, including accruals/property/roll-forward, followed by nineteen explicitly separate **Repository development** entries. t012 now waits only for the other third-party source-index read-backs; no further skills.sh configuration or additional browser file permission is required.
