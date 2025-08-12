@echo off
echo.
echo ================================
echo 🐳 Docker Container Status
echo ================================

echo.
echo 📊 ÜBERSICHT:
for /f %%i in ('docker ps --format "{{.Names}}" ^| find /c /v ""') do set running=%%i
for /f %%i in ('docker ps -a --format "{{.Names}}" ^| find /c /v ""') do set total=%%i
echo    Laufend: %running% / %total% Container

echo.
echo ✅ LAUFENDE CONTAINER:
docker ps --format "   {{.Names}}		{{.Status}}		{{.Ports}}"

echo.
echo ❌ GESTOPPTE CONTAINER:
docker ps -a --filter "status=exited" --format "   {{.Names}}		{{.Status}}"

echo.
echo 🏷️ IMAGES (Top 5):
docker images --format "   {{.Repository}}:{{.Tag}}	{{.Size}}" | head -5

echo.
echo ================================
echo 💡 BEFEHLE:
echo    docker-compose up -d     # Alle Services starten
echo    docker-compose down      # Alle Services stoppen
echo    docker-compose logs -f   # Logs anschauen
echo    docker-status.bat        # Status erneut anzeigen
echo ================================
pause


