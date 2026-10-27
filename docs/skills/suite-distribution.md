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

**Latest source check, 2026-10-26T04:52:58Z:** stable
[v0.22.5](https://github.com/NousResearch/hermes-agent/releases/tag/v0.22.5)
still retains the prior portable metadata check, skill/plugin guards and
admission implementation. The inspected main changes do not establish a
compatible path. [Twelve-file comparison and native-test limits](hermes-compatibility-20261026.json)
retain the exact Git blobs and next trigger. No new native rejection or
successful install is claimed from this source comparison; the actual older
rehearsal below remains the runtime evidence. No publisher input is pending.

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

Legacy source-filter discovery note 040 is [dropped as superseded](../../.pm/w6/README.md#dropped)
by this retired standalone route. Its failed native cohorts remain in the
[historical rehearsal](clawhub-rehearsal.md#hermes-search-discovery); no upstream
search fix is claimed. Full Hermes suite metadata/init admission remains open.

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

**Owner policy, 2026-10-26 UTC:** apply the following to every current and
future skill catalog with the same scattered or stale-entry problem. Update
the existing suite when supported; if its records cannot be edited, submit
or publish one consolidated customer set through the platform's supported
intake. Use only the thirteen canonical `skills/` workflows, preserve their
references and MIT-0 license, and exclude repository development tools.
Do not replace this work with support emails or an email-authorization wait.
Retain the real entry URL, payload, status, UTC check time and next trigger.
An already accepted identical suite request stays pending rather than being
submitted repeatedly. If no supported publishing intake is available, record
that exact platform dependency and continue other channels; do not call an
unsubmitted set published or claim that old records were deleted.

| Channel | Observed state | Action and verification |
| --- | --- | --- |
| Claude Code plugin | One `beancount-io` marketplace entry at 0.4.0, declaring all thirteen workflows. | Already a suite; retain the shared version and inventory gate. |
| Codex plugin | One `beancount-io` entry at the same 0.4.0 version and canonical source tree. | Already a suite; no separate per-skill publication found in the repository's release configuration. |
| Git/link installer | One checkout supplies the complete source inventory to both clients. | Retain it for local source edits; current guidance prefers the plugin for one versioned managed install. |
| `npx skills` / skills.sh | Before the update, the repository page mixed 29 rows: ten customer workflows and nineteen contributor tools. At 00:40 UTC, the public page shows all thirteen customer workflows under **Beancount.io suite**, followed by nineteen **Repository development** entries. | Root `skills.sh.json` and its inventory gate are shipped. One documented maintainer install triggers the supported configuration sync; the public read-back verifies both groups and all three previously missing customer entries. Install and repeated whole-suite refresh from the explicit customer `skills/` URL pass for both agents, with telemetry disabled in QA. |
| skills.sh consolidated Pack | [One customer suite](https://www.skills.sh/p/CTUrAfLQdDvNeNv2) created 2026-10-26 UTC with thirteen customer workflows from source suite 0.4.2. | [Publication and native checks](catalog-corrections/consolidated-submissions-20261026.json) retain the single Pack and its exact archive. The latest production 1.7.4 check exits successfully but delivers only 59/61 files to both agents. Owner editing is available; the selector workaround fails the local control below. Complete native delivery remains open. |
| `gh skill` | A Git-repository install route; no separate Beancount.io per-skill publishing job or release inventory was found. | Preserve the earlier whole-suite commands and pin behavior. Document the preview-command prerequisite: the default local 2.74.0 lacks `gh skill`; this audit does not claim a new native rehearsal of the earlier 2.96.0 controls. |
| skills.rest | Actual post-window readback, 2026-10-27: all27 repository entries remain eight customer/nineteen internal, with old ask source and generated selector. | [Accepted customer-suite request](catalog-corrections/skills-rest-submission-20261026.json) and [post-window evidence](catalog-corrections/skills-rest-post-window-20261027.json) remain distinct. Existing repository aggregation is mixed, not the requested customer-only suite. Native plugin support and processing status remain unknown. Next manual readback2026-10-29UTC or actual feedback/capability change; no repeated submission or email. |
| SkillsMP | Actual direct collection readback, 2026-10-26: 27 entries, eight customer and nineteen internal; ask still points to the removed source path. Public search is unavailable. | [Fresh evidence and route limits](catalog-corrections/skillsmp-recheck-20261026.json) retain current scope without inferring cleanup from search failure. [Current owner direction](catalog-corrections/skillsmp.md) selects direct suite publication; the historical email draft is superseded. No supported suite intake is established; private publisher capabilities remain unknown. No user approval is pending. |

The [skills.sh customization contract](https://www.skills.sh/docs/customize)
supports grouping, not hiding or deleting old per-skill catalog entries. Its
configuration is fetched after a normal telemetry-enabled installation and then
cached. After source commit `56acb1a95`, one native maintainer install completes
that documented sync; the [public repository page](https://www.skills.sh/bex-co/beancount-io)
is verified at 00:40 UTC with all thirteen customer entries and a separate
nineteen-entry contributor group. There are no manual telemetry events or
replays. The [Packs contract](https://www.skills.sh/docs/packs) additionally
offers unlisted collections. The earlier audit reached its owner builder but
did not publish a Pack. The later owner-directed consolidated publication
below creates one through the supported archive uploader. A new Pack does not
delete historical repository index rows or update another platform's catalog.

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

### Consolidated publication across affected catalogs — 2026-10-26 UTC

The owner's direct-publication policy is applied across the existing channel
inventory in [one current record](catalog-corrections/consolidated-submissions-20261026.json).
The existing ClawHub and client-plugin entries are already suites. Git-copy
channels already select the complete customer subtree. skills.rest's accepted
overall-suite form remains pending its stated readback window; no identical
request is repeated. SkillsMP has no established supported suite intake and
retains that platform dependency, with no email or publisher decision pending.

The new [Beancount.io customer suite Pack](https://www.skills.sh/p/CTUrAfLQdDvNeNv2)
is actually created, with all thirteen customer entries and no development
skills. Its uploaded archive contains the 48 canonical skill/reference files
and thirteen copies of the canonical MIT-0 license. It is a source-0.4.2
snapshot, not an automatic mirror of future Git commits. Packs are unlisted;
their URL permits installation without sign-in. No new registry release or
change to the verified ClawHub 0.4.0 artifact is implied.

Native installation remains unresolved. An isolated, telemetry-disabled
Skills CLI 1.5.23 installation exposes all thirteen entries to both agent
destinations but downloads only 59 of 61 files: close's `close-checklist.md`
and options' `stock-plus-option.md` are missing. Every downloaded byte matches
the uploaded source. The Pack's close detail still reports three stored files,
so deleting or rewriting those references is not a repair. Current CLI 1.7.4,
verified through npm metadata, fails discovery on both the displayed install
URL and canonical page URL. A separate anonymous index probe returns HTTP 429;
it does not prove the cause of every missing download or discovery failure.

**Next:** after the platform's delivery/rate condition clears or a supported
client fix is available, verify one complete native download against all 61
hashes and both agent destinations. Edit this existing Pack for future source
updates; do not create duplicate Packs or email support. The current install
guide continues to use the verified plugin and whole-customer-source routes.

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

### Historical skills.rest correction draft — 2026-10-25 UTC

This email path is superseded by the accepted overall-suite submission below
and the later owner policy above. It is not a current authorization request.

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

### Owner-requested overall-suite submission — 2026-10-26 UTC

The owner explicitly requested one additional overall submission and updated
local form records. At 00:24:54 UTC the actual form confirms acceptance after
one Submit action for the canonical customer `skills/` root. The
[complete field-level receipt](catalog-corrections/skills-rest-submission-20261026.json)
records every entered field, blank optional contact, the full notes and their
UI readback, observed public main revision, success text and exact timestamp
meaning. This controlled follow-up is owner-authorized; it does not authorize
recurring retries or a support email. Earlier refresh history is preserved.

The notes ask for **one customer suite/plugin collection**, the 13 customer
workflows only, and exclusion/deindexing of `.agents/skills/**` and root
`.claude/skills/**`, explicitly including the dashboard-QA entry and other
repository tools. They request correction of existing source paths/selectors
and no duplicate individual listings. The internal QA entry's first ingestion
remains unattributed; this receipt does not reconstruct it.

The form has no plugin-specific type/artifact/version fields. Actual acceptance
proves an indexing request, with an advertised 24-hour window; single-plugin
support, scope enforcement and live cleanup remain unverified. Next manual
readback is on or after 2026-10-27T00:24:54Z or earlier actual feedback/publication.
Verify the requested public suite/collection and internal exclusions; if the
service lacks native plugin support, record that limitation explicitly. The
[earlier support draft](catalog-corrections/skills-rest.md#earlier-email-draft--not-sent)
remains unsent and is not the current default next action. No further publisher
input is needed for this accepted form. SkillsMP stays independently pending.

### SkillsMP direct collection and correction route — 2026-10-26 UTC

Although the public search UI reports an unavailable service, direct ask and
repository records load after normal browser verification completes without
interaction. At 01:46:19 UTC the actual
[repository collection](https://skillsmp.com/creators/bex-co/beancount-io)
contains 27 unique child entries: eight customer workflows and nineteen internal
development tools. The ask link still points to the removed customer layout.
The current 13-workflow customer source therefore does not match this collection.
[Exact entry names and observations](catalog-corrections/skillsmp-recheck-20261026.json)
retain that result; no search success, live cleanup or first-ingestion cause
is inferred.

Current discovery docs describe GitHub scanning without a guaranteed update
schedule. The inspected public API documents search; anonymous collection/detail
pages provide install/favorite controls and no observed owner mutation/intake.
The matching-name GitHub project inspected is a search client, not an established
catalog-data contribution route. Private publisher management is untested, so
self-service modification is unestablished rather than declared impossible.

The [historical support draft](catalog-corrections/skillsmp.md) is superseded
by the owner's direct-publication policy. No message is sent and no email
authorization remains pending. A supported intake for one customer-only suite
must become available before it can be submitted on SkillsMP; the public
GitHub discovery contract alone supplies neither a receipt nor an update
schedule. The existing collection is not a submitted native plugin. This
remains under t012, independently of the accepted skills.rest form's 24-hour
window and Hermes admission.

## Primary contracts

- [ClawHub publishing](https://github.com/openclaw/clawhub/blob/main/docs/publishing.md)
  and the pinned CLI's `package publish --help` support bundle-plugin publication.
- [OpenClaw plugin bundles](https://docs.openclaw.ai/plugins/bundles) describe
  supported content packs and native feature mapping; the installed 2026.10.5
  bundle detector recognizes the Claude marker before the metadata-only native
  marker when no package runtime extensions are present.
- [Hermes portable plugins](https://github.com/NousResearch/hermes-agent/blob/4d04303818b61bf3aa09278af48356315515965b/website/docs/developer-guide/plugins/index.md#portable-agent-plugins-v1-packages)
  describe its native install, enable, namespaced skill loading and update paths.


### Pack native false-success control — 2026-10-26T07:08:07Z

One later, bounded Skills CLI1.7.4 check now discovers and installs thirteen
entries with exit0, but both destinations contain only59/61files. This time
`beancount-import/references/categorization.md` and `beancount-add/LICENSE`
are absent; all downloaded hashes match and the previously missing pair is
present. Full installation remains unverified. No Pack is republished.

A disposable localhost well-known fixture isolates a concrete client defect:
its index declares a required reference that always returns429/Retry-After1;
unmodified1.7.4 requests it once, omits it, then exits0 with Done. The
inspected fetcher discards unsuccessful file results without a completeness
check. A separate public index probe returns429/Retry-After60; statuses for
every omitted production file remain unobserved.
[Exact native and controlled evidence](catalog-corrections/skills-sh-partial-install-20261026.json)
retains those boundaries. A supported complete-delivery/client path is needed;
then verify all61 hashes. No email, new publication or publisher input is
pending. The current install guide continues using the verified routes.

### Delivery routes and selector control — 2026-10-26 evening UTC

The SkillsMP collection's displayed refresh advances to October 26 at 11:37
(timezone unspecified), but it still contains eight customer and nineteen
internal skills, missing five customer workflows. Ask's GitHub link remains
stale; its displayed `--skill beancount-ask` selector is valid. The sign-in page
was inspected without creating an account or accepting terms. Supported suite
intake remains unestablished; private publisher features remain unknown.

The existing Pack's authenticated owner editor supports adding/removing skills
and saving in place. This inspection was cancelled without changing its thirteen
entries. Its GitHub source tab offers a separate connection, which was not used.
No transport-version, retry or concurrency control was observed in the editor;
uploading ZIP content does not establish archive-based native delivery.

A new isolated localhost control runs unmodified Skills CLI 1.7.4 with one
`--skill` selector. It installs only the selected directory on both agents,
but downloads both indexed skills and both required references first. Serial
selectors therefore do not reduce download fanout. This is a local control,
not another production install: the latest production result remains the
07:08:07 UTC 59/61-file failure. Preserve the existing Pack and check a supported
complete-delivery fix, or perform the next bounded native recheck on/after
2026-10-27T07:08:07Z. The accepted skills.rest request independently reaches
its readback window at 2026-10-27T00:24:54Z.
[Current UI findings and native control](catalog-corrections/delivery-route-followup-20261026.json)
retain the request observations, exact client hash and remaining owners.
