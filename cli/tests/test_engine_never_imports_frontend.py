"""The engine helper must not import the frontend.

``bea-engine`` runs as a child process in the managed upstream environment. Its
``PYTHONPATH`` holds ``bea_engine`` and the vendored ``fava`` sources, never the
frontend's ``cli`` package, so an import of ``cli`` works in a development
checkout (both are installed) and fails for every customer with
``ModuleNotFoundError: No module named 'cli'``. That is how ``bea query`` broke
on every installed artifact in CI while the unit suite stayed green.

A code the engine needs on both sides is carried as a twin (see
``bea_engine/include_glob.py``) with a test that the copies agree.
"""

from __future__ import annotations

import ast
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src"
ENGINE_SIDE = ("bea_engine", "fava")


def _frontend_imports(path: Path) -> list[str]:
    found: list[str] = []
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"), filename=str(path))):
        names: list[str] = []
        if isinstance(node, ast.Import):
            names = [alias.name for alias in node.names]
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            names = [node.module]
        found += [f"line {node.lineno}: {name}" for name in names if name == "cli" or name.startswith("cli.")]
    return found


def test_no_engine_side_module_imports_the_frontend() -> None:
    offenders = {
        str(path.relative_to(SRC)): hits
        for package in ENGINE_SIDE
        for path in sorted((SRC / package).rglob("*.py"))
        if (hits := _frontend_imports(path))
    }
    assert offenders == {}, "engine-side code imports the frontend `cli` package"


def test_the_scan_sees_a_frontend_import(tmp_path: Path) -> None:
    """A scanner that matched nothing would pass the test above for the wrong reason."""
    module = tmp_path / "bad.py"
    module.write_text("def f():\n    from cli.output import pad\n    import cli\n    from clip import x\n")
    assert _frontend_imports(module) == ["line 2: cli.output", "line 3: cli"]
