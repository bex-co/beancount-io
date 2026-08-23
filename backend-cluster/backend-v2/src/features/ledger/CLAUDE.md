# Ledger Feature

Core ledger GraphQL and REST behavior: repository lifecycle, entries, journal, reports/data, accounts, assets, collaborators, receipts, public keys, and shell/BQL queries.

## Layout

- `api/resolvers/` — query/mutation transport adapters split by domain.
- `api/rest/` — archive download and ledger REST handlers.
- `service/` — single-domain ledger capabilities backed by Fava/ledger-v2 and Gitea.
- `workflow/` — multi-service orchestration for ledger lifecycle, collaborators, and receipts.
- `operations/` — small injected domain operations reused by services/workflows, including tier/directive-limit behavior.
- `types/fava-api.types.ts` — ledger-service response types; keep aligned with the generated Fava client and ledger contract.
- `utils/` — authorization, caller resolution, mapping, entry-file routing, and templates.

`ledger-legacy-resolver.*` preserves the v1 GraphQL shape. Do not add new product behavior there; use the standard resolver/service/workflow surface.

## Authorization and identity

- Resolve the authenticated caller and requested ledger separately; never assume the ledger owner is the caller.
- Use `utils/authorize-ledger.ts`, `ledger-caller-resolver.ts`, and `ledger-access-check.ts` rather than duplicating owner/collaborator/public checks.
- Preserve the three-party cases covered by the access tests: owner, collaborator, and anonymous/public access.
- Pass `userId`/ledger ID as method input. Resolvers do not access models or provision clients themselves.

## Writes and files

- `LedgerEntryService` owns entry construction and file routing. Respect explicit `filename` values and the existing bcio-option fallback behavior.
- A target file supplied by a caller must already exist in the ledger unless the operation explicitly creates a complete ledger template. Never write to an un-included file silently.
- Receipt writes belong in `LedgerReceiptWorkflow` because they coordinate temporary assets, permanent storage, and ledger entries.
- Preserve directive-limit bypass/cache invalidation behavior when changing entry or repository writes.

## Wiring and tests

New simple capabilities are services; cross-service use cases are workflows. Add constructor-injected resolvers to `src/server/graphql/resolver-registry.ts`. Keep tests beside each layer in `__tests__/`, with resolver tests mocking service/workflow interfaces and workflow/service tests using narrow dependency stubs.
