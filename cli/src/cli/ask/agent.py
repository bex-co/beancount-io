from __future__ import annotations

import io
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

from pydantic_ai import Agent, ModelRetry, RunContext
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

from cli import ledger_write, output
from cli.ask.skills import AgentSkill, build_skills_index_prompt
from cli.errors import BeaError

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
        from cli.query_render import connect_ledger, render_query

        conn = connect_ledger(ctx.deps.file.resolve())
        if conn.errors:
            raise ModelRetry("Ledger is invalid: " + "; ".join(output.format_ledger_error(e) for e in conn.errors))
        try:
            cursor = conn.execute(query)
        except Exception as e:
            raise ModelRetry(f"BQL error: {e}. Fix the query and retry.") from e
        if cursor.description is None:
            return "(no results)"
        rows = cursor.fetchall()
        if not rows:
            return "(empty result set)"
        buf = io.StringIO()
        render_query(cursor.description, rows, buf)
        return buf.getvalue()

    @agent.tool()
    def write_directive(ctx: RunContext[BqlDeps], directive: str) -> str:
        """Append a beancount directive to the ledger file. Use valid beancount syntax."""
        from beancount.parser import lexer, parser

        perm = ctx.deps.write_permission
        if perm.deny_all:
            return "Write denied (you denied all writes this session)."
        # This tool adds dated directives, not executable plugins or includes.
        if any(
            kind in {"INCLUDE", "PLUGIN", "OPTION", "PUSHTAG", "POPTAG", "PUSHMETA", "POPMETA"}
            for kind, *_ in lexer.lex_iter_string(directive)  # type: ignore[no-untyped-call]
        ):
            return (
                "Write rejected: provide dated ledger directives only; "
                "configure options, plugins and includes separately."
            )
        entries, errors, _ = parser.parse_string(directive)
        if errors or not entries:
            return "Write rejected: " + (
                "; ".join(output.format_ledger_error(e) for e in errors) or "No dated directives were supplied."
            )
        try:
            snapshot = ledger_write.LedgerSnapshot.capture(ctx.deps.file)
            ledger_write.validate_append(ctx.deps.file, [directive], into=ctx.deps.into, snapshot=snapshot)
        except BeaError as exc:
            return "Write rejected; nothing was written: " + str(exc) + " " + "; ".join(exc.details)
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
            ledger_write.append(ctx.deps.file, [directive], into=ctx.deps.into, snapshot=snapshot)
        except BeaError as exc:
            return "Write rejected; nothing was written: " + str(exc) + " " + "; ".join(exc.details)
        return f"Added {len(entries)} directive(s) to {ledger_write.destination(ctx.deps.file, ctx.deps.into)}."

    @agent.tool()
    def get_skill_body(ctx: RunContext[BqlDeps], name: str) -> str:
        """Load the full instructions for an agent skill by name."""
        skill = ctx.deps.skills.get(name)
        if skill is None:
            available = ", ".join(ctx.deps.skills) or "none"
            return f"Skill '{name}' not found. Available skills: {available}."
        return skill.body or "(no body content)"

    return agent
