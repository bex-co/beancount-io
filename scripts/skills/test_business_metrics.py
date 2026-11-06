#!/usr/bin/env python3
"""Tests for beancount-business-metrics' script (w21/m10).

Runs `skills/beancount-business-metrics/scripts/business_metrics.py` against
the checkout's `bea` on the eval fixture. Expected figures are computed by
hand from the fixture's postings (see evals/evals.json notes).
"""

from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SKILL = REPO / "skills" / "beancount-business-metrics"
SCRIPT = SKILL / "scripts" / "business_metrics.py"
FIXTURE = SKILL / "evals" / "files" / "eval1_ledger.beancount"
CLI = REPO / "cli"


@unittest.skipUnless(shutil.which("uv"), "uv is needed to run the checkout's bea")
class BusinessMetrics(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.bea = self.root / "real-bea"
        self.bea.write_text(f'#!/bin/sh\nexec uv run --quiet --project "{CLI}" bea "$@"\n', encoding="utf-8")
        self.bea.chmod(self.bea.stat().st_mode | stat.S_IXUSR)
        self.env = {**os.environ, "BEA_NO_UPDATE_NOTIFIER": "1", "BEA_CONFIG_DIR": str(self.root / "config")}

    def run_script(self, *extra: str, ledger: Path = FIXTURE) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), "--bea", str(self.bea), "--file", str(ledger), *extra],
            capture_output=True,
            text=True,
            env=self.env,
            check=False,
        )

    def figures(self, *extra: str, ledger: Path = FIXTURE) -> dict:
        done = self.run_script("--json", *extra, ledger=ledger)
        self.assertEqual(done.returncode, 0, done.stderr)
        return json.loads(done.stdout)

    def test_burn_excludes_financing_investing_and_the_internal_transfer(self) -> None:
        data = self.figures("--through", "2026-06")
        burn = {row["month"]: row["net_burn"]["USD"] for row in data["months"]}
        # Hand-computed: operating = revenue - rent - payroll - software, per month.
        self.assertEqual(burn, {"2026-01": "-1000.00", "2026-02": "5000.00", "2026-03": "6000.00",
                                "2026-04": "4000.00", "2026-05": "5000.00", "2026-06": "5000.00"})
        may = next(row for row in data["months"] if row["month"] == "2026-05")
        # The seed round and the equipment purchase are shown, and are not burn.
        self.assertEqual((may["financing"]["USD"], may["investing"]["USD"]), ("100000.00", "-8000.00"))
        # The April transfer to savings moves no cash out of the perimeter.
        april = next(row for row in data["months"] if row["month"] == "2026-04")
        self.assertEqual((april["operating"]["USD"], april["closing"]["USD"]), ("-4000.00", "36000.00"))

    def test_runway_is_closing_cash_over_the_stated_average_burn(self) -> None:
        plan = self.figures("--through", "2026-06")["runway"]
        usd = plan["currencies"]["USD"]
        # (4000 + 5000 + 5000) / 3 = 4666.67; 118000 / 4666.666... = 25.2857 -> 25.3.
        self.assertEqual((plan["basis_months"], usd["average_net_burn"], usd["closing_cash"], usd["months"]),
                         (3, "4666.67", "118000.00", "25.3"))
        wider = self.figures("--through", "2026-06", "--runway-months", "6")["runway"]["currencies"]["USD"]
        # (-1000 + 5000 + 6000 + 4000 + 5000 + 5000) / 6 = 4000.00; 118000 / 4000 = 29.5.
        self.assertEqual((wider["average_net_burn"], wider["months"]), ("4000.00", "29.5"))

    def test_a_runway_basis_longer_than_the_history_is_not_stated(self) -> None:
        plan = self.figures("--through", "2026-02", "--months", "6", "--runway-months", "3")["runway"]
        self.assertEqual(plan["status"], "insufficient-history")
        self.assertEqual(plan["currencies"], {})
        self.assertIn("only 2 of the 3 months", plan["reason"])

    def test_a_ledger_that_is_not_burning_has_no_runway(self) -> None:
        # January alone: revenue exceeded outflows, so net burn is negative.
        data = self.figures("--through", "2026-01", "--months", "1", "--runway-months", "1")
        entry = data["runway"]["currencies"]["USD"]
        self.assertEqual(entry["status"], "not-burning")
        self.assertNotIn("months", entry)

    def test_unsupported_metrics_are_listed_as_not_computed(self) -> None:
        data = self.figures("--through", "2026-06")
        self.assertEqual(data["not_computed"]["metrics"], ["ARR", "MRR", "CAC", "LTV", "churn", "retention", "cohorts"])
        text = self.run_script("--through", "2026-06").stdout
        self.assertIn("## Not computed", text)
        self.assertIn("none is computed or estimated here", text)
        for forbidden in ("ARR:", "MRR:", "CAC:", "LTV:"):
            self.assertNotIn(f"\n{forbidden}", text)

    def test_the_cash_perimeter_and_its_basis_are_stated(self) -> None:
        text = self.run_script("--through", "2026-06").stdout
        self.assertIn("Assets:Bank:Checking (heuristic)", text)
        self.assertIn("Assets:Bank:Savings (heuristic)", text)

    def test_a_period_before_the_ledger_starts_is_refused(self) -> None:
        done = self.run_script("--through", "2025-06", "--months", "3")
        self.assertEqual(done.returncode, 2)
        self.assertIn("starts in 2026-01", done.stderr)

    def test_bad_arguments_and_a_red_ledger_are_usage_errors(self) -> None:
        self.assertEqual(self.run_script("--through", "June").returncode, 2)
        self.assertEqual(self.run_script("--through", "2026-06", "--runway-months", "9").returncode, 2)
        broken = self.root / "broken.beancount"
        broken.write_text(FIXTURE.read_text() + '2026-06-29 * "Bad"\n  Expenses:Nowhere 1 USD\n  Assets:Bank:Checking\n')
        done = self.run_script("--through", "2026-06", ledger=broken)
        self.assertEqual(done.returncode, 2)
        self.assertIn("`bea check`", done.stderr)

    def test_the_ledger_is_not_modified(self) -> None:
        before = FIXTURE.read_bytes()
        self.run_script("--through", "2026-06")
        self.assertEqual(FIXTURE.read_bytes(), before)


if __name__ == "__main__":
    unittest.main(verbosity=2)
