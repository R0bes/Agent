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
