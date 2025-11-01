# Test Booking API - PowerShell Script
# Run this script to test the booking API endpoints

$ErrorActionPreference = "Stop"

# Configuration
$API_BASE = "http://localhost:3000/api"
$TEST_USER = @{
    email = "john@example.com"
    password = "password123"
}

$global:authToken = $null
$global:bookingId = $null

Write-Host "🧪 Starting Booking Flow Tests..." -ForegroundColor Cyan
Write-Host ""

# Function to make API calls
function Invoke-ApiCall {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [hashtable]$Body = $null,
        [switch]$RequireAuth
    )
    
    $url = "$API_BASE$Endpoint"
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($RequireAuth -and $global:authToken) {
        $headers["Authorization"] = "Bearer $global:authToken"
    }
    
    $params = @{
        Uri = $url
        Method = $Method
        Headers = $headers
    }
    
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }
    
    try {
        $response = Invoke-RestMethod @params
        return @{
            success = $true
            data = $response
        }
    } catch {
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

# Test 1: Login
Write-Host "=== Test 1: Login ===" -ForegroundColor Yellow
$loginResult = Invoke-ApiCall -Endpoint "/auth/login" -Method "POST" -Body $TEST_USER

if ($loginResult.success -and $loginResult.data.success) {
    $global:authToken = $loginResult.data.token
    Write-Host "✓ Login successful" -ForegroundColor Green
    Write-Host "  User: $($loginResult.data.user.firstName) $($loginResult.data.user.lastName)"
} else {
    Write-Host "✗ Login failed" -ForegroundColor Red
    Write-Host "  Error: $($loginResult.data.error)"
    exit 1
}

Write-Host ""

# Test 2: Create Booking
Write-Host "=== Test 2: Create Booking ===" -ForegroundColor Yellow
$bookingData = @{
    packageId = 1
    checkIn = "2025-11-28"
    checkOut = "2025-12-01"
    guests = @{
        adults = 2
        children = 0
    }
    totalCost = 63600
    paymentMode = "bank-transfer"
    perRoomGuests = @(
        @{
            roomId = "Room A1"
            guestName = "John Doe"
            adults = 2
            children = 0
        }
    )
    contactNumber = "09260748398"
    specialRequests = ""
    selectedCottages = @()
}

$bookingResult = Invoke-ApiCall -Endpoint "/bookings" -Method "POST" -Body $bookingData -RequireAuth

if ($bookingResult.success -and $bookingResult.data.success) {
    $global:bookingId = $bookingResult.data.data.id
    Write-Host "✓ Booking created successfully" -ForegroundColor Green
    Write-Host "  Booking ID: $global:bookingId"
    Write-Host "  Dates: $($bookingResult.data.data.check_in) to $($bookingResult.data.data.check_out)"
    Write-Host "  Total Cost: ₱$($bookingResult.data.data.total_cost)"
} else {
    Write-Host "✗ Booking creation failed" -ForegroundColor Red
    if ($bookingResult.data) {
        Write-Host "  Error: $($bookingResult.data.error)"
    }
}

Write-Host ""

# Test 3: Check Availability
Write-Host "=== Test 3: Check Availability ===" -ForegroundColor Yellow
$checkIn = "2025-11-01"
$checkOut = "2025-11-30"
$availEndpoint = "/bookings/availability/1?checkIn=$checkIn" + "`&checkOut=$checkOut"
$availabilityResult = Invoke-ApiCall -Endpoint $availEndpoint

if ($availabilityResult.success -and $availabilityResult.data.success) {
    Write-Host "✓ Availability check successful" -ForegroundColor Green
    Write-Host "  Total dates checked: $($availabilityResult.data.totalDates)"
    Write-Host "  Fully booked dates: $($availabilityResult.data.bookedDatesCount)"
    
    # Show sample dates
    $dates = ($availabilityResult.data.dateAvailability.PSObject.Properties.Name | Select-Object -First 5)
    Write-Host ""
    Write-Host "  Sample dates:" -ForegroundColor Cyan
    foreach ($date in $dates) {
        $avail = $availabilityResult.data.dateAvailability.$date
        Write-Host "    $date : status=$($avail.status), booked=$($avail.bookedCount), available=$($avail.availableCount)"
    }
} else {
    Write-Host "✗ Availability check failed" -ForegroundColor Red
    if ($availabilityResult.data) {
        Write-Host "  Error: $($availabilityResult.data.error)"
    }
}

Write-Host ""

# Test 4: Get User Bookings
Write-Host "=== Test 4: Get User Bookings ===" -ForegroundColor Yellow
$getBookingsResult = Invoke-ApiCall -Endpoint "/bookings" -RequireAuth

if ($getBookingsResult.success -and $getBookingsResult.data.success) {
    Write-Host "✓ Retrieved bookings" -ForegroundColor Green
    Write-Host "  Total bookings: $($getBookingsResult.data.data.Count)"
    
    if ($global:bookingId) {
        $testBooking = $getBookingsResult.data.data | Where-Object { $_.id -eq $global:bookingId }
        if ($testBooking) {
            Write-Host "  ✓ Test booking found in database"
            Write-Host "    Guests: $($testBooking.guests | ConvertTo-Json -Compress)"
            Write-Host "    Per room guests: $($testBooking.per_room_guests | ConvertTo-Json -Compress)"
        } else {
            Write-Host "  ✗ Test booking not found" -ForegroundColor Red
        }
    }
} else {
    Write-Host "✗ Failed to retrieve bookings" -ForegroundColor Red
}

Write-Host ""

# Test 5: Calendar Data Structure
Write-Host "=== Test 5: Calendar Data Structure ===" -ForegroundColor Yellow
$calCheckIn = "2025-11-28"
$calCheckOut = "2025-12-01"
$calEndpoint = "/bookings/availability/1?checkIn=$calCheckIn" + "`&checkOut=$calCheckOut"
$calResult = Invoke-ApiCall -Endpoint $calEndpoint

if ($calResult.success -and $calResult.data.success) {
    Write-Host "✓ Calendar data retrieved" -ForegroundColor Green
    $dates = $calResult.data.dateAvailability.PSObject.Properties.Name
    if ($dates.Count -gt 0) {
        $sampleDate = $dates[0]
        $sampleData = $calResult.data.dateAvailability.$sampleDate
        
        Write-Host "  Sample date: $sampleDate" -ForegroundColor Cyan
        Write-Host "  Fields: $($sampleData.PSObject.Properties.Name -join ', ')"
        
        if ($sampleData.status) {
            Write-Host "  ✓ Status field: $($sampleData.status)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Status field missing!" -ForegroundColor Red
        }
        
        if ($sampleData.bookedRooms) {
            Write-Host "  ✓ bookedRooms field: $($sampleData.bookedRooms -join ', ')" -ForegroundColor Green
        } else {
            Write-Host "  i bookedRooms field: empty or not present" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "✗ Failed to get calendar data" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host "Check the output above for test results." -ForegroundColor Gray

