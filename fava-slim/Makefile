# fava-slim - Development Commands
.PHONY: help install install-dev lint format typecheck test test-cov check-all clean

help:
	@echo "Available commands:"
	@echo "  install      Install production dependencies"
	@echo "  install-dev  Install development dependencies"
	@echo "  lint         Run Ruff linting"
	@echo "  format       Format code with Ruff"
	@echo "  typecheck    Run Mypy type checking"
	@echo "  test         Run tests with pytest"
	@echo "  test-cov     Run tests with coverage report"
	@echo "  check-all    Run all checks (lint + format check + typecheck + tests)"
	@echo "  clean        Clean up temporary files"

install:
	uv sync --no-dev

install-dev:
	uv sync

lint:
	@echo "🔍 Running Ruff linting..."
	uv run ruff check fava/ --fix

format:
	@echo "🎨 Running Ruff formatting..."
	uv run ruff format fava/

typecheck:
	@echo "🔍 Running Mypy type checking..."
	uv run mypy fava/

test:
	@echo "🧪 Running tests..."
	uv run pytest tests/

test-cov:
	@echo "🧪 Running tests with coverage..."
	uv run pytest tests/ --cov=fava --cov-report=term-missing --cov-report=html --cov-report=json
	@echo "📊 Coverage report generated in htmlcov/index.html"

check-all:
	@echo "🚀 Starting comprehensive code quality checks..."
	@echo "============================================================"
	@echo "🔍 Ruff linting..."
	uv run ruff check fava/
	@echo "------------------------------------------------------------"
	@echo "🎨 Ruff formatting check..."
	uv run ruff format --check fava/
	@echo "------------------------------------------------------------"
	@echo "🔍 Mypy type checking..."
	uv run mypy fava/
	@echo "------------------------------------------------------------"
	@echo "🧪 Running tests..."
	uv run pytest tests/
	@echo "============================================================"
	@echo "✅ All checks completed!"

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type f -name ".coverage" -delete
	find . -type d -name "htmlcov" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
