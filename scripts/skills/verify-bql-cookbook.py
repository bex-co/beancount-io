#!/usr/bin/env python3
"""Execute every marked BQL recipe in the cookbook against its fixture.

Usage:
  python3 scripts/skills/verify-bql-cookbook.py [--cookbook PATH] [--timeout SECS]

Each recipe is a `<!-- cookbook: <name> | fixture: <repo-relative path> -->`
marker directly above a fenced ```sql block in docs/skills/bql-cookbook.md.
The runner executes every query through `bea --json query` on its declared
fixture and fails when a query errors, returns zero rows, or names a missing
fixture. One line per recipe; exit non-zero on any failure.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

SCRIPTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPTS_DIR.parents[1]
DEFAULT_COOKBOOK = REPO_ROOT / "docs" / "skills" / "bql-cookbook.md"

RECIPE = re.compile(
    r"<!-- cookbook: (?P<name>[A-Za-z0-9_-]+) \| fixture: (?P<fixture>[^<>\s]+) -->"
    r"\n```sql\n(?P<query>.*?)\n```",
    re.DOTALL,
)


class Recipe(NamedTuple):
    name: str
    fixture: str
    query: str


class RecipeResult(NamedTuple):
    recipe: Recipe
    ok: bool
    detail: str


def parse_recipes(text: str) -> list[Recipe]:
    """Every marked recipe in cookbook order; names must be unique."""
    recipes = [
        Recipe(match.group("name"), match.group("fixture"), match.group("query").strip())
        for match in RECIPE.finditer(text)
    ]
    seen: set[str] = set()
    for recipe in recipes:
        if recipe.name in seen:
            raise ValueError(f"duplicate cookbook recipe: {recipe.name}")
        seen.add(recipe.name)
    return recipes


def find_bea() -> list[str]:
    """The repo's installed bea, resolved exactly like the other skills checks."""
    spec = importlib.util.spec_from_file_location("ci_check", SCRIPTS_DIR / "ci-check.py")
    assert spec is not None and spec.loader is not None
    ci_check = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ci_check)
    return ci_check.find_bea()


def run_recipe(bea: list[str], recipe: Recipe, timeout: float) -> RecipeResult:
    fixture = REPO_ROOT / recipe.fixture
    if not fixture.is_file():
        return RecipeResult(recipe, False, f"missing fixture: {recipe.fixture}")
    if not recipe.query:
        return RecipeResult(recipe, False, "empty query block")
    try:
        completed = subprocess.run(
            [*bea, "--file", str(fixture), "--json", "--no-input", "query", recipe.query],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return RecipeResult(recipe, False, f"timed out after {timeout:g}s")
    if completed.returncode != 0:
        return RecipeResult(recipe, False, f"bea failed: {bea_error(completed.stderr)}")
    try:
        payload = json.loads(completed.stdout)
        rows = payload["data"]["rows"]
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        return RecipeResult(recipe, False, f"unparsable bea output: {exc}")
    if not rows:
        return RecipeResult(recipe, False, "zero rows")
    return RecipeResult(recipe, True, f"{len(rows)} rows")


def bea_error(stderr: str) -> str:
    """First useful line of bea's complaint (its JSON envelope, else raw text)."""
    text = stderr.strip() or "no error detail"
    try:
        message = json.loads(text).get("error", {}).get("message", text)
    except (json.JSONDecodeError, AttributeError):
        message = text
    lines = str(message).splitlines()
    return lines[0] if lines else text.splitlines()[0]


def verify(cookbook: Path, bea: list[str], timeout: float) -> list[RecipeResult]:
    recipes = parse_recipes(cookbook.read_text(encoding="utf-8"))
    if not recipes:
        raise ValueError(f"no cookbook recipes found in {cookbook}")
    return [run_recipe(bea, recipe, timeout) for recipe in recipes]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Execute every BQL cookbook recipe.")
    parser.add_argument("--cookbook", type=Path, default=DEFAULT_COOKBOOK)
    parser.add_argument("--timeout", type=float, default=90.0)
    args = parser.parse_args(argv)
    try:
        results = verify(args.cookbook, find_bea(), args.timeout)
    except (ValueError, FileNotFoundError) as exc:
        print(f"FAIL cookbook: {exc}")
        return 1
    failures = 0
    for result in results:
        status = "OK" if result.ok else "FAIL"
        print(f"{status} {result.recipe.name} ({result.detail}, {result.recipe.fixture})")
        failures += not result.ok
    print(f"{len(results) - failures}/{len(results)} cookbook recipes passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
