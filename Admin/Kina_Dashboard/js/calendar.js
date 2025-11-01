// Kina Resort Admin Dashboard - Calendar Management Functions

class CalendarManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.viewMode = 'month'; // month, week, day
    }

    // Render the calendar
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

        // Get calendar data
        const calendarData = this.getCalendarData();
        
        // Render calendar days
        calendarData.forEach(dayData => {
            const dayElement = this.createDayElement(dayData);
            calendarGrid.appendChild(dayElement);
        });
    }

    // Get calendar data for the current month
    getCalendarData() {
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const calendarData = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const prevMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 0);
            const dayNumber = prevMonth.getDate() - startingDayOfWeek + i + 1;
            calendarData.push({
                day: dayNumber,
                isCurrentMonth: false,
                date: new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, dayNumber),
                bookings: []
            });
        }

        // Add days of the current month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
            const dateStr = this.formatDateString(date);
            const bookings = this.dashboard.getBookingsForDate(dateStr);
            
            calendarData.push({
                day: day,
                isCurrentMonth: true,
                date: date,
                dateStr: dateStr,
                bookings: bookings,
                isToday: this.isToday(date),
                isWeekend: date.getDay() === 0 || date.getDay() === 6
            });
        }

        // Add empty cells for days after the last day of the month
        const remainingCells = 42 - calendarData.length; // 6 weeks * 7 days
        for (let i = 1; i <= remainingCells; i++) {
            calendarData.push({
                day: i,
                isCurrentMonth: false,
                date: new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, i),
                bookings: []
            });
        }

        return calendarData;
    }

    // Create a day element for the calendar
    createDayElement(dayData) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = dayData.day;

        // Add classes based on day properties
        if (!dayData.isCurrentMonth) {
            dayElement.classList.add('other-month');
        }

        if (dayData.isToday) {
            dayElement.classList.add('today');
        }

        if (dayData.isWeekend) {
            dayElement.classList.add('weekend');
        }

        // Add booking status classes
        if (dayData.isCurrentMonth) {
            if (dayData.bookings.length > 0) {
                dayElement.classList.add('booked');
                
                // Create tooltip with booking details
                const tooltip = this.createBookingTooltip(dayData.bookings);
                dayElement.title = tooltip;
                
                // Add booking count indicator
                if (dayData.bookings.length > 1) {
                    const countIndicator = document.createElement('div');
                    countIndicator.className = 'booking-count';
                    countIndicator.textContent = dayData.bookings.length;
                    dayElement.appendChild(countIndicator);
                }
            } else {
                dayElement.classList.add('available');
            }
        }

        // Add click handler
        if (dayData.isCurrentMonth) {
            dayElement.addEventListener('click', () => {
                this.handleDateClick(dayData);
            });
        }

        return dayElement;
    }

    // Create tooltip text for bookings
    createBookingTooltip(bookings) {
        if (bookings.length === 0) return '';
        
        if (bookings.length === 1) {
            const booking = bookings[0];
            return `${booking.guestName} - ${this.dashboard.capitalizeFirst(booking.roomType)} (${booking.status})`;
        }
        
        return `${bookings.length} bookings:\n${bookings.map(b => 
            `${b.guestName} - ${this.dashboard.capitalizeFirst(b.roomType)}`
        ).join('\n')}`;
    }

    // Handle date click
    handleDateClick(dayData) {
        this.selectedDate = dayData.date;
        
        // If there are bookings, show them in a modal or side panel
        if (dayData.bookings.length > 0) {
            this.showDateBookings(dayData);
        } else {
            // Switch to add booking view with pre-filled date
            this.dashboard.switchView('add-booking');
            const checkInInput = document.getElementById('check-in');
            if (checkInInput) {
                checkInInput.value = dayData.dateStr;
            }
        }
    }

    // Show bookings for a specific date
    showDateBookings(dayData) {
        // Create a modal or side panel to show bookings
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h3>Bookings for ${this.dashboard.formatDate(dayData.dateStr)}</h3>
                <div class="date-bookings">
                    ${dayData.bookings.map(booking => `
                        <div class="booking-item">
                            <div class="booking-info">
                                <strong>${booking.guestName}</strong>
                                <span class="room-type">${this.dashboard.capitalizeFirst(booking.roomType)}</span>
                                <span class="status-badge status-${booking.status}">${booking.status}</span>
                            </div>
                            <div class="booking-actions">
                                <button class="btn btn-secondary" onclick="calendar.viewBooking('${booking.id}')">View</button>
                                ${booking.status === 'pending' ? `
                                    <button class="btn btn-success" onclick="calendar.approveBooking('${booking.id}')">Approve</button>
                                    <button class="btn btn-danger" onclick="calendar.rejectBooking('${booking.id}')">Reject</button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="calendar.addBookingForDate('${dayData.dateStr}')">Add New Booking</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Close modal handlers
        modal.querySelector('.close').onclick = () => {
            document.body.removeChild(modal);
        };

        window.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
    }

    // Navigate to previous month
    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }

    // Navigate to next month
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }

    // Navigate to today
    goToToday() {
        this.currentDate = new Date();
        this.renderCalendar();
    }

    // Navigate to specific date
    goToDate(date) {
        this.currentDate = new Date(date);
        this.renderCalendar();
    }

    // Get availability for a date range
    getAvailabilityForDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const availability = {};

        // Get all room types
        const roomTypes = ['standard', 'deluxe', 'suite'];
        
        roomTypes.forEach(roomType => {
            availability[roomType] = {
                available: true,
                conflictingBookings: []
            };

            // Check for conflicts
            const conflicts = this.dashboard.bookings.filter(booking => {
                if (booking.status === 'cancelled' || booking.roomType !== roomType) {
                    return false;
                }
                
                const checkIn = new Date(booking.checkIn);
                const checkOut = new Date(booking.checkOut);
                
                return (checkIn >= start && checkIn < end) ||
                       (checkOut > start && checkOut <= end) ||
                       (checkIn <= start && checkOut >= end);
            });

            if (conflicts.length > 0) {
                availability[roomType].available = false;
                availability[roomType].conflictingBookings = conflicts;
            }
        });

        return availability;
    }

    // Get monthly statistics
    getMonthlyStats() {
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        
        const bookings = this.dashboard.bookings.filter(booking => {
            if (booking.status === 'cancelled') return false;
            
            const checkIn = new Date(booking.checkIn);
            const checkOut = new Date(booking.checkOut);
            
            return (checkIn >= firstDay && checkIn <= lastDay) ||
                   (checkOut >= firstDay && checkOut <= lastDay) ||
                   (checkIn <= firstDay && checkOut >= lastDay);
        });

        const stats = {
            totalBookings: bookings.length,
            confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
            pendingBookings: bookings.filter(b => b.status === 'pending').length,
            suspiciousBookings: bookings.filter(b => b.isSuspicious).length,
            byRoomType: {
                standard: bookings.filter(b => b.roomType === 'standard').length,
                deluxe: bookings.filter(b => b.roomType === 'deluxe').length,
                suite: bookings.filter(b => b.roomType === 'suite').length
            }
        };

        return stats;
    }

    // Utility methods
    formatDateString(date) {
        return date.toISOString().split('T')[0];
    }

    isToday(date) {
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
               date.getMonth() === today.getMonth() &&
               date.getDate() === today.getDate();
    }

    // Event handlers for calendar actions
    viewBooking(bookingId) {
        this.dashboard.viewBooking(bookingId);
    }

    approveBooking(bookingId) {
        this.dashboard.approveBooking(bookingId);
        this.renderCalendar(); // Refresh calendar
    }

    rejectBooking(bookingId) {
        this.dashboard.rejectBooking(bookingId);
        this.renderCalendar(); // Refresh calendar
    }

    addBookingForDate(dateStr) {
        this.dashboard.switchView('add-booking');
        const checkInInput = document.getElementById('check-in');
        if (checkInInput) {
            checkInInput.value = dateStr;
        }
    }
}

// Initialize calendar manager
let calendar;
document.addEventListener('DOMContentLoaded', () => {
    // Calendar will be initialized when dashboard is created
});
