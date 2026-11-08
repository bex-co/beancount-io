#!/usr/bin/env python3
"""Exercise the first-year investor verifier against real bea and isolated Git ledgers.

BEA=/absolute/path/to/bea python3 scripts/skills/test_verify_first_year_investor.py
"""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest import mock

SCRIPTS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('verify_first_year_investor', SCRIPTS / 'verify-first-year-investor.py')
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)
BEA = os.environ.get('BEA') or shutil.which('bea')
if not BEA:
    candidate = SCRIPTS.parents[1] / 'cli/.venv/bin/bea'
    if candidate.is_file():
        BEA = str(candidate)

FINAL_LEDGER = '''option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Assets:Brokerage USD,VTI "FIFO"
2026-01-01 open Assets:Crypto:Wallet BTC,ETH
2026-01-01 open Assets:Property:OakSt OAKST
2026-01-01 open Assets:Escrow:OakSt USD
2026-01-01 open Liabilities:Mortgage:OakSt USD
2026-01-01 open Income:Dividends USD
2026-01-01 open Income:CapitalGains USD
2026-01-01 open Expenses:Interest USD
2026-01-01 open Expenses:ClosingCosts USD
2026-01-01 open Expenses:Fees USD
2026-01-01 open Equity:OpeningBalances
2026-01-01 * "Opening balances"
  Assets:Checking  150000.00 USD
  Equity:OpeningBalances
2026-01-01 * "Opening lots (broker cost-basis export)"
  Assets:Brokerage  10 VTI {100.00 USD, 2023-05-01}
  Assets:Brokerage  5 VTI {120.00 USD, 2024-06-15}
  Assets:Brokerage  1000.00 USD
  Equity:OpeningBalances -2600.00 USD
2026-01-01 * "Opening lots (exchange cost-basis export)"
  Assets:Crypto:Wallet  0.500000 BTC {40000.00 USD, 2025-01-10}
  Equity:OpeningBalances -20000.00 USD
2026-02-01 * "Buy Oak St (closing statement)"
  Assets:Property:OakSt  1 OAKST {510000.00 USD}
  Assets:Escrow:OakSt  3000.00 USD
  Expenses:ClosingCosts  2000.00 USD
  Assets:Checking  -115000.00 USD
  Liabilities:Mortgage:OakSt  -400000.00 USD
2026-04-01 * "YOU BOUGHT VTI"
  import-id: "csv:sha256:4dcaf53cdd65f541"
  Assets:Brokerage  10 VTI {250.00 USD}
  Assets:Brokerage -2505.00 USD
  Expenses:Fees 5.00 USD
2026-04-02 * "DIVIDEND RECEIVED VTI"
  import-id: "csv:sha256:9ec5c32f80d4d599"
  Assets:Brokerage  42.50 USD
  Income:Dividends
2026-04-03 * "YOU SOLD VTI"
  import-id: "csv:sha256:67af13e02ba9bbc1"
  Assets:Brokerage  -5 VTI {100.00 USD, 2023-05-01} @ 300.00 USD
  Assets:Brokerage  1495.00 USD
  Expenses:Fees 5.00 USD
  Income:CapitalGains
2026-03-01 * "Mortgage payment (statement: new balance 399400.00)"
  Assets:Checking  -2400.00 USD
  Liabilities:Mortgage:OakSt  600.00 USD
  Expenses:Interest  1500.00 USD
  Assets:Escrow:OakSt  300.00 USD
2026-04-01 * "Mortgage payment (statement: new balance 398790.00)"
  Assets:Checking  -2400.00 USD
  Liabilities:Mortgage:OakSt  610.00 USD
  Expenses:Interest  1490.00 USD
  Assets:Escrow:OakSt  300.00 USD
2026-05-01 * "Mortgage payment (statement: new balance 398170.00)"
  Assets:Checking  -2400.00 USD
  Liabilities:Mortgage:OakSt  620.00 USD
  Expenses:Interest  1480.00 USD
  Assets:Escrow:OakSt  300.00 USD
2026-06-01 * "Mortgage payment (statement: new balance 397540.00)"
  Assets:Checking  -2400.00 USD
  Liabilities:Mortgage:OakSt  630.00 USD
  Expenses:Interest  1470.00 USD
  Assets:Escrow:OakSt  300.00 USD
2026-06-15 * "Swap BTC for ETH"
  Assets:Crypto:Wallet  -0.200000 BTC {40000.00 USD, 2025-01-10} @@ 12000.00 USD
  Assets:Crypto:Wallet  4.000000 ETH {3000.00 USD}
  Income:CapitalGains
2026-07-01 balance Assets:Checking  25400.00 USD
2026-12-01 price VTI 300.00 USD
2026-12-01 price BTC 60000.00 USD
2026-12-01 price ETH 3000.00 USD
2026-12-01 price OAKST 620000.00 USD
'''


class VerifyFirstYearInvestorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not BEA or not shutil.which(BEA):
            raise RuntimeError('bea is required: set BEA to an installed executable or run uv sync in cli/.')

    def setUp(self):
        scratch = SCRIPTS / 'tmp'
        scratch.mkdir(exist_ok=True)
        temporary = tempfile.TemporaryDirectory(dir=scratch)
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.workspace = self.root / 'books'
        self.workspace.mkdir()
        self.ledger = self.workspace / 'main.bean'
        self.ledger.write_text(FINAL_LEDGER)
        self.env = {
            **os.environ,
            'BEA_CONFIG_DIR': str(self.root / 'bea-config'),
            'XDG_CONFIG_HOME': str(self.root / 'xdg-config'),
            'XDG_CACHE_HOME': str(self.root / 'xdg-cache'),
            'GIT_OPTIONAL_LOCKS': '0',
        }
        for name in ('BEA_FILE', 'BEA_TOKEN', 'BEA_ENGINE_PYTHON', 'BEA_ENGINE_DIR'):
            self.env.pop(name, None)
        patch = mock.patch.dict(os.environ, self.env, clear=True)
        patch.start()
        self.addCleanup(patch.stop)
        self.git('init', '-q')
        self.git('config', 'commit.gpgsign', 'false')
        self.git('add', 'main.bean')
        self.git('commit', '-qm', 'Synthetic journey ledger')

    def git(self, *args):
        return subprocess.run(['git', '-c', 'user.name=Fixture Tester',
                               '-c', 'user.email=fixture@example.invalid',
                               '-C', str(self.workspace), *args],
                              check=True, capture_output=True, text=True)

    def run_verify(self, checkpoint, *extra):
        return verify.main(['verify', '--workspace', str(self.workspace),
                            '--checkpoint', checkpoint, '--bea', BEA, *extra])

    def test_final_state_passes_year_end_swapped_and_paid(self):
        for name in ('year_end', 'swapped', 'paid'):
            self.assertEqual(self.run_verify(name), 0, name)

    def test_stale_checkpoint_and_tampered_figure_fail(self):
        self.assertEqual(self.run_verify('seeded'), 1)
        self.ledger.write_text(FINAL_LEDGER.replace('price VTI 300.00', 'price VTI 310.00'))
        self.assertEqual(self.run_verify('year_end'), 1)

    def test_snapshot_works_before_the_first_commit(self):
        fresh = self.root / 'fresh'
        fresh.mkdir()
        (fresh / 'main.bean').write_text(FINAL_LEDGER)
        subprocess.run(['git', '-C', str(fresh), 'init', '-q'], check=True, capture_output=True)
        out = self.root / 'fresh-snap.json'
        self.assertEqual(verify.main(['snapshot', '--workspace', str(fresh),
                                      '--output', str(out)]), 0)
        self.assertIsNone(json.loads(out.read_text())['head'])

    def test_unknown_checkpoint_and_snapshot_inside_workspace_fail(self):
        self.assertEqual(self.run_verify('nonsense'), 1)
        code = verify.main(['snapshot', '--workspace', str(self.workspace),
                            '--output', str(self.workspace / 'snap.json')])
        self.assertEqual(code, 1)

    def test_closed_june_requires_the_close_commit_shape(self):
        before = self.root / 'before.json'
        self.assertEqual(verify.main(['snapshot', '--workspace', str(self.workspace),
                                      '--output', str(before)]), 0)
        # No new commit yet: closed_june must fail on the commit shape.
        self.assertEqual(self.run_verify('closed_june', '--before', str(before)), 1)
        self.ledger.write_text(FINAL_LEDGER + '\n; close marker (synthetic)\n')
        self.git('add', 'main.bean')
        before2 = self.root / 'before-close.json'
        self.assertEqual(verify.main(['snapshot', '--workspace', str(self.workspace),
                                      '--output', str(before2)]), 0)
        self.git('commit', '-qm', 'close: 2026-06 — 1 tied, 5 not tied')
        self.assertEqual(self.run_verify('closed_june', '--before', str(before2)), 0)

    def test_closed_june_as_the_first_commit(self):
        fresh = self.root / 'first-commit'
        fresh.mkdir()
        (fresh / 'main.bean').write_text(FINAL_LEDGER)
        subprocess.run(['git', '-C', str(fresh), 'init', '-q'], check=True, capture_output=True)
        subprocess.run(['git', '-C', str(fresh), 'config', 'commit.gpgsign', 'false'],
                       check=True, capture_output=True)
        subprocess.run(['git', '-c', 'user.name=Fixture Tester', '-c', 'user.email=fixture@example.invalid',
                        '-C', str(fresh), 'add', 'main.bean'], check=True, capture_output=True)
        before = self.root / 'first-commit-before.json'
        self.assertEqual(verify.main(['snapshot', '--workspace', str(fresh),
                                      '--output', str(before)]), 0)
        subprocess.run(['git', '-c', 'user.name=Fixture Tester', '-c', 'user.email=fixture@example.invalid',
                        '-C', str(fresh), 'commit', '-qm', 'close: 2026-06 — 1 tied, 5 not tied'],
                       check=True, capture_output=True)
        self.assertEqual(verify.main(['verify', '--workspace', str(fresh),
                                      '--checkpoint', 'closed_june', '--bea', BEA,
                                      '--before', str(before)]), 0)

    def test_closed_june_rejects_a_leftover_draft_even_with_a_ledger_only_commit(self):
        self.ledger.write_text(FINAL_LEDGER + '\n; approved close\n')
        (self.workspace / '.gitignore').write_text('.cache/\n')
        before = self.root / 'before-draft.json'
        self.assertEqual(verify.main(['snapshot', '--workspace', str(self.workspace),
                                      '--output', str(before)]), 0)
        self.git('add', 'main.bean')
        self.git('commit', '-qm', 'close: 2026-06 — 1 tied, 5 not tied')
        self.assertEqual(self.run_verify('closed_june', '--before', str(before)), 0)
        # Correct financial figures and commit scope do not authorize an extra
        # workspace artifact, even when it is ignored and never committed.
        draft = self.workspace / '.cache' / 'june-close-commit.txt'
        draft.parent.mkdir()
        draft.write_text('Reviewed close message')
        self.assertEqual(self.git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').stdout,
                         'main.bean\n')
        self.assertEqual(self.run_verify('closed_june', '--before', str(before)), 1)


if __name__ == '__main__':
    unittest.main()
