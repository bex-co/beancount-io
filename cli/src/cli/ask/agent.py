from __future__ import annotations

import json
import re
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

from pydantic_ai import Agent, ModelRetry, RunContext
from pydantic_ai.exceptions import AgentRunError, ModelAPIError, ModelHTTPError, UsageLimitExceeded
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.settings import ModelSettings
from pydantic_ai.usage import UsageLimits

from cli.ask.results import format_result
from cli.ask.skills import AgentSkill, build_skills_index_prompt
from cli.engine import launch
from cli.errors import BeaError, LedgerError, error_from_status
from cli.errors import server_message as _server_message

_SYSTEM_PROMPT = """You are a helpful Beancount accounting assistant.
Use the run_bql_query tool to retrieve data from the user's ledger, then answer their question.
Use the write_directive tool to append beancount directives to the ledger file when the user asks to add entries.

BQL (Beancount Query Language) is SQL-like but NOT standard SQL. Key rules:

The default table is postings — one row per posting, so a transaction with two
postings is two rows. `FROM #entries` selects whole entries instead (one row per
directive, with a `type` column); `#postings`, `accounts`, `balances` and
`prices` are the other relations. Counting the default table counts postings.
Columns: date, account, number, currency, position, payee, narration, tags, flag.
Use SELECT DISTINCT to deduplicate (e.g. one row per account or per transaction).
`count(DISTINCT x)` is not valid in this dialect — count a subquery instead.
tags and links hold a whole set per entry, so DISTINCT and GROUP BY cannot take
them. Wrap them first: joinstr(tags) is a string and behaves like any other
column, and 'grocery' IN tags tests one tag. Do not rely on the order of tags
inside a joinstr result.

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
  Distinct tag combinations:
    SELECT DISTINCT joinstr(tags)
  Entries carrying one tag:
    SELECT date, narration WHERE 'grocery' IN tags
  How many transactions there are (count entries, not postings):
    SELECT count(*) FROM #entries WHERE type = 'transaction'
    -- bare `SELECT count(*)` answers a different question: it counts postings.
  Largest / top N — "largest" means ORDER BY ... DESC:
    SELECT date, payee, narration, number WHERE account ~ '^Expenses' ORDER BY number DESC LIMIT 1
    -- ascending order would report the smallest; say DESC when asked for the biggest.
  Net worth, or any balance as of a date (filter by account type, never the whole ledger):
    SELECT sum(position) FROM CLOSE ON 2024-03-01 WHERE account ~ '^(Assets|Liabilities)'
    SELECT account, sum(position) WHERE account ~ '^(Assets|Liabilities)' AND date <= 2024-03-01 GROUP BY account
  Holdings in one currency (filter by account, because the currency's legs net to zero ledger-wide):
    SELECT account, sum(position) WHERE currency = 'EUR' AND account ~ '^(Assets|Liabilities)' GROUP BY account

Every transaction balances, so an unfiltered sum(position) — over the whole
ledger, or filtered only by date or by currency — is zero by construction. A
result of 0 means the matched postings cancelled out, not that the ledger is
empty: re-run it restricted to the accounts the question is about before
concluding anything. Each result tells you how many rows it has; "0 row(s)"
means nothing matched, and a cell reading 0 is a real zero.

Other functions: year(date), month(date), root(account), leaf(account), units(position), cost(position)
FROM also takes temporal modifiers instead of a relation: FROM OPEN ON <date> /
FROM CLOSE [ON <date>] / FROM CLEAR. Use the run_bql_query tool for SELECT
(and BALANCES / JOURNAL); it does not run PRINT or dot commands.

Prefer aggregates to enumeration: a result is truncated past a few hundred rows,
and a total, a GROUP BY or a date range answers most questions. When a result
says it was truncated, say so in your answer.

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


#: What one question may spend. `ask` is the only command that costs money per
#: call, so the ceiling is the CLI's own choice rather than the AI SDK's default
#: of 50 requests: a ledger question needs a handful of queries, and a model that
#: keeps calling tools without answering is looping, not working. Every request
#: carries the whole growing history, so the tail of a loop is also the expensive
#: part. Tripping this is reported in the CLI's own words by `translated_failures`.
REQUEST_LIMIT = 12
TOOL_CALLS_LIMIT = 10

#: What one answer may be long enough to say. A request that names no output cap
#: reserves the model's whole default allowance, and the hosted proxy budgets
#: against what a request reserves: at the edge of an account's window the
#: uncapped request is the first one refused, while a modestly capped one still
#: fits (w3/446). An answer here is prose about a ledger — a few paragraphs, or a
#: short table — so this is generous for the job and small against a window.
MAX_OUTPUT_TOKENS = 1500


def usage_limits() -> UsageLimits:
    """The per-question budget, built the same way for the REPL and for `--print`."""
    return UsageLimits(request_limit=REQUEST_LIMIT, tool_calls_limit=TOOL_CALLS_LIMIT)


def model_settings() -> ModelSettings:
    """The request settings every `ask` call carries, chiefly the output cap."""
    return ModelSettings(max_tokens=MAX_OUTPUT_TOKENS)


@dataclass
class WritePermission:
    approve_all: bool = False
    deny_all: bool = False
    #: Called with the directive text and the append destination the engine's
    #: dry run resolved — never the root ledger, which `--into` makes wrong.
    confirm_fn: Callable[[str, str, list[str]], str] | None = None


@dataclass
class BqlDeps:
    file: Path
    write_permission: WritePermission = field(default_factory=WritePermission)
    skills: dict[str, AgentSkill] = field(default_factory=dict)
    into: Path | None = None
    #: What this question has written: one (directive count, file) per approved
    #: write that landed. A failure report must not deny a write that happened —
    #: told "nothing was written", a user retries and duplicates the entry
    #: (w1/095). `translated_failures` resets it at the start of every turn.
    writes: list[tuple[int, str]] = field(default_factory=list)


def written_so_far(deps: BqlDeps | None) -> str:
    """What this question wrote, as the clause a failure report ends with."""
    if deps is None or not deps.writes:
        return "nothing was written to your ledger"
    per_file: dict[str, int] = {}
    for count, target in deps.writes:
        per_file[target] = per_file.get(target, 0) + count
    landed = ", ".join(f"{count} directive(s) to {target}" for target, count in per_file.items())
    return f"this question had already written {landed}, which stay in your ledger"


@contextmanager
def translated_failures(deps: BqlDeps | None = None) -> Iterator[None]:
    """Report the proxy's HTTP failures the way every other command reports them.

    `ask` reaches the service over the OpenAI protocol through the AI SDK
    rather than through `cli.api.client`, so it never met the status table in
    `error_from_status` that the exit table is written against. A rejected
    credential — expired, revoked, wrong environment — therefore exited 1 with
    the SDK's own `status_code: …, model_name: …, body: …` string: a script
    branching on exit 3 to re-login never fired, and the user read the proxy's
    internal model name instead of a remedy.

    Routing through that same table is what keeps `ask` and `cloud` from
    drifting: 401/403 become `AuthError` with the BEA_TOKEN-aware remedy, and
    rate limits and 5xx get their documented sentences too.

    The AI SDK's own run failures are translated here for the same reason. Left
    alone they fell past this context manager into the catch-all in `main.py`,
    which printed them verbatim: the user read a third-party limit name
    (`request_limit`), a knob `bea` does not expose (the tool retry count), and a
    link to another project's documentation. Every arm below says what happened,
    what was written, and what to try instead — and none of them quotes
    the SDK's sentence, because that sentence is the defect.

    `deps` is the turn's state: its record of writes is cleared on entry, so
    every arm can say what this question actually wrote — "nothing" only when
    that is true — instead of a claim written for `--print`, where writes are
    impossible (w1/095).
    """
    if deps is not None:
        deps.writes.clear()
    try:
        yield
    except ModelHTTPError as exc:
        quota = _quota_refusal(exc.body, written_so_far(deps))
        if quota is not None:
            raise BeaError(quota) from exc
        raise _naming_writes(error_from_status(exc.status_code, _server_message(exc.body)), deps) from exc
    except ModelAPIError as exc:
        # A connection-level failure: the AI SDK wraps the HTTP client's error
        # rather than answering with a status, so it never reached the status
        # table above and `ask` said the SDK's bare `Connection error.` where
        # `bea cloud status` says `Could not reach the server (ConnectError).`
        # `USAGE.md` promises those read the same, so the same translation the
        # rest of the CLI uses is applied to whatever the SDK was hiding.
        raise _naming_writes(_unreachable(exc), deps) from exc
    except UsageLimitExceeded as exc:
        raise BeaError(
            f"The assistant kept querying without reaching an answer and stopped at this question's "
            f"budget ({REQUEST_LIMIT} model requests, {TOOL_CALLS_LIMIT} ledger queries); "
            f"{written_so_far(deps)}. "
            "Ask a narrower question, or run the query yourself with 'bea query'."
        ) from exc
    except AgentRunError as exc:
        raise BeaError(
            f"The assistant could not complete this question ({type(exc).__name__}); "
            f"{written_so_far(deps)}. Rephrase the question and retry, "
            "or run the query yourself with 'bea query'."
        ) from exc


def _naming_writes(error: BeaError, deps: BqlDeps | None) -> BeaError:
    """The status table's sentence, plus the write it would otherwise leave out.

    Those sentences make no claim about the ledger, so nothing is added when the
    question wrote nothing; after a write, silence reads as "nothing happened"
    and invites the retry that duplicates the entry.
    """
    if deps is not None and deps.writes:
        clause = written_so_far(deps)
        error.args = (f"{error} Note: {clause[0].upper()}{clause[1:]}.",)
    return error


def _unreachable(exc: BaseException) -> BeaError:
    """The CLI's own network sentence, built from whatever the SDK wrapped.

    The HTTP client's exception class is the only part of a connection failure
    worth showing (its message is often empty, and can carry a credential), so
    the cause chain is walked for it and `to_bea_error` words the result — the
    same call `cli.api.client` makes, hence the same sentence.
    """
    import httpx

    from cli.errors import to_bea_error

    cause: BaseException | None = exc
    seen: set[int] = set()
    while cause is not None and id(cause) not in seen:
        seen.add(id(cause))
        if isinstance(cause, httpx.TransportError):
            return to_bea_error(cause)
        cause = cause.__cause__ or cause.__context__
    return BeaError(f"Could not reach the server ({type(exc).__name__}).")


def _quota_refusal(body: object, written: str = "nothing was written to your ledger") -> str | None:
    """The account's AI budget, refused: which quota, and when it comes back.

    The proxy answers a quota rejection with its own code and, when it knows it,
    the moment the window reopens. Both are worth more to the reader than the
    status line, and the code survives however deeply the envelope nests it —
    which is why this looks at the whole body rather than at one key.
    """
    text = body if isinstance(body, str) else json.dumps(body, default=str)
    if "QUOTA_EXCEEDED" not in text:
        return None
    # The escape-tolerant form on purpose: the code and the reset time may sit
    # inside a JSON document that is itself the value of a JSON string, so the
    # quotes around them may be escaped once (w3/445 is the same envelope).
    until = re.search(r'blockedUntil\\?"\s*:\s*\\?"([^"\\]+)', text)
    when = f" It resets at {until.group(1)}." if until else ""
    return (
        "This account's hosted AI quota is used up, so the question was refused; "
        f"{written}.{when} "
        "Run the query yourself with 'bea query' in the meantime."
    )


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
    agent: Agent[BqlDeps, str] = Agent(
        model,
        deps_type=BqlDeps,
        system_prompt=system_prompt,
        model_settings=model_settings(),
    )

    @agent.system_prompt
    def todays_date() -> str:
        return f"Today's date is {date.today().isoformat()}."

    @agent.tool(retries=2)
    def run_bql_query(ctx: RunContext[BqlDeps], query: str) -> str:
        """Run a BQL SELECT (Beancount Query Language) against the user's Beancount ledger.

        Returns the matching rows with a row count. An invalid query or an invalid
        ledger comes back as an error to fix and retry.
        """
        try:
            # Rows and columns, not the rendered table: the row count, a visible
            # zero and a bounded result all need the typed shape (`ask.results`).
            data = launch.helper_json(["query", "--file", str(ctx.deps.file), query, "--format", "json"])
        except LedgerError as exc:
            detail = "; ".join(exc.details) if exc.details else str(exc)
            raise ModelRetry("Ledger is invalid: " + detail) from exc
        except BeaError as exc:
            raise ModelRetry(f"BQL error: {exc}. Fix the query and retry.") from exc
        return format_result(query, data)

    @agent.tool()
    def write_directive(ctx: RunContext[BqlDeps], directive: str) -> str:
        """Append Beancount directive text (one or more directives) to the ledger file.

        The text is validated first; invalid text is rejected with the reason and nothing
        is written. In an interactive session the user sees the directive and approves or
        declines it; in non-interactive mode writes are skipped. Returns one line: how many
        directives were added and to which file, or why nothing was written.
        """
        perm = ctx.deps.write_permission
        if perm.deny_all:
            return "Write denied (you denied all writes this session)."
        argv = ["append", "--file", str(ctx.deps.file), "--text", "-"]
        if ctx.deps.into is not None:
            argv += ["--into", str(ctx.deps.into)]
        try:
            preview = launch.helper_json([*argv, "--dry-run"], stdin=directive)
        except BeaError as exc:
            return _write_rejection(exc)
        if not perm.approve_all:
            if perm.confirm_fn is None:
                return "Write skipped (non-interactive mode does not support writes)."
            # The dry run resolved where the text actually goes — with `--into`
            # that is an included file, not `deps.file`. The consent panel has to
            # name that file, so the preview's own answer is what it is built from.
            warnings = [str(warning) for warning in preview.get("warnings") or []]
            answer = perm.confirm_fn(directive, str(preview["target"]), warnings)
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
                writes=True,
            )
        except BeaError as exc:
            return _write_rejection(exc)
        ctx.deps.writes.append((int(result["written"]), str(result["target"])))
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
