# Spike: OFX/QFX through the managed engine's beangulp (w22/m2/t001)

## Verdict

No new packages. Drive upstream beangulp's example OFX importer
(`examples/importers/ofx.py`, beangulp 0.2.0) from a bea adapter that completes
the counter leg, stamps FITIDs, and refuses what the example cannot parse.
**No user approval is needed**: nothing enters the default install, the
manifest, or any lock.

## Packages required

- `beangulp==0.2.0` — already in `engine-optional-beangulp.lock`; OFX rides
  the existing opt-in (`bea engine enable beangulp`).
- `beautifulsoup4`, `lxml` — already in the same lock; the example's only
  third-party needs for parsing.
- Nothing else. `ofxparse` 0.21 (MIT; bs4+lxml+six, all already in the lock)
  stays the fallback if the example's parsing proves insufficient, and would
  need user approval as a new package — not proposed now.

Importing the example at runtime keeps the manifest's existing GPL-2.0-only
posture for the beangulp feature; the file is not vendored.

## Evidence (scratch engine: beancount 3.2.3 + beangulp 0.2.0)

Ran `examples.importers.ofx.Importer` over synthetic OFX 1.x (SGML), OFX 2.x
(XML), QFX, credit-card, and investment statements, plus end-to-end through
`bea import --config` with `BEA_ENGINE_PYTHON` on the scratch engine:

| Case | Result |
| --- | --- |
| OFX 1.x / 2.x / QFX bank file | `identify` true; dates, narrations (name+memo), signed amounts all correct |
| Credit-card (`CCSTMTTRNRS`) | Same code path, parses identically |
| Investment (`INVSTMTRS`) | `identify` true but extracts zero rows — must refuse, not preview empty |
| `--config` end-to-end | Preview runs; entries are single-legged (invalid: unbalanced), carry no `import-id` (bea falls back to a content hash), and the `LEDGERBAL` balance flows as its own row |

## What the adapter (t002) must close

1. Complete the counter leg through the shared rules/default/`!` queue — the
   example emits one posting and bea writes nothing unbalanced.
2. Stamp `import-id: ofx:<FITID>` per `STMTTRN` (the skill dedup convention);
   fall back to the content hash when a statement omits FITID.
3. No balance assertion in v1 (`BalanceType.NONE`): the CSV path never asserts,
   and a mismatched assertion would fail no-code imports opaquely.
4. Refuse multi-`ACCTID` files with guidance to `--config` (one account per
   importer); `.*` would merge accounts.
5. Refuse zero-transaction extractions (investment OFX) with guidance to a
   Python importer.
6. Decode per the OFX header charset instead of the example's locale `open()`,
   and silence `XMLParsedAsHTMLWarning` (bs4 parses OFX 1.x SGML as tag soup).
7. Absent beangulp: `launch.require_feature("beangulp")` — exit 2 with the
   established `Run: bea engine enable beangulp` hint (DoD line 3).

t003 designs the remembered-mapping key (CSV's header hash has no OFX
analogue; `ACCTID` is the natural candidate) and the `.ofx`/`.qfx` dispatch.
