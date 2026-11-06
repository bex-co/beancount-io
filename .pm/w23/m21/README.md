# w23 · m21 — Guard write-preview behavior with a parity matrix

**Worker:** worker1 **Goal:** every write tool's preview-versus-commit rule is asserted by a generated matrix across REST, GraphQL and MCP, so a divergence like w23/219 fails CI instead of waiting for a QA run **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Inventory every write tool's preview and commit rules | 40m | — |
| t002 | Build the preview/commit matrix harness on the existing parity fixtures | 60m | t001 |
| t003 | Fix the gaps the matrix exposes | 60m | t002 |
| t004 | State the one preview rule in `docs/mcp.md` and `docs/api-parity.md` | 20m | t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 30m | t005 |
| t008 | Closeout | 15m | t006, t007 |

## Definition of done

- A test enumerates every write tool that accepts `dry_run` (`appendLedgerText`, `addLedgerEntries`, the `…LedgerFiles` tools, `renameLedgerFile`, source-slice edits, the bank tools, collaborator and ledger admin tools) and, per tool and per available surface, asserts: the preview does not refuse for new bean-check errors and carries `valid`; the same request without `dry_run` is refused with the same code on every surface; a preview writes nothing.
- Adding a write tool with `dry_run` without registering it in the matrix fails the test run.
- Deliberately restoring the pre-w23/219 `addLedgerEntries` preview refusal makes the matrix fail naming the tool and surface.
- `docs/mcp.md` and `docs/api-parity.md` state the single preview rule, with the documented exceptions (tools whose preview is a destroy or access summary, not a bean-check projection).

## Source + Goal linkage

- **Source:** `/pm-brainstorm w23` (2026-11-05), owner-approved: "them all to w23 and then /loopx w23", proposal 1. Follows [w23/218](../done/218.md), [w23/219](../done/219.md), [w23/220](../done/220.md) and [w1/037](../../w1/done/037.md): the same preview/commit divergence was found four times by hand.
- **Goal linkage:** A1 — agent-native accounting. An agent that previews before committing must be able to rely on one rule across all write tools and all three surfaces.
- **Expected outcome:** "preview and commit disagree" findings stop reaching the board; agents gate previews on `valid` uniformly.
- **Why now:** w23/219 just chose the rule (previews never refuse, `valid` carries the verdict) and changed three tool families at once; pinning it in a matrix now keeps the next write tool from diverging. **Sequence:** do [w23/221](../221.md) (source-slice preview) before t003 so the matrix does not start red on a known gap.
- **Adoption surface included:** the preview rule is read by agents through `docs/mcp.md`, the OpenAPI snapshot and the tool descriptions.
