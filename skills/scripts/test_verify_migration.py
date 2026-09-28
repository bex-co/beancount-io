#!/usr/bin/env python3
"""Exercise the migration verifier against real bea and isolated Git ledgers.

BEA=/absolute/path/to/bea python3 skills/scripts/test_verify_migration.py

The overlap tests run `bea import` itself, so BEA must include the
migrated-history matching from w5/020; the checkout's `cli/.venv/bin/bea`
is preferred for that reason.
"""
import csv
from decimal import Decimal
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('verify_migration', SCRIPTS / 'verify-migration.py')
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)
CHECKOUT_BEA = SCRIPTS.parents[1] / 'cli/.venv/bin/bea'
BEA = os.environ.get('BEA') or (str(CHECKOUT_BEA) if CHECKOUT_BEA.is_file() else shutil.which('bea'))
FIXTURES = SCRIPTS.parent / 'docs/examples/migration'
EVAL_EXPORT = SCRIPTS.parent / '.claude/skills/beancount-migrate/evals/files/eval2_monarch.csv'


def digest(prefix, date, amount, description, account):
    """The documented hash input from beancount-import's dedup.md, computed independently."""
    exact = format(Decimal(amount).normalize(), 'f')
    base = f'{date}|{exact} USD|{" ".join(description.upper().split())}|{account}'
    return f'{prefix}:sha256:' + hashlib.sha256(base.encode()).hexdigest()[:16]


class MigrationFixtureTests(unittest.TestCase):
    def setUp(self):
        self.expected = json.loads(verify.EXPECTATIONS.read_text())

    def test_export_is_the_migrate_skills_eval_fixture(self):
        self.assertEqual((FIXTURES / 'monarch-export.csv').read_bytes(), EVAL_EXPORT.read_bytes())

    def test_every_source_row_has_its_documented_id_and_one_disposition(self):
        with (FIXTURES / 'monarch-export.csv').open(newline='') as stream:
            rows = list(csv.DictReader(stream))
        mapping = self.expected['account_mapping']
        self.assertEqual(len(rows), len(self.expected['source_rows']))
        for source, row in zip(rows, self.expected['source_rows']):
            account = mapping[source['Account']]
            self.assertEqual(row['account'], account)
            self.assertEqual(Decimal(row['amount']), Decimal(source['Amount']))
            self.assertEqual(row['import_id'], digest('monarch', source['Date'], source['Amount'],
                                                      source['Original Statement'], account))
            holders = [k for k, t in self.expected['transactions'].items() if row['import_id'] in t['import_ids']]
            self.assertEqual(holders, [row['transaction']])
        transfer = self.expected['transactions']['transfer']['import_ids']
        self.assertEqual(len(transfer), 2, 'a merged transfer keeps both source identities')

    def test_anchors_follow_from_openings_and_rows(self):
        for account, anchor in self.expected['anchors'].items():
            total = Decimal(self.expected['openings'][account]['amount'])
            total += sum(Decimal(r['amount']) for r in self.expected['source_rows'] if r['account'] == account)
            self.assertEqual(total, Decimal(anchor))
            residual = Decimal(self.expected['conflicting_anchors'][account]) - total
            self.assertEqual(residual, Decimal(self.expected['conflict_residuals'].get(account, '0')))

    def test_new_import_row_id_matches_the_bank_export(self):
        with (FIXTURES / 'checking-april.csv').open(newline='') as stream:
            new = list(csv.DictReader(stream))[-1]
        april = self.expected['transactions']['april-groceries']
        self.assertEqual(april['import_ids'], [digest('csv', new['Date'], new['Amount'], new['Description'],
                                                      'Assets:Checking')])


class VerifyMigrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not BEA or not shutil.which(BEA):
            raise RuntimeError('bea is required: set BEA to an installed executable or run uv sync in cli/.')

    def setUp(self):
        scratch = SCRIPTS.parent / 'tmp'
        scratch.mkdir(exist_ok=True)
        temporary = tempfile.TemporaryDirectory(dir=scratch)
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.workspace = self.root / 'books'
        self.workspace.mkdir()
        self.ledger = self.workspace / 'main.bean'
        self.expected = json.loads(verify.EXPECTATIONS.read_text())
        self.env = {
            **os.environ,
            'BEA_CONFIG_DIR': str(self.root / 'bea-config'),
            'XDG_CONFIG_HOME': str(self.root / 'xdg-config'),
            'XDG_CACHE_HOME': str(self.root / 'xdg-cache'),
            'GIT_OPTIONAL_LOCKS': '0',
        }
        for name in ('BEA_FILE', 'BEA_TOKEN', 'BEA_ENGINE_PYTHON', 'BEA_ENGINE_DIR'):
            self.env.pop(name, None)
        self.git('init', '-q')
        self.write('initialized')
        self.commit()

    def git(self, *args):
        return subprocess.run(['git', '-c', 'user.name=Fixture Tester', '-c', 'user.email=fixture@example.invalid',
                               '-c', f'core.hooksPath={self.root / "empty-hooks"}', '-c', 'commit.gpgsign=false',
                               '-C', str(self.workspace), *args], env=self.env, check=True, capture_output=True,
                              timeout=30).stdout

    def commit(self):
        self.git('add', '-A')
        self.git('commit', '-q', '--allow-empty', '-m', 'checkpoint')

    def write(self, checkpoint, *, transactions=None, assertions=None, extra=''):
        state = self.expected['checkpoints'][checkpoint]
        accounts = sorted({p['account'] for t in self.expected['transactions'].values() for p in t['postings']})
        opened = self.expected['open_date']
        lines = ['option "operating_currency" "USD"', *(f'{opened} open {a} USD' for a in accounts), '']
        for key in state['transactions'] if transactions is None else transactions:
            t = self.expected['transactions'][key]
            lines.append(f'{t["date"]} * "{key}"')
            lines += [f'  {k}: "{v}"' for k, v in zip(('import-id', 'import-id-2'), t['import_ids'])]
            lines += [f'  {p["account"]}  {p["number"]} USD' for p in t['postings']]
            lines.append('')
        for a in state['assertions'] if assertions is None else assertions:
            lines.append(f'{self.expected["assertion_date"]} balance {a["account"]}  {a["number"]} USD')
        self.ledger.write_text('\n'.join(lines) + '\n' + extra)

    def run_verifier(self, *args):
        return subprocess.run(['python3', str(SCRIPTS / 'verify-migration.py'), *args, '--workspace',
                               str(self.workspace)], env=self.env, capture_output=True, text=True, timeout=180)

    def check(self, checkpoint, *args):
        return self.run_verifier('verify', '--checkpoint', checkpoint, '--bea', BEA, *args)

    def snapshot(self, name='before.json'):
        path = self.root / name
        result = self.run_verifier('snapshot', '--output', str(path))
        self.assertEqual(result.returncode, 0, result.stderr)
        return path

    def assert_fails(self, checkpoint, message, *args):
        result = self.check(checkpoint, *args)
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn(message, result.stderr)

    def bea_import(self, export):
        account = self.expected['imports'][export]['account']
        result = subprocess.run(
            [BEA, '--file', str(self.ledger), '--json', '--no-input', 'import', str(FIXTURES / export),
             '--csv', self.expected['csv_mapping'], '--account', account, '--date-format',
             self.expected['date_format'], '--default-account', 'Expenses:Groceries', '--apply'],
            cwd=self.workspace, env=self.env, capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)['data']

    def test_migrated_ledger_passes_and_verification_writes_nothing(self):
        self.write('migrated')
        self.commit()
        before = self.snapshot()
        result = self.check('migrated')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.check('checking_overlap', '--before', str(before)).returncode, 0)

    def test_missing_source_row_fails(self):
        self.write('migrated', transactions=['opening-checking', 'opening-savings', 'paycheck', 'groceries',
                                             'transfer'], assertions=[])
        self.assert_fails('migrated', 'Source row 5 (monarch:sha256:33fe274b8cc7a957) is missing.')

    def test_transfer_booked_from_both_sides_fails(self):
        self.write('migrated', assertions=[], extra='\n2026-03-10 * "Transfer again"\n'
                   '  import-id: "monarch:sha256:0218b42481730d49"\n'
                   '  Assets:Savings  500.00 USD\n  Equity:OpeningBalances  -500.00 USD\n')
        self.assert_fails('migrated', 'Merged transfer transfer lacks one of its source identities')

    def test_duplicated_merged_transfer_fails(self):
        keys = self.expected['checkpoints']['migrated']['transactions'] + ['transfer']
        self.write('migrated', transactions=keys, assertions=[])
        self.assert_fails('migrated', 'is recorded 2 times.')

    def test_missing_second_side_identity_fails(self):
        self.write('migrated')
        text = self.ledger.read_text()
        self.ledger.write_text(text.replace('  import-id-2: "monarch:sha256:0218b42481730d49"\n', ''))
        self.assert_fails('migrated', 'Merged transfer transfer lacks one of its source identities')

    def test_pad_adjustment_to_an_anchor_fails(self):
        self.write('migrated', assertions=[], extra='\n2026-03-20 pad Assets:Checking Equity:OpeningBalances\n'
                   '2026-03-21 balance Assets:Checking  2500.00 USD\n')
        self.assert_fails('migrated', 'Transactions differ from the checkpoint: 0 missing, 1 unexpected')

    def test_fabricated_residual_on_conflicting_branch_fails(self):
        self.write('conflicting_balance')
        self.assertEqual(self.check('conflicting_balance').returncode, 0)
        self.write('conflicting_balance', extra='\n2026-03-15 * "Migration residual"\n'
                   '  Assets:Checking  10.00 USD\n  Equity:OpeningBalances  -10.00 USD\n')
        self.assert_fails('conflicting_balance', 'Transactions differ from the checkpoint')

    def test_unchanged_branch_requires_before_and_detects_any_write(self):
        self.write('migrated')
        self.commit()
        self.assert_fails('checking_overlap', 'requires --before')
        before = self.snapshot()
        (self.workspace / 'import-rules.toml').write_text('# created after the snapshot\n')
        self.assert_fails('checking_overlap', 'Workspace files changed', '--before', str(before))

    def test_overlap_imports_from_both_sides_leave_the_ledger_unchanged(self):
        self.write('migrated')
        self.commit()
        before = self.snapshot()
        for export, name in (('checking-overlap.csv', 'checking_overlap'), ('savings-overlap.csv', 'savings_overlap')):
            wanted = self.expected['imports'][export]
            data = self.bea_import(export)
            self.assertEqual((data['written'], data['duplicates']),
                             (len(wanted['new_transactions']), wanted['overlap_rows']), export)
            result = self.check(name, '--before', str(before))
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_new_activity_is_imported_exactly_once(self):
        self.write('migrated')
        self.commit()
        self.assertEqual(self.bea_import('checking-april.csv')['written'], 1)
        result = self.check('imported_new')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.commit()
        before = self.snapshot()
        self.assertEqual(self.bea_import('checking-april.csv')['written'], 0)
        result = self.check('reimported_new', '--before', str(before))
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    unittest.main(verbosity=2)
