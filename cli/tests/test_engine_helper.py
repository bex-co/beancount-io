"""`bea-engine` as its own program: the JSON protocol, exit codes, and version agreement.

Everything here goes through a real subprocess. The helper's whole purpose is
to be a separate program (ADR014), so calling its functions in-process would
test the one thing the design says never happens — and would miss exactly the
failures that matter, like a traceback landing on stdout where the envelope
belongs.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tomllib
from pathlib import Path
from typing import Any

import pytest

CLI_ROOT = Path(__file__).parent.parent
SOURCE_ROOT = CLI_ROOT / "src"
FIXTURES = Path(__file__).parent / "fixtures"

VALID = (FIXTURES / "valid.bean").read_text()
INVALID = (FIXTURES / "invalid.bean").read_text()


def run_engine(*args: str, stdin: str | None = None) -> subprocess.CompletedProcess[str]:
    """Invoke the helper the way the frontend does: `python -m bea_engine`, argv array.

    `PYTHONPATH` rather than the ambient environment, so the helper is found
    whether or not this checkout was installed editable. `stdin` is for the
    requests that do not fit in an argument list (`add --request -`).
    """
    return subprocess.run(
        [sys.executable, "-m", "bea_engine", *args],
        input=stdin,
        capture_output=True,
        text=True,
        check=False,
        env={**os.environ, "PYTHONPATH": str(SOURCE_ROOT)},
    )


def envelope(completed: subprocess.CompletedProcess[str]) -> dict[str, Any]:
    """Parse stdout whole, so anything printed beside the envelope fails the test."""
    return json.loads(completed.stdout)  # type: ignore[no-any-return]


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(VALID)
    return path


class TestCheck:
    def test_a_valid_ledger_answers_valid_and_exits_0(self, ledger: Path) -> None:
        completed = run_engine("check", "--file", str(ledger))

        assert completed.returncode == 0, completed.stderr
        assert envelope(completed) == {
            "engine": engine_version(),
            "command": "check",
            "ok": True,
            "data": {"valid": True, "errors": []},
        }

    def test_a_broken_ledger_is_a_validation_failure_with_one_detail_per_error(self, tmp_path: Path) -> None:
        path = tmp_path / "main.bean"
        path.write_text(INVALID)

        completed = run_engine("check", "--file", str(path))

        assert completed.returncode == 1
        error = envelope(completed)["error"]
        assert error["category"] == "validation"
        assert error["exit_code"] == 1
        assert any("does not balance" in detail for detail in error["details"])
        assert error["message"] == f"{path}: {len(error['details'])} error(s)."

    def test_a_missing_ledger_is_a_usage_failure(self, tmp_path: Path) -> None:
        completed = run_engine("check", "--file", str(tmp_path / "absent.bean"))

        assert completed.returncode == 2
        assert envelope(completed)["error"]["category"] == "usage"

    def test_a_directory_is_a_usage_failure_rather_than_a_loader_crash(self, tmp_path: Path) -> None:
        completed = run_engine("check", "--file", str(tmp_path))

        assert completed.returncode == 2
        assert envelope(completed)["error"]["category"] == "usage"

    def test_a_relative_path_is_resolved_against_the_working_directory(self, ledger: Path) -> None:
        """The loader asserts on a relative entry path, so the helper resolves its own arguments."""
        completed = subprocess.run(
            [sys.executable, "-m", "bea_engine", "check", "--file", "main.bean"],
            cwd=ledger.parent,
            capture_output=True,
            text=True,
            check=False,
            env={**os.environ, "PYTHONPATH": str(SOURCE_ROOT)},
        )

        assert completed.returncode == 0, completed.stderr
        assert envelope(completed)["ok"] is True

    def test_a_path_with_spaces_and_quotes_needs_no_escaping(self, tmp_path: Path) -> None:
        """Arguments cross as an argv array, so shell-special characters are just characters."""
        directory = tmp_path / "my ledgers" / "q'uote"
        directory.mkdir(parents=True)
        path = directory / "main file.bean"
        path.write_text(VALID)

        completed = run_engine("check", "--file", str(path))

        assert completed.returncode == 0, completed.stderr
        assert envelope(completed)["ok"] is True


class TestList:
    def test_items_are_business_json_with_no_beancount_objects_on_the_wire(self, ledger: Path) -> None:
        completed = run_engine("list", "--file", str(ledger), "--type", "price")

        assert completed.returncode == 0, completed.stderr
        data = envelope(completed)["data"]
        assert data["items"] == [
            {"date": "2024-02-03", "currency": "BTC", "amount": {"number": "62000.00", "currency": "USD"}}
        ]
        assert data["truncated"] is False and data["errors"] == []

    def test_the_limit_bounds_the_answer_and_says_it_did(self, ledger: Path) -> None:
        completed = run_engine("list", "--file", str(ledger), "--type", "transaction", "--limit", "1")

        data = envelope(completed)["data"]
        assert len(data["items"]) == 1
        assert data["truncated"] is True

    def test_a_ledger_with_errors_still_answers_what_it_could_read(self, tmp_path: Path) -> None:
        """Unlike `check`: whether a partial listing is acceptable is the caller's call."""
        path = tmp_path / "main.bean"
        path.write_text(INVALID)

        completed = run_engine("list", "--file", str(path), "--type", "transaction")

        assert completed.returncode == 0, completed.stderr
        data = envelope(completed)["data"]
        assert data["errors"] != []
        assert [item["narration"] for item in data["items"]] == ["Coffee"]

    def test_an_unknown_type_is_a_usage_failure_that_lists_the_types(self, ledger: Path) -> None:
        completed = run_engine("list", "--file", str(ledger), "--type", "nonesuch")

        assert completed.returncode == 2
        error = envelope(completed)["error"]
        assert error["category"] == "usage"
        assert "transaction" in error["message"]


