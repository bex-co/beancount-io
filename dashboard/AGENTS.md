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

- `src/features/importer/AGENTS.md`
- `src/features/ledger-data/AGENTS.md`
- `src/features/reports/AGENTS.md`

Commit history file links use `#diff-file-<encoded-path>` fragments. The shared
`common/components/diff-viewer` honors those after the diff is ready — including
virtualized lists via `scrollToRow` and the explicit Load Large Diff gate — so
reopened URLs and Files → Version History selections land on the requested file.

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
yarn lint:deadcode
yarn lint:deadcode:fix
yarn test
yarn build
yarn format:check
yarn codegen
```

- `yarn lint` runs route generation, TypeScript, ESLint, and Knip dead-code detection.
- `yarn lint:deadcode:fix` removes unused files, exports, and exported types; review its diff before keeping the changes.
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
- `yarn i18n:prepare` adds the keys code uses to English, syncs every language's catalog in place (missing keys as `[TODO]`, each language's own plural forms kept), and reports `[TODO]`, half-translated and copied-whole messages; on a synced tree it changes no file. `yarn i18n:check` lists what it would change plus every `[TODO]`, writing nothing, and fails `yarn lint` (and CI) when there is any. See `docs/TRANSLATIONS.md`.
- Translate the message in every locale; never paste the English text into another catalog. `src/test/locale-stray-english.test.ts` fails on a whole English copy (two or more English words left after brand, format and notation terms). A message that is genuinely identical in that language goes into its `IDENTICAL_BY_DESIGN` list with the reason.
- Keep keys feature-namespaced (for example `auth.login`) and use i18next interpolation syntax.
- Counts are plural messages, not `Label: {count}` workarounds. Write one form per category the language uses (`{ one, other }` in English; `{ one, few, many, other }` in Russian, Ukrainian and Slovak; `{ other }` only in Chinese, Japanese and Korean), and call `t(key, { count })`. `src/i18n/plural.ts` expands the forms into i18next's `_one`/`_few`/… keys, and `src/i18n/__tests__/plural.test.ts` fails when a language's forms differ from `Intl.PluralRules`.

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

For Search Console evidence, run `yarn search-console-report --markdown --days 28`. It uses the fixed `https://beancount.io/` property and ranks only dashboard-owned paths: `/ledger`, `/login`, `/sign-up`, `/auth`, `/settings`, `/lgasset`, and `/oauth`. Rows that differ only by query parameters are grouped under their canonical page (query and hash stripped), with clicks and impressions summed, position impression-weighted, and a variant count. The same host fronts CMS, forum, and API services, so do not treat `/forum/**`, `/api/**`, `/.well-known`, or CMS content as dashboard opportunities. Confirm route ownership and never put credentials or report user data on the public board.

## Code standards

