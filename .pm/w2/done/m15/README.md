# w2 · m15 — Centralized authz for the social graph and starring

**Worker:** worker2 **Goal:** centralize protected social mutations and non-public reads at application-service boundaries while keeping explicitly public discovery public and Gitea as the only social-data source **Status:** done

## Tasks (in order)

| id   | title                                                                | est | depends_on |
| ---- | -------------------------------------------------------------------- | --- | ---------- |
| t001 | Catalog social actions, exclusions, and trusted resources — **DONE** | 45m | —          |
| t002 | Migrate protected social service boundaries — **DONE**               | 60m | t001       |
| t006 | Verify Gitea-source parity, failures, budgets, and audit — **DONE**  | 35m | t002       |
| t003 | Adoption surface — **DONE**                                          | 20m | t006       |
| t004 | Simplify — **DONE**                                                  | 15m | t003       |
| t005 | Test coverage — **DONE**                                             | 50m | t003       |
| t007 | Closeout — **DONE**                                                  | 15m | t004, t005 |

## Definition of done

- Feed, public/user profile, followers/following/starred repositories, follow/unfollow, and star/unstar operations are inventoried exactly once as a canonical protected action or an explicit public exclusion, with trusted resource binding.
- The PDP queries current Gitea/backend facts where authorization needs them and does not duplicate the social graph as tuples.
- Public visibility, authenticated-self mutations, target-user validation, and repository readability keep their current behavior.
- Protected application-service methods receive explicit `Identity`; GraphQL behavior and error categories remain compatible, and transport aliases cannot create a second authority path.
- Source failures are distinct audited service errors, denials cause no Gitea write, operational budgets remain stable, and no authorization decision is memoized.
- The shared w2 migration contract is satisfied, including checks, applied migrations, a deployed development social smoke test, and persisted-audit verification.

## Source + Goal linkage

- **Source:** user-directed domain-by-domain centralized-authz migration, sequenced after w2/m14.
- **Goal linkage:** **A3 — Community & distribution** — public-ledger discovery and community interactions remain safely reachable under consistent access rules.
- **Expected outcome:** social reads and personal mutations receive one domain decision while Gitea remains the social-data authority.
- **Why now:** this is another bounded domain with externally owned relationships, useful for proving source-backed evaluators before broad ledger access.
- **Adoption surface:** included because profiles, feeds, follows, and stars are public/user-facing surfaces.
- **Migration contract:** inherits `.pm/w2/README.md`; production deployment and social product changes remain separate.
