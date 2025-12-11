# Hexagonale Architektur - Übersicht

## 🎯 Was wurde migriert?

### ✅ Migrierte APIs (4 von 9)

1. **Chat API** - `/api/chat`, `/api/conversation/:id`
2. **Tools API** - `/api/tools`, `/api/tools/:name`, `/api/tools/execute`
3. **Memory API** - `/api/memory` (CRUD + Search)
4. **Scheduler API** - `/api/scheduler/tasks` (CRUD + Enable/Disable)

### ⏳ Noch zu migrieren

- Messages API
- Jobs API
- Workers API
- Logs API
- Services API

## 📁 Neue Architektur-Struktur

```
backend/src/
├── domain/                    # Business Logic (Kern)
│   ├── entities/             # 5 Entities: Message, Memory, Conversation, ScheduledTask, Tool
│   ├── valueObjects/          # 4 Value Objects: SourceMessage, ToolContext, ToolResult, EmbeddingVector
│   ├── services/             # Domain Services (noch leer)
│   └── events/                # Domain Events (noch leer)
│
├── application/               # Use Cases (Anwendungslogik)
│   ├── useCases/
│   │   ├── chat/              # 2 Use Cases
│   │   ├── memory/            # 6 Use Cases
│   │   ├── scheduler/         # 7 Use Cases
│   │   └── tools/             # 2 Use Cases
│   └── services/             # Application Services (noch leer)
│
├── ports/                     # Interfaces (Verträge)
│   ├── input/                 # 4 Input Ports (Driving)
│   │   ├── IChatPort.ts
│   │   ├── IMemoryPort.ts
│   │   ├── IToolPort.ts
│   │   └── ISchedulerPort.ts
│   └── output/                # 8 Output Ports (Driven)
│       ├── repositories/      # 4 Repository Interfaces
│       ├── providers/         # 2 Provider Interfaces
│       ├── publishers/        # 1 Publisher Interface
│       └── subscribers/       # 1 Subscriber Interface
│
├── adapters/                   # Implementierungen
│   ├── input/                 # Input Adapters
│   │   ├── http/              # HTTP Controller & Routes
│   │   │   ├── controllers/   # 4 Controller
│   │   │   └── routes/        # 4 Route-Dateien
│   │   ├── ThreadedChatPortAdapter.ts
│   │   ├── ThreadedMemoryPortAdapter.ts
│   │   ├── ThreadedToolPortAdapter.ts
│   │   └── ThreadedSchedulerPortAdapter.ts
│   └── output/                # Output Adapters
│       ├── persistence/       # 3 Repository Implementierungen
│       ├── llm/               # 2 LLM Provider
│       └── messaging/         # 2 Messaging Adapter
│
├── infrastructure/            # Technische Details
│   ├── database/              # DB Connections (Postgres, Qdrant, Redis)
│   ├── messaging/             # NATS Connection
│   ├── logging/               # Logger Wrapper
│   └── config/                # Settings Wrapper
│
└── bootstrap/                 # Dependency Injection & Startup
    ├── container.ts           # DI Container
    ├── bootstrap.ts           # Initialisierung aller Dependencies
    └── server.ts               # Entry Point (noch nicht verwendet)
```

## 🔄 Datenfluss

### Alte Architektur (Legacy):
```
HTTP Request
  ↓
API Route (api/chat.ts)
  ↓
Legacy Component Registry
  ↓
Legacy Store (models/conversationStore.ts)
  ↓
Database
```

### Neue Architektur (Hexagonal):
```
HTTP Request
  ↓
Route (adapters/input/http/routes/chat.routes.ts)
  ↓
Controller (adapters/input/http/controllers/ChatController.ts)
  ↓
Use Case (application/useCases/chat/ProcessMessageUseCase.ts)
  ↓
Port Interface (ports/input/IChatPort.ts)
  ↓
Port Adapter (adapters/input/ThreadedChatPortAdapter.ts)
  ↓
Threaded Service (components/persona/personaService.ts)
  ↓
Repository (adapters/output/persistence/postgres/PostgresMessageRepository.ts)
  ↓
Infrastructure (infrastructure/database/postgres/connection.ts)
  ↓
Database
```

## 📝 Code-Beispiele

### 1. Controller (HTTP Input Adapter)

```typescript
// adapters/input/http/controllers/ChatController.ts
export class ChatController {
  static async processMessage(req, reply) {
    // 1. Use Case aus DI Container holen
    const useCase = container.resolve<ProcessMessageUseCase>("ProcessMessageUseCase");
    
    // 2. Domain Value Object erstellen
    const sourceMessage = SourceMessage.create(userId, conversationId, text, source);
    
    // 3. Use Case ausführen
    const response = await useCase.execute(sourceMessage);
    
    // 4. HTTP Response senden
    reply.send({ ok: true, data: response });
  }
}
```

