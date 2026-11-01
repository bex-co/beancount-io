"""The text primitives every ledger read or write needs before it touches a file."""

from __future__ import annotations

import datetime
import re
import unicodedata
import warnings
from collections.abc import Collection, Iterator, Mapping
from contextvars import ContextVar
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from bea_engine import protocol

#: Control characters that must never reach a ledger file or a terminal:
#: the C0 range apart from CR and LF (which become spaces just below), DEL,
#: and the C1 range. ESC is the one that matters — a crafted bank description
#: carrying `\x1b[1A\x1b[2K` erases the row printed above it, so an import
#: preview can show something other than what `--apply` will write.
#:
#: The Unicode bidirectional overrides, embeddings and isolates (U+202A–202E,
#: U+2066–2069) belong here for the same reason: a right-to-left override
#: ahead of an amount reorders how the rest of the row reads without one ESC
#: byte. Right-to-left *letters* carry their direction themselves and are
#: ordinary text, and the line and paragraph separators (U+2028/2029) are
#: string content that a write keeps exactly (w1/136).
CONTROL_CHARACTERS = re.compile(r"[\x00-\x09\x0b\x0c\x0e-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]")


def visible_escape(match: re.Match[str]) -> str:
    """One control character as `\\xNN`, or `\\uNNNN` when it is past Latin-1."""
    code = ord(match.group())
    return f"\\x{code:02x}" if code < 0x100 else f"\\u{code:04x}"


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
    return CONTROL_CHARACTERS.sub(visible_escape, re.sub(r"[\r\n]+", " ", text))


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


def bea_command(file: Path | str) -> str:
    """`bea`, with the `--file` it takes to reach `file` from the working directory.

    A remedy printed to be pasted must act on the ledger it is about: a bare
    `bea add open …` went through cwd discovery instead, and was refused, or
    opened the account in another `main.bean` while the import stayed blocked
    (w5/303). The bare form stays when discovery already finds this ledger.
    """
    import os
    import shlex

    target = Path(file)
    try:
        cwd = Path.cwd()
    except OSError:
        # A removed working directory: `Path.cwd()` raised, and the refusal
        # this remedy belongs to was lost behind a bare FileNotFoundError
        # (w5/837). The ledger's own path reaches it from anywhere.
        return f"bea --file {shlex.quote(str(target))}"
    if not os.environ.get("BEA_FILE"):
        for name in ("main.bean", "main.beancount"):
            if os.path.lexists(cwd / name):
                if (cwd / name).resolve() == target.resolve():
                    return "bea"
                break
    shown = os.path.relpath(target, cwd) if target.resolve().is_relative_to(cwd.resolve()) else str(target)
    return f"bea --file {shlex.quote(shown)}"


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
        f"{visible_escape(offender)} at offset {offender.start()}; nothing was written. "
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


def checked_operating_currencies(options: Mapping[str, Any]) -> list[str]:
    """The ledger's operating currencies, refusing one that is not a Beancount currency.

    Beancount accepts any string there, so `option "operating_currency" "usd"`
    passed `check` and then surfaced as `Missing prices for USD → usd`, a
    token error from `add`, or `column None` from `import` (w5/328). Callers
    ask only where they fall back to it, so an explicit currency still works.
    """
    currencies = [str(value) for value in options.get("operating_currency") or ()]
    for value in currencies:
        if is_commodity(value):
            continue
        where = _option_location(options, "operating_currency", value)
        suggestion = value.strip().upper()
        hint = f" Did you mean {suggestion!r}?" if is_commodity(suggestion) else ""
        raise protocol.UsageError(
            f'option "operating_currency" "{value}"{where} is not a Beancount currency: currencies are '
            f"uppercase, such as USD.{hint} Correct the option line."
        )
    return currencies


def _option_location(options: Mapping[str, Any], name: str, value: str) -> str:
    """` at FILE:LINE` for the option line setting `value`, or nothing when no file shows it."""
    from bea_engine.compat import UTF8_BOM

    line = re.compile(rf'^\s*option\s+"{re.escape(name)}"\s+"{re.escape(value)}"')
    for filename in options.get("include") or ():
        try:
            # The parser skips a leading mark, and `\s` does not match it: an
            # option on line 1 lost its location (w5/633).
            lines = lexer_lines(Path(filename).read_bytes().removeprefix(UTF8_BOM))
        except OSError:
            continue
        for number, text in enumerate(lines, start=1):
            if line.match(text.decode("utf-8", errors="replace")):
                return f" at {filename}:{number}"
    return ""


def require_tag(value: str) -> str:
    """One tag with or without `#`, stored bare, or a ValueError quoting the typed value."""
    return _require_tag_or_link(value, "#", "tag")


def require_link(value: str) -> str:
    """One link with or without `^`, stored bare, or a ValueError quoting the typed value."""
    return _require_tag_or_link(value, "^", "link")