- Use plain function components, not the `FC` type.
- Keep server-only configuration and calls out of browser bundles. Use the established `*.server.ts`/server-function boundaries.
- Reuse common responsive and accessibility primitives before adding another abstraction.
- Charts use ECharts 6; keep report-specific transformation close to its feature and test transformations independently from rendering.
- Format ledger amounts with `useFormatNumber()(value, currency, fractionDigitsOf(source))`. ISO currencies keep their minor units. Any other commodity keeps the digits its source decimal carried, so 4.00995 ETH never reads as 4.01. Read the digits from the API string, not from a computed double.
- A cache clear (any write, or **Out of date → Refresh**) refetches every query with the old result still in `data`, and keeps it there if the refetch fails. Never swap an already shown page or editor for a loading or error view on `loading && data` or `error && data`: that unmounts unsaved drafts and focus. `LedgerLayout` and `LedgerFileView` keep what they show and report a failure with `useRefreshFailedToast`. A dirty file draft keeps its edit-base SHA (`common/components/ledger-layout/__tests__/refresh-keeps-drafts.test.tsx`).
- A form or dialog that writes holds one save at a time. Start it through `usePendingSubmit` (react-hook-form) or `usePendingAction` (`common/hooks/`): a second Enter or click sends nothing, and the control that started a failed save gets focus back. While `pending`, lock the fields (a disabled `<fieldset>`, `readOnly` on a text input that starts the save so it keeps focus, or Monaco's `readOnly` option) and pass `busy={pending}` to `DialogContent`, which holds Escape, outside clicks and the close button, so a late completion closes only the draft it was sent from. A failed write keeps that draft mounted with its error beside the submit control; never swap it for a context-free error view (w4/m33, w4/m47, w4/m48, w4/m49, w4/977).
- A failed read offers Try Again on its own query, in place. `QueryView` does it given `onRetry={refetch}`. A page that renders `ReportErrorState` itself passes `error` and `refetch` to `useQueryRetry` and renders the error view on `failure` before any loading branch: Apollo clears `error` while it refetches, and the hook keeps the error view with a busy Try Again mounted until the retry settles, then returns focus to it if the retry fails. A retry never reloads the document, resets the reader's selections or touches sibling sections (w4/m50).
- Ledger dates are canonical `yyyy-MM-dd` strings, never local `Date` instants. `DatePicker` takes and emits that string, forms validate it with `z.iso.date()` and send it unchanged, and defaults use `todayIsoDate()`. `date-picker-utils.ts` parses, formats and drives the calendar through a UTC-backed date, so a day the browser zone skipped (Pacific/Apia, 2011-12-30) stays enterable.

## Deploy skew and error details

Every deploy replaces the hashed files under `/lgassets/`, so a page opened before the deploy can ask for a chunk that no longer exists.

- `src/server.ts` wraps the default server entry with `applyCacheHeaders` (`src/common/lib/http/cache-headers.ts`): a 404 under `/lgassets/` is `no-store`, and HTML without its own policy is `no-cache`. A cached 404 survives a normal reload, because reloads reuse fresh subresources; never let one be stored. Existing hashed assets are served as static files before this entry and stay `immutable`.
- A chunk-load failure (`isChunkLoadError` in `src/common/lib/errors/chunk-load-error.ts`) is fixed by a full reload, not a retry: the router keeps the failed import. The root component reloads once per minute on `vite:preloadError`, and the `ErrorBoundary` fallback swaps "Try Again" for "Reload page".
- Error fallbacks show `ErrorDetails` (`src/common/components/error-details.tsx`) in production: a collapsed, copyable report of the error, URL, time, browser, and truncated stacks, so a customer can send it to support. Headline copy stays localized, and the report must never include cookies, tokens, or request variables.

## Dashboard home (`/ledger`)

`src/features/ledger-list/pages/dashboard-page/` composes two sections, each backed by one `source` of the `getFeed` operation:

- **What's new** (`components/whats-new.tsx`, `source: "CHANGELOG"`): the localized changelog RSS, newest first. Rows are Beancount-style lines (`YYYY-MM-DD`, `!` unread / `*` read, title). The block is expanded with an accent edge while anything is unread, one collapsed line once everything is read, and absent when the request fails or is empty. It renders **every release the hook counts** — capping the rows below the count once left "N updates" on screen with no unread row left to open. Read state is keyed on a locale-independent release identity, because item ids and links carry the locale that fetched them and a language switch would otherwise make an opened release unread again. The unread watermark lives in `src/common/hooks/use-changelog-watermark.ts` and is **per device, in local storage only**: a reading position is not a fact the server acts on, so it does not earn a column on the identity table or a public mutation. A 30-day cutoff covers a first visit and is **recorded once** rather than recomputed against the current clock, so an unread release cannot quietly age out of the window. The watermark advances only on an explicit action — "Mark all as read" or opening the last unread row. Neither visiting a page nor the passage of time marks a release as seen. Both feed queries use `cache-and-network`, so returning to the dashboard revalidates instead of replaying a cache that predates the newest release or the user's own last commit. Titles and links arrive already translated from the CMS; only chrome strings are dashboard translations (`common.whatsNew*`).
- **Activity** (`components/activity-feed.tsx`, `source: "LEDGER_RSS"`): the user's own ledger commits with "Show More" paging.

Two deliberate absences. The blog is **not** on the dashboard: it publishes roughly twenty posts a day and none of them carry a `beancount` tag, so it is search inventory rather than something a signed-in customer needs, and no amount of collapsing earned it the space. There is also no header entry point on ledger pages: an icon-only control with an unread dot was built and judged not worth the header space.

## Shell accessibility

The ledger shell (`src/common/components/ledger-layout/`) and the `/ledger` dashboard shell (`src/features/ledger-list/pages/dashboard-page/components/dashboard-layout.tsx`) share the same accessibility structure:

- Each primary sidebar composes `SidebarNavigation` (a labelled `<nav>` landmark). Do **not** put the landmark inside the shared `sidebar.tsx` primitive — only navigation regions should expose one.
- Both shells render `SkipToContentLink` as the first focusable element and give `<main id="main-content" tabIndex={-1}>` so keyboard users can skip past the sidebar. Reuse `src/common/components/skip-to-content.tsx` and `src/common/lib/main-content.ts` for any future sidebar shell.

Entry Context (`features/journal/components/entry-context-dialog.tsx`) restores focus to the originating journal/overview control on dismiss via `restoreFocusOnDialogClose`, with a caller fallback when the opener is removed after a successful edit. Source-file navigation skips that restore so focus is not pulled back to the list.
