"""Install a wheel/sdist outside the checkout and exercise customer workflows."""

from __future__ import annotations

import argparse
import os
import subprocess
import tempfile
from pathlib import Path
from runpy import run_path


def _prepare_engine_find_links(scripts: Path, scratch: Path) -> Path:
    """Build the sibling engine wheel so first-use provisioning can resolve it.

    Released installs fetch `beancount-io-engine` from the index (published next
    to `beancount-io`). Local/CI rehearsals have the engine project in-tree but
    not on PyPI, so point uv at a disposable find-links directory instead.
    """
    index = scratch / "engine-index"
    index.mkdir(parents=True, exist_ok=True)
    engine = scripts.parent / "engine"
    subprocess.run(
        ["uv", "build", "--wheel", "--out-dir", str(index)],
        cwd=engine,
        check=True,
    )
    return index


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
        engine_index = _prepare_engine_find_links(scripts, root)
        env = {
            **os.environ,
            "UV_TOOL_DIR": str(root / "tools"),
            "UV_TOOL_BIN_DIR": str(root / "bin"),
            # First-use provisioning runs `uv pip install beancount-io-engine==…`.
            "UV_FIND_LINKS": str(engine_index),
        }
        # smoke-installed.py inherits os.environ; keep find-links visible there too.
        os.environ["UV_FIND_LINKS"] = str(engine_index)
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
        run_path(str(scripts / "smoke-installed.py"))["smoke"](binary, ledger)
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
