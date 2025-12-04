# Tool Creation Guide

Diese Anleitung erklärt, wie du ein neues Tool für das Agent-System erstellst.

## Verzeichnisstruktur

Jedes Tool hat sein eigenes Verzeichnis unter `backend/src/tools/`:

```
backend/src/tools/
├── clockTool/
│   └── index.ts          # Tool-Implementierung
├── echoTool/
│   └── index.ts          # Tool-Implementierung
├── toolTypes.ts          # TypeScript-Interfaces
├── toolRegistry.ts       # Tool-Registrierung
├── toolEngine.ts         # Tool-Ausführung
└── index.ts              # Exports
```

## Schritt-für-Schritt Anleitung

### 1. Verzeichnis erstellen

Erstelle ein neues Verzeichnis für dein Tool:

```bash
mkdir backend/src/tools/myTool
```

### 2. Tool-Datei erstellen

Erstelle `backend/src/tools/myTool/index.ts` mit folgender Struktur:

```typescript
import type { ToolDefinition } from "../toolTypes";

export const myTool: ToolDefinition<{ param1: string; param2?: number }> = {
  name: "my_tool",
  shortDescription: "Kurze Beschreibung in einer Zeile.",
  description: "Ausführliche Beschreibung, die erklärt, was das Tool macht, wann man es verwendet, welche Parameter es gibt, etc. Diese Beschreibung wird vom LLM verwendet, um zu entscheiden, ob das Tool für eine Anfrage relevant ist.",
  parameters: {
    type: "object",
    properties: {
      param1: { 
        type: "string",
        description: "Beschreibung des Parameters"
      },
      param2: { 
        type: "number",
        description: "Optionaler Parameter"
      }
    },
    required: ["param1"]
  },
  examples: [
    {
      input: {
        param1: "Beispielwert",
        param2: 42
      },
      output: {
        ok: true,
        data: {
          result: "Erfolgreiche Ausführung"
        }
      },
      description: "Beispiel für normale Verwendung"
    },
    {
      input: {
        param1: "Nur erforderlicher Parameter"
      },
      output: {
        ok: true,
        data: {
          result: "Alternative Verwendung"
        }
      },
      description: "Beispiel ohne optionalen Parameter"
    }
  ],
  async execute(args, ctx) {
    // Deine Tool-Logik hier
    try {
      // Verarbeitung
      const result = await doSomething(args.param1, args.param2);
      
      return {
        ok: true,
        data: {
          result: result
        }
      };
    } catch (error: any) {
      return {
        ok: false,
        error: error?.message ?? String(error)
      };
    }
  }
};
```

### 3. Tool exportieren

Füge dein Tool zu `backend/src/tools/index.ts` hinzu:

```typescript
export * from "./toolTypes";
export * from "./toolRegistry";
export * from "./toolEngine";
export * from "./echoTool";
export * from "./clockTool";
export * from "./myTool";  // <-- Hinzufügen
```

### 4. Tool registrieren

Registriere dein Tool in `backend/src/server.ts`:

```typescript
import { myTool } from "./tools/myTool";

// ...

// Register tools
registerTool(echoTool);
registerTool(clockTool);
registerTool(myTool);  // <-- Hinzufügen
```

## ToolDefinition Interface

### Erforderliche Felder

- **`name`** (string): Eindeutiger Name des Tools (snake_case empfohlen)
- **`shortDescription`** (string): Kurze, prägnante Beschreibung in einer Zeile
- **`description`** (string): Ausführliche Beschreibung für das LLM
- **`execute`** (function): Die Ausführungsfunktion

### Optionale Felder

- **`parameters`** (object): JSON-Schema für die Parameter-Validierung
- **`examples`** (array): Beispiele für die Verwendung

## ToolContext

Die `execute`-Funktion erhält einen `ToolContext` mit folgenden Informationen:

```typescript
interface ToolContext {
  userId: string;              // ID des Benutzers
  conversationId: string;      // ID der Konversation
  source: SourceDescriptor;    // Quelle der Anfrage (gui, scheduler, etc.)
  traceId?: string;            // Optional: Trace-ID für Logging
  meta?: Record<string, unknown>; // Optional: Zusätzliche Metadaten
}
```

## ToolResult

Die `execute`-Funktion muss ein `ToolResult` zurückgeben:

```typescript
interface ToolResult {
  ok: boolean;        // true bei Erfolg, false bei Fehler
  data?: unknown;     // Erfolgreiche Daten (wenn ok === true)
  error?: string;     // Fehlermeldung (wenn ok === false)
}
```

### Erfolgreiche Ausführung

```typescript
return {
  ok: true,
  data: {
    // Deine Daten hier
  }
};
```

### Fehlerbehandlung

```typescript
return {
  ok: false,
  error: "Beschreibung des Fehlers"
};
```

## Beispiele

### Beispiel 1: Einfaches Tool ohne Parameter

```typescript
import type { ToolDefinition } from "../toolTypes";

export const simpleTool: ToolDefinition = {
  name: "get_status",
  shortDescription: "Get the current system status.",
  description: "Returns the current status of the system including uptime, version, and health metrics. This tool is useful for monitoring and debugging purposes.",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false
  },
  examples: [
    {
      input: {},
      output: {
        ok: true,
        data: {
          status: "healthy",
          uptime: 3600,
          version: "1.0.0"
        }
      }
    }
  ],
  async execute(_args, _ctx) {
    return {
      ok: true,
      data: {
        status: "healthy",
        uptime: process.uptime(),
        version: "1.0.0"
      }
    };
  }
};
```

### Beispiel 2: Tool mit Parametern

