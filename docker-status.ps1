# Docker Status - Einfache Übersicht

Write-Host ""
Write-Host "================================" -ForegroundColor Blue
Write-Host "     Docker Container Status" -ForegroundColor Blue  
Write-Host "================================" -ForegroundColor Blue

# Laufende Container
Write-Host ""
Write-Host "LAUFENDE CONTAINER:" -ForegroundColor Green
docker ps --format "  {{.Names}} - {{.Status}}"

# Docker Compose Services  
Write-Host ""
Write-Host "SERVICES:" -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "================================" -ForegroundColor Blue