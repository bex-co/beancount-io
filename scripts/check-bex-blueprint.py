#!/usr/bin/env python3
"""Guard the bex Blueprint against what makes it work for us and nobody else.

bex builds a service's public hostname from its name and its internal address
from its slug, and both gain a suffix when another workspace already holds the
name. So a Blueprint that writes a hostname, or an internal service address,
into itself deploys for exactly one workspace. This checks `bex.yaml` for the
regressions the one-click deploy was fixed against:

  * a hardcoded platform hostname           (`*.onbex.co`)
  * a literal internal address              (`http://beancount-api:4104`, `value: beancount-gitea`)
  * a `sync: false` variable                (every one becomes a question on the deploy form)
  * a service naming its own `repo`/`branch` (a fork would deploy ours)
  * a reference to a resource that is not declared
  * a `fromService` whose `type` is not the type the service is declared with
  * a Gitea service declared as a `web` service (its login page and API would
    be on the internet; it must stay a private `pserv`)

    python3 scripts/check-bex-blueprint.py [path/to/bex.yaml]

It reads the file as text (no YAML parser: the standard library has none) and
ignores comments, which is where these names are explained.
"""

from __future__ import annotations

import pathlib
import re
import sys

DEFAULT = pathlib.Path(__file__).resolve().parent.parent / "bex.yaml"

HOSTNAME = re.compile(r"[a-z0-9][a-z0-9-]*\.onbex\.co\b")
RESOURCE = re.compile(r"^  - name:\s*(\S+)\s*$")
REFERENCE = re.compile(r"^\s{8,}name:\s*(\S+)\s*$")
SERVICE_TYPE = re.compile(r"^    type:\s*(\S+)\s*$")
SIBLING_TYPE = re.compile(r"^\s{8,}type:\s*(\S+)\s*$")


def indent(line: str) -> int:
    return len(line) - len(line.lstrip())


def declared_types(lines: list[tuple[int, str]]) -> dict[str, tuple[int, str]]:
    """Each service's declared `type`, with the line it is on."""
    types: dict[str, tuple[int, str]] = {}
    current: str | None = None
    for number, line in lines:
        if resource := RESOURCE.match(line):
            current = resource.group(1)
        elif current and (kind := SERVICE_TYPE.match(line)):
            types.setdefault(current, (number, kind.group(1)))
    return types


def code_lines(text: str) -> list[tuple[int, str]]:
    """Each non-comment line with its number, trailing comments removed."""
    lines = []
    for number, raw in enumerate(text.splitlines(), start=1):
        stripped = re.sub(r"(^|\s)#.*$", "", raw).rstrip()
        if stripped.strip():
            lines.append((number, stripped))
    return lines


def check(text: str) -> list[str]:
    lines = code_lines(text)
    declared = {m.group(1) for _, line in lines if (m := RESOURCE.match(line))}
    types = declared_types(lines)
    problems: list[str] = []

    for name, (number, kind) in types.items():
        if "gitea" in name.lower() and kind == "web":
            problems.append(
                f"line {number}: `{name}` is a web service, so its login page and API get a public "
                "address; Gitea stays a private service (`type: pserv`) that only the API and the ledger reach"
            )

    for position, (number, line) in enumerate(lines):
        if HOSTNAME.search(line):
            problems.append(
                f"line {number}: writes a platform hostname; the platform assigns it "
                f"(and adds a suffix when the name is taken): {line.strip()}"
            )
        if re.search(r"\bsync:\s*false\b", line):
            problems.append(
                f"line {number}: `sync: false` is a question on the deploy form; generate "
                "or copy the value, or leave the variable out"
            )
        if re.match(r"^    (repo|branch):", line):
            problems.append(
                f"line {number}: a service names its own {line.strip().split(':')[0]}; "
                "leave it out so it follows the Blueprint's repository and branch"
            )
        for name in declared:
            literal = (
                re.search(rf"://{re.escape(name)}(:\d+)?(?![\w.-])", line)
                or re.search(rf"\bvalue:\s*['\"]?{re.escape(name)}(:\d+)?['\"]?\s*$", line)
            )
            if literal:
                problems.append(
                    f"line {number}: writes the internal address of `{name}`; its address "
                    "uses a slug that gains a suffix, so reference it with `fromService`: "
                    + line.strip()
                )
        reference = REFERENCE.match(line)
        if reference and reference.group(1) not in declared:
            problems.append(
                f"line {number}: refers to `{reference.group(1)}`, which this file does not declare"
            )
        elif reference:
            name = reference.group(1)
            # `type:` is a sibling key of `name:`, on the line before or after it.
            neighbours = lines[max(position - 1, 0) : position + 2]
            for _, neighbour in neighbours:
                sibling = SIBLING_TYPE.match(neighbour)
                if sibling and indent(neighbour) == indent(line) and name in types:
                    if sibling.group(1) != types[name][1]:
                        problems.append(
                            f"line {number}: refers to `{name}` as `{sibling.group(1)}`, "
                            f"but it is declared as `{types[name][1]}`"
                        )
    return problems


def main(argv: list[str]) -> int:
    path = pathlib.Path(argv[1]) if len(argv) > 1 else DEFAULT
    problems = check(path.read_text())
    if problems:
        print(f"{path}: {len(problems)} problem(s)", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        return 1
    print(f"OK: {path.name} writes no hostname or internal address and asks for no input")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
