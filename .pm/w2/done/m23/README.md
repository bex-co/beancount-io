# w2 · m23 — Complete Dashboard OAuth-only login

**Worker:** worker2 **Goal:** make OAuth 2.1 authorization code + S256 PKCE the only credential-issuing login path for new Dashboard authentication while retaining read-only acceptance of already-issued legacy tokens so signed-in users are not logged out **Status:** done

## Tasks (in order)

| id   | title                                                        | est | depends_on |
| ---- | ------------------------------------------------------------ | --- | ---------- |
| t001 | Specify the OAuth-native login and one-way compatibility boundary | 50m | —          |
| t002 | Enter OAuth before rendering Dashboard authentication        | 75m | t001       |
| t003 | Complete password and magic-link login inside OAuth          | 90m | t002       |
| t004 | Complete OTP signup and account creation inside OAuth        | 90m | t002       |
| t005 | Preserve read-only acceptance of existing legacy tokens      | 60m | t003, t004 |
| t006 | Delete Dashboard legacy-session issuance and bootstrap       | 90m | t005       |
| t007 | Remove obsolete Dashboard session-only branches and dead code | 75m | t006       |
| t008 | Adoption surface                                             | 35m | t007       |
| t009 | Simplify                                                     | 30m | t008       |
| t010 | Test coverage                                                | 90m | t008       |
| t011 | Closeout                                                     | 25m | t009, t010 |

## Definition of done

- Every unauthenticated Dashboard password, OTP signup, and magic-link entry begins or resumes an OAuth authorization interaction before credentials are accepted. Successful authentication completes that interaction directly and returns an authorization code protected by S256 PKCE; it does not mint an intermediate legacy Dashboard session.
- New Dashboard authentication writes only the validated `beancount-dashboard` OAuth access token to the secure HttpOnly browser credential cookie. No Dashboard login/signup/callback path creates, rotates, refreshes, returns, or depends on a database-backed legacy session token.
- Password verification, OTP session/account creation, magic-link consumption, password reset, safe continuation, account initialization, localization, and failure behavior remain user-visible authentication features, but none of them is a second credential issuer outside the OAuth provider interaction.
- The post-login legacy-to-OAuth bootstrap, legacy-session issuance rollback switch, legacy one-time-token Dashboard callback, and Dashboard-only session revocation/terminology are removed when they have no remaining non-Dashboard consumer. OAuth provider sessions, interactions, grants, authorization codes, and PKCE state remain because they are OAuth protocol state, not the retired legacy application session.
- Already-issued valid legacy Dashboard tokens continue to pass the existing authenticated identity check with their historical authority until their own expiry, so users who were signed in before deployment are not logged out. They are never renewed or reissued, and this compatibility verifier cannot be reached by a newly unauthenticated Dashboard login.
- Existing legacy-token users may continue normally or be silently upgraded to the Dashboard OAuth credential, but upgrade failure never destroys a still-valid legacy credential. Once the last possible token expires, removing the read-only verifier is a mechanical cleanup rather than another login migration.
- Dashboard OAuth remains the exact first-party client for interactive profile, billing, credential approval, consent, and account operations. Mobile, MCP/DCR, API-key, unknown OAuth, and copied client identifiers do not gain its authority or its 365-day lifetime.
- Tests fail if any new Dashboard password, OTP, or magic-link flow issues a legacy session; they also prove existing legacy tokens remain accepted, expired tokens fail closed, OAuth tokens drive subsequent SSR/CSR/REST/agent calls, and Mobile/MCP contracts remain unchanged.
- Dashboard and backend package gates, authorization-model checks, guidance validation, source secret scan, and a deployed development smoke pass. The smoke must visibly distinguish “no legacy token issued” from merely observing a later OAuth request. Production deployment remains a separate explicit action.

## Source + Goal linkage

- **Source:** user correction after live development validation of `w2/m21`: Dashboard requests used OAuth after signup, but signup still issued a temporary legacy session, so the requested OAuth-only login migration was not complete.
- **Goal linkage:** **A2 — Frictionless onboarding** — a newcomer has one authentication authority and one issued Dashboard credential instead of traversing two credential systems during every new login.
- **Expected outcome:** new Dashboard users authenticate directly within OAuth and receive only the first-party OAuth credential, while users holding a valid pre-cutover token remain signed in until it expires.
- **Why now:** leaving the bootstrap bridge in place would make the supposedly transitional session issuer permanent and carry two login authorities into the remaining authz and API-key migrations.
- **Adoption surface:** included because login, signup, magic links, self-host configuration, migration guidance, rollback behavior, and contributor-facing authentication architecture all change.
- **Security decision:** compatibility is verify-only and one-way. Existing legacy tokens retain their historical acceptance until expiry, but no new Dashboard path may issue, renew, rotate, or use one as an OAuth bootstrap credential.
