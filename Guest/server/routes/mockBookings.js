import express from 'express';
import { mockClient } from '../db/databaseClient.js';

const router = express.Router();

// Health check for mock API
router.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Mock API is running',
    routes: ['GET /mock/bookings', 'POST /mock/bookings']
  });
});

// GET /mock/bookings - Get all bookings (no auth required)
router.get('/bookings', (req, res) => {
  try {
    const { userId, email } = req.query;
    console.log('[MockBookings] GET /bookings called', userId || email ? `(filtered by ${userId ? 'userId' : 'email'})` : '(all bookings)');
    let bookings = Array.from(mockClient.tables.bookings.values());
    
    // Filter by user if provided (for MyBookings page)
    if (userId || email) {
      bookings = bookings.filter(booking => {
        const matchesId = userId && booking.user_id === userId;
        const matchesEmail = email && booking.guest_email === email;
        return matchesId || matchesEmail;
      });
      console.log('[MockBookings] Filtered to', bookings.length, 'bookings for user');
    } else {
      console.log('[MockBookings] Found', bookings.length, 'bookings (no filter - for calendar)');
    }
    
    // Enrich with booking items and package info
    const enrichedBookings = bookings.map(booking => {
      const items = Array.from(mockClient.tables.booking_items.values())
        .filter(item => item.booking_id === booking.id);
      
      const packageData = mockClient.tables.packages.get(String(booking.package_id));
      
      // Log package lookup for debugging
      if (!packageData && booking.package_id) {
        console.warn('[MockBookings] Package not found for booking:', {
          bookingId: booking.id,
          package_id: booking.package_id,
          category: booking.category
        });
      } else if (packageData) {
        console.log('[MockBookings] Package found:', {
          bookingId: booking.id,
          package_id: booking.package_id,
          packageTitle: packageData.title,
          packageCategory: packageData.category
        });
      } else {
        console.warn('[MockBookings] Booking missing package_id:', {
          bookingId: booking.id,
          category: booking.category
        });
      }
      
      return {
        ...booking,
        booking_items: items || [],
        packages: packageData || null
      };
    });
    
    console.log('[MockBookings] Returning', enrichedBookings.length, 'enriched bookings');
    res.json({ success: true, data: enrichedBookings });
  } catch (error) {
    console.error('[MockBookings] Fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
  }
});

// POST /mock/bookings - Create new booking (no auth required)
router.post('/bookings', async (req, res) => {
  try {
    const { 
      packageId, 
      checkIn, 
      checkOut, 
      guests,
      totalCost,
      paymentMode,
      perRoomGuests,
      contactNumber,
      specialRequests,
      selectedCottages,
      selectedHall,
      cottageDates,  // Array of dates for cottage rentals
      // Function hall fields
      hallId,
      hallName,
      eventName,
      eventType,
      setupType,
      startTime,
      endTime,
      decorationTheme,
      organization,
      soundSystemRequired,
      projectorRequired,
      cateringRequired,
      equipmentAddons
    } = req.body;

    console.log('[MockBookings] Creating booking:', { packageId, checkIn, checkOut });

    // Validate contact number - must be exactly 11 digits
    if (contactNumber) {
      const digitsOnly = String(contactNumber).replace(/\D/g, '');
      if (digitsOnly.length !== 11) {
        console.warn('[MockBookings] Validation failed:', {
          field: 'contactNumber',
          value: contactNumber,
          digitCount: digitsOnly.length,
          error: 'Contact number must be exactly 11 digits',
          timestamp: new Date().toISOString()
        });
        return res.status(400).json({
          success: false,
          error: `Contact number must be exactly 11 digits (received ${digitsOnly.length} digits)`
        });
      }
    } else {
      console.warn('[MockBookings] Validation failed:', {
        field: 'contactNumber',
        error: 'Contact number is required',
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        error: 'Contact number is required'
      });
    }
    
    // Validate room capacity if per-room guests provided
    const ROOM_CAPACITY = 4; // Maximum guests per room
    if (Array.isArray(perRoomGuests) && perRoomGuests.length > 0) {
      for (const roomGuest of perRoomGuests) {
        const roomAdults = roomGuest.adults || 0;
        const roomChildren = roomGuest.children || 0;
        const roomTotal = roomAdults + roomChildren;
        
        if (roomTotal > ROOM_CAPACITY) {
          console.warn('[MockBookings] Validation failed:', {
            field: 'perRoomGuests',
            roomId: roomGuest.roomId || 'unknown',
            adults: roomAdults,
            children: roomChildren,
            total: roomTotal,
            capacity: ROOM_CAPACITY,
            error: `Room capacity exceeded: ${roomTotal} guests exceeds maximum of ${ROOM_CAPACITY}`,
            timestamp: new Date().toISOString()
          });
          return res.status(400).json({
            success: false,
            error: `Room ${roomGuest.roomId || 'unknown'} exceeds capacity: ${roomTotal} guests (maximum ${ROOM_CAPACITY} allowed)`
          });
        }
      }
    } else if (guests && typeof guests === 'object') {
      // Validate main guests object for single room bookings
      const totalGuests = (guests.adults || 0) + (guests.children || 0);
      if (totalGuests > ROOM_CAPACITY) {
        console.warn('[MockBookings] Validation failed:', {
          field: 'guests',
          adults: guests.adults || 0,
          children: guests.children || 0,
          total: totalGuests,
          capacity: ROOM_CAPACITY,
          error: `Guest count exceeds room capacity: ${totalGuests} guests exceeds maximum of ${ROOM_CAPACITY}`,
          timestamp: new Date().toISOString()
        });
        return res.status(400).json({
          success: false,
          error: `Guest count exceeds room capacity: ${totalGuests} guests (maximum ${ROOM_CAPACITY} allowed per room)`
        });
      }
    }

    // Verify package exists
    const packageData = mockClient.tables.packages.get(String(packageId));
    if (!packageData) {
      return res.status(404).json({
        success: false,
        error: `Package not found (ID: ${packageId})`
      });
    }
    
    // Validate cottage capacity if this is a cottage booking
    const COTTAGE_CAPACITY = 8; // Maximum guests per cottage
    if (packageData.category === 'cottages' && guests && typeof guests === 'object') {
      const totalGuests = (guests.adults || 0) + (guests.children || 0);
      if (totalGuests > COTTAGE_CAPACITY) {
        console.warn('[MockBookings] Validation failed:', {
          field: 'guests',
          category: 'cottages',
          adults: guests.adults || 0,
          children: guests.children || 0,
          total: totalGuests,
          capacity: COTTAGE_CAPACITY,
          error: `Guest count exceeds cottage capacity: ${totalGuests} guests exceeds maximum of ${COTTAGE_CAPACITY}`,
          timestamp: new Date().toISOString()
        });
        return res.status(400).json({
          success: false,
          error: `Guest count exceeds cottage capacity: ${totalGuests} guests (maximum ${COTTAGE_CAPACITY} allowed per cottage)`
        });
      }
    }

    // Generate booking ID
    const bookingId = Date.now().toString();
    const userId = req.body.userId || 'mock-user-1'; // Default user for mock mode
    const guestEmail = req.body.email || null; // Store guest email for user filtering
    const category = req.body.category || 'rooms'; // Store category (rooms, cottages, function-halls)

    // Build function hall metadata if this is a function hall booking
    const { buildFunctionHallMetadata } = await import('../utils/functionHallMetadata.js');
    const fhHallId = hallId || selectedHall || null;
    const fhMetadata = buildFunctionHallMetadata({
      hallId: fhHallId,
      hallName,
      eventName,
      eventType,
      setupType,
      decorationTheme,
      organization,
      startTime,
      endTime,
      soundSystemRequired,
      projectorRequired,
      cateringRequired,
      equipmentAddons
    });
    
    if (fhMetadata) {
      console.log('[MockBookings] Function hall metadata created:', JSON.stringify(fhMetadata, null, 2));
    } else if (category === 'function-halls' && fhHallId) {
      console.log('[MockBookings] ⚠️ Function hall booking but metadata is null - insufficient event data');
      console.log('[MockBookings] Missing fields:', {
        hasEventName: !!eventName,
        hasEventType: !!eventType,
        hasSetupType: !!setupType,
        hasStartTime: !!startTime,
        hasEndTime: !!endTime
      });
    }
    
    // Create booking
    const booking = {
      id: bookingId,
      user_id: userId,
      guest_email: guestEmail,
      package_id: packageId,
      check_in: checkIn,
      check_out: checkOut,
      guests: guests,
      total_cost: totalCost,
      payment_mode: paymentMode,
      contact_number: contactNumber,
      special_requests: specialRequests || '',
      category: category, // Store category for filtering and re-edit
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    // Add function hall metadata if available
    if (fhMetadata) {
      booking.function_hall_metadata = fhMetadata;
    }
    
    console.log('[MockBookings] Creating booking with user association:', { userId, email: guestEmail });
    if (fhMetadata) {
      console.log('[MockBookings] Booking includes function_hall_metadata');
    }

    mockClient.tables.bookings.set(bookingId, booking);

    // Create booking items for rooms
    if (perRoomGuests && perRoomGuests.length > 0) {
      perRoomGuests.forEach(room => {
        const itemId = `${bookingId}-${room.roomId}`;
        mockClient.tables.booking_items.set(itemId, {
          id: itemId,
          booking_id: bookingId,
          item_type: 'room',
          item_id: room.roomId,
          guest_name: room.guestName,
          adults: room.adults,
          children: room.children
        });
      });
    }

    // Create booking items for cottages
    // For cottages added to room bookings, create an item for each cottage on each selected date
    if (selectedCottages && selectedCottages.length > 0) {
      console.log('[MockBookings] 🏠 Creating cottage items:', { selectedCottages, cottageDates });
      
      if (cottageDates && cottageDates.length > 0) {
        // Cottage rental with specific dates - create item for each cottage on each date
        let itemCounter = 0;
        selectedCottages.forEach(cottageId => {
          cottageDates.forEach(date => {
            const itemId = `${bookingId}-cottage-${itemCounter++}`;
            console.log('[MockBookings] 🏠 Creating cottage item:', { itemId, cottageId, usage_date: date });
            mockClient.tables.booking_items.set(itemId, {
              id: itemId,
              booking_id: bookingId,
              item_type: 'cottage',
              item_id: cottageId,
              usage_date: date,  // Store the specific date for this cottage rental
              guest_name: guests?.adults ? `${guests.adults} adults, ${guests.children || 0} children` : null,
              adults: guests?.adults || 0,
              children: guests?.children || 0
            });
          });
        });
      } else {
        // Regular cottage booking (full date range) - create one item per cottage
        selectedCottages.forEach((cottageId, index) => {
          const itemId = `${bookingId}-cottage-${index}`;
          console.log('[MockBookings] 🏠 Creating cottage item (date range):', { itemId, cottageId });
          mockClient.tables.booking_items.set(itemId, {
            id: itemId,
            booking_id: bookingId,
            item_type: 'cottage',
            item_id: cottageId,
            guest_name: guests?.adults ? `${guests.adults} adults, ${guests.children || 0} children` : null,
            adults: guests?.adults || 0,
            children: guests?.children || 0
          });
        });
      }
    }

    // Create booking items for function halls
    // Use the same hallId we used for metadata (already defined above as fhHallId)
    const finalHallId = fhHallId;
    const eventDate = (checkIn && checkOut && checkIn === checkOut) ? checkIn : (req.body.eventDate || req.body.dates?.eventDate || null);
    if (finalHallId) {
      const itemId = `${bookingId}-hall`;
      mockClient.tables.booking_items.set(itemId, {
        id: itemId,
        booking_id: bookingId,
        item_type: 'function-hall',
        item_id: finalHallId,
        usage_date: eventDate || checkIn
      });
    }

    // Get booking items for response
    const bookingItems = Array.from(mockClient.tables.booking_items.values())
      .filter(item => item.booking_id === bookingId);

    const bookingResponse = {
      ...booking,
      booking_items: bookingItems,
      packages: packageData
    };

    console.log('[MockBookings] Booking created:', bookingId);

    res.status(201).json({
      success: true,
      data: bookingResponse
    });
  } catch (error) {
    console.error('[MockBookings] Create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create booking' });
  }
});

// PATCH /mock/bookings/:id - Update existing booking (no auth required)
router.patch('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('[MockBookings] Updating booking:', id, updates);
    
    // Get existing booking
    const existingBooking = mockClient.tables.bookings.get(id);
    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        error: `Booking not found (ID: ${id})`
      });
    }
    
    // Permission check: verify user owns this booking
    const requestUserId = updates.userId;
    const requestEmail = updates.email;
    const bookingUserId = existingBooking.user_id;
    const bookingEmail = existingBooking.guest_email;
    
    if (requestUserId || requestEmail) {
      const isOwner = (requestUserId && bookingUserId === requestUserId) || 
                      (requestEmail && bookingEmail === requestEmail);
      if (!isOwner) {
        console.log('[MockBookings] Unauthorized edit attempt:', {
          requestUserId,
          requestEmail,
          bookingUserId,
          bookingEmail
        });
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: Cannot edit this booking'
        });
      }
    }
    
    // If package is changing, verify it exists
    if (updates.packageId && updates.packageId !== existingBooking.package_id) {
      const packageData = mockClient.tables.packages.get(String(updates.packageId));
      if (!packageData) {
        return res.status(404).json({
          success: false,
          error: `Package not found (ID: ${updates.packageId})`
        });
      }
    }
    
    // Build function hall metadata if updating function hall booking
    const { buildFunctionHallMetadata } = await import('../utils/functionHallMetadata.js');
    const fhMetadata = buildFunctionHallMetadata({
      hallId: updates.hallId || updates.selectedHall,
      hallName: updates.hallName,
      eventName: updates.eventName,
      eventType: updates.eventType,
      setupType: updates.setupType,
      decorationTheme: updates.decorationTheme,
      organization: updates.organization,
      startTime: updates.startTime,
      endTime: updates.endTime,
      soundSystemRequired: updates.soundSystemRequired,
      projectorRequired: updates.projectorRequired,
      cateringRequired: updates.cateringRequired,
      equipmentAddons: updates.equipmentAddons
    });
    
    if (fhMetadata) {
      console.log('[MockBookings] Function hall metadata for update:', JSON.stringify(fhMetadata, null, 2));
    }
    
    // Update booking
    const updatedBooking = {
      ...existingBooking,
      package_id: updates.packageId || existingBooking.package_id,
      check_in: updates.checkIn || existingBooking.check_in,
      check_out: updates.checkOut || existingBooking.check_out,
      guests: updates.guests || existingBooking.guests,
      total_cost: updates.totalCost || existingBooking.total_cost,
      payment_mode: updates.paymentMode || existingBooking.payment_mode,
      contact_number: updates.contactNumber || existingBooking.contact_number,
      special_requests: updates.specialRequests !== undefined ? updates.specialRequests : existingBooking.special_requests,
      category: updates.category || existingBooking.category || 'rooms', // Preserve category or default to rooms
      updated_at: new Date().toISOString()
    };
    
    // Update function hall metadata if provided, otherwise preserve existing
    if (fhMetadata) {
      updatedBooking.function_hall_metadata = fhMetadata;
      console.log('[MockBookings] Updated booking includes function_hall_metadata');
    } else if (updates.hallId || updates.selectedHall) {
      // If hall is being updated but metadata is null, preserve existing metadata or set to empty
      updatedBooking.function_hall_metadata = existingBooking.function_hall_metadata || null;
    }
    
    mockClient.tables.bookings.set(id, updatedBooking);
    
    // Update booking items if provided
    if (updates.perRoomGuests) {
      // Remove old room items
      Array.from(mockClient.tables.booking_items.values())
        .filter(item => item.booking_id === id && item.item_type === 'room')
        .forEach(item => mockClient.tables.booking_items.delete(item.id));
      
      // Add new room items
      updates.perRoomGuests.forEach(room => {
        const itemId = `${id}-${room.roomId}`;
        mockClient.tables.booking_items.set(itemId, {
          id: itemId,
          booking_id: id,
          item_type: 'room',
          item_id: room.roomId,
          guest_name: room.guestName,
          adults: room.adults,
          children: room.children
        });
      });
    }
    
    // Update cottages if provided
    if (updates.selectedCottages) {
      console.log('[MockBookings] 🏠 Updating cottage items:', { selectedCottages: updates.selectedCottages, cottageDates: updates.cottageDates });
      
      // Remove old cottage items
      Array.from(mockClient.tables.booking_items.values())
        .filter(item => item.booking_id === id && item.item_type === 'cottage')
        .forEach(item => mockClient.tables.booking_items.delete(item.id));
      
      // Add new cottage items
      if (updates.cottageDates && updates.cottageDates.length > 0) {
        // Cottage rental with specific dates - create item for each cottage on each date
        let itemCounter = 0;
        updates.selectedCottages.forEach(cottageId => {
          updates.cottageDates.forEach(date => {
            const itemId = `${id}-cottage-${itemCounter++}`;
            console.log('[MockBookings] 🏠 Creating cottage item (update):', { itemId, cottageId, usage_date: date });
            mockClient.tables.booking_items.set(itemId, {
              id: itemId,
              booking_id: id,
              item_type: 'cottage',
              item_id: cottageId,
              usage_date: date,  // Store the specific date for this cottage rental
              guest_name: updates.guests?.adults ? `${updates.guests.adults} adults, ${updates.guests.children || 0} children` : null,
              adults: updates.guests?.adults || 0,
              children: updates.guests?.children || 0
            });
          });
        });
      } else {
        // Regular cottage booking (full date range) - create one item per cottage
        updates.selectedCottages.forEach((cottageId, index) => {
          const itemId = `${id}-cottage-${index}`;
          console.log('[MockBookings] 🏠 Creating cottage item (update, date range):', { itemId, cottageId });
          mockClient.tables.booking_items.set(itemId, {
            id: itemId,
            booking_id: id,
            item_type: 'cottage',
            item_id: cottageId,
            guest_name: updates.guests?.adults ? `${updates.guests.adults} adults, ${updates.guests.children || 0} children` : null,
            adults: updates.guests?.adults || 0,
            children: updates.guests?.children || 0
          });
        });
      }
    }
    
    // Update function halls if provided
    const hallId = updates.hallId || updates.selectedHall;
    if (hallId) {
      console.log('[MockBookings] Updating function hall item:', hallId);
      // Remove old function hall items
      Array.from(mockClient.tables.booking_items.values())
        .filter(item => item.booking_id === id && item.item_type === 'function-hall')
        .forEach(item => mockClient.tables.booking_items.delete(item.id));
      
      // Add new function hall item
      const itemId = `${id}-hall`;
      const eventDate = (updates.checkIn && updates.checkOut && updates.checkIn === updates.checkOut) 
        ? updates.checkIn 
        : (updates.eventDate || updates.dates?.eventDate || updates.checkIn || existingBooking.check_in);
      
      mockClient.tables.booking_items.set(itemId, {
        id: itemId,
        booking_id: id,
        item_type: 'function-hall',
        item_id: hallId,
        usage_date: eventDate
      });
      console.log('[MockBookings] Function hall item updated:', { itemId, hallId, usage_date: eventDate });
    }
    
    // Get updated booking items
    const bookingItems = Array.from(mockClient.tables.booking_items.values())
      .filter(item => item.booking_id === id);
    
    const packageData = mockClient.tables.packages.get(String(updatedBooking.package_id));
    
    const bookingResponse = {
      ...updatedBooking,
      booking_items: bookingItems,
      packages: packageData
    };
    
    console.log('[MockBookings] Booking updated:', id);
    
    res.json({
      success: true,
      data: bookingResponse
    });
  } catch (error) {
    console.error('[MockBookings] Update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update booking' });
  }
});

