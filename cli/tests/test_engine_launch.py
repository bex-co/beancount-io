"""The frontend's side of the boundary: resolving an engine, calling it, and staying out of Beancount.

The promise being tested is ADR014's: `bea` never loads Beancount, Beanquery or
Fava. `TestFrontendIsolation` is the one that proves it, in a subprocess,
because a module the rest of the suite already imported would be in
`sys.modules` no matter what this code does.

Provisioning is tested without a network. A real provision downloads Beancount,
so `uv` is stubbed and what gets checked is this module's own logic: that an
environment is published only once it is complete, that a half-built one is
never trusted, and that a finished one is reused.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tomllib
from pathlib import Path

import pytest

from cli.engine import launch, paths, provision
from cli.errors import BeaError, LedgerError, UsageError

CLI_ROOT = Path(__file__).parent.parent
SOURCE_ROOT = CLI_ROOT / "src"
FIXTURES = Path(__file__).parent / "fixtures"

VALID = (FIXTURES / "valid.bean").read_text()
INVALID = (FIXTURES / "invalid.bean").read_text()


@pytest.fixture(autouse=True)
def engine_on_the_path(monkeypatch: pytest.MonkeyPatch) -> None:
    """Let a child process find `bea_engine` however this checkout was installed."""
    monkeypatch.setenv("PYTHONPATH", str(SOURCE_ROOT))


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(VALID)
    return path


@pytest.fixture
def broken_ledger(tmp_path: Path) -> Path:
    path = tmp_path / "broken.bean"
    path.write_text(INVALID)
    return path


def fake_venv(root: Path) -> Path:
    """The parts of a provisioned environment that `paths.is_provisioned` looks for."""
    (root / "bin").mkdir(parents=True, exist_ok=True)
    (root / "bin" / "python").write_text("")
    (root / "lib" / "python3.12" / "site-packages" / "bea_engine").mkdir(parents=True, exist_ok=True)
    return root


class TestHelperJson:
    def test_a_valid_ledger_comes_back_as_data(self, ledger: Path) -> None:
        assert launch.helper_json(["check", "--file", str(ledger)]) == {"valid": True, "errors": []}

    def test_a_ledger_failure_arrives_as_the_frontends_own_error(self, broken_ledger: Path) -> None:
        """A category crosses the boundary without being translated into a second vocabulary."""
        with pytest.raises(LedgerError) as raised:
            launch.helper_json(["check", "--file", str(broken_ledger)])

        assert raised.value.exit_code == 1
        assert any("does not balance" in detail for detail in raised.value.details)
        assert str(broken_ledger) in str(raised.value)

    def test_a_usage_failure_keeps_its_usage_category(self, tmp_path: Path) -> None:
        with pytest.raises(UsageError) as raised:
            launch.helper_json(["check", "--file", str(tmp_path / "absent.bean")])

        assert raised.value.exit_code == 2

    def test_the_version_command_answers_the_provisioned_version(self) -> None:
        assert launch.helper_json(["version"]) == {"version": paths.engine_version()}

    def test_an_engine_that_answers_nothing_is_reported_with_its_own_output(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """A missing envelope must not surface as a JSONDecodeError from inside the launcher."""
        monkeypatch.setattr(launch, "helper_command", lambda: ([sys.executable, "-c", "import sys; sys.exit(9)"], None))

        with pytest.raises(BeaError) as raised:
            launch.helper_json(["check", "--file", "main.bean"])

        assert "did not answer" in str(raised.value)
        assert "exit 9" in str(raised.value)


class TestRunEngineArgv:
    def test_it_returns_the_engines_exit_code(self, ledger: Path, broken_ledger: Path) -> None:
        assert launch.run_engine_argv(["check", "--file", str(ledger)]) == 0
        assert launch.run_engine_argv(["check", "--file", str(broken_ledger)]) == 1

    def test_a_child_killed_by_a_signal_reports_the_shells_code(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """`bea` is what the shell sees, and a shell reports 128+N rather than -N."""
        monkeypatch.setattr(
            launch,
            "helper_command",
            lambda: ([sys.executable, "-c", "import os, signal; os.kill(os.getpid(), signal.SIGTERM)"], None),
        )

        assert launch.run_engine_argv([]) == 128 + 15


class TestResolution:
    def test_an_explicit_interpreter_wins(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        monkeypatch.setenv(paths.PYTHON_ENV, sys.executable)
        monkeypatch.setenv(paths.DIR_ENV, str(fake_venv(tmp_path / "engine")))

        command, _env = launch.helper_command()

        assert command == [sys.executable, "-m", "bea_engine"]

    def test_a_provisioned_engine_beats_the_checkout(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        root = fake_venv(tmp_path / "engine")
        monkeypatch.setenv(paths.DIR_ENV, str(root))

        command, env = launch.helper_command()

        assert command == [str(root / "bin" / "python"), "-m", "bea_engine"]
        # Live checkout source still wins for the helper module itself.
        assert env is not None
        assert str(SOURCE_ROOT) in env["PYTHONPATH"]

    def test_a_checkout_runs_the_helper_from_the_source_tree(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """The transition path: a separate process, but no provisioning needed to use it."""
        monkeypatch.setenv(paths.DIR_ENV, str(Path("/nonexistent/engine")))

        command, env = launch.helper_command()

        assert command == [sys.executable, "-m", "bea_engine"]
        assert env is not None
        assert str(SOURCE_ROOT) in env["PYTHONPATH"]

    def test_a_missing_explicit_interpreter_says_so_plainly(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv(paths.PYTHON_ENV, "/nonexistent/python")

        with pytest.raises(BeaError, match=paths.PYTHON_ENV):
            launch.helper_command()

    def test_an_installed_frontend_has_no_checkout_to_fall_back_on(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """`checkout_source_root` is what switches off the transition path in a wheel."""
        monkeypatch.setattr(paths, "_IMPORT_ROOT", Path("/nonexistent/site-packages"))

        assert paths.checkout_source_root() is None
        assert paths.checkout_engine_project() is None

    def test_a_checkout_is_recognised_by_its_files(self) -> None:
        assert paths.checkout_source_root() == SOURCE_ROOT
        assert paths.checkout_engine_project() == CLI_ROOT / "engine"

    def test_an_installed_bea_engine_is_not_mistaken_for_a_checkout(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        """`bea_engine` alone in site-packages is not a checkout.

        Finding that package must not switch off provisioning: only a checkout
        has the engine project beside the sources.
        """
        (tmp_path / "site-packages" / "bea_engine").mkdir(parents=True)
        (tmp_path / "site-packages" / "bea_engine" / "main.py").write_text("")
        monkeypatch.setattr(paths, "_IMPORT_ROOT", tmp_path / "site-packages")

        assert paths.checkout_source_root() is None
        assert paths.checkout_engine_project() is None


class TestPaths:
    def test_the_engine_root_is_versioned_under_the_data_directory(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        """An upgrade provisions a sibling instead of mutating the engine in use."""
        monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path))

        assert paths.engine_root() == tmp_path / "bea" / "engine" / paths.engine_version()

    def test_the_directory_override_is_used_as_given(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        monkeypatch.setenv(paths.DIR_ENV, str(tmp_path / "elsewhere"))

        assert paths.engine_root() == tmp_path / "elsewhere"

    def test_a_half_installed_environment_does_not_count_as_provisioned(self, tmp_path: Path) -> None:
        """An interpreter with no helper beside it would fail later, confusingly."""
        root = tmp_path / "engine"
        (root / "bin").mkdir(parents=True)
        (root / "bin" / "python").write_text("")

        assert paths.is_provisioned(root) is False
        assert paths.is_provisioned(fake_venv(root)) is True

    def test_executables_are_resolved_beside_the_interpreter(self, tmp_path: Path) -> None:
        """`bean-check` comes from the engine, never from whatever `PATH` offers."""
        assert paths.bin_dir_for(tmp_path / "engine" / "bin" / "python") == tmp_path / "engine" / "bin"


class TestProvision:
    def test_it_publishes_the_environment_only_once_it_is_complete(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        root = tmp_path / "engine"
        steps: list[list[str]] = []

        def fake_run(command: list[str], *, failure: str) -> None:
            steps.append(command)
            if command[1] == "venv":
                fake_venv(Path(command[-1]))

        monkeypatch.setattr(provision, "_find_uv", lambda: "uv")
        monkeypatch.setattr(provision, "_run", fake_run)

        provision.provision(root)

        assert paths.is_provisioned(root)
        assert [step[1] for step in steps] == ["venv", "pip"]
        assert not list(tmp_path.glob("*.partial*")), "a finished provision left scratch directories behind"
        # Installing under one name and publishing under another is only safe
        # for a relocatable venv: otherwise every console script's shebang
        # names the `.partial` directory, and `bean-check` dies with a missing
        # interpreter the moment the rename happens.
        assert "--relocatable" in steps[0]
        assert str(root) not in steps[0], "installed straight into the published path, losing atomicity"

    def test_a_failed_install_leaves_nothing_behind_to_be_trusted(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        """The whole point of building in `.partial`: a broken engine is never published."""
        root = tmp_path / "engine"

        def fail_after_the_venv(command: list[str], *, failure: str) -> None:
            if command[1] == "venv":
                fake_venv(Path(command[-1]))
                return
            raise BeaError(failure)

        monkeypatch.setattr(provision, "_find_uv", lambda: "uv")
        monkeypatch.setattr(provision, "_run", fail_after_the_venv)

        with pytest.raises(BeaError):
            provision.provision(root)

        assert not root.exists()
        assert not list(tmp_path.glob("*.partial*"))

    def test_an_unusable_existing_environment_is_replaced(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        root = tmp_path / "engine"
        (root / "lib").mkdir(parents=True)
        (root / "leftover").write_text("junk")

        def fake_run(command: list[str], *, failure: str) -> None:
            if command[1] == "venv":
                fake_venv(Path(command[-1]))

        monkeypatch.setattr(provision, "_find_uv", lambda: "uv")
        monkeypatch.setattr(provision, "_run", fake_run)

        provision.provision(root)

        assert paths.is_provisioned(root)
        assert not (root / "leftover").exists()

    def test_a_provisioned_engine_is_reused_rather_than_rebuilt(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        """Reuse is what makes every command after the first one work offline."""
        root = fake_venv(tmp_path / "engine")
        monkeypatch.setenv(paths.DIR_ENV, str(root))
        monkeypatch.setattr(
            provision, "provision", lambda _root: pytest.fail("reprovisioned an engine that was already installed")
        )

        assert provision.ensure_engine() == root / "bin" / "python"

    def test_an_explicit_interpreter_skips_provisioning_entirely(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv(paths.PYTHON_ENV, sys.executable)
        monkeypatch.setattr(provision, "provision", lambda _root: pytest.fail("provisioned despite an override"))

        assert provision.ensure_engine() == Path(sys.executable)

    def test_it_installs_the_pinned_versions_and_a_checkouts_own_helper(self) -> None:
        requirements = provision._requirements()
        manifest = paths.manifest()

        assert requirements[:-1] == manifest["requirements"]
        assert "beancount==" in " ".join(requirements)
        # A checkout provisions the code in front of you, not a published release.
        assert requirements[-1] == str(CLI_ROOT / "engine")

    def test_a_missing_uv_explains_how_to_get_one(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
        monkeypatch.delenv(provision.UV_ENV, raising=False)
        monkeypatch.setenv("PATH", str(tmp_path))

        with pytest.raises(BeaError, match="uv"):
            provision._find_uv()


class TestFrontendIsolation:
    """ADR014's central promise, checked where it can actually fail: a fresh process."""

    def probe(self, *argv: str) -> dict[str, object]:
        """Run `bea` in a subprocess and report what the frontend process loaded."""
        script = (
            "import json, sys\n"
            "from typer.testing import CliRunner\n"
            "from cli.main import app\n"
            f"result = CliRunner().invoke(app, {list(argv)!r})\n"
            "engine = [m for m in ('beancount', 'beanquery', 'fava', 'bea_engine', 'beangulp', 'beanprice') "
            "if m in sys.modules]\n"
            "print(json.dumps({'exit_code': result.exit_code, 'loaded': engine, 'output': result.output}))\n"
        )
        completed = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            check=True,
            cwd=CLI_ROOT,
            env={**os.environ, "PYTHONPATH": str(SOURCE_ROOT)},
        )
        return json.loads(completed.stdout)  # type: ignore[no-any-return]

    def assert_isolated(self, answered: dict[str, object], *, exit_code: int | None = None) -> None:
        if exit_code is not None:
            assert answered["exit_code"] == exit_code, answered["output"]
        assert answered["loaded"] == [], f"frontend loaded {answered['loaded']}: {answered['output']}"

    def test_a_successful_check_never_loads_beancount_in_the_frontend(self, ledger: Path) -> None:
        answered = self.probe("--file", str(ledger), "--json", "check")

        self.assert_isolated(answered, exit_code=0)
        assert json.loads(str(answered["output"]))["data"] == {"valid": True, "errors": []}

    def test_a_failing_check_never_loads_beancount_in_the_frontend(self, broken_ledger: Path) -> None:
        """The error path reports the loader's errors without holding a loader."""
        answered = self.probe("--file", str(broken_ledger), "check")

        self.assert_isolated(answered, exit_code=1)

    def test_format_never_loads_engine_code_in_the_frontend(self, ledger: Path) -> None:
        answered = self.probe("--file", str(ledger), "format", "--check")
        assert answered["exit_code"] in (0, 1), answered["output"]
        self.assert_isolated(answered)

    def test_query_never_loads_engine_code_in_the_frontend(self, ledger: Path) -> None:
        answered = self.probe("--file", str(ledger), "--json", "query", "SELECT account")
        self.assert_isolated(answered, exit_code=0)

    def test_list_never_loads_engine_code_in_the_frontend(self, ledger: Path) -> None:
        self.assert_isolated(self.probe("--file", str(ledger), "--json", "list", "transaction"), exit_code=0)

    def test_report_never_loads_engine_code_in_the_frontend(self, ledger: Path) -> None:
        self.assert_isolated(self.probe("--file", str(ledger), "--json", "balance"), exit_code=0)

    def test_init_never_loads_engine_code_in_the_frontend(self, tmp_path: Path) -> None:
        target = tmp_path / "new-ledger"
        self.assert_isolated(self.probe("init", str(target), "--currency", "USD"), exit_code=0)

    def test_import_never_loads_engine_code_in_the_frontend(self, ledger: Path, tmp_path: Path) -> None:
        csv = tmp_path / "bank.csv"
        csv.write_text("Date,Amount,Description,Currency\n2024-01-02,-4.00,Coffee,USD\n")
        answered = self.probe(
            "--file",
            str(ledger),
            "import",
            str(csv),
            "--csv",
            "date=Date,amount=Amount,narration=Description,currency=Currency",
            "--account",
            "Assets:Cash",
        )
        # Preview may exit 0 or report duplicates; isolation is the gate here.
        assert answered["exit_code"] in (0, 1), answered["output"]
        self.assert_isolated(answered)

    def test_add_never_loads_engine_code_in_the_frontend(self, ledger: Path) -> None:
        answered = self.probe(
            "--file",
            str(ledger),
            "add",
            "transaction",
            "Coffee",
            "--date",
            "2024-03-01",
            "-p",
            "Expenses:Food 4.00 USD",
            "-p",
            "Assets:Cash",
        )
        self.assert_isolated(answered, exit_code=0)

    def test_ingest_and_price_never_load_optional_packages_in_the_frontend(self) -> None:
        self.assert_isolated(self.probe("ingest", "--help"), exit_code=0)
        self.assert_isolated(self.probe("price", "--help"), exit_code=0)

    def test_the_engine_client_modules_import_no_accounting_code(self) -> None:
        probe = (
            "import sys, cli.engine.launch, cli.engine.paths, cli.engine.provision, cli.commands.check;"
            "mods=('beancount','beanquery','fava','bea_engine','beangulp','beanprice');"
            "print(','.join(m for m in mods if m in sys.modules))"
        )
        completed = subprocess.run(
            [sys.executable, "-c", probe],
            capture_output=True,
            text=True,
            check=True,
            env={**os.environ, "PYTHONPATH": str(SOURCE_ROOT)},
        )

        assert completed.stdout.strip() == "", f"the engine client imported: {completed.stdout.strip()}"


