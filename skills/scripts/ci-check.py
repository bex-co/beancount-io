#!/usr/bin/env python3
"""Structural CI checks for customer-facing and repository development skills.

Validates SKILL.md frontmatter, evals.json, referenced fixtures, Python
syntax, and ledger fixtures under two deliberate legs:

1. **Customer bea** — `bea check` with global `bean-*` tools scrubbed from PATH
   (managed engine only; no shared-venv mask).
2. **Upstream oracle** — `bean-check` only via the CLI project's locked env
   (`uv run --project cli bean-check`), never as the customer install path.

Some fixtures are deliberately invalid (failure-mode evals); list them in
EXPECTED_BEAN_CHECK_FAILURES. The two legs must agree on every fixture.
"""

from __future__ import annotations

import json
import os
import py_compile
import re
import shlex
import subprocess
import sys
from pathlib import Path


SKILLS_ROOT = Path(__file__).resolve().parents[1]
SKILLS_DIR = SKILLS_ROOT / ".claude" / "skills"
REPO_ROOT = SKILLS_ROOT.parent
DEV_SKILLS_DIR = REPO_ROOT / ".agents" / "skills"
CLI_PROJECT = REPO_ROOT / "cli"

# Ledger fixtures that must fail bean-check (failure-mode evals).
EXPECTED_BEAN_CHECK_FAILURES = {
    "skills/.claude/skills/beancount-close/evals/files/eval5_ledger.beancount",
}

# Skills that must state a bea preference once and keep raw appends in fallbacks.
BEA_FIRST_SKILLS = (
    "beancount-init",
    "beancount-import",
    "beancount-reconcile",
    "beancount-close",
    "beancount-ask",
    "beancount-options",
    "beancount-migrate",
)

RAW_APPEND = re.compile(
    r"\bappend\w*\b.{0,80}?\bto\b.{0,20}?(ledger file|main file|\./[\w./-]+)",
    re.IGNORECASE,
)
APPEND_EXCUSED = re.compile(
    r"\bbea\b|append_target|append-only|yes/no|confirm|fallback",
    re.IGNORECASE,
)
FALLBACK_SECTION = re.compile(
    r"fallback|without `bea`|no-`bea`|hand-append|side path",
    re.IGNORECASE,
)

# Customer skills must not prescribe a second Beancount CLI install.
PIP_INSTALL_BEANCOUNT = re.compile(
    r"pip\s+install\s+(?:beancount|beanquery|beangulp|beanprice)\b",
    re.IGNORECASE,
)
PRIVATE_ENGINE_PATH = re.compile(
    r"\bBEA_ENGINE\b|\$XDG_DATA_HOME/bea/engine|~/\.local/share/bea/engine",
)


def fail(msg: str) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def check_symlinks() -> None:
    agents = SKILLS_ROOT / "AGENTS.md"
    if not agents.is_symlink() or agents.readlink().as_posix() != "CLAUDE.md":
        fail("skills/AGENTS.md must be a relative symlink to CLAUDE.md")

    for directory in (SKILLS_DIR, DEV_SKILLS_DIR):
        if directory.is_symlink() or not directory.is_dir():
            fail(f"{directory.relative_to(REPO_ROOT)} must be a real directory")

    claude_skills = REPO_ROOT / ".claude" / "skills"
    expected = Path("../.agents/skills")
    if not claude_skills.is_symlink() or claude_skills.readlink() != expected:
        fail(".claude/skills must be a relative symlink to ../.agents/skills")


def skill_files(pattern: str) -> list[Path]:
    return sorted(
        path
        for directory in (SKILLS_DIR, DEV_SKILLS_DIR)
        for path in directory.glob(pattern)
    )


def parse_frontmatter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        fail(f"{path.relative_to(REPO_ROOT)}: missing YAML frontmatter")
    end = text.find("\n---\n", 4)
    if end < 0:
        fail(f"{path.relative_to(REPO_ROOT)}: unclosed YAML frontmatter")
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
    for directory in (SKILLS_DIR, DEV_SKILLS_DIR):
        if not any(directory.glob("*/SKILL.md")):
            fail(f"no SKILL.md files found under {directory.relative_to(REPO_ROOT)}")
    for path in skill_files("*/SKILL.md"):
        customer_facing = path.parent.name.startswith("beancount-")
        if customer_facing != (path.parent.parent == SKILLS_DIR):
            destination = SKILLS_DIR if customer_facing else DEV_SKILLS_DIR
            fail(f"{path.relative_to(REPO_ROOT)} belongs in {destination.relative_to(REPO_ROOT)}")
        meta = parse_frontmatter(path)
        rel = path.relative_to(REPO_ROOT)
        for key in ("name", "description"):
            if not meta.get(key):
                fail(f"{rel}: frontmatter missing '{key}'")
        print(f"OK frontmatter {rel}")


