# 🚀 Makefile für Chat Backend Agent
# Einheitliche Workflows für Entwicklung und Deployment

# Windows-spezifische Shell-Einstellungen
ifeq ($(OS),Windows_NT)
SHELL := powershell.exe
.SHELLFLAGS := -NoProfile -ExecutionPolicy Bypass -Command
.ONESHELL:
endif

# 🎯 Standardziel
.PHONY: help, server_up, ui_up, ui_down, up, down, clean, commit, push
help:
	@echo "🌟 Verfügbare Kommandos:"
	@echo ""
	@echo "🖥️  Server Management:"
	@echo "  server_up    - 🚀 Startet den Python-Server"
	@echo "  server_down  - 🛑 Stoppt den Python-Server"
	@echo ""
	@echo "🎨 UI Management:"
	@echo "  ui_up        - 🚀 Startet die Vite-UI im Entwicklungsmodus"
	@echo "  ui_down      - 🛑 Stoppt die Vite-UI"
	@echo ""
	@echo "🔄 Kombinierte Kommandos:"
	@echo "  up           - 🚀 Startet sowohl Server als auch UI"
	@echo "  down         - 🛑 Stoppt sowohl Server als auch UI"
	@echo ""
	@echo "🧹 Wartung:"
	@echo "  clean        - 🧹 Räumt temporäre Dateien auf"
	@echo ""
	@echo "📝 Git Commands:"
	@echo "  commit       - 💾 Git commit (interaktiv oder mit Nachricht)"
	@echo "  commit MSG   - 💾 Git commit mit direkter Nachricht"
	@echo "  push         - 📤 Git push zum Remote-Repository"
	@echo "  commit-push  - 🚀 Commit und Push in einem Schritt"
	@echo ""
	@echo "💡 Beispiele:"
	@echo "  make commit           - Interaktiver Commit"
	@echo "  make commit 'Fix bug' - Commit mit Nachricht 'Fix bug'"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  test-all     - 🧪 Alle Tests ausführen"
	@echo "  test-unit    - 🔬 Nur Unit Tests"
	@echo "  test-e2e     - 🌐 End-to-End Tests"
	@echo "  test-help    - 📚 Hilfe für Test-Kommandos"

# 🖥️ Server Management
.PHONY: server_up
server_up:
	@echo "🚀 Starte Python-Server..."
	@cd server && python3 main.py

.PHONY: server_down
server_down:
	@echo "🛑 Stoppe Python-Server..."
	@echo "⚠️  Verwende Ctrl+C um den Server zu stoppen"

# 🎨 UI Management
.PHONY: ui_up
ui_up:
	@echo "🎨 Starte Vite-UI im Entwicklungsmodus..."
	@cd ui && npm run dev &

.PHONY: ui_down
ui_down:
	@echo "🛑 Stoppe Vite-UI..."
	@bash -c 'pgrep -f "vite" | xargs kill 2>/dev/null || true'
	@bash -c 'pgrep -f "node.*vite" | xargs kill 2>/dev/null || true'
	@echo "✅ Vite-UI gestoppt"

# 🔄 Kombinierte Kommandos
.PHONY: up
up: ui_up server_up 
	@echo "🎉 Alle Services erfolgreich gestartet! 🚀"

.PHONY: down
down: server_down ui_down
	@echo "🛑 Alle Services gestoppt"

# 🧹 Cleanup
.PHONY: clean
clean:
	@echo "🧹 Räume temporäre Dateien auf..."
	@rm -rf server/__pycache__
	@rm -rf ui/dist
	@rm -rf ui/node_modules
	@echo "✅ Aufräumen abgeschlossen!"

# 🧪 Test Commands
.PHONY: test test-unit test-integration test-e2e test-all test-coverage test-mutation test-clean

# 📦 Install test dependencies
test-install:
	@echo "📦 Installiere Test-Dependencies..."
	pip install -r requirements-test.txt
	@echo "✅ Test-Dependencies installiert"

# 🧪 Run all tests
test-all: test-install
	@echo "🧪 Führe alle Tests aus..."
	pytest tests/ -v --cov=server --cov-report=html --cov-report=xml
	@echo "🎉 Alle Tests abgeschlossen!"

# 🔬 Run unit tests only
test-unit: test-install
	@echo "🔬 Führe Unit Tests aus..."
	pytest tests/unit/ -v --cov=server --cov-report=html
	@echo "✅ Unit Tests abgeschlossen!"

# 🔗 Run integration tests only
test-integration: test-install
	@echo "🔗 Führe Integration Tests aus..."
	pytest tests/integration/ -v
	@echo "✅ Integration Tests abgeschlossen!"

# 🌐 Run E2E tests only
test-e2e: test-install
	@echo "🌐 Führe End-to-End Tests aus..."
	pytest tests/e2e/ -v
	@echo "✅ E2E Tests abgeschlossen!"

# 📊 Run tests with coverage report
test-coverage: test-install
	@echo "📊 Führe Tests mit Coverage-Report aus..."
	pytest tests/ -v --cov=server --cov-report=html --cov-report=xml --cov-fail-under=70
	@echo "📈 Coverage-Report erstellt!"

