#!/usr/bin/env python3
"""Structural CI checks for customer-facing and repository development skills.

Validates SKILL.md frontmatter, evals.json, referenced fixtures, the suite
routing set, Python syntax, and ledger fixtures under two deliberate legs:

1. **Customer bea** — `bea check` with global `bean-*` tools scrubbed from PATH
   (managed engine only; no shared-venv mask).
2. **Upstream oracle** — `bean-check` only via the CLI project's locked env
   (`uv run --project cli bean-check`), never as the customer install path.

Some fixtures are deliberately invalid (failure-mode evals); list them in
EXPECTED_BEAN_CHECK_FAILURES. The two legs must agree on every fixture.
"""

from __future__ import annotations

import json
import os
import py_compile
import re
import shlex
import subprocess
import sys
from pathlib import Path


SKILLS_ROOT = Path(__file__).resolve().parents[2] / "skills"
ROUTING_SET = Path(__file__).resolve().parent / "routing.json"
SKILLS_DIR = SKILLS_ROOT
REPO_ROOT = SKILLS_ROOT.parent
DEV_SKILLS_DIR = REPO_ROOT / ".agents" / "skills"
CLI_PROJECT = REPO_ROOT / "cli"

# Ledger fixtures that must fail bean-check (failure-mode evals).
EXPECTED_BEAN_CHECK_FAILURES = {
    "skills/beancount-close/evals/files/eval5_ledger.beancount",
    "skills/beancount-reconcile/evals/files/eval16_ledger.beancount",
    "skills/beancount-reconcile/evals/files/eval18_ledger.beancount",
}

RAW_APPEND = re.compile(
    r"\bappend\w*\b.{0,80}?\bto\b.{0,20}?(ledger file|main file|\./[\w./-]+)",
    re.IGNORECASE,
)
APPEND_EXCUSED = re.compile(
    r"\bbea\b|append_target|append-only|yes/no|confirm|fallback",
    re.IGNORECASE,
)
FALLBACK_SECTION = re.compile(
    r"fallback|without `bea`|no-`bea`|hand-append|side path",
    re.IGNORECASE,
)

# Customer skills must not prescribe a second Beancount CLI install.
PIP_INSTALL_BEANCOUNT = re.compile(
    r"pip\s+install\s+(?:beancount|beanquery|beangulp|beanprice)\b",
    re.IGNORECASE,
)
PRIVATE_ENGINE_PATH = re.compile(
    r"\bBEA_ENGINE\b|\$XDG_DATA_HOME/bea/engine|~/\.local/share/bea/engine",
)
# Beangulp runs without the system libmagic library; only importers that call
# python-magic themselves need it (w5/168, w5/357).
LIBMAGIC_REQUIRED = re.compile(
    r"\b(?:needs?|requires?)\s+(?:the\s+)?system\s+libmagic",
    re.IGNORECASE,
)
CUSTOMER_DOCS = REPO_ROOT / "docs" / "skills"
ROUTING_ENTRY_KEYS = ("id", "prompt", "expected", "confusable", "why")
SKILLS_TOP_FILES = {"README.md", "AGENTS.md", "LICENSE"}
SPARSE_SET = re.compile(r'git -C "\$SKILLS_SRC" sparse-checkout set (.+)')
# A path a guide tells customers to use inside their checkout; stops at a
# placeholder (`<name>`), a shell variable, quoting, or prose.
CHECKOUT_PATH = re.compile(r"\$\{?SKILLS_SRC\}?/([\w./-]*)")


def fail(msg: str) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def check_symlinks() -> None:
    agents = SKILLS_ROOT / "AGENTS.md"
    if agents.is_symlink() or not agents.is_file():
        fail("skills/AGENTS.md must be a regular file, not a symlink")
    if (SKILLS_ROOT / "CLAUDE.md").exists():
        fail("skills/CLAUDE.md must not exist; AGENTS.md is the only instruction file")

    for directory in (SKILLS_DIR, DEV_SKILLS_DIR):
        if directory.is_symlink() or not directory.is_dir():
            fail(f"{directory.relative_to(REPO_ROOT)} must be a real directory")

    claude_skills = REPO_ROOT / ".claude" / "skills"
    expected = Path("../.agents/skills")
    if not claude_skills.is_symlink() or claude_skills.readlink() != expected:
        fail(".claude/skills must be a relative symlink to ../.agents/skills")


