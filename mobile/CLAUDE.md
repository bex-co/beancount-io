# Beancount Mobile (CE)

React Native iOS/Android app for [Beancount.io](https://beancount.io/), built with Expo. Currently the only active package in the monorepo (see root `CLAUDE.md` for repo-wide rules).

## Tech stack

- **Framework**: React Native 0.81 + Expo 54
- **Routing**: Expo Router (file-based, in `app/`)
- **Data**: Apollo Client 3.13 + GraphQL Code Generator
- **State**: Apollo reactive variables (no Redux/Zustand)
- **Forms**: React Hook Form + Zod
- **Styling**: StyleSheet + custom theme system (light / dark / system)
- **i18n**: `i18n-js` with 13 locales (en, zh, bg, ca, de, es, fa, fr, nl, pt, ru, sk, uk)
- **Errors**: Sentry (`@sentry/react-native`)
- **Analytics**: Custom Mixpanel wrapper (`expo-mixpanel-analytics`)
- **TypeScript**: strict (`noImplicitAny`, `strictNullChecks`, `noUnusedLocals`, …); path alias `@/*` → `src/*`

## Layout

```
mobile/
  app/                  Expo Router routes (file-based)
    (app)/              Authenticated tab group
    auth/               Auth flow
    _layout.tsx         Root layout (providers)
    +not-found.tsx
  src/
    common/             Shared utilities, hooks, theme, providers, vars
      apollo/           Apollo client setup
      hooks/            Reusable hooks (use-translations, use-session, …)
      providers/        Theme provider, etc.
      theme/            Theme tokens + system detection
      vars/             Reactive vars (themeVar, localeVar, …)
    components/         Reusable UI (button, list, picker, tabs, …)
    screens/            Screen components mounted from app/ routes
    translations/       i18n locale files (en is the base; others extend)
    generated-graphql/  Apollo codegen output — do not hand-edit
    __tests__/          Unit tests (run by yarn test:unit)
  fastlane/             iOS App Store metadata
  scripts/              Build helpers (e.g. jest-lite-runner.js)
```

## Common commands

Run all from inside `mobile/`.

| Command | What it does |
|---------|--------------|
| `yarn start` | Expo dev server (`--tunnel`) |
| `yarn ios` / `yarn android` | Start in simulator/emulator |
| `yarn ios:device` | Build and install on a connected iOS device |
| `yarn lint` | `tsc --noEmit` + ESLint with autofix |
| `yarn typecheck` | `tsc --noEmit` only |
| `yarn test:unit` | Custom Jest-lite runner in `scripts/` |
| `yarn test` | lint + typecheck + unit tests (CI uses this) |
| `yarn codegen` | Regenerate `src/generated-graphql/` from the GraphQL schema |
| `yarn format` / `yarn format:check` | Prettier |
| `yarn bump` | Bump app version (`package.json` + `app.json`) |

## Conventions

### Theme — always use tokens

Theme tokens come from `src/common/theme/`; the provider lives in `src/common/providers/theme-provider/`. Never hard-code colors.

```ts
import { useTheme } from "@/common/theme";
const theme = useTheme().colorTheme;
// theme.white, theme.black, theme.text01, …
```

Test new screens in light **and** dark, and set background colors on loading states — missing those caused dark-mode flicker on the account picker screen.

### Translations — `useTranslations()`, not `i18n.t()` directly

`i18n.t("key")` does not re-render when the locale changes. The hook subscribes to `localeVar`:

```ts
import { useTranslations } from "@/common/hooks/use-translations";
const { t } = useTranslations();
// t("key")
```

When adding a string, add the key to the English file under `src/translations/` (the base). Other locales extend and override as needed.

### Reactive variables for global state

```ts
import { useReactiveVar } from "@apollo/client";
import { themeVar } from "@/common/vars";
const currentTheme = useReactiveVar(themeVar);
```

### Generated GraphQL

`src/generated-graphql/` is produced by `yarn codegen` (config in `codegen.ts`, `apollo.config.json`) and ignored by ESLint. Re-run codegen after schema changes; never hand-edit.

### Screens

Screens live in `src/screens/<name>/` and are mounted from a route file under `app/`. Use `SafeAreaView` for spacing and add analytics tracking on mount where applicable.

## Configuration files

- `app.json` — Expo config; **app version lives here** (and in `package.json`).
- `eas.json` — EAS Build/Submit profiles.
- `apollo.config.json`, `codegen.ts` — GraphQL codegen.
- `babel.config.js`, `tsconfig.json`, `eslint.config.js` — standard.

## Roadmap board (`.pm/`)

File-based product roadmap, managed only through two slash commands:

- `/pm-brainstorm <topic>` — proposes milestones/tasks as text (writes nothing).
- `/pm <subcommand>` — the only writer: materializes workstreams/milestones/tasks, marks done, prints status.

Conventions live canonically in `.claude/commands/pm.md`. Product pillars are in `.pm/GOAL.md`; anti-goals in `.pm/DO_NOT_DO.md`. Don't edit `.pm/` by hand outside `/pm`.

## CI / Deploy

- CI (`.github/workflows/ci.yml`) runs `yarn lint`, `yarn typecheck`, `yarn test:unit` on push/PR to `main`.
- Deploy (`.github/workflows/deploy.yml`) triggers EAS build/submit when `mobile/package.json`'s `version` changes on `main`. Use `yarn bump` to bump.

## Repo
- Origin: `stargately/beancount-mobile`, now part of the `bex-co/beancount-io` monorepo.
- License: MIT.
