# HexNodes Docker Compose Setup

Dieses Docker Compose Setup erstellt separate Container für alle Service-Komponenten des Agent-Systems.

## Services

Die folgenden Service-Nodes werden erstellt:

- **llm-node** (Port 52001) - LLM Service für Sprachmodelle
- **toolbox-node** (Port 52000) - Toolbox Service für Tool-Verwaltung
- **memory-node** (Port 52004) - Memory Service für Speicherverwaltung
- **persona-node** (Port 52002) - Persona Service für Konversationslogik
- **workmanager-node** (Port 52003) - Work Manager/Scheduler Service
- **bff-node** (Port 3001) - Backend-for-Frontend Service

## Infrastructure Services

- **postgres** (Port 5433) - PostgreSQL Datenbank
- **redis** (Port 6380) - Redis Cache/Queue
- **qdrant** (Ports 6335-6336) - Qdrant Vector Store
- **nats** (Ports 4223, 8223) - NATS Event Bus

## Verwendung

### Services starten

```bash
cd hexnodes
docker-compose up -d
```

### Services stoppen

```bash
docker-compose down
```

### Logs anzeigen

```bash
# Alle Services
docker-compose logs -f

# Einzelner Service
docker-compose logs -f llm-node
```

### Service-Status prüfen

```bash
docker-compose ps
```

## Wichtige Hinweise

1. **Docker Image**: Das Image `R0bes/hexSwitch:latest` muss verfügbar sein. Falls das Image nicht existiert oder einen anderen Namen hat, bitte die `docker-compose.yml` entsprechend anpassen.

2. **Port-Konflikte**: Die Infrastructure-Services verwenden andere Ports als das Haupt-Setup, um Konflikte zu vermeiden:
   - Postgres: 5433 (statt 5432)
   - Redis: 6380 (statt 6379)
   - Qdrant: 6335-6336 (statt 6333-6334)
   - NATS: 4223, 8223 (statt 4222, 8222)

3. **Ollama**: Die Services erwarten Ollama auf `host.docker.internal:11434`. Stelle sicher, dass Ollama läuft oder passe `OLLAMA_BASE_URL` entsprechend an.

4. **Service-Abhängigkeiten**: 
   - `persona-node` hängt von `llm-node` und `memory-node` ab
   - `bff-node` hängt von allen anderen Service-Nodes ab

5. **Netzwerk**: Alle Services sind im `hexnodes-network` verbunden und können sich über Service-Namen erreichen.

## Service-Verbindungen

Die Services kommunizieren über:
- **gRPC**: Direkte Service-zu-Service Kommunikation über die konfigurierten gRPC Ports
- **NATS**: Event-basierte Kommunikation über den NATS Event Bus
- **Postgres/Qdrant**: Gemeinsame Datenbankzugriffe

## Troubleshooting

### Image nicht gefunden

Falls das Docker-Image nicht gefunden wird:
```bash
# Prüfe verfügbare Images
docker images | grep hexswitch

# Falls nötig, Image manuell laden oder Build-Informationen anpassen
```

### Port bereits belegt

Falls Ports bereits belegt sind, passe die Port-Mappings in der `docker-compose.yml` an.

### Services starten nicht

Prüfe die Logs:
```bash
docker-compose logs [service-name]
```

Stelle sicher, dass alle Infrastructure-Services (postgres, redis, qdrant, nats) laufen, bevor die Service-Nodes starten.