def repo_files(*paths: str) -> list[str]:
    """Repository-relative files under PATHS that git tracks or would add (ignored ones excluded)."""
    out = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", *paths],
        capture_output=True, text=True, check=True,
    ).stdout
    return [path for path in out.split("\0") if path]


def check_layout() -> None:
    """`skills/` holds skill folders, README.md, AGENTS.md, and their shared LICENSE."""
    if (SKILLS_ROOT / ".claude").exists():
        fail("skills/ must not hold a .claude/ folder; each customer skill lives at skills/<name>/SKILL.md")
    for rel in repo_files("skills"):
        parts = Path(rel).parts
        if len(parts) == 2 and parts[1] not in SKILLS_TOP_FILES:
            fail(f"{rel}: only README.md, AGENTS.md, and LICENSE sit directly in skills/; guides belong in docs/skills/, tooling in scripts/skills/")
        if len(parts) > 2 and not (SKILLS_ROOT / parts[1] / "SKILL.md").is_file():
            fail(f"skills/{parts[1]}/ has no SKILL.md; only skill folders belong in skills/")
    # git cannot track an empty folder, but `install` would still link one.
    for folder in sorted(SKILLS_ROOT.glob("beancount-*/")):
        if not (folder / "SKILL.md").is_file():
            fail(f"skills/{folder.name}/ has no SKILL.md")
    print("OK layout skills/")


def check_checkout_paths() -> None:
    """Every `$SKILLS_SRC/<path>` a guide gives customers exists in their sparse checkout."""
    install_doc = CUSTOMER_DOCS / "installation.md"
    sparse = SPARSE_SET.search(install_doc.read_text(encoding="utf-8"))
    if sparse is None:
        fail(f"{install_doc.relative_to(REPO_ROOT)}: no `sparse-checkout set` command to check guide paths against")
    fetched = sparse.group(1).split()
    files = repo_files(*fetched)
    present = {*files, *(str(parent) for path in files for parent in Path(path).parents)}
    guides = [*sorted(CUSTOMER_DOCS.glob("*.md")), SKILLS_ROOT / "README.md", SKILLS_ROOT / "AGENTS.md"]
    for guide in guides:
        rel = guide.relative_to(REPO_ROOT)
        for number, line in enumerate(guide.read_text(encoding="utf-8").splitlines(), 1):
            for match in CHECKOUT_PATH.finditer(line):
                path = match.group(1).rstrip("./")
                if path and path not in present:
                    fail(
                        f"{rel}:{number}: $SKILLS_SRC/{path} is not in the customer's checkout "
                        f"(it fetches: {' '.join(fetched)})"
                    )
    print("OK checkout paths in customer guides")


def skill_files(pattern: str) -> list[Path]:
    """PATTERN inside each customer skill folder and each development skill.

    `skills/` also holds README.md and AGENTS.md, so only its `beancount-*`
    folders count as skill content here."""
    customer = SKILLS_DIR.glob(f"beancount-*/{pattern.removeprefix('*/')}")
    return sorted([*customer, *DEV_SKILLS_DIR.glob(pattern)])


def parse_frontmatter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        fail(f"{path.relative_to(REPO_ROOT)}: missing YAML frontmatter")
    end = text.find("\n---\n", 4)
    if end < 0:
        fail(f"{path.relative_to(REPO_ROOT)}: unclosed YAML frontmatter")
    meta: dict[str, str] = {}
    for line in text[4:end].splitlines():
        # Top-level keys only: an indented `name:` inside a nested block must
        # neither overwrite nor satisfy the skill's own `name`.
        if not line.strip() or line.lstrip().startswith("#") or line[0] in " \t":
            continue
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip().strip("\"'")
    return meta


