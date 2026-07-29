# Importer Feature

## Purpose

CSV/file import wizard — multi-step workflow to import transactions into a ledger.

## Step Flow

```
upload → preview → configure → importing → finish
```

## State Management

`hooks/use-import-workflow.ts` manages step transitions and parse results via `useState`.

## Component Hierarchy

- **`import-workflow-container.tsx`** — Orchestrates steps
- **`components/steps/upload/`** — File upload, parsing progress, error display
- **`components/steps/preview/`** — Editable table with inline cell editing (`editable-cell.tsx`, `editable-preview-row.tsx`)
- **`components/steps/configure/`** — Account mapping table, transaction config form
- **`components/steps/importing/`** — Progress indicator during submission
- **`components/steps/finish/`** — Success/summary view

## Parser Hooks

- **`use-csv-parser.ts`** — Basic CSV parsing
- **`use-llm-parser.ts`** — LLM-assisted parsing for non-standard formats
- **`use-multi-stage-parser.ts`** — Orchestrates CSV → LLM fallback

## Key Utils

- **`file-format-detector.ts`** — Detect CSV/OFX/QIF formats
- **`csv-validator.ts`** — Validate parsed CSV data
- **`row-edit-schema.ts`** — Zod validation for editable rows
- **`is-premium-required.ts`** — Tier gating for import limits

## Premium Gating

`is-premium-required.ts` checks feature-usage limits before allowing import. See `features/subscription/` for tier definitions.

## Locales

13 language files in `locales/` — follow existing key structure when adding new strings.
