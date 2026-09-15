# w4 · m12 — Make mobile's `lint:deadcode` see unused GraphQL documents and test-only modules

**Worker:** worker1 **Goal:** `yarn lint:deadcode` in `mobile/` means what the root `CLAUDE.md` says it means — it fails on an operation document nothing uses and on a module only its tests import — and the dead code it currently misses is gone **Status:** done

## Tasks (in order)

| id   | title                                                                                                   | est | depends_on |
| ---- | ------------------------------------------------------------------------------------------------------- | --- | ---------- |
| t001 | Delete unconsumed GraphQL operation documents, allowlisting the billing operations behind ADR001 — **DONE** | 30m | —          |
| t002 | Delete the test-only `select-transaction-amount` module and leftover pins for removed features — **DONE** | 20m | —          |
| t003 | Fail `lint:deadcode` on an operation document with no consumer — **DONE** | 45m | t001       |
| t004 | Fail `lint:deadcode` on a module imported only by tests — **DONE** | 45m | t002       |
| t005 | Simplify — **DONE** | 20m | t003, t004 |
| t006 | Test coverage — **DONE** | 40m | t003, t004 |
| t007 | Closeout — **DONE** | 15m | t005, t006 |

## Definition of done

- Every operation document under `mobile/src/common/graphql/queries/` has a reference to its generated hook or `Document` outside `src/generated-graphql/`, or an allowlist entry citing its reason (ADR001 for the three billing operations).
- `src/screens/home-screen/selectors/select-transaction-amount.ts` and its test are gone. No non-test module under `src/` is imported only by tests, except allowlisted `src/scripts/play-release.ts`, which `scripts/play-release.sh` invokes.
- `yarn lint:deadcode` fails when an unconsumed operation document is added and when a module imported only by tests is added, and passes once each is removed. `knip.jsonc` is unchanged, and the repository-root `scripts/lint-deadcode.sh` picks the new checks up through `yarn lint:deadcode`.
- Generated GraphQL output changes only through `yarn codegen`. `yarn format:check`, `yarn lint`, `yarn typecheck`, and `yarn test:unit` pass.
- The `yarn lint:deadcode` row in `mobile/CLAUDE.md` describes what the gate covers.

## Source + Goal linkage

- **Source:** promoted from w4/025 (dropped once this milestone closed) (static QA, 2026-09-13, extended 2026-09-14). It was blocked on confirming intent for the seven unused operations. The user approved `/pm-brainstorm for w4` item 4 on 2026-09-15 with its recommendation: keep `SubscriptionStatus`, `CreateSubscriptionSession`, and `CancelSubscription` on an allowlist because `docs/adrs/ADR001-mobile-billing.md` is still Proposed, and confirm the other four individually, defaulting to delete. The note stays in the open tree as evidence until closeout.
- **Already landed:** the note's section 2 no longer applies. `src/screens/setting/hooks/` was removed in `bd42fd66`, and `src/translations/en.ts` no longer has the Email Report `subscribe` key (verified 2026-09-15). The seven operations still have zero consumers, and `select-transaction-amount.ts` is still imported only by its test.
- **Goal linkage:** **A1 — Agent-native accounting**, instruction-file quality. The root `CLAUDE.md` tells every coding agent that `lint:deadcode` detects unused files, exports, and exported types, and `/routine-dead-code-removal` starts from the repository's own detectors. In `mobile/`, that detector currently reports clean over seven unused operations and a dead duplicate of the app's central transaction-amount decision.
- **Expected outcome:** an agent or contributor running `yarn lint:deadcode` in `mobile/` gets true findings for these two shapes, and the maintenance routine can act on them instead of trusting a blind gate.
- **Why now:** the routine suite depends on these detectors, so a blind spot turns into confident false "clean" reports on every pass. The inventory in w4/025 is complete and bounded, and the owner decision was the only blocker. This is internal tooling with lower adoption impact than w4/m11, so it is sequenced after it.
- **Adoption surface:** omitted. The milestone changes internal lint tooling with no user-facing surface; the one agent-facing documentation line (`mobile/CLAUDE.md`) is updated inside t004.

## Implementation notes

Closed 2026-09-15 by `/loop-worker w4`.

- **Deleted:** `GetAiCfoUsage`, `InsertReceiptTransaction`, `JournalEntries`, and `UserProfile`. `docs/adrs/ADR002-mobile-ai-assistant.md` does not stage `GetAiCfoUsage`; its quota is enforced on the agent route. The three subscription operations stay, allowlisted with ADR001 as their reason in `mobile/scripts/graphql-operations-allowlist.json`. `select-transaction-amount.ts` and its test are deleted too. The `off`, `weekly`, and `monthly` strings left over from the removed Email Report are deleted from all 13 locales, along with the test case that pinned them; merchants read their cadence labels from `merchantsCadence*` keys.
- **Regeneration:** `graphql.tsx` was regenerated with `graphql-codegen` from the committed `schema.graphql`, generating only that document-dependent output. Plain `yarn codegen` fetches the live schema, and regenerating the schema-derived files (`types.ts`, `schema.graphql`, the introspection JSON) from the committed schema changed them, so they were left as they were. No generated file was edited by hand.
- **Unused operations:** `mobile/scripts/graphql-operations-check.js` runs after knip in `yarn lint:deadcode`. It reports an operation when no code outside generated output and tests names its hook or `Document`. It also reports stale allowlist entries. Its behavior is covered by `mobile/src/__tests__/graphql-operations-check.test.ts`.
- **Modules only tests reach — deviation from the definition of done:** the `/simplify` review showed that knip's production mode already finds these, with real module resolution. `knip.jsonc` therefore changed. The production entries (routes, scripts, `babel.config.js`) carry `!`, and `project` excludes `__tests__` in production mode, while `yarn lint:deadcode` adds `knip --production --include files`. The test-entry glob and the generated-export exemption stay exactly as they were, which is what the source note protected, and a normal `knip` run reports the same as before.
- **Checked on 2026-09-15:**
  - Adding an unused `query QaUnusedProbe` fails `yarn lint:deadcode`, and deleting it passes.
  - Adding `src/common/qa-probe.ts` imported only by its test fails it, and deleting it passes; the same module imported from a script in `src/scripts/` passes.
  - `yarn typecheck`, `yarn lint`, `yarn format:check`, and `yarn test:unit` (1816 tests) pass.
