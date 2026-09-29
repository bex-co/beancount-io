#!/usr/bin/env python3
"""Read-only checkpoints for the synthetic importer graduation journey.

Ledger checks always require a clean bea check. Source-only golden/extraction
files deliberately lack counter-postings, so only their inspection uses
--allow-errors. They are compared to independently reviewed source identities
and amounts, never treated as complete ledgers or approved by this verifier.
Harness results, identification, and human approval remain separate evidence.
"""
from __future__ import annotations

import argparse
from collections import Counter
from decimal import InvalidOperation
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys

SCRIPTS = Path(__file__).resolve().parent
FIXTURES = SCRIPTS.parent / 'docs/examples/importer-graduation'
EXPECTATIONS = FIXTURES / 'expectations.json'
_spec = importlib.util.spec_from_file_location('verify_first_month', SCRIPTS / 'verify-first-month.py')
assert _spec is not None and _spec.loader is not None
first_month = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(first_month)
VerificationError, require = first_month.VerificationError, first_month.require
capture, unchanged, bea_read = first_month.capture, first_month.unchanged, first_month.bea_read
postings, number = first_month.posting_signature, first_month.number
ORIGINALS = ('prior-history.csv', 'activity.csv')
REPAIR_STAGES = {'repair_reviewed', 'repaired', 'reimported_repair', 'unrelated'}
UNCHANGED = {'declined_wiring', 'prior_overlap', 'reimported_activity',
             'unrepaired_headers', 'reimported_repair', 'unrelated'}
STATES = {
    'prior': 'prior', 'authored': 'prior', 'declined_wiring': 'prior',
    'wired': 'prior', 'prior_overlap': 'prior', 'imported_new': 'imported_new',
    'reimported_activity': 'imported_new', 'unrepaired_headers': 'imported_new',
    'repair_reviewed': 'imported_new', 'repaired': 'repaired',
    'reimported_repair': 'repaired', 'unrelated': 'repaired',
}


def golden_path(source):
    return f'importers/tests/chase/{source}.beancount'


def signature(entry, *, expected=False):
    identity = entry['import_id'] if expected else entry['meta'].get('import-id')
    return entry['date'], identity, postings(entry, expected=expected)


def verify_ledger(bea, workspace, ledger, expected, checkpoint):
    require(not re.search(r'^\s*include\s+', (workspace / ledger).read_text(), re.MULTILINE),
            'This single-file fixture does not support include directives.')
    check = bea_read(bea, workspace, ledger, 'check')
    require(check.get('valid') is True and check.get('errors') == [], 'bea check did not pass.')
    transactions = bea_read(bea, workspace, ledger, 'list', 'transaction', '--limit', '100')
    wanted = [expected['transactions'][key] for key in checkpoint['transaction_keys']]
    require(Counter(signature(t) for t in transactions) ==
            Counter(signature(t, expected=True) for t in wanted),
            'Ledger transaction identities/counts/postings differ from the checkpoint.')
    balances = bea_read(bea, workspace, ledger, 'list', 'balance', '--limit', '100')
    require(balances == [], 'Unexpected balance assertions in the graduation scenario.')


def verify_extraction(bea, path, source, expected):
    """Compare source postings using public bea, without accepting ledger errors."""
    require(path.is_file() and not path.is_symlink(), f'Expected a regular extraction file: {path}.')
    before = first_month.file_identity(path)
    require(not re.search(r'^\s*include\s+', path.read_text(), re.MULTILINE),
            'Extraction files must not include other files.')
    try:
        entries = bea_read(bea, path.parent, path.name, 'list', 'transaction',
                           '--allow-errors', '--limit', '100')
        wanted = Counter((row['date'], row['import_id'],
                          ((row['account'], number(row['amount']), row['currency']),))
                         for row in expected['source_rows'][source])
        require(Counter(signature(entry) for entry in entries) == wanted,
                f'Source-only extraction identities/counts/postings differ for {source}.')
    finally:
        require(before == first_month.file_identity(path), 'Verification changed the extraction file.')


def verify_goldens(bea, workspace, expected, repaired, golden_before, current):
    sources = (*ORIGINALS, 'renamed-headers.csv') if repaired else ORIGINALS
    if repaired:
        require(golden_before is not None, 'Repair checkpoints require --goldens-before from before repair.')
        for source in ORIGINALS:
            path = golden_path(source)
            require(path in golden_before['files'] and
                    golden_before['files'][path] == current['files'].get(path),
                    f'Original golden changed or was missing before repair: {path}.')
    for source in sources:
        path = golden_path(source)
        first_month.resolve_workspace(workspace, path)
        verify_extraction(bea, workspace / path, source, expected)


