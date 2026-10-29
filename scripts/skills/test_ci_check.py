#!/usr/bin/env python3
"""Unit tests for skill separation, validation, and `bea` preferences.

Stdlib unittest only (the skills CI has no pytest): run with
`python3 scripts/skills/test_ci_check.py` from the repository root.
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
from pathlib import Path, PureWindowsPath
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
        scratch = SCRIPTS_DIR / "tmp"
        scratch.mkdir(exist_ok=True)
        temporary = tempfile.TemporaryDirectory(dir=scratch)
        self.addCleanup(temporary.cleanup)
        self.repo = Path(temporary.name)
        self.customer = self.repo / "skills"
        self.development = self.repo / ".agents/skills"
        self.customer.mkdir(parents=True)
        self.development.mkdir(parents=True)
        (self.repo / "skills/AGENTS.md").write_text("Customer skill guidance\n")
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
        # A valid development fixture carries the internal flag, like the real tree.
        flag = 'metadata: {"internal": true}\n' if directory == self.development else ""
        path.write_text(f"---\nname: {name}\ndescription: A fixture skill.\n{flag}---\n")
        return path

    def test_separate_trees_are_validated(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            ci_check.check_symlinks()
            ci_check.check_skill_md()
        # ci-check prints repository paths in the platform's own spelling.
        self.assertIn(f"OK frontmatter {Path('.agents/skills/ship/SKILL.md')}\n", output.getvalue())
        self.assertIn(f"OK frontmatter {Path('skills/beancount-ask/SKILL.md')}\n", output.getvalue())

    def test_old_shared_customer_symlink_is_rejected(self):
        self.development.rename(self.development.with_name("old-skills"))
        self.development.symlink_to("../skills")
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            ci_check.check_symlinks()

    def test_claude_must_load_development_skills(self):
        link = self.repo / ".claude/skills"
        link.unlink()
        link.symlink_to("../skills")
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            ci_check.check_symlinks()

    def test_resurrected_claude_md_is_rejected(self):
        (self.repo / "skills/CLAUDE.md").write_text("Stale duplicate\n")
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
        self.assertIn(f"FAIL: {Path('.agents/skills/ship/SKILL.md')}: frontmatter missing 'description'", error.getvalue())

    def check_frontmatter(self, frontmatter: str) -> str:
        """Run the SKILL.md check on beancount-ask with FRONTMATTER; return stderr ('' when it passes)."""
        (self.customer / "beancount-ask/SKILL.md").write_text(f"---\n{frontmatter}---\n")
        error = io.StringIO()
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(error):
            try:
                ci_check.check_skill_md()
            except SystemExit:
                pass
        return error.getvalue()

    def test_a_nested_name_cannot_stand_in_for_the_top_level_name(self):
        err = self.check_frontmatter('description: d\nmetadata:\n  name: beancount-ask\n')
        self.assertIn("frontmatter missing 'name'", err)

    def test_a_nested_name_does_not_overwrite_the_top_level_name(self):
        path = self.customer / "beancount-ask/SKILL.md"
        path.write_text("---\nname: beancount-ask\ndescription: d\nmetadata:\n  name: other\n  description: ''\n---\n")
        meta = ci_check.parse_frontmatter(path)
        self.assertEqual((meta["name"], meta["description"]), ("beancount-ask", "d"))

    def test_customer_metadata_must_be_a_block_yaml_mapping(self):
        block = (
            "name: beancount-ask\ndescription: d\nmetadata:\n"
            "  openclaw:\n    homepage: 'https://example.com/skills'\n"
            "    requires:\n      anyBins:\n        - bea\n    install:\n"
            "      - id: uv\n        bins:\n          - bea\n"
            "  hermes:\n    tags:\n      - beancount\n"
        )
        self.assertEqual(self.check_frontmatter(block), "")
        path = self.customer / "beancount-ask/SKILL.md"
        self.assertEqual(
            ci_check.parse_yaml_subset(path, ci_check.metadata_block(path)),
            {
                "openclaw": {
                    "homepage": "https://example.com/skills",
                    "requires": {"anyBins": ["bea"]},
                    "install": [{"id": "uv", "bins": ["bea"]}],
                },
                "hermes": {"tags": ["beancount"]},
            },
        )
        for metadata, why in (
            ('{"openclaw": {"requires": {"anyBins": ["bea"]}}}', "customer 'metadata' must be a block YAML mapping"),
            ("", "customer 'metadata' must be a block YAML mapping"),
        ):
            with self.subTest(metadata=metadata):
                err = self.check_frontmatter(f"name: beancount-ask\ndescription: d\nmetadata: {metadata}\n")
                self.assertIn(why, err)
        flow = self.check_frontmatter(
            "name: beancount-ask\ndescription: d\nmetadata:\n  openclaw: {requires: {}}\n"
        )
        self.assertIn("uses YAML this checker does not read", flow)

    def test_inconsistent_metadata_indentation_is_rejected(self):
        err = self.check_frontmatter(
            "name: beancount-ask\ndescription: d\nmetadata:\n"
            "  openclaw:\n    homepage: 'https://example.com'\n   hermes:\n    category: finance\n"
        )
        self.assertIn("inconsistent indentation", err)

    def test_a_development_skill_without_the_internal_flag_is_rejected(self):
        for frontmatter in (
            "---\nname: ship\ndescription: d\n---\n",
            '---\nname: ship\ndescription: d\nmetadata: {"internal": "true"}\n---\n',
        ):
            with self.subTest(frontmatter=frontmatter):
                (self.development / "ship/SKILL.md").write_text(frontmatter)
                error = io.StringIO()
                with (
                    contextlib.redirect_stdout(io.StringIO()),
                    contextlib.redirect_stderr(error),
                    self.assertRaises(SystemExit),
                ):
                    ci_check.check_skill_md()
                self.assertIn("a development skill must set metadata", error.getvalue())

    def test_a_customer_skill_with_the_internal_flag_is_rejected(self):
        err = self.check_frontmatter("name: beancount-ask\ndescription: d\nmetadata:\n  internal: true\n")
        self.assertIn("a customer skill must not set metadata internal", err)

    def test_development_eval_fixtures_are_checked(self):
        evals = self.development / "ship/evals/evals.json"
        evals.parent.mkdir()
        evals.write_text(json.dumps({"evals": [{"id": 1, "files": ["missing.csv"]}]}))
        error = io.StringIO()
        with contextlib.redirect_stderr(error), self.assertRaises(SystemExit):
            ci_check.check_evals()
        self.assertIn("referenced file missing: missing.csv", error.getvalue())


class TestCheckoutPaths(unittest.TestCase):
    """check_checkout_paths: guide paths under $SKILLS_SRC must be in the sparse checkout."""

    FILES = ["scripts/skills/beancount-skills.py", "skills/beancount-ask/references/bea-cli.md", "skills/README.md"]

    def setUp(self):
        scratch = SCRIPTS_DIR / "tmp"
        scratch.mkdir(exist_ok=True)
        temporary = tempfile.TemporaryDirectory(dir=scratch)
        self.addCleanup(temporary.cleanup)
        self.repo = Path(temporary.name)
        docs = self.repo / "docs" / "skills"
        docs.mkdir(parents=True)
        (self.repo / "skills").mkdir()
        (self.repo / "skills/README.md").write_text("")
        (self.repo / "skills/AGENTS.md").write_text("")
        self.guide = docs / "installation.md"
        patches = mock.patch.multiple(
            ci_check,
            REPO_ROOT=self.repo,
            SKILLS_ROOT=self.repo / "skills",
            CUSTOMER_DOCS=docs,
            # `git ls-files` output: `/`-separated on every platform.
            repo_files=mock.Mock(return_value=self.FILES),
        )
        patches.start()
        self.addCleanup(patches.stop)

    def check(self, cited: str, path_type=Path) -> tuple[bool, str]:
        """Run the check on a guide citing CITED with ci-check's Path set to PATH_TYPE: (passed, output)."""
        self.guide.write_text(
            'git -C "$SKILLS_SRC" sparse-checkout set skills scripts/skills docs/skills\n'
            f'python3 "$SKILLS_SRC/scripts/skills/beancount-skills.py" install\nSee $SKILLS_SRC/{cited}.\n'
        )
        output = io.StringIO()
        with (
            mock.patch.object(ci_check, "Path", path_type),
            contextlib.redirect_stdout(output),
            contextlib.redirect_stderr(output),
        ):
            try:
                ci_check.check_checkout_paths()
            except SystemExit:
                return False, output.getvalue()
        return True, output.getvalue()

    def test_a_cited_directory_passes_under_windows_path_separators(self):
        # A directory exists only as a parent of fetched files; on Windows its
        # parents spell `\`, which must still match the guide's `/`.
        for path_type in (Path, PureWindowsPath):
            with self.subTest(path_type=path_type.__name__):
                passed, output = self.check("skills/beancount-ask/references", path_type)
                self.assertTrue(passed, output)
                self.assertIn("OK checkout paths in customer guides", output)

    def test_a_path_outside_the_checkout_fails_under_either_separator(self):
        for path_type in (Path, PureWindowsPath):
            with self.subTest(path_type=path_type.__name__):
                passed, output = self.check("skills/beancount-gone", path_type)
                self.assertFalse(passed)
                self.assertIn(
                    f"{Path('docs/skills/installation.md')}:3: $SKILLS_SRC/skills/beancount-gone is not in the customer's checkout",
                    output,
                )


