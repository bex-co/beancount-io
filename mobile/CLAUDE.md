# Beancount Mobile (CE)

React Native iOS/Android app for [Beancount.io](https://beancount.io/), built with Expo (see root `CLAUDE.md` for repo-wide rules).

## Tech stack

- **Framework**: React Native 0.86 + Expo 57 + React 19
- **Routing**: Expo Router (file-based, in `app/`)
- **Data**: Apollo Client 3.14 + GraphQL Code Generator
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
  metadata/             Canonical App Store listing JSON and generated screenshots
  scripts/              Build helpers (e.g. jest-lite-runner.js)
```

## Common commands

Run all from inside `mobile/`.

| Command                             | What it does                                                |
| ----------------------------------- | ----------------------------------------------------------- |
| `yarn start`                        | Expo dev server (`--tunnel`)                                |
| `yarn ios` / `yarn android`         | Build and run the native app in simulator/emulator          |
| `yarn ios:device`                   | Build and install on a connected iOS device                 |
| `yarn lint`                         | `tsc --noEmit` + ESLint with autofix                        |
| `yarn typecheck`                    | `tsc --noEmit` only                                         |
| `yarn test:unit`                    | Custom Jest-lite runner in `scripts/`                       |
| `yarn test`                         | Aggregate lint + typecheck + unit-test gate                 |
| `yarn codegen`                      | Regenerate `src/generated-graphql/` from the GraphQL schema |
| `yarn format` / `yarn format:check` | Prettier                                                    |
| `yarn bump`                         | Bump app version (`package.json` + `app.json`)              |

## Verifying in the iOS simulator

UI changes can be driven and screenshotted headlessly — reach for this rather than
asking someone to check by hand. Everything below is plain CLI, so it works the same
for any agent.

**The dev server writes to production.** `.env.local` points `EXPO_PUBLIC_SERVER_URL`
at `https://beancount.io/` and the dev build is signed in, so **any save, edit, delete
or file write commits to a real ledger**. Read-only verification needs no permission;
**ask the user before writing**, and when they agree, delete what you created through
the app afterwards so the ledger is left as found.

```zsh
UDID=$(xcrun simctl list devices booted -j | python3 -c 'import json,sys;print(next(d["udid"] for v in json.load(sys.stdin)["devices"].values() for d in v))')
xcrun simctl launch $UDID io.beancount.ios          # the dev build; `expo start --ios` opens Expo Go instead
xcrun simctl openurl $UDID "beancount:///(app)/<route>?param=value"   # params reach useLocalSearchParams
xcrun simctl io $UDID screenshot shot.png           # 1206x2622 on iPhone 17 Pro (3x)
xcrun simctl ui $UDID appearance dark|light         # verify both themes
xcrun simctl spawn $UDID defaults write com.apple.Accessibility ReduceMotionEnabled -int 1
```

**Tapping** uses `expo-mcp` (a devDependency — no MCP session auth needed). Start Metro
with plain `npx expo start`, then spawn
`node node_modules/expo-mcp/bin/expo-mcp.mjs --dev-server-url http://localhost:8081 --root <mobile>`
and speak JSON-RPC over stdin: `initialize` → `notifications/initialized` →
`tools/call`. Tools: `automation_tap` (`{projectRoot, platform:"ios", x, y}` or
`testID`), `automation_take_screenshot`, `automation_find_view`, `collect_app_logs`,
`expo_router_sitemap`. Coordinates are
**logical points** (402x874 on iPhone 17 Pro) — divide screenshot pixels by 3. Each tap
is a real XCUITest event, so it drives native controls that synthetic events can't.

Do **not** set `EXPO_UNSTABLE_MCP_SERVER=1` (2026-08-19): it makes `expo start` dial the
remote MCP tunnel, which times out and kills the dev server — the same `mcp.expo.dev`
breakage that makes the hosted server unusable. The local binary above talks to a plain
dev server and needs no flag. There is **no text-entry tool**, so a flow that requires
typing has to be reached another way (a `testID` tap, or a deep-link parameter that
prefills the field).

Notes that keep costing time when forgotten:

- **Haptics cannot be verified here** — a simulator has no Taptic Engine. Cover the
  intent→call mapping with unit tests and hand the feel check to the user.
- **Analytics cannot be verified here** — `analytics.track` returns early under
  `__DEV__` (`src/common/analytics.ts`), so a dev build emits nothing. Prove
  single-fire structurally (a ref guard) instead.
- **A missing native permission at runtime means a stale dev build**, not a code bug:
  the installed binary predates an `app.json` change. Rebuild the dev client
  (`SENTRY_DISABLE_AUTO_UPLOAD=true npx expo run:ios`) or work around the screen.
- **"Is this pre-existing?"** — stash the working tree (`git stash push -u -- src app`),
  screenshot, then pop. Metro hot-reloads both ways in seconds.
- To catch a sub-second overlay, fire screenshots back-to-back with no sleep (~2/s) and
  diff by file size to find the frames that changed.

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
  store-locales.json               runtime/store mapping and bg/fa fallback
  screenshots.json                 locale/device/story/caption manifest
  app-info/<locale>.json          name, subtitle, privacyPolicyUrl
  version-template/<locale>.json  stable copy; whatsNew is always blanked
  version/<version>/<locale>.json description, keywords, promotionalText,
                                  supportUrl, marketingUrl, whatsNew
  screenshots/<locale>/<displayType>/NN-name.png
```

Screenshots are **not** handled by `asc metadata`; they upload separately (see below).
Filename order is display order, and Apple surfaces the first three in search results.

Store localizations: `en-US`, `zh-Hans`, `ca`, `de-DE`, `es-ES`, `es-MX`,
`fr-FR`, `fr-CA`, `nl-NL`, `pt-BR`, `pt-PT`, `ru`, `sk`, and `uk`. The app also
ships Bulgarian and Persian, but Apple offers no matching metadata locales; both
explicitly inherit primary `en-US` rather than being falsely mapped. Apple's
limits — name 30, subtitle 30, keywords 100, promotional text 170, description
4000 — are counted in **code points**, so CJK characters cost 1 each.

| Command                                                                             | What it does                                              |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `yarn metadata:validate`                                                            | Project checks plus upstream ASC lint                     |
| `asc metadata pull --app 1527950512 --version <v> --dir ./tmp/asc-baseline --force` | Read-only baseline into ignored state                     |
| `./scripts/app-store-release.sh plan <v>`                                           | Metadata plans plus visual screenshot review              |
| `./scripts/app-store-release.sh approve <v> <v>`                                    | Record reviewed local approvals                           |
| `./scripts/app-store-release.sh apply-metadata <v> <v>`                             | Confirmed metadata apply; creates remote locale resources |
| `./scripts/app-store-release.sh plan-screenshots <v>`                               | Read-only replacement/order plan for every screenshot set |
| `./scripts/app-store-release.sh apply-screenshots <v> <v>`                          | Confirmed screenshot apply after final plan review        |

Only **promotional text** is editable while a version is live. `name`, `subtitle`,
`keywords`, `description`, `marketingUrl`, `supportUrl`, and the age-rating
declaration all require a version in `PREPARE_FOR_SUBMISSION`, so they ship with a
release. Run `yarn bump` locally first; it scaffolds every canonical locale from
`metadata/version-template/` with blank `whatsNew` fields. Fill every localized
release note and stage the listing before the bump reaches `main` and triggers
EAS auto-submit.

Keywords must not repeat words already in the app name or subtitle — Apple indexes
those separately — and drop the spaces after commas; they count against the 100.

`.asc/` (plan artifacts, and credentials if anyone runs `asc auth login --local`)
is gitignored at the repo root. Keep it that way; this repo is public.

### Screenshots

Apple currently accepts only two display types — everything else is derived from them:

| Display type            | Generated size | Source                                                |
| ----------------------- | -------------- | ----------------------------------------------------- |
| `APP_IPHONE_65`         | 1284×2778      | deterministic public demo captures                    |
| `APP_IPAD_PRO_3GEN_129` | 2064×2752      | deterministic public demo captures on a tablet canvas |

The generated PNGs are gitignored, so rebuild rather than expecting them in a
fresh clone:

```zsh
yarn screenshots:build
yarn screenshots:validate
./scripts/app-store-release.sh plan <version>
```

The build produces 84 opaque assets: 14 locales × two device types × the three
ordered stories in `metadata/screenshots.json`. Uploads only work against
`PREPARE_FOR_SUBMISSION`; all planning, review, replacement, and ordering use
upstream `asc screenshots` commands. See `docs/app-store-localization.md` for the
complete pre-auto-submit choreography.

## Roadmap board (`.pm/`)

File-based product roadmap, managed only through two slash commands:

- `/pm-brainstorm <topic>` — proposes milestones/tasks as text (writes nothing).
- `/pm <subcommand>` — the only writer: materializes workstreams/milestones/tasks, marks done, prints status.

Conventions live canonically in `.claude/commands/pm.md`. Product pillars are in `.pm/GOAL.md`; anti-goals in `.pm/DO_NOT_DO.md`. Don't edit `.pm/` by hand outside `/pm`.

## CI / Deploy

- CI (`../.github/workflows/ci.yml`) runs `yarn format:check`, `yarn lint`, `yarn typecheck`, and `yarn test:unit` on push/PR to `main`.
- Release (`../.github/workflows/deploy.yml`, workflow name `Release (mobile)`) runs on every `mobile/**` push to `main` and verifies checks, but deploys only if `package.json`'s version has no `mobile-v<version>` git tag yet. A new version must also carry `metadata/releases/<version>.json`, written by the ASC parity check and bound to the exact listing inputs; a missing or stale receipt blocks EAS before auto-submit. On success it sends the OTA update and runs the EAS build/submit, then pushes the tag and a GitHub Release. A push without a version bump deploys nothing — use `yarn bump` to cut a release; a failed release retries automatically on the next push because the tag is only created after success.

## Repo

- Origin: `stargately/beancount-mobile`, now part of the `bex-co/beancount-io` monorepo.
- License: MIT.
