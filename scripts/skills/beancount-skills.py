#!/usr/bin/env python3
"""Install, verify, and remove the customer Beancount skill suite.

Stdlib only. The suite is linked, not copied: each owned `beancount-*`
directory in a destination is a symlink into this checkout, so Claude Code
(`~/.claude/skills`) and Codex (`~/.agents/skills`) share one copy and
`git pull --ff-only` updates both. See docs/skills/installation.md.

    beancount-skills.py install   DEST [DEST ...]
    beancount-skills.py verify    DEST [DEST ...]
    beancount-skills.py uninstall DEST [DEST ...]
    beancount-skills.py bundle    OUT
    beancount-skills.py suite     OUT

`install` changes nothing when any owned name is already taken by something
else, `verify` never writes, and `uninstall` removes only links into this
checkout. `bundle` writes one self-contained copy per skill into an empty OUT,
for legacy single-skill installs. `suite` builds one versioned plugin containing
all customer skills for suite publication and native plugin installation.
"""

from __future__ import annotations

import argparse
import filecmp
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT = Path(__file__).resolve()
SOURCE_DIR = SCRIPT.parents[2] / "skills"
# Where this checkout kept the suite before w2/m42; installs made then link here.
OLD_LAYOUT = SOURCE_DIR / ".claude" / "skills"

# Supporting documents are named `references/<name>.md` or by bare lowercase
# file name; URLs, uppercase outputs (MIGRATION.md), and example ledger or
# script paths in prose are not installation requirements.
URL = re.compile(r"https?://\S+")
REFERENCE = re.compile(r"(?<![\w./-])(?:references/)?([a-z0-9][a-z0-9-]*\.md)\b")
SIBLING = re.compile(r"(?<![\w-])beancount-[a-z]+(?:-[a-z]+)*")
WINDOWS = os.name == "nt"
# Printed remedies must run as shown: Windows PowerShell 5.1 has no `&&`, and
# `python3` there is often the Microsoft Store stub.
PYTHON = "python" if WINDOWS else "python3"
ERROR_PRIVILEGE_NOT_HELD = 1314


def quote(path: Path | str) -> str:
    """PATH as one literal shell word: PowerShell single quotes on Windows, where
    `$` and backticks expand inside double quotes. PowerShell also ends a
    single-quoted string at a typographic single quote; doubling escapes each."""
    if WINDOWS:
        return "'" + re.sub("(['\u2018\u2019\u201a\u201b])", r"\1\1", str(path)) + "'"
    return shlex.quote(str(path))


def rerun(command: str, dest: Path) -> str:
    return f"{PYTHON} {quote(SCRIPT)} {command} {quote(dest)}"


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


def link_target(path: Path) -> str:
    """Where PATH links, as users write it.

    On Windows, os.readlink reports an absolute target in its `\\\\?\\` form
    (`\\\\?\\C:\\...`, `\\\\?\\UNC\\server\\share\\...`); printed paths drop it."""
    target = os.readlink(path)
    if WINDOWS:
        if target.startswith("\\\\?\\UNC\\"):
            return "\\\\" + target[8:]
        target = target.removeprefix("\\\\?\\")
    return target


def is_linked(entry: Path) -> bool:
    return entry.is_symlink() and entry.resolve() == (SOURCE_DIR / entry.name).resolve()


def is_old_layout_link(entry: Path) -> bool:
    """A link this checkout's installer made before the suite moved to `skills/<name>`."""
    return entry.is_symlink() and entry.resolve() == (OLD_LAYOUT / entry.name).resolve()