def _require_tag_or_link(value: str, sigil: str, noun: str) -> str:
    body = value[1:] if value.startswith(sigil) else value
    if not _TAG_OR_LINK.fullmatch(body):
        raise ValueError(
            f"{value!r} is not one {noun}; use only ASCII letters, digits and - _ / . "
            f"after an optional leading {sigil} (no spaces, sigils or line breaks inside)."
        )
    return body


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


_POSIX_CLASS = re.compile(r"\[:[a-z]+:\]")


def regex_reads_otherwise(pattern: str, flags: int = 0) -> str | None:
    """Why Python's regex reads `pattern` other than as written, or None.

    `re` has no POSIX bracket classes: `[[:alpha:]]` is a set of `[`, `:` and
    letters, and Python only warns "Possible nested set" (to stderr, with its
    own source path) before matching something else, silently (w5/429). The
    same holds for a `[` inside a set and for `--`, `&&`, `~~` or `||` there.
    An invalid pattern is its caller's to report, so it answers None. The
    frontend keeps its own copy (`cli.utils.regex_reads_otherwise`).
    """
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        # A pattern compiled before in this process comes from the cache,
        # which never warns again.
        re.purge()
        try:
            re.compile(pattern, flags)
        except (re.error, OverflowError, RecursionError, MemoryError):
            # An invalid pattern is its caller's to report; a repetition too
            # large or nesting too deep to compile is invalid the same way
            # (w5/806).
            return None
    changed = next(
        (str(item.message) for item in caught if issubclass(item.category, (FutureWarning, DeprecationWarning))),
        None,
    )
    if changed is None:
        return None
    posix = _POSIX_CLASS.search(pattern)
    if posix is not None:
        return (
            f"{posix.group()} is a POSIX class, which Python's regex does not have: it reads it as a set of "
            "characters. Write [^\\W\\d_] for letters, \\d for digits or \\s for whitespace instead"
        )
    return (
        f"Python's regex reads it differently from what it says ({changed}). Escape a literal [ inside "
        "a set as \\[, and a doubled -, &, ~ or | there with backslashes"
    )


def decode_error_message(path: object, exc: UnicodeDecodeError, data: bytes | None = None) -> str:
    """A decode failure as path, byte offset, attempted encoding, and remedy.

    The frontend keeps its own copy (`cli.utils.decode_error_message`):
    neither side may import the other, and both have to report the same
    failure. Callers choose the category: a caller's input file is a usage
    error, an undecodable ledger is a validation error.

    Pass the raw bytes when the failing decode used `utf-8-sig`: the codec
    strips a leading BOM, so the offset is quoted against the raw bytes
    (w5/738). Callers decoding plain `utf-8` pass nothing — a BOM decodes
    there as an ordinary character, so their offsets are already raw.
    """
    from bea_engine.compat import UTF8_BOM

    base = len(UTF8_BOM) if data is not None and data.startswith(UTF8_BOM) else 0
    offset = exc.start + base
    return f"Cannot decode '{path}' as UTF-8: {exc.reason} at byte {offset}. Re-save the file as UTF-8 and retry."


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


_DEFAULT_ROOTS = ("Assets", "Liabilities", "Equity", "Income", "Expenses")


def root_name_options(text: str) -> dict[str, str]:
    """The root-name options accepted from source text, without parsing a ledger.

    Match the loader's BOM and Unicode handling, then use its lexer and option
    converter. Comments, quoted directive text and malformed option lines must
    not rename an account root; an invalid value keeps the last valid value.
    The insertion order follows each option's first valid appearance.
    """
    from beancount.parser.lexer import lex_iter_string
    from beancount.parser.options import options_validate_root_account

    named: dict[str, str] = {}

    def accept(tokens: list[tuple[str, Any]]) -> None:
        if [kind for kind, _ in tokens] != ["OPTION", "STRING", "STRING"]:
            return
        key, value = tokens[1][1], tokens[2][1]
        if key not in _ROOT_OPTIONS:
            return
        try:
            named[key] = options_validate_root_account(value)  # type: ignore[no-untyped-call]
        except ValueError:
            pass

    tokens: list[tuple[str, Any]] = []
    text = unicodedata.normalize("NFC", text.removeprefix("\ufeff"))
    for kind, _, _, value in lex_iter_string(text):  # type: ignore[no-untyped-call]
        if kind == "EOL":
            accept(tokens)
            tokens.clear()
        elif len(tokens) < 4:
            tokens.append((kind, value))
    accept(tokens)
    return named


