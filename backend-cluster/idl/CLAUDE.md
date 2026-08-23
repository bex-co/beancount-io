# IDL — Interface Definition Layer

OpenAPI contracts plus small generated TypeScript CLI clients for Beancount.io services.

## Structure

```
idl/
├── beancount-ledger.openapi.json   # Ledger service (exported from the retired Python service; served today by beancount-ledger-v2)
├── backend-v2.openapi.json         # Backend-v2 REST admin API (Node.js)
├── gitea.swagger.v1.json           # Gitea git service (upstream Swagger)
├── claude-code-sandbox.openapi.json # External sandbox contract (spec only)
├── beancount-ledger-cli/           # CLI for ledger service
├── backend-v2-admin-cli/           # CLI for backend-v2 admin endpoints
└── gitea-cli/                      # CLI for Gitea admin API
```

## CLI Clients

Each CLI sub-package follows the same pattern:

- **Codegen**: `codegen.sh` → `openapi-typescript` → `src/generated/api.ts`
- **Client wrapper**: `src/client.ts` — typed `openapi-fetch` wrapper
- **Entry point**: `src/index.ts` — `commander` CLI, outputs JSON via `console.log`
- **Auth**: token passed via `--token` or env var; env file loaded from `.env.{prod|dev}`

### Common commands (run inside each CLI package)

```bash
yarn codegen       # Regenerate types from OpenAPI spec
yarn dev           # Run CLI (tsx src/index.ts)
yarn typecheck     # TypeScript check
```

There is no package or lockfile at `idl/` itself. Run installs and scripts from the affected CLI sub-package.

### Environment selection

Pass `--env dev` (or set `LEDGER_ENV` / `BV2_ENV` / `GITEA_ENV`) to load `.env.dev`.
Default is `prod` → loads `.env.prod`.

Copy `.env.example` to `.env.prod` and `.env.dev` and fill in credentials.

## Updating specs

1. Export or obtain the updated OpenAPI JSON from the authoritative service.
2. Replace the corresponding `.openapi.json` / `.swagger.json` file.
3. Run `yarn codegen` in any affected CLI package to regenerate types.
4. Run `yarn typecheck` to verify nothing broke.

## Conventions

- All CLI commands print JSON to stdout (`JSON.stringify(data, null, 2)`).
- Keep destructive commands (delete, purge) explicit in their command name and help text; callers are responsible for confirmation before invoking them.
- New commands go in `src/index.ts`; client helpers go in `src/client.ts`.
- Treat every `src/generated/api.ts` as generated output. Change the source spec and run `yarn codegen`; never patch generated types directly.
