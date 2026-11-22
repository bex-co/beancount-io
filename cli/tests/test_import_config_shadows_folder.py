"""A config that shadows a same-named folder says so, not the plain-name hint (w5/781).

`importers.py` beside an `importers/` folder without `__init__.py` wins the
import, so the config imports itself; the resulting circular ImportError was
answered with advice to import by plain name, which the user already did.
"""

from pathlib import Path

from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()


def _books(tmp_path: Path) -> list[str]:
    (tmp_path / "main.bean").write_text("2026-01-01 open Assets:Checking USD\n2026-01-01 open Expenses:Food USD\n")
    (tmp_path / "importers").mkdir()
    (tmp_path / "importers" / "chase.py").write_text(
        "class Chase:\n"
        '    name = "chase"\n'
        "    def identify(self, filepath):\n"
        '        return filepath.endswith(".csv")\n'
        "    def account(self, filepath):\n"
        '        return "Assets:Checking"\n'
        "    def extract(self, filepath, existing):\n"
        "        return []\n"
    )
    (tmp_path / "importers.py").write_text("from importers import chase\n\nCONFIG = [chase.Chase()]\n")
    (tmp_path / "stmt.csv").write_text("Date,Description,Amount\n05/05/2026,TRADER JOES,33.20\n")
    return [
        "--no-input",
        "--file",
        str(tmp_path / "main.bean"),
        "import",
        str(tmp_path / "stmt.csv"),
        "--config",
        str(tmp_path / "importers.py"),
    ]


def test_a_shadowed_folder_names_the_rename_or_init_fix(tmp_path: Path, bea_config_dir: Path) -> None:
    result = runner.invoke(app, _books(tmp_path))

    assert result.exit_code == 1, result.output
    flat = " ".join(result.stderr.split())
    assert "importers.py shadows the importers/ folder beside it" in flat
    assert "Rename the config or add importers/__init__.py" in flat
    assert "by its plain name" not in flat


def test_adding_init_py_unshadows_the_folder(tmp_path: Path, bea_config_dir: Path) -> None:
    args = _books(tmp_path)
    (tmp_path / "importers" / "__init__.py").write_text("")

    result = runner.invoke(app, args)

    assert result.exit_code == 0, result.output
    assert "chase" in result.output
