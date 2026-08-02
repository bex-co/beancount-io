---
description: Pull latest main, commit pending changes, push to origin/main, and monitor substantial CI/deploy runs until green
argument-hint: [optional commit message context...]
allowed-tools: Bash(git status:*), Bash(git pull:*), Bash(git fetch:*), Bash(git diff:*), Bash(git show:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git rebase:*), Bash(git ls-remote:*), Bash(gh run list:*), Bash(gh run watch:*), Bash(gh run view:*), Bash(gh run rerun:*)
---

# Task: Ship the current main branch

Bring the local `main` up to date, commit any pending work, and push to `origin/main`. If the push contains package code or workflow changes, stay on duty until every triggered GitHub Actions run is green. Diagnose failures, fix or rerun them as appropriate, re-ship, and keep monitoring until the shipped HEAD passes. Any `mobile/**` push runs the `Release (mobile)` workflow (production OTA update; plus EAS build/submit and a `mobile-v<version>` tag when the version is untagged), so that ship is not complete until `Release (mobile)` succeeds.

For trivial pushes such as documentation, `.pm/**`, `.claude/**`, `.agents/**`, or guidance links, take a quick CI snapshot and report without waiting through a long watch loop.

## Session-aware mode

If you made the pending changes earlier in this conversation, you already know what changed and why. Do not re-derive those changes from git:

- Skip the `git diff --stat` and `git diff --cached --stat` calls in Step 2. Run only `git status` as a sanity check.
- In Step 4, stage exactly the files you edited this session by name and write the commit message from your session knowledge.
- If `git status` shows files you did not touch this session, inspect those files fully (or ask the user) before staging anything beyond your own edits.

Only use the full Step 2 inspection when the working tree contains unfamiliar changes.

## Step 1 — Verify branch

```bash
!git branch --show-current
```

If not on `main`, **STOP** and ask the user whether to switch or abort. Do not silently switch branches.

## Step 2 — Inspect state

```bash
!git status
```

If every listed change is one you made this session, stop here. Otherwise, inspect the unfamiliar changes:

```bash
!git diff --stat
```

```bash
!git diff --cached --stat
```

If the working tree is clean, skip Step 4 but still pull, push, and perform the Step 6 gate. The current HEAD may have an unfinished CI or deploy run that still needs monitoring.

## Step 3 — Pull latest with rebase

```bash
git pull --rebase origin main
```

If the pull/rebase has conflicts, resolve them proactively and continue shipping. A conflict alone is not a reason to stop.

1. Inspect `git status`, `git diff --name-only --diff-filter=U`, each combined diff, relevant surrounding code, and history. For difficult conflicts, inspect both index stages with `git show :2:<path>` and `git show :3:<path>`.
2. Infer both sides' intent and produce the smallest coherent resolution that preserves both whenever possible. Update dependent code, tests, generated outputs, or documentation when the combined result requires it.
3. Do not resolve wholesale with `--ours`, `--theirs`, `--strategy=ours`, or by blindly choosing the newer side. Use a side-specific version only when inspection shows it is the complete intended result.
4. Remove conflict markers, run the most relevant formatting and tests practical for the affected package, and review the resolved diff for accidental loss.
5. Stage resolved paths explicitly, run `git rebase --continue` with a non-interactive editor if necessary, and repeat until complete. If an autostash is restored with conflicts after the rebase, resolve it with the same care but do not run `git rebase --continue` when no rebase is active.

Escalate only when competing resolutions would materially change behavior and the intended choice cannot be inferred safely, or when unavailable credentials or external state block progress. Leave the worktree and rebase state intact, explain the exact conflict and competing semantics, and ask one narrow question. Do not abort the rebase unless the user directs it.

## Step 4 — Stage and commit (if changes pending)

If there are unstaged changes, stage only the relevant files explicitly. Do **not** use `git add -A` or `git add .` (avoid sweeping in `.env`, secrets, or unrelated files).

Generate a Conventional Commits message from session knowledge if you made the changes, otherwise from the diff. Honor `$ARGUMENTS` as additional context if supplied.

- Briefly describe UI before/after for frontend changes.
- Never mention `Generated with Claude Code` or `Co-Authored-By`.

```bash
git commit -m "$(cat <<'EOF'
<message>
EOF
)"
```

If a pre-commit hook fails, fix the underlying issue and create a NEW commit. Do not use `--no-verify` or `--amend`.

## Step 5 — Push

```bash
git push origin main
```

If the push is rejected as non-fast-forward, re-run Step 3, resolve conflicts using its procedure, and retry. Do not force-push to `main`.

## Step 6 — Gate: does this ship need monitoring?

Use the paths pushed in this invocation and the triggered workflow list to select a tier:

- **Substantial:** package code under `mobile/**`, `dashboard/**`, `cli/**`, or `fava-slim/**`, or changes under `.github/workflows/**`. Fully monitor every run and continue to Step 7 on failure.
- **Production release:** the shipped HEAD's `mobile/package.json` version has no `mobile-v<version>` tag on `origin` (check with `git ls-remote --tags origin "mobile-v*"`). This matches `deploy.yml`'s release detector; it is substantial, and the `Release (mobile)` workflow's `Build and submit` and `Tag and create GitHub release` steps must succeed before reporting completion. The detector is state-based, so a previously failed release re-runs on any later mobile push even without a new bump.
- **Trivial:** documentation, roadmap, agent guidance, Claude commands, skills, formatting-only changes, or other changes with no package CI. Take a run snapshot; optionally recheck fast runs once, but do not enter a long watch loop.

GitHub runs may take about 30 seconds to register, so retry the list a few times if it is initially empty:

```bash
SHA=$(git rev-parse HEAD)
gh run list --commit "$SHA" --json databaseId,workflowName,status,conclusion,url
```

The expected workflows are:

| Changed path | Workflow | Local reproduction |
| --- | --- | --- |
| `mobile/**` | `CI` | `cd mobile && yarn lint && yarn typecheck && yarn test:unit` |
| `dashboard/**` | `CI (dashboard)` | `cd dashboard && yarn format:check && yarn lint && yarn test && yarn build` |
| `cli/**`, `fava-slim/**` | `CI (cli)` | `cd fava-slim && make check-all`, then `cd cli && make check-all` |
| any path | `Secret scan` | `gitleaks dir . --redact --verbose` |
| `mobile/**` | `Release (mobile)` | OTA update on every mobile push; EAS build/submit + `mobile-v<version>` tag + GitHub Release when the version is untagged |

### Watch substantial ships

Wait for every run associated with the shipped SHA. Prefer:

```bash
gh run watch <run-id> --exit-status --interval 30
```

Watch the package CI and any `Release (mobile)` run first. If a watch command times out while a run is still active, re-invoke it or re-list the runs; do not abandon monitoring because it is slow. Success means all triggered runs conclude `success` (skipped steps are acceptable) and, for a production release, the `Release (mobile)` workflow shows successful `Build and submit` and `Tag and create GitHub release` steps.

## Step 7 — Fix until green

If a substantial ship fails, fixing it is part of `/ship`; do not merely report the failure.

1. Diagnose from logs first with `gh run view <run-id> --log-failed`. Narrow with `--job <job-id>` when useful.
2. Classify and act:
   - **Real regression:** reproduce with the matching command from the table, fix the code, run the relevant checks, then repeat Steps 3–6. The monitored SHA becomes the new HEAD.
   - **Secret leak:** remove the secret from the pending work and rotate/revoke it if it may be real or exposed. Never commit `.env` or credentials.
   - **Transient infrastructure failure:** rerun failed jobs with `gh run rerun <run-id> --failed`. Give a suspected flake at most two reruns before treating it as a real problem.
   - **EAS release failure:** inspect the `Release (mobile)` logs, fix the mobile code/configuration or credential-independent issue, and re-ship. The version tag is only pushed after success, so re-shipping retries the release automatically. Do not expose or commit `EXPO_TOKEN`. Escalate if the repair requires credentials only the user controls.
3. After every fix push or rerun, return to Step 6 and monitor the current HEAD again. Continue until green.
4. Escalate only when the same step has failed three consecutive attempts without an inferable fix, a required credential is unavailable, or a repair needs a destructive/product decision. Report the run URL, exact error, attempts made, and one narrow question.

## Step 8 — Report

Print the shipped HEAD SHA and subject plus the CI/deploy verdict. Examples:

```
Shipped: a1b2c3d feat(mobile): add account filters — CI + Release (mobile) ✅ green (OTA only; no release build needed)
```

For a mobile release:

```
Shipped: d4e5f6a chore(mobile): bump version — CI + EAS production release ✅ green, tagged mobile-v1.20260731.41 (run <url>)
```

For a trivial ship:

```
Shipped: 1a2b3c4 docs: clarify contribution guide — trivial; CI snapshot checked, not monitored
```

If repairs required additional commits, add one short line per fix commit with its SHA and purpose.

## Safety rules

- Never `git push --force` to `main`.
- Never `--no-verify` or skip hooks.
- Never `git reset --hard` or `git checkout .` without user confirmation.
- Investigate ambiguity using repository state and history before escalating. Continue when the safe intent is evident; otherwise stop before destructive action and ask one narrow, evidence-backed question.

## Optional User Context

$ARGUMENTS
