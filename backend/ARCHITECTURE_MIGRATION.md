# Backend Architecture Migration Plan

## Executive Summary

Das Backend verwendet aktuell eine **gemischte Architektur** mit:
- **Neu**: Threaded Services (ThreadedService, ExecutionService)
- **Alt**: Component System (Component Interface, Registry, AbstractService/Tool/Worker/Source)
- **Problematisch**: Direkte Abhängigkeiten, keine klare Trennung von Business Logic und Infrastructure

**Ziel**: Migration zu einer **Hexagonalen Architektur (Ports & Adapters)** mit klarer Trennung von Domain, Application, Ports und Adapters.

---

## 1. Identifizierter Legacy-Code

### 1.1 Component-System (komplett legacy)

Das gesamte Component-System ist veraltet und sollte durch die hexagonale Architektur ersetzt werden:

#### Dateien:
- `components/types.ts` - Component Interface Definition
- `components/registry.ts` - Component Registry (zentrale Registrierung)
- `components/base/AbstractService.ts` - Legacy Service Base Class
- `components/base/AbstractTool.ts` - Legacy Tool Base Class
- `components/base/AbstractWorker.ts` - Legacy Worker Base Class
- `components/base/AbstractSource.ts` - Legacy Source Base Class
- `components/base/toolRegistry.ts` - Legacy Tool Registry
- `components/toolRegistry/` - Legacy Tool Registry Store

#### Verwendung:
- Alle `*Component` Exports in `components/index.ts`:
  - `llmComponent`
  - `personaComponent`
  - `toolboxComponent`
  - `guiSourceComponent`
  - `echoToolComponent`
  - `clockToolComponent`
  - `websiteSearchToolComponent`
  - `schedulerToolComponent`
  - `workerManagerToolComponent`
  - `guiControlToolComponent`
  - `memoryCompactionWorkerComponent`
  - `taskWorkerComponent`
  - `toolExecutionWorkerComponent`

- Alle `registerComponent()` Aufrufe in `server.ts` (Zeilen 190-230)

#### Problem:
- Component-System ist ein monolithisches Registry-Pattern
- Keine klare Trennung zwischen Domain und Infrastructure
- Services werden sowohl als Component als auch als ThreadedService registriert (Duplikation)
- Schwierig zu testen (starke Kopplung)

---

### 1.2 Legacy Tool-Struktur

#### Dateien:
- `components/tools/` - Alte Tool-Implementierungen
  - `echo/index.ts` - Erbt von AbstractTool
  - `clock/index.ts` - Erbt von AbstractTool
  - `scheduler/index.ts` - Erbt von AbstractTool
  - `workerManager/index.ts` - Erbt von AbstractTool
  - `guiControl/index.ts` - Erbt von AbstractTool
  - `websiteSearch/index.ts` - Erbt von AbstractTool
  - `eventCrawler/index.ts` - Erbt von AbstractTool
  - `toolEngine.ts` - Legacy Tool Execution Engine
  - `toolTypes.ts` - Legacy Tool Types

#### Problem:
- Tools erben von `AbstractTool`, was automatische Registrierung macht
- Keine klare Trennung zwischen Tool-Definition und Tool-Execution
- Tools sind direkt an die Component-Registry gekoppelt

---

### 1.3 Legacy Worker-Struktur

#### Dateien:
- `components/worker/engine.ts` - Alte Worker Engine (deprecated)
- Worker Components die `AbstractWorker` verwenden

#### Problem:
- Zwei parallele Worker-Systeme:
  - Alte: `AbstractWorker` + Component Registry
  - Neue: BullMQ Worker Engine
- Inkonsistente Implementierung

---

### 1.4 Direkte Abhängigkeiten (keine Ports)

#### Problematische Imports:

**LLM/Embedding:**
- Direkte Imports von `embeddingClient` aus `components/llm/embeddingClient.ts`
- Direkte Imports von `ollamaChat` aus `components/llm/ollamaClient.ts`
- Verwendet in:
  - `api/memory.ts`
  - `components/persona/messageHandler.ts`
  - `components/persona/contextBuilder.ts`
  - `components/memory/extractor.ts`
  - `components/worker/memory/index.ts`

