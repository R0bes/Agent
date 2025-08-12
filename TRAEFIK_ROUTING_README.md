# Traefik Routing für alle Services mit HTTPS

Diese Konfiguration integriert Traefik als Reverse Proxy für alle Services in der Docker Compose-Umgebung mit automatischer HTTPS-Unterstützung.

## Übersicht

Alle Services sind jetzt über Traefik erreichbar. Die Konfiguration verwendet ein vereinfachtes Routing-Schema:
- **UI**: Hauptdomain (z.B. `https://localhost`)
- **API**: Unterpfad `/api` (z.B. `https://localhost/api`)
- **Traefik Dashboard**: Separate Subdomain (z.B. `https://traefik.localhost`)

## Verfügbare Services

### Core Services
- **Agent Core API**: `https://${DOMAIN:-localhost}/api`
  - Port: 8000 (intern)
  - Funktion: Haupt-API des Agent-Systems
  - Routing: Path-basiert (`/api`, `/health`, `/think`)

- **Agent UI**: `https://${DOMAIN:-localhost}`
  - Port: 3000 (intern)
  - Funktion: Web-Interface für den Agent
  - Routing: Host-basiert (Hauptdomain)

### Bot Services (derzeit deaktiviert)
- **WhatsApp Bot**: `https://whatsapp.${DOMAIN:-localhost}`
  - Port: 8001 (intern)
  - Funktion: WhatsApp-Bot-Interface

- **Telegram Bot**: `https://telegram.${DOMAIN:-localhost}`
  - Port: 8002 (intern)
  - Funktion: Telegram-Bot-Interface

### Utility Services (derzeit deaktiviert)
- **Chrome Selenium**: `https://selenium.${DOMAIN:-localhost}`
  - Port: 4444 (intern)
  - Funktion: Selenium WebDriver für WhatsApp Bot

- **Chrome VNC**: `https://vnc.${DOMAIN:-localhost}`
  - Port: 7900 (intern)
  - Funktion: VNC-Zugang für Chrome-Debugging

### Traefik Dashboard
- **Traefik Dashboard**: `https://traefik.${DOMAIN:-localhost}`
  - Funktion: Traefik-Verwaltungsinterface
  - Routing: Über eigenen Router mit `api@internal` Service
  - CORS: Aktiviert für alle Anfragen
  - HTTPS: Standardmäßig aktiviert

## Konfiguration

### Umgebungsvariablen
- **DOMAIN**: Bestimmt die Domain für alle Services (Standard: `localhost`)
- **TRAEFIK_HTTP_REDIRECT**: HTTP zu HTTPS weiterleiten (Standard: `true`)
- **TRAEFIK_TLS**: HTTPS aktivieren (Standard: `true`)
- **TELEGRAM_BOT_TOKEN**: Token für den Telegram Bot (wenn aktiviert)
- **TELEGRAM_WEBHOOK_URL**: Webhook-URL für den Telegram Bot (wenn aktiviert)

### Docker Compose
Alle Services haben Traefik-Labels, die das Routing definieren:

#### API Service (Path-basiert):
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.agent-core.rule=PathPrefix(`/api`) || Path(`/health`) || Path(`/think`)"
  - "traefik.http.routers.agent-core.entrypoints=websecure"
  - "traefik.http.routers.agent-core.middlewares=cors@file"
  - "traefik.http.services.agent-core.loadbalancer.server.port=8000"
  - "traefik.http.routers.agent-core.tls=true"
```

#### UI Service (Host-basiert):
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.agent-ui.rule=Host(`${DOMAIN:-localhost}`)"
  - "traefik.http.routers.agent-ui.entrypoints=websecure"
  - "traefik.http.routers.agent-ui.middlewares=cors@file"
  - "traefik.http.services.agent-ui.loadbalancer.server.port=3000"
  - "traefik.http.routers.agent-ui.tls=true"
```

### Traefik Dashboard
Das Dashboard wird über einen speziellen Router konfiguriert:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.traefik-dashboard.rule=Host(`traefik.${DOMAIN:-localhost}`)"
  - "traefik.http.routers.traefik-dashboard.entrypoints=websecure"
  - "traefik.http.routers.traefik-dashboard.service=api@internal"
  - "traefik.http.routers.traefik-dashboard.middlewares=cors@file"
  - "traefik.http.routers.traefik-dashboard.tls=true"
```

### Traefik
- **HTTP Port**: 80 (wird zu HTTPS weitergeleitet)
- **HTTPS Port**: 443 (Hauptport für alle Services)
- **Network**: agent-network
- **CORS**: Aktiviert für alle Services über `cors@file`
- **Dashboard**: Verfügbar über eigenen Router unter `https://traefik.${DOMAIN:-localhost}`
- **TLS**: Standardmäßig aktiviert für alle Services
- **Provider**: Docker + File (für dynamische Konfiguration)

## Verwendung

### 1. Services starten

#### Mit Standard-Domain (localhost):
```bash
docker-compose up -d
```

#### Mit benutzerdefinierter Domain:
```bash
DOMAIN=meine-domain.de docker-compose up -d
```

#### Mit Umgebungsdatei:
Erstellen Sie eine `.env`-Datei basierend auf `env.example`:
```env
DOMAIN=meine-domain.de
TRAEFIK_HTTP_REDIRECT=true
TRAEFIK_TLS=true
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_WEBHOOK_URL=https://telegram.meine-domain.de/webhook
```

### 2. Auf Services zugreifen

