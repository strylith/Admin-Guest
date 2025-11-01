// Staff Dashboard JavaScript

let bookings = [];
let currentView = 'assignments';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    loadDashboardData();
    setupInactivityTimer();
});

// Show logout confirmation dialog
function showLogoutConfirmation() {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        // Create confirmation box
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            width: 90%;
            text-align: center;
        `;
        
        modal.innerHTML = `
            <h2 style="margin: 0 0 15px 0; color: #333;">Confirm Logout</h2>
            <p style="margin: 0 0 25px 0; color: #666;">Are you sure you want to log out?</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="confirmLogoutYes" style="
                    padding: 10px 30px;
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                ">Yes, Logout</button>
                <button id="confirmLogoutNo" style="
                    padding: 10px 30px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                ">Cancel</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Handle Yes button
        document.getElementById('confirmLogoutYes').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(true);
        });
        
        // Handle No button
        document.getElementById('confirmLogoutNo').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(false);
        });
        
        // Handle Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEscape);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Handle click outside modal
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEscape);
                resolve(false);
            }
        });
    });
}

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/me');
        const data = await response.json();
        
        if (!data.user) {
            window.location.href = '/login.html';
            return;
        }
        
        // Display user info
        document.getElementById('userInfo').textContent = `${data.user.full_name} (Staff)`;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login.html';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.target.dataset.view;
            switchView(view);
        });
    });
    
    // Logout with confirmation
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        const confirmed = await showLogoutConfirmation();
        if (confirmed) {
            try {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/login.html';
            } catch (error) {
                console.error('Logout error:', error);
                alert('An error occurred during logout. Please try again.');
            }
        }
    });
    
    // Search
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        searchBookings(e.target.value);
    });
    
    // Close modal
    document.querySelector('#bookingDetailsModal .close')?.addEventListener('click', () => {
        document.getElementById('bookingDetailsModal').style.display = 'none';
    });
    document.getElementById('closeDetailsBtn')?.addEventListener('click', () => {
        document.getElementById('bookingDetailsModal').style.display = 'none';
    });
    
    // Add booking button
    document.getElementById('addBookingBtn')?.addEventListener('click', () => {
        // Reset form to create mode
        const form = document.getElementById('addBookingForm');
        const modal = document.getElementById('bookingModal');
        const title = modal.querySelector('h3');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        form.reset();
        delete form.dataset.bookingId;
        title.textContent = 'Add New Booking';
        submitBtn.textContent = 'Create Booking';
        
        document.getElementById('bookingModal').style.display = 'block';
    });
    
    // Close booking modal
    document.querySelector('#bookingModal .close')?.addEventListener('click', () => {
        document.getElementById('bookingModal').style.display = 'none';
    });
    
    document.getElementById('cancelBookingBtn')?.addEventListener('click', () => {
        document.getElementById('bookingModal').style.display = 'none';
    });
    
    // Booking form submit
    document.getElementById('addBookingForm')?.addEventListener('submit', handleAddBooking);
    
    // Update available rooms when dates change
    document.getElementById('checkInInput')?.addEventListener('change', updateAvailableRooms);
    document.getElementById('checkOutInput')?.addEventListener('change', updateAvailableRooms);
}