class TestPluginManifests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.skills = self.root / "skills"
        for name in ("beancount-add", "beancount-ask"):
            skill = self.skills / name / "SKILL.md"
            skill.parent.mkdir(parents=True)
            skill.write_text("x")
        (self.root / ".claude-plugin").mkdir()
        (self.root / ".agents/plugins").mkdir(parents=True)
        self.entry = {
            "name": "beancount-io",
            "source": "./skills",
            "description": "Ledger skills.",
            "version": "0.1.0",
            "license": "MIT",
            "skills": ["./beancount-add", "./beancount-ask"],
        }
        for patch in (
            unittest.mock.patch.object(ci_check, "REPO_ROOT", self.root),
            unittest.mock.patch.object(ci_check, "SKILLS_DIR", self.skills),
        ):
            patch.start()
            self.addCleanup(patch.stop)
        self.write_manifests()

    def write_manifests(self, entry=None, plugin=None):
        entry = dict(self.entry, **(entry or {}))
        plugin = dict(
            {"name": "beancount-io", "version": "0.1.0", "description": "Ledger skills.", "license": "MIT"},
            **(plugin or {}),
        )
        (self.root / ".claude-plugin/marketplace.json").write_text(
            json.dumps({"name": "beancount-io", "plugins": [entry]})
        )
        (self.root / "plugin.json").write_text(json.dumps(plugin))
        (self.root / ".agents/plugins/marketplace.json").write_text(
            json.dumps({"name": "beancount-io", "plugins": [{"name": "beancount-io", "source": {"path": "./"}}]})
        )

    def check(self):
        error = io.StringIO()
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(error):
            try:
                ci_check.check_plugin_manifests()
            except SystemExit:
                pass
        return error.getvalue()

    def test_agreeing_manifests_pass(self):
        self.assertEqual(self.check(), "")

    def test_version_disagreement_is_rejected(self):
        self.write_manifests(plugin={"version": "0.1.1"})
        self.assertIn("plugin manifests disagree on version", self.check())

    def test_stale_skill_list_is_rejected(self):
        self.write_manifests(entry={"skills": ["./beancount-add"]})
        self.assertIn("skills must list every customer skill on disk", self.check())

    def test_non_semver_is_rejected(self):
        self.write_manifests(entry={"version": "1.0"}, plugin={"version": "1.0"})
        self.assertIn("is not semver", self.check())


