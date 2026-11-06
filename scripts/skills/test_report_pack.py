#!/usr/bin/env python3
"""Tests for beancount-report-pack's build script (w21/m9).

Runs `skills/beancount-report-pack/scripts/report_pack.py` against the
checkout's `bea` (through a wrapper, so a different `bea` on PATH cannot
stand in) on the eval fixtures. Tie-out failures are produced by wrapping
`bea` and tampering with one report's JSON, because the books themselves
are validated before the pack is built.
"""

from __future__ import annotations

import hashlib
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SKILL = REPO / "skills" / "beancount-report-pack"
SCRIPT = SKILL / "scripts" / "report_pack.py"
FILES = SKILL / "evals" / "files"
CLI = REPO / "cli"


def _executable(path: Path, text: str) -> Path:
    path.write_text(text, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR)
    return path


@unittest.skipUnless(shutil.which("uv"), "uv is needed to run the checkout's bea")
class ReportPack(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.real = _executable(
            self.root / "real-bea",
            f'#!/bin/sh\nexec uv run --quiet --project "{CLI}" bea "$@"\n',
        )
        self.env = {**os.environ, "BEA_NO_UPDATE_NOTIFIER": "1", "BEA_CONFIG_DIR": str(self.root / "config")}

    def build(self, ledger: Path, *extra: str, bea: Path | None = None, out: str = "pack") -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), "--bea", str(bea or self.real), "--file", str(ledger), "--time", "2026-06", "--out", str(self.root / out), *extra],
            capture_output=True,
            text=True,
            env=self.env,
            check=False,
        )

    def tampering(self, replace: str, new: str) -> Path:
        """A `bea` that alters one field of the cash-flow JSON before the script reads it."""
        return _executable(
            self.root / "tampered-bea",
            textwrap.dedent(
                f"""\
                #!{sys.executable}
                import subprocess, sys
                done = subprocess.run(["{self.real}", *sys.argv[1:]], capture_output=True, text=True)
                out = done.stdout
                if "cash-flow" in sys.argv and "--json" in sys.argv:
                    assert {replace!r} in out, "tamper target missing"
                    out = out.replace({replace!r}, {new!r}, 1)
                sys.stdout.write(out)
                sys.stderr.write(done.stderr)
                sys.exit(done.returncode)
                """
            ),
        )

    def test_a_clean_ledger_builds_a_reconciled_pack_with_hand_computed_figures(self) -> None:
        done = self.build(FILES / "eval1_ledger.beancount")
        self.assertEqual(done.returncode, 0, done.stderr)
        pack = self.root / "pack"
        self.assertEqual(
            sorted(p.name for p in pack.iterdir()),
            ["EVIDENCE.md", "SUMMARY.md", "balance-sheet.csv", "cash-flow.csv", "holdings.csv", "income-statement.csv", "trial-balance.csv"],
        )
        summary = (pack / "SUMMARY.md").read_text()
        self.assertIn("**Status: RECONCILED**", summary)
        # Hand-computed: June income 4500.00, expenses 900.00 + 120.00.
        self.assertIn("Net profit: 3480.00 USD", summary)
        # Cash: 8000 + 2000 + 3000 (May) opening; -900 rent, -120 card; the savings transfer nets out.
        self.assertIn("Net change in cash: -1020.00 USD (opening 13000.00 USD, closing 11980.00 USD)", summary)
        self.assertIn("Net worth: 16480.00 USD", summary)
        self.assertNotIn("FAIL", summary)
        self.assertNotIn("skipped", summary)

    def test_the_same_ledger_reproduces_the_same_pack(self) -> None:
        self.build(FILES / "eval1_ledger.beancount", out="one")
        self.build(FILES / "eval1_ledger.beancount", out="two")
        for name in ("balance-sheet.csv", "income-statement.csv", "cash-flow.csv", "trial-balance.csv", "SUMMARY.md"):
            self.assertEqual(
                hashlib.sha256((self.root / "one" / name).read_bytes()).hexdigest(),
                hashlib.sha256((self.root / "two" / name).read_bytes()).hexdigest(),
                name,
            )
        evidence = (self.root / "one" / "EVIDENCE.md").read_text()
        self.assertIn(hashlib.sha256((FILES / "eval1_ledger.beancount").read_bytes()).hexdigest(), evidence)

    def test_evidence_digests_included_files_and_every_output(self) -> None:
        ledger = self.root / "main.beancount"
        ledger.write_text(
            (FILES / "eval1_ledger.beancount").read_text().replace(
                '2026-05-04 * "Acme" "Invoice May"', 'include "may.beancount"\n2026-05-05 * "Acme" "Invoice May"'
            )
        )
        (self.root / "may.beancount").write_text("; included file\n")
        done = self.build(ledger)
        self.assertEqual(done.returncode, 0, done.stderr)
        evidence = (self.root / "pack" / "EVIDENCE.md").read_text()
        self.assertIn("`may.beancount`", evidence)
        for name in ("balance-sheet.csv", "cash-flow.csv"):
            digest = hashlib.sha256((self.root / "pack" / name).read_bytes()).hexdigest()
            self.assertIn(digest, evidence)

    def test_gaps_stay_visible_and_are_not_resolved(self) -> None:
        done = self.build(FILES / "eval2_ledger.beancount")
        self.assertEqual(done.returncode, 0, done.stderr)
        summary = (self.root / "pack" / "SUMMARY.md").read_text()
        self.assertIn("Balance parked in Expenses:Uncategorized: 42.00 USD", summary)
        self.assertIn("1 transaction(s) in the period are flagged `!`", summary)
        self.assertIn("chosen by account name", summary)

    def test_a_failed_tie_out_is_written_as_not_reconciled_with_its_difference(self) -> None:
        # Closing cash shifted by exactly 1.00 USD: the roll-forward and the independent recomputation both break.
        tampered = self.tampering('"closing": {"USD": "11980.00"}', '"closing": {"USD": "11981.00"}')
        done = self.build(FILES / "eval1_ledger.beancount", bea=tampered)
        self.assertEqual(done.returncode, 3, done.stderr)
        summary = (self.root / "pack" / "SUMMARY.md").read_text()
        self.assertIn("**Status: NOT RECONCILED**", summary)
        self.assertIn("| Cash rolls forward | FAIL — difference -1.00 USD", summary)
        self.assertIn("| Closing cash is independently recomputed | FAIL", summary)
        self.assertIn("| Balance sheet balances | pass", summary)
        self.assertIn("FAIL", done.stdout)

    def test_an_unpriced_holding_stops_the_build_unless_book_value_is_chosen(self) -> None:
        done = self.build(FILES / "eval3_ledger.beancount")
        self.assertEqual(done.returncode, 1)
        self.assertIn("Missing prices for ACME", done.stderr)
        self.assertIn("--conversion at_cost", done.stderr)
        again = self.build(FILES / "eval3_ledger.beancount", "--conversion", "at_cost", out="book")
        self.assertEqual(again.returncode, 0, again.stderr)
        summary = (self.root / "book" / "SUMMARY.md").read_text()
        self.assertIn("`holdings.csv` was not produced", summary)
        self.assertFalse((self.root / "book" / "holdings.csv").exists())

    def test_a_ledger_that_fails_its_check_is_refused_before_anything_is_written(self) -> None:
        broken = self.root / "broken.beancount"
        broken.write_text((FILES / "eval1_ledger.beancount").read_text() + '2026-06-28 * "Bad"\n  Expenses:Nowhere 1 USD\n  Assets:Bank:Checking\n')
        done = self.build(broken)
        self.assertEqual(done.returncode, 2)
        self.assertIn("`bea check`", done.stderr)
        self.assertFalse((self.root / "pack").exists())

    def test_a_ledger_that_changes_during_the_build_is_refused(self) -> None:
        ledger = self.root / "live.beancount"
        shutil.copyfile(FILES / "eval1_ledger.beancount", ledger)
        mover = _executable(
            self.root / "moving-bea",
            textwrap.dedent(
                f"""\
                #!{sys.executable}
                import subprocess, sys
                done = subprocess.run(["{self.real}", *sys.argv[1:]], capture_output=True, text=True)
                if "balance-sheet" in sys.argv and "--json" in sys.argv:
                    open({str(ledger)!r}, "a").write("; edited mid-build\\n")
                sys.stdout.write(done.stdout)
                sys.stderr.write(done.stderr)
                sys.exit(done.returncode)
                """
            ),
        )
        done = self.build(ledger, bea=mover)
        self.assertEqual(done.returncode, 1)
        self.assertIn("changed while the pack was being built", done.stderr)

    def test_a_missing_bea_is_a_usage_error(self) -> None:
        done = self.build(FILES / "eval1_ledger.beancount", bea=self.root / "no-such-bea")
        self.assertEqual(done.returncode, 2)
        self.assertIn("is not installed", done.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