def destination_problem(dest: Path) -> str | None:
    """Why DEST cannot be a skills directory: it, or its nearest existing parent, is not one.

    Unchecked, `mkdir` raised a traceback for a stray file or a link into a
    dotfiles repo not yet cloned, and the destinations after it never ran.
    """
    for path in (dest, *dest.parents):
        if not os.path.lexists(path):
            continue
        if path.is_dir():
            return None
        where = "" if path == dest else f"{dest}: "
        if path.is_symlink():
            state = " (target missing)" if not path.exists() else ", not a directory"
            return f"{where}{path} links to {link_target(path)}{state}"
        return f"{where}{path} is a file, not a directory"
    return None


def plugin_install_clients() -> list[str]:
    """Clients where the beancount-io plugin also provides this suite.

    Best-effort: looks for beancount-* skills in each client's plugin cache
    under the home directory. Detection only — verify stays read-only."""
    found = []
    for client, cache in (
        ("Claude Code", Path.home() / ".claude/plugins/cache/beancount-io"),
        ("Codex", Path.home() / ".codex/plugins/cache/beancount-io"),
    ):
        hits = list(cache.glob("**/beancount-*/SKILL.md")) if cache.is_dir() else []
        if {p.parent.name for p in hits} & set(expected_skills()):
            found.append(client)
    return found


def verify(dest: Path) -> int:
    """Report whether DEST holds a complete, usable suite. Read-only."""
    names = expected_skills()
    problems: list[str] = []
    if not dest.is_dir():
        problem = destination_problem(dest) or f"{dest}: directory does not exist; run install first"
        print(f"FAIL {problem}", file=sys.stderr)
        return 1

    installed = []
    for name in names:
        entry = dest / name
        skill_md = entry / "SKILL.md"
        if is_old_layout_link(entry):
            problems.append(
                f"{name}: links to the old skills/.claude/skills layout; repair with: {rerun('install', dest)}"
            )
        elif not entry.exists():
            detail = f"link to missing {link_target(entry)}" if entry.is_symlink() else "not installed"
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
    for client in plugin_install_clients():
        print(
            f"note: the beancount-io plugin also provides this suite to {client}; "
            "keep one install method per client so its skills do not appear twice"
        )
    if not shutil.which("bea"):
        print("note: `bea` is not on PATH; the skills use it for checks, queries, and writes")

    for problem in problems:
        print(f"FAIL {problem}", file=sys.stderr)
    if problems:
        print(
            f"Incomplete suite in {dest}. Repair with: {rerun('install', dest)}"
            " (after moving any conflicting copies aside)",
            file=sys.stderr,
        )
        return 1
    print(f"OK {len(names)} customer skills complete in {dest}")
    return 0


def skill_problems(dest: Path, name: str, names: list[str], installed: list[str]) -> list[str]:
    missing_files, missing_siblings = missing_references(dest, name, names, installed)
    return [
        *(f"{path} is missing ({where} needs it)" for path, where in missing_files.items()),
        *(
            f"{name} refers to {sibling} ({where}), which is not installed"
            for sibling, where in missing_siblings.items()
        ),
    ]


def missing_references(
    dest: Path, name: str, names: list[str], installed: list[str]
) -> tuple[dict[str, str], dict[str, str]]:
    """The supporting files (`owner/references/file.md`) and siblings DEST/NAME needs but lacks."""
    root = dest / name
    missing_files: dict[str, str] = {}
    missing_siblings: dict[str, str] = {}
    documents = [root / "SKILL.md", *sorted((root / "references").glob("*.md"))]
    for document in documents:
        where = document.relative_to(dest).as_posix()
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
    return missing_files, missing_siblings


def describe_conflict(entry: Path) -> str:
    if entry.is_symlink():
        state = "" if entry.exists() else " (target missing)"
        return f"{entry} links to {link_target(entry)}{state}, not this checkout"
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
        changes += [f"modified {(prefix / f).as_posix()}" for f in current.diff_files]
        changes += [f"added {(prefix / f).as_posix()}" for f in current.right_only]
        changes += [f"missing {(prefix / f).as_posix()}" for f in current.left_only]
        pending += [(sub, prefix / sub_name) for sub_name, sub in current.subdirs.items()]
    return sorted(changes)


