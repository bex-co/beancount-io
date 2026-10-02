# Agent Box — Sandbox Control Plane

Cloudflare Worker (`claude-code-sandbox` in `wrangler.jsonc`) that exposes `@cloudflare/sandbox` primitives over HTTP for backend-v2's sandbox agent harness (`backend-v2/src/features/ai-agent/workflow/sandbox-agent-workflow.ts`). It runs no agent loop, classification, i18n, or PR logic of its own.

## Layout

- `src/index.ts` — Hono + chanfana app. `proxyToSandbox` handles exposed-port preview URLs (the harness bridge's WebSocket) before normal routing; `/healthz` is unauthenticated; `/openapi.json` is the spec.
- `src/features/control-plane/` — `/control/sandbox/:name/*` routes (`ensure`, `exec`, `spawn`, `process/:processId/{logs,status,kill}`, `write`, `read`, `expose`, `unexpose`, `exposed`, `stop`, `destroy`), handlers, and Zod schemas. Every route requires the `x-admin-token` header matching `ADMIN_TOKEN`.
- `src/types.ts` — `Env` bindings; `src/utils.ts` — admin-token check; `src/utils/` — credential redaction.
- Tests sit beside the code (`src/features/control-plane/__tests__/`, `src/utils/*.test.ts`).

## Environment

- `ADMIN_TOKEN` — shared secret with backend-v2. Locally, `deploy/dev-sandbox/up.sh` writes it into the gitignored `.dev.vars`.
- `Sandbox` — Durable Object binding (configured in `wrangler.jsonc`, container image from `Dockerfile`).
- `LOCAL_KEEP_ALIVE` — local development only: keeps the container alive across a whole harness turn under `wrangler dev`. Never set it in production.

## Commands

Run from `backend-cluster/agent-box/`:

```bash
yarn install
yarn dev                 # wrangler dev
yarn typecheck
yarn lint:check          # ESLint + Knip dead-code detection
yarn lint:deadcode:fix   # apply Knip removals; review the diff
yarn test
yarn codegen             # regenerate the OpenAPI document
yarn deploy              # wrangler deploy
```

There is no GitHub Actions workflow for this package; run `typecheck`, `lint:check`, and `test` before handing off.