**Stores/Models:**
- Direkte Verwendung von `models/*` Stores:
  - `conversationStore.ts`
  - `scheduleStore.ts`
  - `eventStore.ts`
  - `jobStore.ts`
  - `artistStore.ts`
  - `collectiveStore.ts`
  - `labelStore.ts`
- Direkte Verwendung von `toolboxStore` aus `components/toolbox/toolboxStore.ts`

#### Problem:
- Keine Abstraktion zwischen Business Logic und Persistence
- Business Logic ist direkt an Datenbank-Schema gekoppelt
- Schwer zu testen (keine Mocking-Möglichkeit)
- Keine klare Verantwortlichkeiten

---

### 1.5 Gemischte Architektur

#### Aktueller Zustand:
- **Threaded Services** (neu, gut):
  - `ThreadedLLMService`
  - `ThreadedPersonaService`
  - `ThreadedMemoryService`
  - `ThreadedToolboxService`
  - `ThreadedSchedulerService`
  - Werden über `ExecutionService` verwaltet
  - Laufen in Worker Threads
  - Haben gRPC Server

- **Component System** (alt, legacy):
  - Alle Services werden auch als Component registriert
  - Tools werden über Component Registry verwaltet
  - Sources werden über Component Registry verwaltet
  - Workers werden über Component Registry verwaltet

#### Problem:
- **Duplikation**: Services existieren in beiden Systemen
- **Inkonsistenz**: Manche Features nur in Component System, andere nur in Threaded Services
- **Komplexität**: Zwei parallele Systeme müssen synchron gehalten werden

---

## 2. Neue Verzeichnisstruktur (Hexagonale Architektur)