def install(dest: Path) -> int:
    problem = destination_problem(dest)
    if problem:
        print(f"FAIL {problem}. Nothing was installed there.", file=sys.stderr)
        return 1
    entries = [dest / name for name in expected_skills()]
    conflicts = [
        describe_conflict(entry)
        for entry in entries
        if os.path.lexists(entry) and not is_linked(entry) and not is_old_layout_link(entry)
    ]
    if conflicts:
        for conflict in conflicts:
            print(f"CONFLICT {conflict}", file=sys.stderr)
        backups = Path.home() / "beancount-skill-backups"
        if WINDOWS:
            move = (
                f"  New-Item -ItemType Directory -Force {quote(backups)} | Out-Null\n"
                # -LiteralPath: a `[` in the path is not a wildcard.
                f"  Move-Item -LiteralPath {quote(dest / '<name>')} {quote(str(backups) + os.sep)}\n"
            )
        else:
            move = f"  mkdir -p {quote(backups)} && mv {quote(dest)}/<name> {quote(backups)}/\n"
        print(
            f"Nothing was changed in {dest}. To keep an existing entry, move it out of the"
            f" skills directory (a renamed copy left inside still loads as a skill):\n"
            f"{move}then run install again.",
            file=sys.stderr,
        )
        return 1

    # Directories this invocation creates, deepest first, so that a failed run
    # can remove them again. Directories that already existed are never removed.
    made: list[Path] = []
    missing = dest
    while not os.path.lexists(missing):
        made.append(missing)
        missing = missing.parent
    created: list[Path] = []
    relinked = 0
    entry = dest
    try:
        dest.mkdir(parents=True, exist_ok=True)
        for entry in entries:
            if is_linked(entry):
                print(f"kept   {entry}")
            elif is_old_layout_link(entry):
                relink(entry)
                relinked += 1
                print(f"relinked {entry} -> {SOURCE_DIR / entry.name} (moved from skills/.claude/skills)")
            else:
                link(entry)
                created.append(entry)
                print(f"linked {entry} -> {SOURCE_DIR / entry.name}")
    except OSError as error:
        report_failed_install(dest, entry, error, roll_back(created, made), relinked)
        return 1
    report_source()
    return verify(dest)


def link(entry: Path) -> None:
    os.symlink(SOURCE_DIR / entry.name, entry, target_is_directory=True)


def relink(entry: Path) -> None:
    """Point an old-layout link at the current layout, restoring it if the new link fails."""
    aside = entry.with_name(f".{entry.name}.relinking")
    os.replace(entry, aside)
    try:
        link(entry)
    except OSError:
        os.replace(aside, entry)
        raise
    aside.unlink()


def roll_back(created: list[Path], made: list[Path]) -> list[str]:
    """Undo only this invocation's changes: its links that still point into this
    checkout, then the directories it created, while they are empty."""
    undone = []
    for entry in reversed(created):
        if not is_linked(entry):
            undone.append(f"left {entry} in place: it was replaced after this run linked it")
            continue
        try:
            entry.unlink()
        except OSError as error:
            undone.append(f"could not remove {entry}, which this run linked ({error}); remove it by hand")
        else:
            undone.append(f"removed {entry}, which this run had linked")
    for path in made:
        try:
            path.rmdir()
        except OSError:
            undone.append(f"left {path} in place: this run created it, but it is not empty")
            break
        undone.append(f"removed {path}, which this run had created")
    return undone


