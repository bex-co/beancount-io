#!/usr/bin/env python3
"""Tests for scan-secrets.py: it scans what git would publish, no more and no less.

    python3 scripts/test_scan_secrets.py
"""

from __future__ import annotations

import importlib.util
import os
import pathlib
import secrets
import shutil
import subprocess
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parent / "scan-secrets.py"
spec = importlib.util.spec_from_file_location("scan_secrets", SCRIPT)
assert spec and spec.loader
scan = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scan)


def fake_secret() -> str:
    """A GitHub-token-shaped string built at run time, so no literal here looks like a credential.

    gitleaks treats the documentation keys (anything saying EXAMPLE) as safe, so a real-looking
    random value is what makes the scanner fire.
    """
    return f'token = "ghp_{secrets.token_hex(18)}"\n'



def git(repo: pathlib.Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True)


class PublishableFilesTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.repo = pathlib.Path(self._tmp.name)
        git(self.repo, "init", "-q")
        git(self.repo, "config", "user.email", "t@example.invalid")
        git(self.repo, "config", "user.name", "t")
        (self.repo / ".gitignore").write_text(".env\n.tmp/\n")
        (self.repo / "tracked.txt").write_text("hello\n")
        (self.repo / "gone.txt").write_text("bye\n")
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-q", "-m", "init")

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def names(self) -> list[str]:
        return scan.publishable_files(self.repo)

    def test_lists_tracked_files(self) -> None:
        self.assertIn("tracked.txt", self.names())
        self.assertIn(".gitignore", self.names())

    def test_skips_gitignored_files_however_secret_they_look(self) -> None:
        (self.repo / ".env").write_text(fake_secret())
        (self.repo / ".tmp").mkdir()
        (self.repo / ".tmp" / "qa.env").write_text(fake_secret())
        names = self.names()
        self.assertNotIn(".env", names)
        self.assertNotIn(".tmp/qa.env", names)

    def test_includes_a_new_file_git_does_not_ignore(self) -> None:
        (self.repo / "new.txt").write_text(fake_secret())
        self.assertIn("new.txt", self.names())

    def test_skips_a_tracked_file_deleted_from_the_working_tree(self) -> None:
        (self.repo / "gone.txt").unlink()
        self.assertNotIn("gone.txt", self.names())

    def test_stage_copies_the_listed_files_and_symlinks_only(self) -> None:
        (self.repo / "dir").mkdir()
        (self.repo / "dir" / "a.txt").write_text("a\n")
        os.symlink("tracked.txt", self.repo / "link")
        (self.repo / ".env").write_text(fake_secret())
        with tempfile.TemporaryDirectory() as out:
            scratch = pathlib.Path(out)
            scan.stage(self.repo, self.names(), scratch)
            self.assertEqual((scratch / "dir" / "a.txt").read_text(), "a\n")
            self.assertTrue((scratch / "link").is_symlink())
            self.assertFalse((scratch / ".env").exists())


@unittest.skipUnless(shutil.which("gitleaks"), "gitleaks is not installed")
class EndToEndTest(unittest.TestCase):
    """The real scanner: a gitignored secret passes, an unignored one fails."""

    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.repo = pathlib.Path(self._tmp.name)
        git(self.repo, "init", "-q")
        (self.repo / ".gitignore").write_text(".env\n")
        git(self.repo, "add", ".")

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def run_scan(self) -> int:
        completed = subprocess.run(
            ["python3", str(SCRIPT)], cwd=self.repo, capture_output=True, text=True, check=False
        )
        self.last = completed
        return completed.returncode

    def test_a_gitignored_secret_is_not_reported(self) -> None:
        (self.repo / ".env").write_text(fake_secret())
        self.assertEqual(self.run_scan(), 0, self.last.stderr)

    def test_an_unignored_secret_fails_the_scan(self) -> None:
        (self.repo / "settings.txt").write_text(fake_secret())
        self.assertEqual(self.run_scan(), 1, self.last.stderr)


if __name__ == "__main__":
    unittest.main()
