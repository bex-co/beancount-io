#!/usr/bin/env python3
"""Structural CI checks for the skills package.

Validates SKILL.md frontmatter, evals.json, referenced fixtures, Python
syntax, and both bean-check and `bea check` on ledger fixtures. Some fixtures
are deliberately invalid (failure-mode evals); list them in
EXPECTED_BEAN_CHECK_FAILURES. The `bea` leg must agree with bean-check on
every fixture, since skills prefer `bea check` when installed.
"""

from __future__ import annotations

import json
import os
import py_compile
import re
import subprocess
import sys
from pathlib import Path


SKILLS_ROOT = Path(__file__).resolve().parents[1]
SKILLS_DIR = SKILLS_ROOT / ".claude" / "skills"
REPO_ROOT = SKILLS_ROOT.parent

# Ledger fixtures that must fail bean-check (failure-mode evals).
EXPECTED_BEAN_CHECK_FAILURES = {
    "beancount-close/evals/files/eval5_ledger.beancount",
}


def fail(msg: str) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


# Skills converged on `bea` in w1/m18. Each must state the preference once,
# and no raw "append … to the ledger file" instruction may survive outside
# the documented no-`bea` fallback block.
BEA_FIRST_SKILLS = (
    "beancount-init",
    "beancount-import",
    "beancount-reconcile",
    "beancount-close",
    "beancount-ask",
)
RAW_APPEND = re.compile(r"\bappend\w*\b.{0,80}?\bto\b.{0,20}?(ledger file|main file|\./[\w./-]+)", re.IGNORECASE)
APPEND_EXCUSED = re.compile(r"\bbea\b|append_target|append-only|yes/no|confirm|fallback", re.IGNORECASE)
FALLBACK_SECTION = re.compile(r"fallback|without `bea`|no-`bea`|hand-append", re.IGNORECASE)


def check_symlinks() -> None:
    agents = SKILLS_ROOT / "AGENTS.md"
    if not agents.is_symlink() or agents.readlink().as_posix() != "CLAUDE.md":
        fail("skills/AGENTS.md must be a relative symlink to CLAUDE.md")

    agents_skills = REPO_ROOT / ".agents" / "skills"
    expected = Path("../skills/.claude/skills")
    if not agents_skills.is_symlink() or agents_skills.readlink() != expected:
        fail(".agents/skills must be a relative symlink to ../skills/.claude/skills")


def parse_frontmatter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        fail(f"{path.relative_to(SKILLS_ROOT)}: missing YAML frontmatter")
    end = text.find("\n---\n", 4)
    if end < 0:
        fail(f"{path.relative_to(SKILLS_ROOT)}: unclosed YAML frontmatter")
    meta: dict[str, str] = {}
    for line in text[4:end].splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip().strip("\"'")
    return meta


def check_skill_md() -> None:
    skill_files = sorted(SKILLS_DIR.glob("*/SKILL.md"))
    if not skill_files:
        fail("no SKILL.md files found under skills/.claude/skills/")
    for path in skill_files:
        meta = parse_frontmatter(path)
        rel = path.relative_to(SKILLS_ROOT)
        for key in ("name", "description"):
            if not meta.get(key):
                fail(f"{rel}: frontmatter missing '{key}'")
        print(f"OK frontmatter {rel}")


