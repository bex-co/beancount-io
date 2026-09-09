"""Every documented `bea` invocation runs in CI with its expected outcome.

A fenced block tagged ```bash is runnable in order within its document; a
block tagged ```bash norun is illustrative and must carry a `#` comment
saying why (needs credentials, a browser, or network). Each runnable fence
runs as a Bash script in a temporary directory with `bea` on PATH. Lines that
are not commands (expected output, transcripts) are skipped; results the docs
state ("leaves 987.50 USD in checking") are asserted in EXPECT below.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

import pytest

CLI_DIR = Path(__file__).resolve().parents[1]
DOCS = {
    "README.md": CLI_DIR / "README.md",
    "USAGE.md": CLI_DIR / "docs" / "USAGE.md",
    "IMPORTING.md": CLI_DIR / "docs" / "IMPORTING.md",
    "TUTORIAL.md": CLI_DIR / "docs" / "TUTORIAL.md",
}

# First tokens a runnable fence may execute. Anything else is expected output
# or a transcript and is skipped; a runnable fence that keeps no command fails.
COMMANDS = frozenset({"bea", "cd", "cat", "export", "unset", "mkdir", "touch", "cp", "mv", "printf", "echo"})

HEREDOC = re.compile(r"<<-?\s*'?(?P<tag>[A-Za-z0-9_]+)'?")


@dataclass
class Fence:
    doc: str
    index: int
    line: int
    runnable: bool
    body: str


@dataclass
class DocPlan:
    mode: str = "sequential"  # or "isolated": fresh directory and setup per fence
    setup: list[str] = field(default_factory=list)
    setup_skip: frozenset[int] = frozenset()
    expect: dict[int, tuple[int, list[str]]] = field(default_factory=dict)


USAGE_SETUP = [
    "bea --no-input init books --currency USD --date 2026-01-01 "
    '--opening-balance "Assets:Checking 1000" --opening-balance "Assets:Cash 1000"',
    "cd books",
    "bea add open --date 2026-01-01 --account Expenses:Food -c USD",
    "bea add open --date 2026-01-01 --account Assets:Brokerage -c AAPL",
    "bea add open --date 2026-01-01 --account Assets:Euro -c EUR",
    "bea add open --date 2026-01-01 --account Assets:OldAccount -c USD",
    'bea add price --date 2026-01-01 --currency EUR --amount "1.08 USD"',
    "printf 'include \"2026.bean\"\\n' >> main.bean",
    "touch 2026.bean",
    "mkdir -p receipts",
    "touch receipts/april.pdf",
    "cat > transactions.json <<'EOF'",
    '[{"date": "2026-08-04", "narration": "Groceries", "postings": '
    '[{"account": "Expenses:Groceries", "amount": "45.00 USD"}, {"account": "Assets:Checking"}]}]',
    "EOF",
]

PLANS = {
    # Quick start builds books/; the command map reuses it.
    "README.md": DocPlan(expect={2: (0, ["987.50"])}),
    # Example gallery: every fence starts from the same seeded ledger, except
    # the init fence, which creates it. The check fence ends on the bare
    # `bea query`, which needs a terminal and exits 2 without one.
    "USAGE.md": DocPlan(mode="isolated", setup=USAGE_SETUP, setup_skip=frozenset({2}), expect={3: (2, [])}),
    # Narratives share one directory; the examples/ copy serves the --config,
    # --rules, and CSV paths the walkthroughs reference.
    "IMPORTING.md": DocPlan(setup=["mkdir -p docs", "cp -r _EXAMPLES_ docs/examples"]),
    "TUTORIAL.md": DocPlan(setup=["mkdir -p docs", "cp -r _EXAMPLES_ docs/examples"]),
}


def collect(doc: str, path: Path) -> list[Fence]:
    fences: list[Fence] = []
    lines = path.read_text().splitlines()
    index = 0
    i = 0
    while i < len(lines):
        match = re.match(r"^```bash(?P<tag>.*)$", lines[i])
        if match:
            start = i + 1
            j = i + 1
            while j < len(lines) and lines[j] != "```":
                j += 1
            fences.append(Fence(doc, index, start, match.group("tag").strip() != "norun", "\n".join(lines[i + 1 : j])))
            index += 1
            i = j
        i += 1
    return fences


def stripped(line: str) -> str:
    """A fence line without its transcript `$ ` prompt, if any."""
    return line[2:] if line.startswith("$ ") else line


def script_for(body: str) -> str | None:
    """The executable lines of a fence, or None when it runs nothing."""
    kept: list[str] = []
    lines = body.splitlines()
    i = 0
    while i < len(lines):
        line = stripped(lines[i])
        words = line.strip().split(maxsplit=1)
        heredoc_match = HEREDOC.search(line)
        if heredoc_match and words and words[0] in COMMANDS:
            kept.append(line)
            tag = heredoc_match.group("tag")
            i += 1
            while i < len(lines) and lines[i] != tag:
                kept.append(lines[i])
                i += 1
            if i < len(lines):
                kept.append(lines[i])
        elif not line.strip() or line.strip().startswith("#") or (words and words[0] in COMMANDS):
            kept.append(line)
            # A trailing backslash continues the logical line; its
            # continuation lines run with it regardless of first token.
            while line.rstrip().endswith("\\") and i + 1 < len(lines):
                i += 1
                line = lines[i]
                kept.append(line)
        i += 1
    # A fence of only comments still runs (as a no-op); a fence that keeps
    # nothing executable has no business tagged runnable.
    if not any(ln.strip() and not ln.strip().startswith("#") for ln in kept):
        return None
    return "\n".join(kept)


def run_script(script: str, cwd: Path, env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["bash", "-e", "-c", script],
        cwd=cwd,
        env=env,
        stdin=subprocess.DEVNULL,
        text=True,
        capture_output=True,
        timeout=120,
    )


def apply_cd(line: str, cwd: Path, root: Path) -> Path:
    match = re.match(r"^cd\s+(\S+)\s*$", line)
    if not match:
        return cwd
    target = (cwd / match.group(1)).resolve()
    assert root in target.parents or target == root, f"cd escapes the temporary directory: {line}"
    return target


@pytest.fixture
def runner_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> dict[str, str]:
    bea = shutil.which("bea")
    assert bea, "bea is not on PATH; run pytest through `uv run`"
    assert shutil.which("jq"), "jq is required to run the documented JSON examples"
    env = {k: v for k, v in os.environ.items() if k not in ("BEA_FILE", "BEA_TOKEN")}
    env["BEA_NO_UPDATE_NOTIFIER"] = "1"
    return env


def run_doc(doc: str, path: Path, plan: DocPlan, tmp_path: Path, env: dict[str, str]) -> None:
    """Run one document's fences; failures name the document and fence line."""
    fences = collect(doc, path)
    assert fences, f"{doc} has no bash fences"
    unknown = set(plan.expect) - {fence.index for fence in fences}
    assert not unknown, f"{doc} expectations reference missing fences: {sorted(unknown)}"
    root = tmp_path / "work"
    root.mkdir()
    cfg = tmp_path / "cfg"
    cfg.mkdir()
    env["BEA_CONFIG_DIR"] = str(cfg)
    setup = [line.replace("_EXAMPLES_", str(CLI_DIR / "docs" / "examples")) for line in plan.setup]
    if plan.mode == "sequential":
        cwd = root
        if setup:
            result = run_script("\n".join(setup), cwd, env)
            assert result.returncode == 0, f"{doc} setup failed:\n{result.stderr[-2000:]}"
            for line in setup:
                cwd = apply_cd(line, cwd, root)
    for fence in fences:
        if not fence.runnable:
            first = next((ln for ln in fence.body.splitlines() if ln.strip()), "")
            assert first.startswith("#"), f"{doc} fence {fence.index} (line {fence.line}) is norun without a reason"
            continue
        script = script_for(fence.body)
        assert script is not None, f"{doc} fence {fence.index} (line {fence.line}) runs nothing"
        if plan.mode == "isolated":
            # Every fence starts from a pristine directory so examples stay
            # independent of each other; the setup seeds the ledger they assume.
            fence_root = root / f"fence-{fence.index}"
            fence_root.mkdir()
            cwd = fence_root
            if fence.index not in plan.setup_skip and setup:
                result = run_script("\n".join(setup), cwd, env)
                assert result.returncode == 0, (
                    f"{doc} setup failed before fence {fence.index}:\n{result.stderr[-2000:]}"
                )
                for line in setup:
                    cwd = apply_cd(line, cwd, fence_root)
        result = run_script(script, cwd, env)
        expected, fragments = plan.expect.get(fence.index, (0, []))
        label = f"{doc} fence {fence.index} (line {fence.line})"
        assert result.returncode == expected, (
            f"{label}: exit {result.returncode}, expected {expected}\n"
            f"--- script ---\n{script}\n--- stderr ---\n{result.stderr[-3000:]}"
        )
        combined = result.stdout + result.stderr
        for fragment in fragments:
            assert fragment in combined, f"{label}: missing {fragment!r}\n{combined[-3000:]}"
        for line in script.splitlines():
            cwd = apply_cd(line, cwd, root)


