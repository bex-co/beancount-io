#!/usr/bin/env python3
"""Scan what git would publish for secrets, the way CI does.

`gitleaks dir .` walks the whole directory, so on a developer machine it also
reads files git ignores: a real `.env`, QA credentials under `.tmp/`, Pods and
bytecode caches. That reported a dozen "leaks" on every run that CI never sees,
because CI scans a clean checkout, and a gate that always fails teaches people
to ignore it. This stages the files git tracks, plus new files it does not
ignore, into a scratch directory and runs gitleaks there with the repository's
`.gitleaks.toml`. Nothing is allowlisted: a secret in a tracked or about-to-be
committed file still fails, and a gitignored file is simply not part of the
commit.

    python3 scripts/scan-secrets.py [extra gitleaks flags]

Exits with gitleaks' own status; 127 when gitleaks is not installed.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def repo_root() -> Path:
    out = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], check=True, capture_output=True, text=True
    ).stdout.strip()
    return Path(out)


def publishable_files(root: Path) -> list[str]:
    """Tracked files plus untracked ones git does not ignore, that still exist."""
    listing = subprocess.run(
        ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        cwd=root,
        check=True,
        capture_output=True,
    ).stdout
    names = [name for name in listing.decode("utf-8", "surrogateescape").split("\0") if name]
    # A file deleted in the working tree is still listed until the deletion is staged.
    return sorted({name for name in names if os.path.lexists(root / name)})


def stage(root: Path, names: list[str], scratch: Path) -> None:
    for name in names:
        source, target = root / name, scratch / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.is_symlink():
            target.symlink_to(os.readlink(source))
        elif source.is_dir():
            # A submodule or nested checkout: its files are listed on their own, or not ours.
            target.mkdir(exist_ok=True)
        else:
            try:
                os.link(source, target)
            except OSError:
                shutil.copy2(source, target)


def main(argv: list[str]) -> int:
    if shutil.which("gitleaks") is None:
        print("gitleaks is not installed: https://github.com/gitleaks/gitleaks#installing", file=sys.stderr)
        return 127
    root = repo_root()
    names = publishable_files(root)
    with tempfile.TemporaryDirectory(prefix="scan-secrets-") as work:
        scratch = Path(work)
        stage(root, names, scratch)
        print(f"Scanning {len(names)} tracked or unignored files (gitignored files are skipped).", file=sys.stderr)
        command = ["gitleaks", "dir", str(scratch), "--redact", "--verbose", "--exit-code", "1", *argv]
        return subprocess.run(command, check=False).returncode


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