```
backend/
├── src/
│   │
│   ├── domain/                          # DOMAIN LAYER (Business Logic)
│   │   ├── entities/                    # Domain Entities (Aggregates)
│   │   │   ├── Message.ts
│   │   │   ├── Memory.ts
│   │   │   ├── Conversation.ts
│   │   │   ├── ScheduledTask.ts
│   │   │   └── Tool.ts
│   │   │
│   │   ├── valueObjects/                # Value Objects (Immutable)
│   │   │   ├── SourceMessage.ts
│   │   │   ├── ToolContext.ts
│   │   │   ├── ToolResult.ts
│   │   │   └── EmbeddingVector.ts
│   │   │
│   │   ├── services/                     # Domain Services (Pure Business Logic)
│   │   │   ├── PersonaService.ts         # Core Persona Logic
│   │   │   ├── MemoryExtractionService.ts
│   │   │   ├── ContextBuilderService.ts
│   │   │   └── ToolExecutionService.ts
│   │   │
│   │   └── events/                       # Domain Events
│   │       ├── MessageCreated.ts
│   │       ├── MemoryUpdated.ts
│   │       ├── JobUpdated.ts
│   │       └── TaskScheduled.ts
│   │
│   ├── application/                      # APPLICATION LAYER (Use Cases)
│   │   ├── useCases/
│   │   │   ├── chat/
│   │   │   │   ├── ProcessMessageUseCase.ts
│   │   │   │   ├── GetConversationUseCase.ts
│   │   │   │   └── SendMessageUseCase.ts
│   │   │   │
│   │   │   ├── memory/
│   │   │   │   ├── CreateMemoryUseCase.ts
│   │   │   │   ├── SearchMemoriesUseCase.ts
│   │   │   │   ├── ExtractMemoriesUseCase.ts
│   │   │   │   └── CompactMemoriesUseCase.ts
│   │   │   │
│   │   │   ├── tools/
│   │   │   │   ├── ExecuteToolUseCase.ts
│   │   │   │   ├── ListToolsUseCase.ts
│   │   │   │   └── EnableToolUseCase.ts
│   │   │   │
│   │   │   └── scheduler/
│   │   │       ├── CreateTaskUseCase.ts
│   │   │       ├── ExecuteTaskUseCase.ts
│   │   │       └── ListTasksUseCase.ts
│   │   │
│   │   └── services/                     # Application Services (Orchestration)
│   │       ├── LLMService.ts             # Application-level LLM service
│   │       ├── EmbeddingService.ts
│   │       └── EventService.ts
│   │
│   ├── ports/                            # PORTS (Interfaces)
│   │   ├── input/                        # Driving Ports (Use Case Interfaces)
│   │   │   ├── IChatPort.ts              # Chat Use Cases
│   │   │   ├── IMemoryPort.ts            # Memory Use Cases
│   │   │   ├── IToolPort.ts              # Tool Use Cases
│   │   │   └── ISchedulerPort.ts         # Scheduler Use Cases
│   │   │
│   │   └── output/                       # Driven Ports (Repository/Provider Interfaces)
│   │       ├── repositories/
│   │       │   ├── IMessageRepository.ts
│   │       │   ├── IMemoryRepository.ts
│   │       │   ├── IConversationRepository.ts
│   │       │   └── ITaskRepository.ts
│   │       │
│   │       ├── providers/
│   │       │   ├── ILLMProvider.ts       # LLM Provider Interface
│   │       │   ├── IEmbeddingProvider.ts # Embedding Provider Interface
│   │       │   └── IEventPublisher.ts
│   │       │
│   │       └── subscribers/
│   │           └── IEventSubscriber.ts
│   │
│   ├── adapters/                         # ADAPTERS (Implementations)
│   │   ├── input/                        # Driving Adapters (Inbound)
│   │   │   ├── http/                     # HTTP API
│   │   │   │   ├── server.ts
│   │   │   │   ├── routes/
│   │   │   │   │   ├── chat.routes.ts
│   │   │   │   │   ├── memory.routes.ts
│   │   │   │   │   ├── tools.routes.ts
│   │   │   │   │   └── scheduler.routes.ts
│   │   │   │   └── controllers/
│   │   │   │       ├── ChatController.ts
│   │   │   │       ├── MemoryController.ts
│   │   │   │       └── ToolsController.ts
│   │   │   │
│   │   │   ├── websocket/                # WebSocket Adapter
│   │   │   │   └── socketHandler.ts
│   │   │   │
│   │   │   └── grpc/                      # gRPC Adapter
│   │   │       └── grpcServer.ts
│   │   │
│   │   └── output/                       # Driven Adapters (Outbound)
│   │       ├── persistence/
│   │       │   ├── postgres/
│   │       │   │   ├── PostgresMessageRepository.ts
│   │       │   │   ├── PostgresMemoryRepository.ts
│   │       │   │   ├── PostgresConversationRepository.ts
│   │       │   │   └── PostgresTaskRepository.ts
│   │       │   │
│   │       │   ├── qdrant/
│   │       │   │   └── QdrantEmbeddingRepository.ts
│   │       │   │
│   │       │   └── redis/
│   │       │       └── RedisJobRepository.ts
│   │       │
│   │       ├── llm/
│   │       │   ├── OllamaLLMProvider.ts  # Implements ILLMProvider
│   │       │   └── OllamaEmbeddingProvider.ts  # Implements IEmbeddingProvider
│   │       │
│   │       ├── messaging/
│   │       │   ├── NatsEventPublisher.ts
│   │       │   └── NatsEventSubscriber.ts
│   │       │
│   │       └── external/
│   │           └── MCPToolAdapter.ts
│   │
│   ├── infrastructure/                    # INFRASTRUCTURE (Technical Concerns)
│   │   ├── database/
│   │   │   ├── postgres/
│   │   │   │   ├── connection.ts
│   │   │   │   └── migrations.ts
│   │   │   ├── qdrant/
│   │   │   │   └── connection.ts
│   │   │   └── redis/
│   │   │       └── connection.ts
│   │   │
│   │   ├── messaging/
│   │   │   └── nats/
│   │   │       └── connection.ts
│   │   │
│   │   ├── logging/
│   │   │   ├── logger.ts
│   │   │   └── logManager.ts
│   │   │
│   │   └── config/
│   │       ├── settings.ts
│   │       └── ports.ts
│   │
│   ├── services/                         # SERVICE LAYER (Threaded Services)
│   │   ├── execution/
│   │   │   ├── ExecutionService.ts       # Service Orchestrator
│   │   │   ├── ServiceThread.ts
│   │   │   └── GrpcClientFactory.ts
│   │   │
│   │   ├── threaded/                     # Threaded Service Implementations
│   │   │   ├── ThreadedLLMService.ts
│   │   │   ├── ThreadedPersonaService.ts
│   │   │   ├── ThreadedMemoryService.ts
│   │   │   ├── ThreadedToolboxService.ts
│   │   │   └── ThreadedSchedulerService.ts
│   │   │
│   │   └── base/
│   │       ├── ThreadedService.ts        # Base class for threaded services
│   │       └── GrpcServiceWrapper.ts
│   │
│   ├── workers/                          # BACKGROUND WORKERS
│   │   ├── memory/
│   │   │   └── MemoryCompactionWorker.ts
│   │   ├── tool/
│   │   │   └── ToolExecutionWorker.ts
│   │   └── task/
│   │       └── TaskWorker.ts
│   │
│   ├── tools/                            # TOOL IMPLEMENTATIONS
│   │   ├── system/                       # System Tools
│   │   │   ├── EchoTool.ts
│   │   │   ├── ClockTool.ts
│   │   │   └── ToolboxTool.ts
│   │   │
│   │   ├── internal/                     # Internal Tools
│   │   │   ├── MemoryTool.ts
│   │   │   ├── SchedulerTool.ts
│   │   │   └── WorkerManagerTool.ts
│   │   │
│   │   └── external/                     # External Tools (MCP)
│   │       └── ExternalToolAdapter.ts
│   │
│   ├── sources/                          # SOURCE IMPLEMENTATIONS
│   │   └── gui/
│   │       └── GuiSource.ts
│   │
│   └── bootstrap/                        # BOOTSTRAP (Dependency Injection)
│       ├── container.ts                  # DI Container (TSyringe)
│       ├── bootstrap.ts                  # Application Bootstrap
│       └── server.ts                     # Entry Point
│
└── legacy/                                # LEGACY CODE (zu migrieren)
    ├── components/                        # Alte Component-Struktur
    │   ├── base/
    │   │   ├── AbstractService.ts
    │   │   ├── AbstractTool.ts
    │   │   ├── AbstractWorker.ts
    │   │   └── AbstractSource.ts
    │   ├── registry.ts
    │   ├── types.ts
    │   └── index.ts
    │
    ├── models/                           # Alte Model/Store Struktur
    │   ├── conversationStore.ts
    │   ├── memoryStore.ts
    │   ├── scheduleStore.ts
    │   └── ...
    │
    └── api/                              # Alte API-Struktur (wird zu adapters/input/http)
        └── ...
```

