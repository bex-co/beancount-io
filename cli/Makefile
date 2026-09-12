# Beancount.io CLI - Development Makefile

.PHONY: help install install-dev install-tool reinstall-tool dev lint deadcode deadcode-fix format format-check typecheck test codegen check-all release-check release-lock release-artifacts spec-check spec-sync docs docs-check

# Default target
help:
	@echo "Available commands:"
	@echo "  make install          - Install production dependencies"
	@echo "  make install-dev      - Install all dependencies including dev"
	@echo "  make install-tool     - Install CLI as a uv tool (editable)"
	@echo "  make reinstall-tool   - Reinstall CLI tool"
	@echo "  make dev              - Show CLI help"
	@echo "  make lint             - Run ruff linter"
	@echo "  make deadcode         - Detect unused Python code with Vulture"
	@echo "  make deadcode-fix     - Remove fixable unused imports and variables"
	@echo "  make format           - Format code with ruff"
	@echo "  make format-check     - Check formatting without modifying files"
	@echo "  make typecheck        - Run mypy type checks"
	@echo "  make test             - Run tests with pytest across all cores"
	@echo "  make codegen          - Regenerate the REST client and cloud command stubs from openapi/v1.json"
	@echo "  make spec-check       - Fail if openapi/v1.json drifted from backend-cluster/idl's canonical spec"
	@echo "  make spec-sync        - Refresh openapi/v1.json from the canonical spec"
	@echo "  make release-check    - Validate the release tag against pyproject.toml"
	@echo "  make release-lock     - Export the hash-pinned requirements.lock for a release"
	@echo "  make release-artifacts - Build frontend + engine wheels/sdists into dist/"
	@echo "  make docs             - Regenerate docs/REFERENCE.md from the command tree"
	@echo "  make docs-check       - Fail if docs/REFERENCE.md drifted from the command tree"
	@echo "  make check-all        - Run lint + format-check + typecheck + test + spec-check + docs-check"

install:
	uv sync

install-dev:
	uv sync --all-groups

install-tool:
	uv tool install --editable .

reinstall-tool:
	uv tool install --reinstall --editable .

dev:
	uv run bea --help

lint:
	uv run ruff check src/ tests/

deadcode:
	uv run vulture src/cli src/bea_engine src/fava --min-confidence 100 --exclude src/cli/api/rest_client/,src/cli/commands/cloud/generated/ --ignore-names repo

deadcode-fix:
	uv run ruff check src/ tests/ --fix --select F401,F841
	$(MAKE) deadcode

format:
	uv run ruff format src/cli src/bea_engine tests/

format-check:
	uv run ruff format --check src/cli src/bea_engine tests/

typecheck:
	uv run mypy src/cli src/bea_engine

test:
	uv run pytest tests/ -n auto

test-cov:
	uv run pytest tests/ --cov=fava --cov=cli --cov-report=term-missing --cov-report=html --cov-report=json
	@echo "📊 Coverage report generated in htmlcov/index.html"

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type f -name ".coverage" -delete
	find . -type d -name "htmlcov" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +

# Release plumbing. `.github/workflows/release-cli.yml` runs exactly these, so
# a tag that would fail in CI fails here first.
release-check:
	bash scripts/release-check.sh

release-lock:
	uv export --format requirements-txt --no-dev --no-emit-project --no-editable --hashes -o requirements.lock
	$(MAKE) engine-release-lock

# Hash-pinned engine graph for PyPI first-use provisioning and Homebrew's
# install-time engine venv. Generated from `engine/` so the frontend never
# resolves Beancount at install time once the frontend deps drop it.
engine-release-lock:
	cd engine && uv export --format requirements-txt --no-dev --no-emit-project --no-editable --hashes -o ../engine-requirements.lock

# Build frontend + engine artifacts into dist/ (release CI publishes both).
# The engine wheel is what a PyPI-installed frontend provisions by name;
# Homebrew builds the helper from the sdist's `engine/` tree instead.
release-artifacts: release-lock
	rm -rf dist
	mkdir -p dist
	cd engine && uv build --out-dir ../dist
	uv build --out-dir dist
	rm -f dist/.gitignore
	ls -l dist

# The canonical spec lives in the backend package; the CLI builds only from its
# own pinned copy so a `cli/` checkout is self-sufficient and reproducible.
CANONICAL_SPEC = ../backend-cluster/backend-v2/docs/openapi/v1.json

spec-check:
	@diff -q $(CANONICAL_SPEC) openapi/v1.json >/dev/null \
		|| { echo "openapi/v1.json drifted from $(CANONICAL_SPEC) — run 'make spec-sync && make codegen' and commit the diff."; exit 1; }

spec-sync:
	cp $(CANONICAL_SPEC) openapi/v1.json

# docs/REFERENCE.md is generated from the Typer app, the same way the REST
# client is generated from the OpenAPI spec: change a command once and the
# drift gate tells you the reference needs regenerating.
docs:
	uv run python scripts/gen_reference.py

docs-check:
	uv run python scripts/gen_reference.py --check

codegen:
	uv run openapi-python-client generate --path openapi/v1.json \
		--output-path src/cli/api/rest_client --meta none --overwrite
	uv run python scripts/gen_cloud_commands.py
	uv run ruff format src/cli/api/rest_client src/cli/commands/cloud/generated

check-all: lint deadcode format-check typecheck test spec-check docs-check