def check_skill_md() -> None:
    for directory in (SKILLS_DIR, DEV_SKILLS_DIR):
        if not any(directory.glob("*/SKILL.md")):
            fail(f"no SKILL.md files found under {directory.relative_to(REPO_ROOT)}")
    # Every top-level folder with a SKILL.md, so a stray skill is caught.
    for path in sorted([*SKILLS_DIR.glob("*/SKILL.md"), *DEV_SKILLS_DIR.glob("*/SKILL.md")]):
        customer_facing = path.parent.name.startswith("beancount-")
        if customer_facing != (path.parent.parent == SKILLS_DIR):
            destination = SKILLS_DIR if customer_facing else DEV_SKILLS_DIR
            fail(f"{path.relative_to(REPO_ROOT)} belongs in {destination.relative_to(REPO_ROOT)}")
        meta = parse_frontmatter(path)
        rel = path.relative_to(REPO_ROOT)
        for key in ("name", "description"):
            if not meta.get(key):
                fail(f"{rel}: frontmatter missing '{key}'")
        data = check_metadata(rel, meta, path, customer_facing)
        # Public skill installers (vercel-labs/skills) hide a skill whose
        # metadata sets `internal` to the boolean true, which the JSON form
        # above yields. Development skills must hide; customer skills must not.
        # The block parser yields strings; YAML hosts read `true` as a boolean.
        if customer_facing and data.get("internal") in (True, "true", "True", "TRUE"):
            fail(f"{rel}: a customer skill must not set metadata internal; public installers would hide it")
        if not customer_facing and data.get("internal") is not True:
            fail(f"{rel}: a development skill must set metadata: {{\"internal\": true}} so public installers skip it")
        print(f"OK frontmatter {rel}")


def metadata_block(path: Path) -> list[str] | None:
    """The indented lines under a top-level `metadata:` key, or None."""
    lines = path.read_text(encoding="utf-8").splitlines()
    for index, line in enumerate(lines[1:], 1):
        if line == "---":
            return None
        if line.rstrip() == "metadata:":
            block = []
            for following in lines[index + 1:]:
                if following and following[0] in " \t":
                    block.append(following)
                elif following.strip():
                    break
            return block
    return None


def parse_yaml_subset(rel: Path, lines: list[str]):
    """Parse the small YAML subset customer `metadata:` blocks use.

    Nested mappings, lists (of scalars or mappings), and plain or quoted
    string scalars — no flow syntax, anchors, or multi-line values. ci-check
    is stdlib-only, and this is the whole shape the suite writes."""
    rows = [(len(line) - len(line.lstrip(" ")), line.strip()) for line in lines if line.strip()]
    if not rows or any("\t" in line for line in lines):
        fail(f"{rel}: frontmatter 'metadata' block must use space indentation")

    def scalar(text: str) -> str:
        if text.startswith(("{", "[", "&", "*", "|", ">", "!")):
            fail(f"{rel}: frontmatter 'metadata' block uses YAML this checker does not read: {text!r}")
        if len(text) >= 2 and text[0] == text[-1] == "'":
            return text[1:-1].replace("''", "'")
        if len(text) >= 2 and text[0] == text[-1] == '"':
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                fail(f"{rel}: frontmatter 'metadata' block has a bad quoted scalar: {text!r}")
        return text

    def parse(index: int, indent: int):
        is_list = rows[index][1].startswith("- ")
        result: dict | list = [] if is_list else {}
        while index < len(rows):
            row_indent, text = rows[index]
            if row_indent != indent:
                break
            if is_list:
                if not text.startswith("- "):
                    break
                item = text[2:]
                if ": " in item or item.endswith(":"):
                    rows[index] = (indent + 2, item)
                    value, index = parse(index, indent + 2)
                    result.append(value)
                else:
                    result.append(scalar(item))
                    index += 1
            else:
                key, sep, rest = text.partition(":")
                if not sep or not key.strip():
                    fail(f"{rel}: frontmatter 'metadata' block has a non-mapping line: {text!r}")
                rest = rest.strip()
                if rest:
                    result[key.strip()] = scalar(rest)
                    index += 1
                elif index + 1 < len(rows) and rows[index + 1][0] > indent:
                    value, index = parse(index + 1, rows[index + 1][0])
                    result[key.strip()] = value
                else:
                    fail(f"{rel}: frontmatter 'metadata' block key {key.strip()!r} has no value")
        return result, index

    data, consumed = parse(0, rows[0][0])
    if consumed != len(rows):
        fail(f"{rel}: frontmatter 'metadata' block has inconsistent indentation")
    return data