# 🧬 Run mutation testing
test-mutation: test-install
	@echo "🧬 Führe Mutation Testing aus..."
	mutmut run --paths-to-mutate=server/
	@echo "🧬 Mutation Testing abgeschlossen!"

# ⚡ Run performance tests
test-performance: test-install
	@echo "⚡ Führe Performance Tests aus..."
	pytest tests/ -v --benchmark-only
	@echo "⚡ Performance Tests abgeschlossen!"

# 🔒 Run security tests
test-security: test-install
	@echo "🔒 Führe Security Tests aus..."
	pytest tests/ -v -m security
	@echo "🔒 Security Tests abgeschlossen!"

# 🚀 Run tests in parallel
test-parallel: test-install
	@echo "🚀 Führe Tests parallel aus..."
	pytest tests/ -v -n auto
	@echo "🚀 Parallele Tests abgeschlossen!"

# 🧹 Clean test artifacts
test-clean:
	@echo "🧹 Räume Test-Artefakte auf..."
	rm -rf htmlcov/
	rm -rf .coverage
	rm -rf .pytest_cache/
	rm -rf .mutmut-cache/
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	@echo "✅ Test-Aufräumen abgeschlossen!"

# ⚡ Quick test run (unit tests only, no coverage)
test-quick: test-install
	@echo "⚡ Schneller Test-Lauf (nur Unit Tests)..."
	pytest tests/unit/ -v --tb=short
	@echo "⚡ Schneller Test abgeschlossen!"

# 🎯 Test specific module
test-module: test-install
	@if [ -z "$(MODULE)" ]; then \
		echo "❌ Fehler: MODULE Parameter fehlt"; \
		echo "💡 Verwendung: make test-module MODULE=server.api"; \
		exit 1; \
	fi
	@echo "🎯 Teste spezifisches Modul: $(MODULE)"
	pytest tests/ -v -k "$(MODULE)" --cov=$(MODULE) --cov-report=html
	@echo "✅ Modul-Test abgeschlossen!"

# 📊 Show test coverage
coverage-show: test-coverage
	@echo "📊 Öffne Coverage-Report..."
	@if command -v open >/dev/null 2>&1; then \
		open htmlcov/index.html; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open htmlcov/index.html; \
	else \
		echo "📊 Coverage-Report verfügbar unter: htmlcov/index.html"; \
	fi

# 📚 Test help
test-help:
	@echo "📚 Verfügbare Test-Kommandos:"
	@echo ""
	@echo "🧪 Vollständige Tests:"
	@echo "  test-all        - 🧪 Alle Tests mit Coverage"
	@echo "  test-coverage   - 📊 Tests mit Coverage-Report"
	@echo "  test-mutation   - 🧬 Mutation Testing"
	@echo "  test-performance- ⚡ Performance Tests"
	@echo "  test-security   - 🔒 Security Tests"
	@echo "  test-parallel   - 🚀 Tests parallel ausführen"
	@echo ""
	@echo "🔬 Spezifische Tests:"
	@echo "  test-unit       - 🔬 Nur Unit Tests"
	@echo "  test-integration- 🔗 Nur Integration Tests"
	@echo "  test-e2e        - 🌐 Nur E2E Tests"
	@echo "  test-module     - 🎯 Spezifisches Modul testen"
	@echo ""
	@echo "⚡ Schnelle Tests:"
	@echo "  test-quick      - ⚡ Schneller Test-Lauf (Unit only)"
	@echo ""
	@echo "🧹 Wartung:"
	@echo "  test-clean      - 🧹 Test-Artefakte aufräumen"
	@echo "  coverage-show   - 📊 Coverage-Report im Browser öffnen"
	@echo ""
	@echo "💡 Beispiel: make test-module MODULE=server.api"

# 📝 Git Commands
.PHONY: commit
commit:
	@echo "📝 Git Status:"
	@git status --short
	@echo ""
	@echo "💾 Committing changes..."
	@git add .
ifeq ($(OS),Windows_NT)
	@if "$(filter-out $@,$(MAKECMDGOALS))"=="" ( \
		set /p message="Commit message: " && git commit -m "!message!" --no-verify \
	) else ( \
		git commit -m "$(filter-out $@,$(MAKECMDGOALS))" --no-verify \
	)
else
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		read -p "Commit message: " message; git commit -m "$$message" --no-verify; \
	else \
		git commit -m "$(filter-out $@,$(MAKECMDGOALS))" --no-verify; \
	fi
endif
	@echo "✅ Commit erfolgreich!"

.PHONY: push
push:
	@echo "📤 Pushe Änderungen zum Remote-Repository..."
	@git push
	@echo "✅ Push erfolgreich abgeschlossen!"

.PHONY: commit-push
commit-push: commit push
	@echo "🎉 Commit und Push erfolgreich abgeschlossen! 🚀"

# 🎯 Alias für einfache Ausführung
test: test-all
tests: test-all
