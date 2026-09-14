#!/usr/bin/env python3
"""Behavioral tests for the customer-suite installer and the first-query walkthrough.

Stdlib unittest only (the skills CI has no pytest): run with
`python3 skills/scripts/test_beancount_skills.py` from the repository root.
Tests install the real suite into temporary destinations and assert file
effects; the Git tests rehearse the documented clone and update commands.
"""

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
SKILLS_ROOT = SCRIPTS_DIR.parent
SUITE = SKILLS_ROOT / ".claude" / "skills"
INSTALL_DOC = SKILLS_ROOT / "docs" / "installation.md"
FIRST_QUERY_DOC = SKILLS_ROOT / "docs" / "first-query.md"
FIXTURE = SUITE / "beancount-ask" / "evals" / "files" / "eval1_ledger.beancount"


def load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS_DIR / filename)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


skills = load("beancount_skills", "beancount-skills.py")


def scratch_dir() -> tempfile.TemporaryDirectory:
    scratch = SKILLS_ROOT / "tmp"
    scratch.mkdir(exist_ok=True)
    return tempfile.TemporaryDirectory(dir=scratch)


def snapshot(root: Path) -> dict[str, str]:
    """Every path under root with its link target or content."""
    state = {}
    for path in sorted(root.rglob("*")):
        rel = path.relative_to(root).as_posix()
        if path.is_symlink():
            state[rel] = f"link:{path.readlink()}"
        elif path.is_file():
            state[rel] = path.read_text(encoding="utf-8", errors="replace")
        else:
            state[rel] = "dir"
    return state


