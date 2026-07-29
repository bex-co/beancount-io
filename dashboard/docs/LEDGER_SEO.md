# Ledger Repository Description for SEO

This document explains how the beancount-dashboard automatically uses ledger repository descriptions for SEO meta tags.

## Overview

All ledger pages (e.g., `/ledger/:userId/:repoName/overview`) now automatically use the ledger's custom description field for SEO meta tags if it's set. This provides better search engine optimization and social sharing previews for each ledger.

## How It Works

### Automatic SEO Updates

The `LedgerLayout` component automatically:

1. Fetches the ledger data (including the description field)
2. Determines the appropriate SEO keys based on the current route
3. Updates the page's meta tags with:
   - Custom ledger description (if set) OR default i18n description (fallback)
   - Localized page title
   - Open Graph tags for social sharing
   - Twitter Card tags

### What Gets Updated

The following meta tags are automatically updated:

- `<title>` - Page title with ledger name
- `<meta name="description">` - Custom ledger description or default
- `<meta property="og:title">` - For Facebook/LinkedIn sharing
- `<meta property="og:description">` - For Facebook/LinkedIn sharing
- `<meta name="twitter:title">` - For Twitter sharing
- `<meta name="twitter:description">` - For Twitter sharing

## Setting a Ledger Description

### Via GraphQL Mutation

You can set a ledger's description using the `UpdateLedger` mutation:

```graphql
mutation UpdateLedger($input: UpdateLedgerInput!) {
  updateLedger(input: $input) {
    id
    description
  }
}
```

**Variables:**

```json
{
  "input": {
    "ledgerId": "base64_encoded_owner_and_name",
    "description": "My personal finance ledger tracking expenses and investments"
  }
}
```

### Via API Call

Using the Bearer token for authentication:

```bash
curl -X POST http://localhost:4104/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "mutation UpdateLedger($input: UpdateLedgerInput!) { updateLedger(input: $input) { id description } }",
    "variables": {
      "input": {
        "ledgerId": "dW5faHQ3aGNtM3pxM3liL3Rlc3Q=",
        "description": "My personal finance ledger"
      }
    }
  }'
```

### Description Best Practices

For optimal SEO, ledger descriptions should:

- Be 50-160 characters long
- Clearly describe the ledger's purpose
- Include relevant keywords (e.g., "personal finance", "business accounting")
- Be unique for each ledger
- Avoid special characters that might break HTML

**Good examples:**

- "Personal finance tracking with automated expense categorization and investment portfolio management"
- "Small business accounting ledger for XYZ Corp with monthly P&L reports"
- "Cryptocurrency portfolio tracker with real-time market data integration"

**Bad examples:**

- "My ledger" (too short, not descriptive)
- "This is a very long description that goes on and on explaining every single detail..." (too long)
- "" (empty - will fall back to default)

## Implementation Details

### Components

1. **`LedgerSEO` Component** (`src/common/components/seo/ledger-seo.tsx`)
   - React component that updates meta tags dynamically
   - Accepts: `titleKey`, `descriptionKey`, `ledgerName`, `ledgerDescription`
   - Updates meta tags on mount and when props change

2. **`useLedgerSEOKeys` Hook** (`src/common/hooks/seo/use-ledger-seo-keys.ts`)
   - Determines the appropriate SEO keys based on current route
   - Maps routes to i18n translation keys
   - Returns: `{ titleKey, descriptionKey }`

3. **`getSEOMetadata` Helper** (`src/common/lib/seo/seo-helpers.ts`)
   - Enhanced to support custom descriptions via `options.customDescription`
   - Falls back to i18n translations if no custom description provided
   - Supports parameter interpolation (e.g., `{{ledgerName}}`)

4. **`loadLedgerData` Loader** (`src/common/lib/loaders/ledger-loader.ts`)
   - Shared loader for fetching ledger data
   - Can be used in route loaders for pre-fetching
   - Returns ledger data including description field

### Route-Specific SEO Keys

Each ledger page has its own i18n SEO keys:

| Route               | Title Key                         | Description Key                         |
| ------------------- | --------------------------------- | --------------------------------------- |
| `/overview`         | `seo.ledgerOverview.title`        | `seo.ledgerOverview.description`        |
| `/balance-sheet`    | `seo.ledgerBalanceSheet.title`    | `seo.ledgerBalanceSheet.description`    |
| `/income-statement` | `seo.ledgerIncomeStatement.title` | `seo.ledgerIncomeStatement.description` |
| `/trial-balance`    | `seo.ledgerTrialBalance.title`    | `seo.ledgerTrialBalance.description`    |
| `/journal`          | `seo.ledgerJournal.title`         | `seo.ledgerJournal.description`         |
| `/account/:name`    | `seo.ledgerAccount.title`         | `seo.ledgerAccount.description`         |
| `/query`            | `seo.ledgerQuery.title`           | `seo.ledgerQuery.description`           |
| `/commodities`      | `seo.ledgerCommodities.title`     | `seo.ledgerCommodities.description`     |
| ...                 | ...                               | ...                                     |

