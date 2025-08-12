# Agent Multi-Service Architecture

## Aktueller Stand

### ✅ Funktioniert
- **Traefik** läuft auf Port 8080 (Hauptport)
- **Agent-Core** läuft und ist über Traefik erreichbar
- **Routing** funktioniert für `/health` und `/think`
- **Docker Compose** ist modular aufgeteilt
- **UI-Service** läuft und ist über Traefik erreichbar

### 🌐 Endpunkte
- `http://localhost:8080/health` → 200 OK
- `http://localhost:8080/think` → Erreichbar (400 Bad Request wegen Body-Parsing)
- `http://localhost:8080/ui` → UI-Interface
- `http://localhost:8081` → Traefik Dashboard

### 📁 Struktur
```
docker/
├── config.env                    # Zentrale Konfiguration
├── docker-compose.yml            # Traefik
├── docker-compose.agent.yml      # Agent-Core
└── docker-compose.ui.yml         # UI

infrastructure/
└── traefik/
    ├── traefik.yml              # Traefik-Konfiguration
    └── dynamic/                 # Middleware (noch nicht aktiv)
```

### 🚀 Nächste Schritte
1. Body-Parsing-Problem beheben (optional)
2. Monitoring hinzufügen (Prometheus, Grafana)

### 🐳 Starten
```bash
cd docker
docker-compose up -d                    # Traefik starten
docker-compose -f docker-compose.agent.yml up -d  # Agent starten
docker-compose -f docker-compose.ui.yml up -d     # UI starten
```

### ⚙️ Konfiguration
Alle Ports sind in `docker/config.env` zentral konfiguriert:
- **Hauptport**: 8080 (alle Services)
- **Dashboard**: 8081 (Traefik)
- **Agent-Core**: 8000 (intern)
- **UI**: 3000 (intern)