def run(command: str, *dests: Path) -> tuple[int, str, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = skills.main([command, *map(str, dests)])
    return code, out.getvalue(), err.getvalue()


class Workspace(unittest.TestCase):
    def setUp(self):
        temporary = scratch_dir()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.dest = self.root / "home" / ".claude" / "skills"
        # An unrelated personal skill and a ledger that must survive everything.
        self.sentinel = self.dest / "find-skills" / "SKILL.md"
        self.sentinel.parent.mkdir(parents=True)
        self.sentinel.write_text("---\nname: find-skills\ndescription: unrelated\n---\n")
        self.ledger = self.root / "ledger.beancount"
        shutil.copyfile(FIXTURE, self.ledger)

    def copy_suite(self, dest: Path) -> None:
        for name in skills.expected_skills():
            shutil.copytree(SUITE / name, dest / name)


class TestInstall(Workspace):
    def test_inventory_is_the_eight_customer_skills(self):
        self.assertEqual(
            skills.expected_skills(),
            [
                "beancount-ask",
                "beancount-close",
                "beancount-import",
                "beancount-importer-author",
                "beancount-init",
                "beancount-migrate",
                "beancount-options",
                "beancount-reconcile",
            ],
        )

    def test_install_links_each_skill_and_keeps_unrelated_entries(self):
        sentinel_before = self.sentinel.read_bytes()
        code, out, _ = run("install", self.dest)
        self.assertEqual(code, 0)
        self.assertIn("OK 8 customer skills complete", out)
        entries = sorted(p.name for p in self.dest.iterdir())
        self.assertEqual(entries, sorted([*skills.expected_skills(), "find-skills"]))
        for name in skills.expected_skills():
            self.assertTrue((self.dest / name).is_symlink())
            self.assertEqual((self.dest / name).resolve(), (SUITE / name).resolve())
        self.assertEqual(self.sentinel.read_bytes(), sentinel_before)

    def test_repeat_install_is_a_no_op_with_one_copy_each(self):
        run("install", self.dest)
        before = snapshot(self.dest)
        code, out, _ = run("install", self.dest)
        self.assertEqual(code, 0)
        self.assertEqual(snapshot(self.dest), before)
        self.assertEqual(out.count("kept   "), 8)
        self.assertEqual(len(list(self.dest.glob("beancount-*"))), 8)

    def test_conflicting_copies_block_install_without_changing_anything(self):
        self.dest.mkdir(parents=True, exist_ok=True)
        edited = self.dest / "beancount-ask"
        shutil.copytree(SUITE / "beancount-ask", edited)
        (edited / "SKILL.md").write_text((edited / "SKILL.md").read_text() + "\nMy note.\n")
        (edited / "references" / "mine.md").write_text("local\n")
        shutil.copytree(SUITE / "beancount-init", self.dest / "beancount-init")
        (self.dest / "beancount-close").symlink_to(self.root / "elsewhere")
        before = snapshot(self.dest)

        code, _, err = run("install", self.dest)

        self.assertEqual(code, 1)
        self.assertEqual(snapshot(self.dest), before, "a conflict must leave the destination untouched")
        self.assertIn("beancount-ask is a copy with local changes", err)
        self.assertIn("modified SKILL.md", err)
        self.assertIn("added references/mine.md", err)
        self.assertIn("beancount-init is a copy identical to this checkout", err)
        self.assertIn("(target missing), not this checkout", err)
        self.assertIn("move it out of the skills directory", err)

    def test_documented_conflict_recovery_preserves_the_edited_copy(self):
        self.dest.mkdir(parents=True, exist_ok=True)
        shutil.copytree(SUITE / "beancount-ask", self.dest / "beancount-ask")
        (self.dest / "beancount-ask" / "SKILL.md").write_text("edited\n")
        backups = self.root / "beancount-skill-backups"
        backups.mkdir()
        shutil.move(str(self.dest / "beancount-ask"), str(backups))

        code, _, _ = run("install", self.dest)

        self.assertEqual(code, 0)
        self.assertEqual((backups / "beancount-ask" / "SKILL.md").read_text(), "edited\n")
        self.assertTrue((self.dest / "beancount-ask").is_symlink())


class TestVerify(Workspace):
    def test_complete_suite_passes_and_verify_writes_nothing(self):
        run("install", self.dest)
        copy = self.root / "copy"
        self.copy_suite(copy)
        state = lambda: (snapshot(self.dest), snapshot(copy), snapshot(SUITE), self.ledger.read_bytes())  # noqa: E731
        before = state()
        code, out, err = run("verify", self.dest, copy)
        self.assertEqual((code, err), (0, ""))
        self.assertEqual(out.count("OK 8 customer skills complete"), 2)
        self.assertEqual(state(), before)

    def test_missing_reference_names_the_file_and_the_line_that_needs_it(self):
        self.copy_suite(self.dest)
        (self.dest / "beancount-close" / "references" / "close-checklist.md").unlink()
        before = snapshot(self.dest)
        code, _, err = run("verify", self.dest)
        self.assertEqual(code, 1)
        self.assertIn(
            "FAIL beancount-close/references/close-checklist.md is missing (beancount-close/SKILL.md:28 needs it)",
            err,
        )
        self.assertEqual(err.count("close-checklist.md is missing"), 1)
        self.assertEqual(snapshot(self.dest), before)

    def test_reference_owned_by_a_sibling_is_attributed_to_that_sibling(self):
        self.copy_suite(self.dest)
        (self.dest / "beancount-import" / "references" / "dedup.md").unlink()
        code, _, err = run("verify", self.dest)
        self.assertEqual(code, 1)
        self.assertIn("FAIL beancount-import/references/dedup.md is missing", err)
        self.assertNotIn("beancount-importer-author/references/dedup.md", err)

    def test_missing_composed_sibling_is_reported_by_the_skill_that_needs_it(self):
        self.copy_suite(self.dest)
        shutil.rmtree(self.dest / "beancount-reconcile")
        code, _, err = run("verify", self.dest)
        self.assertEqual(code, 1)
        self.assertIn("FAIL beancount-reconcile: not installed", err)
        self.assertIn("FAIL beancount-close refers to beancount-reconcile", err)
        self.assertIn("beancount-reconcile/references/statement-formats.md is missing", err)

    def test_dangling_link_and_bad_frontmatter_are_failures(self):
        run("install", self.dest)
        (self.dest / "beancount-ask").unlink()
        (self.dest / "beancount-ask").symlink_to(self.root / "gone")
        (self.dest / "beancount-init").unlink()
        shutil.copytree(SUITE / "beancount-init", self.dest / "beancount-init")
        (self.dest / "beancount-init" / "SKILL.md").write_text("---\nname: init\n---\n")
        code, _, err = run("verify", self.dest)
        self.assertEqual(code, 1)
        self.assertIn("FAIL beancount-ask: link to missing", err)
        self.assertIn("FAIL beancount-init/SKILL.md: frontmatter needs `name: beancount-init`", err)

    def test_unrelated_skills_and_prose_file_names_do_not_fail(self):
        self.copy_suite(self.dest)
        own = self.dest / "beancount-custom" / "SKILL.md"
        own.parent.mkdir()
        own.write_text("---\nname: beancount-custom\ndescription: mine\n---\nSee references/nowhere.md\n")
        with (self.dest / "beancount-ask" / "SKILL.md").open("a") as handle:
            handle.write(
                "\nExamples: https://example.com/references/remote.md, ./ledger.beancount,"
                " MIGRATION.md, import.py.\n"
            )
        code, out, err = run("verify", self.dest)
        self.assertEqual((code, err), (0, ""))
        self.assertIn("beancount-custom: not part of this suite; left untouched", out)
        self.assertNotIn("find-skills", out)

    def test_missing_destination_fails(self):
        code, _, err = run("verify", self.root / "absent")
        self.assertEqual(code, 1)
        self.assertIn("does not exist", err)


class TestUninstall(Workspace):
    def test_removes_only_links_into_this_checkout(self):
        run("install", self.dest)
        other = self.root / "other-dest"
        shutil.copytree(SUITE / "beancount-ask", other / "beancount-ask")
        (other / "beancount-close").symlink_to(self.root / "another-checkout" / "beancount-close")
        other_before = snapshot(other)
        ledger_before = self.ledger.read_bytes()

        code, out, _ = run("uninstall", self.dest, other)

        self.assertEqual(code, 0)
        self.assertEqual([p.name for p in self.dest.iterdir()], ["find-skills"])
        self.assertEqual(snapshot(other), other_before)
        self.assertEqual(self.ledger.read_bytes(), ledger_before)
        self.assertTrue(all((SUITE / name / "SKILL.md").is_file() for name in skills.expected_skills()))
        self.assertIn("kept    ", out)


class TestGitUpdatePath(Workspace):
    """The documented clone → install → pull --ff-only → install sequence."""

    def git(self, cwd: Path, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["git", "-c", "user.name=Test", "-c", "user.email=test@example.com", *args],
            cwd=cwd,
            capture_output=True,
            text=True,
        )

    def git_ok(self, cwd: Path, *args: str) -> None:
        result = self.git(cwd, *args)
        self.assertEqual(result.returncode, 0, result.stderr)

    def setUp(self):
        super().setUp()
        if not shutil.which("git"):
            self.skipTest("git is not installed")
        doc = INSTALL_DOC.read_text(encoding="utf-8")
        clone = re.search(r'git clone (.+?) https://github\.com/bex-co/beancount-io\.git "\$SKILLS_SRC"', doc)
        sparse = re.search(r'git -C "\$SKILLS_SRC" sparse-checkout set (.+)', doc)
        self.assertIsNotNone(clone, "installation.md must show the clone command")
        self.assertIsNotNone(sparse, "installation.md must show the sparse-checkout command")

        self.origin = self.root / "origin"
        shutil.copytree(SUITE, self.origin / "skills" / ".claude" / "skills")
        (self.origin / "skills" / "scripts").mkdir()
        shutil.copy2(SCRIPTS_DIR / "beancount-skills.py", self.origin / "skills" / "scripts")
        dev = self.origin / ".agents" / "skills" / "ship" / "SKILL.md"
        dev.parent.mkdir(parents=True)
        dev.write_text("---\nname: ship\ndescription: development only\n---\n")
        for args in (("init", "-q", "-b", "main"), ("add", "."), ("commit", "-qm", "suite")):
            self.git_ok(self.origin, *args)
        self.git_ok(self.origin, "config", "uploadpack.allowFilter", "true")

        self.src = self.root / "src"
        self.git_ok(self.root, "clone", "-q", *clone.group(1).split(), f"file://{self.origin}", str(self.src))
        self.git_ok(self.src, "sparse-checkout", "set", *sparse.group(1).split())
        self.script = self.src / "skills" / "scripts" / "beancount-skills.py"

    def cli(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, str(self.script), *args], capture_output=True, text=True)

    def commit_upstream(self, rel: str, text: str) -> None:
        (self.origin / rel).write_text(text)
        self.git_ok(self.origin, "commit", "-qam", f"update {rel}")

    def test_sparse_checkout_holds_the_customer_suite_only(self):
        self.assertFalse((self.src / ".agents").exists())
        result = self.cli("install", str(self.dest))
        self.assertEqual(result.returncode, 0, result.stderr)
        linked = sorted(p.name for p in self.dest.iterdir() if p.is_symlink())
        self.assertEqual(linked, skills.expected_skills())

    def test_update_keeps_local_edits_and_stops_on_overlapping_changes(self):
        self.assertEqual(self.cli("install", str(self.dest)).returncode, 0)
        ask = "skills/.claude/skills/beancount-ask/SKILL.md"
        init = "skills/.claude/skills/beancount-init/SKILL.md"
        local = (self.src / ask).read_text() + "\nMy local tweak.\n"
        (self.src / ask).write_text(local)

        self.commit_upstream(init, (self.origin / init).read_text() + "\nUpstream change.\n")
        self.git_ok(self.src, "pull", "-q", "--ff-only")
        self.assertEqual((self.src / ask).read_text(), local)
        self.assertIn("Upstream change.", (self.dest / "beancount-init" / "SKILL.md").read_text())

        self.commit_upstream(ask, (self.origin / ask).read_text() + "\nConflicting upstream.\n")
        pull = self.git(self.src, "pull", "-q", "--ff-only")
        self.assertNotEqual(pull.returncode, 0)
        self.assertIn("would be overwritten", pull.stderr)
        self.assertEqual((self.dest / "beancount-ask" / "SKILL.md").read_text(), local)

        reinstall = self.cli("install", str(self.dest))
        self.assertEqual(reinstall.returncode, 0, reinstall.stderr)
        self.assertIn("local changes in the source checkout", reinstall.stdout)
        self.assertIn("beancount-ask/SKILL.md", reinstall.stdout)
        self.assertTrue(self.sentinel.is_file())

    def test_install_links_skills_added_upstream(self):
        self.assertEqual(self.cli("install", str(self.dest)).returncode, 0)
        new = self.origin / "skills" / ".claude" / "skills" / "beancount-budget" / "SKILL.md"
        new.parent.mkdir()
        new.write_text("---\nname: beancount-budget\ndescription: new\n---\n")
        self.git_ok(self.origin, "add", ".")
        self.git_ok(self.origin, "commit", "-qm", "add budget")
        self.git_ok(self.src, "pull", "-q", "--ff-only")

        result = self.cli("install", str(self.dest))

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("linked", result.stdout)
        self.assertIn("OK 9 customer skills complete", result.stdout)


