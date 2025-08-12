#!/bin/bash

# Einfache Docker Container Status Anzeige
# Zeigt nur die wesentlichen Informationen

echo "🐳 Docker Container Status"
echo "=" * 60

# Kurze Übersicht
echo -e "\n📊 ÜBERSICHT:"
RUNNING=$(docker ps --format "table {{.Names}}" | grep -v NAMES | wc -l)
TOTAL=$(docker ps -a --format "table {{.Names}}" | grep -v NAMES | wc -l)
echo "   Laufend: $RUNNING / $TOTAL Container"

# Laufende Container
echo -e "\n✅ LAUFENDE CONTAINER:"
if [ $RUNNING -eq 0 ]; then
    echo "   Keine Container laufen"
else
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -1
    docker ps --format "   {{.Names}}\t{{.Status}}\t{{.Ports}}"
fi

# Gestoppte Container
STOPPED=$(docker ps -a --filter "status=exited" --format "table {{.Names}}" | grep -v NAMES | wc -l)
if [ $STOPPED -gt 0 ]; then
    echo -e "\n❌ GESTOPPTE CONTAINER:"
    docker ps -a --filter "status=exited" --format "   {{.Names}}\t{{.Status}}"
fi

# Netzwerke
echo -e "\n🌐 NETZWERKE:"
docker network ls --format "   {{.Name}}\t{{.Driver}}" | grep -v "bridge\|host\|none"

# Volumes
echo -e "\n💾 VOLUMES:"
docker volume ls --format "   {{.Name}}" | head -5

echo -e "\n" + "=" * 60
echo "💡 Befehle:"
echo "   docker-compose up -d     # Alle Services starten"
echo "   docker-compose down      # Alle Services stoppen"
echo "   docker-compose logs -f   # Logs anschauen"