def check_evals() -> None:
    for evals_path in skill_files("*/evals/evals.json"):
        rel = evals_path.relative_to(REPO_ROOT)
        try:
            data = json.loads(evals_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            fail(f"{rel}: invalid JSON ({exc})")
        if "evals" not in data or not isinstance(data["evals"], list):
            fail(f"{rel}: missing 'evals' array")
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
    for path in skill_files("**/*.py"):
        try:
            py_compile.compile(str(path), doraise=True)
        except py_compile.PyCompileError as exc:
            fail(str(exc))
        print(f"OK python {path.relative_to(REPO_ROOT)}")


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


def find_bea() -> list[str]:
    """Customer install under test: PATH bea, else the CLI project's bea."""
    return resolve_tool(
        [
            ["bea"],
            ["uv", "run", "--project", str(CLI_PROJECT), "bea"],
        ],
        "--version",
        "bea not found (install beancount-io, or sync cli)",
    )


def find_bean_check_oracle() -> list[str]:
    """Deliberate upstream reference — never the customer PATH bean-check."""
    override = os.environ.get("BEA_SKILLS_ORACLE_BEAN_CHECK", "").strip()
    if override:
        return shlex.split(override)
    return resolve_tool(
        [["uv", "run", "--project", str(CLI_PROJECT), "bean-check"]],
        "--help",
        "oracle bean-check not found (sync cli with uv sync --all-groups)",
    )


def env_without_global_bean_tools(extra: dict[str, str] | None = None) -> dict[str, str]:
    """PATH scrub so customer bea cannot mask itself with a global bean-*."""
    env = {**os.environ, "BEA_NO_UPDATE_NOTIFIER": "1", **(extra or {})}
    cleaned: list[str] = []
    for part in env.get("PATH", "").split(os.pathsep):
        if not part:
            continue
        directory = Path(part)
        if (directory / "bean-check").exists() or (directory / "bean-query").exists():
            continue
        cleaned.append(part)
    env["PATH"] = os.pathsep.join(cleaned)
    return env


def path_has_bean_check(env: dict[str, str]) -> bool:
    for part in env.get("PATH", "").split(os.pathsep):
        if part and (Path(part) / "bean-check").exists():
            return True
    return False


def check_ledgers() -> None:
    bea = find_bea()
    oracle = find_bean_check_oracle()
    bea_env = env_without_global_bean_tools()
    if path_has_bean_check(bea_env):
        fail("PATH scrub failed: bean-check still visible to the customer bea leg")

    # Oracle keeps the full environment (cli uv project) so bean-check resolves.
    oracle_env = {**os.environ, "BEA_NO_UPDATE_NOTIFIER": "1"}

    ledgers = skill_files("**/*ledger.beancount")
    if not ledgers:
        fail("no *ledger.beancount fixtures found")

    unexpected_pass: list[str] = []
    unexpected_fail: list[str] = []
    bea_disagree: list[str] = []

    print(f"Customer bea: {' '.join(bea)} (PATH without bean-*)")
    print(f"Oracle bean-check: {' '.join(oracle)}")

    for path in ledgers:
        rel = path.relative_to(REPO_ROOT).as_posix()
        oracle_result = subprocess.run(
            [*oracle, str(path)],
            capture_output=True,
            text=True,
            env=oracle_env,
        )
        failed = oracle_result.returncode != 0 or bool(
            oracle_result.stdout.strip() or oracle_result.stderr.strip()
        )
        expected_fail = rel in EXPECTED_BEAN_CHECK_FAILURES

        bea_result = subprocess.run(
            [*bea, "--file", str(path), "check"],
            capture_output=True,
            text=True,
            env=bea_env,
        )
        bea_failed = bea_result.returncode != 0
        if bea_failed != failed:
            bea_disagree.append(rel)
            detail = (bea_result.stdout or bea_result.stderr).strip().splitlines()
            print(f"bea check disagrees with oracle bean-check for {rel}:", file=sys.stderr)
            for line in detail[:8]:
                print(f"  {line}", file=sys.stderr)
        else:
            status = "expected-fail" if expected_fail else "pass"
            print(f"OK bea check ({status}) {rel}")

        if expected_fail and not failed:
            unexpected_pass.append(rel)
        elif not expected_fail and failed:
            unexpected_fail.append(rel)
            detail = (oracle_result.stdout or oracle_result.stderr).strip().splitlines()
            print(f"oracle bean-check errors for {rel}:", file=sys.stderr)
            for line in detail[:8]:
                print(f"  {line}", file=sys.stderr)
        else:
            status = "expected-fail" if expected_fail else "pass"
            print(f"OK oracle bean-check ({status}) {rel}")

    unknown = EXPECTED_BEAN_CHECK_FAILURES - {
        p.relative_to(REPO_ROOT).as_posix() for p in ledgers
    }
    if unknown:
        fail(f"EXPECTED_BEAN_CHECK_FAILURES entries not found: {sorted(unknown)}")
    if unexpected_pass:
        fail(f"expected oracle failures that now pass: {unexpected_pass}")
    if unexpected_fail:
        fail(f"unexpected oracle bean-check failures: {unexpected_fail}")
    if bea_disagree:
        fail(f"`bea check` disagrees with oracle bean-check for: {bea_disagree}")


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


def check_no_redundant_installs() -> None:
    """Customer skill text must not push a second Beancount CLI install."""
    for path in sorted(SKILLS_DIR.glob("*/SKILL.md")):
        rel = path.relative_to(REPO_ROOT).as_posix()
        text = path.read_text(encoding="utf-8")
        for lineno, line in enumerate(text.splitlines(), 1):
            if PIP_INSTALL_BEANCOUNT.search(line):
                # Allowed only when telling the agent what NOT to do.
                if re.search(
                    r"(?i)(?:\bdo\b.{0,12}\bnot\b|\bdon't\b|\bnever\b|\brather than\b|\bover\b)",
                    line,
                ):
                    continue
                fail(f"{rel}:{lineno} instructs pip install of an upstream accounting tool")
            if PRIVATE_ENGINE_PATH.search(line) and not re.search(
                r"(?i)(?:\bdo\b.{0,12}\bnot\b|\bdon't\b|\bnever\b|\bnot\b)",
                line,
            ):
                fail(f"{rel}:{lineno} documents a private engine path for agents to configure")
        print(f"OK one-install guidance {path.parent.name}")


def main() -> None:
    check_symlinks()
    check_skill_md()
    check_evals()
    check_python()
    check_ledgers()
    check_bea_first()
    check_no_redundant_installs()
    print("All skills CI checks passed.")


if __name__ == "__main__":
    main()