// DELETE /mock/bookings/:id - Cancel booking (no auth required)
router.delete('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, email } = req.query; // Get from query params
    
    console.log('[MockBookings] Cancelling booking:', id, { userId, email });
    
    const existingBooking = mockClient.tables.bookings.get(id);
    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        error: `Booking not found (ID: ${id})`
      });
    }
    
    // Permission check: verify user owns this booking
    if (userId || email) {
      const bookingUserId = existingBooking.user_id;
      const bookingEmail = existingBooking.guest_email;
      const isOwner = (userId && bookingUserId === userId) || 
                      (email && bookingEmail === email);
      if (!isOwner) {
        console.log('[MockBookings] Unauthorized cancel attempt:', {
          requestUserId: userId,
          requestEmail: email,
          bookingUserId,
          bookingEmail
        });
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: Cannot cancel this booking'
        });
      }
    }
    
    // Update status to cancelled instead of deleting
    const cancelledBooking = {
      ...existingBooking,
      status: 'cancelled',
      updated_at: new Date().toISOString()
    };
    
    mockClient.tables.bookings.set(id, cancelledBooking);
    
    console.log('[MockBookings] Booking cancelled:', id);
    
    res.json({
      success: true,
      data: cancelledBooking,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('[MockBookings] Cancel error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel booking' });
  }
});

