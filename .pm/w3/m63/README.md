# w3 · m63 — List the local `bea mcp` server on the official MCP Registry

**Worker:** worker3 **Goal:** an agent or developer browsing the MCP Registry finds an account-free local Beancount server and installs it from PyPI **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Write `cli/server.json` for `io.beancount/bea` | 45m | — |
| t002 | Add the `mcp-name` ownership marker to the PyPI description | 15m | — |
| t003 | Keep the listing version equal to the CLI version | 30m | t001 |
| t004 | Validate and publish both listings from the Registry workflow | 60m | t001, t002, t003 |
| t005 | Release with the marker and publish the listing | 30m | t004 |
| t006 | Adoption surface | 20m | t005 |
| t007 | Simplify | 20m | t006 |
| t008 | Test coverage | 30m | t006 |
| t009 | Closeout | 15m | t008 |

## Definition of done

`mcp-publisher validate` passes for both listings in CI; the Registry API returns `io.beancount/bea` with the `beancount-io` PyPI package at the released version; the hosted `io.beancount/beancount` listing is unchanged; a version mismatch between `cli/server.json` and `cli/pyproject.toml` fails `make check-all`.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w1` 2026-11-14 (revised after the user excluded `SELF_HOST` work), item 1; the user routed it to w3. Ground truth: `backend-cluster/backend-v2/server.json` lists only the hosted remote; `cli/docs/MCP.md` documents `bea mcp` as a separate local surface; `.github/workflows/publish-mcp-registry.yml`.
- **Goal linkage:** **A3 — Community & distribution** (a package-registry listing), and A1: agents that discover servers through the Registry gain an account-free local Beancount server.
- **Expected outcome:** Someone searching the official MCP Registry for Beancount finds a local server they can run without an account; PyPI installs attributable to the listing rise.
- **Why now:** The `io.beancount` namespace proof and the publish pipeline already exist (w2/m36), so the listing costs little. m64 makes the listed server more capable, but this milestone does not depend on it.
- **Adoption surface:** included — the shipped README install and `bea mcp` connection steps, `cli/docs/MCP.md`, and the Registry entry's description all agree
- **Owner action:** t005's publish waits on the required reviewer of `mcp-registry-publish`.
