from __future__ import annotations

import asyncio
import os
import random
import shutil
import stat
import unicodedata
from collections.abc import Callable
from pathlib import Path
from typing import TYPE_CHECKING, Any

from prompt_toolkit import PromptSession
from prompt_toolkit.formatted_text import FormattedText
from prompt_toolkit.history import FileHistory, History, InMemoryHistory
from prompt_toolkit.key_binding import KeyBindings
from prompt_toolkit.styles import Style
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

if TYPE_CHECKING:
    from pydantic_ai import Agent

    from cli.ask.agent import BqlDeps

from cli import output
from cli.ask.render import answer_console, answer_markdown
from cli.config import history_path
from cli.context import env_flag
from cli.errors import AuthError, BeaError
from cli.utils import inert_text

_STYLE = Style.from_dict(
    {
        "separator": "#555555",
        "arrow": "bold",
        "placeholder": "#666666 italic",
        "bottom-toolbar": "noreverse bg:default #555555 nounderline",
    }
)

_PLACEHOLDER_HINTS = [
    'Try "what is my net worth?"',
    'Try "show my top expenses last month"',
    'Try "which accounts have the highest balance?"',
    'Try "summarize my income vs expenses"',
    'Try "list all open accounts"',
    'Try "add a coffee expense of 5 USD today"',
    'Try "record a salary income of 3000 USD"',
]

console = Console()


def _sep() -> str:
    return "─" * shutil.get_terminal_size().columns


def _prompt_tokens() -> FormattedText:
    return FormattedText(
        [
            ("class:separator", _sep() + "\n"),
            ("class:arrow", "❯ "),
        ]
    )


def _toolbar_tokens() -> FormattedText:
    return FormattedText(
        [
            ("class:bottom-toolbar", f"{_sep()}\n ? for help  ·  ↑↓ history  ·  Ctrl-D to exit\n\n"),
        ]
    )


def _history() -> History:
    """Where typed questions are kept: an owner-only file, or nowhere under `BEA_NO_ASK_HISTORY`.

    Questions are about the user's finances and may hold pasted account
    numbers, yet prompt_toolkit created the file at `0666 & ~umask` in a
    default-mode directory — readable by any local user, with no way to turn
    it off (w5/455). It is created `0600` in a `0700` directory, as
    `credentials.json` is, before prompt_toolkit opens it.
    """
    if env_flag("BEA_NO_ASK_HISTORY"):
        return InMemoryHistory()
    history_file = history_path()
    directory = history_file.parent
    directory.mkdir(parents=True, exist_ok=True)
    directory.chmod(stat.S_IRWXU)
    # Never through a link or into anything but a regular file: a linked
    # history had its target chmodded and every question appended to it,
    # outside the config directory, and a FIFO there hung the prompt (w5/810).
    flags = os.O_WRONLY | os.O_CREAT | os.O_APPEND | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0)
    try:
        fd = os.open(history_file, flags, stat.S_IRUSR | stat.S_IWUSR)
    except OSError:
        return _history_in_memory(history_file)
    try:
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            return _history_in_memory(history_file)
        if hasattr(os, "fchmod"):
            os.fchmod(fd, stat.S_IRUSR | stat.S_IWUSR)
        else:
            # Windows has no fchmod; chmod by name leaves the file writable, the one bit it keeps.
            os.chmod(history_file, stat.S_IRUSR | stat.S_IWUSR)
    finally:
        os.close(fd)
    return FileHistory(str(history_file))


def _history_in_memory(history_file: Path) -> History:
    output.note(
        f"{history_file} is not a regular file bea can keep, so this session's questions are kept in memory "
        "only. Remove it to keep history again."
    )
    return InMemoryHistory()


def _make_session(hint: str, key_bindings: KeyBindings | None = None) -> PromptSession[str]:
    return PromptSession(
        message=_prompt_tokens,
        bottom_toolbar=_toolbar_tokens,
        placeholder=FormattedText([("class:placeholder", f" {hint}")]),
        history=_history(),
        style=_STYLE,
        mouse_support=False,
        key_bindings=key_bindings,
    )


