#!/usr/bin/env python3
"""Behavioral tests for installation, shared bea recipes, and customer journeys.

Stdlib unittest only (the skills CI has no pytest): run with
`python3 scripts/skills/test_beancount_skills.py` from the repository root.
Tests install the real suite into temporary destinations and assert file
effects; the Git tests rehearse the documented clone and update commands.
"""

from __future__ import annotations

import contextlib
import csv
import hashlib
import importlib.util
import io
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import unittest
from collections import Counter, defaultdict
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from string import Template
from unittest import mock

SCRIPTS_DIR = Path(__file__).resolve().parent
SKILLS_ROOT = SCRIPTS_DIR.parents[1] / "skills"
SUITE = SKILLS_ROOT
DOCS = SCRIPTS_DIR.parents[1] / "docs" / "skills"
INSTALL_DOC = DOCS / "installation.md"
FIRST_QUERY_DOC = DOCS / "first-query.md"
FIXTURE = SUITE / "beancount-ask" / "evals" / "files" / "eval1_ledger.beancount"


def load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS_DIR / filename)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


skills = load("beancount_skills", "beancount-skills.py")


def scratch_dir() -> tempfile.TemporaryDirectory:
    scratch = SCRIPTS_DIR / "tmp"
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


def suite_snapshot() -> dict[str, str]:
    """The customer skill folders only; `skills/` also holds the catalog and guides."""
    return {name: snapshot(SUITE / name) for name in skills.expected_skills()}


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
        shutil.copyfile(SUITE / "LICENSE", dest / "LICENSE")


class TestOldLayoutUpgrade(Workspace):
    """Installs made before w2/m42 link into this checkout's skills/.claude/skills."""

    def old_links(self, layout: Path) -> None:
        self.dest.mkdir(parents=True, exist_ok=True)
        for name in skills.expected_skills():
            (self.dest / name).symlink_to(layout / name, target_is_directory=True)

    def test_verify_names_the_old_layout_and_the_repair_without_writing(self):
        self.old_links(skills.OLD_LAYOUT)
        before = snapshot(self.dest)
        code, _, err = run("verify", self.dest)
        self.assertEqual(code, 1)
        self.assertEqual(err.count("links to the old skills/.claude/skills layout; repair with: python3"), len(skills.expected_skills()))
        self.assertNotIn("link to missing", err)
        self.assertEqual(snapshot(self.dest), before)

    def test_install_relinks_old_layout_links_and_the_suite_verifies(self):
        self.old_links(skills.OLD_LAYOUT)
        sentinel_before = self.sentinel.read_bytes()
        code, out, err = run("install", self.dest)
        self.assertEqual(code, 0, err)
        self.assertEqual(out.count("(moved from skills/.claude/skills)"), len(skills.expected_skills()))
        for name in skills.expected_skills():
            self.assertTrue(skills.is_linked(self.dest / name), name)
        self.assertIn(f"OK {len(skills.expected_skills())} customer skills complete", out)
        self.assertEqual(self.sentinel.read_bytes(), sentinel_before)

    def test_another_checkouts_old_layout_is_still_a_conflict(self):
        other = self.root / "other-checkout" / "skills" / ".claude" / "skills"
        self.old_links(other)
        before = snapshot(self.dest)
        code, _, err = run("install", self.dest)
        self.assertEqual(code, 1)
        self.assertIn(f"{self.dest / 'beancount-ask'} links to {other / 'beancount-ask'} (target missing), not this checkout", err)
        self.assertEqual(snapshot(self.dest), before)

    def test_uninstall_removes_this_checkouts_old_links_only(self):
        self.old_links(skills.OLD_LAYOUT)
        theirs = self.root / "other-checkout" / "skills" / ".claude" / "skills" / "beancount-ask"
        (self.dest / "beancount-ask").unlink()
        (self.dest / "beancount-ask").symlink_to(theirs, target_is_directory=True)
        code, out, _ = run("uninstall", self.dest)
        self.assertEqual(code, 0)
        self.assertTrue((self.dest / "beancount-ask").is_symlink())
        for name in skills.expected_skills():
            if name != "beancount-ask":
                self.assertFalse(os.path.lexists(self.dest / name), name)


