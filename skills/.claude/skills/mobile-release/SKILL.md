---
name: mobile-release
description: Summarize mobile changes since the previous release, bump the Beancount mobile version, prepare localized release notes, and release to the Apple App Store and Google Play. Use for $mobile-release or requests to cut a mobile store release. Skip ordinary code shipping, OTA-only updates, release-status questions, and requests to create or edit this skill.
---

# Mobile release

Usage: `$mobile-release [optional release context]` (Claude Code: `/mobile-release`).

Carry a release through preparation, verification, shipping, and both stores. A release request authorizes the necessary store writes, build/submission jobs, and push to main; preserve narrower requests such as “prepare only.” Creating this skill does not invoke it. Do not ask again for authorization already given. Review concrete plans before recording approvals; never bypass the repository's release gates.

## Establish release state

Locate the repository with `git rev-parse --show-toplevel`. Read root and mobile `CLAUDE.md`, `mobile/docs/app-store-localization.md`, `mobile/scripts/app-store-release.sh`, `mobile/eas.json`, and `.github/workflows/deploy.yml`. Run package commands inside `mobile/`; keep scratch artifacts in `mobile/tmp/`. Discover installed `gh`, `asc`, and the workflow's pinned EAS CLI capabilities with `--help` rather than assuming newer commands exist.

Inspect branch, staged and unstaged changes, and remote state. Fetch origin and tags. Preserve unrelated work; release only reviewed changes. Bring the release base up to date before preparing notes. Do not push a version bump until its store staging receipt is ready.

Find the previous reachable mobile tag using `git describe --tags --match 'mobile-v*' --abbrev=0 HEAD`. Compare that tag to the candidate release using mobile-scoped `git log` and `git diff`; inspect release workflow changes too. If no tag exists, label this a first release and inspect available mobile history. Tags from other packages are not a baseline.

Check GitHub release runs, EAS builds/submissions, App Store Connect versions, and Google Play tracks. A `mobile-v<version>` tag only proves build/submit kickoff: the workflow uses `--no-wait`. It does not prove either store is live. Report any difference between the tag baseline and the last live version; include still-unreleased changes in store notes when needed.

If the current version is untagged or has incomplete jobs, determine whether it is an existing release to resume before bumping. Do not create another version merely to retry. Do not edit an Apple version already in review; report the pending review as the blocker to a new release.

Verify credentials and access without printing secrets. Check the effective Android submission profile, Google Play application identity, service-account access, production track, release status, and review settings. At creation of this skill, `submit.production` only specifies iOS configuration; do not assume `--platform all` supplies a working Android production release. Resolve needed non-secret configuration within release scope, or identify the precise missing access. Never substitute a testing track for the requested production release.

## Summarize and bump

Write concise user-facing release notes grounded in the inspected diff: features, fixes, and material behavior changes. Omit internal churn and unsupported claims. Show the baseline tag/SHA and candidate SHA, and keep the summary for the final report and commit context.

For a new release, run `yarn bump` once. Use the version it emits: this repository uses `1.YYYYMMDD.build`, not a conventional patch increment. Inspect all generated changes, including native versions when present. For a resumed release, retain its version and completed preparation.

Fill every `metadata/version/<version>/<locale>.json` `whatsNew` using the same factual summary, translated using shipped terminology and `metadata/store-locales.json`. Preserve stable listing copy unless the release warrants a change. Keep template `whatsNew` blank. Fill the Android changelog emitted by the bump script, if present; inspect the actual script/output rather than assuming the legacy fastlane directory exists or is uploaded by EAS. Ensure the same notes are applied to the Google Play release through available authenticated tooling.

EAS uses remote native build numbers with auto-increment. Inspect the actual resulting iOS build number and Android version code; do not assume they equal the local suffix when selecting builds or attaching Android notes.

## Stage Apple listing before pushing

Run `yarn format:check`, `yarn test`, and `yarn metadata:validate`. Fix release-related failures and inspect any lint autofixes. Build and validate screenshots using `yarn screenshots:build` and `yarn screenshots:validate`; use the public demo sources, never a private ledger.

