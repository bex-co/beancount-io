from __future__ import annotations

from typing import Annotated

import typer

from cli import output
from cli.chat.agent import BqlDeps, make_agent
from cli.chat.skills import load_skills
from cli.config import DEFAULT_ENTRY_FILE


def chat(
    question: Annotated[str | None, typer.Argument(help="Question to ask (optional)")] = None,
    print_mode: Annotated[
        bool, typer.Option("--print", "-p", help="Print mode: answer and exit (non-interactive)")
    ] = False,
) -> None:
    """Chat with your Beancount ledger using AI (LLM + BQL tool calling)."""
    file = DEFAULT_ENTRY_FILE
    model = "gpt-4o"
    try:
        from cli.auth.credentials import require_credentials
        from cli.config import settings

        creds = require_credentials()
        if not file.exists():
            output.error(f"File not found: {file}")

        skills = load_skills()
        agent = make_agent(
            model_name=model,
            base_url=f"{settings.api_url}/api-gateway/ai/openai/",
            api_key=creds.token,
            skills=skills,
        )

        deps = BqlDeps(file=file, skills={s.name: s for s in skills})

        if print_mode:
            if not question:
                output.error("A question is required in print mode (--print).")
            from rich.console import Console
            from rich.markdown import Markdown

            console = Console()
            with console.status("[dim]Thinking…[/dim]", spinner="dots"):
                result = agent.run_sync(question, deps=deps)
            console.print(Markdown(result.output))
        else:
            from cli.chat.repl import print_welcome, run_repl

            print_welcome()
            run_repl(agent, deps, default_input=question)

    except typer.Exit:
        raise
    except Exception as e:
        output.error(str(e))
