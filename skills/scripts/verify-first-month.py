#!/usr/bin/env python3
"""Read-only checks for the synthetic August 2026 first-month journey.

Examples (keep snapshots and agent logs outside the workspace):
  python3 verify-first-month.py snapshot --workspace /tmp/books --output /tmp/before.json
  python3 verify-first-month.py verify --workspace /tmp/books --checkpoint imported
  python3 verify-first-month.py verify --workspace /tmp/books --checkpoint reimported --before /tmp/before.json

Requires an independent Git repository and bea on PATH (or --bea /path/to/bea).
Only .git internals are excluded from file snapshots; HEAD and index are recorded
separately. No files are ignored because they are untracked or Git-ignored.
Snapshots are trusted local rehearsal evidence, not a cryptographic audit trail.
A closed commit report must contain Income:, Expenses:, Net:, check: PASS, the
checking account name, Checking: 2942 USD, Unverified: 0, Flags carried: 0,
Recurring gaps: 0, Recurring history: unavailable, and Assertions: 1 pinned,
0 unpinned. Amounts may include commas and USD suffixes. The fixture is single-file;
include directives are rejected rather than following external ledger dependencies.
"""
from __future__ import annotations

import argparse
from collections import Counter
from decimal import Decimal, InvalidOperation
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys

EXPECTATIONS = Path(__file__).resolve().parents[1] / 'docs/examples/first-month/expectations.json'
UNCHANGED = {'reimported', 'asked', 'declined_import', 'declined_reconcile',
             'declined_commit', 'unresolved_statement', 'missing_statement'}


class VerificationError(Exception):
    """An observation was unavailable or did not match the scenario."""


def require(condition, message):
    if not condition:
        raise VerificationError(message)


def run(args, workspace):
    result = subprocess.run(args, cwd=workspace, env={**os.environ, 'GIT_OPTIONAL_LOCKS': '0'},
                            capture_output=True, check=False, timeout=90)
    require(result.returncode == 0,
            f"Command failed ({result.returncode}): {' '.join(map(str, args))}\n"
            + result.stderr.decode(errors='replace').strip())
    return result.stdout


def git(workspace, *args):
    return run(['git', '-C', str(workspace), *args], workspace)


def file_identity(path):
    info = path.lstat()
    mode = stat.S_IMODE(info.st_mode)
    if stat.S_ISLNK(info.st_mode):
        return {'type': 'symlink', 'target': os.readlink(path), 'mode': mode}
    require(stat.S_ISREG(info.st_mode), f'Unsupported file type: {path}')
    return {'type': 'file', 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'mode': mode}


def capture(workspace, ledger):
    root = Path(git(workspace, 'rev-parse', '--show-toplevel').decode().strip()).resolve()
    require(root == workspace, 'Workspace must be its own Git repository root, not a parent repository subdirectory.')
    files = {}
    def visit(directory):
        for path in sorted(directory.iterdir()):
            if path == workspace / '.git':
                continue
            if path.is_symlink() or not path.is_dir():
                files[path.relative_to(workspace).as_posix()] = file_identity(path)
            else:
                visit(path)
    visit(workspace)
    head = git(workspace, 'rev-parse', '--verify', 'HEAD').decode().strip()
    index = Path(git(workspace, 'rev-parse', '--git-path', 'index').decode().strip())
    if not index.is_absolute():
        index = workspace / index
    # An absent index is observable; all other read errors propagate as failures.
    require(not index.is_symlink(), 'Git index must not be a symlink.')
    try:
        index_id = file_identity(index)
    except FileNotFoundError:
        index_id = None
    return {'schema_version': 1, 'workspace': str(workspace), 'ledger': ledger,
            'files': files, 'head': head, 'index': index_id}


def unchanged(before, after, *, git_state=True):
    require(before['workspace'] == after['workspace'] and before['ledger'] == after['ledger'],
            'Snapshot belongs to a different workspace or ledger.')
    require(before['files'] == after['files'], 'Workspace files changed (contents, modes, paths, or symlink targets).')
    if git_state:
        require(before['head'] == after['head'], 'Git HEAD changed.')
        require(before['index'] == after['index'], 'Git index changed.')


