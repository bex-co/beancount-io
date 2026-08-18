# w1 · m30 — The last six locales, and the gate goes unconditional

**Worker:** worker1 **Goal:** The six remaining locales reach full parity with the English base, the `KNOWN_GAPS` baseline empties, and a byte-identical English value stops counting as a translation — after which no feature can ship a screen that is English-only in twelve languages without saying so out loud. **Status:** todo

## Tasks (in order)

| id   | title                                                               | est | depends_on                         |
| ---- | ------------------------------------------------------------------- | --- | ---------------------------------- |
| t001 | Bring `bg` to full parity (175 keys)                                | 45m | —                                  |
| t002 | Bring `ca` to full parity (175 keys)                                | 45m | —                                  |
| t003 | Bring `fa` to full parity (175 keys, RTL)                           | 45m | —                                  |
| t004 | Bring `nl` to full parity (175 keys)                                | 45m | —                                  |
| t005 | Bring `sk` to full parity (175 keys)                                | 45m | —                                  |
| t006 | Bring `uk` to full parity (175 keys)                                | 45m | —                                  |
| t007 | Empty the baseline; flag English-identical values as untranslated   | 30m | t001, t002, t003, t004, t005, t006 |
| t008 | UX pass — six locales walked, including `fa` right-to-left          | 30m | t007                               |
| t009 | Simplify pass over the milestone's diff                             | 20m | t008                               |
| t010 | Test coverage — the unconditional gate and the identical-value rule | 30m | t009                               |

## Definition of done

`bg`, `ca`, `fa`, `nl`, `sk`, and `uk` each declare all 318 top-level keys of `en.ts`. `KNOWN_GAPS` is empty for every locale — the mechanism stays, documented, as the one honest way a future feature defers a language, but nothing is deferred today. The integrity suite additionally fails when a locale declares a key whose value is byte-identical to English and the key is not in `INTENTIONALLY_UNTRANSLATED` with a stated reason. The six locales render without truncation in light and dark, and `fa` renders right-to-left with correct alignment on the newly translated screens. `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Source + Goal linkage

- **Source:** the same `/pm` request 2026-08-17 that produced m29; split off because twelve locales at ~170 keys each is roughly ten hours and two shippable halves.
- **Goal linkage:** the `.pm/GOAL.md` cross-cutting quality bar — "localized (13 locales, English as base)" — which is currently asserted rather than true.
- **Expected outcome:** every locale the app advertises actually delivers the whole app, and the "no missing, no extra" gate becomes unconditional, so a half-translated feature is a red build rather than a silent English fallback.
- **Why now:** the gate lands in m29 but is only as strong as its baseline — with six locales still listed in `KNOWN_GAPS`, a reviewer reading a green build still cannot tell parity from deferral. Finishing the list is what turns the test from a report into a rule.

## Notes

- `fa` is the only right-to-left locale and the only one whose UX pass needs a layout check rather than a length check.
- **Consequence worth stating plainly:** once `KNOWN_GAPS` is empty, every future feature that adds an `en` key must either ship twelve translations or add an explicit `KNOWN_GAPS` entry naming what it deferred. That is the point, but it is new friction on every feature branch — the escape hatch stays in place deliberately rather than being deleted.
- The English-identical-value rule (t007) will surface legitimate matches — proper nouns, `Beancount`, Beancount account literals, symbols. They belong in `INTENTIONALLY_UNTRANSLATED` with a reason, not in a blanket skip.
- No new dependencies.