#### Mit Standard-Domain:
- **UI**: `https://localhost`
- **API**: `https://localhost/api`
- **Health Check**: `https://localhost/health`
- **Think Endpoint**: `https://localhost/think`
- **Traefik Dashboard**: `https://traefik.localhost`

#### Mit benutzerdefinierter Domain:
- **UI**: `https://meine-domain.de`
- **API**: `https://meine-domain.de/api`
- **Health Check**: `https://meine-domain.de/health`
- **Think Endpoint**: `https://meine-domain.de/think`
- **Traefik Dashboard**: `https://traefik.meine-domain.de`

### 3. HTTP zu HTTPS Weiterleitung
Alle HTTP-Anfragen (Port 80) werden automatisch zu HTTPS (Port 443) weitergeleitet.

## Hosts-Datei

### Für lokale Entwicklung (localhost):
Fügen Sie folgende Einträge zu Ihrer `/etc/hosts` (Linux/Mac) oder `C:\Windows\System32\drivers\etc\hosts` (Windows) hinzu:

```
127.0.0.1 localhost
127.0.0.1 traefik.localhost
```

### Für benutzerdefinierte Domains:
Stellen Sie sicher, dass Ihre DNS-Einträge korrekt konfiguriert sind:
```
meine-domain.de
traefik.meine-domain.de
```

## CORS-Konfiguration

Alle Services haben CORS aktiviert über die `cors@file` Middleware:
- Origin: `*` (alle Domains erlaubt)
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: Standard-HTTP-Header + Authorization
- Vary Header: Aktiviert für besseres Caching

## SSL/TLS-Konfiguration

### Entwicklungsumgebung
- **HTTP**: Port 80 (wird zu HTTPS weitergeleitet)
- **HTTPS**: Port 443 (selbst-signierte Zertifikate)
- **TLS**: Aktiviert für alle Services

### Produktionsumgebung
Für echte SSL-Zertifikate können Sie Let's Encrypt über Traefik konfigurieren:

```yaml
# In der Traefik-Konfiguration
certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@domain.com
      storage: /etc/traefik/acme.json
      httpChallenge:
        entryPoint: web
```

## Troubleshooting

### Service nicht erreichbar
1. Überprüfen Sie, ob der Service läuft: `docker-compose ps`
2. Überprüfen Sie die Traefik-Logs: `docker-compose logs traefik`
3. Stellen Sie sicher, dass die Hosts-Einträge korrekt sind
4. Überprüfen Sie die DOMAIN-Variable: `echo $DOMAIN`

### CORS-Fehler
1. Stellen Sie sicher, dass die `cors@file` Middleware korrekt referenziert wird
2. Überprüfen Sie, ob die Traefik-Konfiguration geladen wurde
3. Überprüfen Sie die Traefik-Logs auf Middleware-Fehler

### HTTPS-Probleme
1. Überprüfen Sie, ob Port 443 verfügbar ist
2. Stellen Sie sicher, dass TLS aktiviert ist
3. Überprüfen Sie die Traefik-Logs auf Zertifikatsfehler
4. Für lokale Entwicklung: Akzeptieren Sie selbst-signierte Zertifikate

### Traefik Dashboard nicht erreichbar
1. Überprüfen Sie die Traefik-Logs: `docker-compose logs traefik`
2. Stellen Sie sicher, dass der Router korrekt konfiguriert ist
3. Überprüfen Sie, ob der Hostname korrekt aufgelöst wird
4. Das Dashboard ist über `api@internal` verfügbar

### Port-Konflikte
- Traefik läuft auf Port 80 (HTTP) und 443 (HTTPS)
- Alle anderen Ports sind nur intern verfügbar
- Externe Ports können entfernt werden, da Traefik das Routing übernimmt

## Beispiel-Konfigurationen

### Entwicklungsumgebung
```bash
# Standard: localhost mit HTTPS
docker-compose up -d
```

### Staging-Umgebung
```bash
# Mit Staging-Domain und HTTPS
DOMAIN=staging.meine-app.de docker-compose up -d
```

### Produktionsumgebung
```bash
# Mit Produktions-Domain und HTTPS
DOMAIN=meine-app.de docker-compose up -d
```

## Bot Services aktivieren

Um die Bot Services zu aktivieren, entfernen Sie die Kommentare in der `docker-compose.yml`:

```yaml
# WhatsApp Bot Service
whatsapp-bot:
  # ... Konfiguration ...

# Telegram Bot Service  
telegram-bot:
  # ... Konfiguration ...

# Chrome Service für WhatsApp Bot
chrome:
  # ... Konfiguration ...
```

**Hinweis**: Die Bot Services sind derzeit deaktiviert, um die Konfiguration zu vereinfachen. Sie können bei Bedarf aktiviert werden.

## Sicherheitshinweise

- **HTTPS**: Alle Services sind standardmäßig über HTTPS erreichbar
- **HTTP-Weiterleitung**: HTTP-Anfragen werden automatisch zu HTTPS weitergeleitet
- **CORS**: Ist für alle Services aktiviert (für Entwicklung)
- **TLS**: Standardmäßig aktiviert für alle Services
- **Dashboard**: Nur über konfigurierte Router erreichbar (nicht mehr `insecure`)
- **Produktion**: Verwenden Sie echte SSL-Zertifikate (Let's Encrypt)

## Routing-Übersicht

```
https://localhost/           → UI (Port 3000)
https://localhost/api/*      → API (Port 8000)
https://localhost/health     → API Health Check
https://localhost/think      → API Think Endpoint
https://traefik.localhost/   → Traefik Dashboard
```
