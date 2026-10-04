"""`make docs-check` refuses a relative docs link that resolves to nothing."""

from __future__ import annotations

import importlib.util
from pathlib import Path
from types import ModuleType

SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "check_doc_links.py"


def _checker() -> ModuleType:
    spec = importlib.util.spec_from_file_location("check_doc_links", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_shipped_docs_have_no_broken_relative_links() -> None:
    assert _checker().main() == 0


def test_a_link_climbing_above_the_target_is_reported(tmp_path: Path) -> None:
    (tmp_path / "docs").mkdir()
    (tmp_path / "skills").mkdir()
    (tmp_path / "skills" / "dedup.md").write_text("x\n")
    doc = tmp_path / "docs" / "GUIDE.md"
    doc.write_text(
        "[ok](../skills/dedup.md#rule)\n"
        "[bad](../../skills/dedup.md)\n"
        "[web](https://example.com/x) [anchor](#here)\n"
        "```\n[fenced](missing.md)\n```\n",
        encoding="utf-8",
    )
    assert _checker().broken_links(doc) == [(2, "../../skills/dedup.md")]