See `src/common/hooks/seo/use-ledger-seo-keys.ts` for the complete mapping.

### Internationalization

The system supports **13 languages**:

- English (en)
- Chinese (zh)
- Bulgarian (bg)
- Catalan (ca)
- German (de)
- Spanish (es)
- Persian (fa)
- French (fr)
- Dutch (nl)
- Portuguese (pt)
- Russian (ru)
- Slovak (sk)
- Ukrainian (uk)

Default SEO translations are defined in `src/common/locales/*.ts` files.

## Testing

### Manual Testing

1. **Set a ledger description:**

   ```bash
   # Use GraphQL playground or API call
   mutation {
     updateLedger(input: {
       ledgerId: "dW5faHQ3aGNtM3pxM3liL3Rlc3Q=",
       description: "Test description for SEO"
     }) {
       id
       description
     }
   }
   ```

2. **Visit a ledger page:**

   ```
   http://localhost:5173/ledger/un_ht7hcm3zq3yb/test/overview
   ```

3. **Check the meta tags:**
   - Open browser DevTools
   - Go to Elements tab
   - Inspect `<head>` section
   - Verify `<meta name="description">` contains your custom description

4. **Test social sharing:**
   - Use [Open Graph Debugger](https://www.opengraph.xyz/)
   - Enter your ledger URL
   - Verify description appears in preview

### Automated Testing

```typescript
import { render } from "@testing-library/react";
import { LedgerSEO } from "@/common/components/seo/ledger-seo";

test("updates meta description with custom ledger description", () => {
  render(
    <LedgerSEO
      titleKey="seo.ledgerOverview.title"
      descriptionKey="seo.ledgerOverview.description"
      ledgerName="test"
      ledgerDescription="Custom test description"
    />
  );

  const metaDescription = document.querySelector('meta[name="description"]');
  expect(metaDescription?.getAttribute("content")).toBe("Custom test description");
});
```

## Fallback Behavior

If a ledger doesn't have a custom description set:

1. The system falls back to the default i18n translation
2. The translation is localized based on the user's language
3. The `{{ledgerName}}` parameter is interpolated

**Example fallback:**

```
English: "Financial overview and reports for My Ledger. View net worth, income, expenses, and asset distribution."
Chinese: "My Ledger 的财务概览和报表。查看净资产、收入、支出和资产分布。"
```

## GraphQL Schema

The description field is defined in the backend GraphQL schema:

```graphql
type Ledger {
  id: String!
  name: String!
  description: String # Can be null
  fullName: String!
  # ... other fields
}

input UpdateLedgerInput {
  ledgerId: String!
  description: String # Optional
  # ... other fields
}
```

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│          User visits ledger page            │
│   /ledger/un_ht7hcm3zq3yb/test/overview    │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│           LedgerLayout Component            │
│  • Fetches ledger data via GraphQL         │
│  • Gets current route's SEO keys           │
│  • Renders LedgerSEO component             │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│            LedgerSEO Component              │
│  • Receives: titleKey, descriptionKey,     │
│    ledgerName, ledgerDescription           │
│  • Updates document.title                  │
│  • Updates meta[name="description"]        │
│  • Updates Open Graph meta tags            │
│  • Updates Twitter Card meta tags          │
└─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│         Meta Tags in Document Head          │
│  <title>Overview - test | beancount.io</title>
│  <meta name="description" content="...">   │
│  <meta property="og:title" content="...">  │
│  <meta property="og:description" content="...">
│  <meta name="twitter:title" content="..."> │
│  <meta name="twitter:description" content="...">
└─────────────────────────────────────────────┘
```

## Future Enhancements

Potential improvements for the SEO system:

1. **Auto-generated descriptions**: Use LLM to generate descriptions from ledger content
2. **Description templates**: Provide templates for common ledger types
3. **SEO analytics**: Track click-through rates for different descriptions
4. **Image metadata**: Add ledger-specific Open Graph images
5. **Structured data**: Add JSON-LD for financial data markup

## Troubleshooting

### Description not appearing

1. **Check if description is set:**

   ```graphql
   query GetLedger($ledgerId: String!) {
     getLedger(ledgerId: $ledgerId) {
       description
     }
   }
   ```

2. **Clear browser cache:**
   - Hard reload: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

3. **Check console for errors:**
   - Open DevTools console
   - Look for GraphQL or React errors

### Wrong description showing

1. **Check route mapping:**
   - Verify `useLedgerSEOKeys` hook maps the route correctly
   - Check i18n translation keys in `src/common/locales/en.ts`

2. **Check fallback logic:**
   - If `ledgerDescription` is null/empty, it falls back to i18n

### Meta tags not updating

1. **Verify component is mounted:**
   - Check React DevTools
   - Ensure `LedgerSEO` component is in the tree

2. **Check `useEffect` dependencies:**
   - Component updates when props change
   - Verify props are actually changing

## References

- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Google SEO Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide)
- [TanStack Router Documentation](https://tanstack.com/router/latest)
