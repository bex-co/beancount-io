# w3 · m42 — Accept dates in the user's own date order

**Worker:** worker3 **Goal:** a date typed in the app's selected language means what the user meant it to mean **Status:** todo

Severity: **major**. Package: dashboard. Every date text input in the app displays and parses **US month-first order only**, in all 15 languages. A French user typing `12/09/2026` for 9 December gets a silently accepted 12 September — both orderings are valid calendar dates, so nothing warns them, and the wrong date is committed to the ledger.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Derive the date display and parse patterns from the active language | 55m | — |
| t002 | Localize the format hint at every date input | 30m | t001 |
| t003 | Verify the date-entry adoption surface | 15m | t002 |
| t004 | Simplify the date pattern wiring | 15m | t003 |
| t005 | Test typed dates across locales and orderings | 55m | t003 |
| t006 | Close and archive the date-order milestone | 10m | t004, t005 |

Implementation totals 85 minutes; all six tasks total 180 minutes. A shared parser with many callers, per-locale patterns, and a delicate ambiguity boundary put this well past a sub-hour edit.

## Reproduced problem

Production https://beancount.io, 2026-09-12, isolated headless Chrome (Playwright MCP `--headless --isolated`), 1440×1000, authenticated QA account with write access on its own synthetic `example` ledger. Local/fetched main `84231f9c`; deployed SHA unverified. **No entry was created** — field values were read from the rendered dialog and the parsing rules from source.

Open `/ledger/<owner>/example/journal?lang=fr&action=new-entry&directive=transaction`. The dialog is fully French — `Nouvelle écriture`, `Bénéficiaire`, `Libellé`, `Montant (ex: 100.00)`, `Devise (ex: USD)`, `Créer une écriture`, `Sélectionner une date` — and opening the calendar gives a properly localized French, Monday-first grid: `lu ma me je ve sa di`.

The date **text input** next to that calendar shows placeholder `MM/DD/YYYY` and value `09/12/2026`.

So one control presents a French calendar and a US text field, side by side. The browser locale was `en-US`, but that is not the mechanism — the pattern is a constant.

Source: `dashboard/src/common/components/ui/date-picker-utils.ts:10-11` —

```ts
export const DISPLAY_PATTERN = "MM/dd/yyyy";
const PARSE_PATTERNS = [DISPLAY_PATTERN, "yyyy-MM-dd"] as const;
```

`parseStrictCalendarDate` (`:31-42`) accepts only those two patterns and requires an exact round-trip, so:

- `12/09/2026` typed by a French user meaning **9 December** parses as **12 September** and is accepted — no warning is possible, because it is a legitimate date.
- `13/09/2026` (13 September in day-first order) is rejected as invalid, which is merely confusing.
- `2026-12-09` is accepted correctly. The ISO fallback is today's only locale-safe input, and nothing tells the user it exists.

The placeholder is hardcoded at each call site — `features/journal/components/new-directive-dialog/transaction-form.tsx:331` and `features/receipt/components/receipt-review-form.tsx:161` — and `MM/DD/YYYY` is listed in `src/test/no-untranslated-user-facing-strings.test.ts:57` under `INTENTIONAL_LITERALS`, beside `BQL`, `HTTP`, `KB`, `SSH` and `USD`. Those really are locale-invariant tokens; a date order is not. Treat that entry as a miscategorization to correct, not a product decision to preserve.

Evidence: `dashboard/tmp/qa-20260912/date-input-us-only.json` (gitignored, local only).

## Relationship to the two completed milestones that touched this control

Neither owns this, and both deliberately stopped short of it:

- Completed [m22](../done/m22/README.md) localized the **calendar popup** and states in its own DoD that language changes "do not reinterpret an existing selected date or typed draft" — it localized the calendar and left the typed text alone. This milestone is exactly the residual that decision left behind, and the French-calendar/US-textbox split above is what it looks like to a user.
- Completed [m24](../done/m24/README.md) fixed **draft preservation and calendar validity** of typed dates — that `02/30/2025` cannot silently become `2025-03-02`, that partial input is not expanded, that an invalid date blocks submission. Its DoD is written entirely in `MM/DD/YYYY` examples, so it hardcoded the assumption rather than examining it. Every one of its guarantees must survive this change.

## Definition of done

- With the app set to a day-first language, typing that language's ordering produces the date the user meant, and the placeholder shows that language's ordering.
- With the app set to English, `MM/DD/YYYY` behaves exactly as it does today.
- The `yyyy-MM-dd` ISO fallback keeps working in every language.
- An input that is ambiguous or invalid under the active language's pattern is rejected as invalid rather than reinterpreted under another pattern — the parser must not try several orderings and take the first that happens to parse, which would reintroduce the silent-wrong-date failure from the other direction.
- Changing the app language does not silently reinterpret a date already selected or already typed (m22's guarantee), and does not rewrite an existing entry's stored date.
- Every one of m24's guarantees still holds under each tested locale: no partial-input expansion, no month-length rollover, invalid input blocks submission, paste of `2025-06-15` stays June 15.
- Every date input in the app shows a format hint matching the pattern actually in force, localized, with no hardcoded literal left at a call site.
- `MM/DD/YYYY` is removed from `INTENTIONAL_LITERALS` and the untranslated-strings test passes without it.
- `yarn format:check && yarn lint && yarn test && yarn build` pass in `dashboard/`.

## Dedupe and limits

All open and `done/` queues searched for date input, date format, `MM/DD`, locale and picker terms. `m22` and `m24` are analysed above. My note [190](../190.md) is the **importer's Configure step** rendering an already-stored ISO date through `toLocaleDateString(undefined)` — a read-only display path in another feature, and the opposite direction (it follows the browser instead of the app); this milestone is the typed-input path in the shared picker. Completed `116` was journal display precision. Nothing owns the parse order.

Unverified: the full list of `DatePicker` call sites beyond the two hardcoded placeholders found by grep, right-to-left locales, the receipt review form live, narrow viewport, and the patched behavior. No entry was created, so an actually-committed wrong date was not observed end to end — the parse rule is established from source and the rendered field.

## Source + Goal linkage

- **Source:** continuous dashboard QA, 2026-09-12 — the journal write journey; evidence in `dashboard/tmp/qa-20260912/date-input-us-only.json`.
- **Goal linkage:** **A2 — Frictionless onboarding**: the app ships in 15 languages and invites non-US users to keep their books in it, then silently misreads the first date most of them will type.
- **Expected outcome:** a user in any supported language can type a date the way they write it and get the entry they intended, with an ambiguous input refused rather than guessed.
- **Why now:** m22 localized the calendar and m24 hardened the parser, so the surrounding work is done and this is the one remaining piece — and it is the piece that can put a wrong date into someone's books. Adoption surface is included because this changes a user-facing input contract.
