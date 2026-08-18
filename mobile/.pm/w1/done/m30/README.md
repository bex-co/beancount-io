# w1 · m30 — The last six locales, and the gate goes unconditional

**Worker:** worker1 **Goal:** The six remaining locales reach full parity with the English base, the `KNOWN_GAPS` baseline empties, and a byte-identical English value stops counting as a translation — after which no feature can ship a screen that is English-only in twelve languages without saying so out loud. **Status:** **done** 2026-08-17 — twelve locales at full parity, baseline empty, gate unconditional, 1306 unit tests green

## Tasks (in order)

| id   | title                                                               | est | depends_on           |
| ---- | ------------------------------------------------------------------- | --- | -------------------- |
| t001 | Bring `bg` to full parity (175 keys)                                | 45m | — **DONE**           |
| t002 | Bring `ca` to full parity (175 keys)                                | 45m | — **DONE**           |
| t003 | Bring `fa` to full parity (175 keys, RTL)                           | 45m | — **DONE**           |
| t004 | Bring `nl` to full parity (175 keys)                                | 45m | — **DONE**           |
| t005 | Bring `sk` to full parity (175 keys)                                | 45m | — **DONE**           |
| t006 | Bring `uk` to full parity (175 keys)                                | 45m | — **DONE**           |
| t007 | Empty the baseline; flag English-identical values as untranslated   | 30m | t001–t006 — **DONE** |
| t008 | UX pass — six locales walked, including `fa` right-to-left          | 30m | t007 — **DONE**      |
| t009 | Simplify pass over the milestone's diff                             | 20m | t008 — **DONE**      |
| t010 | Test coverage — the unconditional gate and the identical-value rule | 30m | t009 — **DONE**      |

## Definition of done

`bg`, `ca`, `fa`, `nl`, `sk`, and `uk` each declare all 318 top-level keys of `en.ts`. `KNOWN_GAPS` is empty for every locale — the mechanism stays, documented, as the one honest way a future feature defers a language, but nothing is deferred today. The integrity suite additionally fails when a locale declares a key whose value is byte-identical to English and the key is not in `INTENTIONALLY_UNTRANSLATED` with a stated reason. The six locales render without truncation in light and dark, and `fa` renders right-to-left with correct alignment on the newly translated screens. `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Source + Goal linkage

- **Source:** the same `/pm` request 2026-08-17 that produced m29; split off because twelve locales at ~170 keys each is roughly ten hours and two shippable halves.
- **Goal linkage:** the `.pm/GOAL.md` cross-cutting quality bar — "localized (13 locales, English as base)" — which is currently asserted rather than true.
- **Expected outcome:** every locale the app advertises actually delivers the whole app, and the "no missing, no extra" gate becomes unconditional, so a half-translated feature is a red build rather than a silent English fallback.
- **Why now:** the gate lands in m29 but is only as strong as its baseline — with six locales still listed in `KNOWN_GAPS`, a reviewer reading a green build still cannot tell parity from deferral. Finishing the list is what turns the test from a report into a rule.

## Outcome — shipped 2026-08-17

All twelve locales now declare every key of the English base. `KNOWN_GAPS` is `{}`; the mechanism stays, documented, as the one honest way a future feature defers a language. A byte-identical English value no longer counts as a translation.

### The six locales (t001–t006)

All six were missing the _identical_ 175-key set, so one dump drove all six. Each file was rewritten in `en.ts` key order with its group comments; **no pre-existing translation was altered or lost** — 155 prior keys per file, all byte-identical afterwards.

### What the new rule found (t007)

The English-copy scan turned up 156 hits across the twelve. Almost all were legitimate — loanwords (`journal`, `budget`, `tags`, `details`), month abbreviations that coincide, `M` reading as _Monat_ / _mes_ / _maand_ in the range chips — and are now recorded per locale in `SAME_AS_ENGLISH`, grouped by reason. Five are English in every language and live in `UNTRANSLATABLE`: the sudo confirmation phrase the settings screen matches on, two Beancount account literals, and an example filename.

Two were real:

- **`fa` had ten keys still holding English** — `transactions`, `search`, `unknown`, `openAccount`, `closeAccount`, `transaction`, `loadingMore`, `noMoreEntries`, `journalLoadError`, `accountsPlural` — each carrying a `// TODO: needs native speaker review` marker. Translated.
- **`tes: "1"` was dead** — no static or dynamic reference anywhere in `src/` or `app/`. Removed from `en.ts` and all twelve locales rather than justified, which is what t007 asked for. The base is 329 keys now.

### A regression this milestone caused and repaired

Rewriting each file in `en.ts` order **discarded the locale files' own inline comments**, including 20 `// TODO: needs native speaker review` markers — 18 in `fa`, one each in `bg` and `sk`. Ten sat on the English leftovers above and are moot now that those are translated; the other ten were human caveats about translation quality that no test replaces, and they have been restored. m29 did the same rewrite on its six locales, but none of those carried markers, so nothing was lost there.

### UX pass (t008)

`fa` walked first — home, reports, multi-posting entry, open-account, notifications — then `bg` and `nl` for length in light and dark, and `ca` / `sk` / `uk` spot-checked on the range chips. One real defect found and fixed: the Persian range chips used Persian digits (`۱م`, `۳م`, `۶م`, `۱س`), and **`۱` is a bare vertical stroke visually identical to the letter `ا` at chip size**, so `۱م` read as the word `ام`. Every other number on the same screen — amounts, dates, axis labels — is in Latin digits, so the chips now use them too. Nothing else truncated in any of the six.

The app is **not** in RTL layout mode: `I18nManager.forceRTL` is never called, so Persian renders as Persian text inside a left-to-right layout. That is pre-existing and out of scope here; flipping it is a native, app-wide change affecting every screen.

**Not verified, same as m29:** the receipt capture and reveal states. The simulator has no camera permission, so the flow stops at the permission screen — which does render correctly in Bulgarian and Persian.

### Simplify + coverage (t009, t010)

Each rule used to re-read and re-scan the same 330-key file; one memoised `scan(locale)` now serves all of them. The suite's per-locale loop reused the already-computed locale list instead of re-reading the directory.

Fixtures cover `englishCopiesFor` — verbatim copy, whitespace-only difference, plural copied in every branch versus differing in one, undeclared keys, keys the base does not have — plus structural checks on the exception lists themselves: every excused key exists in `en`, every group carries a reason, no key listed twice, and an unknown locale inherits only the global untranslatable set. Stubbing `englishCopiesFor` to `[]` fails 3 fixtures and 12 integration tests.

One test was written and then deleted: asserting `KNOWN_GAPS` is empty would close the escape hatch the same file documents as deliberate — a legitimate deferral would fail CI, so the hatch would be worked around instead of used.

## Notes

- `fa` is the only right-to-left locale and the only one whose UX pass needs a layout check rather than a length check.
- **Consequence worth stating plainly:** once `KNOWN_GAPS` is empty, every future feature that adds an `en` key must either ship twelve translations or add an explicit `KNOWN_GAPS` entry naming what it deferred. That is the point, but it is new friction on every feature branch — the escape hatch stays in place deliberately rather than being deleted.
- The English-identical-value rule (t007) will surface legitimate matches — proper nouns, `Beancount`, Beancount account literals, symbols. They belong in `INTENTIONALLY_UNTRANSLATED` with a reason, not in a blanket skip.
- No new dependencies.