def outside_workspace(path, workspace):
    resolved = path.resolve()
    require(not resolved.is_relative_to(workspace), 'Snapshot path must be outside the inspected workspace.')
    return resolved


def read_snapshot(path, workspace, ledger):
    data = json.loads(outside_workspace(path, workspace).read_text())
    require(isinstance(data, dict) and data.get('schema_version') == 1, 'Unsupported snapshot format.')
    require(all(key in data for key in ('workspace', 'ledger', 'files', 'head', 'index')),
            'Incomplete snapshot.')
    require(data['workspace'] == str(workspace) and data['ledger'] == ledger,
            'Snapshot belongs to a different workspace or ledger.')
    return data


def bea_read(bea, workspace, ledger, *args):
    value = json.loads(run([bea, '--file', str(workspace / ledger), '--json', '--no-input', *args], workspace))
    require(isinstance(value, dict) and 'data' in value, f'Invalid bea envelope for {args[0]}.')
    require(not value.get('error') and not value.get('errors'), f'bea returned errors for {args[0]}.')
    require(value.get('truncated') is False, f'bea response is truncated or lacks a completeness indicator: {args[0]}.')
    return value['data']


def number(value):
    require(isinstance(value, str), f'Expected a decimal string, got {value!r}.')
    result = Decimal(value)
    require(result.is_finite(), 'Non-finite amount.')
    return result


def posting_signature(entry, *, expected=False):
    """Sorted (account, amount, currency) postings of a plain cash transaction."""
    postings = []
    for posting in entry['postings']:
        require(not any(posting.get(k) for k in ('cost', 'price', 'price_total', 'flag')),
                'Unexpected cost, price, or posting flag in the cash scenario.')
        units = posting if expected else posting['units']
        postings.append((posting['account'], number(units['number']), units['currency']))
    require(not entry.get('tags') and not entry.get('links'), 'Unexpected transaction tags or links.')
    return tuple(sorted(postings))


def transaction_signature(entry, *, expected=False):
    return (entry['date'], entry['flag'], entry['payee'], entry['narration'],
            entry['import_id'] if expected else entry['meta'].get('import-id'),
            posting_signature(entry, expected=expected))


def resolve_workspace(workspace, ledger):
    """The workspace root, after requiring the ledger to be a regular file inside it."""
    workspace = workspace.resolve(strict=True)
    ledger_path = workspace / ledger
    require(not Path(ledger).is_absolute() and '..' not in Path(ledger).parts,
            'Ledger must be a relative path inside the workspace.')
    require(ledger_path.resolve(strict=True).is_relative_to(workspace) and not ledger_path.is_symlink(),
            'Ledger must be a regular workspace file, not an external path or symlink.')
    return workspace


def verify_ledger(bea, workspace, ledger, expected, checkpoint):
    require(not re.search(r'^\s*include\s+', (workspace / ledger).read_text(), re.MULTILINE),
            'This single-file fixture does not support include directives.')
    result = bea_read(bea, workspace, ledger, 'check')
    require(isinstance(result, dict) and result.get('valid') is True and result.get('errors') == [], 'bea check did not return a passing error list.')
    transactions = bea_read(bea, workspace, ledger, 'list', 'transaction', '--limit', '100')
    balances = bea_read(bea, workspace, ledger, 'list', 'balance', '--limit', '100')
    require(isinstance(transactions, list) and isinstance(balances, list), 'Expected complete transaction/assertion lists.')
    actual = Counter(transaction_signature(t) for t in transactions)
    wanted = Counter(transaction_signature(expected['transactions'][key], expected=True)
                     for key in checkpoint['transaction_keys'])
    require(actual == wanted, 'Transaction identities/counts/postings differ from the expected checkpoint.')
    assertions = []
    for balance in balances:
        require(balance.get('tolerance') is None, 'Unexpected custom assertion tolerance.')
        assertions.append((balance['date'], balance['account'], number(balance['amount']['number']), balance['amount']['currency']))
    wanted_assertions = [(b['date'], b['account'], number(b['number']), b['currency']) for b in checkpoint['assertions']]
    require(Counter(assertions) == Counter(wanted_assertions), 'Balance assertion amounts, dates, or counts differ.')


