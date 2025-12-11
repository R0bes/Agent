# Legacy Code

Dieser Ordner enthält Legacy-Code, der während der Migration zu einer hexagonalen Architektur isoliert wurde.

## Übersicht

Der Legacy-Code wurde nach `legacy/` verschoben, um die Migration zu einer neuen hexagonalen Architektur (Ports & Adapters) zu ermöglichen. **Dieser Code wird später gelöscht**, sobald die neue Architektur vollständig implementiert ist.

## Verschobene Dateien

### Legacy Component-System

Das gesamte Component-System wurde als Legacy markiert:

#### Base Classes
- `components/base/AbstractService.ts` → `legacy/components/base/AbstractService.ts`
- `components/base/AbstractTool.ts` → `legacy/components/base/AbstractTool.ts`
- `components/base/AbstractWorker.ts` → `legacy/components/base/AbstractWorker.ts`
- `components/base/AbstractSource.ts` → `legacy/components/base/AbstractSource.ts`
- `components/base/toolRegistry.ts` → `legacy/components/base/toolRegistry.ts`

#### Component Registry
- `components/registry.ts` → `legacy/components/registry.ts`
- `components/types.ts` → `legacy/components/types.ts` (nur Component Interface)
- `components/toolRegistry/` → `legacy/components/toolRegistry/`

#### Legacy Tools
Alle Tools, die `AbstractTool` verwenden:
- `components/tools/echo/` → `legacy/components/tools/echo/`
- `components/tools/clock/` → `legacy/components/tools/clock/`
- `components/tools/websiteSearch/` → `legacy/components/tools/websiteSearch/`
- `components/tools/scheduler/` → `legacy/components/tools/scheduler/`
- `components/tools/workerManager/` → `legacy/components/tools/workerManager/`
- `components/tools/guiControl/` → `legacy/components/tools/guiControl/`
- `components/tools/eventCrawler/` → `legacy/components/tools/eventCrawler/`

**Hinweis**: `components/tools/toolEngine.ts` und `components/tools/toolTypes.ts` wurden **NICHT** verschoben, da sie noch von Threaded Services verwendet werden.

#### Legacy Workers
- `components/worker/engine.ts` → `legacy/components/worker/engine.ts` (alte Engine, nicht bullmq-engine)

#### Legacy Sources
- `components/sources/gui/` → `legacy/components/sources/gui/`

### Legacy Models/Stores

Alle Store-Implementierungen wurden nach `legacy/models/` verschoben:
- `models/conversationStore.ts` → `legacy/models/conversationStore.ts`
- `models/scheduleStore.ts` → `legacy/models/scheduleStore.ts`
- `models/eventStore.ts` → `legacy/models/eventStore.ts`
- `models/jobStore.ts` → `legacy/models/jobStore.ts`
- `models/artistStore.ts` → `legacy/models/artistStore.ts`
- `models/collectiveStore.ts` → `legacy/models/collectiveStore.ts`
- `models/labelStore.ts` → `legacy/models/labelStore.ts`

### Legacy API

Alle API-Dateien wurden nach `legacy/api/` verschoben:
- `api/chat.ts` → `legacy/api/chat.ts`
- `api/memory.ts` → `legacy/api/memory.ts`
- `api/tools.ts` → `legacy/api/tools.ts`
- `api/scheduler.ts` → `legacy/api/scheduler.ts`
- `api/conversation.ts` → `legacy/api/conversation.ts`
- `api/jobs.ts` → `legacy/api/jobs.ts`
- `api/logs.ts` → `legacy/api/logs.ts`
- `api/services.ts` → `legacy/api/services.ts`
- `api/workers.ts` → `legacy/api/workers.ts`
- `api/messages.ts` → `legacy/api/messages.ts`

## Warum ist dieser Code Legacy?

### Component-System

Das Component-System ist veraltet, weil:
- **Monolithisches Registry-Pattern**: Zentrale Registrierung aller Komponenten
- **Keine klare Trennung**: Business Logic ist direkt an Infrastructure gekoppelt
- **Schwer testbar**: Starke Kopplung zwischen Komponenten
- **Duplikation**: Services existieren sowohl als Component als auch als ThreadedService

### Stores/Models

Die Stores sind Legacy, weil:
- **Direkte Datenbank-Abhängigkeiten**: Business Logic ist an Datenbank-Schema gekoppelt
- **Keine Abstraktion**: Keine Repository-Pattern oder Ports
- **Schwer testbar**: Keine Mocking-Möglichkeiten

### API-Dateien

Die API-Dateien sind Legacy, weil:
- **Direkte Abhängigkeiten**: Direkte Imports von Stores und Components
- **Keine Use Cases**: Business Logic ist direkt in API-Routen
- **Keine Ports**: Keine klare Trennung zwischen Input/Output

## Neue Architektur

Die neue hexagonale Architektur (Ports & Adapters) wird in folgenden Ordnern implementiert:

```
backend/src/
├── domain/          # Business Logic (Entities, Value Objects, Domain Services)
├── application/     # Use Cases
├── ports/           # Interfaces (Input/Output Ports)
├── adapters/        # Implementierungen (HTTP, gRPC, Repositories, etc.)
├── infrastructure/  # Technische Details (DB, Messaging, Logging)
└── bootstrap/       # DI Container, Application Bootstrap
```

## Migration Status

### Phase 1: Legacy Isolation ✅
- [x] Legacy-Ordner erstellt
- [x] Alle Legacy-Dateien verschoben
- [x] Legacy-README erstellt
- [x] server.ts angepasst (Legacy-Imports entfernt)

### Phase 2: Neue Architektur ⏳
- [ ] Neue Verzeichnisstruktur erstellt
- [ ] Port-Interfaces definiert
- [ ] Domain Entities erstellt
- [ ] Use Cases implementiert
- [ ] Adapter implementiert
- [ ] DI Container eingerichtet
- [ ] System startet und funktioniert

## Wichtige Hinweise

1. **Keine Wrapper**: Nach Phase 1 funktioniert das Legacy-System nicht mehr, bis Phase 2 implementiert ist
2. **Threaded Services bleiben**: ThreadedService, ExecutionService, ThreadedToolboxService, etc. bleiben und werden in neue Architektur integriert
3. **Schrittweise Migration**: Use Cases können schrittweise implementiert werden
4. **Legacy später löschen**: Nach erfolgreicher Migration kann `legacy/` Ordner gelöscht werden

## Verweise

- Siehe `ARCHITECTURE_MIGRATION.md` für detaillierte Migrations-Planung
- Siehe `../components/` für neue Threaded Services
- Siehe `../services/` für ExecutionService und BFFService

