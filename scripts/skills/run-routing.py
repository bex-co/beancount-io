#!/usr/bin/env python3
"""Measure which customer skill Claude Code and Codex choose for each routing prompt.

Local only: every prompt is a paid client call, so CI never runs this script
(`ci-check.py` validates the routing set itself). Stdlib only.

    python3 scripts/skills/run-routing.py                    # every installed client
    python3 scripts/skills/run-routing.py --clients codex --only none-close-amex-account
    python3 scripts/skills/run-routing.py --score scripts/skills/tmp/routing/<run>/results.json

Each client runs in a scratch workspace created in the system temp directory,
outside this repository, so neither client loads this repository's own
instructions or development skills. The workspace is a fresh Git repository
holding a small synthetic ledger and links to every `beancount-*` directory
of `--suite` (default: this checkout's customer suite), linked into
`.claude/skills` and `.agents/skills` the same way the installer links them.
Results go to `scripts/skills/tmp/routing/` (gitignored).

How a choice is detected, verified against Claude Code 2.1.289 and Codex 0.163.0:

- Claude Code (`claude -p --output-format stream-json`): the first `Skill`
  tool call, whose input names the skill. Edit/Write tools are disallowed and
  no MCP server is loaded (`--strict-mcp-config`).
- Codex (`codex exec --json --sandbox read-only`): Codex has no skill tool; it
  opens a skill by running a shell command that reads `<skill>/SKILL.md`. The
  first completed command that names `<skill>/SKILL.md` and prints that
  skill's `name:` frontmatter is the choice. When that command opens several
  skills at once (a skill and the sibling it composes), all are recorded and
  the prompt scores as routed if the expected skill is among them.

The client is stopped as soon as a choice is seen. A run that finishes without
one chose no skill. A skill outside the suite (a user-level skill or plugin)
counts as `none` for scoring; its raw name is kept in the results. The
client's user-level skills and configuration still load, as they would for a
customer.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
ROUTING_SET = HERE / "routing.json"
SUITE_DIR = REPO_ROOT / "skills"
OUT_ROOT = HERE / "tmp" / "routing"

LEDGER = """\
option "title" "Synthetic routing ledger"
option "operating_currency" "USD"

2026-01-01 open Assets:Bank:Checking USD
2026-01-01 open Assets:Bank:Savings USD
2026-01-01 open Assets:Bank:OldSavings USD
2026-01-01 open Liabilities:CreditCard:Amex USD
2026-01-01 open Expenses:Food:Groceries USD
2026-01-01 open Expenses:Food:Dining USD
2026-01-01 open Expenses:Housing:Rent USD
2026-01-01 open Expenses:Subscriptions USD
2026-01-01 open Income:Salary USD
2026-01-01 open Equity:OpeningBalances USD

2026-09-01 * "LANDLORD" "September rent"
  Assets:Bank:Checking        -1200.00 USD
  Expenses:Housing:Rent        1200.00 USD

2026-09-03 * "TRADER JOES" "Groceries"
  Liabilities:CreditCard:Amex   -54.20 USD
  Expenses:Food:Groceries        54.20 USD

2026-09-12 * "NETFLIX" "Streaming"
  Liabilities:CreditCard:Amex   -17.99 USD
  Expenses:Subscriptions         17.99 USD
