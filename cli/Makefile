# Beancount CLI - Development Makefile

.PHONY: help install install-dev install-tool reinstall-tool dev lint deadcode deadcode-fix format format-check typecheck test codegen check-all

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
	@echo "  make test             - Run tests with pytest"
	@echo "  make codegen          - Fetch GraphQL schema and regenerate types"
	@echo "  make check-all        - Run lint + format-check + typecheck + test"

install:
	uv sync

install-dev:
	uv sync --all-groups

install-tool:
	uv tool install --editable .

reinstall-tool:
	uv tool install --reinstall --editable .

dev:
	uv run beancount-cli --help

lint:
	uv run ruff check src/ tests/

deadcode:
	uv run vulture src/cli src/fava --min-confidence 100 --exclude src/cli/api/gql_client/ --ignore-names repo

deadcode-fix:
	uv run ruff check src/ tests/ --fix --select F401,F841
	$(MAKE) deadcode

format:
	uv run ruff format src/cli tests/

format-check:
	uv run ruff format --check src/cli tests/

typecheck:
	uv run mypy src/cli

test:
	uv run pytest tests/ -v

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

codegen:
	@echo "Fetching schema from https://beancount.io/api-gateway/schema.graphql ..."
	curl -sf https://beancount.io/api-gateway/schema.graphql > graphql/schema.graphql
	uv run ariadne-codegen

check-all: lint deadcode format-check typecheck test
