# Translation System Documentation

This document describes the translation (i18n) system for the Beancount Dashboard.

## Overview

The dashboard uses **react-i18next** for internationalization with a hybrid approach that combines:

- Simple translation strings for runtime performance
- Separate metadata files with descriptions for professional translators
- Export utilities to generate translator-friendly formats

## Supported Languages

Currently supporting 13 languages:

- English (en)
- Chinese (zh)
- Spanish (es)
- French (fr)
- German (de)
- Portuguese (pt)
- Russian (ru)
- Dutch (nl)
- Bulgarian (bg)
- Catalan (ca)
- Persian/Farsi (fa)
- Slovak (sk)
- Ukrainian (uk)

## File Structure

```
src/
├── locales/
│   ├── en.ts              # English translations (simple key-value)
│   ├── zh.ts              # Chinese translations
│   ├── ...                # Other language files
│   └── metadata/
│       └── en.metadata.ts # English metadata (descriptions + context)
├── lib/
│   └── i18n.ts           # i18next configuration
└── hooks/
    └── use-translations.ts # Type-safe translation hook

scripts/
└── export-translations.ts  # Export utility for translation platforms

translations-export/        # Generated files (gitignored)
├── en.json                # JSON format for translation platforms
└── en.csv                 # CSV format for spreadsheet tools
```

## Translation File Format

### English Translation File (`src/locales/en.ts`)

Structured format with messages and descriptions for translators:

```typescript
export interface TranslationEntry {
  message: string;
  description: string;
}

const en: Record<string, TranslationEntry> = {
  home: {
    message: "Home",
    description: "Navigation label for home page",
  },
  save: {
    message: "Save",
    description: "Button label to save changes",
  },
  // ...
};

export default en;
```

### Other Language Files (`src/locales/zh.ts`, etc.)

All language files use the same structured format with message and description. Descriptions are taken from English for consistency:

```typescript
import type { TranslationEntry } from "./en";

const zh: Record<string, TranslationEntry> = {
  home: {
    message: "首页",
    description: "Navigation label for home page",
  },
  save: {
    message: "保存",
    description: "Button label to save changes",
  },
  // ...
};

export default zh;
```

i18next automatically falls back to English for any missing translation keys.

## Usage in Components

### Basic Usage

```typescript
import { useTranslations } from "@/hooks/use-translations";

function MyComponent() {
  const { t } = useTranslations();

  return (
    <div>
      <h1>{t("home")}</h1>
      <button>{t("save")}</button>
    </div>
  );
}
```

### With Dynamic Language Change

```typescript
import { useTranslations } from "@/hooks/use-translations";

function LanguageSelector() {
  const { i18n } = useTranslations();

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      <option value="en">English</option>
      <option value="zh">中文</option>
    </select>
  );
}
```

### Form Validation with Translations

```typescript
import { useTranslations } from "@/hooks/use-translations";
import { useMemo } from "react";
import { z } from "zod";

function LoginForm() {
  const { t } = useTranslations();

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, t("emailRequired")).email(t("emailInvalid")),
        password: z
          .string()
          .min(1, t("passwordRequired"))
          .min(6, t("passwordMinLength")),
      }),
    [t],
  );

  // Use schema with react-hook-form...
}
```

## Adding New Translations

### Step 1: Add to English translation file

Add to `src/locales/en.ts` with message and description:

```typescript
const en: Record<string, TranslationEntry> = {
  // ... existing keys
  myNewKey: {
    message: "My New Text",
    description:
      "Detailed description for translators (e.g., 'Button label to submit form')",
  },
};
```

### Step 2: Use in component

```typescript
function MyComponent() {
  const { t } = useTranslations();
  return <div>{t("myNewKey")}</div>;
}
```

The `useTranslations` hook automatically extracts the `message` property, so `t("myNewKey")` returns `"My New Text"`.

### Step 3: Add to other languages

Add translations to `zh.ts`, `es.ts`, etc. with the same structured format:

```typescript
const zh: Record<string, TranslationEntry> = {
  // ... existing keys
  myNewKey: {
    message: "我的新文本",
    description:
      "Detailed description for translators (e.g., 'Button label to submit form')",
  },
};
```

