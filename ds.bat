@echo off
cls
echo.
echo ========================================
echo          Docker Status
echo ========================================
echo.

echo LAUFENDE CONTAINER:
docker ps --format "  {{.Names}} - {{.Status}}"

echo.
echo SERVICES:
docker-compose ps --format table

echo.
echo ========================================