---

## 3. Architektur-Prinzipien

### 3.1 Hexagonale Architektur (Ports & Adapters)

**Kernprinzip**: Business Logic ist unabhängig von externen Frameworks und Technologien.

**Schichten**:
1. **Domain Layer**: Reine Business Logic, keine Abhängigkeiten
2. **Application Layer**: Use Cases orchestrieren Domain Services
3. **Ports**: Interfaces definieren Verträge
4. **Adapters**: Implementieren Ports mit konkreten Technologien

### 3.2 Dependency Rule

**Regel**: Abhängigkeiten zeigen immer nach innen (zur Domain).

```
Adapters → Ports → Application → Domain
```

- Domain hat **keine** Abhängigkeiten
- Application hängt nur von Domain ab
- Ports werden von Domain/Application definiert
- Adapters implementieren Ports

### 3.3 Separation of Concerns

**Domain Layer**:
- Entities (Aggregates)
- Value Objects
- Domain Services (pure business logic)
- Domain Events

**Application Layer**:
- Use Cases (Anwendungsfälle)
- Application Services (Orchestration)

**Infrastructure Layer**:
- Datenbankverbindungen
- Message Broker
- Logging
- Konfiguration

**Adapters**:
- HTTP API
- WebSocket
- gRPC
- Repositories
- LLM Provider
- Event Publisher/Subscriber

---

## 4. Migrations-Plan

### Phase 1: Legacy isolieren (Woche 1-2)

