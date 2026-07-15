# Repository Guidelines

## Guidance Sources

Treat [`../CLAUDE.md`](../CLAUDE.md) as the canonical monorepo policy and [`CLAUDE.md`](CLAUDE.md) as the canonical mobile architecture and implementation guide. Read both before changing code. This file is a contributor-oriented index and intentionally does not repeat their detailed theme, loading-state, translation, GraphQL, or roadmap rules. Workflow definitions live in `.claude/commands/`: `/commit` drafts a commit message, `/pm-brainstorm` proposes roadmap work without writing, and `/pm` is the only supported writer for `.pm/`. The repo-level `/ship` workflow is defined in `../.claude/commands/ship.md`.

## Project Structure & Module Organization

Expo Router routes are under `app/`; keep route files thin and mount implementations from `src/screens/<feature>/`. Shared UI belongs in `src/components/`, while hooks, Apollo setup, providers, theme tokens, and utilities live in `src/common/`. Locale files are in `src/translations/`, static files in `src/assets/`, and store metadata in `fastlane/`. Never hand-edit `src/generated-graphql/` or `yarn.lock`.

## Build, Test, and Development Commands

Run commands from `mobile/` with Node 20+ and Yarn 1.22:

- `yarn install` installs package dependencies.
- `yarn start`, `yarn ios`, or `yarn android` starts Expo locally.
- `yarn test` runs the complete lint, type-check, and unit-test gate.
- `yarn test:unit` runs the lightweight test runner alone.
- `yarn format:check` verifies Prettier formatting; `yarn format` fixes it.
- `yarn codegen` regenerates typed GraphQL artifacts after schema changes.

## Coding Style & Testing

Write strict TypeScript and let Prettier and the Expo ESLint configuration determine formatting (two-space indentation). Prefer the `@/` alias for `src/` imports. Use kebab-case file and feature-directory names, `use-*.ts` for hooks, and PascalCase React components. Place tests beside a feature in `__tests__/` or in `src/__tests__/`, named `*.test.ts` or `*.test.tsx`. Test observable behavior and failure paths; UI changes must be checked in both light and dark themes.

## Commits & Pull Requests

History follows Conventional Commits, commonly `feat(mobile): ...`, `fix(mobile): ...`, and `chore(mobile): ...`; keep subjects imperative and focused. PRs should include a concise problem/solution summary, linked issue or `.pm` task when applicable, and commands run. Add before/after screenshots for visual changes, including both themes. Keep unrelated edits separate, request approval before adding dependencies, and never commit credentials or local configuration.