def report_failed_install(dest: Path, entry: Path, error: OSError, undone: list[str], relinked: int) -> None:
    if getattr(error, "winerror", None) == ERROR_PRIVILEGE_NOT_HELD:
        cause = f"this account may not create symbolic links ({error.strerror})"
        remedy = (
            "  Remedy: turn on Developer Mode (Settings > System > For developers), or use an account\n"
            '  that holds the "Create symbolic links" right. Then open a new PowerShell window that is\n'
            "  not elevated (running as administrator is not the recommended fix) and run:\n  "
        )
    elif isinstance(error, PermissionError):
        cause = f"permission denied ({error.strerror})"
        remedy = (
            f"  Remedy: make {dest} writable by this account, or choose a skills directory you own\n"
            "  on a file system that supports symbolic links, then run:\n  "
        )
    else:
        cause = f"could not be created ({error})"
        remedy = "  Fix the cause, then run: "
    print(f"FAIL {entry}: {cause}.\n{remedy}{rerun('install', dest)}", file=sys.stderr)
    for line in undone:
        print(f"  {line}", file=sys.stderr)
    linked = sum(1 for name in expected_skills() if is_linked(dest / name))
    if linked:
        moved = f", {relinked} of them moved from skills/.claude/skills" if relinked else ""
        state = f"the {linked} suite links that were already there were kept{moved}"
    elif undone:
        state = "no suite link is installed there"
    else:
        state = "nothing was changed"
    print(f"Not installed in {dest}: {state}; other entries there were not touched.", file=sys.stderr)


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
        if is_linked(entry) or is_old_layout_link(entry):
            entry.unlink()
            print(f"removed {entry}")
        elif os.path.lexists(entry):
            print(f"kept    {describe_conflict(entry)}")
    return 0


def bundle(out: Path) -> int:
    """Write each skill into OUT with every sibling reference it reads, for single-folder installs.

    A registry installs one folder, so a sibling's reference the skill names
    (beancount-init's `references/bea-cli.md`) is copied into the skill's own
    `references/`, which verify accepts as the same file. Repeats until the
    copied references need nothing more. The shared skills/LICENSE travels
    in every bundle. Evals stay behind; the checkout keeps the only canonical
    copy of each reference and the license.
    """
    if os.path.lexists(out) and (not out.is_dir() or any(out.iterdir())):
        print(f"FAIL {out} must be an empty or new directory. Nothing was written.", file=sys.stderr)
        return 1
    license_path = SOURCE_DIR / "LICENSE"
    if not license_path.is_file():
        print("FAIL skills/LICENSE is missing. Nothing was written.", file=sys.stderr)
        return 1
    names = expected_skills()
    problems: list[str] = []
    for name in names:
        # Resolve alone: a sibling's bundle beside this one must not satisfy its references.
        with tempfile.TemporaryDirectory() as staging:
            target = Path(staging) / name
            shutil.copytree(
                SOURCE_DIR / name, target, ignore=shutil.ignore_patterns("evals", "__pycache__", ".DS_Store")
            )
            shutil.copy2(license_path, target / "LICENSE")
            vendored: list[str] = []
            while missing := missing_references(target.parent, name, names, [name])[0]:
                dangling = [path for path in missing if not (SOURCE_DIR / path).is_file()]
                if dangling:
                    problems += [f"{name}: {path} is missing ({missing[path]} needs it)" for path in dangling]
                    break
                (target / "references").mkdir(exist_ok=True)
                for path in missing:
                    shutil.copy2(SOURCE_DIR / path, target / "references")
                vendored += missing
            shutil.copytree(target, out / name)
        print(f"bundled {out / name}" + (f" with {', '.join(sorted(vendored))}" if vendored else ""))
    for problem in problems:
        print(f"FAIL {problem}", file=sys.stderr)
    if problems:
        print(f"Bundles in {out} are incomplete; do not publish them.", file=sys.stderr)
        return 1
    return 0


