"""Install a wheel/sdist outside the checkout and exercise customer workflows."""

from __future__ import annotations

import argparse
import os
import subprocess
import tempfile
from pathlib import Path
from runpy import run_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifact", type=Path)
    parser.add_argument("--python", default="3.12")
    parser.add_argument("--installer", choices=("uv", "pip"), default="uv")
    parser.add_argument("--ask", action="store_true")
    args = parser.parse_args()
    artifact = args.artifact.resolve(strict=True)
    scripts = Path(__file__).resolve().parent
    scratch = scripts.parent / "tmp"
    scratch.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="install-", dir=scratch) as work:
        root = Path(work).resolve()
        env = {
            **os.environ,
            "UV_TOOL_DIR": str(root / "tools"),
            "UV_TOOL_BIN_DIR": str(root / "bin"),
        }
        env.pop("PYTHONPATH", None)
        spec = str(artifact) + ("[ask]" if args.ask else "")
        if args.installer == "uv":
            subprocess.run(["uv", "tool", "install", "--python", args.python, spec], env=env, cwd=root, check=True)
            binary = root / "bin" / ("bea.exe" if os.name == "nt" else "bea")
            bindir = root / "tools" / "beancount-io" / ("Scripts" if os.name == "nt" else "bin")
            python = bindir / ("python.exe" if os.name == "nt" else "python")
        else:
            venv = root / "venv"
            subprocess.run(["uv", "venv", "--seed", "--python", args.python, str(venv)], cwd=root, check=True)
            bindir = venv / ("Scripts" if os.name == "nt" else "bin")
            python = bindir / ("python.exe" if os.name == "nt" else "python")
            subprocess.run([str(python), "-m", "pip", "install", spec], env=env, cwd=root, check=True)
            binary = bindir / ("bea.exe" if os.name == "nt" else "bea")
        ledger = root / "books"
        ledger.mkdir()
        run_path(str(scripts / "smoke-installed.py"))["smoke"](binary, ledger, frontend_python=python, installed=True)
        if args.ask:
            # Load the extra without making a hosted model request.
            subprocess.run(
                [str(python), "-c", "import cli.ask.agent; import openai; import pydantic_ai"],
                cwd=root,
                env=env,
                check=True,
            )


if __name__ == "__main__":
    main()
