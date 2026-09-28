#!/usr/bin/env python3
"""Exercise the first-month verifier against real bea and isolated Git ledgers.

BEA=/absolute/path/to/bea python3 skills/scripts/test_verify_first_month.py
"""
import contextlib
import csv
from decimal import Decimal
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import re
import shlex
from string import Template
import subprocess
import tempfile
import unittest
from unittest import mock

SCRIPTS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('verify_first_month', SCRIPTS / 'verify-first-month.py')
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)
BEA = os.environ.get('BEA') or shutil.which('bea')
if not BEA:
    # CI's uv sync creates this executable; no CLI implementation is imported.
    candidate = SCRIPTS.parents[1] / 'cli/.venv/bin/bea'
    if candidate.is_file():
        BEA = str(candidate)
FIXTURES = SCRIPTS.parent / 'docs/examples/first-month'
SUITE = SCRIPTS.parent / '.claude/skills'


class VerifyFirstMonthTests(unittest.TestCase):
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
            'GIT_AUTHOR_NAME': 'Fixture Tester', 'GIT_COMMITTER_NAME': 'Fixture Tester',
            'GIT_AUTHOR_EMAIL': 'fixture@example.invalid', 'GIT_COMMITTER_EMAIL': 'fixture@example.invalid',
        }
        for name in ('BEA_FILE', 'BEA_TOKEN', 'BEA_ENGINE_PYTHON', 'BEA_ENGINE_DIR'):
            self.env.pop(name, None)
        patch = mock.patch.dict(os.environ, self.env, clear=True)
        patch.start()
        self.addCleanup(patch.stop)
        self.init_git()
        self.write_checkpoint('initialized')
        self.commit('Initial synthetic ledger')

    def init_git(self):
        self.git('init', '-q')
        self.git('config', 'core.hooksPath', str(self.root / 'empty-hooks'))
        self.git('config', 'commit.gpgsign', 'false')
        self.git('config', 'core.fsmonitor', 'false')

    def git(self, *args):
        return subprocess.run(['git', '-c', 'user.name=Fixture Tester', '-c', 'user.email=fixture@example.invalid',
                               '-c', f'core.hooksPath={self.root / "empty-hooks"}', '-c', 'commit.gpgsign=false',
                               '-C', str(self.workspace), *args], env=self.env, check=True, capture_output=True, timeout=30).stdout

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

    def call(self, checkpoint, before=None, *, bea=None):
        args = ['verify', '--workspace', str(self.workspace), '--checkpoint', checkpoint, '--bea', bea or BEA]
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

    def test_bad_command_observations_and_missing_before_fail(self):
        for label, output, exit_code, expected_error in [
            ('nonzero', '{"data":{"valid":true,"errors":[]},"truncated":false}', 7, 'Command failed (7)'),
            ('malformed', 'this is not JSON', 0, 'Expecting value'),
            ('truncated', '{"data":{"valid":true,"errors":[]},"truncated":true}', 0, 'truncated'),
            ('incomplete', '{"data":{"valid":true,"errors":[]}}', 0, 'completeness'),
            ('error', '{"data":{},"error":"unavailable","truncated":false}', 0, 'returned errors'),
            ('invalid', '{"data":{"valid":false,"errors":[]},"truncated":false}', 0, 'passing error list'),
        ]:
            with self.subTest(observation=label):
                executable = self.root / ('bad-bea-' + label)
                executable.write_text('#!/bin/sh\nprintf %s ' + shlex.quote(output) + f'\nexit {exit_code}\n')
                executable.chmod(0o700)
                before = verify.capture(self.workspace, 'main.bean')
                code, message = self.call('initialized', bea=str(executable))
                self.assertEqual(code, 1, message)
                self.assertIn(expected_error, message)
                self.assertEqual(before, verify.capture(self.workspace, 'main.bean'))
        code, message = self.call('asked')
        self.assertEqual(code, 1)
        self.assertIn('requires --before', message)

    def test_missing_transaction_fails(self):
        # This remains a valid ledger; the verifier must detect the absent coffee.
        self.write_checkpoint('imported')
        self.ledger.write_text(self.ledger.read_text().split('\n2026-08-15 *')[0])
        code, message = self.call('imported')
        self.assertEqual(code, 1)
        self.assertIn('Transaction identities/counts/postings', message)

    def test_unreadable_workspace_file_fails_closed(self):
        unreadable = self.workspace / 'unreadable.txt'
        unreadable.write_text('This file must not be silently skipped.')
        unreadable.chmod(0)
        self.addCleanup(unreadable.chmod, 0o600)
        if os.access(unreadable, os.R_OK):
            # Root can read mode-000 files. Inject the OS error at the I/O boundary,
            # retaining the real snapshot traversal and verifier error handling.
            original = Path.read_bytes
            def read_bytes(path):
                if path == unreadable:
                    raise PermissionError('cannot read workspace file')
                return original(path)
            with mock.patch.object(Path, 'read_bytes', read_bytes):
                code, message = self.call('initialized')
        else:
            code, message = self.call('initialized')
        self.assertEqual(code, 1)
        self.assertIn('FAIL:', message)
        self.assertNotIn('PASS', message)

    def test_decline_detects_index_and_head_changes(self):
        self.write_checkpoint('reconciled')
        before = self.snapshot()
        self.git('add', 'main.bean')
        code, message = self.call('declined_commit', before)
        self.assertEqual(code, 1)
        self.assertIn('Git index changed', message)
        self.git('commit', '-q', '-m', 'Unexpected commit during decline')
        code, message = self.call('declined_commit', before)
        self.assertEqual(code, 1)
        self.assertIn('Git HEAD changed', message)

    def test_close_rejects_incomplete_and_wrong_amount_reports(self):
        self.write_checkpoint('reconciled')
        before = self.snapshot()
        report = ('close: 2026-08 — 1 reconciled, 0 unverified\n\n'
                  'Assets:Checking reconciled\nAssertions: 1 pinned, 0 unpinned\n'
                  'Income: 2000 USD\nExpenses: 58 USD\nNet: 1942 USD\n'
                  'Checking: 2942 USD\nUnverified: 0\nFlags carried: 0\n'
                  'Recurring gaps: 0\nRecurring history: unavailable\ncheck: PASS\n')
        self.commit(report)
        for label, bad_report, reason in [
            ('incomplete', report.replace('Recurring history: unavailable\n', ''), 'Recurring history'),
            ('wrong amount', report.replace('Checking: 2942', 'Checking: 2945'), 'Checking amount'),
        ]:
            with self.subTest(report=label):
                self.git('commit', '-q', '--amend', '-m', bad_report)
                code, message = self.call('closed', before)
                self.assertEqual(code, 1, message)
                self.assertIn(reason, message)

    def test_real_first_month_from_independent_source_files(self):
        # This positive path starts fresh through bea, never rendering a ledger
        # from expectations.json. The earlier synthetic fixtures only seed the
        # separate negative-test workspace.
        self.workspace = self.root / 'real journey with spaces'
        self.workspace.mkdir()
        self.ledger = self.workspace / 'main.bean'
        self.init_git()
        documents = '\n'.join((SUITE / name).read_text() for name in (
            'beancount-init/SKILL.md', 'beancount-init/references/bea-cli.md',
            'beancount-import/references/bea-import.md',
        ))
        values = {
            'directory': str(self.workspace), 'currency': 'USD', 'open_date': '2026-08-01',
            'ledger': str(self.ledger), 'target': 'main.bean',
            'export': str(FIXTURES / 'bank-export.csv'),
            'mapping': 'date=Date,payee=Payee,narration=Narration,amount=Amount,id=ID,sign=bank',
            'account': 'Assets:Checking', 'date_format': '%Y-%m-%d',
            'rules': str(FIXTURES / 'import-rules.toml'), 'duplicates': 'review',
        }
        def recipe(name, *extra):
            match = re.search(rf'<!-- recipe: {re.escape(name)} -->\n```sh\n(.*?)\n```', documents, re.DOTALL)
            self.assertIsNotNone(match, f'Missing canonical recipe: {name}')
            tokens = shlex.split(match[1])
            self.assertEqual(tokens[0], 'bea')
            args = [Template(token).substitute(values) for token in tokens[1:]]
            result = subprocess.run([BEA, *args, *extra], cwd=self.workspace, env=self.env,
                                    capture_output=True, text=True, timeout=90)
            self.assertEqual(result.returncode, 0, result.stderr)
            envelope = json.loads(result.stdout)
            self.assertIs(envelope['truncated'], False)
            return envelope['data']
        def checkpoint(name, before=None):
            code, message = self.call(name, before)
            self.assertEqual(code, 0, message)
        def query(expression):
            result = subprocess.run([BEA, '--file', str(self.ledger), '--json', '--no-input', 'query', expression],
                                    cwd=self.workspace, env=self.env, capture_output=True, text=True, timeout=90)
            self.assertEqual(result.returncode, 0, result.stderr)
            envelope = json.loads(result.stdout)
            self.assertIs(envelope['truncated'], False)
            return envelope['data']['rows']

        created = recipe('init', '--opening-balance', 'Assets:Checking 1000.00')
        self.assertEqual(len(created['accounts']), 14)
        self.commit('Initialize a real CLI-created synthetic ledger')
        checkpoint('initialized')
        before = self.snapshot()
        preview = recipe('csv-preview')
        with (FIXTURES / 'bank-export.csv').open() as source:
            source_rows = list(csv.DictReader(source))
        self.assertEqual(preview['ready'], len(source_rows))
        self.assertEqual([row['amount'] for row in preview['rows']],
                         [row['Amount'] + ' USD' for row in source_rows])
        checkpoint('declined_import', before)
        durable_rules = self.workspace / 'import-rules.toml'
        shutil.copyfile(FIXTURES / 'import-rules.toml', durable_rules)
        values['rules'] = str(durable_rules)
        applied = recipe('csv-apply')
        self.assertEqual(applied['written'], 3)
        checkpoint('imported')
        before = self.snapshot()
        repeated = recipe('csv-apply')
        self.assertEqual(repeated['written'], 0)
        self.assertEqual(repeated['duplicates'], 3)
        checkpoint('reimported', before)

        balance_rows = query("SELECT sum(position) WHERE account = 'Assets:Checking'")
        imported_balance = Decimal(balance_rows[0][0][0]['units']['number'])
        self.assertEqual(imported_balance, Decimal('2945'))
        unresolved = (FIXTURES / 'statement-unresolved.md').read_text()
        claimed = Decimal(re.search(r'Claimed closing balance: \*\*(\d+\.\d+)', unresolved)[1])
        self.assertEqual(imported_balance - claimed, Decimal('4'))
        # Refusing unsupported corrections entails no write command. These
        # assertions cover ledger effects; real transcript coverage is separate.
        for name in ('unresolved_statement', 'missing_statement', 'declined_reconcile'):
            checkpoint(name, before)

        statement = (FIXTURES / 'statement.md').read_text()
        fee = next(line for line in statement.splitlines() if line.startswith('| 2026-08-31 |'))
        date, payee, narration, amount, native_id = [part.strip() for part in fee.split('|')[1:-1]]
        batch = [{
            'date': date, 'flag': '*', 'payee': payee, 'narration': narration,
            'meta': {'import-id': 'bank:' + native_id},
            'postings': [
                {'account': 'Assets:Checking', 'units': {'number': amount, 'currency': 'USD'}},
                {'account': 'Expenses:Fees', 'units': {'number': str(-Decimal(amount)), 'currency': 'USD'}},
            ],
        }]
        batch_path = self.root / 'approved-fee.json'
        batch_path.write_text(json.dumps(batch))
        closing = re.search(r'Closing balance at end of 2026-08-31: \*\*(\d+\.\d+) USD', statement)[1]
        values.update({'batch': str(batch_path), 'assertion_date': '2026-09-01', 'amount': closing + ' USD'})
        self.assertEqual(recipe('batch')['written'], 1)
        recipe('balance')
        self.assertIs(recipe('check')['valid'], True)
        checkpoint('reconciled')
        before = self.snapshot()
        rows = query("SELECT account, sum(cost(position)) AS total WHERE account ~ '^Expenses:' AND date >= 2026-08-01 AND date < 2026-09-01 GROUP BY account ORDER BY account")
        totals = {row[0]: Decimal(row[1][0]['units']['number']) for row in rows}
        self.assertEqual(totals, {'Expenses:Dining': Decimal('5'), 'Expenses:Fees': Decimal('3'), 'Expenses:Groceries': Decimal('50')})
        checkpoint('asked', before)
        checkpoint('declined_commit', before)
        self.commit('close: 2026-08 — 1 reconciled, 0 unverified\n\n'
                    'Assets:Checking reconciled\nChecking: 2942 USD\nIncome: 2000 USD\n'
                    'Expenses: 58 USD\nNet: 1942 USD\nUnverified: 0\n'
                    'Assertions: 1 pinned, 0 unpinned\nFlags carried: 0\n'
                    'Recurring gaps: 0\nRecurring history: unavailable\ncheck: PASS')
        checkpoint('closed', before)
        self.assertEqual(self.git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').decode().strip(), 'main.bean')
        self.assertEqual(durable_rules.read_bytes(), (FIXTURES / 'import-rules.toml').read_bytes())

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