Follow the current release helper and localization guide. The required order is below; replace `<version>` with the actual target. Repeating the version is the helper's confirmation mechanism, not a reason to solicit authorization again.

```sh
./scripts/app-store-release.sh create <version> <version>
./scripts/app-store-release.sh plan <version>
# Inspect metadata/plan.md, metadata/keywords-plan.md, and screenshots/index.html
# under mobile/.asc/releases/<version>/; visually inspect generated screenshots.
./scripts/app-store-release.sh approve <version> <version>
./scripts/app-store-release.sh apply-metadata <version> <version>
./scripts/app-store-release.sh plan-screenshots <version>
# Inspect the separate screenshot replacement/order plan before applying.
./scripts/app-store-release.sh apply-screenshots <version> <version>
./scripts/app-store-release.sh verify <version>
yarn store:staging-check
```

Inspect helper assumptions before using it (including its metadata-copy source and automatic release setting). The verification writes `metadata/releases/<version>.json` bound to the exact listing inputs. Never fabricate or hand-edit that receipt. If any bound input changes afterward, repeat the affected plan/review/apply and parity verification. Keep `.asc/`, generated screenshots, credentials, and raw remote responses out of Git.

If authorization is actually missing, finish all possible local preparation first, present the target version, notes, intended store actions, and available plans, then ask only for the missing scope. Cite the precise applicable instruction if it requires additional human approval. Do not claim to have obtained operator approval that was never given.

## Ship and follow both platforms

Review the final diff and run the required secret scan before pushing. Use the repository's [ship skill](../ship/SKILL.md) for the reviewed release files, including notes and staging receipt. If rebasing changes release contents or bound inputs, update the notes, repeat affected checks and parity verification before the push.

The main push triggers `Release (mobile)`: checks → receipt verification → production OTA → EAS builds for both platforms with auto-submit → tag/GitHub release. Use this workflow as the single build kickoff; do not also start duplicate local builds. Locate the run for the shipped SHA with `gh`, follow it, and capture the exact EAS build and submission IDs for both platforms. Poll long jobs in bounded waits while giving progress updates.

Complete each store's remaining steps with available authenticated tools, checking current CLI help/documentation:

- **Apple:** wait for the exact iOS build to finish uploading and processing, attach it to the prepared version, check required review information, submit for App Review, and verify the version's review/release state. EAS Submit uploads to TestFlight; it does not itself submit for App Review. Do not invent compliance answers or replace existing review credentials. Honor the configured release mode and complete a manual release after approval when applicable.
- **Google Play:** verify the exact Android artifact/version code reached production, apply release notes, send pending changes for review when necessary, and verify the rollout/review state. An internal-track upload, draft release, or changes waiting to be sent for review is unfinished. Preserve an explicitly requested staged rollout.

Use [Expo iOS submission documentation](https://docs.expo.dev/submit/ios/), [submission automation](https://docs.expo.dev/build/automate-submissions/), and [EAS configuration](https://docs.expo.dev/eas/json/) to verify current store semantics when needed; prefer the repository-pinned CLI's supported commands.

On failure, inspect status/logs before retrying. Resume the failed platform or step using its exact build ID; never use `submit --latest`, delete a release tag to retrigger everything, or rebuild the successful platform unnecessarily. Rerun the workflow only after checking for in-flight jobs and whether the tag gate will skip deployment. A tagged release with a failed submission needs targeted recovery. After a retry encounters the same unresolved failure, stop retrying and report the required fix; do not create endless paid builds.

Finish all automatable steps. If store review is pending, report it explicitly with links and the next action; do not wait indefinitely or call it live. If credentials, mandatory store answers, or an unavailable console action block completion, name the exact action and continue independent work on the other platform.

## Report

Return the version and baseline, a short change summary, shipped SHA and workflow link, checks performed, and separate iOS/Android statuses with build/submission links. Distinguish build queued, uploaded, submitted for review, approved, and live. Claim both stores released only when both production states have been verified.