def verify_rejected(python, workspace, expected, source):
    """Execute only the candidate's identify contract; snapshot checks catch writes."""
    importer = 'importers/chase.py'
    first_month.resolve_workspace(workspace, importer)
    script = ('import json, runpy, sys; '
              'module = runpy.run_path(sys.argv[1]); '
              'candidate = module["Importer"](sys.argv[2], sys.argv[3]); '
              'print(json.dumps(candidate.identify(sys.argv[4])))')
    result = first_month.run([python, '-B', '-c', script, str(workspace / importer),
                              expected['account'], expected['currency'], str(FIXTURES / source)], workspace)
    require(json.loads(result) is False, f'Importer incorrectly claims {source}.')


def preserved_paths(before, current, paths):
    for path in paths:
        require(path in before['files'] and before['files'][path] == current['files'].get(path),
                f'Previously existing file changed: {path}.')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    snap = commands.add_parser('snapshot', help='Record all books files, HEAD, and index outside the books.')
    verify = commands.add_parser('verify', help='Check ledger state, source goldens, and preservation requirements.')
    extraction = commands.add_parser('extraction', help='Check one source-only output against independent source rows.')
    for command in (snap, verify):
        command.add_argument('--workspace', required=True, type=Path)
        command.add_argument('--ledger', default='ledger.beancount')
    snap.add_argument('--output', required=True, type=Path)
    verify.add_argument('--checkpoint', required=True, choices=STATES)
    verify.add_argument('--before', type=Path)
    verify.add_argument('--goldens-before', type=Path)
    verify.add_argument('--python', help='Authoring Python; required to check rejected input identification.')
    extraction.add_argument('--file', required=True, type=Path)
    extraction.add_argument('--source', required=True, choices=(*ORIGINALS, 'renamed-headers.csv'))
    for command in (verify, extraction):
        command.add_argument('--bea', default='bea')
    args = parser.parse_args(argv)
    if args.command == 'snapshot':
        return first_month.main(['snapshot', '--workspace', str(args.workspace), '--ledger', args.ledger,
                                 '--output', str(args.output)])
    try:
        expected = json.loads(EXPECTATIONS.read_text())
        if args.command == 'extraction':
            verify_extraction(args.bea, args.file.absolute(), args.source, expected)
            print(f'PASS extraction: {args.source}; reviewed source identities and postings match.')
            return 0
        workspace = first_month.resolve_workspace(args.workspace, args.ledger)
        name = args.checkpoint
        require(name not in UNCHANGED | {'authored', 'wired'} or args.before is not None,
                f'{name} requires --before from immediately before the action.')
        require(name not in REPAIR_STAGES or args.goldens_before is not None,
                f'{name} requires --goldens-before from before repair.')
        require(name not in {'unrepaired_headers', 'unrelated'} or args.python is not None,
                f'{name} requires --python to verify the importer rejects this input.')
        before = first_month.read_snapshot(args.before, workspace, args.ledger) if args.before else None
        golden_before = (first_month.read_snapshot(args.goldens_before, workspace, args.ledger)
                         if args.goldens_before else None)
        current = capture(workspace, args.ledger)
        try:
            verify_ledger(args.bea, workspace, args.ledger, expected, expected['checkpoints'][STATES[name]])
            if name != 'prior':
                first_month.resolve_workspace(workspace, 'importers/chase.py')
                first_month.resolve_workspace(workspace, 'import.py')
                verify_goldens(args.bea, workspace, expected, name in REPAIR_STAGES,
                               golden_before, current)
            if name in {'authored', 'wired'}:
                preserved_paths(before, current, [args.ledger, 'import.py'] if name == 'authored' else [args.ledger])
            if name in {'unrepaired_headers', 'unrelated'}:
                source = 'renamed-headers.csv' if name == 'unrepaired_headers' else 'unrelated.csv'
                verify_rejected(args.python, workspace, expected, source)
            if name in UNCHANGED:
                unchanged(before, current)
        finally:
            unchanged(current, capture(workspace, args.ledger))
        print(f'PASS {name}: expected ledger and source artifacts; workspace, HEAD, and index preserved.')
        if name != 'prior':
            print('Golden artifacts checked; harness success, runtime extraction, and human approval are separate evidence.')
        return 0
    except (VerificationError, OSError, ValueError, KeyError, TypeError, InvalidOperation, subprocess.TimeoutExpired) as exc:
        print(f'FAIL: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
