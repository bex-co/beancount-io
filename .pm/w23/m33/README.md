# w23 · m33 — Make every tool, parameter and recipe the docs and hints name resolve

**Worker:** worker1 **Goal:** A renamed tool, a wrong parameter in a hint, or a recipe that no longer runs fails CI instead of reaching a reader. **Status:** todo (t001, t002 done)

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Inventory what existing tests already guard — **DONE** | 30m | — |
| t002 | Test that every named tool and parameter exists — **DONE** | 60m | t001 |
| t003 | Run the documented recipes in-process | 60m | t001 |
| t004 | Fix the drift found | 40m | t002, t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 20m | t005 |
| t007 | Test coverage | 30m | t005 |
| t008 | Closeout | 15m | t007 |

## Definition of done

A test fails when `docs/mcp.md` prose, a tool or prompt description, or an error `hint` names a tool or parameter absent from `tools/list` (except listed historical renames); the runnable blocks of "The agent happy path" and "Inspect the protocol with curl" execute in-process against synthetic fixtures; breaking a doc name or a recipe turns CI red; `yarn test` passes.

## Source + Goal linkage

- **Source:** `w23/done/217`, `w23/done/228`, w23/m30, `/pm-brainstorm for w23` 2026-11-08, proposal 3.
- **Goal linkage:** A2 — Frictionless onboarding (quickstarts that work exactly as written); A1.
- **Expected outcome:** A newcomer or agent following the docs gets a working first tool call, and renames cannot silently strand the docs.
- **Why now:** w23/217 showed a hint citing a parameter that does not exist, and w23/228 just added a recipe nothing keeps runnable.
- **Adoption surface:** included: agents and integrators touch this surface directly.
