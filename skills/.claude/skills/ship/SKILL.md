---
name: ship
description: Ship pending changes on main by pulling with rebase, committing intentionally, pushing to origin/main, monitoring triggered GitHub Actions and EAS deployment runs, and fixing failures until green. Use only when the user explicitly invokes $ship or asks to ship or publish the current main branch. Do not use for ordinary edits, status checks, pull-request publishing, non-main branches, or requests to commit without pushing.
---

# Ship

Read and follow the [canonical ship workflow](../../../../.claude/commands/ship.md) completely. Treat any text supplied with the skill invocation as `$ARGUMENTS`.

The linked Claude command is the single source of truth. Do not duplicate or independently amend its workflow here.