"""

CODEX_SKILL_READ = re.compile(r"([A-Za-z0-9._:-]+)/SKILL\.md")


def make_workspace(suite: Path) -> Path:
    workspace = Path(tempfile.mkdtemp(prefix="beancount-routing-"))
    subprocess.run(["git", "init", "-q", str(workspace)], check=True)
    (workspace / "main.bean").write_text(LEDGER, encoding="utf-8")
    names = sorted(suite_names(suite))
    for skills_dir in (workspace / ".claude" / "skills", workspace / ".agents" / "skills"):
        skills_dir.mkdir(parents=True)
        for name in names:
            (skills_dir / name).symlink_to((suite / name).resolve())
    return workspace


def client_version(client: str) -> str:
    try:
        out = subprocess.run([client, "--version"], capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired):
        return "unknown"
    text = (out.stdout or out.stderr).strip()
    return text.splitlines()[0] if text else "unknown"


def claude_command(prompt: str, model: str | None) -> list[str]:
    command = [
        "claude", "-p", prompt,
        "--output-format", "stream-json", "--verbose",
        "--max-turns", "4",
        "--strict-mcp-config",
        "--disallowedTools", "Edit", "Write", "NotebookEdit",
    ]
    return command + (["--model", model] if model else [])


def codex_command(prompt: str, model: str | None) -> list[str]:
    command = ["codex", "exec", "--json", "--sandbox", "read-only", "--skip-git-repo-check"]
    return command + (["-m", model] if model else []) + [prompt]


def claude_event(event: dict, meta: dict) -> tuple[list[str] | None, str | None]:
    """Return (skills opened, error) for one Claude Code stream-json event."""
    if event.get("type") == "system" and event.get("subtype") == "init":
        meta.setdefault("model", event.get("model"))
    if event.get("type") == "assistant":
        for part in event.get("message", {}).get("content", []):
            if part.get("type") == "tool_use" and part.get("name") == "Skill":
                tool_input = part.get("input", {})
                meta["evidence"] = json.dumps(tool_input)[:300]
                return [str(tool_input.get("skill", ""))], None
    if event.get("type") == "result" and event.get("is_error") and event.get("subtype") != "error_max_turns":
        return None, str(event.get("result") or event.get("subtype"))
    return None, None


def codex_event(event: dict, meta: dict) -> tuple[list[str] | None, str | None]:
    """Return (skills opened, error) for one Codex `exec --json` event.

    A command counts as opening a skill only when it names `<skill>/SKILL.md`
    and its output contains that skill's `name: <skill>` frontmatter line. A
    search for a guessed path prints no frontmatter, and the exit status is
    no guide: Codex often chains the read with a search that exits 1.
    """
    item = event.get("item", {})
    if event.get("type") == "item.completed" and item.get("type") == "command_execution":
        output = str(item.get("aggregated_output", ""))
        opened = [
            found.group(1)
            for found in CODEX_SKILL_READ.finditer(item.get("command", ""))
            if re.search(rf"^name:\s*['\"]?{re.escape(found.group(1))}['\"]?\s*$", output, re.M)
        ]
        if opened:
            meta["evidence"] = item.get("command", "")[:300]
            return list(dict.fromkeys(opened)), None
    if event.get("type") == "turn.completed":
        meta.pop("reconnecting", None)
    if event.get("type") in ("turn.failed", "error"):
        message = event.get("message") or event.get("error", {}).get("message")
        # Native Codex emits these error events while it is still retrying.
        # Let it recover; a failed turn or the watchdog remains a failure.
        if event.get("type") == "error" and re.match(r"^Reconnecting\.\.\. \d+/\d+ \(", str(message)):
            meta["reconnecting"] = str(message)[:300]
            return None, None
        return None, str(message)[:300]
    return None, None


# Each client: how to start it, and how to read a choice from its event stream.
CLIENTS = {"claude": (claude_command, claude_event), "codex": (codex_command, codex_event)}


def run_one(client: str, entry: dict, workspace: Path, model: str | None, timeout: float) -> dict:
    command, handle = CLIENTS[client]
    meta: dict = {}
    opened: list[str] = []
    error: str | None = None
    started = time.monotonic()
    # Startup failures may have only stderr, without a single JSON event.
    # A file avoids filling an unread stderr pipe while stdout is streamed.
    with tempfile.TemporaryFile() as stderr:
        process = subprocess.Popen(
            command(entry["prompt"], model),
            cwd=workspace,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=stderr,
            text=True,
        )
        # A client can go silent (a long shell command, a stalled request), so the
        # deadline is a timer that kills it rather than a check per output line.
        watchdog = threading.Timer(timeout, process.kill)
        watchdog.start()
        try:
            assert process.stdout is not None
            for line in process.stdout:
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue
                found, error = handle(event, meta)
                if found is not None or error is not None:
                    opened = found or []
                    break
        finally:
            watchdog.cancel()
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
            if process.stdout is not None:
                process.stdout.close()
        if not opened and error is None and time.monotonic() - started >= timeout:
            error = f"timeout after {timeout:.0f}s"
        if not opened and error is None:
            error = meta.get("reconnecting")
        if not opened and error is None and process.returncode:
            error = f"client exited with status {process.returncode}"
            stderr.seek(0, 2)
            stderr.seek(max(0, stderr.tell() - 1200))
            detail = stderr.read().decode("utf-8", errors="replace").strip()
            if detail:
                error += f": {detail[-300:]}"
    result = {
        "id": entry["id"],
        "client": client,
        "expected": entry["expected"],
        "opened": opened,
        "error": error,
        "seconds": round(time.monotonic() - started, 1),
    }
    result.update({key: meta[key] for key in ("model", "evidence") if meta.get(key)})
    return result


def normalize(choice: str, suite: set[str]) -> str:
    """Map a raw skill name to a suite label: a skill outside the suite is `none`."""
    name = choice.split(":")[-1]
    return name if name in suite else "none"


def result_label(result: dict, suite: set[str]) -> str | None:
    """The suite label a result chose, or None when no choice was observed.

    The choice is the first skill opened. When one command opened several at
    once (Codex reading a skill and the sibling it composes), the expected
    skill counts if it is among them. Results recorded before `opened`
    existed carry a single `chosen` name instead.
    """
    opened = result.get("opened")
    if opened is None:
        opened = [] if result.get("chosen") in (None, "none") else [result["chosen"]]
    labels = [normalize(name, suite) for name in opened]
    expected = result["expected"]
    if expected != "none" and expected in labels:
        return expected
    if labels:
        return labels[0]
    return None if result.get("error") else "none"


def fmt_ratio(value: float | None) -> str:
    return "—" if value is None else f"{value:.2f}"


def score(entries: list[dict], results: list[dict], suite: set[str]) -> dict:
    """Per client: accuracy, per-skill precision/recall, and confusion pairs.

    A result with an error (no choice observed) counts as a miss and is listed.
    """
    expected = {entry["id"]: entry["expected"] for entry in entries}
    labels = sorted(suite | {"none"})
    summary: dict = {}
    for client in sorted({r["client"] for r in results}):
        rows = [r for r in results if r["client"] == client and r["id"] in expected]
        chosen = {r["id"]: result_label(r, suite) for r in rows}
        per_label = {}
        for label in labels:
            true_positive = sum(1 for i, c in chosen.items() if c == label and expected[i] == label)
            predicted = sum(1 for c in chosen.values() if c == label)
            actual = sum(1 for i in chosen if expected[i] == label)
            per_label[label] = {
                "precision": round(true_positive / predicted, 3) if predicted else None,
                "recall": round(true_positive / actual, 3) if actual else None,
                "support": actual,
            }
        misses = sorted((i, expected[i], chosen[i] or "error") for i in chosen if chosen[i] != expected[i])
        summary[client] = {
            "correct": len(rows) - len(misses),
            "total": len(rows),
            "per_label": per_label,
            "confusion": Counter(f"{e} -> {c}" for _, e, c in misses).most_common(),
            "misses": [{"id": i, "expected": e, "chosen": c} for i, e, c in misses],
        }
    return summary


def report(summary: dict) -> str:
    lines = []
    for client, data in summary.items():
        lines.append(f"## {client}: {data['correct']}/{data['total']} routed as labeled\n")
        lines.append("| label | precision | recall | support |")
        lines.append("| --- | --- | --- | --- |")
        for label, row in data["per_label"].items():
            lines.append(f"| {label} | {fmt_ratio(row['precision'])} | {fmt_ratio(row['recall'])} | {row['support']} |")
        lines.append("")
        if data["misses"]:
            lines.append("| prompt id | expected | chosen |")
            lines.append("| --- | --- | --- |")
            lines.extend(f"| {m['id']} | {m['expected']} | {m['chosen']} |" for m in data["misses"])
            lines.append("")
    return "\n".join(lines)


def suite_names(suite: Path) -> set[str]:
    return {path.parent.name for path in suite.glob("beancount-*/SKILL.md")}


def revision() -> str:
    out = subprocess.run(["git", "-C", str(REPO_ROOT), "rev-parse", "--short", "HEAD"], capture_output=True, text=True)
    return out.stdout.strip() or "unknown"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--clients", default="claude,codex", help="comma-separated: claude,codex")
    parser.add_argument("--set", type=Path, default=ROUTING_SET, help="routing set JSON")
    parser.add_argument("--suite", type=Path, default=SUITE_DIR, help="directory holding beancount-* skills")
    parser.add_argument("--only", default="", help="comma-separated entry ids to run")
    parser.add_argument("--claude-model", default=None)
    parser.add_argument("--codex-model", default=None)
    parser.add_argument("--jobs", type=int, default=4)
    parser.add_argument("--timeout", type=float, default=240.0, help="seconds per prompt")
    parser.add_argument("--out", type=Path, default=None, help="results directory")
    parser.add_argument("--score", type=Path, default=None, help="re-score a results.json without running")
    args = parser.parse_args(argv)

    routing = json.loads(args.set.read_text(encoding="utf-8"))
    entries = routing["entries"]
    if args.only:
        wanted = set(args.only.split(","))
        entries = [entry for entry in entries if entry["id"] in wanted]
    suite = suite_names(args.suite)

    if args.score:
        recorded = json.loads(args.score.read_text(encoding="utf-8"))
        print(report(score(entries, recorded["results"], suite)))
        return 0

    clients = []
    for client in filter(None, args.clients.split(",")):
        if client not in CLIENTS:
            parser.error(f"unknown client {client!r}")
        if shutil.which(client):
            clients.append(client)
        else:
            print(f"note: {client} is not installed; skipped", file=sys.stderr)
    if not clients:
        print("no client to run", file=sys.stderr)
        return 1

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = args.out or OUT_ROOT / stamp
    out.mkdir(parents=True, exist_ok=True)
    models = {"claude": args.claude_model, "codex": args.codex_model}
    meta = {
        "date": stamp,
        "revision": revision(),
        "suite": str(args.suite),
        "clients": {
            client: {"version": client_version(client), "model": models[client] or "client default"}
            for client in clients
        },
    }
    results: list[dict] = []
    workspaces = {client: make_workspace(args.suite) for client in clients}
    pool = ThreadPoolExecutor(max_workers=max(1, args.jobs))
    try:
        futures = {
            pool.submit(run_one, client, entry, workspaces[client], models[client], args.timeout): (client, entry)
            for client in clients
            for entry in entries
        }
        for future in as_completed(futures):
            client, entry = futures[future]
            try:
                result = future.result()
            except Exception as exc:  # one broken run must not discard the paid ones
                result = {"id": entry["id"], "client": client, "expected": entry["expected"], "opened": [],
                          "error": f"{type(exc).__name__}: {exc}", "seconds": 0.0}
            results.append(result)
            label = result_label(result, suite)
            mark = "ok " if label == result["expected"] else "MISS"
            raw = ",".join(result["opened"]) or result["error"] or "no skill"
            print(f"{mark} {client:6} {result['id']:36} -> {label or 'error'} ({raw})", flush=True)
    except KeyboardInterrupt:
        print("interrupted: writing the results collected so far", file=sys.stderr)
        meta["interrupted"] = True
    finally:
        pool.shutdown(wait=True, cancel_futures=True)
        for workspace in workspaces.values():
            shutil.rmtree(workspace, ignore_errors=True)
    order = {(client, entry["id"]): n for n, (client, entry) in enumerate((c, e) for c in clients for e in entries)}
    results.sort(key=lambda r: order[(r["client"], r["id"])])

    for client in clients:
        observed = Counter(r["model"] for r in results if r["client"] == client and r.get("model"))
        if observed:
            meta["clients"][client]["observed_model"] = observed.most_common(1)[0][0]
    (out / "results.json").write_text(json.dumps({"meta": meta, "results": results}, indent=2) + "\n")
    summary = report(score(entries, results, suite))
    (out / "summary.md").write_text(f"# Routing run {stamp} at {meta['revision']}\n\n{summary}\n")
    print(f"\n{summary}\nresults: {out.relative_to(REPO_ROOT) if out.is_relative_to(REPO_ROOT) else out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