class TestAdd:
    def test_a_valid_directive_is_appended_and_the_answer_names_the_file(self, ledger: Path) -> None:
        completed = run_engine(
            "add",
            "--file",
            str(ledger),
            "--type",
            "transaction",
            "--request",
            json.dumps(
                {
                    "date": "2024-03-01",
                    "narration": "Coffee",
                    "postings": ["Expenses:Food 4.00 USD", "Assets:Cash"],
                }
            ),
        )

        assert completed.returncode == 0, completed.stderr
        data = envelope(completed)["data"]
        assert data["written"] == 1
        assert data["target"] == str(ledger)
        assert "Coffee" in ledger.read_text()

    def test_a_request_may_arrive_on_stdin(self, ledger: Path) -> None:
        """A batch of a few thousand rows does not fit in an argument list."""
        rows = [
            {
                "date": "2024-03-02",
                "narration": "Bulk",
                "postings": [{"account": "Expenses:Food", "amount": "1.00 USD"}, {"account": "Assets:Cash"}],
            }
        ]

        completed = run_engine(
            "add",
            "--file",
            str(ledger),
            "--type",
            "transactions",
            "--request",
            "-",
            stdin=json.dumps({"rows": rows}),
        )

        assert completed.returncode == 0, completed.stderr
        assert envelope(completed)["data"]["written"] == 1
        assert "Bulk" in ledger.read_text()

    def test_a_directive_that_would_break_the_ledger_leaves_it_byte_identical(self, ledger: Path) -> None:
        before = ledger.read_bytes()

        completed = run_engine(
            "add",
            "--file",
            str(ledger),
            "--type",
            "open",
            "--request",
            json.dumps({"date": "2024-03-01", "account": "Assets:Cash"}),
        )

        assert completed.returncode == 1
        assert envelope(completed)["error"]["category"] == "validation"
        assert ledger.read_bytes() == before

    def test_a_read_only_ledger_is_an_auth_failure(self, ledger: Path) -> None:
        """Exit 3 is the filesystem refusing, not the ledger being wrong."""
        ledger.chmod(0o444)
        try:
            completed = run_engine(
                "add",
                "--file",
                str(ledger),
                "--type",
                "note",
                "--request",
                json.dumps({"date": "2024-03-01", "account": "Assets:Cash", "comment": "hello"}),
            )
        finally:
            ledger.chmod(0o644)

        assert completed.returncode == 3
        assert envelope(completed)["error"]["category"] == "auth"


