#!/usr/bin/env python3
"""Unit tests for ci-check.py's `bea` resolution path and bea-first matcher.

Stdlib unittest only (the skills CI has no pytest): run with
`python3 skills/scripts/test_ci_check.py` from the repository root.
"""

from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPTS_DIR = Path(__file__).resolve().parent


def load_ci_check():
    spec = importlib.util.spec_from_file_location("ci_check", SCRIPTS_DIR / "ci-check.py")
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ci_check = load_ci_check()


class TestFindBea(unittest.TestCase):
    def test_resolves_to_a_working_bea(self):
        found = ci_check.find_bea()
        assert found, "find_bea returned an empty command"
        result = subprocess.run([*found, "--version"], capture_output=True, text=True)
        assert result.returncode == 0, result.stderr

    def test_missing_bea_fails_loudly(self):
        with tempfile.TemporaryDirectory() as empty:
            with mock.patch.dict(os.environ, {"PATH": empty}):
                with self.assertRaises(SystemExit) as ctx:
                    ci_check.find_bea()
                assert ctx.exception.code == 1


class TestRawAppendMatcher(unittest.TestCase):
    def flagged(self, line: str) -> bool:
        return bool(
            ci_check.RAW_APPEND.search(line) and not ci_check.APPEND_EXCUSED.search(line)
        )

    def test_raw_append_to_a_file_is_flagged(self):
        assert self.flagged("Append these transactions to ./ledger.beancount after staging.")
        assert self.flagged(
            "append the missing entries plus an assertion to the ledger file, then verify"
        )

    def test_review_prompts_and_scope_prose_pass(self):
        assert not self.flagged("Append these 7 transactions to ./transactions/2026.beancount? (yes/no)")
        assert not self.flagged("**append** missing transactions and one period-end `balance` assertion")
        assert not self.flagged("appends only what that skill's confirm-gated flow appends")

    def test_bea_writes_are_not_raw_appends(self):
        assert not self.flagged(
            "write the confirmed batch with `bea add transactions --from -` instead of appending text."
        )
        assert not self.flagged("verify afterward with `bea check`.")


if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__]))
    sys.exit(0 if result.wasSuccessful() else 1)
