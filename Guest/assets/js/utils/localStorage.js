// Client-side localStorage database for bookings and user data
// This replaces the mock API when running in production without a backend

const STORAGE_KEYS = {
  BOOKINGS: 'kina_resort_bookings',
  BOOKING_ITEMS: 'kina_resort_booking_items',
  PACKAGES: 'kina_resort_packages',
  USERS: 'kina_resort_users'
};

// Initialize default packages if they don't exist
function initializePackages() {
  const existing = localStorage.getItem(STORAGE_KEYS.PACKAGES);
  if (existing) return;
  
  const defaultPackages = [
    // Rooms
    {
      id: 1,
      title: 'Standard Room',
      category: 'rooms',
      price: '₱1,500/night',
      capacity: 4,
      description: 'Comfortable rooms with air conditioning, family-sized bed and private bathroom. All 4 rooms are identically designed with modern amenities and stunning garden views.',
      image_url: 'images/kina1.jpg',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      title: 'Ocean View Room',
      category: 'rooms',
      price: '₱1,500/night',
      capacity: 4,
      description: 'Room with balcony overlooking the ocean, perfect for sunset views.',
      image_url: 'images/kina2.jpg',
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      title: 'Deluxe Suite',
      category: 'rooms',
      price: '₱1,500/night',
      capacity: 4,
      description: 'Spacious suite with separate living area, mini-fridge, and premium amenities.',
      image_url: 'images/kina3.jpg',
      created_at: new Date().toISOString()
    },
    {
      id: 4,
      title: 'Premium King',
      category: 'rooms',
      price: '₱1,500/night',
      capacity: 4,
      description: 'Executive comfort with elegant design and premium furnishings.',
      image_url: 'images/resort1.JPG',
      created_at: new Date().toISOString()
    },
    // Cottages
    {
      id: 5,
      title: 'Standard Cottage',
      category: 'cottages',
      price: '₱400',
      capacity: 8,
      description: 'Private cottage with basic amenities.',
      image_url: 'images/cottage_1.JPG',
      created_at: new Date().toISOString()
    },
    {
      id: 6,
      title: 'Open Cottage',
      category: 'cottages',
      price: '₱300',
      capacity: 8,
      description: 'Cozy cottage surrounded by tropical gardens, perfect for peaceful relaxation.',
      image_url: 'images/cottage_2.JPG',
      created_at: new Date().toISOString()
    },
    {
      id: 7,
      title: 'Family Cottage',
      category: 'cottages',
      price: '₱500',
      capacity: 8,
      description: 'A spacious, open-air cottage with tables and chairs, ideal for daytime relaxation, dining, and gatherings.',
      image_url: 'images/kina1.jpg',
      created_at: new Date().toISOString()
    },
    // Function Halls
    {
      id: 8,
      title: 'Grand Function Hall',
      category: 'function-halls',
      price: '₱10,000+',
      capacity: 100,
      description: 'Spacious hall perfect for weddings, conferences, and large events. Includes tables, chairs, sound system, and air conditioning.',
      image_url: 'images/Function Hall.JPG',
      created_at: new Date().toISOString()
    },
    {
      id: 9,
      title: 'Intimate Function Hall',
      category: 'function-halls',
      price: '₱10,000+',
      capacity: 100,
      description: 'Cozy hall ideal for birthday parties, meetings, and gatherings. Perfect for smaller celebrations with modern amenities.',
      image_url: 'images/Function Hall.JPG',
      created_at: new Date().toISOString()
    }
  ];
  
  localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(defaultPackages));
}

// Initialize on load
initializePackages();