def check_metadata(rel: Path, meta: dict[str, str], path: Path, customer_facing: bool) -> dict:
    if "metadata" not in meta:
        return {}
    # Customer skills carry the registry metadata as a block YAML mapping:
    # the Agent Skills validator (skills-ref, strictyaml) rejects flow
    # mappings, and OpenClaw documents multi-line YAML mappings as parsed
    # YAML first, then flattened and re-read as JSON5. Development skills
    # keep one line of JSON — their only key is the internal flag, which
    # public installers compare against the boolean true.
    if customer_facing:
        block = metadata_block(path)
        if meta["metadata"] or not block:
            fail(f"{rel}: customer 'metadata' must be a block YAML mapping, not one line of JSON (the Agent Skills validator rejects flow mappings)")
        data = parse_yaml_subset(rel, block)
        if not isinstance(data, dict):
            fail(f"{rel}: customer 'metadata' must be a block YAML mapping")
        return data
    try:
        data = json.loads(meta["metadata"])
    except json.JSONDecodeError as error:
        fail(f"{rel}: frontmatter 'metadata' must be a single-line JSON object ({error})")
    if not isinstance(data, dict):
        fail(f"{rel}: frontmatter 'metadata' must be a single-line JSON object")
    return data


def check_evals() -> None:
    for evals_path in skill_files("*/evals/evals.json"):
        rel = evals_path.relative_to(REPO_ROOT)
        try:
            data = json.loads(evals_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            fail(f"{rel}: invalid JSON ({exc})")
        if "evals" not in data or not isinstance(data["evals"], list):
            fail(f"{rel}: missing 'evals' array")
        skill_root = evals_path.parent.parent
        for entry in data["evals"]:
            if not isinstance(entry, dict) or "id" not in entry:
                fail(f"{rel}: eval entry missing 'id'")
            for file_rel in entry.get("files", []):
                candidate = skill_root / file_rel
                if not candidate.is_file():
                    fail(f"{rel}: referenced file missing: {file_rel}")
        print(f"OK evals {rel}")


def check_routing() -> None:
    """The suite routing set must name only skills that exist, never repeat a
    prompt, and give every customer skill positives and near-miss negatives."""
    path = ROUTING_SET
    rel = path.relative_to(REPO_ROOT)
    if not path.is_file():
        fail(f"{rel} is missing")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"{rel}: invalid JSON ({exc})")
    entries = data.get("entries") if isinstance(data, dict) else None
    if not isinstance(entries, list) or not entries:
        fail(f"{rel}: missing 'entries' array")
    skills = sorted(p.parent.name for p in SKILLS_DIR.glob("beancount-*/SKILL.md"))
    labels = {*skills, "none"}
    expected_seen: set[str] = set()
    confusable_seen: set[str] = set()
    ids: set[str] = set()
    prompts: dict[str, str] = {}
    for entry in entries:
        if not isinstance(entry, dict) or any(key not in entry for key in ROUTING_ENTRY_KEYS):
            fail(f"{rel}: every entry needs {', '.join(ROUTING_ENTRY_KEYS)}: {entry!r}")
        name, expected = entry["id"], entry["expected"]
        if name in ids:
            fail(f"{rel}: duplicate id {name!r}")
        ids.add(name)
        prompt = " ".join(str(entry["prompt"]).split()).casefold()
        if prompt in prompts:
            fail(f"{rel}: {name!r} repeats the prompt of {prompts[prompt]!r}")
        prompts[prompt] = name
        if expected not in labels:
            fail(f"{rel}: {name!r} expects {expected!r}, which is not a customer skill or 'none'")
        for other in entry["confusable"]:
            if other not in skills:
                fail(f"{rel}: {name!r} lists confusable {other!r}, which is not a customer skill")
            if other == expected:
                fail(f"{rel}: {name!r} lists its own expected skill as confusable")
            confusable_seen.add(other)
        expected_seen.add(expected)
    for skill in skills:
        if skill not in expected_seen:
            fail(f"{rel}: no entry expects {skill}")
        if skill not in confusable_seen:
            fail(f"{rel}: no near-miss entry lists {skill} as confusable")
    print(f"OK routing {rel} ({len(entries)} entries)")