class TestAppend:
    """Raw directive text for `bea ask` (ADR014 t022)."""

    DIRECTIVE = '2024-03-01 * "Coffee"\n  Expenses:Food 4.00 USD\n  Assets:Cash -4.00 USD\n'

    def test_a_valid_directive_is_appended(self, ledger: Path) -> None:
        completed = run_engine("append", "--file", str(ledger), "--text", "-", stdin=self.DIRECTIVE)

        assert completed.returncode == 0, completed.stderr
        data = envelope(completed)["data"]
        assert data["written"] == 1
        assert data["target"] == str(ledger)
        assert "Coffee" in ledger.read_text()

    def test_dry_run_returns_a_token_and_writes_nothing(self, ledger: Path) -> None:
        before = ledger.read_bytes()

        completed = run_engine("append", "--file", str(ledger), "--text", "-", "--dry-run", stdin=self.DIRECTIVE)

        assert completed.returncode == 0, completed.stderr
        data = envelope(completed)["data"]
        assert data["count"] == 1
        assert data["token"][str(ledger)]
        assert ledger.read_bytes() == before

        committed = run_engine(
            "append",
            "--file",
            str(ledger),
            "--text",
            "-",
            "--token",
            json.dumps(data["token"]),
            stdin=self.DIRECTIVE,
        )
        assert committed.returncode == 0, committed.stderr
        assert envelope(committed)["data"]["written"] == 1

    def test_a_stale_token_is_a_conflict(self, ledger: Path) -> None:
        preview = envelope(
            run_engine("append", "--file", str(ledger), "--text", "-", "--dry-run", stdin=self.DIRECTIVE)
        )["data"]
        ledger.write_bytes(ledger.read_bytes() + b"; external\n")

        completed = run_engine(
            "append",
            "--file",
            str(ledger),
            "--text",
            "-",
            "--token",
            json.dumps(preview["token"]),
            stdin=self.DIRECTIVE,
        )

        assert completed.returncode == 4
        assert envelope(completed)["error"]["category"] == "conflict"

    def test_plugins_and_unbalanced_entries_are_rejected(self, ledger: Path) -> None:
        before = ledger.read_bytes()
        plugin = envelope(run_engine("append", "--file", str(ledger), "--text", 'plugin "x"\n'))
        assert plugin["ok"] is False
        assert "rejected" in plugin["error"]["message"].lower()

        bad = '2024-03-01 * "Bad"\n  Expenses:Food 4.00 USD\n  Assets:Cash -1.00 USD\n'
        unbalanced = run_engine("append", "--file", str(ledger), "--text", "-", stdin=bad)
        assert unbalanced.returncode == 1
        assert ledger.read_bytes() == before


class TestProtocol:
    def test_stdout_carries_exactly_one_object_and_stderr_carries_no_result(self, ledger: Path) -> None:
        completed = run_engine("check", "--file", str(ledger))

        assert len(completed.stdout.strip().splitlines()) == 1
        assert "valid" not in completed.stderr

    def test_a_failure_uses_the_same_envelope_on_the_same_stream(self, tmp_path: Path) -> None:
        """One read, one parse, whatever the outcome — a caller never has to pick a stream."""
        path = tmp_path / "main.bean"
        path.write_text(INVALID)

        failure = envelope(run_engine("check", "--file", str(path)))

        assert failure["ok"] is False
        assert set(failure) == {"engine", "command", "ok", "error"}
        assert "data" not in failure

    def test_every_envelope_names_the_engine_and_the_command(self, ledger: Path) -> None:
        for args, command in ((("version",), "version"), (("check", "--file", str(ledger)), "check")):
            answered = envelope(run_engine(*args))

            assert answered["command"] == command
            assert answered["engine"] == engine_version()

    def test_an_unknown_command_fails_without_pretending_to_answer(self) -> None:
        completed = run_engine("nonesuch")

        assert completed.returncode != 0
        assert completed.stdout.strip() == ""


class TestVersion:
    def test_version_reports_the_engine_version(self) -> None:
        completed = run_engine("version")

        assert completed.returncode == 0, completed.stderr
        assert envelope(completed)["data"] == {"version": engine_version()}

    def test_the_frontend_manifest_engine_and_helper_agree_on_one_version(self) -> None:
        """Four places name this version and none of them can read the others.

        The manifest ships with the frontend, `engine/pyproject.toml` builds the
        distribution, and `bea_engine.FALLBACK_VERSION` answers in a checkout
        that has no installed metadata to read. Drift would mean provisioning an
        environment that reports a different version than the one requested.
        """
        sys.path.insert(0, str(SOURCE_ROOT))
        try:
            from bea_engine import FALLBACK_VERSION
        finally:
            sys.path.remove(str(SOURCE_ROOT))

        assert engine_version() == FALLBACK_VERSION
        assert engine_version() == project_version(CLI_ROOT / "engine" / "pyproject.toml")
        assert engine_version() == project_version(CLI_ROOT / "pyproject.toml")