**Ziele**:
- Legacy-Code identifizieren und isolieren
- Wrapper für Kompatibilität erstellen
- Keine Breaking Changes

**Aufgaben**:
1. ✅ Legacy-Code identifiziert (dieses Dokument)
2. ⬜ Legacy-Ordner `legacy/` erstellen
3. ⬜ Legacy-Dateien nach `legacy/` verschieben:
   - `components/base/Abstract*.ts` → `legacy/components/base/`
   - `components/registry.ts` → `legacy/components/`
   - `components/types.ts` → `legacy/components/`
   - `components/toolRegistry/` → `legacy/components/`
   - `models/` → `legacy/models/`
4. ⬜ Legacy-Wrapper erstellen für Kompatibilität
5. ⬜ Legacy-Imports in `server.ts` markieren
6. ⬜ Tests anpassen

**Ergebnis**: Legacy-Code ist isoliert, System läuft weiterhin.

---

### Phase 2: Ports definieren (Woche 3-4)

**Ziele**:
- Alle Port-Interfaces definieren
- Domain-Entities erstellen
- Use Cases skizzieren

**Aufgaben**:
1. ⬜ **Input Ports** (Driving Ports):
   - `ports/input/IChatPort.ts`
   - `ports/input/IMemoryPort.ts`
   - `ports/input/IToolPort.ts`
   - `ports/input/ISchedulerPort.ts`

2. ⬜ **Output Ports** (Driven Ports):
   - `ports/output/repositories/IMessageRepository.ts`
   - `ports/output/repositories/IMemoryRepository.ts`
   - `ports/output/repositories/IConversationRepository.ts`
   - `ports/output/repositories/ITaskRepository.ts`
   - `ports/output/providers/ILLMProvider.ts`
   - `ports/output/providers/IEmbeddingProvider.ts`
   - `ports/output/subscribers/IEventSubscriber.ts`

3. ⬜ **Domain Entities**:
   - `domain/entities/Message.ts`
   - `domain/entities/Memory.ts`
   - `domain/entities/Conversation.ts`
   - `domain/entities/ScheduledTask.ts`
   - `domain/entities/Tool.ts`

4. ⬜ **Value Objects**:
   - `domain/valueObjects/SourceMessage.ts`
   - `domain/valueObjects/ToolContext.ts`
   - `domain/valueObjects/ToolResult.ts`

5. ⬜ **Use Cases** (Skelette):
   - `application/useCases/chat/ProcessMessageUseCase.ts`
   - `application/useCases/memory/SearchMemoriesUseCase.ts`
   - `application/useCases/tools/ExecuteToolUseCase.ts`

**Ergebnis**: Ports definiert, Domain-Modell skizziert.

---

### Phase 3: Adapter implementieren (Woche 5-8)

**Ziele**:
- Repository-Adapter implementieren
- LLM-Adapter implementieren
- Event-Adapter implementieren

**Aufgaben**:
1. ⬜ **Repository Adapters**:
   - `adapters/output/persistence/postgres/PostgresMessageRepository.ts`
   - `adapters/output/persistence/postgres/PostgresMemoryRepository.ts`
   - `adapters/output/persistence/postgres/PostgresConversationRepository.ts`
   - `adapters/output/persistence/qdrant/QdrantEmbeddingRepository.ts`
   - `adapters/output/persistence/redis/RedisJobRepository.ts`

2. ⬜ **LLM Adapters**:
   - `adapters/output/llm/OllamaLLMProvider.ts`
   - `adapters/output/llm/OllamaEmbeddingProvider.ts`

3. ⬜ **Event Adapters**:
   - `adapters/output/messaging/NatsEventPublisher.ts`
   - `adapters/output/messaging/NatsEventSubscriber.ts`

4. ⬜ **HTTP Adapters**:
   - `adapters/input/http/routes/chat.routes.ts`
   - `adapters/input/http/routes/memory.routes.ts`
   - `adapters/input/http/routes/tools.routes.ts`
   - `adapters/input/http/controllers/ChatController.ts`
   - `adapters/input/http/controllers/MemoryController.ts`

**Ergebnis**: Adapter implementiert, können getestet werden.

