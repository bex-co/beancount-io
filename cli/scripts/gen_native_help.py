#!/usr/bin/env python3
"""Capture pinned upstream help for offline frontend help/reference generation.

Run with a managed engine Python after enabling beangulp and beanprice:
  python scripts/gen_native_help.py --python /path/to/engine/bin/python
No customer importer executes while generating Beangulp's standard help.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def generate(python: Path) -> dict[str, object]:
    def run(args: list[str]) -> str:
        return subprocess.run(
            args, check=True, capture_output=True, text=True, env={**os.environ, "COLUMNS": "80", "NO_COLOR": "1"}
        ).stdout.rstrip()

    versions = json.loads(
        run(
            [
                str(python),
                "-c",
                "import json,importlib.metadata as m; print(json.dumps({n:m.version(n) for n in "
                "('beancount','beanquery','beangulp','beanprice')}))",
            ]
        )
    )
    commands = {}
    for command, executable in {
        "check": "bean-check",
        "example": "bean-example",
        "treeify": "treeify",
        "price": "bean-price",
    }.items():
        commands[command] = run([str(python.parent / executable), "--help"])
    operations = json.loads(
        run(
            [
                str(python),
                "-c",
                "import json; from beancount.scripts.doctor import doctor; print(json.dumps(sorted(doctor.commands)))",
            ]
        )
    )
    for op in operations:
        commands[f"doctor {op}"] = run([str(python.parent / "bean-doctor"), op, "--help"])
    commands["doctor dump-lexer"] = commands["doctor lex"]
    for op in ("identify", "extract", "archive"):
        commands[f"ingest {op}"] = run(
            [str(python), "-c", "from beangulp import Ingest; Ingest([])()", op, "--help"]
        ).replace("Usage: -c", "Usage: ingest.py")
    return {"versions": versions, "commands": commands}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--python", type=Path, required=True)
    args = parser.parse_args()
    destination = ROOT / "src/cli/engine/native-help.json"
    destination.write_text(json.dumps(generate(args.python.absolute()), indent=2, sort_keys=True) + "\n")
