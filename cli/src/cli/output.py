from __future__ import annotations

import sys


def success(message: str | None = None) -> None:
    if message:
        print(message)


def error(message: str, code: int = 1) -> None:
    print(f"Error: {message}", file=sys.stderr)
    raise SystemExit(code)
