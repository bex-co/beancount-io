# Beancount Dashboard - Code Organization Guide

This document provides guidance for working with the Beancount Dashboard codebase.

## Architecture Overview

Beancount Dashboard uses a **feature-based architecture** where code is organized by domain/feature rather than by file type. This improves maintainability, scalability, and enables better code-splitting.

## Directory Structure

```
src/
├── features/              # Feature-based modules (16 features)
│   ├── ai-agent/         # AI assistant interface
│   ├── auth/             # Authentication & identity
│   ├── bql/              # BQL query interface
│   ├── collaboration/    # Collaborator management
│   ├── git/              # Git commits & pull requests
│   ├── importer/         # Transaction importer
│   ├── journal/          # Transaction journal
│   ├── ledger-data/      # Data views (9 sub-features)
│   │   ├── accounts/
│   │   ├── budget/
│   │   ├── commodities/
│   │   ├── documents/
│   │   ├── errors/
│   │   ├── events/
│   │   ├── holdings/
│   │   ├── settings/
│   │   └── statistics/
│   ├── ledger-editor/    # File browser & Monaco editor
│   ├── ledger-list/      # Ledger discovery & creation
│   ├── oauth/            # OAuth consent flow
│   ├── plaid/            # Plaid bank integration
│   ├── receipt/          # Receipt upload & review
│   ├── reports/          # Financial reports (5 sub-features)
│   │   ├── account/
│   │   ├── balance-sheet/
│   │   ├── income-statement/
│   │   ├── overview/
│   │   └── trial-balance/
│   ├── user-profile/     # User profile management
│   └── user-settings/    # User preferences & settings
│
├── common/               # Shared infrastructure
│   ├── apollo/           # Apollo client setup
│   ├── components/       # Shared UI components
│   │   ├── ui/          # 32 Radix UI components
│   │   └── [shared components]
│   ├── env/              # Environment utilities
│   ├── hooks/            # Shared hooks (flat structure)
│   ├── lib/              # Organized by domain
│   │   ├── auth/        # Authentication & tokens
│   │   ├── chart/       # Chart utilities
│   │   ├── detect-language/
│   │   ├── diff/        # Diff utilities
│   │   ├── editor/      # Monaco editor
│   │   ├── format/      # Formatting utilities
│   │   ├── ledger-search-params/
│   │   ├── seo/
│   │   ├── subscription/
│   │   └── utils/       # General utilities
│   ├── providers/        # React context providers
│   ├── root-route/       # Root route setup
│   ├── server-fn/        # Server functions
│   ├── types/            # Shared TypeScript types
│   └── locales/          # Shared translations (13 languages)
│
├── routes/               # File-based routes (TanStack Router)
├── locales/              # i18n aggregation layer
│   └── index.ts          # Merges all feature locales with namespaces
├── assets/               # Static assets
├── config/               # App configuration
├── test/                 # Test utilities
└── graphql/              # GraphQL definitions
```

## Standard Feature Structure

Each feature follows a consistent pattern:

```
features/[feature-name]/
├── pages/              # Page components (lightweight wrappers)
├── components/         # Feature-specific components
├── hooks/              # Feature-specific hooks
├── lib/                # Feature-specific utilities
├── graphql/            # GraphQL operations
├── types/              # Feature-specific types
├── locales/            # Feature-specific translations (13 languages)
└── index.ts            # Barrel export (optional)
```

## Code Organization Rules

### When Adding New Code

1. **New Features**: Create in `src/features/[feature-name]/`, NOT in `src/pages/`
   - Follow the standard feature structure
   - Keep features self-contained with clear boundaries

2. **Shared Infrastructure**: Add to `src/common/`
   - Providers: Cross-cutting concerns (theme, context, etc.)
   - Hooks: Organized by domain (ui/, data/, i18n/)
   - Lib: Organized by domain (api/, auth/, chart/, etc.)
   - Types: Shared TypeScript types

3. **Shared Components**: Add to `src/common/components/`
   - UI components: Use `src/common/components/ui/` for Radix components
   - Feature-specific components: Keep in `features/[feature-name]/components/`
   - Truly shared components: Use `src/common/components/`

4. **Route Files**: Add to `src/routes/`
   - TanStack Router uses file-based routing
   - Import pages from `@/features/[feature-name]/pages/`

### Import Patterns

```typescript
// Feature pages
import LoginPage from "@/features/auth/pages/login-page";
import JournalPage from "@/features/journal/pages/journal-page";

// Common infrastructure
import { useIsMobile } from "@/common/hooks/use-mobile";
import { getClient } from "@/common/apollo/client";
import { useTheme } from "@/common/hooks/use-theme";

// Shared components
import { Button } from "@/common/components/ui/button";
import { LedgerSwitcher } from "@/common/components/ledger-layout/ledger-switcher";
```

## Growth planning and Search Console

