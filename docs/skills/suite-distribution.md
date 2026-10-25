# Beancount.io suite distribution

One Beancount.io package carries the thirteen customer workflows, their original
skill names and their shared references. Claude Code and Codex retain their
existing [whole-suite plugin installs](installation.md#plugin-both-clients).
Subsequent ClawHub releases target **`@puncsky/beancount-io`** as a single
`bundle-plugin`; the thirteen individual listings are retired through owner
soft-delete. [m6](../../.pm/w6/done/m6/README.md) preserves their completed
verification; [m6.5](../../.pm/w6/blocked/m6.5/README.md) owns this transition.

## Release status — 2026-10-22 UTC

Suite **0.4.0** is public as
[`@puncsky/beancount-io`](https://clawhub.ai/plugins/@puncsky/beancount-io),
from source `d493eb1c7b4e427a209b8378219f46fc4b71a4f0`. The original accepted
attempt finalized after the client's bounded wait ended; ClawScan and
TruffleHog are both clean. No second upload was issued. Native OpenClaw package
search returns this single bundle-plugin entry. Public installation, discovery
and managed update pass with all thirteen skills and **53/53** matching authored
files. The same package is Safe under the host's default registry trust policy.

```sh
openclaw plugins search beancount-io --json --limit 20
openclaw plugins install clawhub:@puncsky/beancount-io --accept-capabilities
openclaw plugins update beancount-io
openclaw skills list --json
```

These exact forms were exercised with OpenClaw 2026.10.5. The capability flag
accepts the declared skills-only surface; no force, install-policy override,
runtime dependency, hook or MCP connection is involved. The managed update
re-downloads/reinstalls the current 0.4.0 package; this is not a claim of a
cross-version upgrade to an unpublished version. Both registry install records
retain the same integrity and all thirteen skills remain eligible,
model-visible and user-invocable after update. An unrelated skill is unchanged.

The real pinned ClawHub CLI 0.23.3 also accepts anonymous package preview and
native inspector validation against OpenClaw 2026.10.5, with no hard errors or
runtime execution. Its P2 missing-package.json notice is retained for the
intentionally content-only bundle.

The content-only package uses the existing portable `plugin.json`, a generated
`.claude-plugin/plugin.json`, and the registry-required `openclaw.plugin.json`.
OpenClaw's Claude bundle marker selects its bundle loader without a native
runtime entrypoint or dependencies. No hooks or MCP connections are added.
The version is the same version declared by the existing Claude Code/Codex
suite; no separate per-skill release numbering is needed for future releases.

## Exact publication gate

**Resolved:** the original attempt is now finalized/published with both checks clean.

Accepted attempt **`zx76nyp6dz5nf2zc8yj77maemx8gr01a`** retains version 0.4.0,
release `rd7e2pj0a75v2fy77ympf414318gsny2` and registry artifact SHA-256
`550e23c92e1380d45a3f92cd5cd4d7068b15b6637c8ca7dba3bdd34a488b6a04`.
The authenticated attempt API initially reported the following; its latest result is now finalized/published, terminal true, both checks clean and error null:

| Field | Actual result |
| --- | --- |
| Publication at client timeout | `pending_checks` / `pending`, not terminal |
| Latest publication | `finalized` / `published`, terminal true |
| TruffleHog | `clean`: no verified secrets in the staged artifact |
| ClawScan at client timeout | `failed`: `clawscan timed out` |
| Latest ClawScan / TruffleHog | both `clean` |
| GitHub publish job | client wait timed out after 1200 seconds |
| Credential cleanup | passed |
| Retained public artifact | [53-file artifact](https://github.com/bex-co/beancount-io/actions/runs/39859124712/artifacts/12462551103), all 53 authored hashes match the source map |

The earlier gate was a ClawHub scanner-operation failure, not a request for owner
approval or a malicious-content verdict. The existing attempt subsequently
finished its normal checks and the public native installation/update passed. Current upstream source
retries scanner failures with backoff; its manual recovery route is restricted
to eligible failed OpenClaw-release attempts, not this active community attempt.
No unsupported recovery request or duplicate upload is made.

The accepted receipt is recorded in `scripts/skills/clawhub-publications.json`.
The release helper now refuses to upload that accepted version again even
when the package lookup returns 404. The actual anonymous CLI refusal and a
regression test both verify this case; all 15 focused artifact/release tests pass.
After any future accepted submission, record its receipt before another dispatch.

**Cleared:** ClawHub completed the existing attempt and the repository worker
verified its public 53-file artifact and native registry install/update. Full
milestone closure still needs the separate Hermes compatibility gate below.
No new repository review, credentials or owner answer is outstanding.

## Publication and compatibility contract

The [protected workflow](../../.github/workflows/publish-clawhub.yml) builds from
`skills/beancount-*/`, excluding eval fixtures, hidden files and development
skills. Symlinked runtime content, missing shared references, manifest inventory
drift and inconsistent suite versions fail the build. The single root `LICENSE`
is copied from the canonical MIT-0 `skills/LICENSE`.

Relevant pull requests and main pushes preview one package without publisher
credentials. An explicit main dispatch uses the existing protected environment
and publisher `puncsky`. A public version is skipped only when every authored
file hash matches. A different artifact at that version requires a version bump;
ambiguous lookup failures stop publication. The CLI waits for definitive
publication, and its temporary credentials are removed even on failure. Retain a
pending attempt and inspect its result rather than uploading identical content.

The native OpenClaw entry is `clawhub:@puncsky/beancount-io`; its exercised
installation, discovery and update commands appear in the release status above.
The initial local-path attempt stopped at OpenClaw's source-trust prompt. After reviewing the exact owned artifact, the isolated local rehearsal explicitly acknowledged its source (`--force`) and its skills-only capability surface (`--accept-capabilities`). Neither flag overrides scanner/install-policy blocks. This consent affected the synthetic profile only.

## Native OpenClaw verification

OpenClaw **2026.10.5** installs the exact generated 0.4.0 artifact as one
`beancount-io` plugin. Native inspection reports **format: bundle**, **bundle
format: claude**, a **skills-only** accepted surface, no runtime dependencies,
no hooks, no tools and no MCP servers. All **53/53 authored package files** match
the immutable release-source map. All **13 skills** are eligible, model-visible
and user-invocable. The native `state/plugin-skills/` projection preserves all
**48/48 skill/reference files**, and every sibling/reference resolves.

The local package was installed after reviewing its source and consenting to
its declared skills in an isolated profile; normal host policy stayed enabled.
A local-path install is explicitly skipped by `openclaw plugins update`.
Registry-managed update is verified separately through the public ClawHub
installation recorded above. The previous m6 authenticated first-query
runs retain their provenance; no new model call or credential/grant was needed
for these unchanged instructions.

[Hosted skills CI](https://github.com/bex-co/beancount-io/actions/runs/39859079868)
passes **152** suite/installer/journey tests, **37** checker tests, **38** recipe
tests against the published minimum `bea`, and **11** QA helper tests. Hosted
agent-guidance, secret scanning and single-package preview also pass. Locally,
149 full-suite tests and the final 14 focused artifact/release tests pass; the
three additional guard cases are included in the hosted 152-test run.

### Archive and direct-Git controls

A second fresh OpenClaw profile installs the ZIP form of the same suite.
Native inspection and discovery again pass: bundle/claude, **53/53** matching
package files and **13/13** eligible, model-visible, user-invocable workflows.
The accepted surface contains only skills and no dangerous configuration flags.
This independently validates the archive layout before the successful public
registry installation and managed-update checks recorded above.

The separate documented Git-source route was also attempted against the public
monorepo. OpenClaw 2026.10.5 clones it, enters an npm dependency-install path and
refuses it with `extracted package missing package.json`. The repository has no
root package.json. No root manifest/dependency workaround is introduced, and
this failed direct-Git route is not offered as an installation command. The
verified content bundle and ZIP routes remain independent of that host limitation.

## Hermes admission limits

Hermes **v0.22.4**, official commit
`4d04303818b61bf3aa09278af48356315515965b`, supports portable Agent Plugins v1
packages through its native plugin installer. Two actual checks on the complete
suite retain concrete restrictions:

- `hermes plugins validate <suite> --json` parses the root portable manifest,
  then reports all thirteen skills' nested `metadata` values as incompatible
  with its string-value metadata contract. These are the existing host
  declarations, preserved byte-for-byte.
- A fresh native `hermes plugins install file://<fixture> --no-enable` refuses
  the exact complete suite under its default `plugin-guard-v11` policy:
  **DANGEROUS, 20 findings**. Validation also identifies the intended init
  instruction-file writes. No plugin is installed or enabled, no scan setting
  is changed, and no forced install is attempted.

The fixture is a local Git repository of the generated suite, so this tests the
native installer and its policy on the package bytes, not public ClawHub plugin
ingestion. Hermes does not establish that registry route in this rehearsal.
The [existing standalone results](clawhub-rehearsal.md#final-current-version-verification--2026-10-22-utc)
remain valid for twelve supported skills; init's policy restriction remains
[w6/039](../../.pm/w6/blocked/039.md). Full Hermes suite admission awaits a
compatible metadata contract and a policy path that permits the approved init
workflow without weakening scanning or removing workflows.

## Legacy installs and migration

The individual registry listings are retired as recorded below. Historical
release evidence and existing user files are retained.
Do not place the suite over manually edited standalone skills or remove them
automatically. Native precedence and migration were exercised using the local suite plus a
fresh public `@puncsky/beancount-ask@1.0.4` install in the same isolated workspace:

1. The suite alone resolves `beancount-ask` to its native plugin projection.
2. Installing the legacy standalone creates a workspace copy, which takes
   precedence over the plugin copy. Its ClawHub Safe result and 1.0.4 receipt
   remain separate from the suite version 0.4.0.
3. `clawhub --workdir <workspace> uninstall @puncsky/beancount-ask --yes` removes
   that unedited fixture through its normal lock-aware command. Native skill
   inspection again selects the suite projection.
4. The unrelated personal-skill fixture and every one of the suite's 53 authored
   files are unchanged. No user installation is removed automatically.

For a user's migration, inspect and preserve local edits before explicitly
removing each old copy through its owning installer. Check
`openclaw skills info <name> --json` to see which copy wins. The suite's public ClawHub entry and managed update are verified separately;
local-path update is not substituted for registry update. Existing standalone
copies are unchanged, but their old online install/update routes are retired.
Future publication uses the suite.

## Standalone listing retirement — 2026-10-22 UTC

The owner requested cleanup of the scattered distribution entries after the
suite release. All thirteen owned `@puncsky/beancount-*` skill listings were
soft-deleted through ClawHub's documented owner endpoint, with a retirement
reason pointing to the unified suite. Before retirement, every listing was
owned by `puncsky` and its latest version was 1.0.4; the replacement suite was
already public and clean. No skill version was republished or hard-deleted.

At 23:16 UTC, anonymous lookups for all thirteen old listings return 404.
Complete pagination of the public `beancount-` prefix catalog returns zero
standalone entries owned by `puncsky`. Unified package search returns one
`@puncsky/beancount-io` bundle plugin at 0.4.0. Native OpenClaw search, managed
suite update and thirteen-skill discovery are rechecked after retirement.

ClawHub's [owner soft-delete contract](https://github.com/openclaw/clawhub/blob/main/docs/http-api.md#delete-apiv1skillsslug--post-apiv1skillsslugundelete)
retains a restore route and reports a 30-day slug reservation; these responses
reserve the old names until 2026-11-21 UTC. This is not a permanent redirect to
the plugin. The earlier release and host records remain historical evidence.
Individual `skills/beancount-*/` source directories remain the suite's canonical
workflows, with their original triggers and shared references.

Existing local installs are not removed or rewritten. Preserve local edits
before migrating through the owning installer. Fresh standalone ClawHub installs
and updates are no longer supported, including the old Hermes route. Hermes's
full-suite admission remains blocked as described above; retirement does not
establish a replacement Hermes install path. Routine releases and current
installation guidance now point only to the suite.

## Other distribution channels — 2026-10-23 UTC

The owner requested the same consolidation audit beyond ClawHub. Separate
workflow folders remain inside the product; owned publication and current
installation guidance target the complete suite.

| Channel | Observed state | Action and verification |
| --- | --- | --- |
| Claude Code plugin | One `beancount-io` marketplace entry at 0.4.0, declaring all thirteen workflows. | Already a suite; retain the shared version and inventory gate. |
| Codex plugin | One `beancount-io` entry at the same 0.4.0 version and canonical source tree. | Already a suite; no separate per-skill publication found in the repository's release configuration. |
| Git/link installer | One checkout supplies the complete source inventory to both clients. | Retain it for local source edits; current guidance prefers the plugin for one versioned managed install. |
| `npx skills` / skills.sh | Before the update, the repository page mixed 29 rows: ten customer workflows and nineteen contributor tools. At 00:40 UTC, the public page shows all thirteen customer workflows under **Beancount.io suite**, followed by nineteen **Repository development** entries. | Root `skills.sh.json` and its inventory gate are shipped. One documented maintainer install triggers the supported configuration sync; the public read-back verifies both groups and all three previously missing customer entries. Install and repeated whole-suite refresh from the explicit customer `skills/` URL pass for both agents, with telemetry disabled in QA. |
| `gh skill` | A Git-repository install route; no separate Beancount.io per-skill publishing job or release inventory was found. | Preserve the earlier whole-suite commands and pin behavior. Document the preview-command prerequisite: the default local 2.74.0 lacks `gh skill`; this audit does not claim a new native rehearsal of the earlier 2.96.0 controls. |
| skills.rest | Its company page advertises 27 indexed skills, including internal `ship`/`loopx`; the customer ask page still uses the removed `skills/.claude/skills/` path and a generated `beancount-ask-bex-co` selector. | Submit one canonical customer-root refresh through its automatic indexing form, with grouping/internal-exclusion corrections and no contact details. The form confirms acceptance and a scanner window of up to 24 hours. Public cleanup is still pending; no repeated submission or claim of completed indexing. |
| SkillsMP | Live search already groups this project by repository, but previews still point at old `skills/.claude/skills/` paths and older descriptions. | Record the stale index separately from owned releases. Its public documentation describes GitHub discovery without a guaranteed refresh schedule; an owner-edit/delete endpoint was not established in this audit. No unsupported mutation or unsolicited outreach is used. |

The [skills.sh customization contract](https://www.skills.sh/docs/customize)
supports grouping, not hiding or deleting old per-skill catalog entries. Its
configuration is fetched after a normal telemetry-enabled installation and then
cached. After source commit `56acb1a95`, one native maintainer install completes
that documented sync; the [public repository page](https://www.skills.sh/bex-co/beancount-io)
is verified at 00:40 UTC with all thirteen customer entries and a separate
nineteen-entry contributor group. There are no manual telemetry events or
replays. The [Packs contract](https://www.skills.sh/docs/packs) additionally
offers unlisted collections. The audit reached its owner builder, but GitHub
connection did not persist and archive upload required additional local-file
access. No Pack was published. Creating another distribution channel is not
required to update the existing repository collection, so this follow-through
uses the owned grouping and whole-suite source rather than expanding file
access or advertising an unverified Pack link.

Skills CLI **1.5.23** installs and repeats the explicit customer-root command for
both Claude Code and Codex with **13/13** customer directories and a matching
thirteen-entry lock. A separate project `skills update -p -y` did not complete
within 240 seconds; its source performs repeated per-skill reinstall work. The
bounded check is retained rather than called a successful update. The install
guide uses the completed whole-suite refresh route. The QA checks make no model
calls, change no global agent profile and disable telemetry. The separate native
maintainer configuration sync is the documented directory update, not a repeated
QA or synthetic event campaign.

The [skills.rest indexing form](https://skills.rest/contribute) confirms only the
request. Its [current ask listing](https://skills.rest/skill/beancount-ask-bex-co)
and [company page](https://skills.rest/company/bex-co) remain the read-back
controls. [SkillsMP's discovery contract](https://skillsmp.com/agent-skills#how-can-my-skill-be-discovered)
does not promise an update schedule. Third-party stale pages are not reported as
fixed merely because the source repository and its install instructions changed.

### Post-window index read-back — 2026-10-24 UTC

At01:42:23UTC, more than24hours after the accepted refresh, the
[skills.rest company page](https://skills.rest/company/bex-co) still advertises
27skills, including `ship`/`loopx`. Its
[ask entry](https://skills.rest/skill/beancount-ask-bex-co) still links to the
removed `skills/.claude/skills/beancount-ask` path. The automatic submission
window has elapsed without the requested public correction; private scanner
status is not exposed. The actual [indexing form](https://skills.rest/contribute)
still advertises24-hour screening and exposes [support](mailto:support@skills.rest),
but no existing-request status or owner edit/delete control. No duplicate
refresh request or support message was sent.

The completed browser [SkillsMP search](https://skillsmp.com/search?q=beancount)
also still renders the old `skills/.claude/skills/` paths for this repository's
ask/close/import entries. A bare HTML response is only a client-rendered shell
and is not evidence that those old paths disappeared. Its footer exposes
[support](mailto:support@skillsmp.com); no owner correction endpoint or updated
record was established by this check. These remaining service-controlled
indexes keep w6/m6.5/t012 open; the owned suite and verified skills.sh grouping
remain complete.

### skills.rest correction prepared — 2026-10-25 UTC

Actual browser readback at23:31:14UTC still shows27skills in the
[organization index](https://skills.rest/company/bex-co), including repository
maintenance tools. The [ask entry](https://skills.rest/skill/beancount-ask-bex-co)
still points to the removed `skills/.claude/skills/beancount-ask` source and
uses `beancount-ask-bex-co` as its install selector instead of the authored
`beancount-ask` name. The actual indexing form still advertises24hours and
exposes no control for an existing request; its footer supplies
[support@skills.rest](mailto:support@skills.rest). No duplicate refresh is sent.

A [specific correction email](catalog-corrections/skills-rest.md) is prepared
with canonical customer source/install links, valid frontmatter names and
customer/development collection separation. Explicit authorization to send
this new recipient/request has been requested; no email is sent or live-index
repair claimed. This is separate from the authorized Smithery inquiry.
**Unblock:** authorize that reviewed message, then the service corrects its
existing records and the worker reads back current customer paths/selectors
and collection boundaries. SkillsMP remains independently pending under t012.

## Primary contracts

- [ClawHub publishing](https://github.com/openclaw/clawhub/blob/main/docs/publishing.md)
  and the pinned CLI's `package publish --help` support bundle-plugin publication.
- [OpenClaw plugin bundles](https://docs.openclaw.ai/plugins/bundles) describe
  supported content packs and native feature mapping; the installed 2026.10.5
  bundle detector recognizes the Claude marker before the metadata-only native
  marker when no package runtime extensions are present.
- [Hermes portable plugins](https://github.com/NousResearch/hermes-agent/blob/4d04303818b61bf3aa09278af48356315515965b/website/docs/developer-guide/plugins/index.md#portable-agent-plugins-v1-packages)
  describe its native install, enable, namespaced skill loading and update paths.
