#!/usr/bin/env python3
"""Validate the repository's canonical agent-guidance file structure."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


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


def main() -> int:
    paths = repository_paths()
    claude_files = sorted(path for path in paths if path.name == "CLAUDE.md")
    agents_files = sorted(path for path in paths if path.name == "AGENTS.md")
    errors: list[str] = []

    for claude in claude_files:
        if claude.is_symlink() or not claude.is_file():
            errors.append(f"{relative(claude)} must be a canonical regular file")
            continue

        agents = claude.with_name("AGENTS.md")
        if not agents.is_symlink():
            errors.append(f"{relative(agents)} must be a relative symlink to CLAUDE.md")
            continue
        if os.readlink(agents) != "CLAUDE.md":
            errors.append(
                f"{relative(agents)} points to {os.readlink(agents)!r}, expected 'CLAUDE.md'"
            )
        elif agents.resolve() != claude.resolve():
            errors.append(
                f"{relative(agents)} does not resolve to its sibling CLAUDE.md"
            )

    for agents in agents_files:
        claude = agents.with_name("CLAUDE.md")
        if claude not in paths:
            errors.append(
                f"{relative(agents)} has no tracked/visible sibling CLAUDE.md"
            )

    # Both agents must read the same skill tree: Claude Code via .claude/skills,
    # Codex via .agents/skills. Each is a relative symlink to the canonical tree.
    expected_target = "../skills/.claude/skills"
    canonical_skills = (REPO_ROOT / "skills/.claude/skills").resolve()
    for link in (".claude/skills", ".agents/skills"):
        shared_skills = REPO_ROOT / link
        if not shared_skills.is_symlink():
            errors.append(f"{link} must be a relative symlink")
        elif os.readlink(shared_skills) != expected_target:
            errors.append(
                f"{link} points to {os.readlink(shared_skills)!r}, expected {expected_target!r}"
            )
        elif shared_skills.resolve() != canonical_skills:
            errors.append(f"{link} does not resolve to skills/.claude/skills")

    if errors:
        for error in errors:
            print(f"FAIL: {error}", file=sys.stderr)
        return 1

    print(
        f"OK: {len(claude_files)} CLAUDE.md scopes have matching AGENTS.md links; "
        ".claude/skills and .agents/skills resolve to the canonical skill tree."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
