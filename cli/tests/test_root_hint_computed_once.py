"""A refused write looks for an including root once, not once per error (w5/112).

Every unknown-account error in the candidate asked `including_root` again, and
each ask lexes the include closure of every ledger beside the invoked file. A
ledger with thousands of transactions on one unopened account therefore
stalled every `bea add` for minutes before refusing it.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from bea_engine.ledger import write as ledger_write

ERRORS = 40
NOTE = '2021-03-01 note Assets:Bank "hi"'


def _unopened(count: int) -> str:
    return "".join(f'2020-01-01 * "t{i}"\n  Expenses:Food  1 USD\n  Assets:Bank\n\n' for i in range(count))


@pytest.fixture
def lookups(monkeypatch: pytest.MonkeyPatch) -> list[Path]:
    """Every file `including_root` is asked about, in order."""
    seen: list[Path] = []
    including_root = ledger_write.including_root

    def counted(file: Path) -> Path | None:
        seen.append(file)
        return including_root(file)

    monkeypatch.setattr(ledger_write, "including_root", counted)
    return seen


def test_many_unknown_accounts_look_for_the_root_once(tmp_path: Path, lookups: list[Path]) -> None:
    main = tmp_path / "main.bean"
    main.write_text('2000-01-01 open Assets:Bank USD\ninclude "big.bean"\n')
    (tmp_path / "big.bean").write_text(_unopened(ERRORS))
    before = main.read_bytes()

    with pytest.raises(ledger_write.CandidateRejected) as refused:
        ledger_write.append(main, [NOTE])

    assert lookups == [main]
    # The note adds nothing wrong: big.bean was already broken (w5/396).
    assert str(refused.value) == (
        f"The ledger already has {ERRORS} error(s); nothing was written. Pass --allow-errors to write anyway."
    )
    details = "\n".join(refused.value.details)
    assert "unknown account 'Expenses:Food'" in details
    assert f"Same problem on {ERRORS - 1} more lines" in details
    assert main.read_bytes() == before


def test_an_included_leaf_still_gets_the_root_hint_once(tmp_path: Path, lookups: list[Path]) -> None:
    (tmp_path / "main.bean").write_text('2000-01-01 open Assets:Bank USD\ninclude "big.bean"\n')
    leaf = tmp_path / "big.bean"
    leaf.write_text(_unopened(ERRORS))

    with pytest.raises(ledger_write.CandidateRejected) as refused:
        ledger_write.append(leaf, ['2021-03-01 note Expenses:Food "hi"'])

    # One climb for the whole write: the leaf's includer, then whether anything includes that root (w1/375).
    assert lookups == [leaf, tmp_path / "main.bean"]
    hints = [line for line in refused.value.details if "is included by" in line]
    # One per distinct unknown account (Expenses:Food, Assets:Bank), all alike.
    assert len(hints) == 2
    assert len(set(hints)) == 1
    assert "--into big.bean" in hints[0]


def test_a_write_without_unknown_accounts_never_looks(tmp_path: Path, lookups: list[Path]) -> None:
    main = tmp_path / "main.bean"
    main.write_text("2000-01-01 open Assets:Bank USD\n")

    ledger_write.append(main, [NOTE])

    assert lookups == []
    assert NOTE in main.read_text()