def june_expenses(ledger: Path) -> dict[str, Decimal]:
    """Independent of Beancount: sum June 2026 Expenses postings by account."""
    totals: dict[str, Decimal] = defaultdict(Decimal)
    in_june = False
    for line in ledger.read_text(encoding="utf-8").splitlines():
        header = re.match(r"(\d{4}-\d{2}-\d{2}) [*!]", line)
        if header:
            in_june = header.group(1).startswith("2026-06-")
            continue
        posting = re.match(r"\s+(Expenses:\S+)\s+(-?\d+\.\d+) USD", line)
        if in_june and posting:
            totals[posting.group(1)] += Decimal(posting.group(2))
    return dict(totals)


class TestFirstQueryWalkthrough(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = FIRST_QUERY_DOC.read_text(encoding="utf-8")
        cls.expected = june_expenses(FIXTURE)

    def test_documented_answer_matches_an_independent_sum_of_the_fixture(self):
        self.assertEqual(len(self.expected), 3)
        for account, amount in self.expected.items():
            self.assertRegex(self.doc, rf"{re.escape(account)}\s*\|\s*{amount} USD")

    def test_documented_query_returns_the_answer_and_leaves_the_ledger_unchanged(self):
        match = re.search(r'bea --file ledger\.beancount --json query "([^"]+)"', self.doc)
        self.assertIsNotNone(match, "first-query.md must show the re-runnable bea query")
        ci_check = load("ci_check", "ci-check.py")
        with contextlib.redirect_stderr(io.StringIO()):
            try:
                bea = ci_check.find_bea()
            except SystemExit:
                self.skipTest("bea is not available")
        with scratch_dir() as tmp:
            ledger = Path(tmp) / "ledger.beancount"
            shutil.copyfile(FIXTURE, ledger)
            before = ledger.read_bytes()
            result = subprocess.run(
                [*bea, "--file", str(ledger), "--json", "query", match.group(1)],
                capture_output=True,
                text=True,
                env=ci_check.env_without_global_bean_tools(),
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(ledger.read_bytes(), before)
        rows = json.loads(result.stdout)["data"]["rows"]
        answer = {account: Decimal(total[0]["units"]["number"]) for account, total in rows}
        self.assertEqual(answer, self.expected)
        self.assertEqual(rows[0][0], "Expenses:Food:Groceries")


if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__]))
    sys.exit(0 if result.wasSuccessful() else 1)
