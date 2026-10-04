"""The text primitives every ledger read or write needs before it touches a file."""

from __future__ import annotations

import datetime
import re
import unicodedata
from collections.abc import Collection, Iterator, Mapping
from dataclasses import dataclass
from pathlib import Path

from bea_engine import protocol

#: Control characters that must never reach a ledger file or a terminal:
#: the C0 range apart from CR and LF (which become spaces just below), DEL,
#: and the C1 range. ESC is the one that matters — a crafted bank description
#: carrying `\x1b[1A\x1b[2K` erases the row printed above it, so an import
#: preview can show something other than what `--apply` will write.
CONTROL_CHARACTERS = re.compile(r"[\x00-\x09\x0b\x0c\x0e-\x1f\x7f-\x9f]")


def single_line(text: str) -> str:
    """Keep text readable as one ledger field, and inert as one terminal line.

    Runs of CR/LF become a space, so a pasted multi-line value cannot write a
    directive that breaks the file. Every other control character is escaped to
    a visible `\\xNN` rather than deleted: the text came from somewhere — a bank
    export, a paste — and silently dropping bytes would hide that it contained
    something odd, while leaving them in lets untrusted input drive the
    reviewer's terminal.

    Tabs are escaped along with the rest. This function's job is to make a
    value occupy exactly one line of layout, and a tab is layout control: it
    shifts a table cell to the next tab stop as surely as a cursor sequence
    would.

    The frontend has its own copy for table cells (`cli.utils.single_line`).
    Neither side can import the other, so the two must be kept in step; a test
    pins that they agree.
    """
    return CONTROL_CHARACTERS.sub(lambda m: f"\\x{ord(m.group()):02x}", re.sub(r"[\r\n]+", " ", text))


ISO_DATE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")
"""The one date spelling write input accepts.

`date.fromisoformat` also reads ISO basic (`20260201`) and week dates
(`2026-W05-7`), and Pydantic reads numeric strings as Unix timestamps, so
a typo could silently become another day. The frontend's `parse_date`
holds flags to the same rule.
"""


def parse_iso_date(text: str) -> datetime.date:
    """A `YYYY-MM-DD` calendar date, or ValueError naming the expected form."""
    if ISO_DATE.fullmatch(text):
        try:
            return datetime.date.fromisoformat(text)
        except ValueError:
            pass
    raise ValueError(f"date {text!r} must be a calendar date in YYYY-MM-DD form, such as '2026-02-01'.")


def outside_ledger_tree(path: Path, root: Path) -> bool:
    """Whether a document path resolves outside the root ledger's directory.

    The one containment rule for `add document` (before writing) and `check`
    (after loading): a path that leaves the tree — by `..` as much as by being
    absolute — stops resolving once the ledger directory is copied elsewhere.
    """
    try:
        path.resolve().relative_to(root.resolve())
    except ValueError:
        return True
    return False


def refuse_control_characters(text: str, *, what: str) -> None:
    """Refuse raw directive text that carries a control character.

    The field-by-field writers escape their input through `single_line`, so no
    control byte can reach a ledger file through `bea add`. Raw text — what
    `bea ask` hands the append path — has no fields to escape: it *is* the file
    content, and escaping it would silently rewrite the very bytes the user was
    shown and asked to approve. So this path refuses instead, which keeps the
    invariant ("no C0/C1 in a ledger file") without ever writing something
    other than what was consented to.

    Tabs, LF and CR are the exceptions: they are the whitespace a ledger is
    allowed to be indented and broken with. Everything else `CONTROL_CHARACTERS`
    covers — ESC above all — is rejected, naming the offending byte and offset
    so the caller can see what was in its input.
    """
    offender = next((m for m in CONTROL_CHARACTERS.finditer(text) if m.group() != "\t"), None)
    if offender is None:
        return
    raise protocol.UsageError(
        f"Write rejected: {what} contains the control character "
        f"\\x{ord(offender.group()):02x} at offset {offender.start()}; nothing was written. "
        "Ledger text may only use ordinary characters, tabs and newlines."
    )