Note: Descriptions should match the English version for consistency.

## Managing Translation Progress

### Check Translation Status

```bash
yarn i18n:prepare
```

This script:

1. Reads all keys from `en.ts`
2. Checks each language file for missing translations
3. Adds new keys with `[TODO]` markers for untranslated entries
4. Preserves existing translations
5. Shows completion percentage for each language

Example output:

```
📊 Translation Progress:

  Locale | Completed | Total | Progress
  -------|-----------|-------|----------
  ✅ zh   |       215 |   219 | ████████████████████ 98%
  📝 es   |       110 |   219 | ██████████░░░░░░░░░░ 50%
  📝 fr   |       110 |   219 | ██████████░░░░░░░░░░ 50%
```

### Finding Untranslated Keys

Search for `[TODO]` markers to find keys that need translation:

```bash
grep -r '\[TODO\]' src/locales/
```

Or in a specific language:

```bash
grep '\[TODO\]' src/locales/zh.ts
```

## Best Practices

### Writing Good Descriptions

**Good:**

```typescript
{
  description: "Button to submit the registration form on the registration page";
}
```

**Bad:**

```typescript
{
  description: "Submit button"; // Too vague, doesn't explain context or usage
}
```

### Placeholder Variables

For messages with variables, document them clearly:

```typescript
deleteLedgerConfirm: {
  message: "Are you sure you want to delete \"{name}\"?",
  description: "Confirmation message for ledger deletion. {name} is replaced with the ledger name."
}
```

### Description Guidelines

Include in the description:

- **What it is**: "Button", "Form label", "Error message", "Page title"
- **Where it appears**: "Main navigation", "Settings page", "Modal dialog"
- **What it does**: "Submit button", "Cancel action", "Delete confirmation"

Example:

```typescript
{
  description: "Button to cancel the account deletion dialog";
}
```

## Language Switching Behavior

### Auto-detection Priority

1. `localStorage` (user's previous selection)
2. Browser language preference
3. HTML lang tag
4. Fallback to English

### Syncing with Backend

On login, the app syncs language preference:

- Backend user profile has `locale` field
- First-time users: backend locale applies
- Returning users: localStorage preference takes precedence
- Changes persist to both localStorage and backend

## TypeScript Support

All translations are fully typed:

```typescript
// ✅ Type-safe - autocomplete works
t("home");

// ❌ Type error - key doesn't exist
t("nonExistentKey");
```

The types are automatically inferred from the `en.ts` file.

## Testing Translations

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';

test('displays translated text', () => {
  render(<MyComponent />);
  expect(screen.getByText('Home')).toBeInTheDocument();
});
```

### Language Switching Tests

```typescript
test('changes language', () => {
  const { i18n } = renderWithI18n(<LanguageSelector />);

  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'zh' }
  });

  expect(i18n.language).toBe('zh');
});
```

## Common Issues & Solutions

### Issue: Translations not updating after language change

**Cause**: Component not subscribing to i18n changes

**Solution**: Ensure you're using `useTranslations()` hook, not directly accessing `i18n.t()`

```typescript
// ❌ Won't update
const title = i18n.t("home");

// ✅ Updates reactively
const { t } = useTranslations();
const title = t("home");
```

### Issue: Export script fails with missing metadata

**Cause**: New translations added without metadata

**Solution**: Add metadata entries to `en.metadata.ts` for all new keys

### Issue: Types not updating after adding new keys

**Cause**: TypeScript not re-compiling

**Solution**: Restart TypeScript server or run `yarn typecheck`

## Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [Lokalise Platform](https://lokalise.com/)
- [Phrase Platform](https://phrase.com/)
- [Crowdin Platform](https://crowdin.com/)

## Contributing

When adding translations:

1. ✅ Add to `en.ts` first
2. ✅ Add metadata to `en.metadata.ts`
3. ✅ Add to other language files (`zh.ts`, etc.)
4. ✅ Run `yarn export-translations` to validate
5. ✅ Test language switching in UI
6. ✅ Commit all changes together
