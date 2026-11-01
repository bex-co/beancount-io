# w23 · m18 — Bind ledger pins to the repository ID

**Worker:** worker1 **Goal:** a credential pinned to one ledger follows that ledger across a rename and never follows a recreated name **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Resolve a pin to its repository ID and back | 45m | — |
| t002 | API keys pin to the repository ID | 60m | t001 |
| t003 | OAuth grants pin to the repository ID | 60m | t001 |
| t004 | Say which name a pin uses | 30m | t002, t003 |
| t005 | Docs and the ADR 0007 amendment | 30m | t004 |
| t006 | Adoption surface | 20m | t005 |
| t007 | Simplify | 30m | t006 |
| t008 | Test coverage | 45m | t006 |
| t009 | Verify on production and close out | 20m | t007, t008 |

## Definition of done

- A pinned API key or OAuth token addresses its ledger by the new name after a rename, on REST, GraphQL and MCP, and its listings and refusals show the current name.
- A pin whose repository was deleted, or whose old name now belongs to a different repository, is refused.
- Legacy name-only pins keep working and bind to the repository ID on first use.
- ADR 0007, docs, the surface-parity gate and package checks are green; the production rerun passes.

## Source + Goal linkage

- **Source:** promoted from `w23/065` (2026-11-01, owner chose to bind pins to the repository ID).
- **Goal linkage:** A1 (agent-native accounting): year-end renames such as `personal` to `personal-2025` must not strand every pinned agent credential.
- **Expected outcome:** pinned agents keep working across renames and cannot be silently redirected to a different repository.
- **Why now:** the credential trust boundary is decided; the pin still compares names as strings in five places.