```typescript
import type { ToolDefinition } from "../toolTypes";

export const calculatorTool: ToolDefinition<{ 
  operation: "add" | "subtract" | "multiply" | "divide";
  a: number;
  b: number;
}> = {
  name: "calculate",
  shortDescription: "Perform basic arithmetic operations.",
  description: "Performs basic arithmetic operations (addition, subtraction, multiplication, division) on two numbers. Use this tool when the user asks for mathematical calculations.",
  parameters: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["add", "subtract", "multiply", "divide"],
        description: "The arithmetic operation to perform"
      },
      a: {
        type: "number",
        description: "First number"
      },
      b: {
        type: "number",
        description: "Second number"
      }
    },
    required: ["operation", "a", "b"]
  },
  examples: [
    {
      input: {
        operation: "add",
        a: 5,
        b: 3
      },
      output: {
        ok: true,
        data: {
          result: 8
        }
      },
      description: "Addition example"
    },
    {
      input: {
        operation: "divide",
        a: 10,
        b: 2
      },
      output: {
        ok: true,
        data: {
          result: 5
        }
      },
      description: "Division example"
    },
    {
      input: {
        operation: "divide",
        a: 10,
        b: 0
      },
      output: {
        ok: false,
        error: "Division by zero is not allowed"
      },
      description: "Error handling example"
    }
  ],
  async execute(args, _ctx) {
    if (args.operation === "divide" && args.b === 0) {
      return {
        ok: false,
        error: "Division by zero is not allowed"
      };
    }

    let result: number;
    switch (args.operation) {
      case "add":
        result = args.a + args.b;
        break;
      case "subtract":
        result = args.a - args.b;
        break;
      case "multiply":
        result = args.a * args.b;
        break;
      case "divide":
        result = args.a / args.b;
        break;
    }

    return {
      ok: true,
      data: { result }
    };
  }
};
```

## Best Practices

### 1. Beschreibungen

- **shortDescription**: Maximal eine Zeile, prägnant
- **description**: Ausführlich, erklärt:
  - Was das Tool macht
  - Wann man es verwendet
  - Welche Parameter es gibt
  - Was zurückgegeben wird
  - Besondere Hinweise oder Einschränkungen

### 2. Parameter-Schema

- Verwende JSON-Schema-Format
- Definiere `type`, `properties`, `required`
- Füge `description` zu jedem Property hinzu
- Verwende `enum` für feste Werte
- Setze `additionalProperties: false` wenn keine zusätzlichen Properties erlaubt sind

### 3. Beispiele

- Mindestens 1-2 Beispiele pro Tool
- Zeige verschiedene Verwendungsfälle
- Inkludiere Fehlerbeispiele, wenn relevant
- Verwende realistische Werte

### 4. Fehlerbehandlung

- Fange alle Fehler ab
- Gib aussagekräftige Fehlermeldungen zurück
- Verwende `try-catch` für asynchrone Operationen
- Validiere Eingabeparameter

### 5. TypeScript-Typen

- Verwende generische Typen für `ToolDefinition<TArgs>`
- Definiere explizite Typen für Parameter
- Nutze TypeScript für Typsicherheit

### 6. Tool-Namen

- Verwende snake_case (z.B. `get_time`, `calculate_sum`)
- Namen sollten eindeutig und beschreibend sein
- Vermeide Abkürzungen, wenn nicht allgemein verständlich

## API-Endpoints

Nach der Registrierung sind deine Tools über folgende Endpoints verfügbar:

### Alle Tools abfragen

```bash
GET /api/tools
```

Response:
```json
{
  "ok": true,
  "data": [
    {
      "name": "my_tool",
      "shortDescription": "Kurze Beschreibung",
      "description": "Ausführliche Beschreibung",
      "parameters": { ... },
      "examples": [ ... ]
    }
  ]
}
```

### Einzelnes Tool abfragen

```bash
GET /api/tools/my_tool
```

Response:
```json
{
  "ok": true,
  "data": {
    "name": "my_tool",
    "shortDescription": "Kurze Beschreibung",
    "description": "Ausführliche Beschreibung",
    "parameters": { ... },
    "examples": [ ... ]
  }
}
```

## Testing

### Manuelles Testen

1. Starte den Server: `npm run dev` (im `backend/` Verzeichnis)
2. Teste das Tool über die API:
   ```bash
   curl http://localhost:3001/api/tools/my_tool
   ```
3. Teste die Tool-Ausführung über den Chat-Endpoint

### Tool-Validierung

Stelle sicher, dass:
- ✅ Das Tool korrekt registriert ist
- ✅ Die Beschreibungen vollständig sind
- ✅ Beispiele vorhanden sind
- ✅ Fehlerbehandlung implementiert ist
- ✅ TypeScript-Typen korrekt sind
- ✅ Keine Linter-Fehler vorhanden sind

## Checkliste

Vor dem Commit:

- [ ] Tool-Verzeichnis erstellt
- [ ] `index.ts` mit vollständiger Tool-Definition
- [ ] Export in `tools/index.ts` hinzugefügt
- [ ] Registrierung in `server.ts` hinzugefügt
- [ ] `shortDescription` und `description` ausgefüllt
- [ ] `parameters` Schema definiert
- [ ] Mindestens 1-2 `examples` hinzugefügt
- [ ] Fehlerbehandlung implementiert
- [ ] TypeScript-Typen korrekt
- [ ] Keine Linter-Fehler
- [ ] Tool über API getestet

## Weitere Ressourcen

- Siehe `clockTool/index.ts` für ein einfaches Beispiel
- Siehe `echoTool/index.ts` für ein Beispiel mit Parametern
- Siehe `toolTypes.ts` für alle verfügbaren Interfaces
- Siehe `toolRegistry.ts` für Registrierungs-Funktionen

