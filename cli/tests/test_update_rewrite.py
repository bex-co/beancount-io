"""`bea-engine update --type transaction`: previewed diffs, atomic in-place rewrites.

Envelope and exit-code behavior goes through a real helper subprocess; span and
line-edit edge cases call the planner in-process.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

from bea_engine import managed_load, protocol
from bea_engine.ledger import updating
from bea_engine.ledger import write as ledger_write

CLI_ROOT = Path(__file__).parent.parent
SOURCE_ROOT = CLI_ROOT / "src"

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Checking
2026-01-01 open Expenses:Dining
2026-01-01 open Expenses:Groceries
2026-01-01 open Expenses:Uncategorized

2026-01-02 ! "Mystery Shop" #review
  import-id: "abc123"
  Expenses:Uncategorized 9.99 USD
  Assets:Checking

2026-01-03 * "Whole Foods"
  ref: "bank-ref-7"
  Expenses:Groceries 28.40 USD
  Assets:Checking
"""


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER)
    return file


def run_engine(*args: str, stdin: str | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "bea_engine", *args],
        input=stdin,
        capture_output=True,
        text=True,
        check=False,
        env={**os.environ, "PYTHONPATH": str(SOURCE_ROOT)},
    )


def update(
    ledger: Path, request: dict[str, Any], *flags: str, directive_type: str = "transaction"
) -> subprocess.CompletedProcess[str]:
    return run_engine(
        "update",
        "--file",
        str(ledger),
        "--type",
        directive_type,
        "--request",
        json.dumps(request),
        *flags,
    )


def envelope(completed: subprocess.CompletedProcess[str]) -> dict[str, Any]:
    return json.loads(completed.stdout)  # type: ignore[no-any-return]


def _loaded(ledger: Path) -> tuple[list[Any], dict[str, Any]]:
    entries, errors, options = managed_load.load_file(ledger)
    assert not errors
    return list(entries), options


def _plan(ledger: Path, request: dict[str, Any]) -> tuple[str, str]:
    entries, options = _loaded(ledger)
    changes = updating._validate_request(request)
    entry = updating.locate_transaction(entries, changes.id)
    snapshot = ledger_write.LedgerSnapshot.capture(ledger)
    target = Path((entry.meta or {})["filename"])
    return updating.plan_rewrite(entries, options, entry, changes, snapshot.require_target(target), target)


