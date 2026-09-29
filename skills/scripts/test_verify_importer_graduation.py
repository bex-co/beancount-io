#!/usr/bin/env python3
"""Test graduation checkpoints with public bea and isolated synthetic books.

The verifier tests need no optional Beangulp installation: source artifacts
come independently from CSV rows, while a tiny candidate exercises identify's
True/False boundary. Real authoring-harness evidence remains separate.
"""
import contextlib
import csv
from datetime import datetime
from decimal import Decimal
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

SCRIPTS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('verify_importer_graduation', SCRIPTS / 'verify-importer-graduation.py')
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)
CHECKOUT_BEA = SCRIPTS.parents[1] / 'cli/.venv/bin/bea'
BEA = os.environ.get('BEA') or (str(CHECKOUT_BEA) if CHECKOUT_BEA.is_file() else shutil.which('bea'))
FIXTURES = verify.FIXTURES


def source_output(filename):
    """Hand-specified fixture format, independent of the importer and JSON oracle."""
    with (FIXTURES / filename).open(newline='') as stream:
        rows = list(csv.reader(stream))[1:]
    output = []
    for date, description, amount in rows:
        date = datetime.strptime(date, '%m/%d/%Y').date().isoformat()
        identity = f'{date}|{format(Decimal(amount).normalize(), "f")} USD|{description}|Assets:Bank:Checking'
        digest = hashlib.sha256(identity.encode()).hexdigest()[:16]
        output.extend([f'{date} * "{description}"', f'  import-id: "csv:sha256:{digest}"',
                       f'  Assets:Bank:Checking  {amount} USD', ''])
    return '\n'.join(output) + '\n'


