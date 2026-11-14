# w22 · m11 — Every deployment says which commit it runs

**Worker:** worker1 **Goal:** an agent or maintainer can tell in one call which build a deployment is running, so "is the fix live?" no longer means provoking an error **Status:** todo (t001, t002, t003, t004, t005, t006, t007 done)

## Tasks (in order)

| id   | title                                                                          | est | depends_on |
| ---- | ------------------------------------------------------------------------------ | --- | ---------- |
| t001 | Parse the running revision once into `AppConfig` — **DONE**                               | 30m | —          |
| t002 | Report it on `serverInfo.version` and in `/.well-known/mcp.json` — **DONE**               | 45m | t001       |
| t003 | Wire it into the local builds and say why bex cannot use a build arg — **DONE**           | 30m | t001       |
| t004 | `yarn mcp:conformance` and the QA contract replay print the revision — **DONE**           | 30m | t002       |
| t005 | Document the fields and tell QA runs to record the revision — **DONE**                    | 20m | t004       |
| t006 | Adoption surface — **DONE**                                                               | 25m | t003, t005 |
| t007 | Simplify — **DONE**                                                                       | 25m | t006       |
| t008 | Test coverage                                                                  | 45m | t006       |
| t009 | Closeout                                                                       | 15m | t007, t008 |

## Definition of done

- With `BEANCOUNT_REVISION=<sha>` (or `RENDER_GIT_COMMIT`) set, `/.well-known/mcp.json` reports `revision` and the MCP `initialize` answer reports `1.0.0+<first 7 characters>`.
- Unset or malformed (including the literal `unknown`) reports `revision: "unknown"` and `1.0.0`, with nothing else changed on either surface.
- `yarn mcp:conformance` and the QA contract replay print the revision they observed.
- The local compose builds and their READMEs say how to supply it, and `deploy/bex/README.md` and `bex.yaml` say why bex cannot use a build argument.
- No REST, GraphQL, or `health` change was needed, confirmed by the surface-parity gate.
- Backend-v2 `yarn typecheck`, `yarn lint:deadcode`, `yarn format:check`, and `yarn test` pass, and `python3 scripts/check-bex-blueprint.py`, `python3 scripts/check-agent-guidance.py`, and `python3 scripts/skills/ci-check.py` pass.

## Source + Goal linkage

- **Source:** inbox note `w22/052`, filed 2026-11-13: production reports `version: 1.0.0` and nothing else, and confirming that `f58c89d64` was live meant calling a tool that fails on purpose and reading a JSON line. Promoted because the config, two MCP discovery surfaces, two deployment targets, the conformance script, the QA replay, and the docs are several tasks and well over an hour.
- **Goal linkage:** A1 — agent-native accounting. An agent or QA client evaluating the hosted MCP endpoint can see which build it is talking to, which `.pm/DO_NOT_DO.md` already requires its evaluation record to say.
- **Expected outcome:** a maintainer or agent tells in one call whether a fix is deployed. Several blocked milestones (`w23/m44`, `w1/m43`, `w1/m45`, `w23/242`) wait on exactly that check.
- **Why now:** the check was needed again on 2026-11-13 and had no clean answer; the cost of adding it is small and every later "is it live?" question benefits.
- **Adoption surface:** included, because the milestone changes the MCP discovery documents agents read, the backend docs, the QA contract under `.agents/skills/qa-shared`, and the deployment READMEs.
- **Design decisions recorded:**
  1. The value comes from `BEANCOUNT_REVISION`, then `RENDER_GIT_COMMIT`. Only a 7–40 character hexadecimal string is accepted (lowercased); anything else, including the literal `unknown` a Dockerfile default sets, counts as unset, so a platform variable is never shadowed. Unset reports `unknown`.
  2. It is exposed only on the MCP discovery surfaces: `serverInfo.version` gains semver build metadata (`1.0.0+<first 7>`, unchanged when unknown) and `/.well-known/mcp.json` gains a `revision` field. `health` is not changed: its GraphQL form returns a bare string and it already exists on REST, GraphQL, and MCP, so changing it would mean a contract change and parity work for no gain. t002 runs the surface-parity gate to confirm none is needed.
  3. `bex.yaml` records that Docker builds there get no build arguments, so the runtime variable is the primary path; the build argument only serves local compose builds. bex is a Render-compatible platform and the repository already reads its `RENDER_EXTERNAL_URL`; whether it also sets `RENDER_GIT_COMMIT` cannot be verified from this repository, so the docs say to set `BEANCOUNT_REVISION` on the service when it does not.
  4. The ledger service is out of scope: it is private, and nothing a QA client can reach reports it.
- **Out of scope:** the ledger service; any change to `health`; the production check itself, which rides the next owner deploy (record the observed revision there, and if production still reports `unknown` the owner sets `BEANCOUNT_REVISION` on the service).
