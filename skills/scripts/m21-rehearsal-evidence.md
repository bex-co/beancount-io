# m21 rehearsal evidence — one-install bea for ledger skills

Date: 2026-09-12. Agents covered by shared skill files (Claude Code + Codex).
Customer commands use `uv run --project cli bea` with global `bean-*` scrubbed from PATH.
Oracle: `uv run --project cli bean-check` (deliberate separate env).

## Tool versions
```
bea 0.1.0
exit=0
```

## Core — init + check (no Fava, no pip install beancount)
- `bea init` exit=0
- `bea check` exit=0
- main.bean lines=24; Equity:OpeningBalances present=True
- No `pyproject.toml` / `Makefile` created on bea-only path: True

## Core — query / report (ask fixture)
- `bea --json query` exit=0
- `bea report income-statement --time 2026-06` exit=0
- JSON keys: ['bea', 'data', 'target', 'truncated']

## Core — CSV import preview (no --apply)
- exit=0
```
csv → Assets:Bank:Checking: 4 ready, 0 exact duplicates, 0 possible duplicates
ROW  STATUS  DATE        PAYEE / NARRATION            SOURCE AMOUNT  RULE     
---  ------  ----------  ---------------------------  -------------  ---------
1    new     2026-05-07  TRADER JOES #123 SEATTLE WA  -54.20 USD     unmatched
2    new     2026-05-09  SHELL OIL 5551 KIRKLAND WA   -40.00 USD     unmatched
3    new     2026-05-15  PAYROLL ACME CORP            2500.00 USD    unmatched
4    new     2026-05-22  CITY PARKING AUTH            -12.00 USD     unmatched
--- /Volumes/nvme4tbfish/projects/beancount-io/skills/tmp/m21-rehearsal/import-preview/ledger.beancount
+++ /Volumes/nvme4tbfish/projects/beancount-io/skills/tmp/m21-rehearsal/import-preview/ledger.beancount
@@ -26,3 +26,23 @@
 2026-04-25 * "SHELL OIL 5551"
   Assets:Bank:Checking       -35.00 USD
   Expenses:Transport          35.00 USD
+
+2026-05-07 ! "TRADER JOES #123 SEATTLE WA" ""
+  import-id: "csv:sha256:12802942bbda86f9"
+  Assets:Bank:Checking       -54.20 USD
+  Expenses:Uncategorized      54.20 USD
+
+2026-05-09 ! "SHELL OIL 5551 KIRKLAND WA" ""
+  import-id: "csv:sha256:59b11362541b41f5"
+  Assets:Bank:Checking       -40.00 USD
```

## Core — reconcile fixture check vs oracle
- `bea check` exit=0
- oracle `bean-check` exit=0 (nonzero stdout/err counts as fail for oracle text)
- agree on pass: True

## Optional — engine status + price without enable
- `bea engine status` exit=0
```
Engine 0.1.0 at /Users/tianpan/.local/share/bea/engine/0.1.0
Provisioned: yes
Optional features:
  beangulp: disabled, absent (GPL-2.0-only)
    Needs the system libmagic library (python-magic). CSV import via --csv does not need this feature.
  beanprice: disabled, absent (GPL-2.0-only)
    Quote fetching only; bea add price still records a supplied quote without this feature.

```
- `bea price -e USD:yahoo/AAPL` exit=2 (expect non-zero if beanprice not enabled)
```
Error: Engine feature 'beanprice' is not enabled. Run: bea engine enable beanprice

```

## Agent guidance consistency
- Claude Code and Codex both load `skills/.claude/skills/*/SKILL.md` (customer) and `.agents/skills` via root `.claude/skills` symlink for development.
- Shared files updated once; no platform-specific copies.
- This rehearsal exercises the public `bea` command contracts those skills document; it is not a live multi-turn agent transcript.

## Isolation
- `command -v bean-check` under scrubbed PATH: `(empty)`
- Customer workflows above did not require `pip install beancount` or private `BEA_ENGINE` configuration.

