"""`bea ask` — the only command that needs an LLM, and the only one that pays for it.

Nothing here imports the ask package or its AI dependencies at module scope:
`main.py` imports this module on every invocation, including `--help`, and a
first `bea check` must not load an LLM client it will never use.
"""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from cli import context
from cli.errors import UsageError

_MISSING_EXTRA = (
    "bea ask needs the optional AI dependencies and a Beancount.io login. "
    "For uv: uv tool install 'beancount-io[ask]'. For Homebrew, keep brew for the base CLI "
    "and run: uvx --from 'beancount-io[ask]' bea ask --help. "
    "Then run bea cloud login. Model calls use the hosted Beancount.io AI service."
)


def ask(
    question: Annotated[str | None, typer.Argument(help="Question to ask (omit for an interactive session)")] = None,
    print_mode: Annotated[
        bool, typer.Option("--print", "-p", help="Print mode: answer once and exit (non-interactive)")
    ] = False,
    into: Annotated[
        Path | None, typer.Option("--into", help="Write to an included file, relative to the root ledger")
    ] = None,
) -> None:
    """Ask about a local ledger via hosted AI.

    Requires both beancount-io[ask] and credentials from bea cloud login.
    With Homebrew, use uvx --from 'beancount-io[ask]' bea ask QUESTION --print.
    Interactive edits are confirmed, validated, and written atomically.
    """
    ctx = context.current()
    model = "gpt-4o"
    file = ctx.entry_file()
    if ctx.json_output:
        raise UsageError("bea ask has no JSON output. Use 'bea query' for machine-readable results.")

    # The missing extra is checked before the credential: without it the
    # command cannot run at all, and "log in first" would be misleading advice.
    try:
        from cli.ask.agent import BqlDeps, make_agent
    except ImportError as exc:
        raise UsageError(_MISSING_EXTRA) from exc

    from cli.auth.credentials import require_credentials

    creds = require_credentials()

    from cli.ask.skills import load_skills
    from cli.config import settings

    skills = load_skills()
    agent = make_agent(
        model_name=model,
        base_url=f"{settings().api_url}/api-gateway/ai/openai/",
        api_key=creds.token,
        skills=skills,
    )
    deps = BqlDeps(file=file, skills={s.name: s for s in skills}, into=into)

    if print_mode or ctx.no_input:
        if not question:
            raise UsageError("A question is required without a terminal (or with --print).")
        from rich.console import Console
        from rich.markdown import Markdown

        console = Console()
        with console.status("[dim]Thinking…[/dim]", spinner="dots"):
            result = agent.run_sync(question, deps=deps)
        console.print(Markdown(result.output))
    else:
        from cli.ask.repl import print_welcome, run_repl

        print_welcome()
        run_repl(agent, deps, default_input=question)
