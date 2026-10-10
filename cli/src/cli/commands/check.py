"""`bea check` — native bean-check, with bea's JSON envelope via the helper."""

from __future__ import annotations

import os
import re
import unicodedata
from pathlib import Path

import typer

from cli import context, output
from cli.engine import launch
from cli.errors import UsageError

_URL_INCLUDE_RE = re.compile(r'^\s*include\s+"https?://', re.MULTILINE)
"""An include line native bean-check cannot resolve (w1/m29).

A posting line can never match: account names cannot start with the lowercase
`include` keyword, and a `;` comment never has the keyword first. Close
enough to exact for routing the closure to the helper check.
"""

_PROSE_RE = re.compile(r'"(?:[^"\\]|\\.)*"|;[^\n]*|^\*[^\n]*', re.MULTILINE)
"""String literals, `;` comments, and org-mode `*` heading lines.

Their text never names an account, so bean-check reads it byte for byte
whatever its Unicode normalization; only the remaining tokens decide whether
NFC and NFD spellings could split one account in two (w1/054).
"""


def check(ctx: typer.Context) -> None:
    """Parse, check and realize a beancount ledger."""
    current = context.current()
    file = current.entry_file()
    compat = _closure_needs_compat(file)
    if compat is not None and not current.json_output:
        # Native bean-check cannot parse a BOM-marked file at all, reads
        # NFC and NFD spellings of one account as two accounts, and cannot
        # fetch URL includes, so these closures run the helper check in both
        # modes; bean-check-only flags cannot be forwarded to a run that
        # never starts upstream.
        if ctx.args:
            tokens = " ".join(ctx.args)
            reason, advice = compat
            raise UsageError(f"bea check cannot pass bean-check options ({tokens}) for this ledger: {reason}. {advice}")
        launch.helper_json(["check", "--file", str(file)])
        raise typer.Exit(0)
    if current.json_output:
        # Keep bea's documented JSON envelope; native --json is a different shape.
        # bean-check-only flags (-v, --auto, …) are not implemented on bea-engine
        # check — refuse them up front as usage, not as a false "engine did not answer".
        if ctx.args:
            tokens = " ".join(ctx.args)
            raise UsageError(
                f"bea --json check does not accept bean-check options ({tokens}). "
                "Drop --json to use native bean-check flags such as -v / --auto."
            )
        data = launch.helper_json(["check", "--file", str(file)])
        output.emit(data, target=output.file_target(file))
        return
    _refuse_cache_over_ledger(file, ctx.args)
    code = launch.run_native("bean-check", [str(file), *ctx.args])
    if code != 0:
        raise typer.Exit(code)
    # bean-check does not cover document paths that resolve outside the ledger tree;
    # the helper check does, so copies that still resolve against another tree fail.
    launch.helper_json(["check", "--file", str(file)])
    raise typer.Exit(0)


_CACHE_FLAG = "--cache-filename"
_CACHE_ENV = "BEANCOUNT_LOAD_CACHE_FILENAME"


def _refuse_cache_over_ledger(file: Path, args: list[str]) -> None:
    """Refuse a load-cache path that is one of the ledger's own files.

    Upstream's loader treats the cache path as disposable: a file there that
    does not unpickle is removed before the ledger is read, and `--no-cache`
    removes it unconditionally. Naming the root or an include — by any
    spelling, a `{filename}` pattern, a symlink or a hard link — therefore
    deleted the books during a validation. The path is derived exactly as
    `beancount.loader.get_cache_filename` derives it and compared by identity.
    """
    pattern, source = None, _CACHE_FLAG
    index = 0
    while index < len(args) and args[index] != "--":
        if args[index] == _CACHE_FLAG and index + 1 < len(args):
            pattern = args[index + 1]
            index += 1
        elif args[index].startswith(f"{_CACHE_FLAG}="):
            pattern = args[index].split("=", 1)[1]
        index += 1
    if not pattern:
        pattern, source = os.environ.get(_CACHE_ENV), _CACHE_ENV
    if not pattern:
        return
    try:
        cache = Path(os.path.join(os.path.dirname(os.path.abspath(file)), pattern).format(filename=file.name))
        members = output.ledger_closure(file)
    except (OSError, LookupError, ValueError):
        # A pattern upstream cannot format fails there before anything is removed.
        return
    for member in members:
        if output.same_file(cache, member):
            raise UsageError(
                f"{source} {pattern} names {member}, a file of the ledger being checked. bean-check deletes a "
                "cache file it cannot read, so this would delete the ledger. Choose a cache path outside the "
                "ledger's own files. Nothing was changed."
            )


def _closure_needs_compat(file: Path) -> tuple[str, str] | None:
    """Why the closure must skip native bean-check, or None when it can run it.

    A BOM-marked file fails upstream outright, mixed Unicode normalizations
    read as distinct accounts there, and URL includes cannot be fetched; the
    helper reads all three shapes. Pure NFC unmarked local closures keep
    native output byte for byte. Answers the reason plus what to do instead.
    """
    from cli.utils import has_bom

    strip_bom = "Run bea format -i to strip the mark, then retry."
    try:
        members = output.ledger_closure(file)
    except OSError:
        return None
    for member in members:
        if has_bom(member):
            return (
                "a file in its include closure starts with a UTF-8 BOM bean-check cannot parse",
                strip_bom,
            )
    for member in members:
        try:
            raw = member.read_bytes()
        except OSError:
            continue
        text = raw.decode("utf-8", errors="ignore")
        if not unicodedata.is_normalized("NFC", _PROSE_RE.sub("", text)):
            # format -i never renormalizes existing bytes, so it is no remedy here.
            return (
                f"{member} names an account or tag outside Unicode NFC, which bean-check reads "
                "as distinct from its NFC spelling",
                "Drop the bean-check options to check through the helper, "
                "or re-save the file in Unicode NFC, then retry.",
            )
        if _URL_INCLUDE_RE.search(text):
            return (
                "a file in its include closure names a URL include native bean-check cannot fetch",
                "Run without extra options to check through the helper.",
            )
    return None
