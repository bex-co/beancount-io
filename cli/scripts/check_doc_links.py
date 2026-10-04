#!/usr/bin/env python3
"""Fail when a relative Markdown link in the user-facing CLI docs is broken.

Scans `README.md` and `docs/*.md` (run from `cli/`, via `make docs-check`).
`docs/PRFAQ.md` is a dated design record that cites files as they were at the
time, so it is excluded. External (`scheme:`) links and in-page anchors are
skipped; a `#fragment` after a path is ignored and only the path is checked.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

CLI_ROOT = Path(__file__).resolve().parent.parent
EXCLUDED = {"PRFAQ.md"}
_LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
_FENCE = re.compile(r"^\s*(```|~~~)")


def broken_links(doc: Path) -> list[tuple[int, str]]:
    """Return `(line, target)` for every relative link in `doc` that resolves to nothing."""
    broken: list[tuple[int, str]] = []
    in_fence = False
    for lineno, line in enumerate(doc.read_text(encoding="utf-8").splitlines(), 1):
        if _FENCE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        for target in _LINK.findall(line):
            if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", target) or target.startswith("#"):
                continue
            path = target.split("#", 1)[0]
            if path and not (doc.parent / path).exists():
                broken.append((lineno, target))
    return broken


def main() -> int:
    docs = [CLI_ROOT / "README.md", *sorted((CLI_ROOT / "docs").glob("*.md"))]
    failures = [
        f"{doc.relative_to(CLI_ROOT)}:{lineno}: broken link {target}"
        for doc in docs
        if doc.name not in EXCLUDED
        for lineno, target in broken_links(doc)
    ]
    for failure in failures:
        print(failure, file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
