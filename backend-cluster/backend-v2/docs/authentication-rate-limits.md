# Authentication and rate limits

Password authentication has request quotas before account lookup or password
comparison, plus a separate failed-password budget. Ordinary API throttling
also charges successful requests. This is application admission, rather than
an external fail2ban rule that waits for repeated failures.

These are the current initial thresholds in source, not a claim of measured
production efficacy. Signup continues to disclose an existing email/username
explicitly by product design. Password sign-in and recovery use generic invalid
credential responses; the recovery-mail acknowledgement does not disclose
whether an account exists.

## Password admission

Email keys use trimmed, lowercased addresses; Gmail dots and plus aliases are
not rewritten. Source addresses come from Koa's trusted-proxy handling, not a
client-selected forwarding-header entry. `TRUSTED_PROXY_HOPS` defaults to 1;
use 0 for direct connections and configure the actual trusted proxy chain.
Missing addresses share the `unknown` bucket. Having a valid session cookie
does not waive these domain limits.

| Ordinary password request dimension                         | Allowance | Window                                                             |
| ----------------------------------------------------------- | --------: | ------------------------------------------------------------------ |
| Source IP                                                   |        60 | 1 minute                                                           |
| Source IP                                                   |       300 | 1 hour                                                             |
| Normalized email, across IPs                                |        30 | 1 minute                                                           |
| Normalized email, across IPs                                |       120 | 1 hour                                                             |
| IP + normalized email                                       |        10 | 1 minute                                                           |
| Failed attempts + active reservations, per normalized email |        10 | Failures last 15 minutes; active reservations lease for 30 seconds |

The request quotas are rolling Redis windows. IP admission happens first,
followed by atomic email/pair admission, then the account failure reservation.
An IP admission can therefore be spent even when a later check refuses the
request. Successful logins spend request volume and never reset it. A successful
ordinary comparison clears prior failures without releasing other active
reservations. A stale, expired or reset reservation cannot authorize a session.

Real and dummy bcrypt comparisons share an immediate capacity limit of eight
per process, with no waiting queue. Missing accounts or password hashes take
the dummy comparison path rather than a free missing-account response. Login
passwords are capped at 128 characters. Capacity exhaustion returns service
unavailable with a one-second retry hint; Redis admission failure or a lost
reservation returns service unavailable with a five-second hint.

GraphQL sign-in and password-based Git HTTP authentication call the same
password verifier. Git over HTTPS should not use the account password at all:
its password is a personal access token (`bcio_…`, minted at
`/settings/api-keys`) under any username. A token request never reaches the
password verifier and spends none of the failed-password budget; it is
authorized as REST authorizes the key (`ledger.read` to clone and fetch,
`ledger.write` to push, a ledger-pinned key only on its ledger), and a revoked,
expired, or unknown key gets the same 401 as a wrong password. SSH keys remain
the alternative, with their own key, repository-access and push-policy checks.

The two password paths on the Git endpoint, account email + password and the
generated Gitea credential, are governed by `gitHttp.passwordAuth` in
`src/config/config.ts`: `allow` accepts them, `warn` (the shipped value)
accepts them but logs and counts each use as
`git_http_password_auth_total{path="email"|"gitea"}` and prints a `remote:`
line asking the user to switch to a token, and `deny` refuses them with a 401
that names the token page. It is code, not an environment variable; changing it
is a commit and a deploy. Moving to `deny` is the owner's decision once the
`warn` counts are known, since minting tokens is a paid feature on
beancount.io (a self-hosted stack has every feature).

A stale stored credential is a real failure mode: git keeps retrying it, and on
the email path each retry spends the account's failed-password budget until the
endpoint answers 429. Clear it before entering a token:

```zsh
printf 'protocol=https\nhost=<git host>\n\n' | git credential reject
```

On macOS also delete the Keychain item for the host (Keychain Access, kind
"Internet password"), and remove the host's line from `~/.git-credentials` if
the `store` helper is in use.

## Authentication mail and OTPs

These are additional rolling domain quotas, independent of API operation
budgets. Signup, password reset and sign-in recovery share a mailbox's actual
delivery allowance, so switching ceremonies cannot earn more mail.

| Action / dimension                                                 | Allowance | Window     |
| ------------------------------------------------------------------ | --------: | ---------- |
| Signup requests / IP                                               |        10 | 1 hour     |
| Signup requests / normalized email                                 |         5 | 1 hour     |
| Reset or sign-in recovery requests / IP, shared                    |        10 | 1 minute   |
| Reset or sign-in recovery requests / IP, shared                    |        50 | 1 hour     |
| Reset or sign-in recovery requests / normalized email, shared      |        10 | 1 minute   |
| Mail delivery / normalized email, across all three ceremonies      |         1 | 1 minute   |
| Mail delivery / normalized email, across all three ceremonies      |         5 | 1 hour     |
| Signup OTP verification / IP                                       |        30 | 10 minutes |
| Signup OTP verification / normalized email                         |         5 | 10 minutes |
| Signup OTP verification / signup session                           |         5 | 10 minutes |
| Recovery proof verification / IP                                   |        30 | 10 minutes |
| Recovery proof verification / private challenge                    |         5 | 10 minutes |
| Recovery attempts after consuming a valid proof / normalized email |         3 | 15 minutes |

