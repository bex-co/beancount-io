from __future__ import annotations

import random
import shutil
from collections.abc import Callable
from pathlib import Path
from typing import TYPE_CHECKING, Any

from prompt_toolkit import PromptSession
from prompt_toolkit.formatted_text import FormattedText
from prompt_toolkit.history import FileHistory
from prompt_toolkit.key_binding import KeyBindings
from prompt_toolkit.styles import Style
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.text import Text

if TYPE_CHECKING:
    from pydantic_ai import Agent

    from cli.chat.agent import BqlDeps

from cli.config import DATA_DIR

_HISTORY_FILE = DATA_DIR / "chat_history"

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


def _make_session(hint: str, key_bindings: KeyBindings | None = None) -> PromptSession[str]:
    _HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    return PromptSession(
        message=_prompt_tokens,
        bottom_toolbar=_toolbar_tokens,
        placeholder=FormattedText([("class:placeholder", f" {hint}")]),
        history=FileHistory(str(_HISTORY_FILE)),
        style=_STYLE,
        mouse_support=False,
        key_bindings=key_bindings,
    )


def _ask_write_permission() -> str:
    """Arrow-key navigable selector. Returns y/n/a/d."""
    from prompt_toolkit import Application
    from prompt_toolkit.layout import Layout
    from prompt_toolkit.layout.containers import Window
    from prompt_toolkit.layout.controls import FormattedTextControl
    from prompt_toolkit.styles import Style as PtStyle

    options = [
        ("Yes", "y", "Append this directive to the ledger"),
        ("No", "n", "Skip this write"),
        ("Yes to all", "a", "Approve all remaining writes this session"),
        ("Deny all", "d", "Reject all remaining writes this session"),
    ]
    selected = [0]

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


def make_confirm_fn(file: Path, active_status: list[Any]) -> Callable[[str], str]:
    """Return a callback that stops the spinner, shows the panel, and runs arrow-key selection."""

    def confirm(directive: str) -> str:
        if s := active_status[0]:
            s.stop()
        console.print()
        content = Text()
        content.append("Allow the AI to append this directive to your ledger?\n\n", style="dim")
        content.append(directive, style="green")
        console.print(
            Panel(
                content,
                title=f"[yellow]Write to {file}[/yellow]",
                border_style="yellow",
                padding=(0, 1),
            )
        )
        result = _ask_write_permission()
        if s := active_status[0]:
            s.start()
        return result

    return confirm


def print_welcome() -> None:
    console.print("\n[bold]Beancount AI[/bold]")
    console.print("[dim]Multi-turn conversation with your ledger. Type /exit to quit.[/dim]")


def run_repl(agent: Agent[BqlDeps, str], deps: BqlDeps, *, default_input: str | None = None) -> None:
    from cli.chat.agent import WritePermission

    hint = random.choice(_PLACEHOLDER_HINTS)
    first_turn = [True]
    active_status: list[Any] = [None]

    deps.write_permission = WritePermission(confirm_fn=make_confirm_fn(deps.file, active_status))

    kb = KeyBindings()

    @kb.add("tab")
    def _fill_hint(event: Any) -> None:
        buf = event.app.current_buffer
        if first_turn[0] and not buf.text:
            buf.insert_text(hint)

    session = _make_session(hint, key_bindings=kb)
    messages: list[Any] = []
    while True:
        try:
            ph = FormattedText([("class:placeholder", f" {hint}")]) if first_turn[0] else FormattedText([])
            user_input = session.prompt(default=default_input or "" if first_turn[0] else "", placeholder=ph).strip()
        except (KeyboardInterrupt, EOFError):
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
        status = console.status("", spinner="dots")
        active_status[0] = status
        status.start()
        try:
            result = agent.run_sync(user_input, deps=deps, message_history=messages)
        finally:
            status.stop()
            active_status[0] = None
        messages = list(result.all_messages())
        console.print()
        console.print(Markdown(result.output))


def _print_help() -> None:
    console.print(
        "\n[bold]Commands[/bold]\n"
        "  [cyan]/exit[/cyan]   Exit the chat\n"
        "  [cyan]?[/cyan]       Show this help\n\n"
        "[bold]Keyboard shortcuts[/bold]\n"
        "  [cyan]↑ ↓[/cyan]     Browse input history\n"
        "  [cyan]Ctrl-C[/cyan]  Cancel current input\n"
        "  [cyan]Ctrl-D[/cyan]  Exit\n\n"
        "[bold]Write permissions[/bold]\n"
        "  When the AI writes a directive you will be prompted:\n"
        "  Navigate with [cyan]↑ ↓[/cyan] or [cyan]j k[/cyan], confirm with [cyan]Enter[/cyan]\n"
    )