def verify_close(workspace, ledger, before, current, expected):
    unchanged(before, current, git_state=False)
    parents = git(workspace, 'rev-list', '--parents', '-n', '1', 'HEAD').decode().split()
    require(parents == [current['head'], before['head']], 'Close must add exactly one non-merge commit to the recorded HEAD.')
    changed = git(workspace, 'diff-tree', '--no-commit-id', '--name-only', '-r', '-z', 'HEAD').decode().split('\0')
    changed = sorted(p for p in changed if p)
    require(changed == expected['close']['approved_paths'], f'Close committed unexpected paths: {changed!r}.')
    require(ledger == 'main.bean', 'The fixture approves only main.bean for the close commit.')
    require(git(workspace, 'show', f'HEAD:{ledger}') == (workspace / ledger).read_bytes(),
            'Working ledger differs from the committed ledger.')
    message = git(workspace, 'show', '-s', '--format=%B', 'HEAD').decode().strip()
    lines = message.splitlines()
    require(lines[0] == expected['close']['subject'], 'Close commit subject differs from the approved scenario.')
    body = '\n'.join(lines[1:]).replace('−', '-')
    for label, key in [('Income', 'income'), ('Expenses', 'expenses'), ('Net', 'net_income'), ('Checking', 'balance')]:
        match = re.search(rf'\b{label}:\s*([+-]?[\d,]+(?:\.\d+)?)\b', body, re.IGNORECASE)
        require(match is not None and number(match[1].replace(',', '')) == number(expected['checkpoints']['closed'][key]),
                f'Close report missing or incorrect {label} amount.')
    require(expected['account'] in body and re.search(r'\bcheck:\s*PASS\b', body, re.IGNORECASE),
            'Close report must identify checking and record check: PASS.')
    require(re.search(r'\bAssertions:\s*1\s+pinned,?\s*0\s+unpinned\b', body, re.IGNORECASE),
            'Close report must record Assertions: 1 pinned, 0 unpinned.')
    for label in ('Unverified', 'Flags carried', 'Recurring gaps'):
        require(re.search(rf'\b{label}:\s*0\b', body, re.IGNORECASE),
                f'Close report must record {label}: 0.')
    require(re.search(r'\bRecurring history:\s*unavailable\b', body, re.IGNORECASE),
            'Close report must disclose Recurring history: unavailable.')


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
    try:
        workspace = resolve_workspace(args.workspace, args.ledger)
        current = capture(workspace, args.ledger)
        if args.command == 'snapshot':
            output = outside_workspace(args.output, workspace)
            # Exclusive creation prevents accidentally replacing an existing checkpoint.
            with output.open('x') as stream:
                json.dump(current, stream, indent=2)
                stream.write('\n')
            unchanged(current, capture(workspace, args.ledger))
            print(f'PASS snapshot: {output}')
            return 0
        expected = json.loads(EXPECTATIONS.read_text())
        name = args.checkpoint
        require(name in expected['checkpoints'] or name in expected['branches'], f'Unknown checkpoint: {name}.')
        require(name not in UNCHANGED | {'closed'} or args.before is not None,
                f'{name} requires --before from immediately before the action.')
        before = read_snapshot(args.before, workspace, args.ledger) if args.before else None
        key = expected['branches'][name]['ledger_matches'] if name in expected['branches'] else name
        try:
            verify_ledger(args.bea, workspace, args.ledger, expected, expected['checkpoints'][key])
            if name in UNCHANGED:
                unchanged(before, current)
            if name == 'closed':
                verify_close(workspace, args.ledger, before, current, expected)
        finally:
            unchanged(current, capture(workspace, args.ledger))
        print(f'PASS {name}: expected ledger state; verification preserved workspace, HEAD, and index.')
        if name in {'unresolved_statement', 'missing_statement'}:
            print('Ledger checkpoint only: the agent transcript must separately demonstrate the honest unresolved/unverified report.')
        return 0
    except (VerificationError, OSError, ValueError, KeyError, TypeError, InvalidOperation, subprocess.TimeoutExpired) as exc:
        print(f'FAIL: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