class TestPreviewAndApply:
    def test_preview_answers_a_diff_and_writes_nothing(self, ledger: Path) -> None:
        before = ledger.read_bytes()
        completed = update(ledger, {"id": "abc123", "account": "Expenses:Groceries", "flag": "*"})
        assert completed.returncode == 0
        data = envelope(completed)["data"]
        assert data["written"] == 0
        assert data["lineno"] == 7
        assert '-2026-01-02 ! "Mystery Shop" #review' in data["diff"]
        assert '+2026-01-02 * "Mystery Shop" #review' in data["diff"]
        assert "-  Expenses:Uncategorized 9.99 USD" in data["diff"]
        assert "+  Expenses:Groceries 9.99 USD" in data["diff"]
        assert ledger.read_bytes() == before

    def test_apply_rewrites_only_the_entry_lines(self, ledger: Path) -> None:
        completed = update(ledger, {"id": "abc123", "account": "Expenses:Groceries", "flag": "*"}, "--apply")
        assert completed.returncode == 0
        assert envelope(completed)["data"]["written"] == 1
        assert ledger.read_text() == LEDGER.replace(
            '2026-01-02 ! "Mystery Shop"', '2026-01-02 * "Mystery Shop"'
        ).replace("Expenses:Uncategorized 9.99 USD", "Expenses:Groceries 9.99 USD")
        assert 'import-id: "abc123"' in ledger.read_text()
        check = run_engine("check", "--file", str(ledger))
        assert check.returncode == 0

    def test_unknown_id_exits_2_and_writes_nothing(self, ledger: Path) -> None:
        before = ledger.read_bytes()
        completed = update(ledger, {"id": "nope", "flag": "*"}, "--apply")
        assert completed.returncode == 2
        error = envelope(completed)["error"]
        assert error["category"] == "usage"
        assert "No transaction with import-id or ref 'nope'" in error["message"]
        assert ledger.read_bytes() == before

    def test_ambiguous_id_exits_2_and_writes_nothing(self, ledger: Path) -> None:
        ledger.write_text(
            LEDGER + '\n2026-01-04 * "Again"\n  import-id: "abc123"\n  Expenses:Dining 1.00 USD\n  Assets:Checking\n'
        )
        before = ledger.read_bytes()
        completed = update(ledger, {"id": "abc123", "flag": "*"}, "--apply")
        assert completed.returncode == 2
        assert "matches 2 transactions" in envelope(completed)["error"]["message"]
        assert ledger.read_bytes() == before

    def test_old_new_names_the_leg(self, ledger: Path) -> None:
        completed = update(ledger, {"id": "bank-ref-7", "account": "Expenses:Groceries=Expenses:Dining"}, "--apply")
        assert completed.returncode == 0
        assert "Expenses:Dining 28.40 USD" in ledger.read_text()
        assert "Expenses:Groceries 28.40 USD" not in ledger.read_text()

    def test_bare_account_without_a_queue_leg_asks_for_old_new(self, ledger: Path) -> None:
        before = ledger.read_bytes()
        completed = update(ledger, {"id": "bank-ref-7", "account": "Expenses:Dining"}, "--apply")
        assert completed.returncode == 2
        assert "OLD=NEW" in envelope(completed)["error"]["message"]
        assert ledger.read_bytes() == before

    def test_old_missing_names_the_entry_accounts(self, ledger: Path) -> None:
        before = ledger.read_bytes()
        completed = update(ledger, {"id": "abc123", "account": "Expenses:Missing=Expenses:Dining"}, "--apply")
        assert completed.returncode == 2
        message = envelope(completed)["error"]["message"]
        assert "No posting to Expenses:Missing" in message
        assert "Expenses:Uncategorized" in message
        assert ledger.read_bytes() == before

    def test_double_holding_leg_asks_for_old_new(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Assets:Checking\n"
            "2026-01-01 open Expenses:Dining\n"
            "2026-01-01 open Expenses:Uncategorized\n"
            '\n2026-01-02 ! "Split"\n'
            '  import-id: "k"\n'
            "  Expenses:Uncategorized 5.00 USD\n"
            "  Expenses:Uncategorized 4.00 USD\n"
            "  Assets:Checking -9.00 USD\n"
        )
        before = file.read_bytes()
        completed = update(file, {"id": "k", "account": "Expenses:Dining"}, "--apply")
        assert completed.returncode == 2
        assert "OLD=NEW" in envelope(completed)["error"]["message"]
        assert file.read_bytes() == before

    def test_bare_account_honors_renamed_roots(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_text(
            'option "operating_currency" "USD"\n'
            'option "name_expenses" "Costs"\n'
            "2026-01-01 open Assets:Checking\n"
            "2026-01-01 open Costs:Dining\n"
            "2026-01-01 open Costs:Uncategorized\n"
            '\n2026-01-02 ! "Shop"\n'
            '  import-id: "k"\n'
            "  Costs:Uncategorized 9.99 USD\n"
            "  Assets:Checking\n"
        )
        completed = update(file, {"id": "k", "account": "Costs:Dining"}, "--apply")
        assert completed.returncode == 0, completed.stdout
        assert "Costs:Dining 9.99 USD" in file.read_text()

    def test_tag_sigil_is_stripped(self, ledger: Path) -> None:
        completed = update(ledger, {"id": "abc123", "tags": ["#trip"]}, "--apply")
        assert completed.returncode == 0, completed.stdout
        assert "#trip" in ledger.read_text()
        assert "##trip" not in ledger.read_text()

    def test_narration_newline_becomes_a_space(self, ledger: Path) -> None:
        completed = update(ledger, {"id": "abc123", "narration": "hello\nworld"}, "--apply")
        assert completed.returncode == 0, completed.stdout
        assert '"hello world"' in ledger.read_text()

    def test_retarget_to_another_normalization_warns(self, tmp_path: Path) -> None:
        import unicodedata

        nfd = unicodedata.normalize("NFD", "Expenses:Café")
        file = tmp_path / "main.bean"
        file.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Assets:Checking\n"
            f"2026-01-01 open {nfd}\n"
            "2026-01-01 open Expenses:Uncategorized\n"
            '\n2026-01-02 ! "Shop"\n'
            '  import-id: "k"\n'
            "  Expenses:Uncategorized 9.99 USD\n"
            "  Assets:Checking\n"
        )
        completed = update(file, {"id": "k", "account": "Expenses:Café"})
        assert completed.returncode == 0, completed.stdout
        warnings = envelope(completed)["data"]["warnings"]
        assert any("Re-save the ledger in Unicode NFC" in warning for warning in warnings)

    def test_noop_answers_written_0(self, ledger: Path) -> None:
        before = ledger.read_bytes()
        completed = update(ledger, {"id": "bank-ref-7", "flag": "*"}, "--apply")
        assert completed.returncode == 0
        data = envelope(completed)["data"]
        assert data["written"] == 0
        assert data["noop"] is True
        assert data["diff"] == ""
        assert ledger.read_bytes() == before

    def test_unknown_type_is_a_usage_error(self, ledger: Path) -> None:
        completed = update(ledger, {"id": "abc123", "flag": "*"}, directive_type="balance")
        assert completed.returncode == 2
        assert "Unknown directive type 'balance'" in envelope(completed)["error"]["message"]


