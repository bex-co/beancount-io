#!/usr/bin/env python3
"""Install, verify, and remove the customer Beancount skill suite.

Stdlib only. The suite is linked, not copied: each owned `beancount-*`
directory in a destination is a symlink into this checkout, so Claude Code
(`~/.claude/skills`) and Codex (`~/.agents/skills`) share one copy and
`git pull --ff-only` updates both. See skills/docs/installation.md.

    beancount-skills.py install   DEST [DEST ...]
    beancount-skills.py verify    DEST [DEST ...]
    beancount-skills.py uninstall DEST [DEST ...]

`install` changes nothing when any owned name is already taken by something
else, `verify` never writes, and `uninstall` removes only links into this
checkout.
"""

from __future__ import annotations

import argparse
import filecmp
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve()
SOURCE_DIR = SCRIPT.parents[1] / ".claude" / "skills"

# Supporting documents are named `references/<name>.md` or by bare lowercase
# file name; URLs, uppercase outputs (MIGRATION.md), and example ledger or
# script paths in prose are not installation requirements.
URL = re.compile(r"https?://\S+")
REFERENCE = re.compile(r"(?<![\w./-])(?:references/)?([a-z0-9][a-z0-9-]*\.md)\b")
SIBLING = re.compile(r"(?<![\w-])beancount-[a-z]+(?:-[a-z]+)*")


def expected_skills() -> list[str]:
    return sorted(path.parent.name for path in SOURCE_DIR.glob("beancount-*/SKILL.md"))


def frontmatter(path: Path) -> dict[str, str]:
    # Separate from ci-check.py's parser, which exits on error and reports
    # repository-relative paths; this must run from a sparse checkout.
    text = path.read_text(encoding="utf-8")
    end = text.find("\n---\n", 4)
    if not text.startswith("---\n") or end < 0:
        return {}
    meta = {}
    for line in text[4:end].splitlines():
        key, sep, value = line.partition(":")
        if sep and not line.startswith((" ", "#")):
            meta[key.strip()] = value.strip().strip("\"'")
    return meta


def is_linked(entry: Path) -> bool:
    return entry.is_symlink() and entry.resolve() == (SOURCE_DIR / entry.name).resolve()


def verify(dest: Path) -> int:
    """Report whether DEST holds a complete, usable suite. Read-only."""
    names = expected_skills()
    problems: list[str] = []
    if not dest.is_dir():
        print(f"FAIL {dest}: directory does not exist; run install first", file=sys.stderr)
        return 1

    installed = []
    for name in names:
        entry = dest / name
        skill_md = entry / "SKILL.md"
        if not entry.exists():
            detail = f"link to missing {os.readlink(entry)}" if entry.is_symlink() else "not installed"
            problems.append(f"{name}: {detail}")
        elif not skill_md.is_file():
            problems.append(f"{name}: SKILL.md is missing")
        else:
            meta = frontmatter(skill_md)
            if meta.get("name") == name and meta.get("description"):
                installed.append(name)
            else:
                problems.append(f"{name}/SKILL.md: frontmatter needs `name: {name}` and a description")

    for name in installed:
        problems.extend(skill_problems(dest, name, names, installed))

    for entry in sorted(dest.glob("beancount-*")):
        if entry.name not in names:
            print(f"note {entry}: not part of this suite; left untouched")
    if not shutil.which("bea"):
        print("note: `bea` is not on PATH; the skills use it for checks, queries, and writes")

    for problem in problems:
        print(f"FAIL {problem}", file=sys.stderr)
    if problems:
        print(
            f"Incomplete suite in {dest}. Repair with: python3 {SCRIPT} install {dest}"
            " (after moving any conflicting copies aside)",
            file=sys.stderr,
        )
        return 1
    print(f"OK {len(names)} customer skills complete in {dest}")
    return 0


