# Agent Prototype Setup and Start Script
# This script installs dependencies and starts both backend and frontend

Write-Host "🚀 Agent Prototype Setup" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install dependencies
Write-Host "📦 Step 1: Installing dependencies..." -ForegroundColor Yellow
Write-Host "   Installing root dependencies..." -ForegroundColor Gray
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
Write-Host ""

# Step 2 & 3: Start backend and frontend
Write-Host "🎯 Step 2 & 3: Starting backend and frontend..." -ForegroundColor Yellow
Write-Host "   Backend will run on http://localhost:3001" -ForegroundColor Gray
Write-Host "   Frontend will run on http://localhost:5173" -ForegroundColor Gray
Write-Host ""

# Start backend in background
Write-Host "   Starting backend..." -ForegroundColor Gray
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location backend
    npm run dev
}

# Start frontend in background
Write-Host "   Starting frontend..." -ForegroundColor Gray
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location frontend
    npm run dev
}

Write-Host ""
Write-Host "✅ Both services are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Wait for jobs and show output
try {
    while ($true) {
        Start-Sleep -Seconds 2
        
        # Show backend output
        $backendOutput = Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
        if ($backendOutput) {
            Write-Host "[Backend] $backendOutput" -ForegroundColor Blue
        }
        
        # Show frontend output
        $frontendOutput = Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
        if ($frontendOutput) {
            Write-Host "[Frontend] $frontendOutput" -ForegroundColor Magenta
        }
        
        # Check if jobs are still running
        if ($backendJob.State -eq "Failed" -or $frontendJob.State -eq "Failed") {
            Write-Host "❌ One or more services failed to start" -ForegroundColor Red
            break
        }
    }
} finally {
    # Cleanup on exit
    Write-Host ""
    Write-Host "🛑 Stopping services..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "✅ Services stopped" -ForegroundColor Green
}