@pytest.mark.parametrize(
    "bad_request",
    [
        {},
        {"id": "abc123"},
        {"id": "abc123", "tags": []},
        {"id": "abc123", "acount": "Expenses:Dining"},
        {"id": "abc123", "flag": "xx"},
        {"id": "abc123", "flag": 1},
        {"id": "abc123", "tags": "trip"},
        {"id": "abc123", "tags": ["ok tag"]},
        {"id": "abc123", "narration": 5},
        {"id": "abc123", "account": "not an account!!"},
        {"id": "", "flag": "*"},
    ],
)
def test_bad_requests_are_usage_errors(ledger: Path, bad_request: dict[str, Any]) -> None:
    before = ledger.read_bytes()
    completed = update(ledger, bad_request, "--apply")
    assert completed.returncode == 2
    assert envelope(completed)["error"]["category"] == "usage"
    assert ledger.read_bytes() == before


class TestHeaderEdits:
    def test_txn_keyword_flag_is_replaced(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Assets:Checking\n"
            "2026-01-01 open Expenses:Groceries\n"
            '\n2026-01-02 txn "Store"\n'
            '  import-id: "k"\n'
            "  Expenses:Groceries 1.00 USD\n"
            "  Assets:Checking\n"
        )
        new_text, _ = _plan(file, {"id": "k", "flag": "!"})
        assert '\n2026-01-02 ! "Store"\n' in new_text

    def test_narration_with_a_payee_replaces_the_second_string(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Assets:Checking\n"
            "2026-01-01 open Expenses:Groceries\n"
            '\n2026-01-02 * "Payee" "Old" #tag\n'
            '  import-id: "k"\n'
            "  Expenses:Groceries 1.00 USD\n"
            "  Assets:Checking\n"
        )
        new_text, _ = _plan(file, {"id": "k", "narration": 'Ne"w'})
        assert '2026-01-02 * "Payee" "Ne\\"w" #tag' in new_text

    def test_bare_header_grows_a_narration_before_its_tags(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Assets:Checking\n"
            "2026-01-01 open Expenses:Groceries\n"
            "\n2026-01-02 * #tag\n"
            '  import-id: "k"\n'
            "  Expenses:Groceries 1.00 USD\n"
            "  Assets:Checking\n"
        )
        new_text, _ = _plan(file, {"id": "k", "narration": "Hello"})
        assert '2026-01-02 * "Hello" #tag' in new_text

    def test_tags_append_and_deduplicate(self, ledger: Path) -> None:
        new_text, _ = _plan(ledger, {"id": "abc123", "tags": ["review", "trip"]})
        assert '2026-01-02 ! "Mystery Shop" #review #trip' in new_text
        assert new_text.count("#review") == 1

    def test_trailing_comment_survives(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Assets:Checking\n"
            "2026-01-01 open Expenses:Groceries\n"
            '\n2026-01-02 * "Store" ; keep me\n'
            '  import-id: "k"\n'
            "  Expenses:Groceries 1.00 USD\n"
            "  Assets:Checking\n"
        )
        new_text, _ = _plan(file, {"id": "k", "flag": "!", "tags": ["t"]})
        assert '2026-01-02 ! "Store" #t ; keep me' in new_text


