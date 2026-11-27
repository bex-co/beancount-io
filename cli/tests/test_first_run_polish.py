"""First-run and packaging polish (w5/788).

A failed first-use install ended with uv's output and no remedy; it now
ends with the retry advice `bea upgrade` already gives. A successful
provision prunes superseded engine versions instead of leaving tens of
megabytes behind forever. And the PyPI page embeds README, where relative
links 404 — so README carries none.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = "2026-01-01 open Assets:Cash USD\n"
INSTALLED_CONTEXT = (
    "from pathlib import Path\nfrom cli.engine import paths\n"
    "paths.checkout_source_root = lambda: None\n"
    f"paths.helper_source_root = lambda: Path({str(ROOT / 'src')!r})\n"
)


def test_failed_install_ends_with_the_retry_advice(tmp_path: Path) -> None:
    # Literal, not the shared constant: the wording itself is the contract.
    retry = (
        "Retry with a local command such as 'bea check' once the network and uv are available; "
        "if an agent's sandbox blocks the network, run it once in your own terminal. "
        "Later commands reuse the installed engine offline."
    )

    (tmp_path / "main.bean").write_text(LEDGER)
    shim = tmp_path / "uv"
    shim.write_text(
        f"#!{sys.executable}\nimport sys\nprint('connection refused', file=sys.stderr)\nraise SystemExit(2)\n"
    )
    shim.chmod(0o755)
    bootstrap = tmp_path / "bootstrap"
    bootstrap.mkdir()
    (bootstrap / "sitecustomize.py").write_text(INSTALLED_CONTEXT)
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_ENGINE_DIR=str(tmp_path / "managed" / "engine"),
        BEA_UV=str(shim),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=os.pathsep.join([str(bootstrap), str(ROOT / "src")]),
        TERM="dumb",
        NO_COLOR="1",
    )
    result = subprocess.run(
        [sys.executable, "-m", "cli.main", "-f", "main.bean", "check"],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )

    assert result.returncode == 1, result.stdout + result.stderr
    assert "Could not create the engine environment" in result.stderr
    assert retry in result.stderr


def test_provision_prunes_marked_versions_only(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from cli.engine import paths, provision

    root = tmp_path / "managed" / "engine"
    monkeypatch.setenv(paths.DIR_ENV, str(root))
    monkeypatch.delenv(paths.PYTHON_ENV, raising=False)
    old = tmp_path / "managed" / "0.2.0"
    (old / "bin").mkdir(parents=True)
    (old / provision.ENGINE_MARKER).write_text("bea engine 0.2.0\n")
    (old / "payload.txt").write_text("tens of megabytes in real life")
    userdata = tmp_path / "managed" / "user-data"
    userdata.mkdir(parents=True)
    (userdata / "keep.txt").write_text("not bea's")
    old_lock = tmp_path / "managed" / "0.2.0.lock"
    old_lock.write_text("")

    def fake_run(command: list[str], *, failure: str) -> None:
        if command[1] != "venv":
            return
        target = Path(command[-1])
        (target / "bin").mkdir(parents=True)
        (target / "bin" / "python").write_text("")
        for package in ("beancount", "beanquery"):
            (target / "lib" / "python3.12" / "site-packages" / package).mkdir(parents=True)

    monkeypatch.setattr(provision, "_find_uv", lambda: "uv")
    monkeypatch.setattr(provision, "_run", fake_run)

    provision.provision(root)

    assert not old.exists()
    assert (userdata / "keep.txt").is_file()
    assert old_lock.is_file()
    assert paths.is_provisioned(root)


def test_readme_carries_no_relative_links() -> None:
    """README is the PyPI long description, where a relative link 404s."""
    text = (ROOT / "README.md").read_text()
    relative = [
        target for target in re.findall(r"\]\(([^)]+)\)", text) if not target.startswith(("http://", "https://", "#"))
    ]
    assert relative == []
