"""`bea price` delegates to bean-price; `bea add price` stays a supplied-quote write."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
SOURCE_ROOT = Path(__file__).resolve().parents[1] / "src"

FAKE_SOURCE = textwrap.dedent(
    '''\
    """Deterministic bean-price source for tests — no live market access."""
    from __future__ import annotations

    import datetime
    from decimal import Decimal

    from dateutil import tz

    from beanprice.source import SourcePrice


    class Source:
        def get_latest_price(self, ticker: str):
            if ticker == "FAIL":
                raise ValueError(f"provider error for {ticker}")
            if ticker == "NONE":
                return None
            return SourcePrice(
                Decimal("185.50"),
                datetime.datetime(2024, 6, 15, 16, 0, 0, tzinfo=tz.tzutc()),
                "USD",
            )

        def get_historical_price(self, ticker: str, time: datetime.datetime):
            if ticker == "FAIL":
                raise ValueError(f"provider error for {ticker}")
            if ticker == "NONE":
                return None
            return SourcePrice(
                Decimal("100.25"),
                datetime.datetime(time.year, time.month, time.day, 16, 0, 0, tzinfo=tz.tzutc()),
                "USD",
            )
    '''
)


def _install_fake_source(directory: Path) -> Path:
    package = directory / "bea_test_price"
    package.mkdir()
    (package / "__init__.py").write_text("")
    (package / "source.py").write_text(FAKE_SOURCE)
    return package


class TestPriceFeatureGate:
    def test_missing_feature_points_at_engine_enable(self) -> None:
        result = runner.invoke(app, ["price", "-e", "yahoo/AAPL", "--no-cache"])
        assert result.exit_code == 2, result.output
        assert "bea engine enable beanprice" in result.output

    def test_frontend_never_imports_beanprice_on_price_help(self) -> None:
        script = (
            "import json, sys\n"
            "from typer.testing import CliRunner\n"
            "from cli.main import app\n"
            "result = CliRunner().invoke(app, ['price', '--help'])\n"
            "loaded = [m for m in ('beancount', 'beanprice', 'beangulp', 'bea_engine') if m in sys.modules]\n"
            "print(json.dumps({'exit_code': result.exit_code, 'loaded': loaded, 'output': result.output}))\n"
        )
        completed = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            check=True,
            cwd=SOURCE_ROOT.parent,
            env={**os.environ, "PYTHONPATH": str(SOURCE_ROOT)},
        )
        answered = json.loads(completed.stdout)
        assert answered["exit_code"] == 0, answered["output"]
        assert answered["loaded"] == []


@pytest.mark.usefixtures("use_optional_engine")
class TestPriceDelegation:
    def test_current_quote_from_local_fixture(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        _install_fake_source(tmp_path)
        monkeypatch.setenv(
            "PYTHONPATH",
            os.pathsep.join([str(tmp_path), os.environ.get("PYTHONPATH", "")]).rstrip(os.pathsep),
        )
        result = runner.invoke(
            app,
            ["price", "--no-cache", "-e", "USD:bea_test_price.source/HOOL"],
        )
        assert result.exit_code == 0, result.output
        assert "price HOOL" in result.output
        assert "185.50" in result.output
        assert "USD" in result.output

    def test_historical_quote_from_local_fixture(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        _install_fake_source(tmp_path)
        monkeypatch.setenv(
            "PYTHONPATH",
            os.pathsep.join([str(tmp_path), os.environ.get("PYTHONPATH", "")]).rstrip(os.pathsep),
        )
        result = runner.invoke(
            app,
            ["price", "--no-cache", "-d", "2020-01-15", "-e", "USD:bea_test_price.source/HOOL"],
        )
        assert result.exit_code == 0, result.output
        assert "price HOOL" in result.output
        assert "100.25" in result.output

    def test_provider_error_is_surfaced(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        _install_fake_source(tmp_path)
        monkeypatch.setenv(
            "PYTHONPATH",
            os.pathsep.join([str(tmp_path), os.environ.get("PYTHONPATH", "")]).rstrip(os.pathsep),
        )
        result = runner.invoke(
            app,
            ["price", "--no-cache", "-e", "USD:bea_test_price.source/FAIL"],
        )
        assert result.exit_code != 0, result.output
        assert "provider error for FAIL" in result.output

    def test_inverted_source_emits_inverted_rate(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        _install_fake_source(tmp_path)
        monkeypatch.setenv(
            "PYTHONPATH",
            os.pathsep.join([str(tmp_path), os.environ.get("PYTHONPATH", "")]).rstrip(os.pathsep),
        )
        result = runner.invoke(
            app,
            ["price", "--no-cache", "-e", "USD:bea_test_price.source/^HOOL"],
        )
        assert result.exit_code == 0, result.output
        assert "price HOOL" in result.output
        assert "185.50" not in result.output
        assert "0.005" in result.output

    def test_add_price_still_records_a_supplied_quote_without_beanprice(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv("BEA_ENGINE_PYTHON", raising=False)
        book = tmp_path / "main.bean"
        init = runner.invoke(app, ["--json", "init", str(tmp_path), "--currency", "USD", "--date", "2024-01-01"])
        assert init.exit_code == 0, init.output
        result = runner.invoke(
            app,
            [
                "--json",
                "--file",
                str(book),
                "add",
                "price",
                "--currency",
                "HOOL",
                "--date",
                "2024-06-15",
                "--amount",
                "185.50 USD",
            ],
        )
        assert result.exit_code == 0, result.output
        assert "2024-06-15 price HOOL" in book.read_text()
        assert "185.50 USD" in book.read_text()
