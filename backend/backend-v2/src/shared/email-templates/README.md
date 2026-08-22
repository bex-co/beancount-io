# Beancount.io Email Templates

Centralized email template system for all Beancount.io customer communications.

## Structure

```
email-templates/
├── components/          # Reusable email components
│   ├── email-header.ts      # Shared Beancount.io header
│   ├── email-footer.ts      # Shared footer
│   └── email-wrapper.ts     # Full HTML wrapper
├── templates/          # Individual email templates
│   ├── welcome.template.ts
│   └── password-reset.template.ts
└── index.ts           # Exports all templates
```

## Usage

### Import Templates

```typescript
import {
  renderWelcomeHtml,
  renderWelcomeText,
  type WelcomeParams,
} from "@/email-templates";
```

### Render Email

```typescript
const html = renderWelcomeHtml({
  dashboardUrl: "https://beancount.io/ledger/0/income_statement/",
  mobileAppUrl: "http://onelink.to/v3rz2v",
});

const text = renderWelcomeText({
  // same params
});

await sendgrid.sendMail({
  to: user.email,
  subject: "Welcome to Beancount.io!",
  html,
  text,
});
```

## Available Templates

### 1. Welcome Email

**Files**: `welcome.template.ts`
**When**: User registration
**Params**: dashboardUrl, mobileAppUrl
**Exports**: `renderWelcomeHtml()`, `renderWelcomeText()`

### 2. Password Reset

**Files**: `password-reset.template.ts`
**When**: Forgot password request
**Params**: resetLink
**Exports**: `renderPasswordResetHtml()`, `renderPasswordResetText()`

## Template Components

### Email Header

Renders the Beancount.io branded header.

```typescript
import { renderEmailHeader } from "./components/email-header";
const header = renderEmailHeader("Beancount.io");
```

### Email Footer

Renders footer with "Powered by Beancount.io".

```typescript
import { renderEmailFooter } from "./components/email-footer";
const footer = renderEmailFooter();
```

### Email Wrapper

Wraps content with full HTML structure, header, and footer.

```typescript
import { renderEmailWrapper } from "./components/email-wrapper";
const html = renderEmailWrapper({
  title: "Welcome to Beancount.io!",
  productName: "Beancount.io",
  content: "<h2>Thank you!</h2><p>Welcome aboard.</p>",
});
```

## Adding New Templates

### 1. Create Template File

Create `templates/my-new-email.template.ts`:

```typescript
import { renderEmailWrapper } from "../components/email-wrapper";

export interface MyNewEmailParams {
  userName?: string;
  someData: string;
}

export function renderMyNewEmailHtml(params: MyNewEmailParams): string {
  const content = `
    <h2>Hello ${params.userName ?? ""}!</h2>
    <p>${params.someData}</p>
  `;

  return renderEmailWrapper({
    title: "My New Email",
    productName: "Beancount.io",
    content,
  });
}

export function renderMyNewEmailText(params: MyNewEmailParams): string {
  return `
Beancount.io
================

Hello ${params.userName ?? ""}!

${params.someData}

--
Powered by Beancount.io
  `.trim();
}
```

### 2. Export from Index

Add to `index.ts`:

```typescript
export {
  renderMyNewEmailHtml,
  renderMyNewEmailText,
  type MyNewEmailParams,
} from "./templates/my-new-email.template";
```

### 3. Use in Service

```typescript
import { renderMyNewEmailHtml, renderMyNewEmailText } from "@/email-templates";

const html = renderMyNewEmailHtml({ userName: "John", someData: "Hello!" });
const text = renderMyNewEmailText({ userName: "John", someData: "Hello!" });

await sendgrid.sendMail({ to, subject, html, text });
```

## Design Guidelines

### HTML Email Best Practices

- Use inline CSS (external stylesheets don't work)
- Max width: 600px
- Font: System fonts (Arial, Helvetica, sans-serif)
- Mobile responsive: Use `max-width` and `width: 100%`

### Template Variables

- Always use `${value ?? ""}` for optional fields
- Format dates consistently using `toLocaleDateString()`
- Use conditional rendering with `${condition ? html : ""}`

### Text Versions

- Always provide plain text versions
- Keep formatting simple (bullets, headings)
- Include all links from HTML version
- Same information, different presentation

## Benefits

- **Maintainability**: Edit templates in one place
- **Reusability**: Shared components (header, footer)
- **Type Safety**: TypeScript interfaces for all params
- **Testability**: Easy to unit test templates
- **Consistency**: All emails use same branding
