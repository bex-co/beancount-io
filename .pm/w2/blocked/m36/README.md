# w2 · m36 — List the hosted MCP server on the official MCP Registry

**Worker:** worker2

**Goal:** Publish Beancount.io's hosted MCP endpoint to the official MCP Registry (`registry.modelcontextprotocol.io`) as `io.beancount/beancount`, so clients and directories that read the registry find `https://beancount.io/api-gateway/mcp` from a list instead of a pasted URL — the first marketplace from ADR 019, chosen because it needs none of that record's unimplemented host work.

**Status:** blocked — 8 of 10 tasks done (t001–t005, t007–t009); t006 and t010 wait on the operator — see [Blocked](#blocked)

**Research date:** 2026-10-02/03 — registry documentation and validators at `modelcontextprotocol/registry` `main`; a draft listing run through `mcp-publisher validate` against the live registry.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Add the registry listing and tie it to the discovery manifest — **DONE** | 30m | — |
| [t002](./done/t002.md) | Serve the domain proof at `/.well-known/mcp-registry-auth` — **DONE** | 45m | — |
| [t003](./done/t003.md) | Plumb the proof through deployment targets and the path index — **DONE** | 30m | t002 |
| [t004](./done/t004.md) | Add the `Publish (mcp registry)` workflow — **DONE** | 45m | t001, t002 |
| [t005](./done/t005.md) | Document the listing and amend ADR 019 — **DONE** | 30m | t001, t002, t003, t004 |
| [t006](./t006.md) | Operator: signing key, production proof, secret, first publish — **blocked** | 30m | t003, t004, t005 |
| [t007](./done/t007.md) | Adoption surface — **DONE** | 30m | t005 |
| [t008](./done/t008.md) | Simplify — **DONE** | 30m | t007 |
| [t009](./done/t009.md) | Test coverage and required package gates — **DONE** | 45m | t007, t008 |
| [t010](./t010.md) | Closeout after the listing is live — **blocked** | 15m | t006, t009 |

t006 is the one step this repository cannot finish alone: the signing key, the production environment value, and the GitHub secret belong to the deployment operator. If it waits, park it with `/pm block` and keep t007–t009 moving on the code already on `main`; t010 waits for both.

## Blocked

- **t006 (2026-10-03)** — the signing key, the production `MCP_REGISTRY_AUTH_PROOF`, and the `MCP_REGISTRY_PRIVATE_KEY` environment secret are the deployment operator's; production answers 404 on `/.well-known/mcp-registry-auth`, the `mcp-registry-publish` environment exists (auto-created, unprotected) without the secret, and the registry has no listing yet. **Unblock:** the operator sets the proof on production (backend at or after `b4518048`), adds the secret, and dispatches `Publish (mcp registry)` with `publish` — full condition in [t006](./t006.md). t007–t009 proceed on the shipped code; t010 waits for t006.
- **t010 (2026-10-03)** — closeout cannot run until t006 makes the listing live; t007–t009 are done, so every open task is blocked and the milestone moves to `blocked/`. **Unblock:** t006 clears; then verify the definition of done against the registry API and production and close through `/pm done w2/m36/t010`.

## Implementation notes

- **2026-10-03, t004 follow-up.** The first push of the workflow to `main` triggered itself: `validate` passed (so `mcp-publisher validate` works on the runner) and `publish` failed, as designed, at "Require the domain proof to be served" — production does not serve `/.well-known/mcp-registry-auth` until t006. A workflow-only edit should not try to publish, so `validate` now decides: a push publishes only when its range changed `server.json`; a dispatch only with `publish`. A validate-only dispatch on the same commit passed with `publish` skipped. The simplify pass (t008) then replaced the shell `git diff` and full-history clone with the push payload's own per-commit file lists in the job's `if`, which also sidesteps the all-zeros `github.event.before` on a first push.

## What the registry needs (verified 2026-10-03)

- A `server.json` (`$schema` 2025-12-11) with a `remotes` entry of type `streamable-http`. The only rules on a remote URL are HTTPS and not localhost; nothing ties the URL's host to the namespace. `description` is at most 100 characters and `_meta` publisher data at most 4 KB.
- A verified namespace. `io.beancount/*` needs proof of control over `beancount.io`: a DNS TXT record at the apex, or an HTTPS file at `/.well-known/mcp-registry-auth` holding `v=MCPv1; k=ed25519; p=<base64 public key>` (`k=ecdsap384` for a P-384 key). The registry parses exactly that record shape. This milestone uses the HTTP file because the backend already owns the `/.well-known/*` family (ADR 0009) and a route is testable; DNS stays documented as the fallback.
- Published versions are immutable. A metadata change is a new `version`; the registry marks the highest semantic version `latest`.
- A draft listing — name `io.beancount/beancount`, title `Beancount.io`, a 93-character description, version `1.0.0`, repository `bex-co/beancount-io` with `subfolder` `backend-cluster/backend-v2`, icon `https://beancount.io/lgasset/logo.png` (256×256 PNG), one remote — passed `mcp-publisher validate` against the live registry on 2026-10-03. It is not committed; t001 lands it.
- Publishing authenticates with `mcp-publisher login http --domain beancount.io --private-key <hex>`. The private key never enters the repository, and the public record is production-only configuration: a self-host serving Beancount.io's key would let Beancount.io publish under that self-host's namespace, so the route answers 404 unless configured.

## Definition of done

- `GET https://registry.modelcontextprotocol.io/v0.1/servers/io.beancount%2Fbeancount/versions/latest` returns the listing with status `active`, `remotes[0].url` equal to `https://beancount.io/api-gateway/mcp`, and the committed `server.json`'s version.
- `https://beancount.io/.well-known/mcp-registry-auth` serves the proof record as `text/plain`; a backend without `MCP_REGISTRY_AUTH_PROOF` answers 404, and a malformed value is refused when configuration loads — both tested.
- `server.json` passes `mcp-publisher validate`, and a backend test fails if its remote URL drifts from the endpoint `/.well-known/mcp.json` advertises for the production origin.
- The `Publish (mcp registry)` workflow validates on every pull request or push touching `server.json`, publishes only from `main` or an explicit dispatch, reads its key from the `mcp-registry-publish` environment, and refuses to republish a version the registry already has.
- `backend-cluster/backend-v2/docs/mcp.md`, the backend `README.md`, ADR 0009's path table, ADR 019 (an amendment answering "which directory comes first"), and the root `AGENTS.md` tooling list describe the listing, the proof, the secret, and the version-bump rule.
- The hosted endpoint answers the ADR 0007 D4 chain (`401` with a `resource_metadata` pointer) at the time of the first publish — re-checked, because a probe on 2026-10-03 got `502` from `/.well-known/mcp.json`.
- Appearance in downstream subregistries and aggregators (Smithery and PulseMCP are the ones the registry's documentation names; others read the same API) follows their own scrape cadence; it is recorded when observed and is not a closeout gate.

## Source + Goal linkage

- **Source:** [ADR 019](../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md) — non-goal "Submitting directory listings" and open question "Which directory comes first"; user decision 2026-10-02 to start bringing the MCP server to marketplaces with the easiest one; registry research 2026-10-02/03 (publishing, authentication, remote-server, versioning, and official-requirements docs in `modelcontextprotocol/registry`; `internal/validators` for the remote-URL rule; `internal/api/handlers/v0/auth/common.go` for the proof-record pattern).
- **Goal linkage:** **A3 — Community & distribution.** A listing in the registry that package-manager-style MCP clients and directories read is distribution, as PyPI and the Homebrew tap are for `bea`. Secondary **A1 — Agent-native accounting**: coding-agent hosts whose server galleries read the registry find the MCP surface, and the listing points at ADR 019 D1's single endpoint, so every host meets the same discovery chain.
- **Expected outcome:** a person in a registry-aware client adds "Beancount.io" from a list and lands on the existing OAuth sign-in; aggregators carry the listing within their scrape cadence (hourly in the registry's guidance); the project has one place to change when the endpoint or description changes, with CI refusing an edit that bumps nothing.
- **Why now:** ADR 019's D3–D9 are still unimplemented (checked 2026-10-02) and gate the Claude, ChatGPT, and Muse directories, each of which also adds a third-party review. The official registry needs none of that — the URL, a 100-character description, and domain proof — and feeds several directories at once, so it is the cheapest first marketplace with the widest reach. Adoption surface is included because the milestone ships a user- and agent-facing listing, new docs, and an environment variable self-hosters will meet in `.env.example`.

## Out of scope

- Submissions to Claude's connector directory, ChatGPT's app directory, or Muse's platform — they wait on ADR 019 D3–D9.
- A `packages` entry (there is no local MCP package; `bea` is a CLI) and `headers` on the remote (OAuth is discovered from the `401`; the API-key path stays in `docs/mcp.md`).
- DNS TXT proof (documented as the alternative, not configured), the `/mcp` alias (ADR 0007 D1), and any host-specific code (ADR 019 D1).