Signup uses a cryptographically generated four-digit OTP in a ten-minute
session. Mail delivery admission happens before replacing its pending session;
a suppressed resend preserves the existing code and submitted signup
credentials. The signup send remains synchronous.

Reset and sign-in recovery requests enqueue the same durable work for known
and unknown valid email addresses. The HTTP request does no account lookup,
code creation or provider send. Acknowledgement means the job was accepted,
not that mail was sent or will be delivered after a quota window opens. The
worker charges delivery admission before looking up the account; unknown
accounts and jobs refused by the delivery allowance are completed silently.
Provider retries reuse an admitted job without charging delivery again.

### Continue signing in with email ownership

1. Open `/auth/login/`. After a rate-limited password attempt, select **Verify
   email to sign in**, then explicitly select **Send recovery email**. Mounting
   or rerendering the page sends no mail.
2. The page shows the same check-email acknowledgement for known and unknown
   addresses and a 60-second resend cooldown. Open the emailed **Continue
   signing in** link. It carries a private `recovery=rcv_…` challenge, plus an
   optional validated local `next` destination. It contains no email, OTP or
   password.
3. Enter the email, six-digit code and correct current password. A valid proof
   authorizes at most one password comparison, including a wrong-password
   attempt. A wrong code/email, expired proof or replay cannot issue a session.
   The proof lasts ten minutes from issuance; delivery retries do not extend it.
4. Success uses the existing session cookie and post-login destination/mobile
   handoff. It clears the failed-password state, including stale reservations,
   while every request-volume quota stays spent.

The private challenge is derived separately from the public outbox receipt and
is revealed only in mail. GraphQL `requestSignInRecovery(email, returnTo)`
returns only `{ success }`; it exposes neither a challenge nor a receipt.
`signInWithEmailCode(email, challengeId, code, password)` issues the normal
first-party session. These anonymous GraphQL mutations follow the existing
browser-ceremony credential exception; REST and MCP do not mint these sessions.

A consumed mailbox proof permits a comparison in a separate verified-account
lane instead of the ordinary email-volume and failed-password lane. Recovery
still spends the shared password IP
quotas, the proof IP/challenge quotas and, after valid proof consumption, the
verified-account quota. Forged challenges cannot spend the victim's
verified-account allowance. Codes are consumed before database/bcrypt work;
an outage after consumption may require a fresh code.

Every delivered reset email also includes this independent sign-in proof when
available. If all five hourly delivery slots are spent, an owner who knows
their password can use **Continue signing in** with an unexpired, unused proof
in an already delivered reset email without requesting a sixth message. The reset link lasts five minutes
from its first preparation; its sign-in proof lasts ten minutes from issuance.
Those expiries are independent. Resetting the password consumes the reset
token, invalidates other delivered reset links and revokes the user's sessions
and OAuth grants. Neither resetting nor recovery clears request volume.

If the delivered proof expired or was consumed, wait for the applicable
delivery/request window and request a new message. Repeated requests during a
full delivery window do not reserve future mail. The UI respects bounded
`retryAfter` metadata, shows a local retry time, distinguishes temporary
unavailability, and prevents duplicate in-flight submissions. Signup's
account-existence disclosure remains unchanged.

## API budgets and protocol accounting

The shared limiter uses fixed Redis windows per canonical operation.
Authenticated operations must pass both the user's total and their credential's
sub-budget; either can refuse a request. Session IDs come from the verified JWT `jti`
and its persisted session row, OAuth uses its verified token ID, and personal
API keys use their row ID. Synthetic/internal identities without a credential
ID charge the user alone. Replacing, refreshing or revoking a credential never
clears user request volume.

Eligible authenticated REST/GraphQL/MCP aliases of one canonical operation
share its bucket and override. GraphQL charges each root field, including aliases, rather than one
charge per document. Budgets are per operation, not a single combined allowance
for every read or write the user performs.

| Operation class | Allowance per minute, per user and credential |
| --------------- | --------------------------------------------: |
| Read            |                                           300 |
| Write           |                                            60 |
| Admin           |                                            30 |
| Session-only    |                                           300 |
| Public          |                                           600 |

The current operation overrides are retained:

| Operation / family                                                          |                             Allowance per minute |
| --------------------------------------------------------------------------- | -----------------------------------------------: |
| Password `signIn` transport                                                 |               60, plus domain password admission |
| MCP ordinary HTTP transport                                                 | 300, plus the individual tool/resource operation |
| MCP handshake/ceremony transport                                            |                       1,200 in a separate bucket |
| Temporary asset upload URL                                                  |                                               10 |
| Exact-match user discovery                                                  |                                               20 |
| Personal API-key creation                                                   |                                                5 |
| Token introspection                                                         |                                              120 |
| Canonical and compatibility archive downloads, shared                       |                                               30 |
| Public tier catalog and listed billing/social compatibility overrides below |                                              300 |

The 300/minute compatibility overrides cover `allTierQuotas`,
`createSubscriptionSession`, `createStripePortalSession`,
`cancelSubscription`, `resumeSubscription`, `upgradeSubscription`,
`previewPlanChange`, `changePlan`, `cancelScheduledPlanChange`, `getFeed`,
`getUserProfile`, `getUserFollowers`, `getUserFollowing`,
`getUserStarredRepos`, `followUser` and `unfollowUser`. Each canonical operation
has its own bucket. A budget or op class does not grant credential permission.

Anonymous REST intake is keyed by source IP and family:

| Family                      | Allowance per minute |
| --------------------------- | -------------------: |
| OAuth and well-known intake |                   60 |
| Webhooks                    |                  120 |
| CLI device status polling   |                  120 |
| Archive downloads           |                   30 |
| Default/unmatched intake    |                  120 |

Polling different device codes, accepted static-path case variants or a
trailing slash does not create another polling allowance. Device polling,
password requests and mail requests are separate families/operations. GraphQL
session refresh has its own canonical operation bucket (300/minute); OAuth
refresh requests share the OAuth IP intake above, not a dedicated refresh
allowance. Anonymous GraphQL root fields use their operation's IP bucket.

REST refusals return 429 with `Retry-After`; GraphQL returns
`extensions.code = RATE_LIMITED` and `retryAfter` in seconds. MCP domain
refusals expose the corresponding error code and retry hint. Retry information
does not identify which user/token dimension was exhausted.

## Redis outages and bounded resources

Existing authenticated API traffic can continue through a bounded local shadow
of request history. Every process precharges this shadow before its first
Redis await, including while Redis is healthy, and merges observed Redis counts
conservatively. Healthy traffic does not extend a shadow's fixed expiry;
delayed replies cannot mutate a replacement generation.

Each process retains at most 10,000 shadow entries and never evicts a live
entry to admit another subject. At capacity, new subjects/operations are
refused until entries expire; fully tracked subjects can continue within quota.
Rotating credentials after the user total is exhausted does not allocate more
credential entries. This is a per-process availability fallback, not distributed
coordination: during an outage, multiple instances can each admit local volume.
Restarting a process loses that process's local history. Redis remains necessary
for cross-instance request accounting.
Ordinary anonymous intake also uses a bounded local shadow; security-sensitive
authentication admission does not.

The raw Redis wrapper has a one-second caller deadline and at most 128 pending
commands. A caller timeout does not release the underlying slot: it remains
occupied until the reply or socket failure settles. The native shared client
also caps its queue at 256 commands and disables offline queuing. Socket
connection and Keyv initial-connection deadlines are two seconds; the socket
inactivity timeout is two seconds, with a one-second heartbeat and reconnect
backoff increasing by 100 ms up to two seconds. These are connection/command
bounds, not a two-second deadline for the whole application startup.

Password reservations, signup OTP admission, recovery proof consumption and
mail admission fail closed when their raw Redis operation is unavailable or
times out. They do not inherit the ordinary API shadow's outage allowance.
Cache writes/deletes configured as strict reject provider errors. Generic
`CacheHelper.getStrict` still goes through cache-manager, whose reads can turn
a store error into a miss; it is not proof of a successful security-state read.
Recovery proofs and newly issued reset-token operations use raw atomic Redis
scripts instead.

## Deployment and development

Apply [the tracked migrations](../src/drizzle/migrations/), including
`0024_auth_mail.sql`, before serving requests. The normal server starts the
authentication-mail scheduler automatically; an API process without that
scheduler can accept jobs without delivering them.

Reset/recovery jobs store an AES-256-GCM encrypted payload in PostgreSQL using
a key derived from `AUTH_SECRET`, bound to the job ID/kind. All API/worker
instances need the same non-empty deployment secret and correct public
`DASHBOARD_URL`. Changing the secret prevents old jobs from being decrypted and
changes session/proof verification; plan secret changes accordingly.