def root_names_of(file: Path) -> tuple[str, ...]:
    """The five account roots a ledger's root file declares, read without loading it.

    For refusing an account under a root the ledger does not use before
    anything loads: `add open Expenses:X` on a ledger whose expenses root is
    `Aufwand` ended at Beancount's bare "Invalid account name" (w5/402).
    Beancount takes these options from the root file, the last valid one winning.
    """
    try:
        text = file.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return _DEFAULT_ROOTS
    named = root_name_options(text)
    return tuple(named.get(key) or default for key, default in zip(_ROOT_OPTIONS, _DEFAULT_ROOTS, strict=True))


def ledger_roots(options: Mapping[str, object]) -> tuple[str, ...]:
    """The five root account names a loaded ledger accepts (its `name_*` options)."""
    return tuple(str(options.get(key) or default) for key, default in zip(_ROOT_OPTIONS, _DEFAULT_ROOTS, strict=True))


def renamed_root_options(options: Mapping[str, object]) -> list[str]:
    """The `option "name_*"` lines that rename a ledger's roots, as the root file states them.

    Beancount applies these per file while parsing, so an included file reads
    the default roots unless it repeats them (w5/462).
    """
    return [
        f'option "{key}" "{name}"'
        for key, name, default in zip(_ROOT_OPTIONS, ledger_roots(options), _DEFAULT_ROOTS, strict=True)
        if name != default
    ]


#: Plugins that report an account opened but not yet used; `pedantic` bundles `nounused`.
_UNUSED_ACCOUNT_PLUGINS = frozenset({"beancount.plugins.nounused", "beancount.plugins.pedantic"})


def reports_unused_accounts(options: Mapping[str, object]) -> bool:
    """Whether the ledger loads `nounused`, under which an `open` is an error until something uses the account."""
    plugins = options.get("plugin")
    return isinstance(plugins, list) and any(plugin[0] in _UNUSED_ACCOUNT_PLUGINS for plugin in plugins)


def without_root_name_errors(errors: list[Any]) -> list[Any]:
    """A standalone parse's errors, minus the ones only the ledger's options can judge.

    `parser.parse_string` on a rendered directive runs with default options,
    so on a ledger that renames its roots (`option "name_expenses" "Aufwand"`)
    every account in it reads as `Invalid account name`. A probe that checks
    how text will reload is asking about syntax; whether a root exists is
    decided by the whole-ledger validation every write goes through next.
    """
    from beancount.parser.grammar import ParserError

    return [
        error
        for error in errors
        if not (isinstance(error, ParserError) and error.message.startswith("Invalid account name:"))
    ]


def _loads_as_account(name: str) -> bool:
    """Whether the loader reads ``name`` as one account, by its own two steps.

    The lexer takes any non-ASCII character inside a segment, and the grammar
    then matches the account pattern from the start without anchoring the end,
    so `Expenses:Kค่า` — whose tone mark is neither a letter nor a digit —
    loads, opens and reports. `is_valid` anchors both ends and refuses it.

    The lexer would take a C1 control or a bidirectional override the same
    way; those stay refused, as everywhere else a write is checked.
    """
    import regex
    from beancount.core.account import ACCOUNT_RE
    from beancount.parser.lexer import lex_iter_string

    try:
        encoded = name.encode("utf-8")
    except UnicodeEncodeError:
        return False
    if CONTROL_CHARACTERS.search(name):
        return False
    tokens = [(kind, text) for kind, _, text, _ in lex_iter_string(encoded)]  # type: ignore[no-untyped-call]
    return tokens == [("ACCOUNT", encoded)] and regex.match(ACCOUNT_RE, name) is not None


def _refused_character(name: str) -> str:
    """A sentence naming the first character no account name may hold, or nothing.

    Empty when every character is allowed and it is their arrangement that
    fails — a lowercase root, a segment that starts with a mark.
    """
    for character in name:
        if character in ":-" or (character.isascii() and character.isalnum()):
            continue
        if (
            character.isascii()
            or character.isspace()
            or CONTROL_CHARACTERS.match(character)
            or "\ud800" <= character <= "\udfff"
        ):
            label = unicodedata.name(character, "")
            return f" The character U+{ord(character):04X}{f' ({label})' if label else ''} is not allowed."
    return ""


def escape_format_characters(text: str) -> str:
    """Make invisible Unicode format characters visible in a diagnostic."""
    return "".join(
        ascii(character)[1:-1] if unicodedata.category(character) == "Cf" else character for character in text
    )


def new_account_format_problem(name: str) -> str | None:
    """Why creating this name would introduce an invisible account distinction."""
    for character in name:
        if unicodedata.category(character) == "Cf":
            label = unicodedata.name(character, "FORMAT CHARACTER")
            return (
                f"Invalid account {name!r}. The character U+{ord(character):04X} ({label}) is not allowed. "
                "New account names cannot contain format characters; retype the name without them."
            )
    return None


#: Accounts the ledger being written already opens, set around an import (w5/928).
OPENED_ACCOUNTS: ContextVar[frozenset[str]] = ContextVar("opened_accounts", default=frozenset())


