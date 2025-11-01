// Test Script for Booking Flow
// Run this with: node test-booking-flow.js

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

// Test user credentials (from dev accounts)
const TEST_USER = {
  email: 'john@example.com',
  password: 'password123'
};

let authToken = null;
let bookingId = null;

// Helper function to make authenticated requests
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  return await response.json();
}

// Test 1: Login as test user
async function testLogin() {
  console.log('\n=== Test 1: Login ===');
  const result = await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password
    })
  });
  
  if (result.success) {
    authToken = result.token;
    console.log('✓ Login successful');
    console.log('  User:', result.user.firstName, result.user.lastName);
    console.log('  Token:', authToken.substring(0, 20) + '...');
    return true;
  } else {
    console.error('✗ Login failed:', result.error);
    return false;
  }
}

// Test 2: Create a test booking
async function testCreateBooking() {
  console.log('\n=== Test 2: Create Booking ===');
  
  const bookingData = {
    packageId: 1, // Standard Room
    checkIn: '2025-11-28',
    checkOut: '2025-12-01',
    guests: {
      adults: 2,
      children: 0
    },
    totalCost: 63600,
    paymentMode: 'bank-transfer',
    perRoomGuests: [
      {
        roomId: 'Room A1',
        guestName: 'John Doe',
        adults: 2,
        children: 0
      }
    ],
    contactNumber: '09260748398',
    specialRequests: '',
    selectedCottages: []
  };
  
  console.log('Creating booking with data:', JSON.stringify(bookingData, null, 2));
  
  const result = await apiCall('/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData)
  });
  
  if (result.success) {
    bookingId = result.data.id;
    console.log('✓ Booking created successfully');
    console.log('  Booking ID:', bookingId);
    console.log('  Dates:', result.data.check_in, 'to', result.data.check_out);
    console.log('  Total Cost: ₱' + result.data.total_cost);
    return true;
  } else {
    console.error('✗ Booking creation failed:', result.error);
    return false;
  }
}

// Test 3: Check availability
async function testAvailability() {
  console.log('\n=== Test 3: Check Availability ===');
  
  const checkIn = '2025-11-01';
  const checkOut = '2025-11-30';
  
  const result = await apiCall(`/bookings/availability/1?checkIn=${checkIn}&checkOut=${checkOut}`);
  
  if (result.success) {
    console.log('✓ Availability check successful');
    console.log('  Total dates checked:', result.totalDates);
    console.log('  Fully booked dates:', result.bookedDatesCount);
    
    // Show first few dates with availability
    const dates = Object.keys(result.dateAvailability).slice(0, 5);
    console.log('\n  Sample dates:');
    dates.forEach(date => {
      const avail = result.dateAvailability[date];
      console.log(`    ${date}:`, {
        status: avail.status,
        bookedRooms: avail.bookedRooms || [],
        availableRooms: avail.availableRooms || []
      });
    });
    return true;
  } else {
    console.error('✗ Availability check failed:', result.error);
    return false;
  }
}

// Test 4: Verify booking in database
async function testGetBookings() {
  console.log('\n=== Test 4: Get User Bookings ===');
  
  const result = await apiCall('/bookings');
  
  if (result.success && result.data.length > 0) {
    console.log('✓ Retrieved bookings');
    console.log('  Total bookings:', result.data.length);
    
    // Find our test booking
    const testBooking = result.data.find(b => b.id === bookingId);
    if (testBooking) {
      console.log('  Test booking found:', testBooking.id);
      console.log('    Dates:', testBooking.check_in, 'to', testBooking.check_out);
      console.log('    Guests:', testBooking.guests);
      console.log('    Per room guests:', testBooking.per_room_guests);
      return true;
    } else {
      console.error('✗ Test booking not found in results');
      return false;
    }
  } else {
    console.error('✗ Failed to retrieve bookings');
    return false;
  }
}

// Test 5: Check calendar data structure
async function testCalendarData() {
  console.log('\n=== Test 5: Calendar Data Structure ===');
  
  const checkIn = '2025-11-28';
  const checkOut = '2025-12-01';
  
  const result = await apiCall(`/bookings/availability/1?checkIn=${checkIn}&checkOut=${checkOut}`);
  
  if (result.success) {
    console.log('✓ Calendar data structure:');
    
    // Check the structure of dateAvailability
    const dates = Object.keys(result.dateAvailability);
    if (dates.length > 0) {
      const sampleDate = dates[0];
      const sampleData = result.dateAvailability[sampleDate];
      
      console.log('  Sample date structure:', sampleDate);
      console.log('  Fields:', Object.keys(sampleData));
      
      // Check if status field exists
      if (sampleData.status) {
        console.log('  ✓ Status field present:', sampleData.status);
      } else {
        console.error('  ✗ Status field missing!');
      }
      
      // Check if bookedRooms field exists
      if (sampleData.bookedRooms !== undefined) {
        console.log('  ✓ bookedRooms field present:', sampleData.bookedRooms);
      } else {
        console.error('  ✗ bookedRooms field missing!');
      }
      
      return true;
    } else {
      console.error('✗ No date data returned');
      return false;
    }
  } else {
    console.error('✗ Failed to get calendar data:', result.error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting Booking Flow Tests...\n');
  
  const results = {
    login: await testLogin(),
    createBooking: false,
    availability: false,
    getBookings: false,
    calendarData: false
  };
  
  if (results.login) {
    results.createBooking = await testCreateBooking();
    results.availability = await testAvailability();
    results.getBookings = await testGetBookings();
    results.calendarData = await testCalendarData();
  }
  
  console.log('\n=== Test Summary ===');
  console.log('Login:', results.login ? '✓ PASS' : '✗ FAIL');
  console.log('Create Booking:', results.createBooking ? '✓ PASS' : '✗ FAIL');
  console.log('Check Availability:', results.availability ? '✓ PASS' : '✗ FAIL');
  console.log('Get Bookings:', results.getBookings ? '✓ PASS' : '✗ FAIL');
  console.log('Calendar Data:', results.calendarData ? '✓ PASS' : '✗ FAIL');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  console.log(`\n${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});













