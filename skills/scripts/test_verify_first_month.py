#!/usr/bin/env python3
"""Exercise the first-month verifier against real bea and isolated Git ledgers.

BEA=/absolute/path/to/bea python3 skills/scripts/test_verify_first_month.py
"""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest import mock

SCRIPTS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('verify_first_month', SCRIPTS / 'verify-first-month.py')
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)
BEA = os.environ.get('BEA') or shutil.which('bea')


@unittest.skipUnless(BEA, 'bea is required for observable ledger checks')
class VerifyFirstMonthTests(unittest.TestCase):
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
        self.git('init', '-q')
        self.write_checkpoint('initialized')
        self.commit('Initial synthetic ledger')

    def git(self, *args):
        return subprocess.run(['git', '-c', 'user.name=Fixture Tester', '-c', 'user.email=fixture@example.invalid',
                               '-C', str(self.workspace), *args], check=True, capture_output=True).stdout

    def commit(self, message):
        self.git('add', 'main.bean')
        self.git('commit', '-q', '-m', message)

    def write_checkpoint(self, checkpoint):
        transactions = self.expected['transactions']
        accounts = sorted({p['account'] for t in transactions.values() for p in t['postings']})
        text = 'option "operating_currency" "USD"\n' + ''.join(f'2026-08-01 open {a} USD\n' for a in accounts)
        state = self.expected['checkpoints'][checkpoint]
        for key in state['transaction_keys']:
            t = transactions[key]
            text += f'\n{t["date"]} {t["flag"]} '
            if t['payee'] is not None:
                text += json.dumps(t['payee']) + ' '
            text += json.dumps(t['narration']) + '\n'
            if t['import_id']:
                text += f'  import-id: "{t["import_id"]}"\n'
            for p in t['postings']:
                text += f'  {p["account"]}  {p["number"]} {p["currency"]}\n'
        for b in state['assertions']:
            text += f'\n{b["date"]} balance {b["account"]} {b["number"]} {b["currency"]}\n'
        self.ledger.write_text(text)

    def snapshot(self):
        path = self.root / 'before.json'
        path.write_text(json.dumps(verify.capture(self.workspace, 'main.bean')))
        return path

    def call(self, checkpoint, before=None):
        args = ['verify', '--workspace', str(self.workspace), '--checkpoint', checkpoint, '--bea', BEA]
        if before:
            args += ['--before', str(before)]
        with contextlib.redirect_stdout(io.StringIO()) as out, contextlib.redirect_stderr(io.StringIO()) as err:
            code = verify.main(args)
        return code, out.getvalue() + err.getvalue()

    def test_correct_checkpoints_and_readonly_state(self):
        for checkpoint in ['initialized', 'imported', 'reconciled', 'reimported', 'asked',
                           'declined_import', 'declined_reconcile', 'declined_commit',
                           'unresolved_statement', 'missing_statement']:
            with self.subTest(checkpoint=checkpoint):
                key = self.expected['branches'][checkpoint]['ledger_matches'] if checkpoint in self.expected['branches'] else checkpoint
                self.write_checkpoint(key)
                before = self.snapshot()
                state = verify.capture(self.workspace, 'main.bean')
                code, message = self.call(checkpoint, before)
                self.assertEqual(code, 0, message)
                self.assertEqual(state, verify.capture(self.workspace, 'main.bean'))

    def test_duplicate_balanced_entry_fails(self):
        self.write_checkpoint('imported')
        with self.ledger.open('a') as stream:
            stream.write('\n2026-08-15 * "Synthetic Cafe" "Coffee"\n  import-id: "bank:august-coffee"\n  Assets:Checking -5 USD\n  Expenses:Dining 5 USD\n')
        code, message = self.call('imported')
        self.assertEqual(code, 1)
        self.assertIn('Transaction identities/counts/postings', message)

    def test_balanced_wrong_amount_fails(self):
        self.write_checkpoint('imported')
        self.ledger.write_text(self.ledger.read_text().replace('-50.00 USD', '-51.00 USD').replace('50.00 USD', '51.00 USD'))
        code, message = self.call('imported')
        self.assertEqual(code, 1)
        self.assertIn('Transaction identities/counts/postings', message)

    def test_wrong_assertion_date_fails_even_when_check_passes(self):
        self.write_checkpoint('reconciled')
        self.ledger.write_text(self.ledger.read_text().replace('2026-09-01 balance', '2026-09-02 balance'))
        code, message = self.call('reconciled')
        self.assertEqual(code, 1)
        self.assertIn('Balance assertion', message)

    def test_decline_detects_untracked_file_change(self):
        before = self.snapshot()
        (self.workspace / 'unrelated.txt').write_text('unexpected write')
        code, message = self.call('declined_import', before)
        self.assertEqual(code, 1)
        self.assertIn('Workspace files changed', message)

    def test_close_checks_commit_paths_and_report(self):
        self.write_checkpoint('reconciled')
        before = self.snapshot()
        message = self.expected['close']['subject'] + '\n\nAssets:Checking reconciled\nAssertions: 1 pinned, 0 unpinned\nIncome: 2,000 USD\nExpenses: 58.00 USD\nNet: +1942 USD\ncheck: PASS\nChecking: 2,942 USD\nUnverified: 0\nFlags carried: 0\nRecurring gaps: 0\nRecurring history: unavailable\n'
        self.commit(message)
        code, output = self.call('closed', before)
        self.assertEqual(code, 0, output)
        # Same ledger and report, but an unintended path in the amended commit.
        (self.workspace / 'unrelated.txt').write_text('do not commit')
        self.git('add', 'unrelated.txt')
        self.git('commit', '-q', '--amend', '--no-edit')
        # Retain the same file in the prior snapshot, isolating commit-path detection.
        old = json.loads(before.read_text())
        old['files']['unrelated.txt'] = verify.file_identity(self.workspace / 'unrelated.txt')
        before.write_text(json.dumps(old))
        code, output = self.call('closed', before)
        self.assertEqual(code, 1)
        self.assertIn('unexpected paths', output)

    def test_external_include_and_symlink_index_are_rejected(self):
        external = self.root / 'external.bean'
        external.write_text('; unrelated external ledger data\n')
        with self.ledger.open('a') as stream:
            stream.write(f'\ninclude "{external}"\n')
        code, message = self.call('initialized')
        self.assertEqual(code, 1)
        self.assertIn('include directives', message)
        index = self.workspace / '.git/index'
        index.unlink()
        index.symlink_to(self.root / 'absent-index')
        with self.assertRaisesRegex(verify.VerificationError, 'index must not be a symlink'):
            verify.capture(self.workspace, 'main.bean')

    def test_snapshot_paths_and_symlinks(self):
        external = self.root / 'external.txt'
        external.write_text('external')
        (self.workspace / 'link').symlink_to(external)
        snapshot = verify.capture(self.workspace, 'main.bean')
        self.assertEqual(snapshot['files']['link']['target'], str(external))
        self.assertNotIn('sha256', snapshot['files']['link'])
        with contextlib.redirect_stderr(io.StringIO()):
            code = verify.main(['snapshot', '--workspace', str(self.workspace), '--output', str(self.workspace / 'bad.json')])
        self.assertEqual(code, 1)
        self.assertFalse((self.workspace / 'bad.json').exists())

    def test_truncation_command_failure_and_missing_before_fail(self):
        with mock.patch.object(verify, 'run', return_value=b'{"data": [], "truncated": true}'):
            with self.assertRaisesRegex(verify.VerificationError, 'truncated'):
                verify.bea_read(BEA, self.workspace, 'main.bean', 'list', 'transaction')
        code, message = self.call('asked')
        self.assertEqual(code, 1)
        self.assertIn('requires --before', message)
        with mock.patch.object(verify, 'bea_read', side_effect=verify.VerificationError('Command failed')):
            code, message = self.call('initialized')
        self.assertEqual(code, 1)
        self.assertIn('Command failed', message)

    def test_self_mutation_is_detected(self):
        original = verify.verify_ledger
        def mutating_check(*args):
            original(*args)
            (self.workspace / 'unwanted.txt').write_text('side effect')
        with mock.patch.object(verify, 'verify_ledger', side_effect=mutating_check):
            code, message = self.call('initialized')
        self.assertEqual(code, 1)
        self.assertIn('Workspace files changed', message)


if __name__ == '__main__':
    unittest.main()
