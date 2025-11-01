// Admin Dashboard JavaScript

let currentView = 'overview';
let bookings = [];
let stats = {};
let salesChart = null;
let currentPeriod = 'daily';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    loadDashboardData();
    setupInactivityTimer();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopAuditLogsRealTime();
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
        
        if (data.user.role !== 'admin') {
            alert('Access denied. Redirecting to staff dashboard.');
            window.location.href = '/staff-dashboard.html';
            return;
        }
        
        // Display user info
        document.getElementById('userInfo').textContent = `${data.user.full_name} (Admin)`;
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
    
    // Add account button
    document.getElementById('addAccountBtn')?.addEventListener('click', () => {
        document.getElementById('accountModal').style.display = 'block';
    });
    
    // Close account modal
    document.getElementById('closeAccountModal')?.addEventListener('click', () => {
        document.getElementById('accountModal').style.display = 'none';
    });
    
    document.getElementById('cancelAccountBtn')?.addEventListener('click', () => {
        document.getElementById('accountModal').style.display = 'none';
    });
    
    // Account form submit
    document.getElementById('addAccountForm')?.addEventListener('submit', handleAddAccount);
    
    // Booking filter
    document.getElementById('bookingStatusFilter')?.addEventListener('change', (e) => {
        filterBookings(e.target.value);
    });
    
    // Close booking details modal
    document.getElementById('closeBookingDetails')?.addEventListener('click', () => {
        document.getElementById('bookingDetailsModal').style.display = 'none';
    });
    
    document.getElementById('closeDetailsBtn')?.addEventListener('click', () => {
        document.getElementById('bookingDetailsModal').style.display = 'none';
    });
    
    // Chart period buttons
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all buttons
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            e.target.classList.add('active');
            // Update chart
            currentPeriod = e.target.dataset.period;
            updateSalesChart();
        });
    });
}