class TestCatalogGroups(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.customer = self.root / "skills"
        self.development = self.root / ".agents/skills"
        for base, name in [(self.customer, "beancount-ask"), (self.development, "ship")]:
            skill = base / name / "SKILL.md"
            skill.parent.mkdir(parents=True)
            skill.write_text("x")
        self.config = {
            "notGrouped": "bottom",
            "groupings": [
                {"title": "Beancount.io suite", "skills": ["beancount-ask"]},
                {"title": "Repository development", "skills": ["ship"]},
            ],
        }
        patch = mock.patch.multiple(
            ci_check, REPO_ROOT=self.root, SKILLS_DIR=self.customer, DEV_SKILLS_DIR=self.development
        )
        patch.start()
        self.addCleanup(patch.stop)

    def check(self):
        (self.root / "skills.sh.json").write_text(json.dumps(self.config))
        error = io.StringIO()
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(error):
            try:
                ci_check.check_catalog_groups()
            except SystemExit:
                pass
        return error.getvalue()

    def test_separate_complete_audiences_pass(self):
        self.assertEqual(self.check(), "")

    def test_new_customer_skill_cannot_silently_miss_the_suite_group(self):
        skill = self.customer / "beancount-close/SKILL.md"
        skill.parent.mkdir()
        skill.write_text("x")
        self.assertIn("Beancount.io suite must contain exactly", self.check())

    def test_contributor_skill_cannot_enter_the_customer_suite(self):
        self.config["groupings"][0]["skills"].append("ship")
        self.assertIn("Beancount.io suite must contain exactly", self.check())

    def test_contributor_inventory_cannot_go_stale(self):
        self.config["groupings"][1]["skills"] = []
        self.assertIn("Repository development must contain exactly", self.check())

    def test_ungrouped_skills_cannot_displace_the_suite(self):
        self.config["notGrouped"] = "top"
        self.assertIn("curated suite must precede", self.check())


class TestRoutingSet(unittest.TestCase):
    def setUp(self):
        scratch = SCRIPTS_DIR / "tmp"
        scratch.mkdir(exist_ok=True)
        temporary = tempfile.TemporaryDirectory(dir=scratch)
        self.addCleanup(temporary.cleanup)
        self.repo = Path(temporary.name)
        self.customer = self.repo / "skills"
        for name in ("beancount-ask", "beancount-close"):
            (self.customer / name).mkdir(parents=True)
            (self.customer / name / "SKILL.md").write_text(f"---\nname: {name}\ndescription: d\n---\n")
        patches = mock.patch.multiple(
            ci_check,
            REPO_ROOT=self.repo,
            SKILLS_ROOT=self.repo / "skills",
            SKILLS_DIR=self.customer,
            ROUTING_SET=self.repo / "scripts/skills/routing.json",
        )
        patches.start()
        self.addCleanup(patches.stop)
        self.entries = [
            self.entry("ask-spend", "What did I spend last month?", "beancount-ask", ["beancount-close"]),
            self.entry("close-june", "Close the books for June.", "beancount-close", []),
            self.entry("none-close-card", "Close my old card account.", "none", ["beancount-close", "beancount-ask"]),
        ]

    @staticmethod
    def entry(name, prompt, expected, confusable):
        return {"id": name, "prompt": prompt, "expected": expected, "confusable": confusable, "why": "w"}

    def check(self, entries) -> str:
        path = self.repo / "scripts/skills/routing.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({"entries": entries}))
        error = io.StringIO()
        with contextlib.redirect_stderr(error), contextlib.redirect_stdout(io.StringIO()):
            try:
                ci_check.check_routing()
            except SystemExit:
                pass
        return error.getvalue()

    def test_a_consistent_set_passes(self):
        self.assertEqual(self.check(self.entries), "")

    def test_a_label_left_behind_by_a_rename_fails(self):
        (self.customer / "beancount-close").rename(self.customer / "beancount-close-month")
        err = self.check(self.entries)
        self.assertIn("'beancount-close', which is not a customer skill", err)

    def test_an_expected_skill_that_does_not_exist_fails(self):
        self.entries[1]["expected"] = "beancount-close-month"
        err = self.check(self.entries)
        self.assertIn("'close-june' expects 'beancount-close-month', which is not a customer skill", err)

    def test_an_unknown_confusable_skill_fails(self):
        self.entries[0]["confusable"] = ["beancount-closing"]
        self.assertIn("lists confusable 'beancount-closing'", self.check(self.entries))

    def test_a_repeated_prompt_fails_after_whitespace_and_case(self):
        self.entries.append(self.entry("dupe", "  what did I   spend last MONTH?", "beancount-ask", []))
        self.assertIn("'dupe' repeats the prompt of 'ask-spend'", self.check(self.entries))

    def test_a_skill_without_positives_fails(self):
        self.entries[1]["expected"] = "none"
        self.assertIn("no entry expects beancount-close", self.check(self.entries))

    def test_a_skill_without_near_misses_fails(self):
        self.entries[2]["confusable"] = ["beancount-close"]
        self.assertIn("no near-miss entry lists beancount-ask as confusable", self.check(self.entries))

    def test_an_entry_cannot_be_a_near_miss_for_itself(self):
        self.entries[1]["confusable"] = ["beancount-close"]
        self.assertIn("lists its own expected skill as confusable", self.check(self.entries))

    def test_missing_fields_fail(self):
        del self.entries[0]["why"]
        self.assertIn("every entry needs id, prompt, expected, confusable, why", self.check(self.entries))


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
            skills_dir = repo / "skills"
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

    def test_redundant_install_in_a_supporting_reference_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            skills_dir = repo / "skills"
            reference = skills_dir / "beancount-init/references/compatibility.md"
            reference.parent.mkdir(parents=True)
            reference.write_text("If missing, pip install beanquery.\n")
            with mock.patch.multiple(ci_check, REPO_ROOT=repo, SKILLS_DIR=skills_dir):
                with self.assertRaises(SystemExit):
                    ci_check.check_no_redundant_installs()

    def test_libmagic_requirement_claim_is_rejected(self):
        for text in (
            "enable with `bea engine enable beangulp`\n(requires system libmagic), then\n",
            "Beangulp also needs the system\nlibmagic library.\n",
        ):
            with self.subTest(text=text), tempfile.TemporaryDirectory() as tmp:
                repo = Path(tmp)
                skills_dir = repo / "skills"
                docs = repo / "docs/skills"
                (docs / "guide.md").parent.mkdir(parents=True)
                (docs / "guide.md").write_text(text)
                skills_dir.mkdir(parents=True, exist_ok=True)
                with mock.patch.multiple(
                    ci_check, REPO_ROOT=repo, SKILLS_ROOT=repo / "skills", SKILLS_DIR=skills_dir, CUSTOMER_DOCS=docs
                ):
                    with self.assertRaises(SystemExit):
                        ci_check.check_no_redundant_installs()

    def test_optional_libmagic_wording_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            skills_dir = repo / "skills"
            docs = repo / "docs/skills"
            (docs / "guide.md").parent.mkdir(parents=True)
            (docs / "guide.md").write_text(
                "The system libmagic library is optional: only importers that call\n"
                "python-magic themselves need it.\n"
            )
            skills_dir.mkdir(parents=True, exist_ok=True)
            with mock.patch.multiple(
                ci_check, REPO_ROOT=repo, SKILLS_ROOT=repo / "skills", SKILLS_DIR=skills_dir, CUSTOMER_DOCS=docs
            ), contextlib.redirect_stdout(io.StringIO()):
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