def parse_account(name: str, roots: Collection[str] | None = None, *, creating: bool = False) -> str:
    """Validate an account name the way the loader will, or explain the rules.

    Engine-side because only Beancount knows what a valid account is: the root
    names are ledger options and the segment rules are its own. The name is
    NFC-normalized first, because the loader reads the ledger NFC-normalized
    and `is_valid` rejects the identical NFD spelling outright.

    `is_valid` alone is stricter than the loader (w5/203): a ledger could open
    an account, pass `check` and report on it, and `add` then refused to post
    to it. A name `is_valid` refuses is therefore put to the loader itself.

    Both check only the shape, so `Foo:Bar` passes and then every
    `open` for it fails to load. With the ledger's ``roots`` the root is
    checked too, so a caller can refuse the name instead of suggesting an
    `add open` that can never succeed.

    The roots are the root file's: Beancount applies `name_*` per file as it
    parses, so an included file may keep roots the main file renamed. An
    account the ledger already opens is still usable under its own spelling
    (`OPENED_ACCOUNTS`), though its root is not among the main file's; a name
    it never opens keeps the root check (w5/928).
    """
    from beancount.core.account import is_valid

    name = unicodedata.normalize("NFC", name)
    # Existing loader-valid names remain usable, including ZWJ/ZWNJ in scripts
    # that need them. New opens must not introduce invisible distinctions.
    if creating and (problem := new_account_format_problem(name)) is not None:
        raise protocol.UsageError(problem)
    # The lexer reads a no-break space inside an account token, so the loader
    # accepts `Expenses:Food\xa05`; an invisible character in a name is never
    # meant (w5/490).
    if any(character.isspace() for character in name) or (not is_valid(name) and not _loads_as_account(name)):
        raise protocol.UsageError(
            f"Invalid account {name!r}. Account names use colon-separated segments, such as Assets:Checking. "
            "The root starts with an uppercase letter; each subaccount starts with an uppercase letter or digit. "
            "Use letters, digits and hyphens within segments. Standard roots are "
            "Assets, Liabilities, Equity, Income and Expenses; configured root names are also supported."
            + _refused_character(name)
        )
    if roots is not None and name.split(":", 1)[0] not in roots and name not in OPENED_ACCOUNTS.get():
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


def lexer_lines(content: bytes) -> list[bytes]:
    """The file's lines as Beancount's lexer numbers them: split on `\\n` alone.

    `bytes.splitlines()` also breaks on a lone `\\r`, so a stray carriage
    return (pasted text, `\\r\\r\\n` endings) made a file look longer than
    the lexer counts it. The entry being appended then sat inside the
    "original" range: its balance failure was blamed on a plugin, its errors
    lost `Proposed append (not written)`, and a staged pad's `Unused Pad` was
    no longer exempt (w5/380). The reader counts this way since w5/169, and
    the managed-include rewrites since w5/475.
    """
    lines = content.split(b"\n")
    if lines and lines[-1] == b"":
        lines.pop()
    return lines


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
    for line in lexer_lines(content):
        starts.append(starts[-1] + len(line) + 1)
    pending = False
    for kind, line, text, value in lex_iter_string(content):  # type: ignore[no-untyped-call]
        if pending and kind == "STRING":
            # The lexer reports a string that spans lines at its last line.
            start = content.find(text, starts[max(0, line - 1 - text.count(b"\n"))])
            if start < 0:
                raise protocol.UsageError("Cannot locate an include path in the ledger.")
            yield IncludeSpan(start, start + len(text), line, value)
        pending = kind == "INCLUDE"


def physical_lines(text: str) -> list[str]:
    """The lines of `text` as the lexer counts them: split at `\\n` alone, each keeping its terminator.

    `str.splitlines` also breaks at U+2028, U+2029, form feeds and the like,
    which are ordinary characters in a quoted memo and made a patch describe
    lines the file does not have (w5/1115, w5/1116).
    """
    parts = text.split("\n")
    lines = [f"{part}\n" for part in parts[:-1]]
    if parts[-1]:
        lines.append(parts[-1])
    return lines


def unified_file_diff(text: str, new_text: str, name: str, *, bom: bool = False) -> str:
    """A unified diff that applies to the file it describes.

    It reads the file's physical lines, keeps a leading byte-order mark on the
    first line when `bom` says the file has one, and marks a last line without
    a terminator with `\\ No newline at end of file`, as Git does.
    """
    import difflib

    if bom:
        text, new_text = "\ufeff" + text, "\ufeff" + new_text
    out = []
    for line in difflib.unified_diff(physical_lines(text), physical_lines(new_text), fromfile=name, tofile=name):
        out.append(line if line.endswith("\n") else f"{line}\n\\ No newline at end of file\n")
    return "".join(out)
