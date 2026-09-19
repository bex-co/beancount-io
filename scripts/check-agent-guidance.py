#!/usr/bin/env python3
"""Validate the repository's canonical agent-guidance file structure."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

SETTINGS = REPO_ROOT / ".claude/settings.json"
PLUGIN_KEY = "agents-md@builtin"
ACCEPTED_MODES = ("claude-md-or-agents-md", "claude-md-and-agents-md")


def repository_paths() -> set[Path]:
    """Return tracked and visible untracked paths, excluding ignored files."""
    result = subprocess.run(
        [
            "git",
            "ls-files",
            "-z",
            "--cached",
            "--others",
            "--exclude-standard",
        ],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
    )
    return {REPO_ROOT / os.fsdecode(raw) for raw in result.stdout.split(b"\0") if raw}


def relative(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def check_instruction_mode(errors: list[str]) -> None:
    """Claude Code only reads AGENTS.md when the agents-md plugin is configured."""
    try:
        settings = json.loads(SETTINGS.read_text())
    except FileNotFoundError:
        errors.append(".claude/settings.json is missing")
        return
    except json.JSONDecodeError as exc:
        errors.append(f".claude/settings.json is not valid JSON: {exc}")
        return

    options = settings.get("pluginConfigs", {}).get(PLUGIN_KEY, {}).get("options", {})
    mode = options.get("instructionFiles")
    if mode not in ACCEPTED_MODES:
        errors.append(
            f'.claude/settings.json must set pluginConfigs["{PLUGIN_KEY}"]'
            f".options.instructionFiles to one of {ACCEPTED_MODES}, got {mode!r}"
        )


def main() -> int:
    paths = repository_paths()
    agents_files = sorted(path for path in paths if path.name == "AGENTS.md")
    claude_files = sorted(path for path in paths if path.name == "CLAUDE.md")
    errors: list[str] = []

    for claude in claude_files:
        errors.append(
            f"{relative(claude)} must not exist; AGENTS.md is the only instruction file"
        )

    for agents in agents_files:
        if agents.is_symlink() or not agents.is_file():
            errors.append(f"{relative(agents)} must be a regular file, not a symlink")

    check_instruction_mode(errors)

    # Development skills are real files in .agents/skills; Claude Code uses
    # a relative alias. Customer ledger skills remain a separate package.
    for directory in (".agents/skills", "skills/.claude/skills"):
        skills = REPO_ROOT / directory
        if skills.is_symlink() or not skills.is_dir():
            errors.append(f"{directory} must be a real directory")

    shared_skills = REPO_ROOT / ".claude/skills"
    expected_target = "../.agents/skills"
    if not shared_skills.is_symlink():
        errors.append(".claude/skills must be a relative symlink")
    elif os.readlink(shared_skills) != expected_target:
        errors.append(
            f".claude/skills points to {os.readlink(shared_skills)!r}, expected {expected_target!r}"
        )
    elif shared_skills.resolve() != (REPO_ROOT / ".agents/skills").resolve():
        errors.append(".claude/skills does not resolve to .agents/skills")

    if errors:
        for error in errors:
            print(f"FAIL: {error}", file=sys.stderr)
        return 1

    print(
        f"OK: {len(agents_files)} AGENTS.md scopes are canonical regular files and no "
        "CLAUDE.md exists; Claude Code reads them via the agents-md plugin; "
        ".claude/skills resolves to .agents/skills; customer skills are separate."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
