# Beancount.io Email Templates

Centralized HTML and plain-text templates for Beancount.io transactional email.

## Available templates

| Template       | Trigger              | Parameters                                                    | Renderers                                            |
| -------------- | -------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| Welcome        | Account registration | `firstName?`, `dashboardUrl`, `mobileAppUrl`, `helpCenterUrl` | `renderWelcomeHtml`, `renderWelcomeText`             |
| Signup OTP     | Email verification   | `otp`                                                         | `renderSignupOtpHtml`, `renderSignupOtpText`         |
| Password reset | Password recovery    | `resetLink`                                                   | `renderPasswordResetHtml`, `renderPasswordResetText` |

All public renderers and parameter types are exported from `index.ts`.

## Theme contract

`components/email-theme.ts` is the single source for shared email colors and styles. Its sRGB values intentionally map the dashboard roles in `dashboard/src/style.css` to formats that conservative email clients understand:

| Email role           | Dashboard role                    | Light inline fallback            | Supported dark mode           |
| -------------------- | --------------------------------- | -------------------------------- | ----------------------------- |
| Canvas               | `--background`                    | soft neutral `#f8f8f6`           | green-charcoal `#171b17`      |
| Card                 | `--card`                          | white `#ffffff`                  | `#202520`                     |
| Foreground           | `--foreground`                    | `#292d28`                        | `#ecece8`                     |
| Muted surface/text   | `--muted`, `--muted-foreground`   | `#f6f6f3` / `#60665d`            | `#323732` / `#a9ada2`         |
| Border               | `--border`                        | `#e4e4e1`                        | `#3b423b`                     |
| Primary, link, focus | `--primary`, `--ring`             | accessible brand green `#2b7e00` | literal brand green `#5fc535` |
| Primary foreground   | `--primary-foreground`            | white `#ffffff`                  | dark green `#1b3017`          |
| Callout              | `--accent`, `--accent-foreground` | `#f1f3ed` / `#333a32`            | `#333b33` / `#e3e5df`         |

The light primary/foreground pair is 5.1:1, the dark pair is 6.4:1, and body/muted pairs exceed WCAG AA. Keep the dashboard's intentional distinction between the darker light-mode brand and vivid dark-mode brand; `#5fc535` does not have enough contrast for text or a white-label button on white.

Every important visual role has an inline light-mode fallback. `EMAIL_THEME_CSS` adds responsive rules, `prefers-color-scheme: dark`, dark-mode metadata, and Outlook's `[data-ogsc]` enhancement. Clients that remove `<style>` blocks still receive a branded, legible, actionable light email. Dark mode is progressive: clients may ignore the query, automatically invert some colors, or apply their own rendering rules, so exact cross-client color parity is not promised.

## Usage

```typescript
import { renderWelcomeHtml, renderWelcomeText } from "@/shared/email-templates";

const params = {
  dashboardUrl: "https://dashboard.beancount.io",
  mobileAppUrl: "https://beancount.io/mobile",
  helpCenterUrl: "https://beancount.io/docs",
};

await sendgrid.sendMail({
  to: user.email,
  subject: "Welcome to Beancount.io!",
  html: renderWelcomeHtml(params),
  text: renderWelcomeText(params),
});
```

## Preview and client checks

From `backend-cluster/backend-v2/`, generate the committed preview with:

```zsh
yarn ts-node src/shared/email-templates/__tests__/generate-preview.ts
open src/shared/email-templates/__tests__/all-templates.html
```

The deterministic preview contains public fixtures for all three templates at 640px desktop and 375px mobile widths. During review:

1. Inspect every desktop and mobile frame with the browser preference set to light, then dark.
2. Confirm headings, links, actions, codes, callouts, and footer remain readable and no frame scrolls horizontally.
3. Disable each email document's embedded `<style>` block in developer tools. Confirm the inline light fallback remains usable, including CTA and long reset URL.
4. Regenerate the file and check that a second run produces no diff.

Browser rendering validates the intended responsive and progressive behavior, not pixel parity in every historical email client.

## Shared components

- `email-theme.ts` defines named colors, inline style roles, responsive behavior, and supported-client dark mode.
- `email-wrapper.ts` provides the document metadata, canvas, centered 600px card, content padding, and component order.
- `email-header.ts` renders escaped product branding.
- `email-footer.ts` renders the shared transactional footer and preserves its extension parameters.

## Adding a template

1. Create `templates/<name>.template.ts` with HTML and plain-text renderers plus a typed parameter interface.
2. Compose HTML through `renderEmailWrapper()` and the named `EMAIL_STYLES` roles. Add a semantic class handled by `EMAIL_THEME_CSS` when a role needs dark-mode styling. Do not duplicate arbitrary color values in a template.
3. Validate all URL parameters with `validateEmailUrl()` before placing them in markup. Escape untrusted text with `escapeHtml()` and never interpolate user-provided HTML.
4. Keep the plain-text version informationally equivalent, including every required URL, code, expiry, and security instruction.
5. Export both renderers and the parameter type from `index.ts`.
6. Add focused tests for required content, URL rejection, escaping, inline fallback roles, narrow content, and plain-text parity.
7. Add a public fixture to `buildTemplatePreviews()`, regenerate `all-templates.html`, and complete the client checks above.

Email markup deliberately uses tables for the outer shell and actions, inline styles for compatibility, a maximum width of 600px, and system fonts. Prefer explicit output over abstractions that hide client-critical markup.
