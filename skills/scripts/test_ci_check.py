#!/usr/bin/env python3
"""Unit tests for skill separation, validation, and `bea` preferences.

Stdlib unittest only (the skills CI has no pytest): run with
`python3 skills/scripts/test_ci_check.py` from the repository root.
"""

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
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


class TestSkillTrees(unittest.TestCase):
    def setUp(self):
        scratch = SCRIPTS_DIR.parent / "tmp"
        scratch.mkdir(exist_ok=True)
        temporary = tempfile.TemporaryDirectory(dir=scratch)
        self.addCleanup(temporary.cleanup)
        self.repo = Path(temporary.name)
        self.customer = self.repo / "skills/.claude/skills"
        self.development = self.repo / ".agents/skills"
        self.customer.mkdir(parents=True)
        self.development.mkdir(parents=True)
        (self.repo / "skills/CLAUDE.md").write_text("Customer skill guidance\n")
        (self.repo / "skills/AGENTS.md").symlink_to("CLAUDE.md")
        (self.repo / ".claude").mkdir()
        (self.repo / ".claude/skills").symlink_to("../.agents/skills")
        patches = mock.patch.multiple(
            ci_check,
            REPO_ROOT=self.repo,
            SKILLS_ROOT=self.repo / "skills",
            SKILLS_DIR=self.customer,
            DEV_SKILLS_DIR=self.development,
        )
        patches.start()
        self.addCleanup(patches.stop)
        self.write_skill(self.customer, "beancount-ask")
        self.write_skill(self.development, "ship")

    def write_skill(self, directory: Path, name: str) -> Path:
        path = directory / name / "SKILL.md"
        path.parent.mkdir(parents=True)
        path.write_text(f"---\nname: {name}\ndescription: A fixture skill.\n---\n")
        return path

    def test_separate_trees_are_validated(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            ci_check.check_symlinks()
            ci_check.check_skill_md()
        self.assertIn("OK frontmatter .agents/skills/ship/SKILL.md", output.getvalue())
        self.assertIn(
            "OK frontmatter skills/.claude/skills/beancount-ask/SKILL.md",
            output.getvalue(),
        )

    def test_old_shared_customer_symlink_is_rejected(self):
        self.development.rename(self.development.with_name("old-skills"))
        self.development.symlink_to("../skills/.claude/skills")
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            ci_check.check_symlinks()

    def test_claude_must_load_development_skills(self):
        link = self.repo / ".claude/skills"
        link.unlink()
        link.symlink_to("../skills/.claude/skills")
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            ci_check.check_symlinks()

    def test_skills_in_the_wrong_audience_tree_are_rejected(self):
        for directory, name in (
            (self.development, "beancount-import"),
            (self.customer, "mobile-release"),
        ):
            with self.subTest(name=name):
                path = self.write_skill(directory, name)
                error = io.StringIO()
                with (
                    contextlib.redirect_stdout(io.StringIO()),
                    contextlib.redirect_stderr(error),
                    self.assertRaises(SystemExit),
                ):
                    ci_check.check_skill_md()
                self.assertIn("belongs in", error.getvalue())
                path.unlink()
                path.parent.rmdir()

    def test_invalid_development_frontmatter_is_rejected(self):
        (self.development / "ship/SKILL.md").write_text("---\nname: ship\n---\n")
        error = io.StringIO()
        with contextlib.redirect_stderr(error), self.assertRaises(SystemExit):
            ci_check.check_skill_md()
        self.assertIn(".agents/skills/ship/SKILL.md", error.getvalue())
        self.assertIn("missing 'description'", error.getvalue())

    def test_development_eval_fixtures_are_checked(self):
        evals = self.development / "ship/evals/evals.json"
        evals.parent.mkdir()
        evals.write_text(json.dumps({"evals": [{"id": 1, "files": ["missing.csv"]}]}))
        error = io.StringIO()
        with contextlib.redirect_stderr(error), self.assertRaises(SystemExit):
            ci_check.check_evals()
        self.assertIn("referenced file missing: missing.csv", error.getvalue())


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


class TestOracleAndIsolation(unittest.TestCase):
    def test_oracle_uses_cli_project_not_path_bean_check(self):
        oracle = ci_check.find_bean_check_oracle()
        self.assertEqual(oracle[:3], ["uv", "run", "--project"])
        self.assertTrue(oracle[-1] == "bean-check" or oracle[-1].endswith("bean-check"))

    def test_path_scrub_drops_bean_check_dirs(self):
        with tempfile.TemporaryDirectory() as tmp:
            decoy = Path(tmp) / "decoy"
            decoy.mkdir()
            (decoy / "bean-check").write_text("#!/bin/sh\nexit 0\n")
            (decoy / "bean-check").chmod(0o755)
            keep = Path(tmp) / "keep"
            keep.mkdir()
            (keep / "bea").write_text("#!/bin/sh\nexit 0\n")
            (keep / "bea").chmod(0o755)
            with mock.patch.dict(
                os.environ,
                {"PATH": f"{decoy}{os.pathsep}{keep}"},
                clear=False,
            ):
                env = ci_check.env_without_global_bean_tools()
            self.assertFalse(ci_check.path_has_bean_check(env))
            self.assertIn(str(keep), env["PATH"])
            self.assertNotIn(str(decoy), env["PATH"])

    def test_pip_install_beancount_instruction_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            skills_dir = repo / "skills/.claude/skills"
            skill = skills_dir / "beancount-ask" / "SKILL.md"
            skill.parent.mkdir(parents=True)
            skill.write_text(
                "---\nname: beancount-ask\ndescription: x\n---\n"
                "If missing, pip install beancount.\n"
            )
            with mock.patch.multiple(
                ci_check,
                REPO_ROOT=repo,
                SKILLS_DIR=skills_dir,
            ):
                with self.assertRaises(SystemExit):
                    ci_check.check_no_redundant_installs()


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
