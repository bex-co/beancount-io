"""The release plumbing: the shell steps CI trusts, and the packaging they rely on.

`scripts/render-formula.test.sh` is the real suite for the two shell scripts —
it runs standalone during a release rehearsal. Running it from here is what puts
it in `make check-all`, so a broken tag gate or formula cannot reach a tag.
"""

from __future__ import annotations

import subprocess
import sys
import tomllib
from pathlib import Path

CLI_ROOT = Path(__file__).resolve().parent.parent


def test_the_release_script_suite_passes() -> None:
    result = subprocess.run(
        ["bash", str(CLI_ROOT / "scripts" / "render-formula.test.sh")],
        capture_output=True,
        text=True,
        cwd=CLI_ROOT,
    )

    assert result.returncode == 0, f"{result.stdout}\n{result.stderr}"


def test_the_sdist_carries_the_hashed_lock() -> None:
    """The Homebrew formula installs from `requirements.lock` inside the sdist.

    Dropping it from the build config would publish a perfectly valid package
    that every `brew install` then fails on, so the contract is asserted here
    rather than discovered on a release day.
    """
    pyproject = tomllib.loads((CLI_ROOT / "pyproject.toml").read_text())
    sdist = pyproject["tool"]["hatch"]["build"]["targets"]["sdist"]
    only = sdist["only-include"]
    force = sdist["force-include"]

    assert "requirements.lock" in only
    assert "engine-requirements.lock" in only
    assert "engine-optional-beangulp.lock" in only
    assert "engine-optional-beanprice.lock" in only
    assert "engine/pyproject.toml" in only
    assert "src" in only
    assert force["src/bea_engine"] == "engine/src/bea_engine"
    assert force["src/fava"] == "engine/src/fava"
    assert "NOTICE.fava" in only
    assert "engine/NOTICE.fava" in only
    assert sdist["ignore-vcs"] is True, "requirements.lock is gitignored, so VCS ignores must not filter the sdist"


def test_the_release_tag_the_current_version_needs_is_valid() -> None:
    """`make release-check` — the version in pyproject.toml must be taggable as it stands."""
    result = subprocess.run(
        ["bash", str(CLI_ROOT / "scripts" / "release-check.sh")],
        capture_output=True,
        text=True,
        cwd=CLI_ROOT,
    )

    assert result.returncode == 0, result.stderr
    pyproject = tomllib.loads((CLI_ROOT / "pyproject.toml").read_text())
    assert result.stdout.strip() == pyproject["project"]["version"]


def test_the_default_install_still_imports_no_http_client() -> None:
    """The update check must not drag urllib — or anything heavier — into startup.

    `bea --help` and `bea --version` are the two commands people run when
    something else is already wrong; they stay cheap.
    """
    probe = "import sys, cli.main; print('urllib.request' in sys.modules)"
    result = subprocess.run([sys.executable, "-c", probe], capture_output=True, text=True, check=True)

    assert result.stdout.strip() == "False"


def test_customer_smoke_runs_against_the_installed_cli() -> None:
    binary = Path(sys.executable).parent / "bea"
    result = subprocess.run(
        [sys.executable, str(CLI_ROOT / "scripts/smoke-installed.py"), str(binary)],
        capture_output=True,
        text=True,
        cwd=CLI_ROOT,
        timeout=120,
    )
    assert result.returncode == 0, f"{result.stdout}\n{result.stderr}"