class VerifyImporterGraduationTests(unittest.TestCase):
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
        self.ledger = self.workspace / 'ledger.beancount'
        for source, target in [('prior-ledger.beancount', self.ledger),
                               ('seed-import.py', self.workspace / 'import.py'),
                               ('import-rules.toml', self.workspace / 'import-rules.toml')]:
            shutil.copyfile(FIXTURES / source, target)
        self.env = {**os.environ, 'BEA_CONFIG_DIR': str(self.root / 'bea-config'),
                    'XDG_CONFIG_HOME': str(self.root / 'xdg-config'),
                    'XDG_CACHE_HOME': str(self.root / 'xdg-cache'), 'GIT_OPTIONAL_LOCKS': '0'}
        for name in ('BEA_FILE', 'BEA_TOKEN', 'BEA_ENGINE_PYTHON', 'BEA_ENGINE_DIR'):
            self.env.pop(name, None)
        patch = mock.patch.dict(os.environ, self.env, clear=True)
        patch.start()
        self.addCleanup(patch.stop)
        self.git('init', '-q')
        self.git('config', 'core.fsmonitor', 'false')
        self.git('add', '-A')
        self.git('commit', '-q', '-m', 'Existing synthetic history')
        self.before_author = self.snapshot('before-author.json')
        self.write_candidate()
        self.write_goldens()

    def git(self, *args):
        return subprocess.run(['git', '-c', 'user.name=Fixture Tester', '-c', 'user.email=fixture@example.invalid',
                               '-c', f'core.hooksPath={self.root / "empty-hooks"}', '-c', 'commit.gpgsign=false',
                               '-C', str(self.workspace), *args], env=self.env, check=True,
                              capture_output=True, timeout=30).stdout

    def write_candidate(self, *, claim=False, mutate=False):
        # A controlled candidate tests the verifier's identify contract without
        # importing optional Beangulp; this is not an authoring-harness test.
        path = self.workspace / 'importers/chase.py'
        path.parent.mkdir(exist_ok=True)
        body = ('from pathlib import Path\n'
                'class Importer:\n'
                '    def __init__(self, account, currency): pass\n'
                '    def identify(self, filepath):\n')
        if mutate:
            body += '        Path("unexpected.txt").write_text("side effect")\n'
        body += f'        return {claim!r}\n'
        path.write_text(body)

    def write_goldens(self, *, repaired=False):
        sources = (*verify.ORIGINALS, 'renamed-headers.csv') if repaired else verify.ORIGINALS
        for source in sources:
            path = self.workspace / verify.golden_path(source)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(source_output(source))

    def invoke(self, args):
        with contextlib.redirect_stdout(io.StringIO()) as out, contextlib.redirect_stderr(io.StringIO()) as err:
            code = verify.main(args)
        return code, out.getvalue() + err.getvalue()

    def snapshot(self, name='before.json'):
        path = self.root / name
        code, output = self.invoke(['snapshot', '--workspace', str(self.workspace), '--output', str(path)])
        self.assertEqual(code, 0, output)
        return path

    def call(self, checkpoint, *, before=None, goldens_before=None, python=None):
        args = ['verify', '--workspace', str(self.workspace), '--checkpoint', checkpoint, '--bea', BEA]
        for option, value in [('--before', before), ('--goldens-before', goldens_before), ('--python', python)]:
            if value:
                args += [option, str(value)]
        return self.invoke(args)

    def assert_passes(self, checkpoint, **kwargs):
        before = verify.capture(self.workspace, 'ledger.beancount')
        code, message = self.call(checkpoint, **kwargs)
        self.assertEqual(code, 0, message)
        self.assertEqual(before, verify.capture(self.workspace, 'ledger.beancount'))

    def assert_fails(self, checkpoint, reason, **kwargs):
        code, message = self.call(checkpoint, **kwargs)
        self.assertEqual(code, 1, message)
        self.assertIn(reason, message)

    def apply_source(self, source):
        mapping = ('date=Post Date,narration=Details,amount=Value,sign=bank'
                   if source == 'renamed-headers.csv' else
                   'date=Date,narration=Description,amount=Amount,sign=bank')
        result = subprocess.run([BEA, '--file', str(self.ledger), '--json', '--no-input', 'import',
                                 str(FIXTURES / source), '--csv', mapping, '--account', 'Assets:Bank:Checking',
                                 '--date-format', '%m/%d/%Y', '--rules', str(self.workspace / 'import-rules.toml'),
                                 '--into', str(self.ledger), '--apply'], env=self.env,
                                capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)['data']

    def test_source_driven_journey_and_all_readonly_checkpoints(self):
        self.assert_passes('prior')
        self.assert_passes('authored', before=self.before_author)
        self.assert_passes('declined_wiring', before=self.snapshot())
        with (self.workspace / 'import.py').open('a') as stream:
            stream.write('\n# Approved wiring change in this verifier fixture.\n')
        self.assert_passes('wired', before=self.before_author)
        before = self.snapshot('overlap.json')
        self.assertEqual(self.apply_source('prior-history.csv')['written'], 0)
        self.assert_passes('prior_overlap', before=before)
        self.assertEqual(self.apply_source('activity.csv')['written'], 2)
        self.assert_passes('imported_new')
        before = self.snapshot('repeat-activity.json')
        self.assertEqual(self.apply_source('activity.csv')['written'], 0)
        self.assert_passes('reimported_activity', before=before)
        old_goldens = self.snapshot('before-repair.json')
        self.assert_passes('unrepaired_headers', before=old_goldens, python=sys.executable)
        self.write_goldens(repaired=True)
        self.assert_passes('repair_reviewed', goldens_before=old_goldens)
        self.assertEqual(self.apply_source('renamed-headers.csv')['written'], 1)
        self.assert_passes('repaired', goldens_before=old_goldens)
        before = self.snapshot('repeat-repair.json')
        self.assertEqual(self.apply_source('renamed-headers.csv')['written'], 0)
        self.assert_passes('reimported_repair', before=before, goldens_before=old_goldens)
        self.assert_passes('unrelated', before=before, goldens_before=old_goldens, python=sys.executable)

    def test_balanced_wrong_amount_sign_lost_id_and_duplicate_fail(self):
        original = self.ledger.read_text()
        variants = [
            original.replace('-33.20 USD', '-34.20 USD').replace('      33.20 USD', '      34.20 USD'),
            original.replace('-33.20 USD', 'SIGN_SWAPPED').replace('33.20 USD', '-33.20 USD').replace('SIGN_SWAPPED', '33.20 USD'),
            original.replace('  import-id: "csv:sha256:a8362f899f1ef12a"\n', ''),
            original + '\n' + original[original.index('2026-04-03 *'):original.index('2026-04-18 *')],
        ]
        for bad in variants:
            with self.subTest(variant=variants.index(bad)):
                self.ledger.write_text(bad)
                self.assert_fails('prior', 'Ledger transaction identities/counts/postings')

    def test_goldens_are_checked_against_sources_not_just_a_green_harness(self):
        path = self.workspace / verify.golden_path('activity.csv')
        original = path.read_text()
        for bad in [original.replace('-28.75 USD', '28.75 USD'),
                    original.replace('csv:sha256:4bb21afcb4079451', 'csv:sha256:0000000000000000'),
                    original + source_output('prior-history.csv')]:
            path.write_text(bad)
            self.assert_fails('authored', 'Source-only extraction identities/counts/postings', before=self.before_author)

    def test_original_golden_rewrite_is_rejected_even_when_semantics_match(self):
        self.apply_source('activity.csv')
        baseline = self.snapshot('old-goldens.json')
        self.write_goldens(repaired=True)
        with (self.workspace / verify.golden_path('prior-history.csv')).open('a') as stream:
            stream.write('; A semantic no-op still overwrites the reviewed baseline.\n')
        self.assert_fails('repair_reviewed', 'Original golden changed', goldens_before=baseline)

    def test_authored_and_declined_wiring_preserve_existing_files(self):
        before = self.snapshot('decline.json')
        runner = self.workspace / 'import.py'
        runner.write_text(runner.read_text() + '\n# unapproved wiring\n')
        self.assert_fails('authored', 'Previously existing file changed: import.py', before=self.before_author)
        self.assert_fails('declined_wiring', 'Workspace files changed', before=before)
        self.ledger.write_text(self.ledger.read_text() + '\n; unauthorized ledger change\n')
        self.assert_fails('wired', 'Previously existing file changed: ledger.beancount', before=self.before_author)

    def test_decline_detects_git_index_and_head_mutation(self):
        before = self.snapshot('git-state.json')
        self.git('add', 'importers')
        self.assert_fails('declined_wiring', 'Git index changed', before=before)
        self.git('commit', '-q', '-m', 'Unexpected commit')
        self.assert_fails('declined_wiring', 'Git HEAD changed', before=before)

    def test_rejected_input_is_verified_and_candidate_side_effects_fail(self):
        self.apply_source('activity.csv')
        self.write_candidate(claim=True)
        before = self.snapshot('identify.json')
        self.assert_fails('unrepaired_headers', 'incorrectly claims renamed-headers.csv', before=before, python=sys.executable)
        self.write_candidate(mutate=True)
        before = self.snapshot('mutation.json')
        self.assert_fails('unrepaired_headers', 'Workspace files changed', before=before, python=sys.executable)

    def test_verifier_detects_its_own_ledger_mutation(self):
        original = verify.verify_ledger
        def mutating(*args):
            original(*args)
            self.ledger.write_text(self.ledger.read_text() + '\n; verifier side effect\n')
        with mock.patch.object(verify, 'verify_ledger', side_effect=mutating):
            self.assert_fails('prior', 'Workspace files changed')

    def test_required_evidence_is_not_optional(self):
        self.assert_fails('authored', 'requires --before')
        self.assert_fails('declined_wiring', 'requires --before')
        self.assert_fails('repair_reviewed', 'requires --goldens-before')
        self.assert_fails('unrepaired_headers', 'requires --python', before=self.before_author)

    def test_source_only_command_rejects_balanced_or_changed_extraction(self):
        path = self.root / 'runtime-extracted.bean'
        path.write_text(source_output('activity.csv'))
        args = ['extraction', '--file', str(path), '--source', 'activity.csv', '--bea', BEA]
        before = path.read_bytes()
        code, message = self.invoke(args)
        self.assertEqual(code, 0, message)
        self.assertEqual(path.read_bytes(), before)
        path.write_text(path.read_text().replace('  Assets:Bank:Checking  2500.00 USD',
                                                '  Assets:Bank:Checking  2500.00 USD\n  Income:Salary  -2500.00 USD'))
        code, message = self.invoke(args)
        self.assertEqual(code, 1, message)
        self.assertIn('Source-only extraction identities/counts/postings', message)


if __name__ == '__main__':
    unittest.main()
