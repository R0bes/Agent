#!/bin/bash
set -e

# Starte Xvfb für Headless-Browser wenn nicht bereits läuft
if [ "$WHATSAPP_HEADLESS" = "false" ]; then
    echo "Starting Xvfb for non-headless mode..."
    Xvfb :99 -screen 0 1920x1080x24 &
    export DISPLAY=:99
fi

# Warte kurz damit Xvfb startet
sleep 2

echo "Starting WhatsApp Bot..."
echo "Configuration:"
echo "  HEADLESS: $WHATSAPP_HEADLESS"
echo "  MAX_RETRIES: $WHATSAPP_MAX_RETRIES"
echo "  MONITORING_INTERVAL: $WHATSAPP_MONITORING_INTERVAL"

# Führe den übergebenen Befehl aus
exec "$@"