def suite(out: Path) -> int:
    """Build a content-only plugin from the canonical suite, without vendored duplicates."""
    if os.path.lexists(out) and (not out.is_dir() or out.is_symlink() or any(out.iterdir())):
        print(f"FAIL {out} must be an empty or new directory. Nothing was written.", file=sys.stderr)
        return 1
    repo = SOURCE_DIR.parent
    names = expected_skills()
    try:
        manifest = json.loads((repo / "plugin.json").read_text(encoding="utf-8"))
        entry, = json.loads((repo / ".claude-plugin/marketplace.json").read_text(encoding="utf-8"))["plugins"]
        if not names or manifest["name"] != "beancount-io" or manifest["license"] != "MIT-0":
            raise ValueError("expected the MIT-0 beancount-io customer suite")
        if not re.fullmatch(r"\d+\.\d+\.\d+", manifest["version"]):
            raise ValueError("suite version must be semver X.Y.Z")
        for field in ("name", "version", "description", "license"):
            if entry[field] != manifest[field]:
                raise ValueError(f"suite manifests disagree on {field}")
        if sorted(entry["skills"]) != [f"./{name}" for name in names]:
            raise ValueError("marketplace inventory differs from customer skills")
        with tempfile.TemporaryDirectory() as temp:
            staging = Path(temp)
            shutil.copy2(repo / "plugin.json", staging / "plugin.json")
            shutil.copy2(SOURCE_DIR / "LICENSE", staging / "LICENSE")
            # ClawHub requires this metadata even for content-only bundle plugins.
            # The Claude marker below selects OpenClaw's bundle loader, with no runtime entrypoint.
            native = {
                "id": manifest["name"], "name": "Beancount.io", "version": manifest["version"],
                "description": manifest["description"], "skills": ["./skills"],
                "configSchema": {"type": "object", "additionalProperties": False, "properties": {}},
            }
            (staging / "openclaw.plugin.json").write_text(json.dumps(native, indent=2) + "\n")
            claude = {key: value for key, value in manifest.items() if key != "$schema"}
            (staging / ".claude-plugin").mkdir()
            (staging / ".claude-plugin/plugin.json").write_text(json.dumps(claude, indent=2) + "\n")
            for name in names:
                source = SOURCE_DIR / name
                for path in sorted(source.rglob("*")):
                    relative = path.relative_to(source)
                    if any(part.startswith(".") or part in {"evals", "__pycache__"} for part in relative.parts):
                        continue
                    if path.is_symlink():
                        raise ValueError(f"{name}/{relative}: symlinks are not suite content")
                    if not path.is_file():
                        continue
                    if relative.parts[0] not in {"SKILL.md", "references", "scripts", "assets"}:
                        raise ValueError(f"{name}/{relative}: unexpected runtime file")
                    target = staging / "skills" / name / relative
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(path, target)
            problems = [problem for name in names for problem in skill_problems(staging / "skills", name, names, names)]
            if problems:
                raise ValueError("; ".join(problems))
            readme = (
                f"# Beancount.io ledger skills\n\nSuite {manifest['version']}. {manifest['description']}\n\n"
                "Install and update the suite as one plugin. Each workflow retains its own name and instructions.\n\n"
                "[Installation and host compatibility](https://github.com/bex-co/beancount-io/blob/main/docs/skills/installation.md)\n\n"
                "## Workflows\n\n" + "\n".join(f"- `{name}`" for name in names) + "\n\nLicense: MIT-0 (LICENSE).\n"
            )
            (staging / "README.md").write_text(readme, encoding="utf-8")
            shutil.copytree(staging, out, dirs_exist_ok=True)
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"FAIL {error}. Suite was not published.", file=sys.stderr)
        return 1
    print(f"suite {out}: {len(names)} customer skills, version {manifest['version']}")
    return 0


ACTIONS = {"install": install, "verify": verify, "uninstall": uninstall, "bundle": bundle, "suite": suite}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("command", choices=ACTIONS)
    parser.add_argument("dest", nargs="+", type=lambda value: Path(value).expanduser())
    args = parser.parse_args(argv)
    return max([ACTIONS[args.command](dest) for dest in args.dest])


if __name__ == "__main__":
    sys.exit(main())