// Switch view
function switchView(viewName) {
    currentView = viewName;
    
    // Stop real-time updates for previous view
    stopAuditLogsRealTime();
    
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
    if (viewName === 'bookings') {
        renderBookings();
    } else if (viewName === 'rooms') {
        renderRooms();
    } else if (viewName === 'staff') {
        loadStaff();
    } else if (viewName === 'audit') {
        loadAuditLogs();
        startAuditLogsRealTime();
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const [statsRes, bookingsRes] = await Promise.all([
            fetch('/api/dashboard/stats'),
            fetch('/api/bookings')
        ]);
        
        stats = await statsRes.json();
        const bookingsData = await bookingsRes.json();
        bookings = bookingsData.bookings || [];
        
        updateOverview();
        renderBookings();
        initializeSalesChart();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update overview stats
function updateOverview() {
    document.getElementById('totalBookings').textContent = stats.totalBookings || 0;
    document.getElementById('occupancyRate').textContent = `${stats.occupancyRate || 0}%`;
    document.getElementById('dailyRevenue').textContent = stats.dailyRevenue || 0;
    document.getElementById('pendingBookings').textContent = stats.pendingBookings || 0;
    
    // Show recent bookings
    const recentBookings = bookings.slice(0, 5);
    renderRecentBookings(recentBookings);
}

// Render recent bookings
function renderRecentBookings(bookings) {
    const container = document.getElementById('recentBookingsTable');
    if (!container) return;
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Guest</th>
                    <th>Room Type</th>
                    <th>Check-in</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map(b => `
                    <tr>
                        <td>${b.guest_name}</td>
                        <td>${b.room_type}</td>
                        <td>${formatDate(b.check_in)}</td>
                        <td><span class="status-badge status-${b.status}">${b.status}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Render bookings
function renderBookings(filteredBookings = bookings) {
    const tbody = document.getElementById('bookingsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = filteredBookings.map(booking => {
        const guestCount = booking.guest_count || 1;
        const extraCharge = booking.extra_guest_charge || 0;
        const guestDisplay = extraCharge > 0 ? `${guestCount} (+₱${extraCharge})` : guestCount;
        
        return `
            <tr>
                <td>${booking.guest_name}</td>
                <td>${booking.guest_email}<br><small>${booking.guest_phone || 'N/A'}</small></td>
                <td>${booking.room_type}</td>
                <td>${guestDisplay}</td>
                <td>${formatDate(booking.check_in)}</td>
                <td>${formatDate(booking.check_out)}</td>
                <td><span class="status-badge status-${booking.status}">${booking.status}</span></td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="viewBooking('${booking.id}')">View</button>
                    <button class="btn btn-small btn-success" onclick="approveBooking('${booking.id}')">Approve</button>
                    <button class="btn  btn-warning" onclick="editBooking('${booking.id}')" title="Edit Booking">
                        <span style="font-size: 14px;">✏️</span> Edit
                    </button>
                    <button class="btn  btn-danger" onclick="deleteBooking('${booking.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Filter bookings
function filterBookings(status) {
    if (status === 'all') {
        renderBookings(bookings);
    } else {
        const filtered = bookings.filter(b => b.status === status);
        renderBookings(filtered);
    }
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
    
    const bookingTime = formData.get('booking_time');
    
    const bookingData = {
        guest_name: formData.get('guest_name'),
        guest_email: formData.get('guest_email'),
        guest_phone: formData.get('guest_phone'),
        adults: adults,
        kids: kids,
        visit_time: visitTime,
        cottage: cottage || null,
        entrance_fee: entranceFee,
        booking_time: bookingTime,
        cottage_fee: cottageFee,
        guest_count: guestCount,
        room_type: formData.get('room_type'),
        check_in: formData.get('check_in'),
        check_out: formData.get('check_out'),
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

// Approve booking
async function approveBooking(bookingId) {
    try {
        const response = await fetch(`/api/bookings/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'confirmed' })
        });
        
        if (response.ok) {
            loadDashboardData();
        }
    } catch (error) {
        console.error('Error approving booking:', error);
    }
}

// Delete booking
async function deleteBooking(bookingId) {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    
    try {
        const response = await fetch(`/api/bookings/${bookingId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadDashboardData();
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
    }
}

// View booking details
function viewBooking(bookingId) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    const guestCount = booking.guest_count || 1;
    const extraCharge = booking.extra_guest_charge || 0;
    const guestDisplay = extraCharge > 0 ? `${guestCount} guests (Extra charge: ₱${extraCharge})` : `${guestCount} guest${guestCount > 1 ? 's' : ''}`;
    
    const adults = booking.adults || 0;
    const kids = booking.kids || 0;
    const entranceFee = booking.entrance_fee || 0;
    const cottageFee = booking.cottage_fee || 0;
    const cottage = booking.cottage || null;
    const visitTime = booking.visit_time || null;
    const bookingTime = booking.booking_time || null;
    
    let totalCost = entranceFee + cottageFee;
    if (booking.extra_guest_charge) totalCost += booking.extra_guest_charge;
    
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
            <p>Total Guests: ${guestDisplay}</p>
            ${adults > 0 || kids > 0 ? `<p>Breakdown: ${adults} Adult(s), ${kids} Kid(s)</p>` : ''}
            ${visitTime ? `<p>Visit Time: ${visitTime.charAt(0).toUpperCase() + visitTime.slice(1)}</p>` : ''}
            <p>Check-in: ${formatDate(booking.check_in)}</p>
            <p>Check-out: ${formatDate(booking.check_out)}</p>
            ${bookingTime ? `<p>Booking Time: ${bookingTime}</p>` : ''}
            ${cottage ? `<p>Cottage: ${cottage.charAt(0).toUpperCase() + cottage.slice(1)} - ₱${cottageFee}</p>` : ''}
            <p>Status: <span class="status-badge status-${booking.status}">${booking.status}</span></p>
        </div>
        ${entranceFee > 0 || cottageFee > 0 || booking.extra_guest_charge ? `
        <div class="details-group">
            <strong>Cost Breakdown:</strong>
            ${entranceFee > 0 ? `<p>Entrance Fee: ₱${entranceFee}</p>` : ''}
            ${cottageFee > 0 ? `<p>Cottage Fee: ₱${cottageFee}</p>` : ''}
            ${booking.extra_guest_charge ? `<p>Extra Guest Charge: ₱${booking.extra_guest_charge}</p>` : ''}
            <p><strong>Total: ₱${totalCost.toFixed(2)}</strong></p>
        </div>
        ` : ''}
    `;
    
    document.getElementById('bookingDetailsModal').style.display = 'block';
}

// Render rooms
function renderRooms() {
    // Get confirmed bookings to check room availability
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 4 Standard rooms only
    const rooms = [
        { id: 'std-1', name: 'Standard Room 1', available: true },
        { id: 'std-2', name: 'Standard Room 2', available: true },
        { id: 'std-3', name: 'Standard Room 3', available: true },
        { id: 'std-4', name: 'Standard Room 4', available: true }
    ];
    
    // Count how many standard rooms are occupied today
    let occupiedCount = 0;
    confirmedBookings.forEach(booking => {
        if (booking.room_type === 'standard') {
            const checkIn = new Date(booking.check_in);
            const checkOut = new Date(booking.check_out);
            checkIn.setHours(0, 0, 0, 0);
            checkOut.setHours(0, 0, 0, 0);
            
            // Check if today falls within the booking dates
            if (today >= checkIn && today < checkOut) {
                occupiedCount++;
            }
        }
    });
    
    // Mark first N rooms as occupied based on occupiedCount
    for (let i = 0; i < Math.min(occupiedCount, rooms.length); i++) {
        rooms[i].available = false;
    }
    
    const container = document.getElementById('standard-rooms');
    if (container) {
        container.innerHTML = rooms.map(room => `
            <div class="room-item ${room.available ? 'available' : 'occupied'}">
                <img src="/assets/room.JPG" alt="${room.name}" class="room-image">
                <div class="room-info-wrapper">
                    <div class="room-info">
                        <strong>${room.name}</strong>
                        <span>${room.available ? 'Available' : 'Occupied'}</span>
                    </div>
                    <div class="room-status-indicator ${room.available ? 'available' : 'occupied'}"></div>
                </div>
                <div class="room-amenities">
                    <div class="amenity-item">
                        <span class="amenity-icon">🛏️</span>
                        <span>2 Beds</span>
                    </div>
                    <div class="amenity-item">
                        <span class="amenity-icon">👥</span>
                        <span>4 Capacity</span>
                    </div>
                    <div class="amenity-item">
                        <span class="amenity-icon">🚿</span>
                        <span>1 Restroom</span>
                    </div>
                </div>
                <div class="room-price">₱650 per night</div>
            </div>
        `).join('');
    }
}

// Load staff data
async function loadStaff() {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading staff...</td></tr>';
    
    try {
        const response = await fetch('/api/users');
        const data = await response.json();
        const users = data.users || [];
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No staff members found. Register staff accounts to see them here.</td></tr>';
            return;
        }
        
        // Get current user ID to prevent self-deletion
        let currentUserId = null;
        try {
            const userResponse = await fetch('/api/me');
            const userData = await userResponse.json();
            if (userData.user) currentUserId = userData.user.id;
        } catch (e) {}
        
        // Count active admins
        const activeAdmins = users.filter(u => u.role === 'admin' && u.is_active).length;
        
        tbody.innerHTML = users.map(user => {
            const canDelete = (user.id !== currentUserId) && 
                             (user.role !== 'admin' || activeAdmins > 1);
            
            return `
                <tr>
                    <td>${user.full_name}</td>
                    <td>${user.email}</td>
                    <td><span class="status-badge ${user.role === 'admin' ? 'status-confirmed' : ''}">${user.role}</span></td>
                    <td><span class="status-badge ${user.is_active ? 'status-confirmed' : 'status-cancelled'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>${user.last_login ? formatDate(user.last_login) : 'Never'}</td>
                    <td>
                        ${canDelete ? `
                            <button class="btn btn-small btn-danger" onclick="deleteAccount('${user.id}', '${user.full_name.replace(/'/g, "\\'")}')">Delete</button>
                        ` : '<small style="color: #999;">Protected</small>'}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading staff:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Error loading staff data</td></tr>';
    }
}

// Load audit logs
async function loadAuditLogs() {
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading audit logs...</td></tr>';
    
    try {
        const response = await fetch('/api/audit-logs');
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const logs = data.logs || [];
        
        console.log('Audit logs loaded:', logs.length);
        
        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">No audit logs found. Logs will appear here as actions are performed.</td></tr>';
            return;
        }
        
        tbody.innerHTML = logs.map(log => {
            // Extract role from new_values if available, otherwise use action details
            const role = log.new_values?.role || (log.action.includes('admin') ? 'admin' : 'staff');
            const details = log.new_values?.details || log.action;
            
            return `
                <tr>
                    <td>${formatDateTime(log.created_at)}</td>
                    <td>${log.user?.full_name || 'System'}</td>
                    <td><span class="status-badge ${role === 'admin' ? 'status-confirmed' : ''}">${role}</span></td>
                    <td>${log.action}</td>
                    <td>${details}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading audit logs:', error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px;">Error loading audit logs: ${error.message}</td></tr>`;
    }
}

// Real-time audit logs refresh
let auditLogsInterval;

function startAuditLogsRealTime() {
    // Clear any existing interval
    if (auditLogsInterval) {
        clearInterval(auditLogsInterval);
    }
    
    // Refresh audit logs every 5 seconds
    auditLogsInterval = setInterval(() => {
        if (currentView === 'audit') {
            loadAuditLogs();
        }
    }, 5000);
}

function stopAuditLogsRealTime() {
    if (auditLogsInterval) {
        clearInterval(auditLogsInterval);
        auditLogsInterval = null;
    }
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

// Handle add account
async function handleAddAccount(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    const errorDiv = document.getElementById('accountErrorMessage');
    const successDiv = document.getElementById('accountSuccessMessage');
    
    errorDiv.textContent = '';
    successDiv.textContent = '';
    
    // Validate passwords match
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        return;
    }
    
    // Validate password strength
    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        return;
    }
    
    const accountData = {
        email: formData.get('email'),
        password: password,
        full_name: formData.get('full_name'),
        role: formData.get('role')
    };
    
    try {
        const response = await fetch('/api/users/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(accountData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            errorDiv.textContent = data.error || 'Failed to create account';
            return;
        }
        
        successDiv.textContent = 'Account created successfully!';
        
        // Clear form and reload staff list
        document.getElementById('addAccountForm').reset();
        setTimeout(() => {
            document.getElementById('accountModal').style.display = 'none';
            loadStaff();
        }, 1500);
    } catch (error) {
        console.error('Error creating account:', error);
        errorDiv.textContent = 'An error occurred';
    }
}

// Delete account
async function deleteAccount(userId, userName) {
    if (!confirm(`Are you sure you want to delete account for ${userName}? This action cannot be undone.`)) return;
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const data = await response.json();
            alert(data.error || 'Failed to delete account');
            return;
        }
        
        alert('Account deleted successfully');
        loadStaff();
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account');
    }
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const eyeIcon = button.querySelector('.eye-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        // Eye closed/off icon
        eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    } else {
        input.type = 'password';
        // Eye open icon
        eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Initialize sales chart
function initializeSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Revenue (₱)',
                data: [],
                borderColor: '#4e8fff',
                backgroundColor: 'rgba(78, 143, 255, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₱' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
    
    updateSalesChart();
}

// Update sales chart based on period
function updateSalesChart() {
    if (!salesChart) return;
    
    const data = getSalesData(currentPeriod);
    salesChart.data.labels = data.labels;
    salesChart.data.datasets[0].data = data.revenue;
    salesChart.update();
}

// Get sales data for different periods
function getSalesData(period) {
    // Pricing for different room types
    const roomPrices = {
        'standard': 1500,
        'deluxe': 2500,
        'suite': 4000
    };
    
    // Get confirmed bookings only
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    
    let labels = [];
    let revenue = [];
    
    if (period === 'daily') {
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            // Get bookings that were checked in on this date
            const dayBookings = confirmedBookings.filter(b => b.check_in === dateStr);
            const dayRevenue = dayBookings.reduce((sum, b) => {
                const price = roomPrices[b.room_type] || 0;
                const nights = Math.ceil((new Date(b.check_out) - new Date(b.check_in)) / (1000 * 60 * 60 * 24));
                const extraCharge = b.extra_guest_charge || 0;
                const entranceFee = b.entrance_fee || 0;
                const cottageFee = b.cottage_fee || 0;
                return sum + (price * nights) + extraCharge + entranceFee + cottageFee;
            }, 0);
            
            labels.push(dateLabel);
            revenue.push(dayRevenue);
        }
    } else if (period === 'weekly') {
        // Last 7 weeks
        for (let i = 6; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const weekBookings = confirmedBookings.filter(b => {
                const checkIn = new Date(b.check_in);
                return checkIn >= weekStart && checkIn <= weekEnd;
            });
            
            const weekRevenue = weekBookings.reduce((sum, b) => {
                const price = roomPrices[b.room_type] || 0;
                const nights = Math.ceil((new Date(b.check_out) - new Date(b.check_in)) / (1000 * 60 * 60 * 24));
                const extraCharge = b.extra_guest_charge || 0;
                const entranceFee = b.entrance_fee || 0;
                const cottageFee = b.cottage_fee || 0;
                return sum + (price * nights) + extraCharge + entranceFee + cottageFee;
            }, 0);
            
            labels.push(`Week ${7-i}`);
            revenue.push(weekRevenue);
        }
    } else if (period === 'monthly') {
        // Last 7 months
        for (let i = 6; i >= 0; i--) {
            const month = new Date();
            month.setMonth(month.getMonth() - i);
            const monthLabel = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            
            const monthBookings = confirmedBookings.filter(b => {
                const checkIn = new Date(b.check_in);
                return checkIn.getMonth() === month.getMonth() && 
                       checkIn.getFullYear() === month.getFullYear();
            });
            
            const monthRevenue = monthBookings.reduce((sum, b) => {
                const price = roomPrices[b.room_type] || 0;
                const nights = Math.ceil((new Date(b.check_out) - new Date(b.check_in)) / (1000 * 60 * 60 * 24));
                const extraCharge = b.extra_guest_charge || 0;
                const entranceFee = b.entrance_fee || 0;
                const cottageFee = b.cottage_fee || 0;
                return sum + (price * nights) + extraCharge + entranceFee + cottageFee;
            }, 0);
            
            labels.push(monthLabel);
            revenue.push(monthRevenue);
        }
    }
    
    return { labels, revenue };
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
