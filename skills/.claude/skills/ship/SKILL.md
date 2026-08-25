---
name: ship
description: Ship pending changes on main by pulling with rebase, committing intentionally, and pushing to origin/main. Use only when the user explicitly invokes $ship or asks to ship or publish the current main branch.
allowed-tools: Bash(git status:*), Bash(git pull:*), Bash(git fetch:*), Bash(git diff:*), Bash(git show:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git rebase:*)
---

# Task: Ship the current main branch

Usage: `/ship [optional commit message context...]`

Bring the local `main` up to date, commit any pending work, and push to `origin/main`.

## Session-aware mode

If you made the pending changes earlier in this conversation, you already know what changed and why:

- Skip the `git diff --stat` and `git diff --cached --stat` calls in Step 2. Run only `git status` as a sanity check.
- In Step 4, stage exactly the files you edited this session by name and write the commit message from your session knowledge.
- If `git status` shows files you did not touch this session, inspect those files fully (or ask the user) before staging anything beyond your own edits.

Use the full Step 2 inspection when the working tree contains unfamiliar changes.

## Step 1 — Verify branch

```bash
!git branch --show-current
```

If not on `main`, **STOP** and ask the user whether to switch or abort.

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

If the working tree is clean, skip Step 4 but still pull and push.

## Step 3 — Pull latest with rebase

```bash
git pull --rebase origin main
```

If the pull/rebase has conflicts, resolve them proactively and continue shipping.

1. Inspect `git status`, `git diff --name-only --diff-filter=U`, each combined diff, relevant surrounding code, and history. For difficult conflicts, inspect both index stages with `git show :2:<path>` and `git show :3:<path>`.
2. Infer both sides' intent and produce the smallest coherent resolution that preserves both whenever possible. Update dependent code, tests, generated outputs, or documentation when the combined result requires it.
3. Resolve side-by-side when both sides carry intent. Pick `--ours` or `--theirs` only when inspection shows one side is the complete intended result.
4. Remove conflict markers, run the most relevant formatting and tests practical for the affected package, and review the resolved diff for accidental loss.
5. Stage resolved paths explicitly, run `git rebase --continue` with a non-interactive editor if necessary, and repeat until complete. If an autostash is restored with conflicts after the rebase, resolve it with the same care; run `git rebase --continue` only while a rebase is active.

Escalate only when competing resolutions would materially change behavior and the intended choice cannot be inferred safely, or when unavailable credentials or external state block progress. Leave the worktree and rebase state intact, explain the exact conflict and competing semantics, and ask one narrow question.

## Step 4 — Stage and commit (if changes pending)

Stage only the relevant files explicitly by path.

Generate a Conventional Commits message from session knowledge if you made the changes, otherwise from the diff. Honor `$ARGUMENTS` as additional context if supplied.

- Briefly describe UI before/after for frontend changes.

```bash
git commit -m "$(cat <<'EOF'
<message>
EOF
)"
```

If a pre-commit hook fails, fix the underlying issue and create a new commit.

## Step 5 — Push

```bash
git push origin main
```

If the push is rejected as non-fast-forward, re-run Step 3, resolve conflicts using its procedure, and retry.

## Step 6 — Report

Print the shipped HEAD SHA and commit subject. Example:

```
Shipped: a1b2c3d feat(mobile): add account filters
```

## Optional User Context

$ARGUMENTS
