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
- **`csv-validator.ts`** — Validate parsed CSV data; `detectHeaderRow` reports
  the recognized column order so reordered exports map by name, and a
  recognized-but-unmappable header fails the whole file instead of guessing
- **`format-import-date.ts`** — Locale display for canonical `YYYY-MM-DD` dates
- **`row-edit-schema.ts`** — Zod validation for editable rows
- **`is-premium-required.ts`** — Tier gating for import limits

- Dates stay the canonical `YYYY-MM-DD` string from upload through preview,
  configure, and submit. `parseDate` validates Gregorian arithmetic instead of
  round-tripping a civil `Date`, so zones that skip a local day (Pacific/Apia,
  2011-12-30) cannot reject a valid ledger date; display builds the instant with
  `Date.UTC` and reads it back with `timeZone: "UTC"`.
- Keep original amount tokens and revalidate every field after an edit so
  unrelated payee changes cannot clear date/amount errors. Configuration only
  accepts rows that still pass `parseDate` / `parseAmount`; it never invents
  today's date or a numeric zero for invalid input.

## Premium Gating

`is-premium-required.ts` classifies GraphQL error codes/messages so the upload step can show the upgrade state. Shared tier display configuration lives under `common/lib/subscription/`.

## Locales

15 language files in `locales/` — follow the English key structure for every supported locale.
