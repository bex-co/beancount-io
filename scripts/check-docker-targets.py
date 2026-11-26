#!/usr/bin/env python3
"""Guard the Docker targets' sign-in and Git wiring.

`deploy/docker` and `deploy/docker-single-psql` are what a self-hoster follows
step by step, and two settings in them decide whether the mobile app, OAuth
MCP hosts and Git over HTTPS work at all (w0/m10). For each target this checks:

  * backend-v2 is passed `OAUTH_JWKS_FROM_AUTH_SECRET` from `.env`, with no
    default, so an `.env` without the line keeps OAuth off as it always did;
  * `.env.example` sets `OAUTH_JWKS_FROM_AUTH_SECRET=true`, so a new install
    derives its OAuth signing key from `AUTH_SECRET` instead of answering 503;
  * `.env.example` leaves `OAUTH_JWKS` empty: a committed signing key would make
    every clone of this public repository a token issuer;
  * backend-v2's `GIT_PUBLIC_URL` is `https://<API_DOMAIN>/git`, its own Git
    proxy, because Gitea's address takes no Beancount.io credential.

    python3 scripts/check-docker-targets.py [target directory ...]

It reads the files as text (the standard library has no YAML parser) and
ignores comments, which is where these settings are explained.
"""

from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_TARGETS = [ROOT / "deploy" / "docker", ROOT / "deploy" / "docker-single-psql"]

SERVICE = re.compile(r"^  ([A-Za-z0-9_.-]+):\s*$")
ENVIRONMENT = re.compile(r"^    environment:\s*$")
ENV_ENTRY = re.compile(r"^      ([A-Z0-9_]+):\s*(.*?)\s*$")
PASS_THROUGH = re.compile(r"^\$\{OAUTH_JWKS_FROM_AUTH_SECRET(:?-)?\}$")
GIT_PROXY = re.compile(r"^https://\$\{API_DOMAIN(:?[?-][^}]*)?\}/git$")


def without_comment(line: str) -> str:
    return re.sub(r"(^|\s)#.*$", "", line).rstrip()


def backend_environment(compose: str) -> dict[str, str]:
    """backend-v2's `environment:` mapping, as the text Compose interpolates."""
    env: dict[str, str] = {}
    service: str | None = None
    in_environment = False
    for raw in compose.splitlines():
        line = without_comment(raw)
        if not line.strip():
            continue
        if match := SERVICE.match(line):
            service, in_environment = match.group(1), False
        elif service == "backend-v2" and ENVIRONMENT.match(line):
            in_environment = True
        elif service == "backend-v2" and in_environment:
            if entry := ENV_ENTRY.match(line):
                env[entry.group(1)] = entry.group(2).strip("'\"")
            elif len(line) - len(line.lstrip()) <= 4:
                in_environment = False
    return env


def env_example_values(text: str) -> dict[str, str]:
    """The uncommented `KEY=value` lines of an `.env` file."""
    values: dict[str, str] = {}
    for raw in text.splitlines():
        if match := re.match(r"^([A-Z0-9_]+)=(.*)$", raw.strip()):
            values[match.group(1)] = match.group(2).strip()
    return values


def check(compose: str, env_example: str) -> list[str]:
    problems: list[str] = []
    env = backend_environment(compose)
    if not env:
        return ["docker-compose.yml: no `environment:` found for the backend-v2 service"]

    flag = env.get("OAUTH_JWKS_FROM_AUTH_SECRET")
    if flag is None:
        problems.append(
            "docker-compose.yml: backend-v2 is not passed OAUTH_JWKS_FROM_AUTH_SECRET, so OAuth "
            "(the mobile app, MCP hosts) answers 503 unless the operator makes a signing key by hand"
        )
    elif not PASS_THROUGH.match(flag):
        problems.append(
            "docker-compose.yml: backend-v2's OAUTH_JWKS_FROM_AUTH_SECRET must come from .env with no "
            f"default (`${{OAUTH_JWKS_FROM_AUTH_SECRET:-}}`), so an .env without it keeps OAuth off: {flag}"
        )

    git_url = env.get("GIT_PUBLIC_URL")
    if git_url is None or not GIT_PROXY.match(git_url):
        problems.append(
            "docker-compose.yml: backend-v2's GIT_PUBLIC_URL must be `https://${API_DOMAIN}/git`, its "
            "own Git proxy; without it ledgers name Gitea's address, which takes no token or password: "
            f"{git_url or 'unset'}"
        )

    values = env_example_values(env_example)
    if values.get("OAUTH_JWKS_FROM_AUTH_SECRET") != "true":
        problems.append(
            ".env.example: must set OAUTH_JWKS_FROM_AUTH_SECRET=true, so a new install derives its "
            "OAuth signing key from AUTH_SECRET"
        )
    if values.get("OAUTH_JWKS", ""):
        problems.append(
            ".env.example: OAUTH_JWKS must stay empty; a committed signing key lets anyone with this "
            "repository issue tokens for every stack that keeps it"
        )
    return problems


def main(argv: list[str]) -> int:
    targets = [pathlib.Path(arg) for arg in argv[1:]] or DEFAULT_TARGETS
    failed = False
    for target in targets:
        problems = check(
            (target / "docker-compose.yml").read_text(),
            (target / ".env.example").read_text(),
        )
        if problems:
            failed = True
            print(f"{target}: {len(problems)} problem(s)", file=sys.stderr)
            for problem in problems:
                print(f"  {problem}", file=sys.stderr)
        else:
            print(f"OK: {target.name} derives its OAuth key from AUTH_SECRET and serves Git through its proxy")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
