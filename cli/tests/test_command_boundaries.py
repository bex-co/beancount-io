"""The local/cloud boundary: hosted plumbing is only reachable from `bea cloud`.

`--help` promises that everything outside the cloud panel works on local .bean
files. That promise is only as good as the import graph, so this walks the
command modules' ASTs — a lazy in-function import crosses the boundary just as
much as a top-level one. The rule is capability-level, not package-level:
loading an existing credential is the sanctioned shape for a local verb that
authenticates an outbound call (`bea ask` today), while the API gateway
client, the interactive login ceremony, and server settings belong to `cloud`
alone. Startup *cost* (nothing heavy at module import time) is covered
separately by the contract suite's subprocess probe.
"""

from __future__ import annotations

import ast
import functools
from pathlib import Path

COMMANDS_DIR = Path(__file__).parent.parent / "src" / "cli" / "commands"

# Import prefixes only `bea cloud` command modules may touch.
# `cli.auth.credentials` is deliberately absent: any command may read a stored
# credential to authenticate a call, but only cloud commands may create one
# (device_flow) or speak to the API gateway (cli.api). `cli.settings` is the
# direct server-settings door; the lazy accessor `cli.config.settings()` cannot
# be guarded at import level and is policed by review instead.
CLOUD_ONLY = ("cli.api", "cli.auth.device_flow", "cli.settings")


def local_command_modules() -> list[Path]:
    modules = [p for p in COMMANDS_DIR.rglob("*.py") if "cloud" not in p.relative_to(COMMANDS_DIR).parts]
    assert modules, f"no local command modules found under {COMMANDS_DIR}"
    return modules


def imported_names(source: str) -> set[str]:
    names: set[str] = set()
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Import):
            names.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            names.update(f"{node.module}.{alias.name}" for alias in node.names)
    return names


@functools.cache
def module_imports(module: Path) -> frozenset[str]:
    return frozenset(imported_names(module.read_text()))


def test_local_command_modules_never_import_cloud_only_plumbing() -> None:
    violations = [
        f"{module.relative_to(COMMANDS_DIR)} imports {name}"
        for module in local_command_modules()
        for name in module_imports(module)
        if name.startswith(CLOUD_ONLY)
    ]
    assert not violations, "local command modules crossed the cloud boundary:\n" + "\n".join(sorted(violations))


def test_the_rule_separates_credential_loading_from_the_login_ceremony() -> None:
    """The distinction the whole boundary rests on, pinned explicitly."""
    assert not "cli.auth.credentials.require_credentials".startswith(CLOUD_ONLY)
    assert "cli.auth.device_flow.run_device_flow".startswith(CLOUD_ONLY)
    assert "cli.api.client.make_client".startswith(CLOUD_ONLY)


def test_the_checker_sees_lazy_function_level_imports() -> None:
    names = imported_names("def f():\n    from cli.api.client import make_client\n")
    assert "cli.api.client.make_client" in names
