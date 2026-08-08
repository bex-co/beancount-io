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

| Command                             | What it does                                                |
| ----------------------------------- | ----------------------------------------------------------- |
| `yarn start`                        | Expo dev server (`--tunnel`)                                |
| `yarn ios` / `yarn android`         | Start in simulator/emulator                                 |
| `yarn ios:device`                   | Build and install on a connected iOS device                 |
| `yarn lint`                         | `tsc --noEmit` + ESLint with autofix                        |
| `yarn typecheck`                    | `tsc --noEmit` only                                         |
| `yarn test:unit`                    | Custom Jest-lite runner in `scripts/`                       |
| `yarn test`                         | lint + typecheck + unit tests (CI uses this)                |
| `yarn codegen`                      | Regenerate `src/generated-graphql/` from the GraphQL schema |
| `yarn format` / `yarn format:check` | Prettier                                                    |
| `yarn bump`                         | Bump app version (`package.json` + `app.json`)              |

## Conventions

### Theme — always use tokens

Theme tokens come from `src/common/theme/`; the provider lives in `src/common/providers/theme-provider/`. Never hard-code colors.

```ts
import { useTheme } from "@/common/theme";
const theme = useTheme().colorTheme;
// theme.white, theme.black, theme.text01, …
```

Test new screens in light **and** dark, and set background colors on loading states — missing those caused dark-mode flicker on the account picker screen.

### Loading states — skeleton preloaders, not spinners

Content areas that wait on a query render a skeleton built from `LoadingTile`
(`@/components/loading-tile`), not an `ActivityIndicator` or a blank view:

- The skeleton mirrors the loaded layout: same container, paddings, and dividers.
  Give real text fixed `lineHeight`s and size each tile + its vertical margins to
  fill that same line box, so the view doesn't shift a pixel when data lands
  (see `ListItemSkeleton` in `src/screens/multi-postings-transaction/list-item.tsx`,
  the account-picker loading state, and the suggestions card in
  `src/components/text-input-screen/`).
- Vary tile widths across rows (a const array of widths) so the skeleton reads
  as content, not stripes.
- Skeletons are for first loads only; pull-to-refresh keeps current content
  visible under the `RefreshControl` spinner (`refreshing` must track only the
  user's pull, not query loading).
- Verify skeletons in light **and** dark. `LoadingTile` resolves the effective
  theme via `useTheme()` — never compare `themeVar` to `"dark"` directly, it can
  hold `"system"`.

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

## App Store metadata (`metadata/`)

Store listing copy is managed as canonical JSON under `metadata/`, applied with the
`asc` CLI (App Store Connect). **`fastlane/` is dead** — nothing reads it, EAS Submit
only uploads the binary via `ascAppId`. Treat `metadata/` as the single source of truth.

```
metadata/
  app-info/<locale>.json          name, subtitle, privacyPolicyUrl
  version/<version>/<locale>.json description, keywords, promotionalText,
                                  supportUrl, marketingUrl, whatsNew
  screenshots/<locale>/<displayType>/NN-name.png
```

Screenshots are **not** handled by `asc metadata`; they upload separately (see below).
Filename order is display order, and Apple surfaces the first three in search results.

Locales: `en-US`, `zh-Hans`. Apple's limits — name 30, subtitle 30, keywords 100,
promotional text 170, description 4000 — are counted in **code points**, so CJK
characters cost 1 each.

| Command                                                                            | What it does                        |
| ---------------------------------------------------------------------------------- | ----------------------------------- |
| `asc metadata validate --dir ./metadata`                                           | Offline lint; run before every push |
| `asc metadata pull --app 1527950512 --version <v> --dir ./metadata`                | Overwrite local files from live ASC |
| `asc metadata plan --app 1527950512 --version <v> --dir ./metadata --output table` | Dry-run diff vs. live               |
| `asc metadata approve` → `asc metadata push`                                       | Apply the approved plan             |

Only **promotional text** is editable while a version is live. `name`, `subtitle`,
`keywords`, `description`, `marketingUrl`, `supportUrl`, and the age-rating
declaration all require a version in `PREPARE_FOR_SUBMISSION`, so they ship with a
release. Cut the release first (`yarn bump`), then copy
`metadata/version/<old>/` to the new version directory and push.

Keywords must not repeat words already in the app name or subtitle — Apple indexes
those separately — and drop the spaces after commas; they count against the 100.

`.asc/` (plan artifacts, and credentials if anyone runs `asc auth login --local`)
is gitignored at the repo root. Keep it that way; this repo is public.

### Screenshots

Apple currently accepts only two display types — everything else is derived from them:

| Display type            | Dimensions             | Source                                      |
| ----------------------- | ---------------------- | ------------------------------------------- |
| `APP_IPHONE_65`         | 1284×2778 or 1242×2688 | `docs/marketing-showcase/webp/` (1206×2622) |
| `APP_IPAD_PRO_3GEN_129` | 2048×2732 or 2064×2752 | needs an iPad capture run                   |

No current simulator renders 1284×2778 natively, so resizing is unavoidable regardless of
capture device. Two scripts own this; the generated PNGs are gitignored, so rebuild rather
than expecting them in a fresh clone:

```zsh
./scripts/build-screenshots.sh        # webp -> 1284x2778 PNG, alpha stripped, ordered
SET_ID=<set> DIR=metadata/screenshots/en-US/APP_IPHONE_65 \
  node scripts/upload-screenshots.js  # reserve -> PUT -> commit -> pin order
```

Strip alpha — Apple rejects screenshots with a transparency channel. Uploads only work
against a version in `PREPARE_FOR_SUBMISSION`; a live version returns _"An attribute value
is not acceptable for the current resource state"_. Locales with no screenshot set inherit
the primary locale's, so zh-Hans needs none.

iPad (`APP_IPAD_PRO_3GEN_129`) still carries 2020 captures. `app.json` sets
`supportsTablet: true`, so iPad visitors see them. Refreshing needs an iPad simulator run
with a signed-in account.

## Roadmap board (`.pm/`)

File-based product roadmap, managed only through two slash commands:

- `/pm-brainstorm <topic>` — proposes milestones/tasks as text (writes nothing).
- `/pm <subcommand>` — the only writer: materializes workstreams/milestones/tasks, marks done, prints status.

Conventions live canonically in `.claude/commands/pm.md`. Product pillars are in `.pm/GOAL.md`; anti-goals in `.pm/DO_NOT_DO.md`. Don't edit `.pm/` by hand outside `/pm`.

## CI / Deploy

- CI (`.github/workflows/ci.yml`) runs `yarn lint`, `yarn typecheck`, `yarn test:unit` on push/PR to `main`.
- Release (`.github/workflows/deploy.yml`, workflow name `Release (mobile)`) runs on every `mobile/**` push to `main`: it verifies checks, sends an OTA update, and — if `package.json`'s version has no `mobile-v<version>` git tag yet — runs the EAS build/submit, then pushes the tag and a GitHub Release. Use `yarn bump` to cut a release; a failed release retries automatically on the next push because the tag is only created after success.

## Repo

- Origin: `stargately/beancount-mobile`, now part of the `bex-co/beancount-io` monorepo.
- License: MIT.
