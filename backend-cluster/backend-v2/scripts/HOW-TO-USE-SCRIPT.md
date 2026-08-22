# Script Usage Guide

Standalone maintenance and codegen scripts live in this directory. Run them with
`ts-node`/`tsx` and `tsconfig-paths` so the `@/` path aliases resolve, e.g.:

```bash
npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/<script>.ts
```

## Available Scripts

- `collect-directive-counts.ts` — collect Beancount directive counts across ledgers.
- `decrypt-plaid-token.ts` — decrypt a stored Plaid access token for debugging.
- `generate-agent-tool-types.ts` — generate TypeScript types for agent tools.
- `generate-openapi-spec.ts` — export the backend-v2 REST admin OpenAPI spec.
- `make-user-premium.ts` — grant a user premium tier.
- `nanoid-base58.ts` — generate base58 nanoid values.

> **Note:** The MongoDB backup/upgrade scripts documented here previously have been
> removed. The backend now runs on PostgreSQL (Drizzle ORM) + Redis.