BEA_MINIMUM = re.compile(r"needs\s+`bea`\s+(\d+\.\d+\.\d+)\s+or\s+later")
BEA_MINIMUM_NOTE = re.compile(r"\*\*Minimum\s+(\d+\.\d+\.\d+)\.\*\*")
BEA_STATED_VERSION = re.compile(r"bea`(?:\*\*|\]\([^)]*\))?\s+(\d+\.\d+\.\d+)\s+or\s+later")


def bea_minimum() -> tuple[Path, str, str]:
    """The shared contract, its text, and the one minimum `bea` it declares."""
    contract = SKILLS_DIR / "beancount-init" / "references" / "bea-cli.md"
    text = contract.read_text(encoding="utf-8")
    declared = set(BEA_MINIMUM.findall(text))
    if len(declared) != 1:
        fail(f"{contract.relative_to(REPO_ROOT)} must declare one minimum (`needs `bea` X.Y.Z or later`)")
    return contract, text, declared.pop()


def check_bea_minimum() -> None:
    """The shared contract declares one minimum `bea`; the catalog and the
    install guide state the same one."""
    contract, text, minimum = bea_minimum()
    surfaces = {contract: BEA_MINIMUM_NOTE.findall(text)}
    for doc in (SKILLS_ROOT / "README.md", CUSTOMER_DOCS / "installation.md"):
        surfaces[doc] = BEA_STATED_VERSION.findall(doc.read_text(encoding="utf-8"))
    for path, versions in surfaces.items():
        rel = path.relative_to(REPO_ROOT)
        if not versions:
            fail(f"{rel} does not state the minimum bea {minimum}")
        if any(version != minimum for version in versions):
            fail(f"{rel} states bea {', '.join(sorted(set(versions)))}; the minimum in bea-cli.md is {minimum}")
    print(f"OK minimum bea {minimum} stated consistently")


def check_python() -> None:
    for path in skill_files("**/*.py"):
        try:
            py_compile.compile(str(path), doraise=True)
        except py_compile.PyCompileError as exc:
            fail(str(exc))
        print(f"OK python {path.relative_to(REPO_ROOT)}")


def resolve_tool(candidates: list[list[str]], probe: str, missing: str) -> list[str]:
    for candidate in candidates:
        try:
            subprocess.run(
                [*candidate, probe],
                check=True,
                capture_output=True,
            )
            return candidate
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    fail(missing)


def find_bea() -> list[str]:
    """Customer install under test: PATH bea, else the CLI project's bea."""
    return resolve_tool(
        [
            ["bea"],
            ["uv", "run", "--project", str(CLI_PROJECT), "bea"],
        ],
        "--version",
        "bea not found (install beancount-io, or sync cli)",
    )


def find_bean_check_oracle() -> list[str]:
    """Deliberate upstream reference — never the customer PATH bean-check."""
    override = os.environ.get("BEA_SKILLS_ORACLE_BEAN_CHECK", "").strip()
    if override:
        return shlex.split(override)
    return resolve_tool(
        [["uv", "run", "--project", str(CLI_PROJECT), "bean-check"]],
        "--help",
        "oracle bean-check not found (sync cli with uv sync --all-groups)",
    )


def env_without_global_bean_tools(extra: dict[str, str] | None = None) -> dict[str, str]:
    """PATH scrub so customer bea cannot mask itself with a global bean-*."""
    env = {**os.environ, "BEA_NO_UPDATE_NOTIFIER": "1", **(extra or {})}
    cleaned: list[str] = []
    for part in env.get("PATH", "").split(os.pathsep):
        if not part:
            continue
        directory = Path(part)
        if (directory / "bean-check").exists() or (directory / "bean-query").exists():
            continue
        cleaned.append(part)
    env["PATH"] = os.pathsep.join(cleaned)
    return env


def path_has_bean_check(env: dict[str, str]) -> bool:
    for part in env.get("PATH", "").split(os.pathsep):
        if part and (Path(part) / "bean-check").exists():
            return True
    return False


