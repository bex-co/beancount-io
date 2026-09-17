"""The text primitives every ledger read or write needs before it touches a file."""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

from bea_engine import protocol


def single_line(text: str) -> str:
    """Keep text readable as one ledger field, preserving other whitespace.

    The frontend has its own copy for table cells (`cli.utils.single_line`).
    Neither side can import the other, and this one is here because it is part
    of what gets written to the ledger, not part of how anything is displayed.
    """
    return re.sub(r"[\r\n]+", " ", text)


def fold_account(name: str) -> str:
    """The key two account names must share to match in a filter.

    Account names reach bea in whichever Unicode normalization their source
    produced — macOS filesystem paths hand out NFD, most editors write NFC —
    and the two are canonically equivalent: the same text in different code
    points, rendered identically. Compared raw, a filter silently misses the
    account the user is looking straight at.

    NFC rather than NFD because these keys are matched as substrings, and NFC
    keeps an accented letter a single code point, so a substring boundary falls
    where a reader sees one. Folding runs between the two normalizations
    because folding can itself denormalize.

    The frontend keeps its own copy (`cli.utils.fold_account`): neither side
    may import the other, and both have to compare the same names.
    """
    return unicodedata.normalize("NFC", unicodedata.normalize("NFC", name).casefold())


def decode_error_message(path: object, exc: UnicodeDecodeError) -> str:
    """A decode failure as path, byte offset, attempted encoding, and remedy.

    The frontend keeps its own copy (`cli.utils.decode_error_message`):
    neither side may import the other, and both have to report the same
    failure. Callers choose the category: a caller's input file is a usage
    error, an undecodable ledger is a validation error.
    """
    return f"Cannot decode '{path}' as UTF-8: {exc.reason} at byte {exc.start}. Re-save the file as UTF-8 and retry."


def syntax_errors(path: Path) -> list[str]:
    """Syntax errors in one file, without following includes or validating semantics.

    A transactions-only child parses clean — its accounts open elsewhere — so
    this gates formatting on what bean-format can meaningfully align, not on
    what `check` would accept. An unreadable file reports that instead of
    raising, so one bad path cannot fail a whole batch.
    """
    from beancount.parser import parser

    from bea_engine.query import format_error

    try:
        _, errors, _ = parser.parse_file(str(path))
    except (OSError, UnicodeError) as exc:
        return [f"{path}: cannot read file ({exc.strerror if isinstance(exc, OSError) else exc})."]
    return [format_error(error) for error in errors]


def parse_account(name: str) -> str:
    """Validate an account name the way the loader will, or explain the rules.

    Engine-side because only Beancount knows what a valid account is: the root
    names are ledger options and the segment rules are its own. The name is
    NFC-normalized first, because the loader reads the ledger NFC-normalized
    and `is_valid` rejects the identical NFD spelling outright.
    """
    from beancount.core.account import is_valid

    name = unicodedata.normalize("NFC", name)
    if not is_valid(name):
        raise protocol.UsageError(
            f"Invalid account {name!r}. Account names use colon-separated segments, such as Assets:Checking. "
            "The root starts with an uppercase letter; each subaccount starts with an uppercase letter or digit. "
            "Use letters, digits and hyphens within segments. Standard roots are "
            "Assets, Liabilities, Equity, Income and Expenses; configured root names are also supported."
        )
    return name


@dataclass(frozen=True)
class IncludeSpan:
    """One `include` target with its byte span and 1-based line in the file."""

    start: int
    end: int
    line: int
    target: str


def iter_includes(content: bytes) -> Iterator[IncludeSpan]:
    """Every include target the lexer sees, with spans for rewriting.

    Lexer-based rather than line-based, so an `include` inside a comment or a
    quoted string is not mistaken for a directive. Byte spans stay valid for
    splicing rewritten targets back into `content`.
    """
    from beancount.parser.lexer import lex_iter_string

    from bea_engine.compat import UTF8_BOM

    if content.startswith(UTF8_BOM):
        # A BOM glued to a first-line `include` lexes as an error token;
        # spaces keep the byte offsets below valid while restoring the keyword.
        content = b"   " + content[len(UTF8_BOM) :]
    starts = [0]
    for line in content.splitlines(keepends=True):
        starts.append(starts[-1] + len(line))
    pending = False
    for kind, line, text, value in lex_iter_string(content):  # type: ignore[no-untyped-call]
        if pending and kind == "STRING":
            start = content.find(text, starts[line - 1])
            if start < 0:
                raise protocol.UsageError("Cannot locate an include path in the ledger.")
            yield IncludeSpan(start, start + len(text), line, value)
        pending = kind == "INCLUDE"