The public roadmap is maintained in the parent repository's .pm board. Use the canonical
$pm-brainstorm workflow at ../.claude/commands/pm-brainstorm.md before proposing dashboard
milestones; it is a text-only discovery step, while $pm materializes the board.

For Search Console evidence, run yarn search-console-report --markdown --days 28. This dashboard
utility uses the fixed https://beancount.io/ property and ranks only dashboard-owned paths:
/ledger, /login, /sign-up, /auth, /settings, /lgasset, and /oauth. Rows that differ only by
query params (e.g. `?lang=uk` / `?lang=ca` variants of the same account page) are aggregated
under their canonical page (query stripped, hash stripped) with summed clicks/impressions,
impression-weighted position, and a Variants count, so the opportunities table ranks real pages
instead of crawl variants. The public host also fronts the CMS, forum, and API services, so
/forum/**, /api/**, /.well-known, and CMS content paths must not be treated as dashboard
opportunities. Confirm route ownership before proposing work and never put credentials or report
user data on the public .pm board.

## Development Commands

```bash
# Development
yarn dev                # Start Vite dev server
yarn build              # Build for production
yarn preview            # Preview production build
yarn lint               # ESLint + TypeScript check
yarn format             # Prettier formatting
yarn typecheck          # TypeScript compilation check
yarn kill               # Kill process on port 5173

# GraphQL
yarn codegen            # Generate GraphQL types from schema

# Testing
yarn test               # Run tests with Vitest
yarn test:watch         # Run tests in watch mode
yarn test:coverage      # Run tests with coverage
```

## Environment Variables Best Practices

**CRITICAL: Avoid Adding Environment Variables Unless Absolutely Necessary**

When working on the Dashboard, **strongly prefer** using configuration files in `src/config/` over environment variables. Environment variables should be the last resort, especially for a frontend application.

### When to Avoid Environment Variables

**DO NOT add environment variables for:**

- Feature flags (use config files with feature toggles)
- UI configuration (themes, layouts, etc.)
- Settings that rarely change
- Developer convenience features
- Values that can be derived at runtime

### When Environment Variables Are Acceptable

**ONLY add environment variables when:**

- Backend API URLs that differ between environments (VITE_API_URL)
- Build-time configuration that affects bundling
- Public API keys that differ by environment

### Required Steps When Adding Environment Variables

If you determine an environment variable is truly necessary:

1. Document it in `beancount-dashboard/README.md`
2. Add it to `beancount-dashboard/.env.example`
3. Add it to `backend-cluster/_infra/.env.example` if used in Docker
4. Update `backend-cluster/_infra/docker-compose.yml` to pass the variable to the dashboard service
5. Update this CLAUDE.md file
6. Prefix with `VITE_` for client-side access (Vite requirement)
7. Provide a sensible default or graceful handling when unset
8. Justify why it cannot be handled through config files or runtime detection

### Currently Defined Environment Variables

| Variable                 | Required | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`           | Yes      | Public API Gateway URL used by the browser (CSR).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `VITE_SSR_API_URL`       | No       | Internal API URL for the SSR server (defaults to `VITE_API_URL`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `VITE_GA_MEASUREMENT_ID` | No       | GA4 Measurement ID for this environment's data stream. Falls under the "public API keys that differ by environment" exception: it must point to a **separate stream per environment** (dev/staging vs. production) so non-prod traffic never pollutes production analytics, which a static config file cannot express. Surfaced through `src/config/config.ts` (`config.gaMeasurementId` / `analyticsEnabled` / `gaDebugMode`). When unset, analytics is disabled and no GA script loads. Non-production builds (`!import.meta.env.PROD`) send events with GA4 `debug_mode` for DebugView validation. |

## Testing

Place test files in `__tests__` directories adjacent to the code they test:

- Location: `src/features/[feature]/[area]/__tests__/[ComponentName].test.tsx`
- Naming: match the file being tested (`utils.ts` → `utils.test.ts`)

## Internationalization (i18n)

Translations use a **feature-based architecture** with namespace prefixing:

- **13 Languages Supported**: en, bg, ca, de, es, fa, fr, nl, pt, ru, sk, uk, zh
- **Feature-Based Locales**: Each feature has its own `locales/` directory
- **Namespace Structure**: Keys are prefixed by feature (e.g., `auth.login`, `journal.addTransaction`)
- **Aggregation Layer**: `src/locales/index.ts` merges all feature locales
- **Shared Translations**: Common keys in `src/common/locales/`

**Usage:**

```typescript
import { useTranslations } from "@/common/hooks/i18n/use-translations";

const { t } = useTranslations();
t("auth.login"); // Feature-specific key
t("common.save"); // Shared key
```

**Adding New Translations:**

1. Add keys to feature's `locales/en.ts` (and other languages)
2. Use namespaced key: `t('featureName.keyName')`
3. Aggregation layer automatically merges all features

## Code Standards

- React 19+ patterns: no `FC` type, use plain function components
- Feature-based architecture: new code belongs in `src/features/`, shared code in `src/common/`