### 2. Use Case (Application Layer)

```typescript
// application/useCases/chat/ProcessMessageUseCase.ts
export class ProcessMessageUseCase {
  constructor(
    private readonly chatPort: IChatPort,           // Input Port
    private readonly messageRepository: IMessageRepository,  // Output Port
    private readonly eventPublisher: IEventPublisher  // Output Port
  ) {}

  async execute(sourceMessage: SourceMessage): Promise<Message> {
    // 1. User Message speichern
    const userMessage = Message.create(...);
    await this.messageRepository.save(userMessage);
    
    // 2. Event publizieren
    await this.eventPublisher.publish({ type: "message_created", ... });
    
    // 3. Durch Chat Port verarbeiten (Persona Service)
    const response = await this.chatPort.processMessage({...});
    
    // 4. Assistant Response speichern
    const assistantMessage = Message.create(...);
    await this.messageRepository.save(assistantMessage);
    
    return assistantMessage;
  }
}
```

### 3. Port Adapter (Threaded Service Integration)

```typescript
// adapters/input/ThreadedChatPortAdapter.ts
export class ThreadedChatPortAdapter implements IChatPort {
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    // Threaded Service über ExecutionService aufrufen
    const result = await executionService.callService("persona", "processMessage", {
      sourceMessage: {...}
    });
    
    // Ergebnis in Port-Format konvertieren
    return {
      messageId: result.id,
      conversationId: result.conversationId,
      content: result.content,
      ...
    };
  }
}
```

### 4. Bootstrap (Dependency Injection)

```typescript
// bootstrap/bootstrap.ts
export async function bootstrap(): Promise<void> {
  // 1. Infrastructure initialisieren
  const pool = await createPostgresPool();
  await runMigrations(pool);
  
  // 2. Repositories registrieren
  container.register("IMessageRepository", new PostgresMessageRepository());
  container.register("IMemoryRepository", new QdrantMemoryRepository());
  
  // 3. Port Adapter registrieren
  const chatPort = new ThreadedChatPortAdapter();
  container.register("IChatPort", chatPort);
  
  // 4. Use Cases mit Dependencies instanziieren
  const processMessageUseCase = new ProcessMessageUseCase(
    chatPort,
    messageRepository,
    eventPublisher
  );
  container.register("ProcessMessageUseCase", processMessageUseCase);
}
```

## 🎨 Vorteile der neuen Architektur

### 1. **Trennung von Concerns**
- Domain Logic ist isoliert von Infrastructure
- Use Cases sind unabhängig von HTTP/WebSockets
- Ports definieren klare Verträge

### 2. **Testbarkeit**
- Use Cases können ohne HTTP/DB getestet werden
- Ports können gemockt werden
- Domain Logic ist isoliert testbar

### 3. **Flexibilität**
- Threaded Services können einfach ausgetauscht werden
- Neue Input-Adapter (gRPC, GraphQL) können hinzugefügt werden
- Output-Adapter (andere DBs, LLMs) können ausgetauscht werden

### 4. **Wartbarkeit**
- Klare Struktur: Domain → Application → Adapters
- Dependencies sind explizit (Constructor Injection)
- Legacy-Code ist isoliert

## 📊 Statistiken

- **Use Cases**: 17 (Chat: 2, Memory: 6, Scheduler: 7, Tools: 2)
- **Controller**: 4 (Chat, Memory, Scheduler, Tools)
- **Port Interfaces**: 12 (4 Input, 8 Output)
- **Adapters**: 12 (4 Input, 8 Output)
- **Entities**: 5
- **Value Objects**: 4

## 🚀 Nächste Schritte

1. ✅ **Phase 1**: Legacy Isolation - **ABGESCHLOSSEN**
2. ✅ **Phase 2**: Neue Architektur - **STRUKTURELL IMPLEMENTIERT**
3. ✅ **Phase 3**: API Migration - **4 von 9 APIs migriert**
4. ⏳ **Phase 4**: Tests schreiben
5. ⏳ **Phase 5**: Legacy-Ordner löschen

## 🔗 Integration mit bestehendem System

Die neue Architektur integriert sich nahtlos mit den bestehenden Threaded Services:

- **ThreadedPersonaService** → `ThreadedChatPortAdapter` → `IChatPort`
- **ThreadedMemoryService** → `ThreadedMemoryPortAdapter` → `IMemoryPort`
- **ThreadedToolboxService** → `ThreadedToolPortAdapter` → `IToolPort`
- **ThreadedSchedulerService** → `ThreadedSchedulerPortAdapter` → `ISchedulerPort`

Die Threaded Services laufen weiterhin in separaten Threads und werden über `ExecutionService` aufgerufen.


