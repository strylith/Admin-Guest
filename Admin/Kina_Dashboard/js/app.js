// Kina Resort Admin Dashboard - Main Application Logic

class KinaResortDashboard {
    constructor() {
        this.currentView = 'bookings';
        this.currentDate = new Date();
        this.bookings = this.loadBookings();
        this.rooms = this.loadRooms();
        this.currentTheme = this.loadTheme();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeData();
        this.applyTheme();
        this.renderCurrentView();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Calendar navigation
        document.getElementById('prev-month')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('next-month')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });

        // Booking form
        document.getElementById('add-booking-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddBooking(e);
        });

        // Status filter
        document.getElementById('status-filter')?.addEventListener('change', (e) => {
            this.filterBookings(e.target.value);
        });

        // Modal
        document.querySelector('.close')?.addEventListener('click', () => {
            this.closeModal();
        });

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('booking-modal');
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Theme toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });
    }

    initializeData() {
        // Initialize sample rooms if none exist
        if (this.rooms.length === 0) {
            this.rooms = [
                { id: 'std-1', type: 'standard', name: 'Standard Room 1', isAvailable: true, status: 'available' },
                { id: 'std-2', type: 'standard', name: 'Standard Room 2', isAvailable: true, status: 'available' },
                { id: 'std-3', type: 'standard', name: 'Standard Room 3', isAvailable: true, status: 'available' },
                { id: 'del-1', type: 'deluxe', name: 'Deluxe Room 1', isAvailable: true, status: 'available' },
                { id: 'del-2', type: 'deluxe', name: 'Deluxe Room 2', isAvailable: true, status: 'available' },
                { id: 'suite-1', type: 'suite', name: 'Suite 1', isAvailable: true, status: 'available' },
                { id: 'suite-2', type: 'suite', name: 'Suite 2', isAvailable: true, status: 'available' }
            ];
            this.saveRooms();
        }

        // Initialize sample bookings if none exist
        if (this.bookings.length === 0) {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);

            this.bookings = [
                {
                    id: 'booking-1',
                    guestName: 'John Smith',
                    roomType: 'standard',
                    checkIn: today.toISOString().split('T')[0],
                    checkOut: tomorrow.toISOString().split('T')[0],
                    status: 'confirmed',
                    isSuspicious: false,
                    contactInfo: 'john@email.com',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'booking-2',
                    guestName: 'Jane Doe',
                    roomType: 'deluxe',
                    checkIn: tomorrow.toISOString().split('T')[0],
                    checkOut: nextWeek.toISOString().split('T')[0],
                    status: 'pending',
                    isSuspicious: false,
                    contactInfo: 'jane@email.com',
                    createdAt: new Date().toISOString()
                }
            ];
            this.saveBookings();
        }
    }

    switchView(viewName) {
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

        this.currentView = viewName;
        this.renderCurrentView();
    }

    renderCurrentView() {
        switch (this.currentView) {
            case 'bookings':
                this.renderBookings();
                break;
            case 'calendar':
                this.renderCalendar();
                break;
            case 'add-booking':
                this.renderAddBookingForm();
                break;
            case 'rooms':
                this.renderRooms();
                break;
        }
    }

    renderBookings() {
        const tbody = document.getElementById('bookings-tbody');
        if (!tbody) return;

        const filter = document.getElementById('status-filter')?.value || 'all';
        let filteredBookings = this.bookings;

        if (filter !== 'all') {
            if (filter === 'suspicious') {
                filteredBookings = this.bookings.filter(booking => booking.isSuspicious);
            } else {
                filteredBookings = this.bookings.filter(booking => booking.status === filter);
            }
        }

        tbody.innerHTML = filteredBookings.map(booking => `
            <tr>
                <td>${booking.guestName}</td>
                <td>${this.capitalizeFirst(booking.roomType)}</td>
                <td>${this.formatDate(booking.checkIn)}</td>
                <td>${this.formatDate(booking.checkOut)}</td>
                <td>
                    <span class="status-badge status-${booking.status}">
                        ${booking.isSuspicious ? 'Suspicious' : booking.status}
                    </span>
                </td>
                <td>${booking.contactInfo}</td>
                <td>
                    <button class="btn btn-secondary" onclick="dashboard.viewBooking('${booking.id}')">
                        View
                    </button>
                    ${booking.status === 'pending' ? `
                        <button class="btn btn-success" onclick="dashboard.approveBooking('${booking.id}')">
                            Approve
                        </button>
                        <button class="btn btn-danger" onclick="dashboard.rejectBooking('${booking.id}')">
                            Reject
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    }

    renderCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        const monthYearDisplay = document.getElementById('current-month-year');
        
        if (!calendarGrid || !monthYearDisplay) return;

        // Update month/year display
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        monthYearDisplay.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

        // Clear calendar
        calendarGrid.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        // Get first day of month and number of days
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;

            const currentDateStr = `${this.currentDate.getFullYear()}-${String(this.currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // Check if today
            const today = new Date();
            if (this.currentDate.getFullYear() === today.getFullYear() &&
                this.currentDate.getMonth() === today.getMonth() &&
                day === today.getDate()) {
                dayElement.classList.add('today');
            }

            // Check for bookings on this date
            const bookingsOnDate = this.getBookingsForDate(currentDateStr);
            if (bookingsOnDate.length > 0) {
                dayElement.classList.add('booked');
                dayElement.title = `Bookings: ${bookingsOnDate.map(b => b.guestName).join(', ')}`;
            } else {
                dayElement.classList.add('available');
            }

            // Add click handler for adding bookings
            dayElement.addEventListener('click', () => {
                this.handleDateClick(currentDateStr);
            });

            calendarGrid.appendChild(dayElement);
        }
    }

    renderAddBookingForm() {
        // Set default check-in date to today
        const today = new Date().toISOString().split('T')[0];
        const checkInInput = document.getElementById('check-in');
        if (checkInInput && !checkInInput.value) {
            checkInInput.value = today;
        }
    }

    renderRooms() {
        const roomTypes = ['standard', 'deluxe', 'suite'];
        
        roomTypes.forEach(type => {
            const container = document.getElementById(`${type}-rooms`);
            if (!container) return;

            const roomsOfType = this.rooms.filter(room => room.type === type);
            container.innerHTML = roomsOfType.map(room => `
                <div class="room-item">
                    <div class="room-info">
                        <div class="room-name">${room.name}</div>
                        <div class="room-status">${room.status}</div>
                    </div>
                    <div class="toggle-switch ${room.isAvailable ? 'active' : ''}" 
                         onclick="dashboard.toggleRoomAvailability('${room.id}')">
                    </div>
                </div>
            `).join('');
        });
    }

    // Data Management Methods
    loadBookings() {
        const stored = localStorage.getItem('kina-resort-bookings');
        return stored ? JSON.parse(stored) : [];
    }

    saveBookings() {
        localStorage.setItem('kina-resort-bookings', JSON.stringify(this.bookings));
    }

    loadRooms() {
        const stored = localStorage.getItem('kina-resort-rooms');
        return stored ? JSON.parse(stored) : [];
    }

    saveRooms() {
        localStorage.setItem('kina-resort-rooms', JSON.stringify(this.rooms));
    }

    // Theme Management Methods
    loadTheme() {
        const savedTheme = localStorage.getItem('kina-resort-theme');
        return savedTheme || 'light';
    }

    saveTheme(theme) {
        localStorage.setItem('kina-resort-theme', theme);
        this.currentTheme = theme;
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.saveTheme(newTheme);
        this.applyTheme();
    }

    updateThemeIcon() {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
        }
    }

    // Booking Management Methods
    handleAddBooking(e) {
        const formData = new FormData(e.target);
        const booking = {
            id: 'booking-' + Date.now(),
            guestName: formData.get('guestName'),
            roomType: formData.get('roomType'),
            checkIn: formData.get('checkIn'),
            checkOut: formData.get('checkOut'),
            status: formData.get('status'),
            isSuspicious: formData.has('isSuspicious'),
            contactInfo: formData.get('contactInfo'),
            createdAt: new Date().toISOString()
        };

        // Validate dates
        if (new Date(booking.checkIn) >= new Date(booking.checkOut)) {
            alert('Check-out date must be after check-in date');
            return;
        }

        // Check for double booking
        if (this.hasBookingConflict(booking)) {
            alert('Room is already booked for these dates');
            return;
        }

        this.bookings.push(booking);
        this.saveBookings();
        
        // Reset form
        e.target.reset();
        
        // Show success message
        alert('Booking added successfully!');
        
        // Switch to bookings view to see the new booking
        this.switchView('bookings');
    }

    hasBookingConflict(newBooking) {
        return this.bookings.some(booking => {
            if (booking.status === 'cancelled') return false;
            
            const newCheckIn = new Date(newBooking.checkIn);
            const newCheckOut = new Date(newBooking.checkOut);
            const existingCheckIn = new Date(booking.checkIn);
            const existingCheckOut = new Date(booking.checkOut);
            
            return booking.roomType === newBooking.roomType &&
                   ((newCheckIn >= existingCheckIn && newCheckIn < existingCheckOut) ||
                    (newCheckOut > existingCheckIn && newCheckOut <= existingCheckOut) ||
                    (newCheckIn <= existingCheckIn && newCheckOut >= existingCheckOut));
        });
    }

    getBookingsForDate(dateStr) {
        return this.bookings.filter(booking => {
            if (booking.status === 'cancelled') return false;
            
            const checkIn = new Date(booking.checkIn);
            const checkOut = new Date(booking.checkOut);
            const targetDate = new Date(dateStr);
            
            return targetDate >= checkIn && targetDate < checkOut;
        });
    }

    viewBooking(bookingId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const modal = document.getElementById('booking-modal');
        const modalInfo = document.getElementById('modal-booking-info');
        
        modalInfo.innerHTML = `
            <p><strong>Guest:</strong> ${booking.guestName}</p>
            <p><strong>Room Type:</strong> ${this.capitalizeFirst(booking.roomType)}</p>
            <p><strong>Check-in:</strong> ${this.formatDate(booking.checkIn)}</p>
            <p><strong>Check-out:</strong> ${this.formatDate(booking.checkOut)}</p>
            <p><strong>Status:</strong> ${booking.status}</p>
            <p><strong>Contact:</strong> ${booking.contactInfo}</p>
            <p><strong>Suspicious:</strong> ${booking.isSuspicious ? 'Yes' : 'No'}</p>
        `;

        // Set up modal action buttons
        document.getElementById('approve-booking').onclick = () => {
            this.approveBooking(bookingId);
            this.closeModal();
        };
        
        document.getElementById('reject-booking').onclick = () => {
            this.rejectBooking(bookingId);
            this.closeModal();
        };
        
        document.getElementById('delete-booking').onclick = () => {
            if (confirm('Are you sure you want to delete this booking?')) {
                this.deleteBooking(bookingId);
                this.closeModal();
            }
        };

        modal.style.display = 'block';
    }

    approveBooking(bookingId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (booking) {
            booking.status = 'confirmed';
            this.saveBookings();
            this.renderCurrentView();
        }
    }

    rejectBooking(bookingId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (booking) {
            booking.status = 'cancelled';
            this.saveBookings();
            this.renderCurrentView();
        }
    }

    deleteBooking(bookingId) {
        this.bookings = this.bookings.filter(b => b.id !== bookingId);
        this.saveBookings();
        this.renderCurrentView();
    }

    filterBookings(status) {
        this.renderBookings();
    }

    toggleRoomAvailability(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (room) {
            room.isAvailable = !room.isAvailable;
            room.status = room.isAvailable ? 'available' : 'maintenance';
            this.saveRooms();
            this.renderRooms();
        }
    }

    handleDateClick(dateStr) {
        // Switch to add booking view and pre-fill the date
        this.switchView('add-booking');
        const checkInInput = document.getElementById('check-in');
        if (checkInInput) {
            checkInInput.value = dateStr;
        }
    }

    closeModal() {
        document.getElementById('booking-modal').style.display = 'none';
    }

    // Utility Methods
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize the dashboard when the page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new KinaResortDashboard();
});