def check_ledgers() -> None:
    bea = find_bea()
    oracle = find_bean_check_oracle()
    bea_env = env_without_global_bean_tools()
    if path_has_bean_check(bea_env):
        fail("PATH scrub failed: bean-check still visible to the customer bea leg")

    # Oracle keeps the full environment (cli uv project) so bean-check resolves.
    oracle_env = {**os.environ, "BEA_NO_UPDATE_NOTIFIER": "1"}

    ledgers = skill_files("**/*ledger.beancount")
    if not ledgers:
        fail("no *ledger.beancount fixtures found")

    unexpected_pass: list[str] = []
    unexpected_fail: list[str] = []
    bea_disagree: list[str] = []

    print(f"Customer bea: {' '.join(bea)} (PATH without bean-*)")
    print(f"Oracle bean-check: {' '.join(oracle)}")

    for path in ledgers:
        rel = path.relative_to(REPO_ROOT).as_posix()
        oracle_result = subprocess.run(
            [*oracle, str(path)],
            capture_output=True,
            text=True,
            env=oracle_env,
        )
        failed = oracle_result.returncode != 0 or bool(
            oracle_result.stdout.strip() or oracle_result.stderr.strip()
        )
        expected_fail = rel in EXPECTED_BEAN_CHECK_FAILURES

        bea_result = subprocess.run(
            [*bea, "--file", str(path), "check"],
            capture_output=True,
            text=True,
            env=bea_env,
        )
        bea_failed = bea_result.returncode != 0
        if bea_failed != failed:
            bea_disagree.append(rel)
            detail = (bea_result.stdout or bea_result.stderr).strip().splitlines()
            print(f"bea check disagrees with oracle bean-check for {rel}:", file=sys.stderr)
            for line in detail[:8]:
                print(f"  {line}", file=sys.stderr)
        else:
            status = "expected-fail" if expected_fail else "pass"
            print(f"OK bea check ({status}) {rel}")

        if expected_fail and not failed:
            unexpected_pass.append(rel)
        elif not expected_fail and failed:
            unexpected_fail.append(rel)
            detail = (oracle_result.stdout or oracle_result.stderr).strip().splitlines()
            print(f"oracle bean-check errors for {rel}:", file=sys.stderr)
            for line in detail[:8]:
                print(f"  {line}", file=sys.stderr)
        else:
            status = "expected-fail" if expected_fail else "pass"
            print(f"OK oracle bean-check ({status}) {rel}")

    unknown = EXPECTED_BEAN_CHECK_FAILURES - {
        p.relative_to(REPO_ROOT).as_posix() for p in ledgers
    }
    if unknown:
        fail(f"EXPECTED_BEAN_CHECK_FAILURES entries not found: {sorted(unknown)}")
    if unexpected_pass:
        fail(f"expected oracle failures that now pass: {unexpected_pass}")
    if unexpected_fail:
        fail(f"unexpected oracle bean-check failures: {unexpected_fail}")
    if bea_disagree:
        fail(f"`bea check` disagrees with oracle bean-check for: {bea_disagree}")


def check_bea_first() -> None:
    """Every customer skill states a bea preference once and keeps raw appends in fallbacks."""
    for path in sorted(SKILLS_DIR.glob("beancount-*/SKILL.md")):
        skill = path.parent.name
        text = path.read_text(encoding="utf-8")
        if "prefer `bea`" not in text.lower():
            fail(f"skills/{skill}/SKILL.md states no bea preference")
        in_fallback = False
        for lineno, line in enumerate(text.splitlines(), 1):
            if line.startswith("## "):
                in_fallback = bool(FALLBACK_SECTION.search(line))
            elif FALLBACK_SECTION.search(line):
                in_fallback = True
            if not in_fallback and RAW_APPEND.search(line) and not APPEND_EXCUSED.search(line):
                fail(
                    f"skills/{skill}/SKILL.md:{lineno} appends to the ledger "
                    f"outside the fallback block: {line.strip()[:100]}"
                )
        print(f"OK bea-first {skill}")


