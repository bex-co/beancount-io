# w1 · m46 — Ledger clone addresses come from the deployment, never beancount.io

**Worker:** worker1 **Goal:** on a self-hosted stack, every ledger's `sshUrl` and `httpUrl` name the operator's own Git host, a stack that serves no Git over SSH returns no `sshUrl`, and `bea cloud ledger clone` says why it cannot clone instead of failing on someone else's host key. **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Derive the external Git host from the deployment when `SELF_HOST` is on — **DONE** | 45m | — |
| t002 | Ledger responses carry no `sshUrl` when the stack serves no Git over SSH, on REST, GraphQL and MCP — **DONE** | 60m | t001 |
| t003 | Describe where the Git address comes from in the bex and Docker deploy docs — **DONE** | 20m | t001 |
| t004 | `bea cloud ledger clone` explains a ledger with no SSH address — **DONE** | 40m | t002 |
| t005 | Adoption surface — **DONE** | 20m | t003, t004 |
| t006 | Simplify — **DONE** | 15m | t005 |
| t007 | Test coverage — **DONE** | 30m | t005, t006 |
| t008 | Closeout — **DONE** | 10m | t007 |

## Definition of done

- On `deploy/docker-mac/` with `SELF_HOST=true` and no `EXTERNAL_GITEA_HOST_NAME`, `GET /api-gateway/v1/ledgers`, GraphQL and the MCP ledger reads return `httpUrl` (and `sshUrl`, when served) on the stack's own Git host; no response names `git.beancount.io`.
- With `SSH_PROXY_ENABLED` off, the same responses carry no `sshUrl` (null or absent, the same on all three surfaces), and the backend-v2 parity gate and OpenAPI snapshot check pass.
- `bea cloud ledger clone` on such a ledger exits non-zero with a JSON error envelope (under `--json`) and a message that this deployment serves no Git over SSH; it does not try another host or protocol.
- The managed service, and a self-hosted stack that sets `EXTERNAL_GITEA_HOST_NAME`, return exactly the addresses they return today (tests prove both).

## Source + Goal linkage

- **Source:** [ADR029](../../../../docs/adrs/ADR029-deploy-self-hosting-contract.md) (`Proposed`) Finding F2 and Decision 3, first half. `/pm-brainstorm for w1`, 2026-11-14, item 1; routed by the user via `/pmx` the same day. Precedent: [w22/007](../../../w22/done/007.md) (`cd730fc90`) already applied this rule to the AI pull-request link.
- **Goal linkage:** **A2 — Frictionless onboarding** (a self-hoster clones their first ledger without hitting the hosted service's Git host), with **A1** for agents that run `bea cloud ledger clone`.
- **Expected outcome:** a self-hoster or their coding agent either clones from their own host or reads exactly why they cannot; no "Host key verification failed" against `git.beancount.io`. Signals: self-host issues that name a cause, completed bex one-click runs.
- **Why now:** it is the one shipped behaviour that breaks `.pm/DO_NOT_DO.md`'s "no half-self-hosted deployments" rule outright, and the self-host contract check (ADR029 D6) cannot pass until it is fixed. Adoption surface is included because ledger responses and a `bea` command change for every self-hoster and agent.

## Closeout

Closed 2026-11-14. With `SELF_HOST` on and no `EXTERNAL_GITEA_HOST_NAME`, the API reads Gitea's `ROOT_URL` at start (`GET /api/v1/user`, `html_url`; checked against a real `gitea/gitea:1.24` container with a sub-path `ROOT_URL`) and stops instead of falling back to `git.beancount.io`. A self-hosted stack without the SSH proxy returns `sshUrl: null` on REST, GraphQL and MCP (`catalog-parity.test.ts`). `bea cloud ledger clone` and `create --clone` refuse it with exit 1 and a `validation` envelope (`cli/tests/test_cloud_clone_no_ssh.py`), and the dashboard clone menu shows only HTTP. Hosted and explicit-host addresses are unchanged (`gitea-utils.test.ts`). On `deploy/docker-mac/` the compose default sets `EXTERNAL_GITEA_HOST_NAME=localhost`, so it never named beancount.io. No full stack was brought up. Mobile does not query `sshUrl`, and its schema follows production codegen.

## Out of scope

- Cloning over HTTPS when SSH is not served (ADR029 D3, second half). On its face it conflicts with `.pm/DO_NOT_DO.md` "No hosted-ledger export without SSH setup"; only the owner can say whether that rule covers self-hosted stacks. Do not build it under this milestone.
- Adding TCP routing or Git over SSH to bex.
