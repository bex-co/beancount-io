"""`bea ask` — the only command that needs an LLM, and the only one that pays for it.

Nothing here imports the ask package or its AI dependencies at module scope:
`main.py` imports this module on every invocation, including `--help`, and a
first `bea check` must not load an LLM client it will never use.
"""

from __future__ import annotations

from typing import Annotated

import typer

from cli import context, output
from cli.errors import UsageError

_MISSING_EXTRA = (
    "bea ask needs the ask extra: "
    "uv tool install 'beancount-io[ask] @ git+https://github.com/bex-co/beancount-io#subdirectory=cli'"
)


def ask(
    question: Annotated[str | None, typer.Argument(help="Question to ask (omit for an interactive session)")] = None,
    print_mode: Annotated[
        bool, typer.Option("--print", "-p", help="Print mode: answer once and exit (non-interactive)")
    ] = False,
) -> None:
    """Ask questions about your ledger in natural language (requires beancount-io[ask])."""
    ctx = context.current()
    model = "gpt-4o"
    try:
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
            base_url=f"{settings.api_url}/api-gateway/ai/openai/",
            api_key=creds.token,
            skills=skills,
        )
        deps = BqlDeps(file=file, skills={s.name: s for s in skills})

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

    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)