def _ask_write_permission(count: int = 1) -> str:
    """Arrow-key navigable selector. Returns y/n/a/d.

    It starts on "No", and each option's number and letter move the selection
    to it: the panel listed "2. No", but only arrows, `j`/`k` and Enter were
    bound, so typing `n` or `2` and Enter approved the highlighted default,
    "Yes" (w5/453). The panel is the only gate before AI text reaches the
    ledger, so no key someone types to mean "no" approves.
    """
    from prompt_toolkit import Application
    from prompt_toolkit.layout import Layout
    from prompt_toolkit.layout.containers import Window
    from prompt_toolkit.layout.controls import FormattedTextControl
    from prompt_toolkit.styles import Style as PtStyle

    options = [
        ("Yes", "y", "Append this directive to the ledger" if count == 1 else f"Append these {count} directives"),
        ("No", "n", "Skip this write"),
        ("Yes to all", "a", "Approve all remaining writes this session"),
        ("Deny all", "d", "Reject all remaining writes this session"),
    ]
    selected = [1]

    def get_tokens() -> FormattedText:
        items: list[tuple[str, str]] = []
        for i, (label, _, description) in enumerate(options):
            if i == selected[0]:
                items += [
                    ("class:arrow", "❯ "),
                    ("class:num", f"{i + 1}. "),
                    ("class:title-sel", f"{label}\n"),
                    ("class:desc", f"     {description}\n"),
                ]
            else:
                items += [
                    ("", "  "),
                    ("class:num", f"{i + 1}. "),
                    ("class:title", f"{label}\n"),
                    ("class:desc", f"     {description}\n"),
                ]
        return FormattedText(items)

    kb = KeyBindings()

    @kb.add("up")
    @kb.add("k")
    def _up(event: Any) -> None:
        selected[0] = (selected[0] - 1) % len(options)

    @kb.add("down")
    @kb.add("j")
    def _down(event: Any) -> None:
        selected[0] = (selected[0] + 1) % len(options)

    def _choose(index: int) -> Callable[[Any], None]:
        def choose(event: Any) -> None:
            selected[0] = index

        return choose

    for index, (_, letter, _) in enumerate(options):
        kb.add(str(index + 1))(_choose(index))
        kb.add(letter)(_choose(index))

    @kb.add("enter")
    def _confirm(event: Any) -> None:
        event.app.exit(result=options[selected[0]][1])

    @kb.add("c-c")
    def _cancel(event: Any) -> None:
        event.app.exit(result="n")

    pt_style = PtStyle.from_dict(
        {
            "arrow": "bold cyan",
            "num": "bold",
            "title-sel": "bold cyan",
            "title": "bold",
            "desc": "#666666",
        }
    )
    app: Application[str] = Application(
        layout=Layout(Window(FormattedTextControl(get_tokens, focusable=False), height=len(options) * 2)),
        key_bindings=kb,
        style=pt_style,
        full_screen=False,
        mouse_support=False,
    )
    return app.run()


def _visible_format(text: str) -> str:
    """Show each invisible format character (`Cf`: zero-width space, soft hyphen, BOM, …) as `\\uNNNN`.

    The panel is the only gate between AI-proposed text and the books: a
    zero-width space in an account name was on screen as nothing (w5/847).
    """
    return "".join(f"\\u{ord(ch):04x}" if unicodedata.category(ch) == "Cf" else ch for ch in text)


