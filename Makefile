# Einfaches Makefile für Server und UI Management

# Standardziel
.PHONY: help, server_up, ui_up, ui_down, up, down, clean
help:
	@echo "Verfügbare Kommandos:"
	@echo "  server_up    - Startet den Python-Server"
	@echo "  server_down  - Stoppt den Python-Server"
	@echo "  ui_up        - Startet die Vite-UI im Entwicklungsmodus"
	@echo "  ui_down      - Stoppt die Vite-UI"
	@echo "  up           - Startet sowohl Server als auch UI"
	@echo "  down         - Stoppt sowohl Server als auch UI"

# Server Management
.PHONY: server_up
server_up:
	@echo "Starte Server..."
	@cd server && python3 main.py


# UI Management
.PHONY: ui_up
ui_up:
	@echo "Starte UI..."
	@cd ui && npm run dev &

.PHONY: ui_down
ui_down:
	@echo "Stoppe UI..."
	@bash -c 'pgrep -f "vite" | xargs kill 2>/dev/null || true'
	@bash -c 'pgrep -f "node.*vite" | xargs kill 2>/dev/null || true'

# Kombinierte Kommandos
.PHONY: up
up: ui_up server_up 
	@echo "Alle Services gestartet"

.PHONY: down
down: server_down ui_down
	@echo "Alle Services gestoppt"

# Cleanup
.PHONY: clean
clean:
	@echo "Räume auf..."
	@rm -rf server/__pycache__
	@rm -rf ui/dist
	@rm -rf ui/node_modules

# Test Commands
.PHONY: test test-unit test-integration test-e2e test-all test-coverage test-mutation test-clean

# Install test dependencies
test-install:
	pip install -r requirements-test.txt

# Run all tests
test-all: test-install
	pytest tests/ -v --cov=server --cov-report=html --cov-report=xml

# Run unit tests only
test-unit: test-install
	pytest tests/unit/ -v --cov=server --cov-report=html

# Run integration tests only
test-integration: test-install
	pytest tests/integration/ -v

# Run E2E tests only
test-e2e: test-install
	pytest tests/e2e/ -v

# Run tests with coverage report
test-coverage: test-install
	pytest tests/ -v --cov=server --cov-report=html --cov-report=xml --cov-fail-under=70

# Run mutation testing
test-mutation: test-install
	mutmut run --paths-to-mutate=server/

# Run performance tests
test-performance: test-install
	pytest tests/ -v --benchmark-only

# Run security tests
test-security: test-install
	pytest tests/ -v -m security

# Run tests in parallel
test-parallel: test-install
	pytest tests/ -v -n auto

# Clean test artifacts
test-clean:
	rm -rf htmlcov/
	rm -rf .coverage
	rm -rf .pytest_cache/
	rm -rf .mutmut-cache/
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

# Quick test run (unit tests only, no coverage)
test-quick: test-install
	pytest tests/unit/ -v --tb=short

# Test specific module
test-module: test-install
	@if [ -z "$(MODULE)" ]; then \
		echo "Usage: make test-module MODULE=server.api"; \
		exit 1; \
	fi
	pytest tests/ -v -k "$(MODULE)" --cov=$(MODULE) --cov-report=html

# Show test coverage
coverage-show: test-coverage
	@echo "Opening coverage report..."
	@if command -v open >/dev/null 2>&1; then \
		open htmlcov/index.html; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open htmlcov/index.html; \
	else \
		echo "Coverage report available at: htmlcov/index.html"; \
	fi

# Test help
test-help:
	@echo "Available test commands:"
	@echo "  test-all        - Run all tests with coverage"
	@echo "  test-unit       - Run unit tests only"
	@echo "  test-integration- Run integration tests only"
	@echo "  test-e2e        - Run E2E tests only"
	@echo "  test-coverage   - Run tests with coverage report"
	@echo "  test-mutation   - Run mutation testing"
	@echo "  test-performance- Run performance tests"
	@echo "  test-security   - Run security tests"
	@echo "  test-parallel   - Run tests in parallel"
	@echo "  test-quick      - Quick test run (unit only)"
	@echo "  test-module     - Test specific module (MODULE=server.api)"
	@echo "  test-clean      - Clean test artifacts"
	@echo "  coverage-show   - Show coverage report in browser"
	@echo "  test-help       - Show this help"

# Alias für einfache Ausführung
test: test-all
tests: test-all
