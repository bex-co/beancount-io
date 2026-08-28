# Declarative authorization model (OpenFGA DSL)

`model.fga` expresses the **relationship ceiling** of backend-v2's ledger
authorization — who the caller is to a ledger, and which permission rank
follows — in the [OpenFGA modeling language](https://openfga.dev/docs/modeling).
It is **documentation-as-code**: nothing at runtime evaluates it. The
boundary, the no-engine-yet decision, and the triggers that would change it
are [ADR 0010](../../../docs/adrs/ADR010-backend-v2-authz-model.md).

## The semantics, in one line

> effective permission = **credential ceiling** (what this request's
> credential may do) ∩ **relationship ceiling** (what the caller is to the
> ledger).

The intersection is enforced by `authorizeLedger(identity, ledgerId, rel)`
(`src/features/ledger/utils/authorize-ledger.ts`) and stays in code under
any future engine adoption. **This model owns only the relationship half** —
the half an OpenFGA engine could answer.

## What is modeled here (relationship ceiling)

| Model element | Implementation |
| --- | --- |
| `owner`, `collaborator_*` facts | `src/features/ledger/utils/ledger-access-check.ts` — owner branch, Gitea collaborator lookup |
| `public_reader: [user:*]` | `!ledgerData.private` fallback (public ledger ⇒ everyone reads) |
| `can_admin ⊇ can_write ⊇ can_read` rank lattice | `authorizeRank` in `authorize-ledger.ts` |

## What is deliberately NOT modeled (credential ceiling)

The credential ceiling stays the contract of `src/server/api/identity.ts`:
scopes with implication (`ledger.admin` ⊇ `ledger.write` ⊇ `ledger.read`,
`SATISFYING_SCOPES`), the session capability exemption
(`capabilityExempt`), and the single-ledger pin (`Identity.ledgerScope`,
`assertLedgerScope`). Three reasons it is kept out of the model rather than
encoded as contextual `request_scope_*` tuples:

1. **The schema cannot protect it.** OpenFGA has no way to declare a
   relation "contextual-tuple-only" — a persisted scope tuple would be
   schema-legal, and one persisted tuple would leak a session's full
   capability to that user's weakest API key. Modeling it would manufacture
   a security invariant ("never persist these") that only discipline could
   enforce.
2. **Authority would not move.** `identity.ts` would still interpret every
   credential; a tuple builder would merely translate its verdict into
   synthetic relationships for the engine to intersect — an extra
   representation layer with no extra trust.
3. **It breaks the reverse-query trigger.** Scope tuples are per
   `(user, ledger)` pair. ADR 0010's trigger T2 is ListObjects ("which
   ledgers can this user read?") — contextual tuples cannot be supplied
   for an unknown candidate set, so capability filtering would land back
   in code exactly when the engine is supposed to earn its keep.

The composition target under engine adoption is therefore:

```ts
authorizeLedger =
  credentialAllows(identity, ledgerId, rel)   // identity.ts, in-process
  && relationshipAllows(userId, ledgerId, rel) // today: ledger-access-check
                                               // future: engine Check on can_<rel>
```

## Tuple derivation (relationship half)

Relationship data lives in the external Gitea-backed ledger service and is
resolved per request, so under adoption the relationship facts would be
supplied as [contextual tuples](https://openfga.dev/docs/interacting/contextual-tuples)
per check (or synced into a store if trigger T2 fires): `owner` from the
ledger's owner user; one `collaborator_<permission>` tuple from the
collaborator lookup; `public_reader: user:*` iff the ledger is not private.

### Invariants a future engine adoption MUST enforce

1. **The engine answers only the relationship question.** The credential
   ceiling is checked in-process by the identity layer; no scope- or
   pin-shaped relations ever enter the model or the tuple store.
2. **The relationship resolver emits exactly one effective collaborator
   rank per caller and ledger.** The model's union is monotonic — an extra
   weaker fact never lowers a rank (asserted in the test suite), which
   also means a stale *stronger* grant is a privilege escalation the model
   cannot detect. Canonicalization and revocation are the resolver's job —
   and under trigger T2's synced store, the sync pipeline's: a role change
   must be **atomic** (revoke-old and write-new as one operation),
   **ordered**, and **reconcilable** against the Gitea source of truth.
   "Strongest wins" is a property, not a safety net.
3. **FGA subjects are stable internal user IDs** (`users.id`), never
   usernames. The owner segment of a ledger ID (`alice` in
   `ledger:alice/main`) is a `ledger_username` — a different namespace;
   the runtime owner check compares internal IDs
   (`ledgerOwnerUser.id === userId` in `ledger-access-check.ts`), and
   tuples keyed by username would silently break on rename. The assertion
   suite writes subjects as `user:usr_*` to keep the two namespaces
   visibly distinct.
4. **The anonymous caller is a concrete sentinel subject**
   (`user:anonymous` in the assertion suite), never the `user:*` wildcard —
   the wildcard is the public-access userset, not a caller identity. Real
   account IDs are prefixed base58 nanoids (see backend-v2 `CLAUDE.md`,
   "Data models and IDs"), so no real user can collide with the sentinel.
5. **`public_reader` only ever holds `user:*`** (the type restriction
   already forbids individual users), written iff the ledger is public.

Out of scope of this model (unchanged, and still enforced in code): the
credential ceiling above, the op-id → op-class matrix in
`src/server/api/op-class.ts` (which operation needs which `rel`),
`session-only` ceremonies (`assertSessionIdentity`), the `always-public`
census, rate limiting, and audit.

Also out of scope by construction: an "orphaned" ledger whose owner account
no longer exists. A ledger's ID **is** `owner/name`, and
`ledger-access-check.ts` refuses the request (owner-not-found, fail-closed)
before any relation would be derived — so no tuple set representing that
state can ever reach the model, and the assertion suite deliberately does
not model it. Revocation in general is simply tuple absence, which the
fail-closed rows already cover.

## Validation

CI (`.github/workflows/ci-authz-model.yml`) runs both checks on every change
under this directory. Locally:

```zsh
brew install openfga/tap/fga   # once
fga model validate --file model.fga
fga model test --tests model.test.fga.yaml
```

`fga model test` evaluates the assertions with the CLI's embedded engine — no
server, store, or network involved. `model.test.fga.yaml` pins the
relationship-ceiling truth table: owner, each collaborator rank,
anonymous/public via the wildcard, the fail-closed no-relation rows, and
union monotonicity (a weaker added fact never lowers a rank).

The **composed** two-ceiling truth table (scopes capping ranks, session
exemption, ledger pin) lives with the implementation: today in
`authorize-ledger` unit tests, and — per ADR 0010's follow-up — in a shared
neutral fixture matrix fed to both this FGA suite and Jest tests against the
real `authorizeLedger`, which is what makes "lockstep" machine-checked
rather than a same-PR discipline.