@pytest.mark.parametrize("doc", sorted(DOCS))
def test_doc_examples(doc: str, tmp_path: Path, runner_env: dict[str, str]) -> None:
    run_doc(doc, DOCS[doc], PLANS[doc], tmp_path, runner_env)


def write_doc(tmp_path: Path, body: str) -> Path:
    path = tmp_path / "SYN.md"
    path.write_text(body)
    return path


def test_failing_command_reports_document_and_line(tmp_path: Path, runner_env: dict[str, str]) -> None:
    path = write_doc(tmp_path, "```bash\nbea check\n```\n")
    with pytest.raises(AssertionError, match=r"SYN\.md fence 0 \(line 1\): exit 2, expected 0"):
        run_doc("SYN.md", path, DocPlan(), tmp_path, runner_env)


def test_norun_fence_without_a_reason_fails(tmp_path: Path, runner_env: dict[str, str]) -> None:
    path = write_doc(tmp_path, "```bash norun\nbea check\n```\n")
    with pytest.raises(AssertionError, match="norun without a reason"):
        run_doc("SYN.md", path, DocPlan(), tmp_path, runner_env)


def test_runnable_fence_with_only_transcript_fails(tmp_path: Path, runner_env: dict[str, str]) -> None:
    path = write_doc(tmp_path, '```bash\n{"some": "output"}\n```\n')
    with pytest.raises(AssertionError, match="runs nothing"):
        run_doc("SYN.md", path, DocPlan(), tmp_path, runner_env)


def test_expectation_for_a_missing_fence_fails(tmp_path: Path, runner_env: dict[str, str]) -> None:
    path = write_doc(tmp_path, "```bash norun\n# Needs a reason.\n```\n")
    plan = DocPlan(expect={7: (0, [])})
    with pytest.raises(AssertionError, match=r"missing fences: \[7\]"):
        run_doc("SYN.md", path, plan, tmp_path, runner_env)


def test_missing_expected_fragment_fails(tmp_path: Path, runner_env: dict[str, str]) -> None:
    path = write_doc(tmp_path, "```bash\nbea --version\n```\n")
    plan = DocPlan(expect={0: (0, ["no such fragment"])})
    with pytest.raises(AssertionError, match="missing 'no such fragment'"):
        run_doc("SYN.md", path, plan, tmp_path, runner_env)
