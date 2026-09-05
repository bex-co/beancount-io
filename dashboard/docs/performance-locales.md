# Dashboard locale loading and performance

The router creates one translation instance per SSR request. English remains
available synchronously for fallback and error pages. Other languages have
explicit dynamic imports. SSR transfers only the selected non-English resource
bundle through TanStack's dehydration API; hydration installs that bundle before
rendering. This avoids both a language flash and downloading the same translations
again as a locale chunk.

Components use `useTranslations()` or `useTranslation()` inside the router's
localization provider. Route head helpers receive the match's translation instance
explicitly. Language selectors use `useChangeLanguage()` so the current language
stays usable while loading, newer choices supersede older ones, and preferences
are persisted only after success. A failed chunk shows a translated error and
**Try Again** action. That action reloads the current URL with the chosen `lang`
parameter: browsers may cache a failed module import, while SSR can supply the
resources on the new document request.

## Repeatable build budget

Run from `dashboard/`, with existing package dependencies installed:

```sh
yarn build
yarn perf:locales
```

The command uses `.output/public/.vite/manifest.json`, follows static imports,
and sums gzip level-9 bytes of the initial JavaScript graph. It fails if:

- any non-English language loses its own dynamic entry;
- an initial/route chunk eagerly imports a non-English locale;
- one locale eagerly imports another locale; or
- the initial JavaScript graph exceeds 370,000 gzip bytes.

The language list comes from `src/i18n/config.ts`; asset hashes are not pinned.
To inspect an archived build, pass its public-assets directory:

```sh
node scripts/check-locale-budget.mjs tmp/previous-build/public
```

Keep this command alongside the normal package checks when changing translation
loading, route imports, or dependencies. The budget has modest headroom over the
measured result; investigate regressions before changing it. It measures built
JavaScript, not CSS, HTML, SSR translation payloads, or field Web Vitals.

## m21 evidence — 2026-09-05

Baseline: `e81953e9`, before the locale split. The final implementation measured
333,903 gzip bytes for initial JavaScript, compared with 951,559 bytes before:
**617,656 fewer bytes (64.9%)**. Fourteen non-English locales have separate dynamic
entries. The budget command rejects the baseline and passes the implementation.

Browser runs used Chrome 152 on macOS, 1280 × 800, 4× CPU slowdown, 40 ms network
latency, 10 Mbit/s download and 5 Mbit/s upload. Each navigation used a fresh browser
context with HTTP cache disabled. The production SSR server and public-example
API response cache were warm. One warm-up run per scenario was excluded; values
below are medians of the next three runs. Local SSR served uncompressed assets;
gzip figures above are a separate, reproducible build measurement.

| Scenario | FCP before → after | Hydration signal before → after | Usable content before → after |
| --- | --- | --- | --- |
| Login | 344 → 344 ms | 4,067 → 1,634 ms | 4,069 → 1,643 ms |
| Empty-account ledger list | 464 → 444 ms | 4,929 → 2,504 ms | 5,000 → 2,619 ms |
| Public example income statement | 416 → 760 ms | 6,104 → 4,180 ms | 6,246 → 4,522 ms |

These are small local samples with host-load variability, not field performance
or conversion guarantees. In particular, the report's FCP increased in this pass;
the data supports reduced JavaScript and earlier hydration, not a claim that every
paint metric improves. Re-measure on the target deployment before assigning a
loading-time SLO.

### Reproducing browser scenarios

1. Build baseline and candidate with identical environment settings. Run each
   production server on a separate local port, with the same read-only fixture
   API. Do not compare the Vite development server with a production build.
2. Use `/auth/login` anonymously; `/ledger` with a synthetic empty-account profile
   (`listLedgers: []`, an empty feed, and ordinary free-tier limits); and
   `/ledger/open_ledger/example/income-statement` with cached responses from that
   public example. Forward browser API requests to the same fixture API as SSR.
   A real anonymous `/ledger` visit redirects to login and is not a ledger-list
   benchmark. Reject fixture mutations; no production sign-in or writes are needed.
3. Set the Chrome viewport, CPU and network configuration above. Clear cookies and
   browser caches between runs; provide only the synthetic session for `/ledger`.
   Warm the fixture API once, then keep its responses fixed for both builds.
4. Record navigation timing, `first-contentful-paint`, same-origin resource sizes,
   and browser errors. For a comparable hydration signal, install this probe
   **before navigation** in the browser automation context. Both baseline and
   candidate set `html.lang` from the `LanguageSync` effect after hydration:

   ```js
   const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "lang");
   Object.defineProperty(HTMLElement.prototype, "lang", {
     ...descriptor,
     set(value) {
       descriptor.set.call(this, value);
       if (this.tagName === "HTML" && !window.localeHydratedAt) {
         window.localeHydratedAt = performance.now();
       }
     },
   });
   ```

5. Wait for this signal and the actual scenario content: the login form, the
   empty-ledger message, or the report's first chart canvas. Record readiness
   separately from network-idle time. Do not count error pages or skeletons as
   successful loads. Discard the first run and compare at least three further
   cold-browser navigations; preserve sample counts and machine conditions.

### Correctness checks

- All 15 supported languages passed concurrent SSR requests and individual browser
  hydration checks on login. No hydration errors or extra locale-chunk downloads
  occurred; the selected SSR resources supplied the initial language.
- Real i18next tests cover lazy resource loading, request isolation for text and
  metadata, invalid languages, and superseding an in-flight selection.
- A browser test aborted the French chunk from the settings selector. English and
  its preference remained intact; **Try Again** reloaded French SSR content,
  hydrated successfully without that chunk, and persisted French.
- Native bridge and route metadata consumers use the explicit instance. Existing
  selectors and bridge behavior retain their supported-language list.
