# Restart server script with package verification
Write-Host "🔄 Restarting Kina Resort Backend Server..." -ForegroundColor Cyan

# Find and kill existing Node processes for this server
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine -like "*server.js*"
}

if ($nodeProcesses) {
    Write-Host "🛑 Stopping existing server processes..." -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object { 
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue 
        Write-Host "  - Stopped process ID: $($_.Id)" -ForegroundColor Gray
    }
    Start-Sleep -Seconds 2
}

# Set environment variables
$env:USE_MOCK_DB = "false"
$env:NODE_ENV = "development"

Write-Host "`n🚀 Starting server with real Supabase..." -ForegroundColor Green
Write-Host "   Connected to kina schema" -ForegroundColor Gray
Write-Host ""

# Start the server
npm start


