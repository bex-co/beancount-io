# Native authentication GET before hydration

Production beancount.io, signed out, English/light, owned isolated headless Chromium 149.0.7827.55. Observed 2026-09-18. Local HEAD 26d54a9d; fetched origin/main bd5d1d31; served entry main-BIr0jJni.js, exact deployment SHA unknown.

## Reproduction and safety

1. In a fresh context, hold the real `/lgassets/main-*.js` entry request and navigate to `/auth/login?lang=en`. Wait for the server-rendered form.
2. Put the context offline before entering anything. Also install an interceptor that aborts attempted form navigation before transmission.
3. Fill email and password with synthetic, non-credential fixtures, then click Sign In. Wait for the intercepted navigation event.
4. Repeat from a fresh context at 390×844 and 1440×1000. Both construct GET `/auth/login` with query keys `email,password`; the synthetic password is present in the query.
5. Repeat the controlled offline procedure on `/auth/sign-up?lang=en` at 390×844, filling email, username, password and confirmation. Native validity is true; GET query keys are `firstName,lastName,email,username,password,confirmPassword`, with the synthetic password in the query.

Expected: no password can be serialized into a URL while handlers are unavailable. Actual: both SSR forms are enabled and have native method `get` (method omitted), with no client submit handler yet. All attempted navigations were aborted while offline. No real credentials, account creation, email, authentication mutation, server log, referrer leak or actual server receipt was exercised or claimed. This is controlled script-delay reproduction, not a measurement of occurrence frequency. The first signup observation was taken too early and returned an empty event list; a fresh repeat waited for the navigation event and confirmed the result.

## Root and fix boundary

`dashboard/src/features/auth/components/login-form/index.tsx:66` and `register-form/index.tsx:99` attach only React `onSubmit={handleSubmit(onSubmit)}` and omit a non-GET native method/readiness guard. Installed react-hook-form 7.71 `dist/index.esm.mjs:2164` prevents default inside the client event handler; it cannot protect server-rendered controls before hydration. Existing healthy hydrated field validation was exercised under w4/m15 without auth mutations.

Prevent native credential serialization before handlers are ready, preserve existing GraphQL submission and keyboard/validation semantics, and provide a safe loading/failure state. A method change alone avoids GET serialization but does not make an unsupported POST endpoint a functioning auth fallback. Do not create another backend authentication stack or patch react-hook-form. Coordinate w4/137 (signup default overwrites early input), which is independently reproduced and is not automatically closed by this issue.

Blast radius: both components are shared by ordinary auth pages and `features/oauth/pages/{consent,mobile-consent,identity-consent}.tsx`. Those consent routes were source-audited, not live authenticated. Forgot-password, OTP and reset-password also have onSubmit-only forms in source; do not claim those as live password leaks without reproducing their route state. Explicitly audit them during implementation and avoid widening claims from syntax alone.

## Dedupe and limits

Searched all board queues including done/blocked for native forms, password URLs/query strings and pre-hydration submission; targeted auth history and fetched-main source show no repair. w4/m15 covers validation associations, m19 next-fragment routing, 136 translated username limits and 137 initialization overwrite; none owns native credential GET. No actual network credential submission, authenticated consent, password reset or OTP flow was tested. This filing addresses dashboard rendering, not a new REST/GraphQL/MCP capability.

Verified local evidence (ignored scratch): `dashboard/tmp/qa-20260917/auth-native-get-login-390.json`, `dashboard/tmp/qa-20260917/auth-native-get-login-1440.json`, `dashboard/tmp/qa-20260917/auth-native-get-signup-390.json`. They retain only viewport, offline/interception state, query key names and a synthetic-value match boolean. Held scripts were aborted and all offline contexts closed.

Fresh hydrated control on 2026-09-18: empty Sign In leaves the complete next-bearing route unchanged and displays Email is required / Password is required. Evidence `dashboard/tmp/qa-20260917/auth-hydrated-empty-control.json`. No values or credentials were submitted.

Independent browser/keyboard repeat: owned headless installed Chrome153.0.8010.52, fresh390×844 context with JavaScript disabled. Loaded the real login SSR, then put the context offline and added the navigation-aborting interceptor before synthetic field entry. Enter in the password field constructed GET `/auth/login` with `email,password` query keys and the synthetic password, blocked before transmission. Evidence `dashboard/tmp/qa-20260917/auth-native-get-chrome153-nojs-enter.json`. This adds the failed/disabled-script state without a held entry request. Browser and context closed.
