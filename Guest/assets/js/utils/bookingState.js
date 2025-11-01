// Booking Flow State Management
// Manages dates, selected rooms, guest counts, and cottage selections

import { normalizeDateInputToYMD } from './calendarUtils.js';

export const bookingState = {
  dates: { checkin: null, checkout: null },
  selectedRooms: [],
  guestCounts: {}, // { roomId: { adults: 1, children: 0 } }
  selectedCottages: [],
  availableRooms: [],
  availableCottages: [],
  
  // Mock availability data (consistent with calendar modal)
  mockReservationData: {
    'Room 01': 8,
    'Room 02': 12,
    'Room 03': 6,
    'Room 04': 15,
    'Standard Cottage': 8,
    'Open Cottage': 8,
    'Family Cottage': 8
  },
  
  // Room types
  allRooms: ['Room 01', 'Room 02', 'Room 03', 'Room 04'],
  
  // Function halls
  allFunctionHalls: ['Grand Function Hall', 'Intimate Function Hall'],
  
  // Cottage types
  allCottages: ['Standard Cottage', 'Open Cottage', 'Family Cottage'],
  
  async setDates(checkin, checkout) {
    this.dates.checkin = checkin;
    this.dates.checkout = checkout;
    // Update available rooms and cottages when dates change
    await this.updateAvailability();
  },
  
  toggleRoom(roomId) {
    const index = this.selectedRooms.indexOf(roomId);
    if (index > -1) {
      this.selectedRooms.splice(index, 1);
      delete this.guestCounts[roomId];
    } else {
      this.selectedRooms.push(roomId);
      // Initialize default guest counts
      if (!this.guestCounts[roomId]) {
        this.guestCounts[roomId] = { adults: 1, children: 0 };
      }
    }
  },
  
  setGuestCount(roomId, adults, children) {
    if (this.guestCounts[roomId]) {
      this.guestCounts[roomId].adults = adults;
      this.guestCounts[roomId].children = children;
    }
  },
  
  toggleCottage(cottageId) {
    const index = this.selectedCottages.indexOf(cottageId);
    if (index > -1) {
      this.selectedCottages.splice(index, 1);
    } else {
      this.selectedCottages.push(cottageId);
    }
  },
  
  addCottage(cottageId) {
    if (!this.selectedCottages.includes(cottageId)) {
      this.selectedCottages.push(cottageId);
    }
  },
  
  removeCottage(cottageId) {
    const index = this.selectedCottages.indexOf(cottageId);
    if (index > -1) {
      this.selectedCottages.splice(index, 1);
    }
  },
  
  reset() {
    this.dates = { checkin: null, checkout: null };
    this.selectedRooms = [];
    this.guestCounts = {};
    this.selectedCottages = [];
    this.availableRooms = [];
    this.availableCottages = [];
  },
  
  // Check room availability for a specific date
  isRoomAvailableOnDate(roomId, date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Past dates
    if (date < today) {
      return false;
    }
    
    // Deterministic availability check
    const d0 = new Date(date); d0.setHours(0,0,0,0);
    const dateString = `${d0.getFullYear()}-${String(d0.getMonth()+1).padStart(2,'0')}-${String(d0.getDate()).padStart(2,'0')}`;
    const seed = dateString.split('-').join('') + roomId.length;
    const deterministicRandom = (parseInt(seed) % 100) / 100;
    
    const reservationCount = this.mockReservationData[roomId] || 10;
    const bookedThreshold = 0.3 + (reservationCount / 100);
    
    if (deterministicRandom < 0.1) {
      return false; // Maintenance
    } else if (deterministicRandom < bookedThreshold) {
      return false; // Booked
    }
    
    return true; // Available
  },
  
  // Check if room is available for entire date range
  isRoomAvailable(roomId, checkin, checkout) {
    if (!checkin || !checkout) return false;
    
    const startDate = new Date(checkin);
    const endDate = new Date(checkout);
    let currentDate = new Date(startDate);
    
    while (currentDate < endDate) {
      if (!this.isRoomAvailableOnDate(roomId, currentDate)) {
        return false;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return true;
  },
  
  // Get available rooms for date range (now fetches from database)
  async getAvailableRooms(checkin, checkout) {
    if (!checkin || !checkout) return [];
    
    console.log(`[BookingState] Getting available rooms for ${checkin} to ${checkout}`);
    
    try {
      // Call backend API to get real-time availability
      const { checkAvailability } = await import('./api.js');
      // Pass 'rooms' category to only get room bookings
      const result = await checkAvailability(1, checkin, checkout, 'rooms');
      
      console.log('[BookingState] Availability result:', result);
      
      // Prefer server-provided range list (rooms free for ALL dates)
      if (Array.isArray(result?.rangeAvailableRooms)) {
        console.log('[BookingState] Using rangeAvailableRooms from server:', result.rangeAvailableRooms);
        return result.rangeAvailableRooms;
      }

      // Fallback: intersect per-day availableRooms across returned dates
      if (result && result.dateAvailability) {
        const dateKeys = Object.keys(result.dateAvailability).sort();
        let intersection = null;
        dateKeys.forEach(d => {
          const day = result.dateAvailability[d];
          const list = Array.isArray(day?.availableRooms) ? day.availableRooms : [];
          intersection = intersection === null ? list.slice() : intersection.filter(id => list.includes(id));
        });
        if (Array.isArray(intersection)) {
          console.log('[BookingState] Computed intersection availableRooms:', intersection);
          return intersection;
        }
      }
      
      // Fallback: return all rooms if no booking data
      console.log('[BookingState] No booking data found, returning all rooms');
      return this.allRooms;
    } catch (error) {
      console.error('[BookingState] Error fetching available rooms:', error);
      
      // Show warning if backend is unavailable
      if (error.message.includes('backend server') || error.message === 'Failed to fetch') {
        console.warn('[BookingState] Backend unavailable - showing all rooms as available');
      }
      
      // Fallback to all rooms on error
      return this.allRooms;
    }
  },
  
  // Get available cottages for date range (fetches from database with category filter)
  async getAvailableCottages(checkin, checkout) {
    if (!checkin || !checkout) return [];
    
    // Normalize dates to ensure consistent format
    const normalizedCheckin = normalizeDateInputToYMD(checkin);
    const normalizedCheckout = normalizeDateInputToYMD(checkout);
    
    if (!normalizedCheckin || !normalizedCheckout) {
      console.error('[BookingState] Failed to normalize dates:', { checkin, checkout });
      return [];
    }
    
    console.log(`[BookingState] Getting available cottages for ${checkin} to ${checkout} (normalized: ${normalizedCheckin} to ${normalizedCheckout})`);
    
    try {
      // Call backend API to get real-time availability
      const { checkAvailability } = await import('./api.js');
      
      // Pass editBookingId to exclude current booking from conflicts during re-edit
      const excludeBookingId = window.bookingFormState?.editBookingId || null;
      if (excludeBookingId) {
        console.log(`[BookingState] Excluding booking ${excludeBookingId} from cottage availability check (re-edit mode)`);
      }
      
      // Pass 'cottages' category to only get cottage bookings with normalized dates
      const result = await checkAvailability(1, normalizedCheckin, normalizedCheckout, 'cottages', excludeBookingId);
      
      console.log('[BookingState] Cottage availability result:', result);
      
      // Prefer server-provided range list (cottages free for ALL dates)
      if (Array.isArray(result?.rangeAvailableCottages)) {
        console.log('[BookingState] Using rangeAvailableCottages from server:', result.rangeAvailableCottages);
        return result.rangeAvailableCottages;
      }
      
      // Fallback: intersect per-day availableCottages across returned dates
      if (result && result.dateAvailability) {
        const dateKeys = Object.keys(result.dateAvailability).sort();
        let intersection = null;
        dateKeys.forEach(d => {
          const day = result.dateAvailability[d];
          const list = Array.isArray(day?.availableCottages) ? day.availableCottages : [];
          intersection = intersection === null ? list.slice() : intersection.filter(id => list.includes(id));
        });
        if (Array.isArray(intersection)) {
          console.log('[BookingState] Computed intersection availableCottages:', intersection);
          return intersection;
        }
      }
      
      // Fallback: return all cottages if no booking data
      console.log('[BookingState] No booking data found, returning all cottages');
      return this.allCottages;
    } catch (error) {
      console.error('[BookingState] Error fetching available cottages:', error);
      
      // Show warning if backend is unavailable
      if (error.message.includes('backend server') || error.message === 'Failed to fetch') {
        console.warn('[BookingState] Backend unavailable - showing all cottages as available');
      }
      
      // Fallback to all cottages on error
      return this.allCottages;
    }
  },
  
  // Get available function halls for a single day (no check-out needed)
  async getAvailableFunctionHalls(visitDate) {
    if (!visitDate) {
      console.warn('[BookingState] getAvailableFunctionHalls called without visitDate');
      return [];
    }
    
    console.log(`[BookingState] 🏛️ Getting available function halls for ${visitDate}`);
    
    try {
      const { checkAvailability } = await import('./api.js');
      // Use same date for both params since booking is day-use
      const result = await checkAvailability(1, visitDate, visitDate, 'function-halls');
      
      console.log('[BookingState] 🏛️ Full API result:', result);
      console.log('[BookingState] 🏛️ dateAvailability keys:', result?.dateAvailability ? Object.keys(result.dateAvailability) : 'N/A');
      
      // CORRECT PATH: Check dateAvailability first (this is what mock API returns)
      if (result && result.dateAvailability && result.dateAvailability[visitDate]) {
        const day = result.dateAvailability[visitDate];
        console.log(`[BookingState] 🏛️ Day data for ${visitDate}:`, day);
        
        if (Array.isArray(day?.availableHalls)) {
          // Deduplicate to prevent any duplicate entries
          const uniqueHalls = [...new Set(day.availableHalls)];
          console.log(`[BookingState] ✅ Found availableHalls in dateAvailability[${visitDate}]:`, uniqueHalls);
          if (uniqueHalls.length !== day.availableHalls.length) {
            console.warn(`[BookingState] ⚠️ Deduplicated availableHalls: ${day.availableHalls.length} -> ${uniqueHalls.length}`);
          }
          return uniqueHalls;
        }
        if (Array.isArray(day?.availableItems)) {
          // Deduplicate to prevent any duplicate entries
          const uniqueItems = [...new Set(day.availableItems)];
          console.log(`[BookingState] ✅ Found availableItems in dateAvailability[${visitDate}]:`, uniqueItems);
          if (uniqueItems.length !== day.availableItems.length) {
            console.warn(`[BookingState] ⚠️ Deduplicated availableItems: ${day.availableItems.length} -> ${uniqueItems.length}`);
          }
          return uniqueItems;
        }
      } else {
        console.warn(`[BookingState] ⚠️ No dateAvailability entry for ${visitDate}. Available keys:`, result?.dateAvailability ? Object.keys(result.dateAvailability) : 'none');
      }
      
      // Secondary: Check root-level fields (for compatibility with different API formats)
      if (Array.isArray(result?.availableHalls)) {
        // Deduplicate to prevent any duplicate entries
        const uniqueHalls = [...new Set(result.availableHalls)];
        console.log('[BookingState] ✅ Found availableHalls at root:', uniqueHalls);
        if (uniqueHalls.length !== result.availableHalls.length) {
          console.warn(`[BookingState] ⚠️ Deduplicated root availableHalls: ${result.availableHalls.length} -> ${uniqueHalls.length}`);
        }
        return uniqueHalls;
      }
      if (Array.isArray(result?.availableItems)) {
        // Deduplicate to prevent any duplicate entries
        const uniqueItems = [...new Set(result.availableItems)];
        console.log('[BookingState] ✅ Found availableItems at root:', uniqueItems);
        if (uniqueItems.length !== result.availableItems.length) {
          console.warn(`[BookingState] ⚠️ Deduplicated root availableItems: ${result.availableItems.length} -> ${uniqueItems.length}`);
        }
        return uniqueItems;
      }
      
      // Fallback: both halls available
      console.warn('[BookingState] ⚠️ No availability data found, falling back to all halls:', this.allFunctionHalls);
      return this.allFunctionHalls;
    } catch (error) {
      console.error('[BookingState] ❌ Error fetching function hall availability:', error);
      console.warn('[BookingState] ⚠️ Falling back to all halls due to error');
      return this.allFunctionHalls;
    }
  },
  
  // Check cottage availability for a specific date
  isCottageAvailableOnDate(cottageId, date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Past dates
    if (date < today) {
      return false;
    }
    
    // Deterministic availability check
    const d0 = new Date(date); d0.setHours(0,0,0,0);
    const dateString = `${d0.getFullYear()}-${String(d0.getMonth()+1).padStart(2,'0')}-${String(d0.getDate()).padStart(2,'0')}`;
    const seed = dateString.split('-').join('') + cottageId.length;
    const deterministicRandom = (parseInt(seed) % 100) / 100;
    
    const reservationCount = this.mockReservationData[cottageId] || 10;
    const bookedThreshold = 0.3 + (reservationCount / 100);
    
    if (deterministicRandom < 0.15) {
      return false; // Maintenance
    } else if (deterministicRandom < bookedThreshold) {
      return false; // Booked
    }
    
    return true; // Available
  },
  
  // Check if cottage is available for entire date range
  isCottageAvailable(cottageId, checkin, checkout) {
    if (!checkin || !checkout) return false;
    
    const startDate = new Date(checkin);
    const endDate = new Date(checkout);
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      if (!this.isCottageAvailableOnDate(cottageId, currentDate)) {
        return false;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return true;
  },
  
  // Get available cottages for a single day (cottages are single-day bookings)
  async getAvailableCottages(visitDate) {
    if (!visitDate) return [];
    
    console.log(`[BookingState] Getting available cottages for ${visitDate}`);
    
    try {
      // Call backend API to get real-time availability
      const { checkAvailability } = await import('./api.js');
      // Pass 'cottages' category to only get cottage bookings
      // For cottages, check-in and check-out are the same (single day)
      // Exclude current booking when in re-edit mode so its own cottage items
      // are not treated as conflicts for availability
      const excludeBookingId = (typeof window !== 'undefined' && window.bookingFormState?.editMode)
        ? (window.bookingFormState?.bookingId || null)
        : null;
      if (excludeBookingId) {
        console.log('[BookingState] Excluding current booking from cottage availability:', excludeBookingId);
      }
      const result = await checkAvailability(1, visitDate, visitDate, 'cottages', excludeBookingId);
      
      console.log('[BookingState] Cottage availability result:', result);
      
      // Prefer server-provided available cottages list
      if (Array.isArray(result?.dateAvailability?.[visitDate]?.availableCottages)) {
        console.log('[BookingState] Using availableCottages from server:', result.dateAvailability[visitDate].availableCottages);
        return result.dateAvailability[visitDate].availableCottages;
      }
      
      // Fallback: return all cottages if no booking data
      console.log('[BookingState] No booking data found, returning all cottages');
      return this.allCottages;
    } catch (error) {
      console.error('[BookingState] Error fetching available cottages:', error);
      
      // Show warning if backend is unavailable
      if (error.message.includes('backend server') || error.message === 'Failed to fetch') {
        console.warn('[BookingState] Backend unavailable - showing all cottages as available');
      }
      
      // Fallback to all cottages on error
      return this.allCottages;
    }
  },
  
  // Check if dates are available for all selected rooms
  areDatesAvailableForRooms(checkin, checkout, roomIds) {
    if (!checkin || !checkout || !roomIds || roomIds.length === 0) return true;
    
    return roomIds.every(roomId => 
      this.isRoomAvailable(roomId, checkin, checkout)
    );
  },
  
  // Update availability based on current dates
  async updateAvailability() {
    if (this.dates.checkin && this.dates.checkout) {
      this.availableRooms = await this.getAvailableRooms(this.dates.checkin, this.dates.checkout);
      // For cottages, use checkin date (single day bookings)
      this.availableCottages = await this.getAvailableCottages(this.dates.checkin);
      
      // Remove selected rooms that are no longer available
      this.selectedRooms = this.selectedRooms.filter(roomId => 
        Array.isArray(this.availableRooms) && this.availableRooms.includes(roomId)
      );
      
      // Remove selected cottages that are no longer available
      this.selectedCottages = this.selectedCottages.filter(cottageId => 
        Array.isArray(this.availableCottages) && this.availableCottages.includes(cottageId)
      );
      
      console.log('[BookingState] updateAvailability complete', { rooms: this.availableRooms?.length, cottages: this.availableCottages?.length });
    } else {
      this.availableRooms = [];
      this.availableCottages = [];
      console.log('[BookingState] updateAvailability complete', { rooms: 0, cottages: 0 });
    }
  },
  
  // Get total guest counts across all rooms
  getTotalGuests() {
    let totalAdults = 0;
    let totalChildren = 0;
    
    Object.values(this.guestCounts).forEach(counts => {
      totalAdults += counts.adults || 0;
      totalChildren += counts.children || 0;
    });
    
    return { adults: totalAdults, children: totalChildren };
  }
};

export default bookingState;

