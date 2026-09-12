"""Optional engine features: Beangulp / Beanprice stay out of base and frontend.

Provisioning is stubbed (no network) the same way as TestProvision: we assert
bea's own enablement logic, not that PyPI resolves. A separate check proves the
base requirement list and frontend metadata never name the optional packages.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tomllib
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.engine import paths, provision
from cli.errors import UsageError
from cli.main import app

CLI_ROOT = Path(__file__).parent.parent
SOURCE_ROOT = CLI_ROOT / "src"


def fake_venv(root: Path) -> Path:
    (root / "bin").mkdir(parents=True, exist_ok=True)
    (root / "bin" / "python").write_text("")
    (root / "lib" / "python3.12" / "site-packages" / "bea_engine").mkdir(parents=True, exist_ok=True)
    return root


class TestOptionalManifest:
    def test_base_requirements_exclude_optional_packages(self) -> None:
        manifest = paths.manifest()
        joined = " ".join(str(item) for item in manifest["requirements"])
        assert "beangulp" not in joined
        assert "beanprice" not in joined
        optional = provision.optional_features()
        assert set(optional) == {"beangulp", "beanprice"}
        assert optional["beangulp"]["license"] == "GPL-2.0-only"
        assert optional["beanprice"]["license"] == "GPL-2.0-only"

    def test_engine_extras_are_declared_and_frontend_does_not_depend_on_them(self) -> None:
        engine = tomllib.loads((CLI_ROOT / "engine" / "pyproject.toml").read_text())
        frontend = tomllib.loads((CLI_ROOT / "pyproject.toml").read_text())
        extras = engine["project"]["optional-dependencies"]
        assert "beangulp==0.2.0" in extras["beangulp"]
        assert "beanprice==2.1.0" in extras["beanprice"]
        frontend_deps = " ".join(frontend["project"]["dependencies"])
        assert "beangulp" not in frontend_deps
        assert "beanprice" not in frontend_deps
        for extra_deps in (frontend.get("project", {}).get("optional-dependencies") or {}).values():
            joined = " ".join(extra_deps)
            assert "beangulp" not in joined
            assert "beanprice" not in joined

    def test_release_packaging_ships_optional_locks(self) -> None:
        frontend = tomllib.loads((CLI_ROOT / "pyproject.toml").read_text())
        sdist = frontend["tool"]["hatch"]["build"]["targets"]["sdist"]["only-include"]
        force = frontend["tool"]["hatch"]["build"]["targets"]["wheel"]["force-include"]
        assert "engine-optional-beangulp.lock" in sdist
        assert "engine-optional-beanprice.lock" in sdist
        assert force["engine-optional-beangulp.lock"] == "cli/engine-optional-beangulp.lock"
        assert force["engine-optional-beanprice.lock"] == "cli/engine-optional-beanprice.lock"


class TestEnableFeature:
    def test_enable_installs_into_the_managed_engine_and_records_the_feature(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        root = fake_venv(tmp_path / "engine")
        monkeypatch.setenv(paths.DIR_ENV, str(root))
        monkeypatch.delenv(paths.PYTHON_ENV, raising=False)
        steps: list[list[str]] = []

        def fake_run(command: list[str], *, failure: str) -> None:
            steps.append(command)

        monkeypatch.setattr(provision, "_find_uv", lambda: "uv")
        monkeypatch.setattr(provision, "_run", fake_run)
        monkeypatch.setattr(provision, "_feature_present", lambda _root, _name: True)

        enabled = provision.enable_feature("beangulp")

        assert enabled == {"beangulp"}
        assert (root / provision.FEATURES_FILE).is_file()
        assert json.loads((root / provision.FEATURES_FILE).read_text())["enabled"] == ["beangulp"]
        assert steps and steps[0][1:3] == ["pip", "install"]
        assert str(root / "bin" / "python") in steps[0]
        assert any("beangulp==" in part for part in steps[0]) or any(
            part.endswith("engine-optional-beangulp.lock") for part in steps[0]
        )

    def test_enable_is_idempotent_when_already_present(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        root = fake_venv(tmp_path / "engine")
        monkeypatch.setenv(paths.DIR_ENV, str(root))
        monkeypatch.delenv(paths.PYTHON_ENV, raising=False)
        steps: list[list[str]] = []

        def fake_run(command: list[str], *, failure: str) -> None:
            steps.append(command)

        monkeypatch.setattr(provision, "_find_uv", lambda: "uv")
        monkeypatch.setattr(provision, "_run", fake_run)
        monkeypatch.setattr(provision, "_feature_present", lambda _root, _name: True)

        first = provision.enable_feature("beanprice")
        steps.clear()
        second = provision.enable_feature("beanprice")

        assert first == second == {"beanprice"}
        assert steps == []  # no second install when already present

        monkeypatch.setenv(paths.PYTHON_ENV, sys.executable)
        monkeypatch.setenv(paths.DIR_ENV, str(tmp_path / "engine"))

        with pytest.raises(UsageError, match=paths.PYTHON_ENV):
            provision.enable_feature("beanprice")

    def test_enable_rejects_unknown_features(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        monkeypatch.setenv(paths.DIR_ENV, str(fake_venv(tmp_path / "engine")))
        monkeypatch.delenv(paths.PYTHON_ENV, raising=False)

        with pytest.raises(UsageError, match="Unknown engine feature"):
            provision.enable_feature("not-a-feature")

    def test_repair_reapplies_enabled_features(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        root = fake_venv(tmp_path / "engine")
        (root / provision.FEATURES_FILE).write_text(json.dumps({"enabled": ["beanprice"]}))
        monkeypatch.setenv(paths.DIR_ENV, str(root))
        monkeypatch.delenv(paths.PYTHON_ENV, raising=False)
        reapplied: list[str] = []

        def fake_provision(target: Path) -> None:
            fake_venv(target)

        def fake_install(target: Path, name: str) -> None:
            reapplied.append(name)

        monkeypatch.setattr(provision, "provision", fake_provision)
        monkeypatch.setattr(provision, "_install_feature", fake_install)
        monkeypatch.setattr(provision, "_feature_present", lambda _root, _name: True)

        provision.repair_engine()

        assert reapplied == ["beanprice"]
        assert provision.enabled_features(root) == {"beanprice"}

    def test_base_provision_requirements_never_include_optional_packages(self) -> None:
        requirements = provision._requirements()
        joined = " ".join(requirements)
        assert "beangulp" not in joined
        assert "beanprice" not in joined


class TestEngineCommand:
    def test_status_and_enable_via_cli(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        root = fake_venv(tmp_path / "engine")
        monkeypatch.setenv(paths.DIR_ENV, str(root))
        monkeypatch.delenv(paths.PYTHON_ENV, raising=False)
        monkeypatch.setattr(provision, "_find_uv", lambda: "uv")
        monkeypatch.setattr(provision, "_run", lambda *_args, **_kwargs: None)
        monkeypatch.setattr(provision, "_feature_present", lambda _root, _name: True)

        runner = CliRunner()
        status = runner.invoke(app, ["--json", "engine", "status"])
        assert status.exit_code == 0, status.output
        payload = json.loads(status.output)["data"]
        assert payload["provisioned"] is True
        assert payload["features"]["beangulp"]["enabled"] is False

        enable = runner.invoke(app, ["--json", "engine", "enable", "beangulp"])
        assert enable.exit_code == 0, enable.output
        enabled = json.loads(enable.output)["data"]
        assert enabled["feature"] == "beangulp"
        assert "beangulp" in enabled["enabled"]


class TestFrontendNeverImportsOptional:
    def test_engine_status_does_not_load_optional_packages_in_the_frontend(self) -> None:
        script = (
            "import json, sys\n"
            "from typer.testing import CliRunner\n"
            "from cli.main import app\n"
            "result = CliRunner().invoke(app, ['--json', 'engine', 'status'])\n"
            "forbidden = [m for m in ('beancount', 'beanquery', 'fava', 'bea_engine', 'beangulp', 'beanprice') "
            "if m in sys.modules]\n"
            "print(json.dumps({'exit_code': result.exit_code, 'loaded': forbidden, 'output': result.output}))\n"
        )
        completed = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            check=True,
            cwd=CLI_ROOT,
            env={**os.environ, "PYTHONPATH": str(SOURCE_ROOT)},
        )
        answered = json.loads(completed.stdout)
        assert answered["exit_code"] == 0, answered["output"]
        assert answered["loaded"] == [], answered
