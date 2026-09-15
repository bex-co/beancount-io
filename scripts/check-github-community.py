#!/usr/bin/env python3
"""Validate the repository's GitHub community files.

Checks every issue form under `.github/ISSUE_TEMPLATE/` for the keys GitHub
requires, unique field ids, and labels from the list below, checks the issue
chooser's `config.yml`, and resolves the relative links in the community
guides. YAML is parsed by Ruby's standard library (preinstalled on GitHub's
runners and on macOS), so the check needs no Python packages.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_DIR = REPO_ROOT / ".github" / "ISSUE_TEMPLATE"

# Labels issue forms may apply. GitHub silently skips a label that does not
# exist, so a form must only name labels that are meant to exist; `skills` and
# `self-host` are created alongside the forms.
KNOWN_LABELS = {
    "bug",
    "documentation",
    "duplicate",
    "enhancement",
    "good first issue",
    "help wanted",
    "invalid",
    "question",
    "wontfix",
    "skills",
    "self-host",
}

FIELD_TYPES = {"markdown", "input", "textarea", "dropdown", "checkboxes"}

LINKED_FILES = [
    "CONTRIBUTING.md",
    "SECURITY.md",
    "CODE_OF_CONDUCT.md",
    ".github/pull_request_template.md",
]

MARKDOWN_LINK = re.compile(r"(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")


def load_yaml(path: Path) -> Any:
    ruby = shutil.which("ruby")
    if ruby is None:
        raise SystemExit("ruby is required to parse the issue forms (YAML).")
    result = subprocess.run(
        [
            ruby,
            "-ryaml",
            "-rjson",
            "-e",
            "puts JSON.generate(YAML.safe_load(File.read(ARGV[0])))",
            str(path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise ValueError(result.stderr.strip().splitlines()[-1] if result.stderr.strip() else "invalid YAML")
    return json.loads(result.stdout)


def form_errors(form: Any) -> list[str]:
    if not isinstance(form, dict):
        return ["the form must be a mapping"]
    errors = [f"missing required key `{key}`" for key in ("name", "description", "body") if not form.get(key)]

    labels = form.get("labels", [])
    if isinstance(labels, str):
        labels = [label.strip() for label in labels.split(",")]
    errors += [f"unknown label `{label}`" for label in labels if label not in KNOWN_LABELS]

    body = form.get("body")
    if not isinstance(body, list):
        return errors
    if not any(isinstance(field, dict) and field.get("type") != "markdown" for field in body):
        errors.append("`body` needs at least one input field besides markdown")

    seen: set[str] = set()
    for index, field in enumerate(body):
        where = f"body[{index}]"
        if not isinstance(field, dict):
            errors.append(f"{where} must be a mapping")
            continue
        field_type = field.get("type")
        if field_type not in FIELD_TYPES:
            errors.append(f"{where} has unsupported type `{field_type}`")
            continue
        attributes = field.get("attributes") or {}
        if field_type == "markdown":
            if not attributes.get("value"):
                errors.append(f"{where} markdown needs `attributes.value`")
            continue
        field_id = field.get("id")
        if not field_id:
            errors.append(f"{where} needs an `id`")
        elif field_id in seen:
            errors.append(f"{where} repeats id `{field_id}`")
        else:
            seen.add(field_id)
        if not attributes.get("label"):
            errors.append(f"{where} needs `attributes.label`")
        if field_type in {"dropdown", "checkboxes"} and not attributes.get("options"):
            errors.append(f"{where} {field_type} needs `attributes.options`")
    return errors


def config_errors(config: Any) -> list[str]:
    if not isinstance(config, dict):
        return ["the chooser config must be a mapping"]
    errors = []
    if not isinstance(config.get("blank_issues_enabled"), bool):
        errors.append("`blank_issues_enabled` must be true or false")
    for index, link in enumerate(config.get("contact_links") or []):
        missing = [key for key in ("name", "url", "about") if not (isinstance(link, dict) and link.get(key))]
        if missing:
            errors.append(f"contact_links[{index}] is missing {', '.join(missing)}")
        elif not str(link["url"]).startswith("https://"):
            errors.append(f"contact_links[{index}] url must be https")
    return errors


def broken_links(path: Path) -> list[str]:
    errors = []
    for target in MARKDOWN_LINK.findall(path.read_text(encoding="utf-8")):
        if re.match(r"^[a-z][a-z0-9+.-]*:", target) or target.startswith("#"):
            continue
        relative = target.split("#", 1)[0]
        if relative and not (path.parent / relative).exists():
            errors.append(f"broken link `{target}`")
    return errors


def main() -> int:
    problems: list[str] = []

    forms = sorted(p for p in TEMPLATE_DIR.glob("*.y*ml") if p.stem != "config")
    if TEMPLATE_DIR.is_dir() and not forms:
        problems.append(f"{TEMPLATE_DIR.relative_to(REPO_ROOT)}: no issue forms found")
    for path in forms:
        try:
            errors = form_errors(load_yaml(path))
        except ValueError as error:
            errors = [f"invalid YAML: {error}"]
        problems += [f"{path.relative_to(REPO_ROOT)}: {error}" for error in errors]

    config = TEMPLATE_DIR / "config.yml"
    if config.exists():
        try:
            errors = config_errors(load_yaml(config))
        except ValueError as error:
            errors = [f"invalid YAML: {error}"]
        problems += [f"{config.relative_to(REPO_ROOT)}: {error}" for error in errors]

    for name in LINKED_FILES:
        path = REPO_ROOT / name
        if path.exists():
            problems += [f"{name}: {error}" for error in broken_links(path)]

    for problem in problems:
        print(f"error: {problem}", file=sys.stderr)
    if problems:
        return 1
    print(f"GitHub community files OK ({len(forms)} issue forms).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
