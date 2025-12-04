# WebSocket Debug Status

## Problembeschreibung

Die WebSocket-Verbindung zwischen Frontend und Backend funktioniert nicht. Das Frontend versucht, sich mit `ws://localhost:3001/ws` zu verbinden, aber die Verbindung wird sofort geschlossen (Close Code 1006: Abnormal Closure).

### Symptome

1. **Frontend:**
   - WebSocket-Verbindung wird sofort geschlossen
   - `readyState: 3` (CLOSED)
   - Close Code: `1006` (Abnormal Closure)
   - `onopen` Event wird nie ausgelöst
   - Avatar zeigt permanent "connecting" an
   - Reconnection-Versuche schlagen fehl

2. **Backend:**
   - Verbindungsanfragen werden empfangen
   - Handler wird aufgerufen
   - Aber: `connection.socket` ist ein normales Node.js Socket, kein WebSocket-Objekt
   - `connection.socket` hat keine `send` Methode
   - Welcome-Message kann nicht gesendet werden

## Technische Details

### Verwendete Versionen

- `@fastify/websocket`: `^8.3.0` (installiert: `8.3.1`)
- `fastify`: `^4.27.0`
- `@fastify/cors`: `^9.0.0`

### Backend-Implementierung

**Aktuelle Handler-Struktur:**
```typescript
app.get("/ws", { websocket: true }, (connection, req) => {
  // connection.socket ist ein normales Node.js Socket
  // connection.socket hat KEINE send() Methode
  // connection.ws ist nur ein Boolean (true)
})
```

### Debug-Ergebnisse

**Connection-Objekt Struktur:**
```
connection keys: [
  'id',
  'params',
  'raw',
  'query',
  'log',
  'body',
  'corsPreflightEnabled',
  'ws'  // Boolean, nicht WebSocket-Objekt!
]
```

**connection.socket:**
- Typ: `Socket` (normales Node.js Socket)
- Hat `send` Methode: `false`
- Keys: `['connecting', '_hadError', '_parent', '_host', ...]` (normale Socket-Properties)
- Keine WebSocket-spezifischen Methoden

**connection.ws:**
- Typ: `Boolean`
- Wert: `true`
- Kein WebSocket-Objekt!

## Was wir versucht haben

1. ✅ CORS-Konfiguration hinzugefügt
2. ✅ WebSocket-Plugin korrekt registriert
3. ✅ Handler mit `{ websocket: true }` Option
4. ✅ Verschiedene Zugriffe auf `connection.socket` getestet
5. ✅ `connection.ws` geprüft (ist nur Boolean)
6. ✅ ReadyState-Checks implementiert
7. ✅ Retry-Mechanismus für Welcome-Message
8. ✅ Detailliertes Debug-Logging hinzugefügt
9. ✅ Rekursive Suche nach verschachtelten WebSocket-Objekten

## Mögliche Ursachen

### 1. API-Änderung in @fastify/websocket v8

Die Dokumentation sagt, dass `connection.socket` das WebSocket-Objekt sein sollte, aber in Version 8.3.1 scheint das nicht der Fall zu sein. Möglicherweise:
- API hat sich geändert
- Dokumentation ist veraltet
- Es gibt einen Bug in der Version

### 2. Falsche Plugin-Registrierung

Möglicherweise wird das Plugin nicht korrekt registriert oder es gibt einen Konflikt mit anderen Plugins (z.B. CORS).

### 3. TypeScript-Typen vs. Runtime-Verhalten

Die TypeScript-Typen könnten nicht mit dem tatsächlichen Runtime-Verhalten übereinstimmen.

## Nächste Schritte

1. **Prüfe @fastify/websocket Source Code**
   - Schauen, wie die aktuelle Version tatsächlich funktioniert
   - Prüfen, ob es Breaking Changes gab

2. **Alternative Implementierung testen**
   - Direkt `ws` Bibliothek verwenden
   - Oder andere WebSocket-Library für Fastify

3. **Version Downgrade testen**
   - Ältere Version von @fastify/websocket testen
   - Prüfen, ob das Problem version-spezifisch ist

4. **Minimales Beispiel erstellen**
   - Isoliertes Test-Setup ohne andere Plugins
   - Prüfen, ob das Problem durch andere Plugins verursacht wird

## Aktueller Code-Stand

**Backend (`backend/src/server.ts`):**
- WebSocket-Handler implementiert
- Debug-Logging aktiv
- Versucht, WebSocket-Objekt zu finden (rekursive Suche)
- Fehler-Logging wenn kein WebSocket gefunden wird

**Frontend (`frontend/src/contexts/WebSocketContext.tsx`):**
- WebSocket-Verbindung zu `ws://localhost:3001/ws`
- Reconnection-Mechanismus implementiert
- Detailliertes Error-Logging
- Wartet auf `connection_established` Message

## Erwartetes Verhalten

1. Frontend öffnet WebSocket-Verbindung
2. Backend akzeptiert Verbindung
3. Backend sendet `connection_established` Message
4. Frontend empfängt Message und setzt Status auf "connected"
5. Avatar zeigt "connected" an
6. Weitere Messages können gesendet/empfangen werden

## Aktuelles Verhalten

1. Frontend öffnet WebSocket-Verbindung ✅
2. Backend akzeptiert Verbindung ✅
3. Backend kann keine Message senden ❌ (kein WebSocket-Objekt gefunden)
4. Verbindung wird geschlossen ❌
5. Frontend versucht Reconnection ❌

## Notizen

- Die Logs zeigen, dass der Handler aufgerufen wird
- `connection.socket` existiert, ist aber kein WebSocket
- `connection.ws` existiert, ist aber nur ein Boolean
- Keine verschachtelten WebSocket-Objekte gefunden (bisher)
- Das Problem scheint spezifisch für @fastify/websocket v8 zu sein

## Referenzen

- Fastify WebSocket Docs: https://github.com/fastify/fastify-websocket
- Fastify WebSocket README: https://github.com/fastify/fastify-websocket/blob/main/README.md
- npm Package: https://www.npmjs.com/package/@fastify/websocket

