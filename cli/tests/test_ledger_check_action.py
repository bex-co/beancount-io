"""Contracts for the ledger-check action, hooks, and example (w22/m5/t007).

The action installs the pinned release and runs both checks with the
matchers registered; the hooks expose the same commands to pre-commit;
the example pins the shipped action and the current release. These
assert the load-bearing facts so an edit that breaks the sharing
contract fails here instead of in a ledger repository.
"""

from __future__ import annotations

import json
import re
import stat
import subprocess
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
CLI_ROOT = Path(__file__).resolve().parents[1]


def _action() -> dict:
    return yaml.safe_load((CLI_ROOT / "action" / "action.yml").read_text())


def _hooks() -> list:
    return yaml.safe_load((ROOT / ".pre-commit-hooks.yaml").read_text())


def _example() -> dict:
    return yaml.safe_load((CLI_ROOT / "docs" / "examples" / "ledger-check.yml").read_text())


def _released_version() -> str:
    (line,) = [line for line in (CLI_ROOT / "pyproject.toml").read_text().splitlines() if line.startswith("version = ")]
    return line.split('"')[1]


def test_action_installs_check_matchers_and_unmatchers() -> None:
    action = _action()
    assert action["runs"]["using"] == "composite"
    assert action["inputs"]["version"]["default"] == _released_version()
    assert action["inputs"]["file"]["default"] == "main.bean"
    steps = action["runs"]["steps"]
    assert any("setup-uv" in step.get("uses", "") for step in steps)
    install = next(step["run"] for step in steps if step.get("name") == "Install bea")
    assert "beancount-io==${{ inputs.version }}" in install
    assert "GITHUB_PATH" in install
    by_name = {step.get("name"): step.get("run", "") for step in steps}
    assert "problem-matcher.json" in by_name["Register bea problem matchers"]
    assert '--file "${{ inputs.file }}" check' in by_name["Validate ledger"]
    assert 'format "${{ inputs.file }}" --check' in by_name["Check formatting"]
    assert "bea-check" in by_name["Remove bea problem matchers"]
    assert "bea-format" in by_name["Remove bea problem matchers"]


def test_hooks_expose_check_and_format() -> None:
    hooks = {hook["id"]: hook for hook in _hooks()}
    check, fmt = hooks["bea-check"], hooks["bea-format"]
    assert check["language"] == "script"
    assert check["entry"] == "cli/action/bea-check.sh"
    assert check["pass_filenames"] is False
    assert check["args"] == ["main.bean"]
    assert fmt["language"] == "system"
    assert fmt["entry"] == "bea --no-input format --check"
    assert fmt["pass_filenames"] is True
    for hook in (check, fmt):
        filt = re.compile(hook["files"])
        assert filt.search("main.bean")
        assert filt.search("accounts/main.beancount")
        assert not filt.search("main.py")
        assert not filt.search("README.md")


def test_check_wrapper_reorders_and_defaults(tmp_path: Path) -> None:
    script = CLI_ROOT / "action" / "bea-check.sh"
    assert script.stat().st_mode & stat.S_IXUSR, "pre-commit executes the entry directly"
    probe = tmp_path / "bea"
    probe.write_text('#!/bin/sh\nprintf "%s\\n" "$@"\n')
    probe.chmod(0o755)
    import os

    env = {**os.environ, "PATH": f"{tmp_path}{os.pathsep}{os.environ['PATH']}"}

    def run(*args: str) -> list[str]:
        proc = subprocess.run([str(script), *args], env=env, capture_output=True, text=True, check=False)
        assert proc.returncode == 0, proc.stderr
        return proc.stdout.splitlines()

    assert run() == ["--no-input", "--file", "main.bean", "check"]
    assert run("accounts/main.beancount") == ["--no-input", "--file", "accounts/main.beancount", "check"]
    assert run("main.bean", "--allow-errors") == ["--no-input", "--file", "main.bean", "check", "--allow-errors"]


def test_example_pins_the_shipped_action_and_release() -> None:
    example = _example()
    (uses, config) = [
        (step["uses"], step.get("with", {}))
        for step in example["jobs"]["ledger"]["steps"]
        if "uses" in step and "beancount-io/cli/action" in step["uses"]
    ][0]
    assert re.fullmatch(r"bex-co/beancount-io/cli/action@[0-9a-f]{40}", uses), uses
    assert config["version"] == _released_version()
    assert config["file"] == "main.bean"


def test_matcher_json_lists_both_owners() -> None:
    matcher = json.loads((CLI_ROOT / "action" / "problem-matcher.json").read_text())
    assert [m["owner"] for m in matcher["problemMatcher"]] == ["bea-check", "bea-format"]