#: Beancount's lexer rules for the fields a directive writes as one bare token
#: (`lexer.l`): a tag or link body after its sigil, and a commodity — a capital
#: letter or a slash, then capitals, digits and `'._-`, ending alphanumeric.
#: These fields are printed unquoted, so a value outside the grammar is not
#: one token: `a ^b` becomes a tag and a link, and a line break starts a
#: directive the caller never asked for.
_TAG_OR_LINK = re.compile(r"[A-Za-z0-9\-_/.]+")
_COMMODITY = re.compile(r"[A-Z](?:[A-Z0-9'._-]*[A-Z0-9])?|/[A-Z0-9'._-]*[A-Z](?:[A-Z0-9'._-]*[A-Z0-9])?")
#: A flag is one of these characters, a capital letter, or the `txn` keyword.
_FLAGS = frozenset("*!&#?%ABCDEFGHIJKLMNOPQRSTUVWXYZ")


def is_commodity(text: str) -> bool:
    """Whether the text is exactly one Beancount commodity token."""
    return bool(_COMMODITY.fullmatch(text))


def require_tag_or_link(value: str) -> str:
    """One tag or link body, or a ValueError naming the allowed characters."""
    if not _TAG_OR_LINK.fullmatch(value):
        raise ValueError(
            f"{value!r} is not one tag or link; use only letters, digits and - _ / . "
            "after an optional leading # or ^ (no spaces, sigils or line breaks inside)."
        )
    return value


def require_commodity(value: str) -> str:
    """One commodity token, or a ValueError giving examples of the grammar."""
    if not is_commodity(value):
        raise ValueError(
            f"{value!r} is not one commodity; use capital letters and digits, optionally "
            "with ' . _ - inside, such as USD, VFINX, NT.TO or /6J."
        )
    return value


def require_flag(value: str) -> str:
    """One transaction or posting flag; the `txn` keyword is stored as `*`, as Beancount does."""
    if value == "txn":
        return "*"
    if value not in _FLAGS:
        raise ValueError(f"{value!r} is not a flag; use one of * ! & # ? % or a single capital letter.")
    return value


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

    Turkish dotted `İ` and dotless `ı` fold to plain `i` first (w1/132):
    `casefold` turns `İ` into `i` plus a combining dot and leaves `ı` alone,
    so `istanbul` never matched `İSTANBUL` — while `re.IGNORECASE`, which
    import rules and report account filters use, treats them as equal.

    The frontend keeps its own copy (`cli.utils.fold_account`): neither side
    may import the other, and both have to compare the same names.
    """
    turkish = unicodedata.normalize("NFC", name).replace("İ", "i").replace("ı", "i")
    return unicodedata.normalize("NFC", turkish.casefold().replace("i\u0307", "i"))


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


_ROOT_OPTIONS = ("name_assets", "name_liabilities", "name_equity", "name_income", "name_expenses")


def ledger_roots(options: Mapping[str, object]) -> tuple[str, ...]:
    """The five root account names a loaded ledger accepts (its `name_*` options)."""
    defaults = ("Assets", "Liabilities", "Equity", "Income", "Expenses")
    return tuple(str(options.get(key) or default) for key, default in zip(_ROOT_OPTIONS, defaults, strict=True))


def parse_account(name: str, roots: Collection[str] | None = None) -> str:
    """Validate an account name the way the loader will, or explain the rules.

    Engine-side because only Beancount knows what a valid account is: the root
    names are ledger options and the segment rules are its own. The name is
    NFC-normalized first, because the loader reads the ledger NFC-normalized
    and `is_valid` rejects the identical NFD spelling outright.

    `is_valid` checks only the shape, so `Foo:Bar` passes it and then every
    `open` for it fails to load. With the ledger's ``roots`` the root is
    checked too, so a caller can refuse the name instead of suggesting an
    `add open` that can never succeed.
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
    if roots is not None and name.split(":", 1)[0] not in roots:
        raise protocol.UsageError(unknown_root_message(name, roots))
    return name


def unknown_root_message(name: str, roots: Collection[str]) -> str:
    root = name.split(":", 1)[0]
    return (
        f"Account {name!r} has root {root!r}, which this ledger does not use; its roots are "
        f"{', '.join(roots)} (set by the name_* options). Use one of those roots."
    )


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