class TestPostingEdits:
    def test_posting_flag_is_kept(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Assets:Checking\n"
            "2026-01-01 open Expenses:Groceries\n"
            "2026-01-01 open Expenses:Uncategorized\n"
            '\n2026-01-02 ! "Shop"\n'
            '  import-id: "k"\n'
            "  ! Expenses:Uncategorized 9.99 USD\n"
            "  Assets:Checking\n"
        )
        new_text, _ = _plan(file, {"id": "k", "account": "Expenses:Groceries"})
        assert "  ! Expenses:Groceries 9.99 USD" in new_text

    def test_metadata_naming_the_old_account_is_untouched(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Assets:Checking\n"
            "2026-01-01 open Expenses:Groceries\n"
            "2026-01-01 open Expenses:Uncategorized\n"
            '\n2026-01-02 ! "Shop"\n'
            '  import-id: "k"\n'
            '  note: "was Expenses:Uncategorized"\n'
            "  Expenses:Uncategorized 9.99 USD\n"
            "  Assets:Checking\n"
        )
        new_text, _ = _plan(file, {"id": "k", "account": "Expenses:Groceries"})
        assert '  note: "was Expenses:Uncategorized"' in new_text
        assert "  Expenses:Groceries 9.99 USD" in new_text

    def test_alignment_is_preserved(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_text(
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Assets:Checking\n"
            "2026-01-01 open Expenses:Groceries\n"
            "2026-01-01 open Expenses:Uncategorized\n"
            '\n2026-01-02 ! "Shop"\n'
            '  import-id: "k"\n'
            "  Expenses:Uncategorized    9.99 USD\n"
            "  Assets:Checking\n"
        )
        new_text, _ = _plan(file, {"id": "k", "account": "Expenses:Groceries"})
        assert "  Expenses:Groceries    9.99 USD" in new_text


class TestBytesPreserved:
    def test_outside_span_bytes_are_identical(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_text(
            'option "operating_currency" "USD"\n'
            "; a comment with trailing spaces   \n"
            "2026-01-01 open Assets:Checking\n"
            "2026-01-01 open Expenses:Groceries\n"
            "2026-01-01 open Expenses:Uncategorized\n"
            "\n"
            "; between entries\n"
            '\n2026-01-02 ! "Shop"\n'
            '  import-id: "k"\n'
            "  Expenses:Uncategorized 9.99 USD\n"
            "  Assets:Checking\n"
            "\n"
            "; trailing comment\n"
            '\n2026-01-03 * "Food"\n'
            "  Expenses:Groceries 1.00 USD\n"
            "  Assets:Checking\n"
        )
        before = file.read_bytes()
        completed = update(file, {"id": "k", "account": "Expenses:Groceries"}, "--apply")
        assert completed.returncode == 0
        after = file.read_bytes()
        head, _, head_rest = before.partition(b'2026-01-02 ! "Shop"')
        new_head, _, _ = after.partition(b'2026-01-02 ! "Shop"')
        assert new_head == head
        _, _, tail = before.partition(b"  Assets:Checking\n")
        _, _, new_tail = after.partition(b"  Assets:Checking\n")
        assert new_tail == tail

    def test_crlf_stays_crlf(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_bytes(LEDGER.replace("\n", "\r\n").encode("utf-8"))
        completed = update(file, {"id": "abc123", "flag": "*"}, "--apply")
        assert completed.returncode == 0
        raw = file.read_bytes()
        assert b"\r\n" in raw
        assert raw.replace(b"\r\n", b"\n").decode("utf-8") == LEDGER.replace('2026-01-02 ! "', '2026-01-02 * "')

    def test_bom_is_preserved(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_bytes(b"\xef\xbb\xbf" + LEDGER.encode("utf-8"))
        completed = update(file, {"id": "abc123", "flag": "*"}, "--apply")
        assert completed.returncode == 0
        assert file.read_bytes() == b"\xef\xbb\xbf" + LEDGER.replace('2026-01-02 ! "', '2026-01-02 * "').encode("utf-8")

    def test_bom_line_one_entry_is_found(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        body = (
            '2026-01-02 ! "Shop"\n'
            '  import-id: "k"\n'
            "  Expenses:Uncategorized 9.99 USD\n"
            "  Assets:Checking\n"
            'option "operating_currency" "USD"\n'
            "2026-01-01 open Assets:Checking\n"
            "2026-01-01 open Expenses:Groceries\n"
            "2026-01-01 open Expenses:Uncategorized\n"
        )
        file.write_bytes(b"\xef\xbb\xbf" + body.encode("utf-8"))
        # The flag change exercises the header pattern on the BOM-glued line.
        completed = update(file, {"id": "k", "account": "Expenses:Groceries", "flag": "*"}, "--apply")
        assert completed.returncode == 0, completed.stdout
        assert file.read_bytes().startswith(b"\xef\xbb\xbf")
        text = file.read_bytes().decode("utf-8-sig")
        assert "Expenses:Groceries 9.99 USD" in text
        assert text.startswith('2026-01-02 * "Shop"')

    def test_missing_trailing_newline_is_preserved(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_text(LEDGER.rstrip("\n"))
        completed = update(file, {"id": "bank-ref-7", "flag": "!"}, "--apply")
        assert completed.returncode == 0
        raw = file.read_bytes()
        assert not raw.endswith(b"\n")
        assert raw.decode("utf-8") == LEDGER.rstrip("\n").replace(
            '2026-01-03 * "Whole Foods"', '2026-01-03 ! "Whole Foods"'
        )

    def test_entry_in_an_include_rewrites_only_the_include(self, tmp_path: Path) -> None:
        root = tmp_path / "main.bean"
        root.write_text('option "operating_currency" "USD"\ninclude "txns.bean"\n')
        leaf = tmp_path / "txns.bean"
        leaf.write_text(LEDGER)
        completed = update(root, {"id": "abc123", "flag": "*"}, "--apply")
        assert completed.returncode == 0
        data = envelope(completed)["data"]
        assert data["target"] == str(leaf)
        assert root.read_text() == 'option "operating_currency" "USD"\ninclude "txns.bean"\n'
        assert '2026-01-02 * "Mystery Shop"' in leaf.read_text()


class TestSafety:
    def test_concurrent_edit_is_a_conflict(self, ledger: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        real_validate = ledger_write.validate_candidate

        def racing(candidate: Path, target: Path, **kwargs: Any) -> list[str]:
            with open(target, "a") as handle:
                handle.write("\n; a foreign edit\n")
            return real_validate(candidate, target, **kwargs)

        monkeypatch.setattr(ledger_write, "validate_candidate", racing)
        with pytest.raises(protocol.ConflictError, match="Nothing was written"):
            updating.answer(ledger, "transaction", {"id": "abc123", "flag": "*"}, apply=True)
        content = ledger.read_text()
        assert "; a foreign edit" in content
        assert '2026-01-02 ! "Mystery Shop"' in content

    def test_broken_ledger_refuses(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_text(LEDGER + "\n2026-01-04 * broken\n")
        before = file.read_bytes()
        completed = update(file, {"id": "abc123", "flag": "*"}, "--apply")
        assert completed.returncode == 1
        assert envelope(completed)["error"]["category"] == "validation"
        assert file.read_bytes() == before

    def test_semantic_errors_need_allow_errors(self, tmp_path: Path) -> None:
        file = tmp_path / "main.bean"
        file.write_text(
            LEDGER + "\n2026-02-01 balance Assets:Checking 999.00 USD\n",
        )
        refused = update(file, {"id": "abc123", "flag": "*"}, "--apply")
        assert refused.returncode == 1
        allowed = update(file, {"id": "abc123", "flag": "*"}, "--apply", "--allow-errors")
        assert allowed.returncode == 0
        assert '2026-01-02 * "Mystery Shop"' in file.read_text()

    def test_retarget_to_an_unopened_account_refuses(self, ledger: Path) -> None:
        before = ledger.read_bytes()
        completed = update(ledger, {"id": "abc123", "account": "Expenses:Nope"}, "--apply")
        assert completed.returncode == 1
        assert ledger.read_bytes() == before