def check_evals() -> None:
    for evals_path in sorted(SKILLS_DIR.glob("*/evals/evals.json")):
        rel = evals_path.relative_to(SKILLS_ROOT)
        try:
            data = json.loads(evals_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            fail(f"{rel}: invalid JSON ({exc})")
        if "evals" not in data or not isinstance(data["evals"], list):
            fail(f"{rel}: missing 'evals' array")
        # Paths in evals.json are relative to the skill root (…/beancount-*/).
        skill_root = evals_path.parent.parent
        for entry in data["evals"]:
            if not isinstance(entry, dict) or "id" not in entry:
                fail(f"{rel}: eval entry missing 'id'")
            for file_rel in entry.get("files", []):
                candidate = skill_root / file_rel
                if not candidate.is_file():
                    fail(f"{rel}: referenced file missing: {file_rel}")
        print(f"OK evals {rel}")


def check_python() -> None:
    for path in sorted(SKILLS_DIR.rglob("*.py")):
        try:
            py_compile.compile(str(path), doraise=True)
        except py_compile.PyCompileError as exc:
            fail(str(exc))
        print(f"OK python {path.relative_to(SKILLS_ROOT)}")


def resolve_tool(candidates: list[list[str]], probe: str, missing: str) -> list[str]:
    for candidate in candidates:
        try:
            subprocess.run(
                [*candidate, probe],
                check=True,
                capture_output=True,
            )
            return candidate
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    fail(missing)


def find_bean_check() -> list[str]:
    return resolve_tool(
        [
            ["bean-check"],
            ["uv", "run", "--project", str(REPO_ROOT / "cli"), "bean-check"],
        ],
        "--help",
        "bean-check not found (install beancount, or sync cli)",
    )


def find_bea() -> list[str]:
    return resolve_tool(
        [
            ["bea"],
            ["uv", "run", "--project", str(REPO_ROOT / "cli"), "bea"],
        ],
        "--version",
        "bea not found (install beancount-io, or sync cli)",
    )


def check_ledgers() -> None:
    bean_check = find_bean_check()
    bea = find_bea()
    ledgers = sorted(SKILLS_DIR.rglob("*ledger.beancount"))
    if not ledgers:
        fail("no *ledger.beancount fixtures found")

    env = {**os.environ, "BEA_NO_UPDATE_NOTIFIER": "1"}
    unexpected_pass: list[str] = []
    unexpected_fail: list[str] = []
    bea_disagree: list[str] = []

    for path in ledgers:
        rel = path.relative_to(SKILLS_DIR).as_posix()
        result = subprocess.run(
            [*bean_check, str(path)],
            capture_output=True,
            text=True,
        )
        failed = result.returncode != 0 or bool(result.stdout.strip() or result.stderr.strip())
        expected_fail = rel in EXPECTED_BEAN_CHECK_FAILURES

        bea_result = subprocess.run(
            [*bea, "--file", str(path), "check"],
            capture_output=True,
            text=True,
            env=env,
        )
        bea_failed = bea_result.returncode != 0
        if bea_failed != failed:
            bea_disagree.append(rel)
            detail = (bea_result.stdout or bea_result.stderr).strip().splitlines()
            print(f"bea check disagrees with bean-check for {rel}:", file=sys.stderr)
            for line in detail[:8]:
                print(f"  {line}", file=sys.stderr)
        else:
            status = "expected-fail" if expected_fail else "pass"
            print(f"OK bea check ({status}) {rel}")

        if expected_fail and not failed:
            unexpected_pass.append(rel)
        elif not expected_fail and failed:
            unexpected_fail.append(rel)
            detail = (result.stdout or result.stderr).strip().splitlines()
            print(f"bean-check errors for {rel}:", file=sys.stderr)
            for line in detail[:8]:
                print(f"  {line}", file=sys.stderr)
        else:
            status = "expected-fail" if expected_fail else "pass"
            print(f"OK bean-check ({status}) {rel}")

    unknown = EXPECTED_BEAN_CHECK_FAILURES - {p.relative_to(SKILLS_DIR).as_posix() for p in ledgers}
    if unknown:
        fail(f"EXPECTED_BEAN_CHECK_FAILURES entries not found: {sorted(unknown)}")
    if unexpected_pass:
        fail(f"expected bean-check failures that now pass: {unexpected_pass}")
    if unexpected_fail:
        fail(f"unexpected bean-check failures: {unexpected_fail}")
    if bea_disagree:
        fail(f"`bea check` disagrees with bean-check for: {bea_disagree}")


def check_bea_first() -> None:
    for skill in BEA_FIRST_SKILLS:
        path = SKILLS_DIR / skill / "SKILL.md"
        text = path.read_text(encoding="utf-8")
        if "prefer `bea`" not in text.lower():
            fail(f".claude/skills/{skill}/SKILL.md states no bea preference")
        in_fallback = False
        for lineno, line in enumerate(text.splitlines(), 1):
            if line.startswith("## "):
                in_fallback = bool(FALLBACK_SECTION.search(line))
            elif FALLBACK_SECTION.search(line):
                in_fallback = True
            if not in_fallback and RAW_APPEND.search(line) and not APPEND_EXCUSED.search(line):
                fail(
                    f".claude/skills/{skill}/SKILL.md:{lineno} appends to the ledger "
                    f"outside the fallback block: {line.strip()[:100]}"
                )
        print(f"OK bea-first {skill}")


def main() -> None:
    check_symlinks()
    check_skill_md()
    check_evals()
    check_python()
    check_ledgers()
    check_bea_first()
    print("All skills CI checks passed.")


if __name__ == "__main__":
    main()