class TestFrontendPackaging:
    """t023: the published frontend graph must not declare or ship the engine stack."""

    def test_frontend_runtime_deps_exclude_engine_packages(self) -> None:
        project = tomllib.loads((CLI_ROOT / "pyproject.toml").read_text())
        required = " ".join(project["project"]["dependencies"])

        for name in ("beancount", "beanquery", "ply", "pyexcel", "python-dateutil", "beangulp", "beanprice"):
            assert name not in required, f"{name} must stay off the customer frontend graph"
        assert "openai" not in required

    def test_frontend_wheel_packages_only_cli(self) -> None:
        project = tomllib.loads((CLI_ROOT / "pyproject.toml").read_text())
        packaged = project["tool"]["hatch"]["build"]["targets"]["wheel"]["packages"]

        assert packaged == ["src/cli"]
        assert "src/bea_engine" not in packaged
        assert "src/fava" not in packaged

    def test_sdist_carries_notice_and_engine_source_link(self) -> None:
        project = tomllib.loads((CLI_ROOT / "pyproject.toml").read_text())
        sdist = project["tool"]["hatch"]["build"]["targets"]["sdist"]
        only = sdist["only-include"]
        force = sdist["force-include"]

        assert "NOTICE.fava" in only
        assert "engine/NOTICE.fava" in only
        assert "src" in only
        assert force["src/bea_engine"] == "engine/src/bea_engine"
        assert force["src/fava"] == "engine/src/fava"
        assert "engine/pyproject.toml" in only