def check_no_redundant_installs() -> None:
    """Customer skill text must not push a second Beancount CLI install."""
    # A moved or renamed guides directory must fail, not skip the guides silently.
    if not CUSTOMER_DOCS.is_dir():
        fail(f"{CUSTOMER_DOCS.relative_to(REPO_ROOT)} is missing; the customer guides must be checked")
    docs = sorted(CUSTOMER_DOCS.rglob("*.md"))
    for path in [*sorted(SKILLS_DIR.glob("beancount-*/**/*.md")), *docs]:
        rel = path.relative_to(REPO_ROOT).as_posix()
        text = path.read_text(encoding="utf-8")
        # Joined so a claim wrapped across lines is still one sentence.
        if LIBMAGIC_REQUIRED.search(" ".join(text.split())):
            fail(f"{rel} says Beangulp needs system libmagic; it is optional")
        for lineno, line in enumerate(text.splitlines(), 1):
            if PIP_INSTALL_BEANCOUNT.search(line):
                # Allowed only when telling the agent what NOT to do.
                if re.search(
                    r"(?i)(?:\bdo\b.{0,12}\bnot\b|\bdon't\b|\bnever\b|\brather than\b|\bover\b)",
                    line,
                ):
                    continue
                fail(f"{rel}:{lineno} instructs pip install of an upstream accounting tool")
            if PRIVATE_ENGINE_PATH.search(line) and not re.search(
                r"(?i)(?:\bdo\b.{0,12}\bnot\b|\bdon't\b|\bnever\b|\bnot\b)",
                line,
            ):
                fail(f"{rel}:{lineno} documents a private engine path for agents to configure")
        print(f"OK one-install guidance {path.relative_to(REPO_ROOT)}")


SEMVER = re.compile(r"^\d+\.\d+\.\d+$")


def check_plugin_manifests() -> None:
    # One shared suite version reaches plugin users (skills/AGENTS.md holds
    # the rule): the Claude marketplace entry and the Codex plugin manifest
    # must agree on name, version, description, and license, and the Claude
    # entry must list exactly the customer skills on disk.
    def load(rel: str) -> dict:
        path = REPO_ROOT / rel
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            fail(f"{rel}: plugin manifest is missing")
        except json.JSONDecodeError as error:
            fail(f"{rel}: invalid JSON ({error})")

    marketplace = load(".claude-plugin/marketplace.json")
    plugin = load("plugin.json")
    codex_marketplace = load(".agents/plugins/marketplace.json")
    entries = marketplace.get("plugins") or []
    if marketplace.get("name") != "beancount-io" or len(entries) != 1:
        fail(".claude-plugin/marketplace.json: expected one plugin in a marketplace named beancount-io")
    entry = entries[0]
    if entry.get("name") != "beancount-io" or entry.get("source") != "./skills":
        fail('.claude-plugin/marketplace.json: the entry must be beancount-io with source "./skills"')
    on_disk = sorted(f"./{p.parent.name}" for p in SKILLS_DIR.glob("*/SKILL.md"))
    if entry.get("skills") != on_disk:
        fail(f".claude-plugin/marketplace.json: skills must list every customer skill on disk ({on_disk})")
    for field in ("name", "version", "description", "license"):
        if entry.get(field) != plugin.get(field):
            fail(f"plugin manifests disagree on {field}: marketplace entry {entry.get(field)!r} vs plugin.json {plugin.get(field)!r} (one shared suite version — bump both together)")
    if not SEMVER.match(str(entry.get("version", ""))):
        fail(f"plugin manifests: version {entry.get('version')!r} is not semver X.Y.Z")
    codex_entries = codex_marketplace.get("plugins") or []
    if (
        codex_marketplace.get("name") != "beancount-io"
        or len(codex_entries) != 1
        or codex_entries[0].get("name") != "beancount-io"
        or (codex_entries[0].get("source") or {}).get("path") != "./"
    ):
        fail('.agents/plugins/marketplace.json: expected one beancount-io entry with source path "./"')
    print(f"OK plugin manifests (suite version {entry['version']})")


def main() -> None:
    check_symlinks()
    check_layout()
    check_checkout_paths()
    check_skill_md()
    check_evals()
    check_routing()
    check_bea_minimum()
    check_python()
    check_ledgers()
    check_bea_first()
    check_no_redundant_installs()
    check_plugin_manifests()
    print("All skills CI checks passed.")


if __name__ == "__main__":
    if sys.argv[1:] == ["--print-bea-minimum"]:
        # For CI's published-minimum leg (ci-skills.yml).
        print(bea_minimum()[2])
        raise SystemExit(0)
    main()