def make_confirm_fn(active_status: list[Any]) -> Callable[[str, str, list[str], dict[str, Any]], str]:
    """Return a callback that stops the spinner, shows the panel, and runs arrow-key selection.

    Everything on the panel comes from the engine's dry run of the write that is
    about to happen — the destination it resolved, the text it parsed — and every
    model-controlled byte on it goes through `inert_text` first. The panel is the
    only gate between AI-proposed text and the user's books, so it must show
    exactly what will be written, and nothing it shows may move the cursor.

    The destination is a body line rather than the frame title because Rich trims
    a title to the frame width without an ellipsis: at 100 columns an absolute
    path was silently cut mid-name, so the one fact the user is consenting to was
    unreadable.
    """

    def confirm(directive: str, target: str, warnings: list[str], proposal: dict[str, Any] | None = None) -> str:
        proposal = proposal or {}
        count = int(proposal.get("count") or 1)
        if s := active_status[0]:
            s.stop()
        console.print()
        content = Text()
        what = "this directive" if count == 1 else f"these {count} directives"
        content.append(f"Allow the AI to append {what} to your ledger?\n\n", style="dim")
        content.append("File: ", style="dim")
        content.append(inert_text(target), style="bold")
        if proposal.get("created"):
            content.append(" (new file, created by this write)", style="dim")
        content.append("\n\n")
        # A new include starts with the root's `name_*` options; they are
        # written too, so they are shown with what follows them.
        content.append(_visible_format(inert_text(str(proposal.get("seed") or "") + directive)), style="green")
        for warning in warnings:
            content.append(f"\n\nWarning: {inert_text(warning)}", style="yellow")
        console.print(
            Panel(
                content,
                title="[yellow]Confirm AI write[/yellow]",
                border_style="yellow",
                padding=(0, 1),
            )
        )
        result = _ask_write_permission(count)
        if s := active_status[0]:
            s.start()
        return result

    return confirm


def print_welcome() -> None:
    console.print("\n[bold]Beancount.io Ask[/bold]")
    console.print("[dim]Multi-turn conversation with your ledger. Type /exit to quit.[/dim]")


def run_repl(agent: Agent[BqlDeps, str], deps: BqlDeps, *, default_input: str | None = None) -> None:
    from pydantic_ai import capture_run_messages

    from cli.ask.agent import (
        WritePermission,
        _naming_writes,
        begin_turn,
        cut_off_notice,
        translated_failures,
        usage_limits,
        written_so_far,
    )

    hint = random.choice(_PLACEHOLDER_HINTS)
    first_turn = [True]
    active_status: list[Any] = [None]

    deps.write_permission = WritePermission(confirm_fn=make_confirm_fn(active_status))

    kb = KeyBindings()

    @kb.add("tab")
    def _fill_hint(event: Any) -> None:
        buf = event.app.current_buffer
        if first_turn[0] and not buf.text:
            buf.insert_text(hint)

    session = _make_session(hint, key_bindings=kb)
    messages: list[Any] = []
    # Every turn runs on this one loop. The prompt between turns runs its own
    # and clears the current one, so `run_sync` made a new loop per turn while
    # the cached HTTP client kept the last turn's keep-alive connection, bound
    # to the old loop: reading the reply failed, the SDK retried on a new
    # connection, and the question was sent, and billed, twice (w5/545).
    turn_loop = asyncio.new_event_loop()
    try:
        while True:
            try:
                ph = FormattedText([("class:placeholder", f" {hint}")]) if first_turn[0] else FormattedText([])
                user_input = session.prompt(
                    default=default_input or "" if first_turn[0] else "", placeholder=ph
                ).strip()
            except KeyboardInterrupt:
                # What the session's own help and toolbar promise: Ctrl-C clears the
                # line (prompt-toolkit has already discarded the buffer) and Ctrl-D
                # exits. Sharing one handler made the key people press to abandon a
                # half-typed question throw the whole conversation away.
                continue
            except EOFError:
                console.print("\n[dim]Goodbye.[/dim]")
                break
            if not user_input:
                continue
            first_turn[0] = False
            if user_input.lower() in {"exit", "quit", "/exit", "/quit"}:
                console.print("[dim]Goodbye.[/dim]")
                break
            if user_input.lower() in {"?", "/help", "help"}:
                _print_help()
                continue
            # Both bound before the turn starts, so a Ctrl-C inside the spinner
            # startup still reports (w5/734).
            status: Any = None
            turn: list[Any] = []
            try:
                begin_turn(deps)
                status = console.status("", spinner="dots")
                active_status[0] = status
                status.start()
                # The spinner is stopped before any arm below prints: a live display
                # left running would overwrite the line it is reporting on.
                try:
                    with capture_run_messages() as turn, translated_failures(deps):
                        asyncio.set_event_loop(turn_loop)
                        try:
                            result = agent.run_sync(
                                user_input,
                                deps=deps,
                                message_history=messages,
                                usage_limits=usage_limits(),
                            )
                        finally:
                            asyncio.set_event_loop(None)
                finally:
                    status.stop()
                    active_status[0] = None
            except KeyboardInterrupt:
                # A turn costs one Ctrl-C, not the session. `messages` is left as it
                # was before the turn, so the next question still carries the history
                # — and keeps this turn too if it wrote to the ledger. The spinner
                # startup sits inside the turn for the same reason: a Ctrl-C there
                # cancelled the session with exit 130 (w5/734). Stopping what never
                # started is a no-op; a start interrupted halfway still unwinds.
                if status is not None:
                    status.stop()
                active_status[0] = None
                deps.cancel_event.set()
                # An approved write landing now still records first: the report
                # below must name it. Queued workers see the flag and return
                # without a panel or a write, and none outlives the turn to
                # draw over the next prompt or hold the process open (w5/731).
                with deps.write_lock:
                    pass
                messages = _history_after_a_failed_turn(messages, turn, deps)
                done = f": {inert_text(written_so_far(deps))}" if deps.writes else ""
                # Text, not markup: the file name is not ours to have interpreted.
                console.print(Text(f"\n(cancelled{done})", style="dim"))
                continue
            except AuthError as exc:
                # The one failure worth ending on: the credential is rejected, so
                # every later turn would fail the same way and the remedy is outside
                # the session. Raising keeps the documented exit code 3.
                console.print()
                raise exc
            except Exception as exc:
                # Anything else costs this turn only — a 5xx from the proxy, a tool
                # the model cannot get right, the per-question budget. Before this,
                # one such failure ended the process and discarded the conversation.
                messages = _history_after_a_failed_turn(messages, turn, deps)
                console.print()
                if not isinstance(exc, BeaError):
                    # Translated failures already name this turn's writes; one no
                    # arm translates reaches here bare (w5/744).
                    exc = _naming_writes(exc, deps)
                output.failure(exc)
                continue
            messages = list(result.all_messages())
            console.print()
            answer_console(result.output).print(answer_markdown(result.output))
            notice = cut_off_notice(result)
            if notice is not None:
                console.print(Text(notice, style="yellow"))
    finally:
        turn_loop.close()


