#!/usr/bin/env python3
"""Read-only checks for the synthetic Monarch migration-to-import journey.

Examples (keep snapshots and agent logs outside the workspace):
  python3 verify-migration.py snapshot --workspace /tmp/books --output /tmp/before.json
  python3 verify-migration.py verify --workspace /tmp/books --checkpoint migrated
  python3 verify-migration.py verify --workspace /tmp/books --checkpoint checking_overlap --before /tmp/before.json

Checkpoints and branches come from docs/examples/migration/expectations.json.
Every source row must appear exactly once, through `import-id` or, for a merged
transfer's second row, `import-id-2`. Transactions are compared by date, import
IDs, and postings; payee, narration, and flag are the agent's choice. Pad
directives are listed as transactions too, so any balance adjustment appears
as an unexpected entry.
Snapshots, Git checks, and bea reads reuse verify-first-month.py, so the same
workspace, HEAD, and index guarantees apply: verification never writes.
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
EXPECTATIONS = SCRIPTS.parent / 'docs/examples/migration/expectations.json'
_spec = importlib.util.spec_from_file_location('verify_first_month', SCRIPTS / 'verify-first-month.py')
assert _spec is not None and _spec.loader is not None
first_month = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(first_month)
VerificationError, require, number = first_month.VerificationError, first_month.require, first_month.number
capture, unchanged, bea_read = first_month.capture, first_month.unchanged, first_month.bea_read


def import_ids(entry):
    meta = entry.get('meta') or {}
    return tuple(str(meta[key]) for key in ('import-id', 'import-id-2') if meta.get(key) not in (None, ''))


postings = first_month.posting_signature


def verify_rows(transactions, expected):
    """Every source row exactly once; a merged transfer keeps both identities."""
    for key, wanted in expected['transactions'].items():
        if len(wanted['import_ids']) < 2:
            continue
        pair = set(wanted['import_ids'])
        for entry in transactions:
            ids = set(import_ids(entry))
            require(not ids & pair or ids == pair,
                    f'Merged transfer {key} lacks one of its source identities (import-id / import-id-2).')
    seen = Counter(value for entry in transactions for value in import_ids(entry))
    known = {i for t in expected['transactions'].values() for i in t['import_ids']}
    for row in expected['source_rows']:
        count = seen[row['import_id']]
        require(count > 0, f"Source row {row['row']} ({row['import_id']}) is missing.")
        require(count == 1, f"Source row {row['row']} ({row['import_id']}) is recorded {count} times.")
    unknown = sorted(set(seen) - known)
    require(not unknown, f'Unexpected import IDs: {unknown}.')


def verify_ledger(bea, workspace, ledger, expected, checkpoint):
    require(not re.search(r'^\s*include\s+', (workspace / ledger).read_text(), re.MULTILINE),
            'This single-file fixture does not support include directives.')
    result = bea_read(bea, workspace, ledger, 'check')
    require(result.get('valid') is True and result.get('errors') == [], 'bea check did not pass.')
    transactions = bea_read(bea, workspace, ledger, 'list', 'transaction', '--limit', '500')
    wanted = [expected['transactions'][key] for key in checkpoint['transactions']]
    if wanted:
        verify_rows(transactions, expected)
    actual = Counter((t['date'], frozenset(import_ids(t)), postings(t)) for t in transactions)
    target = Counter((t['date'], frozenset(t['import_ids']), postings(t, expected=True)) for t in wanted)
    missing, extra = target - actual, actual - target
    require(not missing and not extra,
            f'Transactions differ from the checkpoint: {len(missing)} missing, {len(extra)} unexpected '
            f'(first unexpected: {next(iter(extra), None)!r}).')

    assertions = bea_read(bea, workspace, ledger, 'list', 'balance', '--limit', '100')
    actual_assertions = Counter((b['date'], b['account'], number(b['amount']['number'])) for b in assertions)
    target_assertions = Counter((expected['assertion_date'], a['account'], number(a['number']))
                                for a in checkpoint['assertions'])
    require(actual_assertions == target_assertions,
            f'Balance assertions differ: observed {sorted(actual_assertions)}, expected {sorted(target_assertions)}.')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest='command', required=True)
    snap = commands.add_parser('snapshot', help='Record workspace, HEAD, and index outside the workspace.')
    verify = commands.add_parser('verify', help='Compare a checkpoint with the independent fixture expectations.')
    for command in (snap, verify):
        command.add_argument('--workspace', required=True, type=Path)
        command.add_argument('--ledger', default='main.bean')
    snap.add_argument('--output', required=True, type=Path)
    verify.add_argument('--checkpoint', required=True)
    verify.add_argument('--before', type=Path)
    verify.add_argument('--bea', default='bea')
    args = parser.parse_args(argv)
    if args.command == 'snapshot':
        return first_month.main(['snapshot', '--workspace', str(args.workspace), '--ledger', args.ledger,
                                 '--output', str(args.output)])
    try:
        workspace = first_month.resolve_workspace(args.workspace, args.ledger)
        expected = json.loads(EXPECTATIONS.read_text())
        name = args.checkpoint
        require(name in expected['checkpoints'] or name in expected['branches'], f'Unknown checkpoint: {name}.')
        # Every branch is a read-only or declined action: it must leave the workspace as it was.
        is_branch = name in expected['branches']
        require(not is_branch or args.before is not None,
                f'{name} requires --before from immediately before the action.')
        before = first_month.read_snapshot(args.before, workspace, args.ledger) if args.before else None
        current = capture(workspace, args.ledger)
        try:
            key = expected['branches'][name] if is_branch else name
            verify_ledger(args.bea, workspace, args.ledger, expected, expected['checkpoints'][key])
            if is_branch:
                unchanged(before, current)
        finally:
            unchanged(current, capture(workspace, args.ledger))
        print(f'PASS {name}: expected ledger state; verification preserved workspace, HEAD, and index.')
        if name == 'conflicting_balance':
            print('Ledger checkpoint only: the agent transcript must separately report the unresolved 10.00 USD residual.')
        return 0
    except (VerificationError, OSError, ValueError, KeyError, TypeError, InvalidOperation,
            subprocess.TimeoutExpired) as exc:
        print(f'FAIL: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
