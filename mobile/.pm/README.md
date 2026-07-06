# .pm — Beancount Mobile roadmap board

File-based PM board for the mobile app. Managed by two slash commands:

- `/pm-brainstorm <topic>` — thinks a topic through and **proposes** milestones/tasks as text (writes nothing).
- `/pm <subcommand>` — the **only** writer: materializes workstreams, milestones, and tasks; marks work done; prints status.

Conventions (hierarchy, sizing rule, quality gate, standing closing tasks, templates) live canonically in `.claude/commands/pm.md`.

- `GOAL.md` — product goal and pillars every milestone must link to.
- `DO_NOT_DO.md` — anti-goals; hard constraint for both commands.
- `wN/` — workstreams: inbox notes (`NNN.md`) and milestones (`mN/` with task files).