def _history_after_a_failed_turn(before: list[Any], turn: list[Any], deps: BqlDeps) -> list[Any]:
    """The conversation a failed or cancelled turn leaves behind.

    A turn that wrote nothing is dropped, as it always was. One that wrote is
    kept as far as the model got (w1/095): dropping it left the next question
    without the "Added …" tool result, so the model did not know the entry
    existed and would happily add it again. `turn` is the SDK's capture of the
    whole run, prior history included. It is cut back to its last request,
    because a response whose tool calls were never answered is history the
    next run refuses to continue from.
    """
    if not deps.writes or not turn:
        return before
    from pydantic_ai.messages import ModelResponse

    kept = list(turn)
    while kept and isinstance(kept[-1], ModelResponse):
        kept.pop()
    return kept


def _print_help() -> None:
    console.print(
        "\n[bold]Commands[/bold]\n"
        "  [cyan]/exit[/cyan]   Exit the session\n"
        "  [cyan]?[/cyan]       Show this help\n\n"
        "[bold]Keyboard shortcuts[/bold]\n"
        "  [cyan]↑ ↓[/cyan]     Browse input history\n"
        "  [cyan]Ctrl-C[/cyan]  Cancel current input\n"
        "  [cyan]Ctrl-D[/cyan]  Exit\n\n"
        "[bold]Write permissions[/bold]\n"
        "  When the AI writes a directive you will be prompted:\n"
        "  Navigate with [cyan]↑ ↓[/cyan] or [cyan]j k[/cyan], confirm with [cyan]Enter[/cyan]\n"
    )
