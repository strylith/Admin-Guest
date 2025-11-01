// Kina Resort Admin Dashboard - Booking Management Functions

class BookingManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
    }

    // Create a new booking
    createBooking(bookingData) {
        const booking = {
            id: 'booking-' + Date.now(),
            ...bookingData,
            createdAt: new Date().toISOString()
        };

        // Validate booking data
        if (!this.validateBooking(booking)) {
            return false;
        }

        // Check for conflicts
        if (this.dashboard.hasBookingConflict(booking)) {
            throw new Error('Room is already booked for these dates');
        }

        this.dashboard.bookings.push(booking);
        this.dashboard.saveBookings();
        return booking;
    }

    // Update an existing booking
    updateBooking(bookingId, updates) {
        const bookingIndex = this.dashboard.bookings.findIndex(b => b.id === bookingId);
        if (bookingIndex === -1) {
            throw new Error('Booking not found');
        }

        const updatedBooking = { ...this.dashboard.bookings[bookingIndex], ...updates };
        
        // Validate updated booking
        if (!this.validateBooking(updatedBooking)) {
            return false;
        }

        // Check for conflicts (excluding the current booking)
        const otherBookings = this.dashboard.bookings.filter(b => b.id !== bookingId);
        const hasConflict = otherBookings.some(booking => {
            if (booking.status === 'cancelled') return false;
            
            const newCheckIn = new Date(updatedBooking.checkIn);
            const newCheckOut = new Date(updatedBooking.checkOut);
            const existingCheckIn = new Date(booking.checkIn);
            const existingCheckOut = new Date(booking.checkOut);
            
            return booking.roomType === updatedBooking.roomType &&
                   ((newCheckIn >= existingCheckIn && newCheckIn < existingCheckOut) ||
                    (newCheckOut > existingCheckIn && newCheckOut <= existingCheckOut) ||
                    (newCheckIn <= existingCheckIn && newCheckOut >= existingCheckOut));
        });

        if (hasConflict) {
            throw new Error('Room is already booked for these dates');
        }

        this.dashboard.bookings[bookingIndex] = updatedBooking;
        this.dashboard.saveBookings();
        return updatedBooking;
    }

    // Delete a booking
    deleteBooking(bookingId) {
        const bookingIndex = this.dashboard.bookings.findIndex(b => b.id === bookingId);
        if (bookingIndex === -1) {
            throw new Error('Booking not found');
        }

        const deletedBooking = this.dashboard.bookings.splice(bookingIndex, 1)[0];
        this.dashboard.saveBookings();
        return deletedBooking;
    }

    // Get booking by ID
    getBooking(bookingId) {
        return this.dashboard.bookings.find(b => b.id === bookingId);
    }

    // Get all bookings with optional filters
    getBookings(filters = {}) {
        let filteredBookings = [...this.dashboard.bookings];

        if (filters.status && filters.status !== 'all') {
            if (filters.status === 'suspicious') {
                filteredBookings = filteredBookings.filter(booking => booking.isSuspicious);
            } else {
                filteredBookings = filteredBookings.filter(booking => booking.status === filters.status);
            }
        }

        if (filters.roomType) {
            filteredBookings = filteredBookings.filter(booking => booking.roomType === filters.roomType);
        }

        if (filters.dateRange) {
            const { startDate, endDate } = filters.dateRange;
            filteredBookings = filteredBookings.filter(booking => {
                const checkIn = new Date(booking.checkIn);
                const checkOut = new Date(booking.checkOut);
                return (checkIn >= startDate && checkIn <= endDate) ||
                       (checkOut >= startDate && checkOut <= endDate) ||
                       (checkIn <= startDate && checkOut >= endDate);
            });
        }

        return filteredBookings;
    }

    // Get bookings for a specific date
    getBookingsForDate(dateStr) {
        const targetDate = new Date(dateStr);
        return this.dashboard.bookings.filter(booking => {
            if (booking.status === 'cancelled') return false;
            
            const checkIn = new Date(booking.checkIn);
            const checkOut = new Date(booking.checkOut);
            
            return targetDate >= checkIn && targetDate < checkOut;
        });
    }

    // Get bookings for a date range
    getBookingsForDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return this.dashboard.bookings.filter(booking => {
            if (booking.status === 'cancelled') return false;
            
            const checkIn = new Date(booking.checkIn);
            const checkOut = new Date(booking.checkOut);
            
            return (checkIn >= start && checkIn <= end) ||
                   (checkOut >= start && checkOut <= end) ||
                   (checkIn <= start && checkOut >= end);
        });
    }

    // Get room availability for a date range
    getRoomAvailability(roomType, startDate, endDate) {
        const conflictingBookings = this.dashboard.bookings.filter(booking => {
            if (booking.status === 'cancelled' || booking.roomType !== roomType) {
                return false;
            }
            
            const checkIn = new Date(booking.checkIn);
            const checkOut = new Date(booking.checkOut);
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            return (checkIn >= start && checkIn < end) ||
                   (checkOut > start && checkOut <= end) ||
                   (checkIn <= start && checkOut >= end);
        });

        return {
            isAvailable: conflictingBookings.length === 0,
            conflictingBookings: conflictingBookings
        };
    }

    // Get occupancy statistics
    getOccupancyStats(startDate, endDate) {
        const bookings = this.getBookingsForDateRange(startDate, endDate);
        const roomTypes = ['standard', 'deluxe', 'suite'];
        
        const stats = {
            totalBookings: bookings.length,
            byRoomType: {},
            byStatus: {},
            occupancyRate: 0
        };

        // Count by room type
        roomTypes.forEach(type => {
            stats.byRoomType[type] = bookings.filter(b => b.roomType === type).length;
        });

        // Count by status
        ['confirmed', 'pending', 'cancelled'].forEach(status => {
            stats.byStatus[status] = bookings.filter(b => b.status === status).length;
        });

        // Calculate occupancy rate (confirmed bookings only)
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
        const totalRoomNights = this.calculateTotalRoomNights(confirmedBookings, startDate, endDate);
        const availableRoomNights = this.calculateAvailableRoomNights(roomTypes, startDate, endDate);
        
        if (availableRoomNights > 0) {
            stats.occupancyRate = Math.round((totalRoomNights / availableRoomNights) * 100);
        }

        return stats;
    }

    // Calculate total room nights for bookings
    calculateTotalRoomNights(bookings, startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return bookings.reduce((total, booking) => {
            const checkIn = new Date(booking.checkIn);
            const checkOut = new Date(booking.checkOut);
            
            // Calculate overlap with the date range
            const overlapStart = new Date(Math.max(checkIn.getTime(), start.getTime()));
            const overlapEnd = new Date(Math.min(checkOut.getTime(), end.getTime()));
            
            if (overlapStart < overlapEnd) {
                const nights = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
                return total + nights;
            }
            
            return total;
        }, 0);
    }

    // Calculate available room nights
    calculateAvailableRoomNights(roomTypes, startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        // Assume 3 standard, 2 deluxe, 2 suite rooms
        const roomCounts = { standard: 3, deluxe: 2, suite: 2 };
        
        return roomTypes.reduce((total, type) => {
            return total + (roomCounts[type] * nights);
        }, 0);
    }

    // Validate booking data
    validateBooking(booking) {
        const requiredFields = ['guestName', 'roomType', 'checkIn', 'checkOut', 'status', 'contactInfo'];
        
        // Check required fields
        for (const field of requiredFields) {
            if (!booking[field] || booking[field].trim() === '') {
                throw new Error(`${field} is required`);
            }
        }

        // Validate dates
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
            throw new Error('Invalid date format');
        }

        if (checkIn < today) {
            throw new Error('Check-in date cannot be in the past');
        }

        if (checkOut <= checkIn) {
            throw new Error('Check-out date must be after check-in date');
        }

        // Validate room type
        const validRoomTypes = ['standard', 'deluxe', 'suite'];
        if (!validRoomTypes.includes(booking.roomType)) {
            throw new Error('Invalid room type');
        }

        // Validate status
        const validStatuses = ['confirmed', 'pending', 'cancelled'];
        if (!validStatuses.includes(booking.status)) {
            throw new Error('Invalid booking status');
        }

        // Validate contact info (basic email or phone check)
        const contactInfo = booking.contactInfo.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        
        if (!emailRegex.test(contactInfo) && !phoneRegex.test(contactInfo.replace(/[\s\-\(\)]/g, ''))) {
            throw new Error('Contact info must be a valid email or phone number');
        }

        return true;
    }

    // Mark booking as suspicious
    markAsSuspicious(bookingId, isSuspicious = true) {
        const booking = this.getBooking(bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }

        booking.isSuspicious = isSuspicious;
        this.dashboard.saveBookings();
        return booking;
    }

    // Bulk operations
    bulkUpdateStatus(bookingIds, newStatus) {
        const validStatuses = ['confirmed', 'pending', 'cancelled'];
        if (!validStatuses.includes(newStatus)) {
            throw new Error('Invalid status');
        }

        const updatedBookings = [];
        bookingIds.forEach(id => {
            const booking = this.getBooking(id);
            if (booking) {
                booking.status = newStatus;
                updatedBookings.push(booking);
            }
        });

        this.dashboard.saveBookings();
        return updatedBookings;
    }

    // Export bookings data
    exportBookings(format = 'json') {
        const bookings = this.dashboard.bookings;
        
        if (format === 'json') {
            return JSON.stringify(bookings, null, 2);
        } else if (format === 'csv') {
            const headers = ['ID', 'Guest Name', 'Room Type', 'Check-in', 'Check-out', 'Status', 'Contact', 'Suspicious', 'Created'];
            const rows = bookings.map(booking => [
                booking.id,
                booking.guestName,
                booking.roomType,
                booking.checkIn,
                booking.checkOut,
                booking.status,
                booking.contactInfo,
                booking.isSuspicious ? 'Yes' : 'No',
                booking.createdAt
            ]);
            
            return [headers, ...rows].map(row => row.join(',')).join('\n');
        }
        
        throw new Error('Unsupported export format');
    }
}