class TestDistribution:
    def test_the_engine_project_ships_fava_and_the_helper_but_not_the_frontend(self) -> None:
        """The engine distribution is the one that holds Beancount-loading code."""
        engine = tomllib.loads((CLI_ROOT / "engine" / "pyproject.toml").read_text())
        packaged = engine["tool"]["hatch"]["build"]["targets"]["wheel"]["packages"]

        assert packaged == ["src/bea_engine", "src/fava"]
        assert "src/cli" not in packaged

    def test_the_engine_declares_beancount_and_no_ai_sdk(self) -> None:
        """ADR014 t022: ledger execution and AI SDKs stay on opposite sides."""
        engine = tomllib.loads((CLI_ROOT / "engine" / "pyproject.toml").read_text())
        required = " ".join(engine["project"]["dependencies"])

        assert "beancount" in required
        assert "beanquery" in required
        assert "openai" not in required
        assert "pydantic-ai" not in required

    def test_the_engine_carries_favas_notice_verbatim(self) -> None:
        """Its wheel ships Fava's code, so it ships Fava's notice (ADR014 licensing boundary)."""
        assert (CLI_ROOT / "engine" / "NOTICE.fava").read_text() == (CLI_ROOT / "NOTICE.fava").read_text()

    def test_built_engine_wheel_embeds_notice_fava(self, tmp_path: Path) -> None:
        """t023: NOTICE.fava is inside the engine wheel customers receive."""
        import zipfile

        dist = tmp_path / "dist"
        dist.mkdir()
        completed = subprocess.run(
            [sys.executable, "-m", "build", "--wheel", "--outdir", str(dist)],
            cwd=CLI_ROOT / "engine",
            capture_output=True,
            text=True,
            check=False,
        )
        if completed.returncode != 0:
            # `build` may be absent in the frontend env; hatchling is enough.
            completed = subprocess.run(
                ["uv", "build", "--wheel", "--out-dir", str(dist)],
                cwd=CLI_ROOT / "engine",
                capture_output=True,
                text=True,
                check=False,
            )
        assert completed.returncode == 0, completed.stdout + completed.stderr
        wheels = list(dist.glob("beancount_io_engine-*.whl"))
        assert len(wheels) == 1, list(dist.iterdir())
        with zipfile.ZipFile(wheels[0]) as archive:
            names = archive.namelist()
            assert any(name.endswith("bea_engine/NOTICE.fava") for name in names), names
            assert any(name.startswith("bea_engine/") for name in names)
            assert any(name.startswith("fava/") for name in names)
            assert not any(name.startswith("cli/") for name in names)
            notice = next(name for name in names if name.endswith("bea_engine/NOTICE.fava"))
            assert archive.read(notice).decode() == (CLI_ROOT / "NOTICE.fava").read_text()

    def test_built_frontend_wheel_excludes_engine_and_fava(self, tmp_path: Path) -> None:
        """t023: customer frontend wheel must not embed bea_engine or fava.

        Build the same way release CI does (`uv build` → sdist → wheel). A
        wheel-only build from the checkout can hide an sdist that lost `src/`.
        """
        import tarfile
        import zipfile

        # Wheel force-includes the generated engine lock; release CI runs
        # `make release-lock` before `uv build`.
        subprocess.run(["make", "engine-release-lock"], cwd=CLI_ROOT, check=True, capture_output=True)
        dist = tmp_path / "dist"
        dist.mkdir()
        completed = subprocess.run(
            ["uv", "build", "--out-dir", str(dist)],
            cwd=CLI_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        assert completed.returncode == 0, completed.stdout + completed.stderr
        sdists = list(dist.glob("beancount_io-*.tar.gz"))
        assert len(sdists) == 1, list(dist.iterdir())
        with tarfile.open(sdists[0]) as archive:
            names = archive.getnames()
            assert any(name.endswith("/src/cli/main.py") for name in names), names[:20]
            assert any("/engine/src/bea_engine/" in name for name in names)
            assert any("/engine/src/fava/" in name for name in names)
            assert not any("/tmp/" in name for name in names)
        wheels = list(dist.glob("beancount_io-*.whl"))
        assert len(wheels) == 1, list(dist.iterdir())
        with zipfile.ZipFile(wheels[0]) as archive:
            names = archive.namelist()
            assert any(name.startswith("cli/") for name in names)
            assert "cli/engine-requirements.lock" in names
            assert not any(name.startswith("bea_engine/") for name in names)
            assert not any(name.startswith("fava/") for name in names)
            # Metadata must not require beancount on the customer graph.
            metadata = next(name for name in names if name.endswith(".dist-info/METADATA"))
            requires = [
                line for line in archive.read(metadata).decode().splitlines() if line.startswith("Requires-Dist:")
            ]
            joined = "\n".join(requires)
            assert "beancount" not in joined
            assert "beanquery" not in joined
            assert "ply" not in joined


def engine_version() -> str:
    manifest = json.loads((SOURCE_ROOT / "cli" / "engine" / "manifest.json").read_text())
    return str(manifest["engine_version"])


def project_version(pyproject: Path) -> str:
    return str(tomllib.loads(pyproject.read_text())["project"]["version"])
