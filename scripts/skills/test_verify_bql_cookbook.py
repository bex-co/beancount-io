#!/usr/bin/env python3
"""Exercise the BQL cookbook verifier against real bea.

BEA=/absolute/path/to/bea python3 scripts/skills/test_verify_bql_cookbook.py
"""
import contextlib
import importlib.util
import io
import os
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest import mock

SCRIPTS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("verify_bql_cookbook", SCRIPTS / "verify-bql-cookbook.py")
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)
BEA = os.environ.get("BEA") or shutil.which("bea")
if not BEA:
    # CI's uv sync creates this executable; no CLI implementation is imported.
    candidate = SCRIPTS.parents[1] / "cli/.venv/bin/bea"
    if candidate.is_file():
        BEA = str(candidate)
EVAL1 = "skills/beancount-ask/evals/files/eval1_ledger.beancount"


def cookbook_page(*recipes: str) -> str:
    return "# Test cookbook\n\n" + "\n\n".join(recipes) + "\n"


def recipe_block(name: str, fixture: str, query: str) -> str:
    return f"<!-- cookbook: {name} | fixture: {fixture} -->\n```sql\n{query}\n```"


class ParseTests(unittest.TestCase):
    def test_extracts_name_fixture_and_query_in_order(self):
        page = cookbook_page(
            recipe_block("first", EVAL1, "SELECT 1"),
            recipe_block("second", "other.bean", "SELECT 2\nWHERE x"),
        )
        self.assertEqual(
            verify.parse_recipes(page),
            [
                verify.Recipe("first", EVAL1, "SELECT 1"),
                verify.Recipe("second", "other.bean", "SELECT 2\nWHERE x"),
            ],
        )

    def test_ignores_unmarked_fences(self):
        page = "# Notes\n\n```sql\nSELECT 1\n```\n"
        self.assertEqual(verify.parse_recipes(page), [])

    def test_duplicate_names_raise(self):
        page = cookbook_page(
            recipe_block("same", EVAL1, "SELECT 1"),
            recipe_block("same", EVAL1, "SELECT 2"),
        )
        with self.assertRaisesRegex(ValueError, "duplicate cookbook recipe: same"):
            verify.parse_recipes(page)


class MalformedDeclarationTests(unittest.TestCase):
    """Markers that do not match the strict `cookbook: name | fixture: path` shape
    are not recipes; a page of only-malformed markers has no recipes at all."""

    def setUp(self):
        scratch = SCRIPTS / "tmp"
        scratch.mkdir(exist_ok=True)
        temporary = tempfile.TemporaryDirectory(dir=scratch)
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()

    def assert_no_recipes(self, page: str):
        path = self.root / "cookbook.md"
        path.write_text(page, encoding="utf-8")
        self.assertEqual(verify.parse_recipes(page), [])
        with self.assertRaisesRegex(ValueError, "no cookbook recipes found"):
            verify.verify(path, ["bea"], timeout=90)

    def test_marker_without_fixture_is_ignored(self):
        self.assert_no_recipes(
            cookbook_page(f"<!-- cookbook: lonely -->\n```sql\nSELECT 1\n```")
        )

    def test_marker_with_empty_name_is_ignored(self):
        self.assert_no_recipes(
            cookbook_page(f"<!-- cookbook:  | fixture: {EVAL1} -->\n```sql\nSELECT 1\n```")
        )

    def test_non_sql_fence_is_ignored(self):
        self.assert_no_recipes(
            cookbook_page(f"<!-- cookbook: bql-fence | fixture: {EVAL1} -->\n```bql\nSELECT 1\n```")
        )

    def test_marker_without_fence_is_ignored(self):
        self.assert_no_recipes(
            cookbook_page(f"<!-- cookbook: nofence | fixture: {EVAL1} -->\nSELECT 1\n")
        )


class TimeoutTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not BEA or not shutil.which(BEA):
            raise RuntimeError("bea is required: set BEA to an installed executable or run uv sync in cli/.")

    def test_sub_second_timeout_fails_with_timeout_detail(self):
        result = verify.run_recipe(
            [BEA],
            verify.Recipe("slow", EVAL1, "SELECT account WHERE account ~ '^Expenses:'"),
            timeout=0.001,
        )
        self.assertFalse(result.ok)
        self.assertTrue(
            result.detail.startswith("timed out after "),
            f"timeout must be reported, got: {result.detail}",
        )


class StatementCountTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not BEA or not shutil.which(BEA):
            raise RuntimeError("bea is required: set BEA to an installed executable or run uv sync in cli/.")

    def test_two_statements_fail(self):
        result = verify.run_recipe(
            [BEA],
            verify.Recipe("two", EVAL1, "SELECT account WHERE account ~ '^Expenses:'; SELECT 1"),
            timeout=90,
        )
        self.assertFalse(result.ok)
        self.assertIn("One BQL statement per invocation", result.detail)

    def test_trailing_semicolon_passes(self):
        result = verify.run_recipe(
            [BEA],
            verify.Recipe("semi", EVAL1, "SELECT account WHERE account ~ '^Expenses:';"),
            timeout=90,
        )
        self.assertTrue(result.ok, result.detail)


class RunnerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not BEA or not shutil.which(BEA):
            raise RuntimeError("bea is required: set BEA to an installed executable or run uv sync in cli/.")

    def setUp(self):
        scratch = SCRIPTS / "tmp"
        scratch.mkdir(exist_ok=True)
        temporary = tempfile.TemporaryDirectory(dir=scratch)
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()

    def run_recipe(self, query: str, fixture: str = EVAL1) -> verify.RecipeResult:
        return verify.run_recipe([BEA], verify.Recipe("probe", fixture, query), timeout=90)

    def test_broken_query_fails(self):
        result = self.run_recipe("THIS IS NOT BQL")
        self.assertFalse(result.ok)
        self.assertIn("bea failed", result.detail)

    def test_empty_result_fails(self):
        result = self.run_recipe(
            "SELECT account WHERE account ~ '^Expenses:' AND date >= 2030-01-01"
        )
        self.assertFalse(result.ok)
        self.assertEqual(result.detail, "zero rows")

    def test_missing_fixture_fails(self):
        result = self.run_recipe("SELECT 1", fixture="docs/skills/examples/no-such-dir/nope.beancount")
        self.assertFalse(result.ok)
        self.assertIn("missing fixture", result.detail)

    def test_healthy_query_passes(self):
        result = self.run_recipe("SELECT account WHERE account ~ '^Expenses:'")
        self.assertTrue(result.ok, result.detail)
        self.assertIn("rows", result.detail)

    def test_verify_rejects_a_cookbook_without_recipes(self):
        page = self.root / "cookbook.md"
        page.write_text("# Empty\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "no cookbook recipes found"):
            verify.verify(page, [BEA], timeout=90)

    def test_main_reports_failures_and_exits_nonzero(self):
        page = self.root / "cookbook.md"
        page.write_text(
            cookbook_page(recipe_block("broken", EVAL1, "THIS IS NOT BQL")),
            encoding="utf-8",
        )
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            with mock.patch.object(verify, "find_bea", return_value=[BEA]):
                self.assertEqual(verify.main(["--cookbook", str(page)]), 1)
        self.assertIn("FAIL broken", stdout.getvalue())


class CommittedCookbookTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not BEA or not shutil.which(BEA):
            raise RuntimeError("bea is required: set BEA to an installed executable or run uv sync in cli/.")

    def test_committed_cookbook_passes(self):
        results = verify.verify(verify.DEFAULT_COOKBOOK, [BEA], timeout=90)
        self.assertGreaterEqual(len(results), 20)
        failures = [f"{r.recipe.name}: {r.detail}" for r in results if not r.ok]
        self.assertEqual(failures, [])


if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__)))
    raise SystemExit(0 if result.wasSuccessful() else 1)