// Helper functions
export function getStorage(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

export function setStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Bookings CRUD operations
export function getAllBookings() {
  return getStorage(STORAGE_KEYS.BOOKINGS);
}

export function getBookingById(id) {
  const bookings = getAllBookings();
  return bookings.find(b => b.id === id);
}

export function getBookingsByUserId(userId) {
  const bookings = getAllBookings();
  return bookings.filter(b => b.user_id === userId);
}

export function createBooking(bookingData) {
  const bookings = getAllBookings();
  const bookingId = Date.now().toString();
  
  const booking = {
    id: bookingId,
    user_id: bookingData.userId || 'current-user',
    package_id: bookingData.packageId,
    check_in: bookingData.checkIn,
    check_out: bookingData.checkOut,
    guests: bookingData.guests,
    total_cost: bookingData.totalCost,
    payment_mode: bookingData.paymentMode,
    contact_number: bookingData.contactNumber,
    special_requests: bookingData.specialRequests || '',
    status: 'pending',
    created_at: new Date().toISOString(),
    booking_items: []
  };
  
  // Add booking items if provided
  if (bookingData.perRoomGuests && bookingData.perRoomGuests.length > 0) {
    booking.booking_items = bookingData.perRoomGuests.map((room, index) => ({
      id: `${bookingId}-${index}`,
      booking_id: bookingId,
      item_type: 'room',
      item_id: room.roomId || String(bookingData.packageId),
      guests: room.guests || 2,
      check_in: bookingData.checkIn,
      check_out: bookingData.checkOut
    }));
  }
  
  bookings.push(booking);
  setStorage(STORAGE_KEYS.BOOKINGS, bookings);
  
  return booking;
}

export function updateBooking(bookingId, updates) {
  const bookings = getAllBookings();
  const index = bookings.findIndex(b => b.id === bookingId);
  
  if (index === -1) {
    throw new Error('Booking not found');
  }
  
  bookings[index] = { ...bookings[index], ...updates };
  setStorage(STORAGE_KEYS.BOOKINGS, bookings);
  
  return bookings[index];
}

export function cancelBooking(bookingId) {
  return updateBooking(bookingId, { status: 'cancelled' });
}

// Availability check
export function checkAvailability(packageId, checkIn, checkOut, category = null) {
  const bookings = getAllBookings();
  const packages = getStorage(STORAGE_KEYS.PACKAGES);
  
  const packageData = packages.find(p => p.id === parseInt(packageId));
  if (!packageData) {
    return { available: false, error: 'Package not found' };
  }
  
  // Get all bookings for this package that overlap with the date range
  const overlappingBookings = bookings.filter(booking => {
    if (booking.package_id !== parseInt(packageId)) return false;
    if (booking.status === 'cancelled') return false;
    
    const bookingStart = new Date(booking.check_in);
    const bookingEnd = new Date(booking.check_out);
    const requestedStart = new Date(checkIn);
    const requestedEnd = new Date(checkOut);
    
    return bookingStart < requestedEnd && bookingEnd > requestedStart;
  });
  
  // Simple availability: assume 10 units per package type
  const totalUnits = 10;
  const bookedCount = overlappingBookings.length;
  const availableCount = Math.max(0, totalUnits - bookedCount);
  
  // Calculate availability percentage
  const availabilityPercent = (availableCount / totalUnits) * 100;
  
  return {
    available: availableCount > 0,
    availableCount,
    bookedCount,
    totalUnits,
    availabilityPercent: Math.round(availabilityPercent),
    avgRoomAvailability: availabilityCount,
    bookedRooms: overlappingBookings.map(b => ({
      checkIn: b.check_in,
      checkOut: b.check_out,
      guests: b.guests
    })),
    availableRooms: Array.from({ length: availableCount }, (_, i) => ({
      id: `available-${i + 1}`,
      package_id: packageId
    }))
  };
}

// Packages
export function getAllPackages() {
  return getStorage(STORAGE_KEYS.PACKAGES);
}

export function getPackageById(id) {
  const packages = getAllPackages();
  return packages.find(p => p.id === parseInt(id));
}

export function getPackagesByCategory(category) {
  const packages = getAllPackages();
  return category ? packages.filter(p => p.category === category) : packages;
}

// Clear all data (for testing)
export function clearAllData() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  initializePackages();
}

// Export storage keys for direct access if needed
export { STORAGE_KEYS };