class TestInstall(Workspace):
    def test_inventory_is_the_customer_skills(self):
        # The one deliberate list of the suite; other tests count from it.
        self.assertEqual(
            skills.expected_skills(),
            [
                "beancount-add",
                "beancount-ask",
                "beancount-close",
                "beancount-import",
                "beancount-importer-author",
                "beancount-init",
                "beancount-migrate",
                "beancount-options",
                "beancount-property",
                "beancount-reconcile",
                "beancount-trade",
            ],
        )

    def test_install_links_each_skill_and_keeps_unrelated_entries(self):
        sentinel_before = self.sentinel.read_bytes()
        code, out, _ = run("install", self.dest)
        self.assertEqual(code, 0)
        self.assertIn(f"OK {len(skills.expected_skills())} customer skills complete", out)
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
        self.assertEqual(out.count("kept   "), len(skills.expected_skills()))
        self.assertEqual(len(list(self.dest.glob("beancount-*"))), len(skills.expected_skills()))

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

    def test_a_file_or_dangling_destination_is_refused_and_the_rest_install(self):
        stray = self.root / "file"
        stray.write_text("keep\n")
        dangling = self.root / "dangling"
        dangling.symlink_to(self.root / "nowhere")
        refused = [
            (stray, f"FAIL {stray} is a file, not a directory. Nothing was installed there."),
            (
                dangling,
                f"FAIL {dangling} links to {self.root / 'nowhere'} (target missing). Nothing was installed there.",
            ),
            (stray / "sub", f"FAIL {stray / 'sub'}: {stray} is a file, not a directory. Nothing was installed there."),
        ]
        code, _, err = run("install", *(dest for dest, _ in refused), self.dest)

        self.assertEqual(code, 1)
        self.assertNotIn("Traceback", err)
        for _, line in refused:
            self.assertIn(line + "\n", err)
        self.assertEqual(stray.read_text(), "keep\n")
        self.assertFalse((self.root / "nowhere").exists())
        self.assertEqual(run("verify", self.dest)[0], 0, "the destination after the refused ones installs")

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
        state = lambda: (snapshot(self.dest), snapshot(copy), suite_snapshot(), self.ledger.read_bytes())  # noqa: E731
        before = state()
        code, out, err = run("verify", self.dest, copy)
        self.assertEqual((code, err), (0, ""))
        self.assertEqual(out.count(f"OK {len(skills.expected_skills())} customer skills complete"), 2)
        self.assertEqual(state(), before)

    def test_verify_notes_a_plugin_install_without_failing(self):
        run("install", self.dest)
        cached = self.root / "home/.codex/plugins/cache/beancount-io/beancount-io/0.1.0/skills/beancount-ask/SKILL.md"
        cached.parent.mkdir(parents=True)
        cached.write_text("x")
        with mock.patch.dict(os.environ, {"HOME": str(self.root / "home")}):
            code, out, err = run("verify", self.dest)
        self.assertEqual((code, err), (0, ""))
        self.assertIn("note: the beancount-io plugin also provides this suite to Codex", out)
        self.assertNotIn("Claude Code", out)

    def test_missing_reference_names_the_file_and_the_line_that_needs_it(self):
        self.copy_suite(self.dest)
        (self.dest / "beancount-close" / "references" / "close-checklist.md").unlink()
        before = snapshot(self.dest)
        code, _, err = run("verify", self.dest)
        self.assertEqual(code, 1)
        self.assertRegex(
            err,
            r"FAIL beancount-close/references/close-checklist\.md is missing "
            r"\(beancount-close/SKILL\.md:\d+ needs it\)",
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

    def test_shared_cli_reference_is_required_by_installed_workflows(self):
        self.copy_suite(self.dest)
        (self.dest / "beancount-init" / "references" / "bea-cli.md").unlink()
        code, _, err = run("verify", self.dest)
        self.assertEqual(code, 1)
        self.assertIn("FAIL beancount-init/references/bea-cli.md is missing", err)
        self.assertIn("beancount-reconcile/SKILL.md:", err)
        self.assertNotIn("FAIL beancount-reconcile/references/bea-cli.md", err)

    def test_add_skill_names_the_shared_contract_and_sibling_it_cannot_run_without(self):
        self.copy_suite(self.dest)
        (self.dest / "beancount-init" / "references" / "bea-cli.md").unlink()
        code, _, err = run("verify", self.dest)
        self.assertEqual(code, 1)
        self.assertRegex(err, r"FAIL beancount-init/references/bea-cli\.md is missing \(beancount-add/SKILL\.md:\d+ needs it\)")
        shutil.rmtree(self.dest / "beancount-init")
        code, _, err = run("verify", self.dest)
        self.assertEqual(code, 1)
        self.assertRegex(err, r"FAIL beancount-add refers to beancount-init \(beancount-add/SKILL\.md:\d+\), which is not installed")

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

    def test_a_destination_that_is_not_a_directory_is_named(self):
        stray = self.root / "file"
        stray.write_text("")
        (self.root / "dangling").symlink_to(self.root / "nowhere")
        for dest, reason in [
            (stray, f"FAIL {stray} is a file, not a directory\n"),
            (self.root / "dangling", f"links to {self.root / 'nowhere'} (target missing)\n"),
        ]:
            with self.subTest(dest=dest.name):
                code, _, err = run("verify", dest)
                self.assertEqual(code, 1)
                self.assertTrue(err.endswith(reason), err)
                self.assertNotIn("does not exist", err)


class TestBundle(Workspace):
    def test_each_bundle_installed_alone_has_every_reference_it_names(self):
        out = self.root / "bundles"
        before = suite_snapshot()
        code, _, err = run("bundle", out)
        self.assertEqual((code, err), (0, ""))
        self.assertEqual(suite_snapshot(), before, "bundling must not touch the checkout")
        names = skills.expected_skills()
        self.assertEqual(sorted(p.name for p in out.iterdir()), names)
        for name in names:
            with self.subTest(skill=name):
                alone = self.root / "alone" / name
                shutil.copytree(out / name, alone / name)
                missing_files, _ = skills.missing_references(alone, name, names, [name])
                self.assertEqual(missing_files, {})
                self.assertFalse((alone / name / "evals").exists())
                self.assertEqual((alone / name / "LICENSE").read_bytes(), (SUITE / "LICENSE").read_bytes())

    def test_a_missing_suite_license_is_refused_without_creating_output(self):
        source = self.root / "suite"
        self.copy_suite(source)
        (source / "LICENSE").unlink()
        out = self.root / "bundles"
        before = snapshot(source)
        with mock.patch.object(skills, "SOURCE_DIR", source):
            code, _, err = run("bundle", out)
        self.assertEqual(code, 1)
        self.assertIn("skills/LICENSE is missing", err)
        self.assertFalse(out.exists())
        self.assertEqual(snapshot(source), before)

    def test_a_sibling_bundle_beside_it_does_not_stand_in_for_a_vendored_reference(self):
        out = self.root / "bundles"
        run("bundle", out)
        # beancount-options sorts after beancount-init, so resolving in a shared
        # directory would find init's copy instead of vendoring one.
        shared = (SUITE / "beancount-init" / "references" / "bea-cli.md").read_bytes()
        self.assertEqual((out / "beancount-options" / "references" / "bea-cli.md").read_bytes(), shared)

    def test_a_reference_no_skill_owns_fails_the_build(self):
        source = self.root / "suite"
        self.copy_suite(source)
        with (source / "beancount-ask" / "SKILL.md").open("a") as handle:
            handle.write("\nRead beancount-init's `references/nowhere.md` first.\n")
        out = self.root / "bundles"
        with mock.patch.object(skills, "SOURCE_DIR", source):
            code, _, err = run("bundle", out)
        self.assertEqual(code, 1)
        # As in verify, a file no skill has is attributed to the skill that names it.
        self.assertRegex(
            err,
            r"FAIL beancount-ask: beancount-ask/references/nowhere\.md is missing \(beancount-ask/SKILL\.md:\d+ needs it\)",
        )
        self.assertIn("do not publish them", err)

    def test_a_non_empty_output_is_refused_without_writing(self):
        out = self.root / "bundles"
        out.mkdir()
        (out / "keep").write_text("mine\n")
        code, _, err = run("bundle", out)
        self.assertEqual(code, 1)
        self.assertIn("must be an empty or new directory", err)
        self.assertEqual([p.name for p in out.iterdir()], ["keep"])


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
            [
                "git", "-c", "user.name=Test", "-c", "user.email=test@example.com",
                # Personal hooks must not rewrite synthetic fixture commits.
                "-c", f"core.hooksPath={self.root / 'empty-hooks'}", *args,
            ],
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
        for name in skills.expected_skills():
            shutil.copytree(SUITE / name, self.origin / "skills" / name)
        (self.origin / "scripts" / "skills").mkdir(parents=True)
        shutil.copy2(SCRIPTS_DIR / "beancount-skills.py", self.origin / "scripts" / "skills")
        dev = self.origin / ".agents" / "skills" / "ship" / "SKILL.md"
        dev.parent.mkdir(parents=True)
        dev.write_text("---\nname: ship\ndescription: development only\n---\n")
        for args in (("init", "-q", "-b", "main"), ("add", "."), ("commit", "-qm", "suite")):
            self.git_ok(self.origin, *args)
        self.git_ok(self.origin, "config", "uploadpack.allowFilter", "true")

        self.src = self.root / "src"
        self.git_ok(self.root, "clone", "-q", *clone.group(1).split(), f"file://{self.origin}", str(self.src))
        self.git_ok(self.src, "sparse-checkout", "set", *sparse.group(1).split())
        self.script = self.src / "scripts" / "skills" / "beancount-skills.py"

    def cli(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, str(self.script), *args], capture_output=True, text=True)

    def commit_upstream(self, rel: str, text: str) -> None:
        (self.origin / rel).write_text(text)
        self.git_ok(self.origin, "commit", "-qam", f"update {rel}")

    def test_the_documented_upgrade_relinks_an_install_from_the_old_layout(self):
        doc = INSTALL_DOC.read_text(encoding="utf-8")
        upgrade = re.search(r"<!-- upgrade -->\n```sh\n(.*?)\n```", doc, re.DOTALL)
        self.assertIsNotNone(upgrade, "installation.md must show the upgrade commands")
        # Upstream before w2/m42: the suite sat in skills/.claude/skills, and
        # the documented sparse checkout fetched `skills` only.
        origin = self.root / "old-origin"
        for name in skills.expected_skills():
            shutil.copytree(SUITE / name, origin / "skills" / ".claude" / "skills" / name)
        for args in (("init", "-q", "-b", "main"), ("add", "."), ("commit", "-qm", "old layout")):
            self.git_ok(origin, *args)
        self.git_ok(origin, "config", "uploadpack.allowFilter", "true")
        home, data = self.root / "home", self.root / "data"
        src = data / "beancount-io"
        self.git_ok(self.root, "clone", "-q", "--depth", "1", "--filter=blob:none", "--sparse", f"file://{origin}", str(src))
        self.git_ok(src, "sparse-checkout", "set", "skills")
        dests = [self.dest, home / ".agents" / "skills"]
        for dest in dests:
            dest.mkdir(parents=True, exist_ok=True)
            for name in skills.expected_skills():
                (dest / name).symlink_to(src.resolve() / "skills" / ".claude" / "skills" / name, target_is_directory=True)

        for name in skills.expected_skills():
            self.git_ok(origin, "mv", f"skills/.claude/skills/{name}", f"skills/{name}")
        (origin / "scripts" / "skills").mkdir(parents=True)
        shutil.copy2(SCRIPTS_DIR / "beancount-skills.py", origin / "scripts" / "skills")
        self.git_ok(origin, "add", "scripts")
        self.git_ok(origin, "commit", "-qm", "move the suite")

        result = subprocess.run(
            ["sh", "-c", upgrade.group(1)],
            env={**os.environ, "HOME": str(home), "XDG_DATA_HOME": str(data)},
            capture_output=True,
            text=True,
            timeout=120,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        count = len(skills.expected_skills())
        self.assertEqual(result.stdout.count("(moved from skills/.claude/skills)"), 2 * count)
        self.assertEqual(result.stdout.count(f"OK {count} customer skills complete"), 2)
        for dest in dests:
            for name in skills.expected_skills():
                self.assertEqual((dest / name).resolve(), (src / "skills" / name).resolve())
        self.assertTrue(self.sentinel.exists())

    def test_sparse_checkout_holds_the_customer_suite_only(self):
        self.assertFalse((self.src / ".agents").exists())
        result = self.cli("install", str(self.dest))
        self.assertEqual(result.returncode, 0, result.stderr)
        linked = sorted(p.name for p in self.dest.iterdir() if p.is_symlink())
        self.assertEqual(linked, skills.expected_skills())

    def test_update_keeps_local_edits_and_stops_on_overlapping_changes(self):
        self.assertEqual(self.cli("install", str(self.dest)).returncode, 0)
        ask = "skills/beancount-ask/SKILL.md"
        init = "skills/beancount-init/SKILL.md"
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
        new = self.origin / "skills" / "beancount-budget" / "SKILL.md"
        new.parent.mkdir()
        new.write_text("---\nname: beancount-budget\ndescription: new\n---\n")
        self.git_ok(self.origin, "add", ".")
        self.git_ok(self.origin, "commit", "-qm", "add budget")
        self.git_ok(self.src, "pull", "-q", "--ff-only")

        result = self.cli("install", str(self.dest))

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("linked", result.stdout)
        self.assertIn(f"OK {len(skills.expected_skills()) + 1} customer skills complete", result.stdout)
        self.assertTrue((self.dest / "beancount-budget").is_symlink())


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


class TestDedupConvention(unittest.TestCase):
    def test_the_lot_example_hashes_to_the_id_bea_writes(self):
        # bea hashes a source posting's lot with its units (w5/349); the
        # documented grammar importers follow must give the same id (w5/555).
        text = (SUITE / "beancount-import" / "references" / "dedup.md").read_text(encoding="utf-8")
        example = re.search(r'With a lot \([^)]*\): `([^`]+)` → `import-id: "csv:sha256:([0-9a-f]{16})"`', text)
        self.assertIsNotNone(example, "dedup.md must show a lot-bearing example")
        hashed, written = example.groups()
        self.assertEqual(hashed, "2026-05-07|10 AAPL {100 USD}|BUY AAPL|Assets:Broker:AAPL")
        self.assertEqual(hashlib.sha256(hashed.encode()).hexdigest()[:16], written)
        self.assertEqual(written, "d11701f46efbd599")

    def test_the_pdf_example_hashes_to_its_documented_id(self):
        text = (SUITE / "beancount-import" / "references" / "dedup.md").read_text(encoding="utf-8")
        example = re.search(r'input `([^`]+)` → `import-id: "pdf:sha256:([0-9a-f]{16})"`', text)
        self.assertIsNotNone(example, "dedup.md must show a PDF worked example")
        hashed, written = example.groups()
        self.assertEqual(hashed, "2026-06-03|-12.4 USD|STARBUCKS STORE 12345|Assets:Bank:Checking")
        self.assertEqual(hashlib.sha256(hashed.encode()).hexdigest()[:16], written)


RECIPE_MARK = re.compile(r"<!-- recipe: ([a-z0-9-]+) -->")


class TestBeaRecipes(unittest.TestCase):
    """Execute the shipped Markdown recipes against isolated synthetic books."""

    @classmethod
    def setUpClass(cls):
        cls.ci_check = load("ci_check", "ci-check.py")
        cls.bea = cls.ci_check.find_bea()
        # Keep the executable available even if its directory also has bean-*.
        cls.bea[0] = shutil.which(cls.bea[0]) or cls.bea[0]
        # The CI leg against the published minimum release sets this; the
        # default leg runs the checkout's bea, which also reports that version.
        cls.published = os.environ.get("SKILLS_BEA") == "published"
        # Every suite document that carries an executable recipe; names are
        # unique across them (test_recipe_names_are_unique_across_the_suite).
        cls.documents = "\n".join(
            text
            for path in sorted(SUITE.glob("beancount-*/**/*.md"))
            if RECIPE_MARK.search(text := path.read_text(encoding="utf-8"))
        )

    def setUp(self):
        temporary = scratch_dir()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.books = self.root / "books with spaces"
        self.books.mkdir()
        self.ledger = self.books / "household.beancount"
        self.target = self.books / "transactions" / "2026.bean"
        self.target.parent.mkdir()
        self.target.write_text("; Approved transaction destination\n")
        self.ledger.write_text(
            'option "operating_currency" "USD"\n'
            "2023-01-01 open Assets:Checking USD\n"
            "2023-01-01 open Expenses:Dining USD\n"
            "2023-01-01 open Equity:OpeningBalances USD\n"
            'include "transactions/2026.bean"\n'
        )
        # A valid decoy catches accidental reliance on cwd discovery.
        self.decoy = self.root / "main.bean"
        self.decoy.write_bytes(self.ledger.read_bytes().replace(b'include "transactions/2026.bean"\n', b""))
        self.decoy_before = self.decoy.read_bytes()
        self.env = self.ci_check.env_without_global_bean_tools({
            "BEA_CONFIG_DIR": str(self.root / "bea-config"),
            "XDG_CONFIG_HOME": str(self.root / "xdg-config"),
            "XDG_CACHE_HOME": str(self.root / "xdg-cache"),
        })
        for name in ("BEA_FILE", "BEA_TOKEN", "BEA_ENGINE_PYTHON", "BEA_ENGINE_DIR"):
            self.env.pop(name, None)
        self.values = {
            "ledger": str(self.ledger),
            "target": "transactions/2026.bean",
            "open_target": self.ledger.name,
            "open_date": "2023-01-01",
            "account": "Assets:Checking",
            "batch": str(self.root / "confirmed.json"),
            "assertion_date": "2026-06-01",
            "amount": "-12.50 USD",
        }

    def block(self, name: str, language: str = "sh") -> str:
        match = re.search(
            rf"<!-- recipe: {re.escape(name)} -->\n```{language}\n(.*?)\n```",
            self.documents,
            re.DOTALL,
        )
        self.assertIsNotNone(match, f"Missing executable recipe {name}")
        return match.group(1)

    def recipe(self, name: str, *, succeeds: bool = True, envelope: bool = False, **values: str):
        """Run a shipped shell recipe; `values` update its `$placeholders` first."""
        self.values.update(values)
        tokens = shlex.split(self.block(name))
        self.assertEqual(tokens[0], "bea")
        args = [Template(token).substitute(self.values) for token in tokens[1:]]
        result = subprocess.run(
            [*self.bea, *args], cwd=self.root, env=self.env,
            capture_output=True, text=True, timeout=90,
        )
        self.assertEqual(self.decoy.read_bytes(), self.decoy_before)
        if succeeds:
            self.assertEqual(result.returncode, 0, result.stderr)
            answer = json.loads(result.stdout)
            return answer if envelope else answer["data"]
        self.assertNotEqual(result.returncode, 0, result.stdout)
        return result

    def query_recipe(self, name: str, **placeholders: str):
        """Run a shipped BQL recipe, filling its `<placeholder>` slots."""
        query = " ".join(self.block(name, "sql").split())
        for placeholder, value in placeholders.items():
            query = query.replace(placeholder, value)
        self.assertNotIn("<", query.replace("< ", ""), f"unfilled placeholder in {query}")
        result = subprocess.run(
            [*self.bea, "--file", self.values["ledger"], "--json", "--no-input", "query", query],
            cwd=self.root, env=self.env, capture_output=True, text=True, timeout=90,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)["data"]["rows"]

    def batch(self, rows=None):
        rows = json.loads(self.block("batch-json", "json")) if rows is None else rows
        Path(self.values["batch"]).write_text(json.dumps(rows))
        return rows

    def csv(self, text: str, mapping: str):
        export = self.root / "export.csv"
        export.write_text(text)
        rules = self.books / "import-rules" / "checking.toml"
        rules.parent.mkdir()
        rules.write_text('[[rule]]\nmatch = "Coffee"\naccount = "Expenses:Dining"\n')
        self.values.update({
            "export": str(export), "mapping": mapping, "rules": str(rules),
            "date_format": "%Y-%m-%d", "duplicates": "review",
        })

    def test_csv_preview_apply_repeat_keeps_sign_rules_and_destination(self):
        self.csv(
            "Date,Description,Amount\n2026-05-07,Coffee,12.50\n",
            "date=Date,amount=Amount,narration=Description,sign=ledger",
        )
        before = (self.ledger.read_bytes(), self.target.read_bytes())
        durable = self.values["rules"]
        draft = self.root / "draft-rules.toml"
        shutil.copyfile(durable, draft)
        Path(durable).unlink()
        self.values["rules"] = str(draft)
        preview = self.recipe("csv-preview")
        self.assertEqual(preview["rows"][0]["amount"], "-12.50 USD")
        self.assertEqual((self.ledger.read_bytes(), self.target.read_bytes()), before)
        # Confirmation makes the rules durable; transient preview files can go.
        self.values["rules"] = durable
        shutil.copyfile(draft, durable)
        draft.unlink()
        self.recipe("csv-preview")
        applied = self.recipe("csv-apply")
        self.assertEqual(applied["written"], 1)
        self.assertEqual(self.ledger.read_bytes(), before[0])
        self.assertIn("Expenses:Dining", self.target.read_text())
        self.assertNotIn("Expenses:Uncategorized", self.target.read_text())
        written = self.target.read_bytes()
        repeat = self.recipe("csv-preview")
        self.assertEqual((repeat["ready"], repeat["duplicates"]), (0, 1))
        self.assertEqual(self.target.read_bytes(), written)
        self.recipe("check")

    def test_duplicate_window_reads_manual_entry_cli_does_not_flag(self):
        self.target.write_text(
            '2026-05-05 * "Coffee" "Manual card purchase"\n'
            "  Assets:Checking -12.50 USD\n  Expenses:Dining 12.50 USD\n"
            '\n2026-05-08 * "Imported Grocer" "Already recorded"\n'
            '  import-id: "ofx:other"\n  import-id-2: "bank:other"\n'
            "  Assets:Checking -5 USD\n  Expenses:Dining 5 USD\n"
        )
        self.csv(
            "Date,Payee,Amount\n2026-05-07,Coffee,-12.50\n",
            "date=Date,amount=Amount,payee=Payee,sign=bank",
        )
        before = self.target.read_bytes()
        preview = self.recipe("csv-preview")
        self.assertEqual(preview["possible_duplicates"], 0)
        self.values.update(window_start="2026-05-04", window_end="2026-05-10")
        rows = self.recipe("duplicate-window")["rows"]
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0][:3], ["2026-05-05", "Coffee", "Manual card purchase"])
        self.assertEqual(rows[0][4:], [None, None])
        self.assertEqual(rows[1][4:], ["ofx:other", "bank:other"])
        self.assertEqual(self.target.read_bytes(), before)

    def test_batch_preserves_metadata_in_target_and_rejects_invalid_batch_atomically(self):
        rows = self.batch()
        before = (self.ledger.read_bytes(), self.target.read_bytes())
        invalid = {**rows[0], "date": "2026-05-08", "postings": [rows[0]["postings"][0]]}
        self.batch([*rows, invalid])
        self.recipe("batch", succeeds=False)
        self.assertEqual((self.ledger.read_bytes(), self.target.read_bytes()), before)
        self.batch(rows)
        self.recipe("batch")
        self.assertEqual(self.ledger.read_bytes(), before[0])
        self.assertIn('import-id: "ofx:2026050701"', self.target.read_text())
        self.recipe("balance")
        self.assertIn("2026-06-01 balance Assets:Checking", self.target.read_text())
        self.recipe("check")

    def test_recipe_names_are_unique_across_the_suite(self):
        names = RECIPE_MARK.findall(self.documents)
        self.assertEqual([n for n, count in Counter(names).items() if count > 1], [])

    def one_off(self, date: str = "2026-05-07", amount: str = "12.50", *, succeeds: bool = True):
        return self.recipe(
            "transaction", succeeds=succeeds, entry_date=date, payee="Pizzeria", narration="Dinner",
            posting_1=f"Expenses:Dining {amount} USD", posting_2="Assets:Checking",
        )

    def dinner(self, date: str, amount: str) -> None:
        """An entry already in the books, written as text for the reads under test."""
        with self.target.open("a", encoding="utf-8") as books:
            books.write(f'{date} * "Pizzeria" "Dinner"\n  Expenses:Dining {amount} USD\n  Assets:Checking\n')

    def test_one_off_transaction_lands_in_the_included_destination_and_is_found_again(self):
        # Decoys at another amount and outside the three-day window.
        self.dinner("2026-05-07", "12.51")
        self.dinner("2026-05-11", "12.50")
        before = self.ledger.read_bytes()
        self.one_off()
        self.assertEqual(self.ledger.read_bytes(), before)
        self.assertEqual(self.target.read_text().count('2026-05-07 * "Pizzeria" "Dinner"'), 2)
        # The add skill's duplicate read: the same signed amount on the account,
        # within ±3 days, and nothing else.
        rows = self.recipe(
            "already-recorded", number="-12.50", currency="USD", window_start="2026-05-04", window_end="2026-05-10"
        )["rows"]
        self.assertEqual([(r[0], r[3]) for r in rows], [("2026-05-07", "-12.50")])
        self.assertTrue(rows[0][5].endswith(self.values["target"]))
        # Its destination read names the included file that holds the postings.
        destination = self.recipe("entry-destination")["rows"]
        self.assertEqual(len(destination), 1)
        self.assertTrue(destination[0][0].endswith(self.values["target"]))

    def test_one_off_write_outside_the_included_files_is_refused_and_creates_nothing(self):
        orphan = self.books / "transactions" / "orphan.bean"
        orphan.write_text("; not included by the root\n")
        before = (self.ledger.read_bytes(), self.target.read_bytes(), orphan.read_bytes())
        for destination in ("transactions/orphan.bean", "transactions/missing.bean"):
            with self.subTest(destination=destination):
                self.values["target"] = destination
                refused = self.one_off(succeeds=False)
                self.assertIn("is not included by", refused.stdout + refused.stderr)
                self.assertEqual((self.ledger.read_bytes(), self.target.read_bytes(), orphan.read_bytes()), before)
        self.assertFalse((self.books / "transactions" / "missing.bean").exists())

    def test_open_accounts_lists_unused_accounts_and_drops_closed_ones(self):
        rows = self.recipe("open-accounts")["rows"]
        self.assertEqual([r[0] for r in rows], ["Assets:Checking", "Equity:OpeningBalances", "Expenses:Dining"])
        with self.ledger.open("a", encoding="utf-8") as root:
            root.write("2026-05-01 close Equity:OpeningBalances\n")
        self.assertEqual(
            [r[0] for r in self.recipe("open-accounts")["rows"]], ["Assets:Checking", "Expenses:Dining"]
        )

    def test_close_over_a_balance_is_read_first_and_refused(self):
        # The skill reads the balance itself, because bea 0.3.1 writes the close
        # anyway; the checkout's bea refuses it until the account is empty.
        self.dinner("2026-05-07", "12.50")
        rows = self.recipe("balance-before-close", account="Expenses:Dining", close_date="2026-05-31")["rows"]
        self.assertEqual(rows, [["USD", "12.50"]])
        before = self.ledger.read_bytes()
        if self.published:
            # 0.3.1 writes the close over the balance, which is why the skill
            # reads the balance itself (bea-cli.md, Version notes).
            self.assertEqual(self.recipe("close")["written"], 1)
            self.assertIn("2026-05-31 close Expenses:Dining", self.ledger.read_text())
            return
        refused = self.recipe("close", succeeds=False)
        self.assertIn("still holds 12.50 USD on 2026-05-31", refused.stdout + refused.stderr)
        self.assertEqual(self.ledger.read_bytes(), before)
        # Emptied by a posting on the close date, which still counts, it closes;
        # a later posting is refused and writes nothing.
        self.one_off(date="2026-05-31", amount="-12.50")
        self.assertEqual(self.recipe("balance-before-close")["rows"], [["USD", "0.00"]])
        self.assertEqual(self.recipe("close")["written"], 1)
        self.assertIn("2026-05-31 close Expenses:Dining", self.ledger.read_text())
        target = self.target.read_bytes()
        self.one_off(date="2026-06-01", amount="1.00", succeeds=False)
        self.assertEqual(self.target.read_bytes(), target)

    def test_price_repeat_writes_nothing_and_note_lands_in_destination(self):
        quote = {"price_date": "2026-05-07", "commodity": "VTI", "price": "285.40 USD"}
        self.assertEqual(self.recipe("price", **quote)["written"], 1)
        self.assertEqual(self.recipe("price")["written"], 0)
        # A different quote for the same day is refused unless the user asks
        # for another one (`--force`, which the recipe deliberately omits).
        refused = self.recipe("price", succeeds=False, price="286.00 USD")
        self.assertIn("Pass --force to record another quote", refused.stdout + refused.stderr)
        self.assertEqual(self.target.read_text().count("2026-05-07 price VTI"), 1)
        self.recipe("note", note_date="2026-05-08", note="Account number changed")
        self.assertIn('2026-05-08 note Assets:Checking "Account number changed"', self.target.read_text())
        self.recipe("check")

    def test_failed_assertion_leaves_prior_batch_and_resume_does_not_replay_it(self):
        self.batch()
        self.recipe("batch")
        written = self.target.read_bytes()
        self.values["amount"] = "-99 USD"
        self.recipe("balance", succeeds=False)
        self.assertEqual(self.target.read_bytes(), written)
        self.values["amount"] = "-12.50 USD"
        self.recipe("balance")
        self.assertEqual(self.target.read_text().count('import-id: "ofx:2026050701"'), 1)
        self.recipe("check")

    def test_a_nounused_ledger_stages_the_open_then_writes_its_first_posting(self):
        self.ledger.write_text(
            self.ledger.read_text().replace(
                'option "operating_currency" "USD"\n',
                'option "operating_currency" "USD"\nplugin "beancount.plugins.nounused"\n',
            )
        )
        self.target.write_text(
            '2026-01-02 * "Opening"\n  Assets:Checking 100.00 USD\n  Equity:OpeningBalances\n'
            '2026-01-03 * "Lunch"\n  Assets:Checking -10.00 USD\n  Expenses:Dining\n'
        )
        self.recipe("check")
        self.values.update(account="Expenses:Uncategorized", open_date="2026-01-01")
        before = self.ledger.read_bytes()

        # The plain open is refused only as unused; the documented two-step
        # stages it, and the batch that posts to it clears the check (w5/553).
        refused = self.recipe("open", succeeds=False)
        self.assertIn("Unused account 'Expenses:Uncategorized'", refused.stdout + refused.stderr)
        self.assertEqual(self.ledger.read_bytes(), before)
        if self.published:
            # 0.3.1 refuses the staged open too (bea-cli.md, Version notes).
            staged = self.recipe("open-staged", succeeds=False)
            self.assertIn("Unused account 'Expenses:Uncategorized'", staged.stdout + staged.stderr)
            self.assertEqual(self.ledger.read_bytes(), before)
            return
        self.recipe("open-staged")
        self.recipe("check", succeeds=False)
        self.batch([{
            "date": "2026-01-04", "flag": "*", "narration": "Parking",
            "postings": [
                {"account": "Assets:Checking", "units": {"number": "-5.00", "currency": "USD"}},
                {"account": "Expenses:Uncategorized", "units": {"number": "5.00", "currency": "USD"}},
            ],
        }])
        self.recipe("batch")
        self.recipe("check")

    def test_option_batch_and_native_expiry_preserve_lot_booking_and_links(self):
        before = self.target.read_bytes()
        for account in ("Assets:Brokerage:Options", "Expenses:Trading:Fees", "Income:Trading:OptionPremium"):
            self.values["account"] = account
            self.recipe("open")
        self.assertEqual(self.target.read_bytes(), before)
        self.batch(json.loads(self.block("option-batch-json", "json")))
        self.recipe("batch")
        self.values.update(
            trade_date="2026-06-20", narration="Expire put", trade_link="option-1",
            option_posting="Assets:Brokerage:Options 1 AAPL_PUT_20260620_00150000 {} @ 0 USD",
            income_account="Income:Trading:OptionPremium",
        )
        self.recipe("option-expiry")
        self.assertIn("{150.00 USD}", self.target.read_text())
        self.assertIn("{} @ 0 USD", self.target.read_text())
        self.assertEqual(self.target.read_text().count("^option-1"), 2)
        self.recipe("check")

    def test_historical_init_open_batch_and_assertion_need_no_date_rewrite(self):
        directory = self.root / "migration"
        self.values.update(directory=str(directory), currency="USD", open_date="2022-12-31")
        self.recipe("init")
        ledger = directory / "main.bean"
        self.assertIn("2022-12-31 open Assets:Checking USD", ledger.read_text())
        self.values.update(ledger=str(ledger), target="main.bean", open_target="main.bean", account="Assets:Bank:History")
        self.recipe("open")
        self.batch([{
            "date": "2022-12-31", "narration": "Opening balance (migrated)",
            "postings": [
                {"account": "Assets:Bank:History", "amount": "100 USD"},
                {"account": "Equity:OpeningBalances"},
            ],
        }, {
            "date": "2023-01-01", "narration": "Migrated purchase", "meta": {"import-id": "bank:history-1"},
            "postings": [
                {"account": "Assets:Bank:History", "amount": "-12.50 USD"},
                {"account": "Expenses:Dining"},
            ],
        }])
        self.recipe("batch")
        self.values.update(assertion_date="2023-01-02", amount="87.50 USD")
        self.recipe("balance")
        self.recipe("check")

    def test_tie_out_diagnoses_a_ledger_its_failing_assertion_made_red(self):
        fixture = SUITE / "beancount-reconcile" / "evals" / "files" / "eval16_ledger.beancount"
        ledger = self.books / "main.bean"
        ledger.write_text(fixture.read_text())
        before = ledger.read_bytes()
        self.values.update(
            ledger=str(ledger), account="Assets:Bank:Checking", currency="USD",
            assertion_date="2026-06-01", statement_ending="2902.70", proposed_net="(-31.10 + -12.00)",
        )

        # The strict read refuses the red ledger; the documented read-only
        # variant answers and says the ledger is invalid (w5/554).
        refused = self.recipe("tie-out", succeeds=False)
        self.assertIn("Pass --allow-errors", refused.stdout + refused.stderr)
        answer = self.recipe("tie-out-on-a-red-ledger", envelope=True)
        self.assertEqual(answer["data"]["rows"], [["2945.80", "2902.70", "0.00"]])
        if self.published:
            # 0.3.1 omits the errors from the answer; the check recipe names them.
            self.assertNotIn("ledger_errors", answer)
            errors = self.recipe("check", succeeds=False)
            self.assertIn("Balance failed for 'Assets:Bank:Checking'", errors.stdout + errors.stderr)
        else:
            self.assertFalse(answer["ledger_valid"])
            self.assertTrue(any("Balance failed for 'Assets:Bank:Checking'" in str(e) for e in answer["ledger_errors"]))
        self.assertEqual(ledger.read_bytes(), before)
        # The confirmed write needs no flag: the missing rows clear the assertion.
        self.values["target"] = ledger.name
        self.batch([
            {"date": day, "flag": "*", "narration": what, "postings": [
                {"account": "Assets:Bank:Checking", "units": {"number": amount, "currency": "USD"}},
                {"account": "Expenses:Food:Groceries"},
            ]}
            for day, what, amount in (("2026-05-12", "TRADER JOES #123", "-31.10"), ("2026-05-22", "CITY PARKING", "-12.00"))
        ])
        self.recipe("batch")
        self.recipe("check")

    def test_tie_out_computes_preview_balance_and_signed_residual_read_only(self):
        # The first-month rehearsal's imported August ledger, plus postings the
        # tie-out must exclude: another currency and activity after the period.
        fixture = SUITE / "beancount-reconcile" / "evals" / "files" / "eval12_ledger.beancount"
        ledger = self.books / "main.bean"
        ledger.write_text(
            re.sub(r"^(\S+ open \S+) USD$", r"\1 USD,EUR", fixture.read_text(), flags=re.M)
            + '2026-08-20 * "Foreign"\n  Assets:Checking 7.00 EUR\n  Equity:OpeningBalances\n'
            + '2026-09-01 * "Next period"\n  Assets:Checking -9.00 USD\n  Expenses:Fees\n'
        )
        before = ledger.read_bytes()
        self.values.update(
            ledger=str(ledger), account="Assets:Checking", currency="USD",
            assertion_date="2026-09-01", statement_ending="2942.00", proposed_net="-3.00",
        )
        self.assertEqual(self.recipe("tie-out")["rows"], [["2945.00", "2942.00", "0.00"]])
        # Unresolved statement: nothing proposed, ledger 4.00 above the claim.
        self.values.update(statement_ending="2941.00", proposed_net="0.00")
        self.assertEqual(self.recipe("tie-out")["rows"], [["2945.00", "2945.00", "-4.00"]])
        # Several proposed entries: the net is a parenthesized decimal sum.
        self.values.update(statement_ending="2940.00", proposed_net="(-3.00 + -1.00)")
        self.assertEqual(self.recipe("tie-out")["rows"], [["2945.00", "2941.00", "-1.00"]])
        self.assertEqual(ledger.read_bytes(), before)

    def test_realized_gains_rows_totals_and_tie_out(self):
        ledger = self.books / "main.bean"
        ledger.write_text(
            'option "operating_currency" "USD"\n'
            "2025-01-01 open Assets:Brokerage USD,VTI\n"
            "2025-01-01 open Assets:Brokerage:Roth USD,VTI\n"
            "2025-01-01 open Income:CapitalGains USD\n"
            "2025-01-01 open Equity:Opening-Balances\n"
            '2025-01-02 * "Cash in"\n  Assets:Brokerage 20000.00 USD\n  Equity:Opening-Balances\n'
            '2025-01-15 * "Buy lot one"\n  Assets:Brokerage 10 VTI {250.00 USD}\n  Assets:Brokerage -2500.00 USD\n'
            '2025-02-15 * "Buy lot two"\n  Assets:Brokerage 10 VTI {260.00 USD}\n  Assets:Brokerage -2600.00 USD\n'
            '2026-01-10 * "Buy lot three"\n  Assets:Brokerage 10 VTI {270.00 USD}\n  Assets:Brokerage -2700.00 USD\n'
            '2026-02-01 * "Transfer two of lot one"\n  Assets:Brokerage -2 VTI {250.00 USD, 2025-01-15}\n  Assets:Brokerage:Roth 2 VTI {250.00 USD, 2025-01-15}\n'
            '2026-03-01 * "Sell five of lot one"\n  Assets:Brokerage -5 VTI {250.00 USD, 2025-01-15} @ 300.00 USD\n  Assets:Brokerage 1500.00 USD\n  Income:CapitalGains -250.00 USD\n'
            '2026-03-02 * "Sell four of lot two"\n  Assets:Brokerage -4 VTI {260.00 USD, 2025-02-15} @ 280.00 USD\n  Assets:Brokerage 1120.00 USD\n  Income:CapitalGains -80.00 USD\n'
            '2026-06-01 * "Sell three of lot three"\n  Assets:Brokerage -3 VTI {270.00 USD, 2026-01-10} @ 290.00 USD\n  Assets:Brokerage 870.00 USD\n  Income:CapitalGains -60.00 USD\n'
        )
        before = ledger.read_bytes()
        self.values.update(
            ledger=str(ledger), year_start="2026-01-01", year_end="2027-01-01",
            gains_pattern="CapitalGains", currency="USD",
        )
        # The transfer (no price) is excluded; partial sells close parts of lots.
        self.assertEqual(
            self.recipe("realized-gains")["rows"],
            [
                ["Assets:Brokerage", "VTI", "2025-01-15", "2026-03-01", 410, "5", "1500.00", "1250.00", "250.00", "USD"],
                ["Assets:Brokerage", "VTI", "2025-02-15", "2026-03-02", 380, "4", "1120.00", "1040.00", "80.00", "USD"],
                ["Assets:Brokerage", "VTI", "2026-01-10", "2026-06-01", 142, "3", "870.00", "810.00", "60.00", "USD"],
            ],
        )
        self.assertEqual(
            sorted(self.recipe("realized-gains-totals")["rows"], key=str),
            [[False, "USD", "60.00"], [True, "USD", "330.00"]],
        )
        # Independent tie-out: gains actually booked to the income account.
        self.assertEqual(self.recipe("realized-gains-booked")["rows"], [["390.00"]])
        self.assertEqual(ledger.read_bytes(), before)

    def test_coverage_recipes_count_the_window_and_check_statement_arithmetic(self):
        ledger = self.books / "main.bean"
        ledger.write_text(
            'option "operating_currency" "USD"\n'
            "2023-01-01 open Assets:Checking USD,EUR\n"
            "2023-01-01 open Expenses:Dining USD\n"
            "2023-01-01 open Equity:OpeningBalances\n"
            '2026-05-01 * "Opening"\n  Assets:Checking 1000.00 USD\n  Equity:OpeningBalances\n'
            '2026-05-07 * "Groceries"\n  Assets:Checking -54.20 USD\n  Expenses:Dining\n'
            '2026-05-09 * "Parking"\n  Assets:Checking -12.00 USD\n  Expenses:Dining\n'
            '2026-05-20 * "Foreign"\n  Assets:Checking -7.00 EUR\n  Equity:OpeningBalances\n'
            '2026-06-05 * "After window"\n  Assets:Checking -9.00 USD\n  Expenses:Dining\n'
        )
        before = ledger.read_bytes()
        self.values.update(
            ledger=str(ledger), account="Assets:Checking", currency="USD",
            start="2026-05-01", end_plus_1="2026-06-01",
            opening="1000.00", included_total="(-54.20 + -12.00)", printed_ending="933.80",
        )
        # One row per currency; the after-window posting is excluded.
        self.assertEqual(
            self.recipe("coverage-ledger-side")["rows"],
            [["EUR", 1, "-7.00"], ["USD", 3, "933.80"]],
        )
        # Statement ties against itself: computed ending equals printed, gap zero.
        self.assertEqual(
            self.recipe("statement-arithmetic")["rows"],
            [["933.80", "0.00", "933.80"]],
        )
        # A printed ending the rows do not reach is an extraction gap, signed.
        self.values.update(printed_ending="930.00")
        self.assertEqual(
            self.recipe("statement-arithmetic")["rows"],
            [["933.80", "-3.80", "933.80"]],
        )
        self.assertEqual(ledger.read_bytes(), before)

    def test_liability_tie_out_negates_the_printed_ending_balance(self):
        # A card statement prints the amount owed as a positive running
        # balance; the documented rule negates it into ledger sign (w5/359).
        files = SUITE / "beancount-reconcile" / "evals" / "files"
        ledger = self.books / "card.bean"
        ledger.write_text((files / "eval14_ledger.beancount").read_text())
        printed = Decimal(
            (files / "eval14_statement.csv").read_text().strip().splitlines()[-1].rsplit(",", 1)[1]
        )
        example = self.block("liability-ending", "beancount")
        example_printed = Decimal(re.search(r"New Balance (\d+\.\d+)", example).group(1))
        example_signed = Decimal(re.search(r"balance Liabilities:\S+\s+(-?\d+\.\d+) USD", example).group(1))
        ending = printed * (example_signed / example_printed)
        self.assertEqual(ending, Decimal("-342.20"))

        self.values.update(
            ledger=str(ledger), target=ledger.name, account="Liabilities:CreditCard", currency="USD",
            assertion_date="2026-06-01", statement_ending=str(ending), proposed_net="-290.00",
            amount=f"{ending} USD",
        )
        self.assertEqual(self.recipe("tie-out")["rows"], [["-52.20", "-342.20", "0.00"]])
        # The unflipped printed figure is off by exactly twice the balance.
        self.values.update(statement_ending=str(printed))
        self.assertEqual(self.recipe("tie-out")["rows"], [["-52.20", "-342.20", "684.40"]])

        with ledger.open("a") as handle:
            handle.write('\n2026-05-28 * "UNITED AIRLINES"\n  Liabilities:CreditCard  -290.00 USD\n  Expenses:Travel  290.00 USD\n')
        self.recipe("balance")
        self.assertIn("2026-06-01 balance Liabilities:CreditCard", ledger.read_text())
        self.assertIn("-342.20 USD", ledger.read_text())
        self.recipe("check")

    def test_newest_first_export_ends_at_the_latest_dated_row(self):
        # The ending balance is the running balance on the latest-dated row,
        # which a newest-first export lists first (w5/360).
        formats = (SUITE / "beancount-reconcile" / "references" / "statement-formats.md").read_text()
        self.assertTrue("latest-dated row" in formats, "statement-formats.md must name the latest-dated row")
        self.assertFalse("last row's balance is the ending balance" in formats)
        files = SUITE / "beancount-reconcile" / "evals" / "files"
        ledger = self.books / "checking.bean"
        ledger.write_text((files / "eval15_ledger.beancount").read_text())
        rows = list(csv.DictReader((files / "eval15_statement.csv").open()))
        latest = max(rows, key=lambda row: datetime.strptime(row["Date"], "%m/%d/%Y"))
        self.assertIs(latest, rows[0])

        self.values.update(
            ledger=str(ledger), account="Assets:Checking", currency="USD",
            assertion_date="2026-06-01", statement_ending=latest["Balance"], proposed_net="-12.00",
        )
        self.assertEqual(self.recipe("tie-out")["rows"], [["3395.80", "3383.80", "0.00"]])
        # The last row of the file is the oldest: its balance leaves the reported residual.
        self.values.update(statement_ending=rows[-1]["Balance"])
        self.assertEqual(self.recipe("tie-out")["rows"], [["3395.80", "3383.80", "-2383.80"]])

    def test_migrate_negates_a_stated_card_balance_before_the_opening_math(self):
        # An app shows a card balance as the positive amount owed; a derived
        # opening cannot catch a flipped sign, so the rule negates it (w5/361).
        mapping = (SUITE / "beancount-migrate" / "references" / "mapping.md").read_text()
        example = re.search(r"<!-- recipe: liability-opening -->\n```text\n(.*?)\n```", mapping, re.DOTALL)
        self.assertIsNotNone(example, "mapping.md must show the liability opening example")
        self.assertTrue("right?" in mapping, "mapping.md must confirm an unsigned liability balance")
        printed, current, flows, opening = (
            Decimal(number) for number in re.findall(r"[-+]?\d+\.\d\d", example.group(1))[:4]
        )
        export = SUITE / "beancount-migrate" / "evals" / "files" / "eval1_mint.csv"
        amex = [row for row in csv.DictReader(export.open()) if row["Account Name"] == "Amex Card"]
        rows = [(row, Decimal(row["Amount"]) * (1 if row["Transaction Type"] == "credit" else -1)) for row in amex]
        self.assertEqual(flows, sum(amount for _, amount in rows))
        self.assertEqual(current, -printed)
        self.assertEqual(opening, current - flows)
        self.assertEqual(opening, Decimal("-500.00"))

        ledger = self.books / "migrated.bean"
        ledger.write_text(
            "2026-01-07 open Liabilities:CreditCard:Amex USD\n2026-01-07 open Equity:OpeningBalances\n"
            f"2026-01-07 * \"Opening balance (migrated)\"\n  Liabilities:CreditCard:Amex {opening} USD\n  Equity:OpeningBalances\n"
            + "".join(
                f"{datetime.strptime(row['Date'], '%m/%d/%Y').date()} * \"{row['Description']}\"\n"
                f"  Liabilities:CreditCard:Amex {amount} USD\n  Equity:OpeningBalances\n"
                for row, amount in rows
            )
        )
        self.values.update(
            ledger=str(ledger), target=ledger.name, account="Liabilities:CreditCard:Amex",
            assertion_date="2026-01-23", amount=f"{current} USD",
        )
        self.recipe("balance")
        self.recipe("check")

    def test_migrated_split_purchase_is_a_duplicate_of_the_banks_single_row(self):
        # A split exported as one row per category is one bank charge; written
        # as one transaction with one id over the total, the bank's later row
        # is a duplicate instead of a second Costco (w5/362).
        mapping = (SUITE / "beancount-migrate" / "references" / "mapping.md").read_text()
        split = re.search(r"<!-- recipe: split-purchase -->\n```beancount\n(.*?)\n```", mapping, re.DOTALL)
        self.assertIsNotNone(split, "mapping.md must show the split-purchase transaction")
        entry = split.group(1)
        date, payee, narration = re.match(r'(\S+) \* "([^"]*)" "([^"]*)"', entry).groups()
        account, total = re.search(r"^  (Assets:\S+)\s+(-?\d+\.\d+) USD$", entry, re.M).groups()
        pieces = [Decimal(amount) for amount in re.findall(r"^  Expenses:\S+\s+(\d+\.\d+) USD$", entry, re.M)]
        self.assertEqual(sum(pieces), -Decimal(total))
        hashed = re.search(r'import-id: "monarch:sha256:<16-hex of ([^>]+)>"', entry).group(1)
        self.assertEqual(hashed, f"{date}|{format(Decimal(total).normalize(), 'f')} USD|{narration}|{account}")

        def migrated_id(text):
            return "monarch:sha256:" + hashlib.sha256(text.encode()).hexdigest()[:16]

        opens = "".join(
            f"2026-01-01 open {name} USD\n"
            for name in (account, "Expenses:Food:Groceries", "Expenses:Household", "Expenses:Uncategorized")
        )
        one = re.sub(r"<16-hex of [^>]+>", migrated_id(hashed)[len("monarch:sha256:"):], entry)
        separate = "".join(
            f'{date} * "{payee}" "{narration}"\n'
            f'  import-id: "{migrated_id(f"{date}|-{format(piece.normalize(), "f")} USD|{narration}|{account}")}"\n'
            f"  {account}  -{piece} USD\n  Expenses:Uncategorized\n"
            for piece in pieces
        )
        self.csv(
            f"Date,Description,Amount\n{date},{narration},{total}\n",
            "date=Date,amount=Amount,narration=Description,sign=bank",
        )
        self.values["account"] = account
        statuses = {}
        for name, migrated in (("one", one), ("separate", separate)):
            self.target.write_text(opens + migrated + "\n")
            statuses[name] = [row["status"] for row in self.recipe("csv-preview")["rows"]]
        self.assertEqual(statuses["one"], ["duplicate"])
        self.assertNotEqual(statuses["separate"], ["duplicate"])

    def test_recurring_recipes_find_a_gap_in_a_payee_less_import(self):
        # A one-description bank CSV, imported through the shipped recipe: bea
        # maps the description to the narration and leaves the payee empty.
        self.ledger.write_text(
            self.ledger.read_text() + "2023-01-01 open Expenses:Uncategorized USD\n"
        )
        self.csv(
            "Date,Description,Amount\n"
            "2026-01-12,NETFLIX.COM,-15.49\n2026-02-12,NETFLIX.COM,-15.49\n"
            "2026-01-20,SAFEWAY,-50.00\n2026-02-20,SAFEWAY,-52.00\n2026-03-20,SAFEWAY,-48.00\n",
            "date=Date,amount=Amount,narration=Description,sign=bank",
        )
        self.assertEqual(self.recipe("csv-apply")["written"], 5)

        grid = {(row[0], row[1], row[2]) for row in self.query_recipe("recurring-grid")}
        self.assertIn(("NETFLIX.COM", 2026, 1), grid)
        self.assertIn(("NETFLIX.COM", 2026, 2), grid)
        self.assertNotIn(("NETFLIX.COM", 2026, 3), grid, "the March gap is visible")
        self.assertIn(("SAFEWAY", 2026, 3), grid)
        self.assertNotIn(None, {merchant for merchant, _, _ in grid}, "rows grouped under an empty payee")

        candidates = {row[0]: row[1] for row in self.query_recipe("recurring-candidates")}
        self.assertEqual(candidates, {"SAFEWAY": 3, "NETFLIX.COM": 2})
        history = self.query_recipe("merchant-history", **{"'NETFLIX'": "'NETFLIX.COM'"})
        self.assertEqual([row[0] for row in history], ["2026-01-12", "2026-02-12"])

    def test_period_end_balances_ignore_entries_after_the_period(self):
        self.ledger.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Assets:Checking USD\n"
            "2026-01-01 open Assets:Savings USD\n"
            "2026-01-01 open Expenses:Food USD\n"
            "2026-01-01 open Equity:OpeningBalances USD\n"
            '2026-01-01 * "Opening"\n  Assets:Checking 3000.00 USD\n  Equity:OpeningBalances\n'
            '2026-02-10 * "Grocer"\n  Expenses:Food 185.75 USD\n  Assets:Checking\n'
            '2026-03-05 * "Transfer to savings"\n  Assets:Savings 500.00 USD\n  Assets:Checking\n'
        )

        # Closing February: the bound is the first day after the period.
        rows = self.query_recipe("period-end-balances", **{"<period-end+1>": "2026-03-01"})

        balances = {
            account: [(lot["units"]["number"], lot["units"]["currency"]) for lot in balance]
            for account, balance in rows
        }
        self.assertEqual(balances, {"Assets:Checking": [("2814.25", "USD")]})

    def test_account_balances_read_each_balance_sheet_account_at_book_value(self):
        self.ledger.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Assets:Checking USD\n"
            "2026-01-01 open Assets:Brokerage\n"
            "2026-01-01 open Liabilities:Card USD\n"
            "2026-01-01 open Expenses:Food USD\n"
            "2026-01-01 open Equity:OpeningBalances USD\n"
            '2026-01-01 * "Opening"\n  Assets:Checking 3000.00 USD\n  Equity:OpeningBalances\n'
            '2026-02-10 * "Grocer"\n  Expenses:Food 185.75 USD\n  Liabilities:Card\n'
            '2026-03-05 * "Broker" "buy"\n  Assets:Brokerage 10 AAPL {150 USD}\n  Assets:Checking -1500 USD\n'
        )

        rows = self.query_recipe("account-balances")

        # The AAPL lot reads at its cost; income, expense and equity accounts stay out.
        balances = {
            account: [(lot["units"]["number"], lot["units"]["currency"]) for lot in balance]
            for account, balance in rows
        }
        self.assertEqual(balances, {
            "Assets:Brokerage": [("1500", "USD")],
            "Assets:Checking": [("1500.00", "USD")],
            "Liabilities:Card": [("-185.75", "USD")],
        })

    def test_flag_sweep_counts_each_flagged_transaction_once(self):
        self.ledger.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Assets:Checking USD\n"
            "2026-01-01 open Expenses:Food USD\n"
            '2026-06-21 ! "WHOLE FOODS" "groceries"\n  Expenses:Food 30 USD\n  Assets:Checking\n'
            '2026-06-21 ! "WHOLE FOODS" "groceries"\n  Expenses:Food 12 USD\n  Assets:Checking\n'
            '2026-06-22 ! "Split" "three legs"\n  Expenses:Food 5 USD\n  Expenses:Food 5 USD\n  Assets:Checking\n'
            '2026-06-23 * "Cleared"\n  Expenses:Food 1 USD\n  Assets:Checking\n'
        )

        # Two same-day charges at one merchant are two carried flags, and a
        # transaction with several postings is still one (w5/356).
        rows = self.query_recipe("flag-sweep", **{"<period-end+1>": "2026-07-01"})

        payees = [payee for row in rows for payee in row if payee in {"WHOLE FOODS", "Split", "Cleared"}]
        self.assertEqual(payees, ["WHOLE FOODS", "WHOLE FOODS", "Split"])

    def test_close_reports_run_at_book_value_beside_an_unpriced_foreign_charge(self):
        self.ledger.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Liabilities:Card USD\n"
            "2026-01-01 open Assets:Brokerage\n"
            "2026-01-01 open Assets:Checking USD\n"
            "2026-01-01 open Expenses:Travel\n"
            "2026-01-01 open Expenses:Food USD\n"
            '2026-06-10 * "Hotel Paris"\n  Liabilities:Card -330.00 USD\n  Expenses:Travel 300.00 EUR @ 1.10 USD\n'
            '2026-06-12 * "Lunch"\n  Liabilities:Card -20.00 USD\n  Expenses:Food 20.00 USD\n'
            '2026-06-15 * "BROKER" "buy"\n  Assets:Brokerage 10 AAPL {150 USD}\n  Assets:Checking -1500 USD\n'
        )
        self.values["month"] = "2026-06"

        # Market valuation stops on the missing EUR and AAPL prices; the
        # close's own recipes, at book value, complete (w5/551).
        income = self.recipe("close-income-statement")
        self.assertEqual(income["valuation"], "complete")
        self.assertEqual(income["expenses"]["balance_children"], {"USD": "20.00", "EUR": "300.00"})
        sheet = self.recipe("close-balance-sheet")
        self.assertEqual(sheet["valuation"], "complete")
        self.assertEqual(sheet["missing_prices"], [])
        # Spending in the currency paid is the `weight` recipe's answer.
        top = {account: Decimal(total[0]["units"]["number"]) for account, total in self.query_recipe("top-expenses")}
        self.assertEqual(top, {"Expenses:Travel": Decimal("330"), "Expenses:Food": Decimal("20")})

    def test_merchant_recipes_count_transactions_not_postings(self):
        self.ledger.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Liabilities:Card USD\n"
            "2026-01-01 open Expenses:Entertainment:Streaming USD\n"
            "2026-01-01 open Expenses:Taxes:Sales USD\n"
            "2026-01-01 open Expenses:Food USD\n"
            + "".join(
                f'2026-{month}-15 * "NETFLIX" "plan"\n  Liabilities:Card -16.89 USD\n'
                "  Expenses:Entertainment:Streaming 15.49 USD\n  Expenses:Taxes:Sales 1.40 USD\n"
                for month in ("04", "05", "06")
            )
            + '2026-05-28 * "BEST BUY" "Monitor + cable"\n  Liabilities:Card -260.00 USD\n'
            "  Expenses:Entertainment:Streaming 150.00 USD\n  Expenses:Food 110.00 USD\n"
        )

        def usd(inventory):
            self.assertEqual({lot["units"]["currency"] for lot in inventory}, {"USD"}, inventory)
            return sum(Decimal(lot["units"]["number"]) for lot in inventory)

        # A charge with a tax line is one charge, and a split purchase one
        # transaction over the threshold (w5/552).
        counts = {merchant: n for merchant, n, _ in self.query_recipe("recurring-candidates")}
        self.assertEqual(counts, {"NETFLIX": 3, "BEST BUY": 1})
        history = self.query_recipe("merchant-history")
        self.assertEqual([(day, usd(amount)) for day, amount in history],
                         [(f"2026-{m}-15", Decimal("16.89")) for m in ("04", "05", "06")])
        anomalies = self.query_recipe("anomalies")
        self.assertEqual([(row[0], row[1], usd(row[3])) for row in anomalies],
                         [("2026-05-28", "BEST BUY", Decimal("260.00"))])

    def test_spending_recipes_count_priced_foreign_charges_at_the_usd_paid(self):
        self.ledger.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Liabilities:Card USD\n"
            "2026-01-01 open Assets:Checking USD\n"
            "2026-01-01 open Assets:Brokerage\n"
            "2026-01-01 open Expenses:Travel\n"
            "2026-01-01 open Expenses:Food USD\n"
            '2026-05-30 * "TOKYO RAMEN" "lunch"\n  Expenses:Travel 1500 JPY @ 0.0070 USD\n  Liabilities:Card -10.50 USD\n'
            '2026-06-01 * "HOTEL PARIS" "room"\n  Expenses:Travel 300 EUR @ 1.10 USD\n  Liabilities:Card -330 USD\n'
            '2026-06-03 * "TOKYO RAMEN" "lunch"\n  Expenses:Travel 1500 JPY @@ 10.50 USD\n  Liabilities:Card -10.50 USD\n'
            '2026-06-04 * "MARKET" "groceries"\n  Expenses:Food 40 USD\n  Assets:Checking\n'
            '2026-06-05 * "BROKER" "buy"\n  Assets:Brokerage 10 AAPL {150 USD}\n  Assets:Checking -1500 USD\n'
        )

        def usd(inventory):
            self.assertEqual({lot["units"]["currency"] for lot in inventory}, {"USD"}, inventory)
            return sum(Decimal(lot["units"]["number"]) for lot in inventory)

        # A card charge with an `@`/`@@` price counts at the USD paid, not as
        # 300 EUR or 1500 JPY (w5/358).
        top = {account: usd(total) for account, total in self.query_recipe("top-expenses")}
        self.assertEqual(top, {"Expenses:Travel": Decimal("340.50"), "Expenses:Food": Decimal("40")})
        trend = self.query_recipe("category-trend", **{"'Expenses:Food:Groceries'": "'Expenses:Travel'"})
        self.assertEqual([(m, usd(total)) for _, m, total in trend], [(5, Decimal("10.50")), (6, Decimal("340.50"))])
        burn = {month: usd(spent) for _, month, spent in self.query_recipe("monthly-burn")}
        self.assertEqual(burn, {5: Decimal("10.50"), 6: Decimal("380.50")})
        candidates = {merchant: usd(total) for merchant, _, total in self.query_recipe("recurring-candidates")}
        self.assertEqual(candidates["TOKYO RAMEN"], Decimal("21.00"))
        grid = {(row[0], row[2]): usd(row[3]) for row in self.query_recipe("recurring-grid")}
        self.assertEqual(grid[("HOTEL PARIS", 6)], Decimal("330"))
        history = self.query_recipe("merchant-history", **{"'NETFLIX'": "'TOKYO RAMEN'"})
        self.assertEqual([usd(amount) for _, amount in history], [Decimal("10.50"), Decimal("10.50")])
        # Only the 330 USD hotel crosses the 200 threshold; 1500 JPY is $10.50.
        anomalies = self.query_recipe("anomalies")
        self.assertEqual([(row[1], usd(row[3])) for row in anomalies], [("HOTEL PARIS", Decimal("330"))])
        # Book value still reads the at-cost lot at cost.
        net_worth = self.query_recipe("net-worth")
        self.assertEqual(usd(net_worth[0][0]), Decimal("-391.00"))

    def test_holdings_recipes_value_priced_lots_and_name_unpriced_ones(self):
        self.ledger.write_text(
            'option "operating_currency" "USD"\n'
            "2025-01-01 open Assets:Brokerage USD,VTI,ACME\n"
            "2025-01-01 open Assets:Crypto:Wallet BTC\n"
            "2025-01-01 open Equity:OpeningBalances\n"
            '2025-01-02 * "Cash in"\n  Assets:Brokerage 20000.00 USD\n  Equity:OpeningBalances\n'
            '2025-01-15 * "Buy VTI"\n  Assets:Brokerage 10 VTI {100.00 USD}\n  Assets:Brokerage -1000.00 USD\n'
            '2025-02-15 * "Buy VTI"\n  Assets:Brokerage 10 VTI {120.00 USD}\n  Assets:Brokerage -1200.00 USD\n'
            '2025-03-10 * "Buy ACME"\n  Assets:Brokerage 10 ACME {50.00 USD}\n  Assets:Brokerage -500.00 USD\n'
            '2025-01-10 * "Buy BTC"\n  Assets:Crypto:Wallet 0.500000 BTC {40000.00 USD}\n  Equity:OpeningBalances -20000.00 USD\n'
            '2026-03-01 * "Sell some VTI"\n  Assets:Brokerage -4 VTI {100.00 USD, 2025-01-15} @ 300.00 USD\n  Assets:Brokerage 1200.00 USD\n  Equity:OpeningBalances -800.00 USD\n'
            "2026-10-01 price VTI 300.00 USD\n"
            "2026-10-01 price BTC 60000.00 USD\n"
        )

        def dec(value):
            return Decimal(str(value))

        lots = {(row[0], row[1], row[3]): (dec(row[4]), dec(row[5])) for row in self.query_recipe("holdings-lots")}
        self.assertEqual(lots[("Assets:Brokerage", "VTI", "2025-01-15")], (Decimal("6"), Decimal("600.00")))
        self.assertEqual(lots[("Assets:Brokerage", "VTI", "2025-02-15")], (Decimal("10"), Decimal("1200.00")))
        self.assertEqual(lots[("Assets:Brokerage", "ACME", "2025-03-10")], (Decimal("10"), Decimal("500.00")))
        self.assertEqual(lots[("Assets:Crypto:Wallet", "BTC", "2025-01-10")][0], Decimal("0.500000"))
        # ACME has no price directive: it is named unpriced and never valued
        # as its raw unit count (10) by the market recipes.
        unpriced = [(row[0], row[1]) for row in self.query_recipe("holdings-unpriced")]
        self.assertEqual(unpriced, [("Assets:Brokerage", "ACME")])
        market = {(row[0], row[1], row[2]): (dec(row[5]), dec(row[6]), dec(row[7]))
                  for row in self.query_recipe("holdings-lots-market")}
        self.assertNotIn(("Assets:Brokerage", "ACME", "2025-03-10"), market)
        self.assertEqual(market[("Assets:Brokerage", "VTI", "2025-01-15")],
                         (Decimal("600.00"), Decimal("1800.00"), Decimal("1200.00")))
        self.assertEqual(market[("Assets:Crypto:Wallet", "BTC", "2025-01-10")][2], Decimal("10000"))
        prices = {(row[1]): row[0] for row in self.query_recipe("holdings-prices")}
        self.assertEqual(prices, {"VTI": "2026-10-01", "BTC": "2026-10-01"})
        total = self.query_recipe("holdings-market-total")
        self.assertEqual([(row[0], dec(row[1])) for row in total], [("USD", Decimal("34800.00"))])
        allocation = {row[0]: dec(row[3]) for row in self.query_recipe(
            "holdings-allocation", **{"<total_market>": "34800.00"})}
        self.assertEqual(allocation["VTI"], Decimal("13.79310344827586206896551724"))
        self.assertEqual(sum(allocation.values()), Decimal("100.0000000000000000000000000"))

    def test_price_status_and_refresh_recipes_answer_without_managed_sources(self):
        # A plain ledger has no managed price includes: both recipes answer
        # with empty sources and write nothing (the refresh path beancount-add
        # documents starts from exactly this read).
        before = self.ledger.read_bytes()
        self.assertEqual(self.recipe("price-status"), {"sources": []})
        self.assertEqual(self.recipe("price-refresh"), {"sources": [], "changed": []})
        self.assertEqual(self.ledger.read_bytes(), before)

    def test_trade_batch_books_a_named_lot_sell_and_rejects_wholesale(self):
        # beancount-trade's batch path: explicit-cost events in one batch
        # write (sell gains leg omits units so booking computes it), and one
        # bad row rejects the whole batch without --partial.
        self.ledger.write_text(
            'option "operating_currency" "USD"\n'
            "2025-01-01 open Assets:Brokerage USD,VTI\n"
            "2025-01-01 open Income:CapitalGains USD\n"
            "2025-01-01 open Equity:OpeningBalances\n"
            '2025-01-02 * "Cash in"\n  Assets:Brokerage 5000.00 USD\n  Equity:OpeningBalances\n'
            '2025-01-15 * "Buy VTI"\n  Assets:Brokerage 10 VTI {100.00 USD}\n  Assets:Brokerage -1000.00 USD\n'
            'include "transactions/2026.bean"\n'
        )
        batch_file = Path(self.values["batch"])
        batch_file.write_text(json.dumps([
            {"date": "2026-03-01", "payee": "Broker", "narration": "Buy VTI", "postings": [
                {"account": "Assets:Brokerage", "units": {"number": "5", "currency": "VTI"},
                 "cost": {"number": "250.00", "currency": "USD"}},
                {"account": "Assets:Brokerage", "units": {"number": "-1250.00", "currency": "USD"}}]},
            {"date": "2026-03-02", "payee": "Broker", "narration": "Sell VTI", "postings": [
                {"account": "Assets:Brokerage", "units": {"number": "-5", "currency": "VTI"},
                 "cost": {"number": "100.00", "currency": "USD", "date": "2025-01-15"},
                 "price": {"number": "300.00", "currency": "USD"}},
                {"account": "Assets:Brokerage", "units": {"number": "1500.00", "currency": "USD"}},
                {"account": "Income:CapitalGains"}]},
        ]))
        written = self.recipe("batch")
        self.assertEqual(written["written"], 2)
        rows = self.run_query_text(
            "SELECT -sum(number) AS booked WHERE account = 'Income:CapitalGains'")
        self.assertEqual(rows, [["1000.00"]])

        before = self.target.read_bytes()
        batch_file.write_text(json.dumps([
            {"date": "2026-03-03", "narration": "Good buy", "postings": [
                {"account": "Assets:Brokerage", "units": {"number": "1", "currency": "VTI"},
                 "cost": {"number": "250.00", "currency": "USD"}},
                {"account": "Assets:Brokerage", "units": {"number": "-250.00", "currency": "USD"}}]},
            {"date": "2026-03-04", "narration": "Sell unheld lot", "postings": [
                {"account": "Assets:Brokerage", "units": {"number": "-5", "currency": "VTI"},
                 "cost": {"number": "999.00", "currency": "USD", "date": "2024-01-01"},
                 "price": {"number": "300.00", "currency": "USD"}},
                {"account": "Assets:Brokerage", "units": {"number": "1500.00", "currency": "USD"}},
                {"account": "Income:CapitalGains"}]},
        ]))
        self.recipe("batch", succeeds=False)
        self.assertEqual(self.target.read_bytes(), before)

    def run_query_text(self, query: str):
        result = subprocess.run(
            [*self.bea, "--file", self.values["ledger"], "--json", "--no-input", "query", query],
            cwd=self.root, env=self.env, capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)["data"]["rows"]


def load_tests(loader, tests, pattern):
    """Keep the focused journey and routing-runner checks in the existing skills CI entrypoint."""
    for name in ("test_verify_first_month", "test_verify_migration", "test_verify_importer_graduation", "test_verify_first_year_investor", "test_run_routing"):
        tests.addTests(loader.loadTestsFromModule(load(name, f"{name}.py")))
    return tests


if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__]))
    sys.exit(0 if result.wasSuccessful() else 1)