// Category normalization helper - handles singular/plural forms and undefined
function normalizeCategory(category) {
  if (!category) return 'rooms'; // Default fallback
  
  const normalized = category.toLowerCase().trim();
  
  // Handle singular and plural forms
  if (normalized === 'room' || normalized === 'rooms') return 'rooms';
  if (normalized === 'cottage' || normalized === 'cottages') return 'cottages';
  if (normalized === 'function-hall' || normalized === 'function-halls' || normalized === 'functionhall' || normalized === 'functionhalls') {
    return 'function-halls';
  }
  
  // Return as-is if already in correct format
  return normalized;
}

// GET /mock/bookings/availability/:packageId - Check availability (no auth required)
router.get('/bookings/availability/:packageId', async (req, res) => {
  console.log('[MockAvailability] ⚡ Availability endpoint hit!');
  try {
    const { packageId } = req.params;
    const { checkIn, checkOut, category, excludeBookingId } = req.query;
    
    // Normalize requested category
    const requestedCategory = normalizeCategory(category);
    
    console.log(`[MockAvailability] Request for package ${packageId} from ${checkIn} to ${checkOut}, category: ${category || 'all'} (normalized: ${requestedCategory}), excludeBookingId: ${excludeBookingId || 'none'}`);
    console.log(`[MockAvailability] Full query params:`, req.query);
    console.log(`[MockAvailability] Request URL:`, req.originalUrl);
    
    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        error: 'Check-in and check-out dates required'
      });
    }
    
    // Map normalized category to itemType for booking_items filtering
    const itemTypeMap = {
      'rooms': 'room',
      'cottages': 'cottage',
      'function-halls': 'function-hall'
    };
    const itemType = itemTypeMap[requestedCategory] || 'room';
    
    console.log(`[MockAvailability] Looking for item_type='${itemType}' for category '${requestedCategory}'`);
    
    // Get all bookings from mock database
    const allBookings = Array.from(mockClient.tables.bookings.values());
    
    // Add debug logging
    console.log(`[MockAvailability] Total bookings in mock DB: ${allBookings.length}`);
    if (allBookings.length > 0) {
      console.log(`[MockAvailability] Sample booking IDs: ${allBookings.slice(0, 3).map(b => b.id).join(', ')}`);
      
      // Log booking categories found in database for diagnostic purposes
      const bookingCategories = allBookings.map(b => b.category || 'undefined').filter((cat, idx, arr) => arr.indexOf(cat) === idx);
      console.log(`[MockAvailability] Booking categories found in DB:`, bookingCategories);
      console.log(`[MockAvailability] Example booking categories (first 5):`, 
        allBookings.slice(0, 5).map(b => ({ id: b.id, category: b.category || 'undefined' })));
    }
    
    // Helper function to normalize date strings to YYYY-MM-DD format (returns string, not Date)
    function normalizeDateString(dateStr) {
      if (!dateStr) return null;
      const dateStrTrimmed = dateStr.trim();
      
      // If already in YYYY-MM-DD format, return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStrTrimmed)) {
        return dateStrTrimmed;
      }
      
      // Parse date and extract local date components (avoid timezone issues)
      const d = dateStrTrimmed.includes('T') 
        ? new Date(dateStrTrimmed)
        : new Date(dateStrTrimmed + 'T00:00:00');
      
      // Return YYYY-MM-DD string using local date components
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Filter for relevant bookings (pending/confirmed, matching package, date overlap)
    // Normalize dates to YYYY-MM-DD strings to avoid timezone issues
    const checkInDateStr = normalizeDateString(checkIn);
    const checkOutDateStr = normalizeDateString(checkOut);
    
    console.log(`[MockAvailability] Normalized checkIn: ${checkInDateStr}, checkOut: ${checkOutDateStr}`);
    console.log(`[MockAvailability] Original dates checkIn: ${checkIn}, checkOut: ${checkOut}`);
    
    if (!checkInDateStr || !checkOutDateStr) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid date format. Use YYYY-MM-DD.' 
      });
    }
    
    // Filter bookings by category (if provided) - this ensures category-specific availability
    const relevantBookings = allBookings.filter(booking => {
      if (booking.package_id != packageId) return false;
      if (!['pending', 'confirmed'].includes(booking.status)) return false;
      
      // Don't filter bookings by category here!
      // Instead, we'll filter booking_items by item_type later.
      // This ensures that cottage items from room bookings are included
      // when checking cottage availability.
      
      // Exclude the booking being re-edited from conflict checks
      if (excludeBookingId && booking.id == excludeBookingId) {
        console.log(`[MockAvailability] Excluding booking ${booking.id} from conflict checks (re-edit mode)`);
        return false;
      }
      
      // Normalize booking dates to YYYY-MM-DD strings
      const bookingStart = normalizeDateString(booking.check_in);
      const bookingEnd = normalizeDateString(booking.check_out);
      
      if (!bookingStart || !bookingEnd) return false;
      
      // Robust overlap: booking intersects selected range in any way
      // Overlap if booking starts on/before checkout AND ends on/after check-in
      return bookingStart <= checkOutDateStr && bookingEnd >= checkInDateStr;
    });
    
    console.log(`[MockAvailability] 📦 Filtered to ${relevantBookings.length} bookings with date overlap (from ${allBookings.length} total)`);
    console.log(`[MockAvailability] 🔍 Will filter booking_items by item_type='${itemType}' for category: '${requestedCategory}'`);
    console.log(`[MockAvailability] 💡 Note: Including ALL bookings (rooms, cottages, etc.) to find items of requested type`);
    
    // Get booking items for these bookings
    const bookedItems = [];
    relevantBookings.forEach(booking => {
      const items = Array.from(mockClient.tables.booking_items.values())
        .filter(item => item.booking_id === booking.id && item.item_type === itemType);
      
      items.forEach(item => {
        // Double-check: skip items from excluded booking (safety check)
        if (excludeBookingId && item.booking_id == excludeBookingId) {
          console.log(`[MockAvailability] 🚫 Skipping item ${item.item_id} from excluded booking ${excludeBookingId}`);
          return;
        }
        
        bookedItems.push({
          ...item,
          booking: booking
        });
      });
    });
    
    if (excludeBookingId) {
      console.log(`[MockAvailability] ✅ After exclusion, bookedItems count: ${bookedItems.length}`);
    }
    
    console.log(`[MockAvailability] 🔍 Found ${bookedItems.length} booked items of type '${itemType}' for category '${category || 'all'}'`);
    if (bookedItems.length > 0) {
      console.log(`[MockAvailability] 🔍 Sample booked items:`, bookedItems.slice(0, 3).map(item => ({
        item_id: item.item_id,
        item_type: item.item_type,
        usage_date: item.usage_date,
        booking_id: item.booking_id
      })));
      const itemsWithUsageDate = bookedItems.filter(item => item.usage_date);
      console.log(`[MockAvailability] 🔍 Items with usage_date: ${itemsWithUsageDate.length}/${bookedItems.length}`);
      if (itemsWithUsageDate.length > 0) {
        console.log(`[MockAvailability] 🔍 Usage dates found:`, itemsWithUsageDate.map(i => ({ item_id: i.item_id, usage_date: i.usage_date })));
      }
    }
    try {
      const typeSample = Array.from(new Set(bookedItems.map(b => b.item_type))).join(', ');
      console.log('[MockAvailability] Item types seen in bookedItems:', typeSample || 'none');
    } catch {}

    // Build an upfront overlap exclusion set for the entire selected range
    // Any item that appears in any overlapping booking is excluded from availableRooms
    const overlappingBookedItemIds = new Set();
    relevantBookings.forEach(booking => {
      const bookingStart = normalizeDateString(booking.check_in);
      const bookingEnd = normalizeDateString(booking.check_out);
      const items = bookedItems
        .filter(bi => bi.booking.id === booking.id)
        .map(bi => String(bi.item_id).trim());
      if (items.length > 0) {
        items.forEach(id => overlappingBookedItemIds.add(id));
        console.log(`[Availability] Excluding ${items.join(', ')} — overlaps with ${bookingStart} to ${bookingEnd}`);
      }
    });
    if (overlappingBookedItemIds.size > 0) {
      console.log('[Availability] Final exclusion set for request:', Array.from(overlappingBookedItemIds).join(', '));
    } else {
      console.log('[Availability] No overlapping items found for request — no upfront exclusions applied');
    }
    
    // Additional debug: show date ranges being processed
    console.log(`[MockAvailability] Processing date range (exclusive checkout): ${checkInDateStr} to ${checkOutDateStr}`);
    
    // Define available items based on type
    let allItems;
    if (itemType === 'room') {
      allItems = ['Room 01', 'Room 02', 'Room 03', 'Room 04'];
    } else if (itemType === 'cottage') {
      allItems = ['Standard Cottage', 'Open Cottage', 'Family Cottage'];
    } else if (itemType === 'function-hall') {
      allItems = ['Grand Function Hall', 'Intimate Function Hall'];
    } else {
      allItems = [];
    }
    
    console.log(`[MockAvailability] Defined ${allItems.length} available items for itemType '${itemType}':`, allItems);
    
    // Build date-by-date availability map using pure string iteration
    const dateAvailability = {};
    const bookedDates = [];
    
    // Parse check-in and check-out dates as local dates for iteration
    const [checkInYear, checkInMonth, checkInDay] = checkInDateStr.split('-').map(Number);
    const [checkOutYear, checkOutMonth, checkOutDay] = checkOutDateStr.split('-').map(Number);
    
    console.log(`[MockAvailability] 🔍 DATE LOOP STARTING: checkIn=${checkInDateStr}, checkOut=${checkOutDateStr}`);
    console.log(`[MockAvailability] 🔍 Parsed dates: Year=${checkInYear}, Month=${checkInMonth}, Day=${checkInDay}`);
    
    // Iterate through dates using pure string arithmetic (avoid timezone issues)
    let currentYear = checkInYear;
    let currentMonth = checkInMonth;
    let currentDay = checkInDay;
    let iterationCount = 0;
    
    while (true) {
      iterationCount++;
      console.log(`[MockAvailability] 🔁 Loop iteration ${iterationCount}: currentDate=${currentYear}-${currentMonth}-${currentDay}`);
      
      // Build date string (YYYY-MM-DD format)
      const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
      console.log(`[MockAvailability] 🔁 Built dateString="${dateString}" (format: YYYY-MM-DD), checkOutDateStr="${checkOutDateStr}"`);
      console.log(`[MockAvailability] 🔁 Comparison: "${dateString}" > "${checkOutDateStr}" = ${dateString > checkOutDateStr}`);
      
      // Stop once we reach checkout date (exclusive checkout semantics)
      // Changed from >= to > to support single-day bookings where checkIn === checkOut
      if (dateString > checkOutDateStr) {
        console.log(`[MockAvailability] 🛑 Loop terminating: dateString > checkOutDateStr`);
        break;
      }
      
      const bookedIds = [];
      
      // Check each booked item for this date using string comparison
      bookedItems.forEach(item => {
        // Defensive guard against undefined items or item_ids
        if (!item || !item.item_id) return;
        
        // Special handling for cottages with usage_date field
        if (item.usage_date) {
          const usageDateStr = normalizeDateString(item.usage_date);
          if (usageDateStr === dateString) {
            const itemIdStr = String(item.item_id).trim();
            // Prevent duplicates - same cottage can't be booked twice on same date
            if (!bookedIds.includes(itemIdStr)) {
              bookedIds.push(itemIdStr);
            }
          }
          return;
        }
        
        const booking = item.booking;
        // Normalize booking dates to YYYY-MM-DD strings
        const bookingCheckIn = normalizeDateString(booking.check_in);
        const bookingCheckOut = normalizeDateString(booking.check_out);
        
        if (!bookingCheckIn || !bookingCheckOut) return;
        
        // Check if this is a single-day booking (cottage/function hall)
        const isSingleDayBooking = bookingCheckIn === bookingCheckOut;
        
        // For single-day bookings, use inclusive comparison
        // For multi-day bookings, use [check_in, check_out) semantics
        const isDateBooked = isSingleDayBooking 
          ? dateString === bookingCheckIn
          : (dateString >= bookingCheckIn && dateString < bookingCheckOut);
        
        if (isDateBooked) {
          // Normalize item_id to string for consistent comparison
          const itemIdStr = String(item.item_id).trim();
          // Prevent duplicates - same item can't be booked twice on same date
          if (!bookedIds.includes(itemIdStr)) {
            bookedIds.push(itemIdStr);
          } else {
            console.log(`[MockAvailability] ⚠️ Duplicate ${itemType} ${itemIdStr} on ${dateString} - skipping`);
          }
          
          // Enhanced logging for single-day bookings
          if (isSingleDayBooking && itemType === 'cottage') {
            console.log(`[MockAvailability] Date ${dateString}: isSingleDay=true, isBooked=true, bookingCheckIn=${bookingCheckIn}, item=${item.item_id}`);
          }
          
          bookedDates.push({
            date: dateString,
            bookingStart: booking.check_in,
            bookingEnd: booking.check_out,
            itemId: item.item_id,
            guestName: item.guest_name,
            adults: item.adults,
            children: item.children
          });
        }
      });
      
      // Calculate availability per day: only remove items booked on THIS date
      // Normalize bookedIds for consistent string comparison
      const bookedIdsNormalized = bookedIds.map(id => String(id).trim());
      const availableItems = allItems.filter(id => !bookedIdsNormalized.includes(String(id).trim()));

      // Per-day diagnostics: log booked and available arrays
      if (itemType === 'room') {
        console.log(`[MockAvailability] date ${dateString}: bookedRooms=[${bookedIds.join(', ')}], availableRooms=[${availableItems.join(', ')}]`);
      } else {
        console.log(`[MockAvailability] date ${dateString}: bookedItems=[${bookedIds.join(', ')}], availableItems=[${availableItems.join(', ')}], category=${requestedCategory}`);
      }

      // Optional assertion: ensure disjoint sets and counts sum to total
      try {
        const overlap = bookedIds.filter(id => availableItems.includes(id));
        if (overlap.length > 0) {
          console.warn(`[MockAvailability] ⚠️ Assertion failed: overlap between booked and available on ${dateString}:`, overlap);
        }
        const total = availableItems.length + bookedIds.length;
        if (total > allItems.length) {
          console.warn(`[MockAvailability] ⚠️ Assertion failed: counts exceed total on ${dateString}: booked=${bookedIds.length}, available=${availableItems.length}, total=${allItems.length}`);
        }
      } catch (e) {
        // ignore
      }
      
      let status;
      if (itemType === 'room') {
        if (availableItems.length === 0) {
          status = 'booked-all';
        } else if (availableItems.length === 4) {
          status = 'available-all';
        } else {
          status = `available-${availableItems.length}`;
        }
        
        dateAvailability[dateString] = {
          status: status,
          availableCount: availableItems.length,
          bookedCount: bookedIds.length,
          bookedRooms: bookedIds,
          availableRooms: availableItems
        };
      } else if (itemType === 'cottage') {
        // Granular cottage status matching real endpoint
        if (bookedIds.length === 0) {
          status = 'cottage-available';
        } else if (bookedIds.length === allItems.length) {
          status = 'cottage-booked-all';
        } else {
          status = 'cottage-booked-partial';
        }
        
        console.log(`[MockAvailability] Building response for ${dateString}, itemType: ${itemType}, category: ${requestedCategory}, status: ${status}`);
        
        dateAvailability[dateString] = {
          status: status,
          isBooked: bookedIds.length === allItems.length,  // All cottages booked = fully booked
          bookedCount: bookedIds.length,
          availableCount: availableItems.length,
          bookedItems: bookedIds,
          availableItems: availableItems,
          bookedCottages: bookedIds,
          availableCottages: availableItems,
          category: requestedCategory
        };
        
        console.log(`[MockAvailability] ✅ Created dateAvailability entry for ${dateString}`);
        console.log(`[MockAvailability]    status=${status}, bookedCount=${bookedIds.length}, availableCount=${availableItems.length}`);
        console.log(`[MockAvailability]    bookedCottages=${JSON.stringify(bookedIds)}, availableCottages=${JSON.stringify(availableItems)}`);
        
        // Enhanced logging for booked cottages
        if (bookedIds.length > 0) {
          const isFullyBooked = bookedIds.length === allItems.length;
          console.log(`[MockAvailability] ⚠️  ${dateString} HAS BOOKINGS: bookedCount=${bookedIds.length}, isBooked=${isFullyBooked}, status=${status}`);
        }
      } else {
        // Function hall (use same logic as cottages)
        if (bookedIds.length === 0) {
          status = 'cottage-available';
        } else if (bookedIds.length === allItems.length) {
          status = 'cottage-booked-all';
        } else {
          status = 'cottage-booked-partial';
        }
        
        console.log(`[MockAvailability] Building response for ${dateString}, itemType: ${itemType}, category: ${requestedCategory}, status: ${status}`);
        
        dateAvailability[dateString] = {
          status: status,
          isBooked: bookedIds.length === allItems.length,  // All halls booked = fully booked
          bookedCount: bookedIds.length,
          availableCount: availableItems.length,
          bookedItems: bookedIds,
          availableItems: availableItems,
          bookedHalls: bookedIds,
          availableHalls: availableItems,
          category: requestedCategory
        };
        
        // Enhanced logging for booked function halls
        if (bookedIds.length > 0) {
          const isFullyBooked = bookedIds.length === allItems.length;
          console.log(`[MockAvailability] ${dateString}: bookedCount=${bookedIds.length}, isBooked=${isFullyBooked}, status=${status}, bookedHalls=${JSON.stringify(bookedIds)}, availableHalls=${JSON.stringify(availableItems)}`);
        }
      }
      
      // Move to next day using pure date arithmetic
      const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
      currentDay++;
      if (currentDay > daysInCurrentMonth) {
        currentDay = 1;
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
      
      // Safety check to prevent infinite loops
      if (currentYear > checkOutYear || 
          (currentYear === checkOutYear && currentMonth > checkOutMonth) ||
          (currentYear === checkOutYear && currentMonth === checkOutMonth && currentDay > checkOutDay)) {
        break;
      }
    }
    
    // Calculate overall availability
    const allDatesAvailable = Object.values(dateAvailability).every(day => 
      itemType === 'room' ? day.availableCount > 0 : !day.isBooked
    );
    
    const avgAvailability = itemType === 'room' 
      ? Math.round(Object.values(dateAvailability).reduce((sum, day) => sum + day.availableCount, 0) / Object.keys(dateAvailability).length)
      : (allDatesAvailable ? allItems.length : 0);
    
    // Count booked dates for debug logging
    const bookedDateCount = Object.values(dateAvailability).filter(day => 
      itemType === 'room' ? day.availableCount === 0 : day.isBooked
    ).length;
    
    console.log(`[MockAvailability] Category '${requestedCategory}': Overall availability: ${allDatesAvailable}, avg: ${avgAvailability}, booked dates: ${bookedDateCount}/${Object.keys(dateAvailability).length}`);
    console.log(`[MockAvailability] 📋 Final dateAvailability keys (YYYY-MM-DD format):`, Object.keys(dateAvailability));
    console.log(`[MockAvailability] 📋 Sample key format check:`, Object.keys(dateAvailability).length > 0 ? `First key: "${Object.keys(dateAvailability)[0]}" matches YYYY-MM-DD: ${/^\d{4}-\d{2}-\d{2}$/.test(Object.keys(dateAvailability)[0])}` : 'No keys');
    if (requestedCategory === 'function-halls') {
      console.log(`[MockAvailability] 🏛️ Function halls final data:`, JSON.stringify(dateAvailability, null, 2));
    }

    // Compute range-level availability across the entire requested window
    // Rooms: list those free on every date in the range
    let rangeAvailableRooms = [];
    let rangeBookedItems = [];
    if (itemType === 'room') {
      const rangeBookedSet = new Set();
      Object.values(dateAvailability).forEach(day => {
        if (Array.isArray(day.bookedRooms)) {
          day.bookedRooms.forEach(id => rangeBookedSet.add(id));
        }
      });
      rangeBookedItems = Array.from(rangeBookedSet);
      rangeAvailableRooms = allItems.filter(id => !rangeBookedSet.has(id));
      console.log(`[RangeAvailability] Final available rooms for ${checkInDateStr}→${checkOutDateStr}:`, rangeAvailableRooms);
    } else {
      const rangeBookedSet = new Set();
      Object.values(dateAvailability).forEach(day => {
        const bookedArr = requestedCategory === 'function-halls' ? day.bookedHalls : day.bookedCottages;
        if (Array.isArray(bookedArr)) bookedArr.forEach(id => rangeBookedSet.add(id));
      });
      rangeBookedItems = Array.from(rangeBookedSet);
    }

    res.json({
      success: true,
      available: allDatesAvailable,
      avgRoomAvailability: avgAvailability,
      dateAvailability: dateAvailability,
      bookedDates: bookedDates,
      rangeAvailableRooms: itemType === 'room' ? rangeAvailableRooms : undefined,
      rangeBookedItems: rangeBookedItems,
      message: allDatesAvailable ? 'Accommodation available' : 'Fully booked for selected dates'
    });
  } catch (error) {
    console.error('[MockAvailability] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to check availability' });
  }
});

export default router;

