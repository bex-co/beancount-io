# w2 · m15 — Centralized authz for the social graph and starring

**Worker:** worker2 **Goal:** centralize authorization for feed/profile/follow relationships and personal starring without copying Gitea social data into an authorization store **Status:** todo

## Tasks (in order)

| id   | title                                      | est | depends_on |
| ---- | ------------------------------------------ | --- | ---------- |
| t001 | Define social actions and resource binding | 40m | —          |
| t002 | Migrate social reads and writes            | 55m | t001       |
| t003 | Adoption surface                           | 20m | t002       |
| t004 | Simplify                                   | 15m | t003       |
| t005 | Test coverage                              | 40m | t003       |
| t006 | Verify Gitea-source parity                 | 25m | t004, t005 |
| t007 | Closeout                                   | 10m | t006       |

## Definition of done

- Feed, public/user profile, followers/following/starred repositories, follow/unfollow, and star/unstar operations have explicit canonical actions and trusted resource binding.
- The PDP queries current Gitea/backend facts where authorization needs them and does not duplicate the social graph as tuples.
- Public visibility, authenticated-self mutations, target-user validation, and repository readability keep their current behavior.
- GraphQL behavior remains compatible and transport aliases cannot create a second authority path.
- No OpenFGA runtime/storage or new dependency is added; required checks pass.

## Source + Goal linkage

- **Source:** user-directed domain-by-domain centralized-authz migration, sequenced after w2/m14.
- **Goal linkage:** **A3 — Community & distribution** — public-ledger discovery and community interactions remain safely reachable under consistent access rules.
- **Expected outcome:** social reads and personal mutations receive one domain decision while Gitea remains the social-data authority.
- **Why now:** this is another bounded domain with externally owned relationships, useful for proving source-backed evaluators before broad ledger access.
- **Adoption surface:** included because profiles, feeds, follows, and stars are public/user-facing surfaces.
