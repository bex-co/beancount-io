# w1 · m4 — Connect the mobile app to a self-hosted server

**Worker:** worker1 **Goal:** a signed-out mobile user can select, verify, and persist a compatible Beancount.io server before signing in **Status:** done

## Tasks (in order)

| id   | title                                                        | est | depends_on |
| ---- | ------------------------------------------------------------ | --- | ---------- |
| t001 | Add a persisted, validated runtime server URL                | 45m | —          | — **DONE** |
| t002 | Route GraphQL, REST, login, and sign-up through that server | 45m | t001       | — **DONE** |
| t003 | Add the welcome-screen server settings form                  | 1h  | t001, t002 | — **DONE** |
| t004 | Add connection testing and safe URL error states             | 45m | t002, t003 | — **DONE** |
| t005 | Isolate credentials and cached data when the server changes  | 40m | t002, t003 | — **DONE** |
| t006 | Adoption surface                                             | 20m | t004, t005 | — **DONE** |
| t007 | Simplify                                                     | 20m | t006       | — **DONE** |
| t008 | Test coverage                                                | 45m | t006       | — **DONE** |
| t009 | Closeout                                                     | 15m | t008       | — **DONE** |

## Definition of done

- From the signed-out welcome screen, a user can open a top-right server settings control, enter the base URL of a compatible Beancount.io deployment, optionally test it, save it, and restore the official `https://beancount.io/` default.
- A valid selection is normalized and persists across a cold app launch; invalid URLs receive an actionable inline error. Release builds require HTTPS, while any development-only cleartext exception is limited to localhost and documented.
- Sign-in, sign-up, GraphQL, and app-authored REST requests all use the selected server without requiring a custom mobile build. The existing build-time environment value remains the default/fallback for development and branded builds.
- Changing the server can never send one server's bearer credential to another server or render persisted Apollo data from another server. The setting is available only in the unauthenticated flow for this milestone.
- Connection testing is advisory rather than required for saving, has a bounded timeout, and verifies the expected unauthenticated Beancount.io API contract without recording or transmitting the custom hostname to analytics.
- The official beancount.io path remains unchanged, the form is accessible and translated from the English base locale, and the welcome/settings experience is verified in light and dark themes.
- Mobile formatting, lint, typecheck, and unit tests pass.

## Source + Goal linkage

- **Source:** `/pm` invocation on 2026-08-22, following a product discussion about making the mobile `serverUrl` configurable from a settings icon on the initial unauthenticated screen.
- **Goal linkage:** A2 — Frictionless onboarding. One distributed app binary can connect a newcomer to the hosted service or a compatible self-hosted deployment without rebuilding Expo configuration. It also supports A3 by making the open-source/self-hosted promise visible in the product rather than only in source code.
- **Expected outcome:** a self-hoster can install the standard mobile app, point it at their deployment, and complete the existing login flow; hosted users continue with the preselected official server and no added mandatory step.
- **Why now:** the mobile app already has a build-time `EXPO_PUBLIC_SERVER_URL`, and its request/auth helpers derive paths from a common base URL. Runtime selection is therefore a bounded client milestone that removes a material adoption barrier while the monorepo's self-hosting story is becoming public.
- **Adoption surface:** included because this changes first-run user behavior and the self-hosting contract. The task checks the mobile and root documentation plus shared agent-instruction symlinks for accurate discovery and setup guidance.