def skill_problems(dest: Path, name: str, names: list[str], installed: list[str]) -> list[str]:
    root = dest / name
    missing_files: dict[str, str] = {}
    missing_siblings: dict[str, str] = {}
    documents = [root / "SKILL.md", *sorted((root / "references").glob("*.md"))]
    for document in documents:
        where = document.relative_to(dest)
        for lineno, line in enumerate(document.read_text(encoding="utf-8").splitlines(), 1):
            line = URL.sub("", line)
            siblings = list(dict.fromkeys(s for s in SIBLING.findall(line) if s in names and s != name))
            for sibling in siblings:
                if sibling not in installed:
                    missing_siblings.setdefault(sibling, f"{where}:{lineno}")
            for filename in REFERENCE.findall(line):
                # A reference names a file of this skill, of a sibling named on
                # the same line, or (unqualified) of any installed suite skill.
                owners = [name, *siblings] if siblings else [name, *installed]
                if any((dest / owner / "references" / filename).is_file() for owner in owners):
                    continue
                owner = next(
                    (o for o in [name, *siblings, *names] if (SOURCE_DIR / o / "references" / filename).is_file()),
                    name,
                )
                missing_files.setdefault(f"{owner}/references/{filename}", f"{where}:{lineno}")
    return [
        *(f"{path} is missing ({where} needs it)" for path, where in missing_files.items()),
        *(
            f"{name} refers to {sibling} ({where}), which is not installed"
            for sibling, where in missing_siblings.items()
        ),
    ]


def describe_conflict(entry: Path) -> str:
    if entry.is_symlink():
        state = "" if entry.exists() else " (target missing)"
        return f"{entry} links to {os.readlink(entry)}{state}, not this checkout"
    if not entry.is_dir():
        return f"{entry} is a file"
    changes = tree_changes(SOURCE_DIR / entry.name, entry)
    if not changes:
        return f"{entry} is a copy identical to this checkout"
    shown = ", ".join(changes[:5]) + (f", +{len(changes) - 5} more" if len(changes) > 5 else "")
    return f"{entry} is a copy with local changes: {shown}"


def tree_changes(source: Path, copy: Path) -> list[str]:
    changes = []
    comparison = filecmp.dircmp(source, copy, ignore=["__pycache__", ".DS_Store"])
    pending = [(comparison, Path())]
    while pending:
        current, prefix = pending.pop()
        changes += [f"modified {prefix / f}" for f in current.diff_files]
        changes += [f"added {prefix / f}" for f in current.right_only]
        changes += [f"missing {prefix / f}" for f in current.left_only]
        pending += [(sub, prefix / sub_name) for sub_name, sub in current.subdirs.items()]
    return sorted(changes)


def install(dest: Path) -> int:
    entries = [dest / name for name in expected_skills()]
    conflicts = [describe_conflict(entry) for entry in entries if os.path.lexists(entry) and not is_linked(entry)]
    if conflicts:
        for conflict in conflicts:
            print(f"CONFLICT {conflict}", file=sys.stderr)
        backups = Path.home() / "beancount-skill-backups"
        print(
            f"Nothing was changed in {dest}. To keep an existing entry, move it out of the"
            f" skills directory (a renamed copy left inside still loads as a skill):\n"
            f"  mkdir -p {backups} && mv {dest}/<name> {backups}/\n"
            f"then run install again.",
            file=sys.stderr,
        )
        return 1

    dest.mkdir(parents=True, exist_ok=True)
    for entry in entries:
        if is_linked(entry):
            print(f"kept   {entry}")
        else:
            entry.symlink_to(SOURCE_DIR / entry.name, target_is_directory=True)
            print(f"linked {entry} -> {SOURCE_DIR / entry.name}")
    report_source()
    return verify(dest)


def report_source() -> None:
    def git(*args: str) -> str | None:
        try:
            result = subprocess.run(
                ["git", *args], cwd=SOURCE_DIR, capture_output=True, text=True, check=True
            )
        except (OSError, subprocess.CalledProcessError):
            return None
        return result.stdout.strip()

    revision = git("log", "-1", "--format=%h %cs")
    print(f"source {SOURCE_DIR}" + (f" at {revision}" if revision else " (not a Git checkout)"))
    changes = git("status", "--porcelain", "--", ".")
    if changes:
        print("note: local changes in the source checkout are used by every linked agent:")
        print("\n".join(f"  {line}" for line in changes.splitlines()))


def uninstall(dest: Path) -> int:
    for entry in (dest / name for name in expected_skills()):
        if is_linked(entry):
            entry.unlink()
            print(f"removed {entry}")
        elif os.path.lexists(entry):
            print(f"kept    {describe_conflict(entry)}")
    return 0


ACTIONS = {"install": install, "verify": verify, "uninstall": uninstall}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("command", choices=ACTIONS)
    parser.add_argument("dest", nargs="+", type=lambda value: Path(value).expanduser())
    args = parser.parse_args(argv)
    return max([ACTIONS[args.command](dest) for dest in args.dest])


if __name__ == "__main__":
    sys.exit(main())