Jobs expire five minutes after enqueue. Every five seconds, a worker batch
claims up to five jobs and skips overlapping batches within that process.
PostgreSQL row claims use a 60-second lease and distinct lease token; saving
prepared contents renews the lease, and stale workers cannot save/complete
another claim. A job has at most five claims, with retry delays of 5, 10, 20 and
40 seconds. Expired/exhausted jobs are cleaned up. Prepared tokens, codes and
expiry instants are persisted before provider delivery so retries reuse them.
A provider-accepted message whose acknowledgement is lost can be delivered
again; the system does not promise exactly-once email delivery.

The configured SendGrid client makes two total provider attempts per claim,
each with a ten-second timeout. Its nominal timeout budget is therefore twenty
seconds, below the worker lease. Production mail uses `SEND_GRID_API_KEY` and
the configured sender. In development/test, `ConsoleSendGrid` suppresses mail
and logs only an operation/count, never addresses, codes, links or contents.
A human end-to-end signup/recovery check needs a fully configured mail
deployment; adding an API key to a development process does not switch that
client. Automated contracts use synthetic captured messages, with no provider
calls or real credentials.

For delivery trouble, check migrations, PostgreSQL enqueue/claim health,
scheduler activity, consistent `AUTH_SECRET`, Redis availability, provider
configuration and the relevant quotas. A neutral success response alone is not
a delivery diagnostic. Never retrieve OTPs from development logs or disable
admission to make a verification pass.

## Privacy and tuning

Authentication-mail worker/provider errors use static diagnoses/categories
without recipient addresses, bodies, links or original provider errors. Raw
Redis admission errors are static; cache-failure logs contain only operation
and category; Drizzle logs SQL placeholders without interpolated parameters.
JWT signature-failure logs contain no secret prefix. Rate-limit diagnostics may
contain the operation, stable user/token IDs and counts, never the credential
itself. These are scoped safeguards, not a guarantee about external proxy,
provider or deployment access logs: configure those to avoid recording private
authentication URLs and query values.

The private recovery route emits `noindex` and `no-referrer` metadata. Recovery
forms use POST and remain disabled until hydrated, keeping unhydrated native
submissions from putting passwords/codes in a URL. The dashboard's copied
diagnostic reports drop URL userinfo/query/fragment and mask known credential
echoes and recognizable recovery challenges. Error path/time/browser and useful
truncated stacks remain available. Do not paste an original recovery/reset
link or credential-bearing request into a support ticket.

When tuning, collect privacy-safe aggregates first: admissions/refusals by
operation class and ceremony, 429 versus 503 counts, retry-delay distributions,
active password comparisons, Redis latency/timeouts/queue saturation, outbox
age/retries/expiry, provider failures and completed recovery attempts. These
are suggested aggregate signals to instrument or derive; this guide does not
claim a dedicated metric exists for each one or that current thresholds have
been validated by production measurements. Do not label aggregates with email,
IP, code, challenge, token, ciphertext or raw request variables.

Use synthetic known/unknown accounts to reproduce a complaint, check the exact
refusing dimension without exposing it to callers, change the relevant source
budget, and rerun domain admission, actual HTTP recovery, protocol alias/parity
and outage/resource-bound contracts before rollout. Preserve the already
delivered-email recovery lane and independent user totals; raising a single
IP threshold alone does not address account starvation.

## Source and verification map

- [Password request quotas](../src/features/auth/operations/password-request-limits.ts),
  [failure reservations](../src/features/auth/operations/password-failure-budget.ts),
  [atomic admission/lease scripts](../src/foundation/redis/redis-admission.ts),
  [bcrypt capacity](../src/features/auth/utils/password-verifier.ts).
- [Mail/OTP quotas](../src/features/auth/operations/auth-mail-limits.ts),
  [ownership proofs](../src/features/auth/operations/sign-in-recovery-proof.ts),
  [auth service](../src/features/auth/service/auth-service.ts).
- [Outbox worker](../src/features/auth/service/auth-mail-service.ts),
  [leased persistence](../src/features/auth/data/auth-mail-model/postgres-impl.ts),
  [schedule](../src/scheduler/jobs/auth-mail-job.ts),
  [provider timeout](../src/foundation/sendgrid.ts).
- [Canonical API budgets and shadows](../src/server/api/rate-limit.ts),
  [Redis client bounds](../src/foundation/redis/redis-utils.ts),
  [credential identity](../src/server/api/identity.ts),
  [ceremony/parity exceptions](api-parity.md).
- [Actual GraphQL password contracts](../src/features/auth/api/__tests__/password-admission-contract.test.ts),
  [actual HTTP recovery/reset-mail contracts](../src/features/auth/api/__tests__/sign-in-recovery-contract.test.ts),
  [dual-budget regressions](../src/server/api/__tests__/rate-limit-dual-budget.test.ts),
  [isolated Redis deadline/recovery integration](../src/foundation/redis/__tests__/redis-utils.integration.test.ts).
