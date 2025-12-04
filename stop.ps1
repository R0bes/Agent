# Stop Agent Backend and Frontend Script
# This script stops all running Node processes for the Agent project

Write-Host "🛑 Stopping Agent Services..." -ForegroundColor Yellow
Write-Host ""

# Find and stop backend processes (tsx watch or node processes on port 3001)
$backendProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*tsx*server.ts*" -or 
    $_.CommandLine -like "*backend*" -or
    (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -eq $_.Id })
}

# Find and stop frontend processes (vite on port 5173)
$frontendProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*vite*" -or
    (Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -eq $_.Id })
}

# Alternative: Find processes by port
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue

$allProcesses = @()

if ($port3001) {
    $pid3001 = $port3001 | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $pid3001) {
        try {
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($proc) { $allProcesses += $proc }
        } catch {}
    }
}

if ($port5173) {
    $pid5173 = $port5173 | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $pid5173) {
        try {
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($proc) { $allProcesses += $proc }
        } catch {}
    }
}

if ($allProcesses.Count -eq 0) {
    Write-Host "ℹ️  No running services found on ports 3001 or 5173" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Trying to find any tsx or vite processes..." -ForegroundColor Gray
    
    $tsxProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        try {
            $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
            $cmdLine -like "*tsx*" -or $cmdLine -like "*vite*"
        } catch {
            $false
        }
    }
    
    if ($tsxProcesses) {
        $allProcesses = $tsxProcesses
    }
}

if ($allProcesses.Count -gt 0) {
    Write-Host "Found $($allProcesses.Count) process(es) to stop:" -ForegroundColor Cyan
    foreach ($proc in $allProcesses) {
        Write-Host "  - PID $($proc.Id): $($proc.ProcessName)" -ForegroundColor White
    }
    Write-Host ""
    
    $allProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Services stopped" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No services running" -ForegroundColor Gray
}

Write-Host ""