---

### Phase 4: Use Cases implementieren (Woche 9-12)

**Ziele**:
- Use Cases vollständig implementieren
- Domain Services implementieren
- Integration mit Adaptern

**Aufgaben**:
1. ⬜ **Chat Use Cases**:
   - `ProcessMessageUseCase.ts` - Vollständig implementieren
   - `GetConversationUseCase.ts`
   - `SendMessageUseCase.ts`

2. ⬜ **Memory Use Cases**:
   - `CreateMemoryUseCase.ts`
   - `SearchMemoriesUseCase.ts`
   - `ExtractMemoriesUseCase.ts`
   - `CompactMemoriesUseCase.ts`

3. ⬜ **Tool Use Cases**:
   - `ExecuteToolUseCase.ts`
   - `ListToolsUseCase.ts`
   - `EnableToolUseCase.ts`

4. ⬜ **Scheduler Use Cases**:
   - `CreateTaskUseCase.ts`
   - `ExecuteTaskUseCase.ts`
   - `ListTasksUseCase.ts`

5. ⬜ **Domain Services**:
   - `domain/services/PersonaService.ts`
   - `domain/services/MemoryExtractionService.ts`
   - `domain/services/ContextBuilderService.ts`

**Ergebnis**: Use Cases implementiert, Business Logic getrennt.

---

### Phase 5: Dependency Injection (Woche 13-14)

**Ziele**:
- DI Container einrichten
- Alle Abhängigkeiten über DI auflösen
- Bootstrap-Logik implementieren

**Aufgaben**:
1. ⬜ **DI Container**:
   - `bootstrap/container.ts` - TSyringe Container konfigurieren
   - Alle Services registrieren
   - Alle Repositories registrieren
   - Alle Provider registrieren

2. ⬜ **Bootstrap**:
   - `bootstrap/bootstrap.ts` - Application Bootstrap
   - `bootstrap/server.ts` - Entry Point

3. ⬜ **Migration**:
   - Legacy-Imports durch DI ersetzen
   - Direkte Instanziierung durch DI ersetzen

**Ergebnis**: DI implementiert, Abhängigkeiten aufgelöst.

---

### Phase 6: Legacy entfernen (Woche 15-16)

**Ziele**:
- Legacy-Code entfernen
- Tests aktualisieren
- Dokumentation aktualisieren

**Aufgaben**:
1. ⬜ **Legacy-Code entfernen**:
   - `legacy/` Ordner löschen
   - Legacy-Imports entfernen
   - Legacy-Wrapper entfernen

2. ⬜ **Tests aktualisieren**:
   - Unit Tests für Use Cases
   - Integration Tests für Adapter
   - E2E Tests für HTTP API

3. ⬜ **Dokumentation**:
   - README aktualisieren
   - API-Dokumentation aktualisieren
   - Architektur-Diagramme erstellen

**Ergebnis**: Legacy entfernt, saubere Architektur.

---

## 5. Konkrete Legacy-Dateien Liste

### Zu verschieben nach `legacy/components/`:

1. `components/base/AbstractService.ts`
2. `components/base/AbstractTool.ts`
3. `components/base/AbstractWorker.ts`
4. `components/base/AbstractSource.ts`
5. `components/base/toolRegistry.ts`
6. `components/registry.ts`
7. `components/types.ts` (Component Interface)
8. `components/toolRegistry/` (kompletter Ordner)
9. Alle `*Component` Exports aus `components/index.ts`

### Zu verschieben nach `legacy/models/`:

1. `models/conversationStore.ts`
2. `models/memoryStore.ts` (falls vorhanden)
3. `models/scheduleStore.ts`
4. `models/eventStore.ts`
5. `models/jobStore.ts`
6. `models/artistStore.ts`
7. `models/collectiveStore.ts`
8. `models/labelStore.ts`

### Zu verschieben nach `legacy/api/`:

