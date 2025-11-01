# Test if backend is running and responding
Write-Host "Testing Kina Resort Backend..." -ForegroundColor Cyan

# Test port
$port = 3000
$portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if (-not $portInUse) {
    Write-Host "[FAIL] Port 3000 not in use - backend not running" -ForegroundColor Red
    Write-Host "`nTo start the backend:" -ForegroundColor Yellow
    Write-Host "  cd server" -ForegroundColor Yellow
    Write-Host "  node server.js" -ForegroundColor Yellow
    exit 1
}

Write-Host "[INFO] Port 3000 is in use" -ForegroundColor Cyan

# Test health endpoint
Write-Host "`nTesting /health endpoint..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -TimeoutSec 5
    Write-Host "[PASS] Health check: $($response.message)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Health check failed: $_" -ForegroundColor Red
    exit 1
}

# Test availability endpoint
Write-Host "`nTesting /api/bookings/availability endpoint..." -ForegroundColor Cyan
try {
    $checkIn = (Get-Date).ToString("yyyy-MM-dd")
    $checkOut = (Get-Date).AddDays(3).ToString("yyyy-MM-dd")
    $url = "http://localhost:3000/api/bookings/availability/1?checkIn=$checkIn&checkOut=$checkOut"
    
    Write-Host "  Testing with dates: $checkIn to $checkOut" -ForegroundColor Gray
    $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 5
    Write-Host "[PASS] Availability endpoint: Retrieved $($response.totalDates) dates" -ForegroundColor Green
    Write-Host "  Success: $($response.success)" -ForegroundColor Gray
    Write-Host "  Booked dates: $($response.bookedDatesCount)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Availability endpoint: $_" -ForegroundColor Red
    Write-Host "  URL: $url" -ForegroundColor Gray
    exit 1
}

Write-Host "`n✓ All tests passed!" -ForegroundColor Green
exit 0