// Switch view
function switchView(viewName) {
    currentView = viewName;
    
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
    
    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`${viewName}-view`).classList.add('active');
    
    // Load view-specific data
    if (viewName === 'assignments') {
        renderAssignments();
    } else if (viewName === 'today') {
        renderTodaysSchedule();
    } else if (viewName === 'checkins') {
        renderCheckIns();
    } else if (viewName === 'checkouts') {
        renderCheckOuts();
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load all bookings for availability checking and full display
        const allBookingsResponse = await fetch('/api/bookings');
        const allBookingsData = await allBookingsResponse.json();
        bookings = allBookingsData.bookings || [];
        
        // Also get staff-specific data for today's schedule
        const staffResponse = await fetch('/api/dashboard/staff');
        const staffData = await staffResponse.json();
        
        renderAssignments();
        renderTodaysSchedule();
        renderCheckIns();
        renderCheckOuts();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Render assignments
function renderAssignments(bookingsToRender = null) {
    const tbody = document.getElementById('assignmentsTableBody');
    const pendingCount = document.getElementById('pendingCount');
    const confirmedCount = document.getElementById('confirmedCount');
    
    if (!tbody) return;
    
    // Use provided bookings or all bookings
    const displayBookings = bookingsToRender || bookings;
    
    // Count pending and confirmed from ALL bookings (not filtered)
    const pendingBookings = bookings.filter(b => b.status === 'pending');
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    
    pendingCount.textContent = pendingBookings.length;
    confirmedCount.textContent = confirmedBookings.length;
    
    tbody.innerHTML = displayBookings.map(booking => `
        <tr>
            <td>${booking.guest_name}</td>
            <td>${booking.guest_email}<br><small>${booking.guest_phone || 'N/A'}</small></td>
            <td>${booking.room_type}</td>
            <td>${formatDate(booking.check_in)}</td>
            <td>${formatDate(booking.check_out)}</td>
            <td><span class="status-badge status-${booking.status}">${booking.status}</span></td>
            <td>
                <button class="btn btn-small btn-secondary" onclick="viewBookingDetails('${booking.id}')">View</button>
                ${booking.status === 'pending' ? `
                    <button class="btn btn-small btn-success" onclick="confirmBooking('${booking.id}')">Confirm</button>
                ` : ''}
                <button class="btn btn-small btn-warning" onclick="editBooking('${booking.id}')" title="Edit Booking">
                    <span style="font-size: 14px;"></span> Edit
                </button>
            </td>
        </tr>
    `).join('');
}

// Render today's schedule
function renderTodaysSchedule() {
    const today = new Date().toISOString().split('T')[0];
    
    const todayCheckIns = bookings.filter(b => b.check_in === today);
    const todayCheckOuts = bookings.filter(b => b.check_out === today);
    
    document.getElementById('todayCheckIns').innerHTML = todayCheckIns.map(booking => `
        <div class="schedule-item">
            <strong>${booking.guest_name}</strong>
            <span>${booking.room_type}</span>
            <button class="btn btn-small btn-secondary" onclick="viewBookingDetails('${booking.id}')">Details</button>
        </div>
    `).join('') || '<p>No check-ins today</p>';
    
    document.getElementById('todayCheckOuts').innerHTML = todayCheckOuts.map(booking => `
        <div class="schedule-item">
            <strong>${booking.guest_name}</strong>
            <span>${booking.room_type}</span>
            <button class="btn btn-small btn-secondary" onclick="viewBookingDetails('${booking.id}')">Details</button>
        </div>
    `).join('') || '<p>No check-outs today</p>';
}

// Render check-ins
function renderCheckIns() {
    const tbody = document.getElementById('checkInsTableBody');
    if (!tbody) return;
    
    const today = new Date();
    const upcomingCheckIns = bookings.filter(b => new Date(b.check_in) >= today);
    
    tbody.innerHTML = upcomingCheckIns.map(booking => `
        <tr>
            <td>${booking.guest_name}</td>
            <td>${booking.room_type}</td>
            <td>${formatDate(booking.check_in)}</td>
            <td>${booking.guest_email}</td>
            <td><span class="status-badge status-${booking.status}">${booking.status}</span></td>
            <td>
                <button class="btn btn-small btn-secondary" onclick="viewBookingDetails('${booking.id}')">View</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6" style="text-align: center;">No upcoming check-ins</td></tr>';
}

// Render check-outs
function renderCheckOuts() {
    const tbody = document.getElementById('checkOutsTableBody');
    if (!tbody) return;
    
    const today = new Date();
    const upcomingCheckOuts = bookings.filter(b => new Date(b.check_out) >= today);
    
    tbody.innerHTML = upcomingCheckOuts.map(booking => `
        <tr>
            <td>${booking.guest_name}</td>
            <td>${booking.room_type}</td>
            <td>${formatDate(booking.check_out)}</td>
            <td>${booking.guest_email}</td>
            <td><span class="status-badge status-${booking.status}">${booking.status}</span></td>
            <td>
                <button class="btn btn-small btn-secondary" onclick="viewBookingDetails('${booking.id}')">View</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6" style="text-align: center;">No upcoming check-outs</td></tr>';
}

// View booking details
function viewBookingDetails(bookingId) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    document.getElementById('bookingDetailsContent').innerHTML = `
        <div class="details-group">
            <strong>Guest Information:</strong>
            <p>Name: ${booking.guest_name}</p>
            <p>Email: ${booking.guest_email}</p>
            <p>Phone: ${booking.guest_phone || 'N/A'}</p>
        </div>
        <div class="details-group">
            <strong>Booking Information:</strong>
            <p>Room Type: ${booking.room_type}</p>
            <p>Check-in: ${formatDate(booking.check_in)}</p>
            <p>Check-out: ${formatDate(booking.check_out)}</p>
            ${booking.booking_time ? `<p>Booking Time: ${booking.booking_time}</p>` : ''}
            <p>Status: ${booking.status}</p>
        </div>
    `;
    
    document.getElementById('bookingDetailsModal').style.display = 'block';
    document.getElementById('confirmBookingBtn').onclick = () => confirmBooking(bookingId);
}

// Confirm booking
async function confirmBooking(bookingId) {
    try {
        const response = await fetch(`/api/bookings/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'confirmed' })
        });
        
        if (response.ok) {
            alert('Booking confirmed successfully!');
            document.getElementById('bookingDetailsModal').style.display = 'none';
            loadDashboardData();
        }
    } catch (error) {
        console.error('Error confirming booking:', error);
        alert('Failed to confirm booking');
    }
}

// Search bookings
function searchBookings(query) {
    // If search is empty, show all bookings
    if (!query || query.trim() === '') {
        renderAssignments();
        return;
    }
    
    const searchLower = query.toLowerCase();
    const filteredBookings = bookings.filter(booking => 
        booking.guest_name.toLowerCase().includes(searchLower) ||
        booking.guest_email.toLowerCase().includes(searchLower) ||
        booking.room_type.toLowerCase().includes(searchLower) ||
        booking.status.toLowerCase().includes(searchLower)
    );
    
    renderAssignments(filteredBookings);
}

// Setup inactivity timer
let inactivityTimer;
function setupInactivityTimer() {
    const inactivityPeriod = 30 * 60 * 1000; // 30 minutes
    
    function resetTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            alert('Session expired due to inactivity. Please login again.');
            fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login.html';
        }, inactivityPeriod);
    }
    
    // Reset timer on user activity
    ['mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetTimer, true);
    });
    
    resetTimer();
}

// Update available rooms based on selected dates
function updateAvailableRooms() {
    const checkInInput = document.getElementById('checkInInput');
    const checkOutInput = document.getElementById('checkOutInput');
    const roomTypeSelect = document.getElementById('roomTypeSelect');
    
    if (!checkInInput || !checkOutInput || !roomTypeSelect) return;
    
    const checkIn = checkInInput.value;
    const checkOut = checkOutInput.value;
    
    if (!checkIn || !checkOut) {
        return;
    }
    
    // Get confirmed bookings that overlap with the selected dates
    const conflictingBookings = bookings.filter(b => {
        if (b.status !== 'confirmed') return false;
        
        const bookingCheckIn = new Date(b.check_in);
        const bookingCheckOut = new Date(b.check_out);
        const selectedCheckIn = new Date(checkIn);
        const selectedCheckOut = new Date(checkOut);
        
        // Check for overlap: booking overlaps if new check_in < existing check_out AND new check_out > existing check_in
        return bookingCheckIn < selectedCheckOut && bookingCheckOut > selectedCheckIn;
    });
    
    // Count occupied rooms by type
    const occupiedRooms = {};
    conflictingBookings.forEach(booking => {
        const roomType = booking.room_type;
        occupiedRooms[roomType] = (occupiedRooms[roomType] || 0) + 1;
    });
    
    // Total rooms available by type (only Standard rooms exist)
    const totalRooms = {
        'standard': 4
    };
    
    // Populate room select with availability info
    const availableRooms = [];
    
    // Standard rooms
    const standardOccupied = occupiedRooms['standard'] || 0;
    const standardAvailable = totalRooms['standard'] - standardOccupied;
    
    if (standardAvailable > 0) {
        availableRooms.push(`<option value="standard">Standard (${standardAvailable} available)</option>`);
    } else {
        availableRooms.push(`<option value="standard" disabled>Standard (Fully Booked)</option>`);
    }
    
    // Update select
    const currentValue = roomTypeSelect.value;
    roomTypeSelect.innerHTML = '<option value="">Select Room Type</option>' + availableRooms.join('');
    
    // Restore previous selection if still available
    if (currentValue && roomTypeSelect.querySelector(`option[value="${currentValue}"]`)) {
        roomTypeSelect.value = currentValue;
    }
}

// Edit booking
async function editBooking(bookingId) {
    try {
        const response = await fetch(`/api/bookings/${bookingId}`);
        if (!response.ok) {
            alert('Failed to load booking details');
            return;
        }
        
        const data = await response.json();
        const booking = data.booking;
        
        // Populate form with booking data
        document.querySelector('input[name="guest_name"]').value = booking.guest_name || '';
        document.querySelector('input[name="guest_email"]').value = booking.guest_email || '';
        document.querySelector('input[name="guest_phone"]').value = booking.guest_phone || '';
        document.querySelector('input[name="adults"]').value = booking.adults || 0;
        document.querySelector('input[name="kids"]').value = booking.kids || 0;
        document.querySelector('select[name="visit_time"]').value = booking.visit_time || '';
        document.querySelector('select[name="room_type"]').value = booking.room_type || '';
        document.querySelector('select[name="cottage"]').value = booking.cottage || '';
        document.querySelector('input[name="check_in"]').value = booking.check_in ? booking.check_in.split('T')[0] : '';
        document.querySelector('input[name="check_out"]').value = booking.check_out ? booking.check_out.split('T')[0] : '';
        document.querySelector('input[name="booking_time"]').value = booking.booking_time || '';
        document.querySelector('select[name="status"]').value = booking.status || 'pending';
        
        // Update modal title and form
        const modal = document.getElementById('bookingModal');
        const form = document.getElementById('addBookingForm');
        const title = modal.querySelector('h3');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        title.textContent = 'Edit Booking';
        submitBtn.textContent = 'Update Booking';
        
        // Store booking ID for update
        form.dataset.bookingId = bookingId;
        
        // Update available rooms
        updateAvailableRooms();
        
        // Show modal
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading booking:', error);
        alert('Failed to load booking details');
    }
}

// Handle add booking
async function handleAddBooking(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const adults = parseInt(formData.get('adults')) || 0;
    const kids = parseInt(formData.get('kids')) || 0;
    const visitTime = formData.get('visit_time');
    const cottage = formData.get('cottage');
    
    // Calculate entrance fees
    const adultPrice = visitTime === 'morning' ? 70 : visitTime === 'night' ? 120 : 0;
    const kidPrice = visitTime === 'morning' ? 60 : visitTime === 'night' ? 100 : 0;
    const entranceFee = (adults * adultPrice) + (kids * kidPrice);
    
    // Calculate cottage fee
    const cottagePrices = {
        'tropahan': 300,
        'barkads': 400,
        'family': 500
    };
    const cottageFee = cottage ? (cottagePrices[cottage] || 0) : 0;
    
    // Calculate total guest count (adults + kids)
    const guestCount = adults + kids;
    
    const bookingData = {
        guest_name: formData.get('guest_name'),
        guest_email: formData.get('guest_email'),
        guest_phone: formData.get('guest_phone'),
        adults: adults,
        kids: kids,
        visit_time: visitTime,
        cottage: cottage || null,
        entrance_fee: entranceFee,
        cottage_fee: cottageFee,
        guest_count: guestCount,
        room_type: formData.get('room_type'),
        check_in: formData.get('check_in'),
        check_out: formData.get('check_out'),
        booking_time: formData.get('booking_time'),
        status: formData.get('status')
    };
    
    try {
        const bookingId = e.target.dataset.bookingId;
        const url = bookingId ? `/api/bookings/${bookingId}` : '/api/bookings';
        const method = bookingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            alert(error.error || `Failed to ${bookingId ? 'update' : 'create'} booking`);
            return;
        }
        
        // Reset form and modal
        document.getElementById('bookingModal').style.display = 'none';
        const form = document.getElementById('addBookingForm');
        form.reset();
        delete form.dataset.bookingId;
        
        // Reset modal title and button
        const modal = document.getElementById('bookingModal');
        const title = modal.querySelector('h3');
        const submitBtn = form.querySelector('button[type="submit"]');
        title.textContent = 'Add New Booking';
        submitBtn.textContent = 'Create Booking';
        
        loadDashboardData();
        alert(`Booking ${bookingId ? 'updated' : 'created'} successfully!`);
    } catch (error) {
        console.error(`Error ${e.target.dataset.bookingId ? 'updating' : 'creating'} booking:`, error);
        alert('An error occurred');
    }
}

// Set date inputs to today's date
window.addEventListener('load', () => {
    const today = new Date().toISOString().split('T')[0];
    const checkInInput = document.querySelector('input[name="check_in"]');
    if (checkInInput) {
        checkInInput.min = today;
    }
    const checkOutInput = document.querySelector('input[name="check_out"]');
    if (checkOutInput) {
        checkOutInput.min = today;
    }
});

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}
