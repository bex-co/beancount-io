from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

from pydantic_ai import Agent, ModelRetry, RunContext
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

from cli.ask.skills import AgentSkill, build_skills_index_prompt
from cli.engine import launch
from cli.errors import BeaError, LedgerError

_SYSTEM_PROMPT = """You are a helpful Beancount accounting assistant.
Use the run_bql_query tool to retrieve data from the user's ledger, then answer their question.
Use the write_directive tool to append beancount directives to the ledger file when the user asks to add entries.

BQL (Beancount Query Language) is SQL-like but NOT standard SQL. Key rules:

The default table is postings — one row per posting.
Columns: date, account, number, currency, position, payee, narration, tags, flag.
Use SELECT DISTINCT to deduplicate (e.g. one row per account or per transaction).

Common examples:
  List all open accounts:
    SELECT DISTINCT account WHERE close_date(account) IS NULL ORDER BY account
  List accounts with their open date:
    SELECT DISTINCT account, open_date(account) WHERE close_date(account) IS NULL ORDER BY account
  Current balances by account:
    SELECT account, sum(position) GROUP BY account
  Filter by account type:
    SELECT account, sum(position) WHERE account ~ '^Expenses' GROUP BY account
  Transactions in a date range:
    SELECT date, payee, narration WHERE date >= 2024-01-01 AND date < 2025-01-01
  Distinct currencies used:
    SELECT DISTINCT currency

Other functions: year(date), month(date), root(account), leaf(account), units(position), cost(position)
FROM OPEN ON <date> / FROM CLOSE [ON <date>] / FROM CLEAR are temporal modifiers, not table names.

If a query fails, read the error carefully, fix the syntax, and retry.

Beancount directive syntax for write_directive:
  Transaction:
    2024-01-15 * "Payee" "Narration"
      Account:One   100.00 USD
      Account:Two  -100.00 USD
  Open account:    2024-01-01 open Assets:Cash USD
  Close account:   2024-12-31 close Assets:Cash
  Balance assert:  2024-01-31 balance Assets:Cash 500.00 USD
  Note:            2024-01-15 note Assets:Cash "some note"
  Price:           2024-01-15 price AAPL 185.00 USD
Always use correct indentation (two spaces for postings). Use today's date if not specified."""


@dataclass
class WritePermission:
    approve_all: bool = False
    deny_all: bool = False
    confirm_fn: Callable[[str], str] | None = None


@dataclass
class BqlDeps:
    file: Path
    write_permission: WritePermission = field(default_factory=WritePermission)
    skills: dict[str, AgentSkill] = field(default_factory=dict)
    into: Path | None = None


def make_agent(
    model_name: str,
    base_url: str,
    api_key: str,
    skills: list[AgentSkill] | None = None,
) -> Agent[BqlDeps, str]:
    model = OpenAIChatModel(
        model_name,
        provider=OpenAIProvider(base_url=base_url, api_key=api_key),
    )
    system_prompt = _SYSTEM_PROMPT
    if skills:
        system_prompt = system_prompt + build_skills_index_prompt(skills)
    agent: Agent[BqlDeps, str] = Agent(model, deps_type=BqlDeps, system_prompt=system_prompt)

    @agent.tool(retries=2)
    def run_bql_query(ctx: RunContext[BqlDeps], query: str) -> str:
        """Run a BQL (Beancount Query Language) query against the user's Beancount ledger."""
        try:
            data = launch.helper_json(["query", "--file", str(ctx.deps.file.resolve()), query, "--format", "text"])
        except LedgerError as exc:
            detail = "; ".join(exc.details) if exc.details else str(exc)
            raise ModelRetry("Ledger is invalid: " + detail) from exc
        except BeaError as exc:
            raise ModelRetry(f"BQL error: {exc}. Fix the query and retry.") from exc
        text = str(data.get("text", ""))
        if not text.strip():
            return "(empty result set)"
        return text

    @agent.tool()
    def write_directive(ctx: RunContext[BqlDeps], directive: str) -> str:
        """Append a beancount directive to the ledger file. Use valid beancount syntax."""
        perm = ctx.deps.write_permission
        if perm.deny_all:
            return "Write denied (you denied all writes this session)."
        argv = ["append", "--file", str(ctx.deps.file.resolve()), "--text", "-"]
        if ctx.deps.into is not None:
            argv += ["--into", str(ctx.deps.into)]
        try:
            preview = launch.helper_json([*argv, "--dry-run"], stdin=directive)
        except BeaError as exc:
            return _write_rejection(exc)
        if not perm.approve_all:
            if perm.confirm_fn is None:
                return "Write skipped (non-interactive mode does not support writes)."
            answer = perm.confirm_fn(directive)
            if answer == "a":
                perm.approve_all = True
            elif answer == "d":
                perm.deny_all = True
                return "Write denied."
            elif answer == "n":
                return "Write cancelled by user."
        try:
            result = launch.helper_json(
                [*argv, "--token", json.dumps(preview["token"])],
                stdin=directive,
            )
        except BeaError as exc:
            return _write_rejection(exc)
        return f"Added {result['written']} directive(s) to {result['target']}."

    @agent.tool()
    def get_skill_body(ctx: RunContext[BqlDeps], name: str) -> str:
        """Load the full instructions for an agent skill by name."""
        skill = ctx.deps.skills.get(name)
        if skill is None:
            available = ", ".join(ctx.deps.skills) or "none"
            return f"Skill '{name}' not found. Available skills: {available}."
        return skill.body or "(no body content)"

    return agent


def _write_rejection(exc: BeaError) -> str:
    """Tool-facing write failure: keep the soft 'rejected' wording the model already sees."""
    message = str(exc)
    if message.startswith("Write rejected"):
        return message if not exc.details else message + " " + "; ".join(exc.details)
    return "Write rejected; nothing was written: " + message + (" " + "; ".join(exc.details) if exc.details else "")
