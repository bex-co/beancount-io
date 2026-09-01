# w2 · m22 — Personal API key to OAuth migration

**Worker:** worker2 **Goal:** replace user-issued `bcio_` bearer keys with standards-based OAuth access tokens for interactive tools and unattended workloads without widening their authority **Status:** todo

## Tasks (in order)

| id   | title                                                           | est | depends_on |
| ---- | --------------------------------------------------------------- | --- | ---------- |
| t001 | Specify OAuth replacement profiles and the API-key sunset       | 60m | —          |
| t002 | Model user-owned OAuth clients and workload grants              | 75m | t001       |
| t003 | Add interactive OAuth for CLI and agent clients                 | 90m | t002       |
| t004 | Add short-lived OAuth for unattended workloads                  | 90m | t002       |
| t005 | Preserve authorization, rate, audit, and revocation ceilings    | 75m | t003, t004 |
| t006 | Migrate credential management and supported clients             | 90m | t005       |
| t007 | Sunset personal API-key issuance and acceptance                 | 75m | t006       |
| t008 | Adoption surface                                                | 35m | t007       |
| t009 | Simplify                                                       | 30m | t008       |
| t010 | Test coverage                                                   | 90m | t008       |
| t011 | Closeout                                                        | 25m | t009, t010 |

## Definition of done

- Interactive CLI and agent users authorize with a standard browser authorization-code + S256 PKCE flow or device authorization flow; unattended CI and cron jobs authenticate a user-owned workload client with an asymmetric assertion or approved workload federation and receive short-lived OAuth access tokens. A static bearer key is not merely renamed as OAuth.
- Each workload authorization has a stable owner, client/grant identity, allowed resource set, scope ceiling, and optional ledger pin. Issued tokens cannot exceed those stored bounds, and the application API and MCP audiences remain distinct.
- Existing paid-plan issuance policy, no-self-replication rule, ledger pinning, scope narrowing, relationship checks, operational budgets, and audit semantics survive the migration. OAuth policy distinguishes verified interactive and workload client profiles without introducing a second authorization system.
- Workload rate limits and audit trails use a stable verified client/grant identity rather than access-token `jti`, so rotating tokens cannot reset a budget or fragment accountability.
- Revoking a client or grant prevents new tokens and refreshes immediately; an already-issued self-contained access token remains valid for no more than the standard one-hour access-token TTL. UI and docs state this accurately.
- Dashboard credential management, CLI/agent setup, MCP examples, GraphQL/REST OpenAPI security, and self-hosted guidance use the OAuth flows. No supported client requires an `x-api-key` header or `bcio_` bearer after the sunset.
- Aggregate, non-user-identifying evidence proves there are no live personal API-key consumers before acceptance is removed. If any exist, a dated compatibility and migration window replaces a flag-day cutoff.
- Personal API-key issuance, verification, management routes/schema, runtime identity method, docs, and conformance paths are removed after that gate. Historical migrations are retained; provider, webhook, Plaid, email, observability, deployment, and other infrastructure secrets are explicitly unaffected.
- Protocol/failure tests, package checks, guidance validation, secret scan, and deployed development smoke tests for an interactive client and an unattended workload pass. Production deployment remains a separate explicit action.

## Source + Goal linkage

- **Source:** user request on 2026-08-30 to migrate API-key use cases to OAuth, assigned explicitly to `w2`.
- **Goal linkage:** **A1 — Agent-native accounting** — CLIs, coding agents, CI, and cron use one discoverable authorization authority with credentials appropriate to their execution environment.
- **Expected outcome:** users authorize interactive tools without copying a permanent secret, while unattended jobs exchange a revocable user-owned workload credential for narrowly scoped, short-lived access tokens.
- **Why now:** m21 establishes the first-party OAuth classification and centralized client/resource catalog; m22 can then retire the remaining user-facing parallel credential system instead of carrying API keys into the converged authz model.
- **Adoption surface:** included because credential setup, Dashboard settings, OpenAPI/MCP examples, CLI/agent onboarding, and self-hosted automation all change.
- **Security decision:** OAuth access tokens become the common presented credential, but interactive delegation and workload authentication remain different grant profiles. Third-party integration credentials used by backend services are not personal API keys and do not enter this migration.