1. `api/chat.ts` (wird zu `adapters/input/http/routes/chat.routes.ts`)
2. `api/memory.ts` (wird zu `adapters/input/http/routes/memory.routes.ts`)
3. `api/tools.ts` (wird zu `adapters/input/http/routes/tools.routes.ts`)
4. `api/scheduler.ts` (wird zu `adapters/input/http/routes/scheduler.routes.ts`)
5. `api/conversation.ts` (wird zu `adapters/input/http/routes/conversation.routes.ts`)
6. `api/jobs.ts` (wird zu `adapters/input/http/routes/jobs.routes.ts`)
7. `api/logs.ts` (wird zu `adapters/input/http/routes/logs.routes.ts`)
8. `api/services.ts` (wird zu `adapters/input/http/routes/services.routes.ts`)
9. `api/workers.ts` (wird zu `adapters/input/http/routes/workers.routes.ts`)

### Direkte Abhängigkeiten zu ersetzen:

**In folgenden Dateien**:
- `components/persona/messageHandler.ts` - Ersetze `ollamaChat` durch `ILLMProvider`
- `components/persona/contextBuilder.ts` - Ersetze `embeddingClient` durch `IEmbeddingProvider`
- `components/memory/extractor.ts` - Ersetze `ollamaChat` durch `ILLMProvider`
- `components/worker/memory/index.ts` - Ersetze `ollamaChat` durch `ILLMProvider`
- `api/memory.ts` - Ersetze direkte Store-Aufrufe durch Repository-Interfaces

---

## 6. Vorteile der neuen Architektur

### 6.1 Testbarkeit

**Vorher**:
- Business Logic ist an Datenbank gekoppelt
- Schwer zu mocken
- Integration Tests notwendig für Unit-Tests

**Nachher**:
- Business Logic ist isoliert
- Ports können gemockt werden
- Unit Tests ohne Datenbank möglich

### 6.2 Wartbarkeit

**Vorher**:
- Gemischte Verantwortlichkeiten
- Direkte Abhängigkeiten
- Schwer zu refactoren

**Nachher**:
- Klare Trennung von Concerns
- Abhängigkeiten über Interfaces
- Einfach zu refactoren

### 6.3 Erweiterbarkeit

**Vorher**:
- Neue Features erfordern Änderungen an mehreren Stellen
- Component Registry muss erweitert werden

**Nachher**:
- Neue Features = neue Use Cases
- Neue Adapter implementieren Ports
- Keine Änderungen an Domain/Application

### 6.4 Unabhängigkeit

**Vorher**:
- Abhängig von Fastify, Postgres, NATS, etc.
- Framework-Wechsel erfordert komplette Neuimplementierung

**Nachher**:
- Domain/Application unabhängig von Frameworks
- Framework-Wechsel = nur Adapter ändern

---

## 7. Risiken und Mitigation

### 7.1 Risiko: Breaking Changes

**Mitigation**:
- Phase 1: Legacy isolieren, Wrapper für Kompatibilität
- Schrittweise Migration
- Beide Systeme parallel laufen lassen

### 7.2 Risiko: Zeitaufwand

**Mitigation**:
- Realistische Schätzungen (16 Wochen)
- Priorisierung: Wichtigste Use Cases zuerst
- Incremental Migration

### 7.3 Risiko: Fehler in Migration

**Mitigation**:
- Umfangreiche Tests
- Code Reviews
- Staging-Environment

---

## 8. Nächste Schritte

1. ✅ **Legacy-Code identifiziert** (dieses Dokument)
2. ⬜ **Legacy-Ordner erstellen** und Dateien verschieben
3. ⬜ **Port-Interfaces definieren**
4. ⬜ **Ersten Use Case implementieren** (Proof of Concept)
5. ⬜ **Ersten Adapter implementieren** (Proof of Concept)
6. ⬜ **DI Container einrichten**
7. ⬜ **Schrittweise Migration** aller Use Cases

---

## 9. Referenzen

- **Hexagonal Architecture**: [Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- **Ports & Adapters Pattern**: [Martin Fowler](https://martinfowler.com/articles/ports-and-adapters.html)
- **Clean Architecture**: [Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- **Dependency Injection**: [TSyringe Documentation](https://github.com/microsoft/tsyringe)

---

**Erstellt**: 2024
**Status**: Planungsphase
**Nächste Review**: Nach Phase 1











