# w6 · m12 — Publish the hosted MCP connector on Muse and Gemini Apps

**Worker:** worker1 **Goal:** People discover Beancount.io through Muse's connector directory and Gemini Apps' Connected Apps distribution, then connect their own hosted ledger and complete a verified accounting request. **Status:** blocked (t001 publisher authenticator; t003 actual Google access waitlist submitted; seven other tasks defer)

**Implementation estimate:** about5h across9tasks, excluding platform access,
review and rollout latency. Muse and Gemini are independent execution branches;
a blocked portal or review on one never prevents the other from progressing.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](t001.md) | Prepare and submit the Muse connector — **BLOCKED: publisher authenticator** | 45m | — |
| [t002](t002.md) | Verify Muse review, public discovery and native accounting | 45m | t001 |
| [t003](t003.md) | Onboard Gemini Connected Console and verify domain/authentication — **BLOCKED: preview access waitlist submitted** | 45m | — |
| [t004](t004.md) | Verify Gemini preview and submit the connected app for review | 45m | t003 |
| [t005](t005.md) | Publish the approved Gemini app and verify public/native availability | 30m | t004 |
| [t006](t006.md) | Adoption surface | 30m | t002, t005 |
| [t007](t007.md) | Simplify | 15m | t006 |
| [t008](t008.md) | Test coverage | 30m | t006, t007 |
| [t009](t009.md) | Closeout | 15m | t008 |

## Current route evidence — 2026-10-30 UTC

- **Muse:** the official [platform](https://platform.muse.ai/) links its actual
  [submission entry](https://platform.muse.ai/submission), currently redirecting
  the anonymous reader to login. [Published connector guidelines](https://platform.muse.ai/docs)
  now describe intake, review and discovery. The prior ADR's third-party-only
  account needs a dated update after verifying the actual supported flow.
- **Gemini Apps:** Google's current [Connected Apps overview](https://developers.google.com/connected-apps/)
  links [preview access](https://connected.google.com/console/help/?apply=).
  The [Connected Console](https://connected.google.com/) owns registration,
  testing, review and publication; [Developer Mode](https://gemini.google.com/devmode)
  provides native pre-submission testing. An available-to-testers app, custom
  URL connection or approved-but-unpublished version is not a public listing.
- [Muse assessment](../../../../backend-cluster/backend-v2/docs/marketplace-submissions/muse/intake-assessment-20261030.json)
  and [Gemini assessment](../../../../backend-cluster/backend-v2/docs/marketplace-submissions/gemini/intake-assessment-20261030.json)
  record public observations only. No authenticated console access, existing
  private application, accepted submission or host acceptance is established.

## Definition of done

- One canonical Muse submission is accepted, review corrections are addressed,
  and its actual public connector can be discovered and connected in Muse.
- One Gemini Connected Apps registration targets Gemini Apps, is accepted for
  review, approved and actually published; an eligible ordinary account can
  discover/connect the released app rather than relying on a tester-only draft.
- Both exact advertised native paths pass authentication, discovery, a known
  synthetic read and one supported dry-run preview with independent unchanged
  ledger proof. Record real versions, observed deployment, times and limits.
- [The canonical tracker](../../../../backend-cluster/backend-v2/docs/mcp-marketplaces.md)
  keeps actual operation/manage links, stage, last checked at UTC, receipt,
  owner, next trigger and unresolved conditions. Preparation is never a receipt.
- All closing tasks are complete and the milestone/tasks exit to done/ through
  `/pm`. A pending external review remains open with owner and **Unblock:** event.

## Source + Goal linkage

- **Source:** owner's `$pm muse and gemini listing for our mcp` request,
  2026-10-30UTC, extending w6's existing MCP distribution work.
- **Goal linkage:** **A3 — Community & distribution** (primary), **A1 — Agent-native
  accounting** and **A2 — Frictionless onboarding** (secondary).
- **Expected outcome:** Muse and Gemini users find the canonical hosted connector
  and reach an authenticated accounting answer through the listed native route.
- **Why now:** existing18-target ownership omits these two requested app surfaces;
  official Muse guidelines and Google's Connected Apps onboarding are now
  available. Neither depends on the other catalogs' moderation queues.
- **Adoption surface:** included because this introduces customer discovery and
  native connection paths; existing endpoint, metadata, assets and QA are reused.

## Boundaries and execution policy

- Reuse `https://beancount.io/api-gateway/mcp`, current registry identity and the
  existing dedicated synthetic QA setup. Do not provision a second stack, use
  production ledger data, revoke retained grants or invent a stdio/package path.
- Inspect the current account and deduplicate before any application. Preserve
  real account/reviewer information and credentials privately; public evidence
  contains redacted facts and public project URLs only.
- Resolve ordinary implementation choices and finish authorized preparation
  autonomously. Ask only for concrete indispensable input or actual mandatory
  action-time confirmation, with the reviewable payload ready. Park only the
  affected task and continue the other independent branch.
- Preserve existing authorization, credential pinning, refresh rotation and API
  parity. Validate actual console requirements when documentation differs; do
  not weaken security or adopt a global callback wildcard to pass onboarding.
- Gemini here means **Gemini Apps via Connected Apps Platform**. CLI Gallery,
  API/Enterprise custom configuration, Android AppFunctions and per-user manual
  connections do not substitute for this listing. The separate local skills
  suite/mirror work in [w2/087](../../../w2/blocked/087.md) is not a dependency.
- Do not add a standalone skill listing, duplicate application, paid placement,
  unsolicited status email or new dependency. Targeted required intake is the
  authorized distribution work; own-repository changes ship directly to main.

## Blocked

- **t001:** actual email login reaches the existing publisher's authenticator
  challenge. Public/auth/tool/reviewer preparation is retained in the Muse
  packet, with no submission claim. **Unblock / owner:** publisher completes
  this existing challenge; worker inspects/deduplicates actual applications
  and finishes/submits the canonical payload. t002 defers on t001.
- **t003:** actual production publishing preview request accepted in Play Console. **Unblock / owner:** Google selects the existing account or opens supported self-serve access; worker performs real registration/domain/auth/tool setup. Manual not before2026-11-07UTC or actual feedback earlier; no duplicate application.
- t004/t005 defer on t003 and later actual review; closing tasks keep the
  original public/native dependencies.

## Current milestone placement — 2026-10-31 UTC

Both independent implementation branches are genuinely blocked: t001 on the
existing publisher authenticator and t003 on Google's actual preview selection.
All other tasks depend on these gates and later real review/public/native
acceptance. m12 is parked; its prepared Muse packet and accepted Google access
request remain shipped. Independent changed/due w6 review items continue.
