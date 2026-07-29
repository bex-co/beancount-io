# Codex Project Guidance

Use the existing Claude guidance as the single source of truth:

- Read `../CLAUDE.md` and this directory's `CLAUDE.md` before working in the dashboard.
- Before changing files in a subtree, read any additional `CLAUDE.md` in that subtree. Apply guidance from the repository root toward the target file; the closest file takes precedence.
- Update the applicable `CLAUDE.md` when project guidance changes. Do not copy that guidance into this file.

Repository skills are exposed through `.agents/skills/` as symlinks to the canonical skill directories in `../skills/`. Select them by their `SKILL.md` descriptions and edit the canonical targets rather than creating copies.
