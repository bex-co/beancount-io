# w1 · m9 — Email templates match the dashboard theme and visual language

**Worker:** worker1 **Goal:** Deliver accessible transactional emails whose light and dark presentation, typography, spacing, and controls feel consistent with the Beancount.io dashboard. **Status:** done

## Tasks (in order)

| id   | title                                                    | est | depends_on |            |
| ---- | -------------------------------------------------------- | --- | ---------- | ---------- |
| t001 | Define the email-safe dashboard theme contract           | 30m | —          | — **DONE** |
| t002 | Restyle the shared email shell and components            | 45m | t001       | — **DONE** |
| t003 | Apply the shared visual language to every email template | 45m | t002       | — **DONE** |
| t004 | Refresh previews and validate real email-client behavior | 45m | t003       | — **DONE** |
| t005 | Verify the adoption surface and template documentation   | 30m | t004       | — **DONE** |
| t006 | Simplify the email-theme implementation                  | 30m | t005       | — **DONE** |
| t007 | Add meaningful theme and template test coverage          | 45m | t006       | — **DONE** |
| t008 | Close out the milestone                                  | 15m | t007       | — **DONE** |

## Definition of done

The welcome, signup-OTP, and password-reset HTML emails render through one documented, email-safe theme derived from `dashboard/src/style.css`; their default light presentation and supported-client dark presentation use the dashboard's green brand, neutral surfaces, type hierarchy, spacing, radii, and accessible foreground/CTA pairings. Shared header, content, callout, action, and footer treatment is consistent across templates; inline fallbacks remain usable in clients that strip embedded CSS; narrow layouts do not overflow; plain-text alternatives and URL/XSS protections are unchanged; the generated preview includes every template; and focused backend-v2 tests, lint, typecheck, and build pass.

## Source + Goal linkage

- **Source:** Direct `/pm` request to polish email and email-template themes and styles so they are consistent with the dashboard (2026-08-29).
- **Goal linkage:** **A2 — Frictionless onboarding.** Signup verification, welcome, and account recovery are onboarding and return paths; matching the dashboard reduces visual discontinuity and makes those messages easier to recognize and act on.
- **Expected outcome:** New and returning users receive coherent, accessible Beancount.io emails whose calls to action and account guidance remain clear across common light, dark, desktop, and mobile email-client conditions.
- **Why now:** The dashboard has an established accessible green light/dark theme, while the shared email system still carries an older blue palette and inconsistent component styling. Consolidating the email treatment now prevents that drift from spreading as more templates are added. The Adoption surface task is included because these templates are customer-facing and the template README is a developer-facing extension point.

## Closeout evidence

- The named sRGB email theme maps every shared dashboard role, and automated contrast checks cover light/dark foreground, muted, callout, link, and action pairs.
- The deterministic committed preview includes welcome, signup OTP, and password reset at 640px and 375px. Chromium rendering verified all six frames in both color preferences, four long-content/OTP edge cases, and the CSS-stripped inline fallback without horizontal overflow.
- Focused Jest tests pass with 169 tests. `yarn lint`, `yarn typecheck`, and `yarn build` pass from `backend-cluster/backend-v2/`.
- `/simplify` completed reuse, quality, and efficiency reviews; shared preview tokens and escaping were consolidated and theme CSS is precomputed.
- The owning README documents the full inventory, theme contract, extension workflow, preview command, and client limitations. Root/package descriptions remain accurate, and `python3 scripts/check-agent-guidance.py` verifies all guidance and shared-skill links.
