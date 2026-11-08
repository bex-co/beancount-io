# w23 · m26 — Give dry_run previews their own wider rate bucket

**Worker:** worker1 **Goal:** A preview no longer spends the write budget: it draws on its own, wider bucket on REST, GraphQL and MCP, and a commit keeps its current limit. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Choose the bucket size and read the hook | 30m | — |
| t002 | Charge previews to the preview bucket on all three surfaces | 45m | t001 |
| t003 | Prove it with a three-surface parity test | 30m | t002 |
| t004 | Document the new budget | 15m | t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 20m | t005 |
| t007 | Test coverage | 30m | t005 |
| t008 | Closeout | 15m | t007 |

## Definition of done

- A preview (`dry_run` or `dryRun`) on MCP, REST and GraphQL is charged to its own bucket with a limit above the write budget; a commit is charged to the write budget as before.
- Exhausting one bucket does not block the other, proven by a three-surface test.
- `docs/mcp.md` states the numbers.

## Source + Goal linkage

- **Source:** `/pm-brainstorm w23` (2026-11-07), owner-approved: "them all for w23 and then /loopx w23", proposal 5, owner decision "放宽". Reverses the keep-it outcome of [w23/222](../done/222.md).
- **Goal linkage:** A1 — Agent-native accounting. The recommended preview-then-commit flow should not halve an agent's write throughput.
- **Expected outcome:** Agents can preview freely without exhausting the budget their commits need.
- **Why now:** Owner decided to widen it, and 222 already named the hook to use.
