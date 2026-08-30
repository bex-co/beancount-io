# Beancount Dashboard

React 19 web client built with TanStack Start/Router, Apollo Client, TypeScript, Tailwind CSS, Radix primitives, and Vitest. Code is organized by feature rather than file type.

## Layout

```
dashboard/
├── src/
│   ├── features/          # Product domains
│   │   ├── ai-agent/
│   │   ├── auth/
│   │   ├── bql/
│   │   ├── collaboration/
│   │   ├── git/
│   │   ├── importer/
│   │   ├── journal/
│   │   ├── ledger-data/
│   │   ├── ledger-editor/
│   │   ├── ledger-list/
│   │   ├── oauth/
│   │   ├── plaid/
│   │   ├── receipt/
│   │   ├── reports/
│   │   ├── user-profile/
│   │   └── user-settings/
│   ├── common/            # Shared components, hooks, providers, utilities
│   ├── config/            # Typed app configuration
│   ├── graphql/           # Shared GraphQL definitions
│   ├── i18n/              # i18next setup and locale aggregation
│   ├── routes/            # TanStack file-based routes
│   └── test/              # Shared test setup/mocks
├── public/                 # Static public assets
├── scripts/                # Codebase utilities
└── _infra/                 # Legacy/package-local Compose definition
```

More specific guidance cascades from:

- `src/features/importer/CLAUDE.md`
- `src/features/ledger-data/CLAUDE.md`
- `src/features/reports/CLAUDE.md`

## Organization rules

- New product behavior belongs in `src/features/<feature>/`. Keep pages, components, hooks, GraphQL operations, types, utilities, tests, and translations with the feature that owns them.
- Route files under `src/routes/` should stay thin and import the feature page or loader.
- Cross-feature infrastructure belongs in `src/common/`; do not make one feature import another feature's private component or utility just for convenience.
- Shared Radix-based primitives live in `src/common/components/ui/`. Feature-specific components stay in their feature.
- Use the `@/` alias for `src/` imports. Prefer direct module imports; a barrel is optional and should not create cycles.
- Test files live in adjacent `__tests__/` directories and match the behavior they cover.

A typical feature uses only the folders it needs:

```
features/<name>/
├── pages/
├── components/
├── hooks/
├── lib/ or utils/
├── graphql/
├── types/
├── locales/
└── __tests__/ (or tests adjacent to the owning folder)
```

## Development

Run from `dashboard/`. This package uses Yarn 4.17.0.

```zsh
yarn install --immutable
yarn dev
yarn typecheck
yarn lint
yarn test
yarn build
yarn format:check
yarn codegen
```

- `yarn lint` runs route generation, TypeScript, and ESLint.
- `yarn typecheck` generates routes before `tsc -b`.
- `yarn test` is the non-watch Vitest suite; `yarn test:watch` and `yarn test:coverage` are available locally.
- The handoff/CI gate is `yarn format:check && yarn lint && yarn test && yarn build`.
- `yarn codegen` owns generated GraphQL types. Do not hand-edit generated output.

## Internationalization

The dashboard supports 15 languages: en, bg, ca, de, es, fa, fr, ja, ko, nl, pt, ru, sk, uk, and zh.

- Feature translations live in `src/features/<feature>/locales/`.
- `src/i18n/locales/` aggregates feature locale modules; `src/i18n/config.ts` is the canonical supported-language list.
- Use `useTranslations()` from `@/common/hooks/use-translations`; do not import the i18next singleton into reactive components.
- Add every new key to the English feature locale, then add matching keys to the other locale files. `src/test/translations.test.ts` checks locale shape.
- Keep keys feature-namespaced (for example `auth.login`) and use i18next interpolation syntax.

## Environment variables

Prefer runtime logic or typed configuration in `src/config/`. Add a Vite environment variable only for a value that must vary by build/deployment; all client-prefixed values are public.

Current variables:

| Variable                 | Required | Purpose                                                                                     |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------- |
| `VITE_API_URL`           | Yes      | Public GraphQL/API gateway URL used by the browser.                                         |
| `VITE_SSR_API_URL`       | No       | Internal URL for SSR; falls back to `VITE_API_URL`.                                         |
| `VITE_GA_MEASUREMENT_ID` | No       | Per-environment GA4 stream; unset disables analytics. Non-production builds use debug mode. |

When adding one, update `src/vite-env.d.ts`, the typed config, `.env.example`, `README.md`, and any applicable deployment definitions (`../deploy/docker-mac/` and root `bex.yaml`). Never put a secret in a `VITE_*` variable.

## Growth planning and Search Console

The public adoption roadmap is the repository-root `.pm/` board. Use the root `/pm-brainstorm` workflow to propose work; `/pm` is the only writer.

For Search Console evidence, run `yarn search-console-report --markdown --days 28`. It uses the fixed `https://beancount.io/` property and ranks only dashboard-owned paths: `/ledger`, `/login`, `/sign-up`, `/auth`, `/settings`, `/lgasset`, `/oauth`, and `/awesome-plain-text-accounting`. Rows that differ only by query parameters are grouped under their canonical page (query and hash stripped), with clicks and impressions summed, position impression-weighted, and a variant count. The same host fronts CMS, forum, and API services, so do not treat `/forum/**`, `/api/**`, `/.well-known`, or other CMS content as dashboard opportunities. Confirm route ownership and never put credentials or report user data on the public board.

## Code standards

- Use plain function components, not the `FC` type.
- Keep server-only configuration and calls out of browser bundles. Use the established `*.server.ts`/server-function boundaries.
- Reuse common responsive and accessibility primitives before adding another abstraction.
- Charts use ECharts 6; keep report-specific transformation close to its feature and test transformations independently from rendering.
