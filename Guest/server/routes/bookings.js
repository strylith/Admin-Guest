import express from 'express';
import { db } from '../db/databaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { buildFunctionHallMetadata } from '../utils/functionHallMetadata.js';

const router = express.Router();

/**
 * Format a date to YYYY-MM-DD string using local date components
 * This avoids timezone shifts that occur with toISOString()
 * @param {Date|string} dateInput - Date object or date string
 * @returns {string} YYYY-MM-DD format string
 */
function formatDateToYMD(dateInput) {
  if (!dateInput) return null;
  
  let date;
  if (typeof dateInput === 'string') {
    // Handle date strings (with or without time component)
    date = dateInput.includes('T') ? new Date(dateInput) : new Date(dateInput + 'T00:00:00');
  } else {
    date = new Date(dateInput);
  }
  
  // Ensure we're working with local midnight
  date.setHours(0, 0, 0, 0);
  
  // Extract local date components (not UTC)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// GET /api/bookings/availability/:packageId - Check availability for date range (no auth required)
router.get('/availability/:packageId', async (req, res) => {
  try {
    const { packageId } = req.params;
    const { checkIn, checkOut, category, excludeBookingId } = req.query;

    console.log(`[Availability] Request received for package ${packageId} from ${checkIn} to ${checkOut}, category: ${category || 'all'}`);
    console.log(`[Availability] 📅 Calendar Page Request: ${req.get('referer') || 'Unknown source'}`);
    if (excludeBookingId) {
      console.log(`[Availability] 🔄 Excluding booking ${excludeBookingId} (type: ${typeof excludeBookingId}) from availability check (re-edit mode)`);
    } else {
      console.log(`[Availability] ℹ️ No excludeBookingId provided (normal booking mode)`);
    }

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        error: 'Check-in and check-out dates required'
      });
    }
    
    // Determine item type from category
    const itemType = category === 'cottages' ? 'cottage' :
                     category === 'function-halls' ? 'function-hall' : 'room';
    
    console.log(`[Availability] 🔍 Querying booking_items for item_type='${itemType}'`);
    console.log(`[Availability] 🔍 Category: ${category}, ItemType: ${itemType}, PackageId: ${packageId}`);
    
    // Query booking_items with joined booking data
    // This is the single source of truth for all booked items
    let query = db
      .from('booking_items')
      .select(`
        id,
        item_id,
        item_type,
        usage_date,
        guest_name,
        adults,
        children,
        bookings!inner (
          id,
          package_id,
          check_in,
          check_out,
          status
        )
      `)
      .eq('item_type', itemType);
    
    // Only filter by package_id for rooms (multi-day bookings)
    // Cottages/halls are shared resources - check all packages
    if (itemType === 'room') {
      query = query.eq('bookings.package_id', packageId);
      console.log(`[Availability] 🔍 Filtering rooms by package_id=${packageId}`);
    } else {
      console.log(`[Availability] 🔍 Checking all packages for ${itemType} (shared resource)`);
    }
    
    const { data: bookedItems, error } = await query;
    
    console.log(`[Availability] 🔍 Query returned ${bookedItems?.length || 0} booking_items`);
    console.log(`[Availability] 🔍 Query details:`, {
      itemType,
      category,
      packageId,
      packageFilterApplied: itemType === 'room',
      dateRange: `${checkIn} to ${checkOut}`,
      excludeBookingId: excludeBookingId || 'none'
    });
    if (bookedItems && bookedItems.length > 0) {
      console.log(`[Availability] 🔍 Sample booking_items:`, JSON.stringify(bookedItems.slice(0, 3), null, 2));
      console.log(`[Availability] 🔍 All booking IDs in query results:`, bookedItems.map(i => i.bookings?.id).filter(Boolean));
      const itemsWithUsageDate = bookedItems.filter(item => item.usage_date);
      console.log(`[Availability] 🔍 Items with usage_date: ${itemsWithUsageDate.length}/${bookedItems.length}`);
      if (itemsWithUsageDate.length > 0) {
        console.log(`[Availability] 🔍 Sample items with usage_date:`, itemsWithUsageDate.slice(0, 3).map(i => ({ item_id: i.item_id, usage_date: i.usage_date, booking_id: i.bookings?.id })));
      }
    } else {
      console.log(`[Availability] ℹ️ No booking_items found for item_type='${itemType}'${itemType === 'room' ? ` and package_id=${packageId}` : ' (all packages)'}`);
    }
    
    // Filter in JavaScript after fetching (Supabase doesn't support complex OR on nested tables)
    // We'll fetch all items and filter client-side
    console.log(`[Availability] Fetched ${bookedItems?.length || 0} items, filtering for date overlap...`);

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    // Filter items: only pending/confirmed bookings with date overlap
    const filteredItems = bookedItems?.filter(item => {
      const booking = item.bookings;
      if (!booking) return false;
      
      // Exclude booking being re-edited (normalize types for comparison)
      if (excludeBookingId) {
        // Convert both to strings for reliable comparison (booking.id is integer, excludeBookingId from query is string)
        const bookingIdStr = String(booking.id);
        const excludeIdStr = String(excludeBookingId);
        if (bookingIdStr === excludeIdStr) {
          console.log(`[Availability] 🔄 Excluding booking ${bookingIdStr} from availability check (re-edit mode)`);
          return false;
        }
      }
      
      // Check status
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return false;
      }
      
      // Special handling for cottages with usage_date field
      if (item.usage_date) {
        const usageDate = new Date(item.usage_date);
        usageDate.setHours(0, 0, 0, 0);
        const rangeStart = new Date(checkIn);
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = new Date(checkOut);
        rangeEnd.setHours(0, 0, 0, 0);
        
        // Check if usage_date falls within the requested range
        return usageDate >= rangeStart && usageDate <= rangeEnd;
      }
      
      // For items without usage_date, check booking date overlap
      const bookingStart = new Date(booking.check_in);
      const bookingEnd = new Date(booking.check_out);
      const rangeStart = new Date(checkIn);
      const rangeEnd = new Date(checkOut);
      
      // Overlap exists if: booking starts before range ends AND booking ends after range starts
      return bookingStart <= rangeEnd && bookingEnd >= rangeStart;
    }) || [];
    
    console.log(`[Availability] ✅ Found ${filteredItems.length} booked items of type '${itemType}' with date overlap`);
    if (filteredItems.length > 0) {
      console.log(`[Availability] ✅ Filtered items details:`, filteredItems.map(item => ({
        item_id: item.item_id,
        usage_date: item.usage_date,
        booking_check_in: item.bookings?.check_in,
        booking_check_out: item.bookings?.check_out
      })));
    }
    
    // Log exclusion statistics if in re-edit mode (before modifying array)
    if (excludeBookingId) {
      const originalCount = bookedItems?.length || 0;
      const filteredCount = filteredItems?.length || 0;
      const excludedCount = originalCount - filteredCount;
      console.log(`[Availability] 🔄 Exclusion check for booking ${excludeBookingId}:`);
      console.log(`[Availability] 🔄   Original items: ${originalCount}`);
      console.log(`[Availability] 🔄   After filtering: ${filteredCount}`);
      console.log(`[Availability] 🔄   Excluded: ${excludedCount}`);
      if (excludedCount > 0) {
        const excludedItems = bookedItems?.filter(item => {
          const bookingIdStr = String(item.bookings?.id);
          const excludeIdStr = String(excludeBookingId);
          return bookingIdStr === excludeIdStr;
        }) || [];
        console.log(`[Availability] 🔄 Excluded items:`, excludedItems.map(i => ({
          booking_id: i.bookings?.id,
          item_id: i.item_id,
          usage_date: i.usage_date,
          check_in: i.bookings?.check_in,
          check_out: i.bookings?.check_out
        })));
      }
    }

    // Use filtered items
    bookedItems.splice(0, bookedItems.length, ...filteredItems);

    // Parse check-in and check-out dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    checkInDate.setHours(0, 0, 0, 0);
    checkOutDate.setHours(0, 0, 0, 0);

    // Define available accommodations based on item type
    let allItems;
    
    if (itemType === 'room') {
      allItems = ['Room 01', 'Room 02', 'Room 03', 'Room 04'];
    } else if (itemType === 'cottage') {
      allItems = ['Standard Cottage', 'Open Cottage', 'Family Cottage'];
    } else if (itemType === 'function-hall') {
      try {
        const { data: halls } = await db
          .from('packages')
          .select('title')
          .eq('category', 'function-halls');
        // Ensure unique items by deduplicating array
        const hallTitles = Array.isArray(halls) && halls.length > 0 ? halls.map(h => h.title) : ['Grand Function Hall', 'Intimate Function Hall'];
        allItems = [...new Set(hallTitles)]; // Remove duplicates
        console.log(`[Availability] 🏛️ Function halls loaded: ${allItems.length} unique halls from ${hallTitles.length} total`);
      } catch (_) {
        allItems = ['Grand Function Hall', 'Intimate Function Hall'];
        console.log('[Availability] 🏛️ Using fallback function halls:', allItems);
      }
    } else {
      allItems = [];
    }

    // Build date-by-date availability map
    const dateAvailability = {};
    const bookedDates = [];

    // Detect single-day requests (for cottages/function halls)
    const isSingleDayRequest = checkInDate.getTime() === checkOutDate.getTime();
    console.log(`[Availability] 🗓️ Date range: ${checkIn} to ${checkOut}, Single day: ${isSingleDayRequest}`);
    
    // Iterate through each day in the range
    // For single-day requests, use <= to include the single day
    // For multi-day requests, use < for exclusive checkout semantics
    console.log(`[Availability] 📅 Date loop: ${checkIn} to ${checkOut}, isSingleDay: ${isSingleDayRequest}`);
    let currentDate = new Date(checkInDate);
    let datesProcessed = 0;
    while (isSingleDayRequest ? (currentDate.getTime() <= checkOutDate.getTime()) : (currentDate < checkOutDate)) {
      const dateString = formatDateToYMD(currentDate);
      datesProcessed++;
      const bookedIds = [];

      // Check each booked item for conflicts on this date
      if (bookedItems && bookedItems.length > 0) {
        bookedItems.forEach(item => {
          const booking = item.bookings;
          if (!booking) return;
          
          // Safety check: Exclude booking being re-edited (normalize types for comparison)
          // This is a redundant check in case items slipped through the filter
          if (excludeBookingId) {
            const bookingIdStr = String(booking.id);
            const excludeIdStr = String(excludeBookingId);
            if (bookingIdStr === excludeIdStr) {
              console.log(`[Availability] 🔄 Excluding booking ${bookingIdStr} from date loop (re-edit mode)`);
              return; // Skip this item
            }
          }
          
          // Special handling for items with usage_date (cottages/function halls)
          // These items are only booked on their specific usage_date, not the booking range
          if (item.usage_date) {
            const usageDateStr = formatDateToYMD(item.usage_date);
            
            // Only check if current date matches the usage_date exactly
            if (dateString === usageDateStr) {
              // Normalize item_id to string for consistent comparison
              const itemIdStr = String(item.item_id).trim();
              // Prevent duplicates - same item can't be booked twice on same date
              if (!bookedIds.includes(itemIdStr)) {
                bookedIds.push(itemIdStr);
              } else {
                const itemLabel = itemType === 'cottage' ? 'cottage' : itemType === 'function-hall' ? 'function hall' : 'item';
                console.log(`[Availability] ⚠️ Duplicate ${itemLabel} ${itemIdStr} on ${dateString} - skipping`);
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
              
              if (itemType === 'cottage') {
                console.log(`[Availability] Cottage ${item.item_id} booked on ${dateString} (usage_date match)`);
              } else if (itemType === 'function-hall') {
                console.log(`[Availability] 🏛️ Function hall ${item.item_id} booked on ${dateString} (usage_date match)`);
              }
            }
            return; // Skip booking range check for items with usage_date
          }
          
          // For items without usage_date:
          // - Rooms: check booking date range (multi-day bookings are possible)
          // - Cottages/Function Halls: should have usage_date, but if missing, use check_in as fallback
          //   (Cottages/halls are single-day rentals, so use check_in as the usage date)
          if (itemType === 'cottage' || itemType === 'function-hall') {
            // For cottages/halls without usage_date, treat check_in as the usage date
            // This is a fallback for old bookings that might not have usage_date set
            const usageDateStr = formatDateToYMD(booking.check_in);
            
            // Only check if current date matches check_in exactly
            if (dateString === usageDateStr) {
              const itemIdStr = String(item.item_id).trim();
              // Prevent duplicates in fallback path too
              if (!bookedIds.includes(itemIdStr)) {
                bookedIds.push(itemIdStr);
              } else {
                const itemLabel = itemType === 'cottage' ? 'cottage' : 'function hall';
                console.log(`[Availability] ⚠️ Duplicate ${itemLabel} ${itemIdStr} on ${dateString} (check_in fallback) - skipping`);
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
              
              if (itemType === 'cottage') {
                console.log(`[Availability] Cottage ${item.item_id} booked on ${dateString} (check_in fallback, missing usage_date)`);
              } else if (itemType === 'function-hall') {
                console.log(`[Availability] 🏛️ Function hall ${item.item_id} booked on ${dateString} (check_in fallback, missing usage_date)`);
              }
            }
          } else {
            // For rooms: check booking date range (multi-day bookings are possible)
            const bookingCheckIn = new Date(booking.check_in);
            const bookingCheckOut = new Date(booking.check_out);
            bookingCheckIn.setHours(0, 0, 0, 0);
            bookingCheckOut.setHours(0, 0, 0, 0);

            // For single-day bookings, use inclusive comparison
            // For multi-day bookings, use exclusive checkout
            const isSingleDayBooking = bookingCheckIn.getTime() === bookingCheckOut.getTime();
            const isDateBooked = isSingleDayBooking 
              ? (currentDate.getTime() === bookingCheckIn.getTime())
              : (currentDate >= bookingCheckIn && currentDate < bookingCheckOut);

            // Check if current date falls within booking range
            if (isDateBooked) {
              if (!bookedIds.includes(item.item_id)) {
                bookedIds.push(item.item_id);
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
          }
        });
      }

      // Determine available items
      // Normalize bookedIds for consistent string comparison
      const bookedIdsNormalized = bookedIds.map(id => String(id).trim());
      const availableItems = allItems.filter(id => !bookedIdsNormalized.includes(String(id).trim()));
      
      // Enhanced logging for cottage and function hall availability
      if (itemType === 'cottage') {
        console.log(`[Availability] 🏠 Date ${dateString} - Cottage Calculation:`);
        console.log(`[Availability] 🏠   All cottages: [${allItems.join(', ')}] (${allItems.length} total)`);
        console.log(`[Availability] 🏠   Booked cottages: [${bookedIds.join(', ')}] (${bookedIds.length} booked)`);
        console.log(`[Availability] 🏠   Available cottages: [${availableItems.join(', ')}] (${availableItems.length} available)`);
        console.log(`[Availability] 🏠   Booked IDs normalized: [${bookedIdsNormalized.join(', ')}]`);
      } else if (itemType === 'function-hall') {
        console.log(`[Availability] 🏛️ Date ${dateString} - Function Hall Calculation:`);
        console.log(`[Availability] 🏛️   All halls: [${allItems.join(', ')}] (${allItems.length} total)`);
        console.log(`[Availability] 🏛️   Booked halls: [${bookedIds.join(', ')}] (${bookedIds.length} booked)`);
        console.log(`[Availability] 🏛️   Available halls: [${availableItems.join(', ')}] (${availableItems.length} available)`);
        console.log(`[Availability] 🏛️   Booked IDs normalized: [${bookedIdsNormalized.join(', ')}]`);
      }
      
      let status;
      if (itemType === 'room') {
        if (availableItems.length === 0) {
          status = 'booked-all';
        } else if (availableItems.length === 4) {
          status = 'available-all';
        } else {
          status = `room-available-${availableItems.length}`;
        }
      } else if (itemType === 'cottage') {
        if (bookedIds.length === 0) {
          status = 'cottage-available';
        } else if (bookedIds.length === allItems.length) {
          status = 'cottage-booked-all';
        } else {
          status = 'cottage-booked-partial';
        }
        console.log(`[Availability] ${dateString}: status=${status}, bookedCount=${bookedIds.length}, availableCount=${availableItems.length}, totalItems=${allItems.length}`);
      } else if (itemType === 'function-hall') {
        if (bookedIds.length === 0) {
          status = 'function-hall-available';
        } else if (bookedIds.length === allItems.length) {
          status = 'function-hall-booked-all';
        } else {
          status = 'function-hall-booked-partial';
        }
      }
      
      // Return appropriate field names based on item type
      if (itemType === 'room') {
        dateAvailability[dateString] = {
          status: status,
          bookedRooms: bookedIds,  // Use bookedRooms for compatibility
          availableRooms: availableItems,  // Use availableRooms for compatibility
          bookedCount: bookedIds.length,
          availableCount: availableItems.length,
          totalCount: allItems.length,
          isBooked: bookedIds.length === allItems.length
        };
      } else if (itemType === 'cottage') {
        dateAvailability[dateString] = {
          status: status,
          bookedCottages: bookedIds,
          availableCottages: availableItems,
          bookedCount: bookedIds.length,
          availableCount: availableItems.length,
          isBooked: bookedIds.length === allItems.length  // All cottages booked = fully booked
        };
        
        // Enhanced logging for cottage bookings
        if (bookedIds.length > 0) {
          const isFullyBooked = bookedIds.length === allItems.length;
          console.log(`[Availability] ${dateString}: bookedCount=${bookedIds.length}, isBooked=${isFullyBooked}, bookedCottages=${JSON.stringify(bookedIds)}, availableCottages=${JSON.stringify(availableItems)}`);
        }
      } else if (itemType === 'function-hall') {
        dateAvailability[dateString] = {
          status: status,
          bookedHalls: bookedIds,
          availableHalls: availableItems,
          bookedCount: bookedIds.length,
          availableCount: availableItems.length,
          isBooked: bookedIds.length === allItems.length  // All halls booked = fully booked
        };
        
        // Enhanced logging for function hall bookings
        if (bookedIds.length > 0) {
          const isFullyBooked = bookedIds.length === allItems.length;
          console.log(`[Availability] 🏛️ ${dateString}: bookedCount=${bookedIds.length}, isBooked=${isFullyBooked}, bookedHalls=${JSON.stringify(bookedIds)}, availableHalls=${JSON.stringify(availableItems)}`);
        }
      }

      // Log if date entry was created
      if (dateAvailability[dateString]) {
        if (itemType === 'cottage' && datesProcessed <= 3) {
          // Only log first 3 dates for cottage to reduce noise
          console.log(`[Availability] ✅ Date entry created for ${dateString}`);
        }
      } else {
        console.warn(`[Availability] ⚠️ No date entry created for ${dateString}`);
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`[Availability] 📅 Processed ${datesProcessed} dates, created ${Object.keys(dateAvailability).length} entries`);

    // Calculate overall availability
    const totalDates = Object.keys(dateAvailability).length;
    const bookedDatesCount = Object.values(dateAvailability).filter(av => av.isBooked).length;

    console.log(`[Availability] Summary: ${bookedDatesCount}/${totalDates} dates fully booked for ${category || 'all'}`);

    // Calculate average availability
    let overallAvailable = totalDates > 0 && bookedDatesCount < totalDates;
    let avgItemAvailability = itemType === 'room' ? 4 : 0;
    
    if (totalDates > 0) {
      const totalItemsAvailable = Object.values(dateAvailability).reduce((sum, av) => sum + (av.availableCount || 0), 0);
      avgItemAvailability = Math.round(totalItemsAvailable / totalDates);
    }

    const response = {
      success: true,
      available: overallAvailable,
      avgRoomAvailability: itemType === 'room' ? avgItemAvailability : null,
      dateAvailability: dateAvailability,
      bookedDates: bookedDates,
      maintenanceDates: [],
      totalDates: totalDates,
      bookedDatesCount: bookedDatesCount
    };
    
    console.log(`[Availability] 📤 Sending response with ${Object.keys(dateAvailability).length} dates`);
    console.log(`[Availability] 📤 Summary - Available: ${overallAvailable}, Avg Items: ${avgItemAvailability}, Booked Dates: ${bookedDatesCount}/${totalDates}`);
    if (itemType === 'cottage') {
      const datesWithBookings = Object.entries(dateAvailability).filter(([, data]) => data.isBooked);
      const allDatesData = Object.entries(dateAvailability);
      console.log(`[Availability] 📤 Cottage response details:`);
      console.log(`[Availability] 📤   Total dates in response: ${allDatesData.length}`);
      console.log(`[Availability] 📤   Dates with bookings: ${datesWithBookings.length}`);
      console.log(`[Availability] 📤   Booked dates:`, datesWithBookings.map(([date, data]) => `${date}: ${data.bookedCottages?.join(', ')}`));
      console.log(`[Availability] 📤   Sample date data (first 3):`, allDatesData.slice(0, 3).map(([date, data]) => ({
        date,
        availableCottages: data.availableCottages,
        bookedCottages: data.bookedCottages,
        isBooked: data.isBooked
      })));
    }
    if (itemType === 'function-hall') {
      const datesWithBookings = Object.entries(dateAvailability).filter(([, data]) => data.isBooked);
      console.log(`[Availability] 📤 Function hall booked dates: ${datesWithBookings.length}`, datesWithBookings.map(([date, data]) => `${date}: ${data.bookedHalls?.join(', ')}`));
    }
    
    res.json(response);
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability'
    });
  }
});

// Apply authentication middleware to all routes below
router.use(authenticateToken);

// GET /api/bookings - Get all bookings for current user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.user.id;

    // Fetch bookings
    const { data: bookings, error: bookingsError } = await db
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      throw bookingsError;
    }

    // Fetch booking items for each booking
    const bookingsWithItems = await Promise.all((bookings || []).map(async (booking) => {
      const { data: items } = await db
        .from('booking_items')
        .select('*')
        .eq('booking_id', booking.id);

      // Fetch package info
      let packageInfo = null;
      if (booking.package_id) {
        const { data: pkg, error: pkgError } = await db
          .from('packages')
          .select('*')
          .eq('id', booking.package_id)
          .single();
        if (pkgError) {
          console.error('[Bookings] Package lookup failed:', {
            bookingId: booking.id,
            package_id: booking.package_id,
            error: pkgError.message
          });
        } else {
          packageInfo = pkg;
          console.log('[Bookings] Package found:', {
            bookingId: booking.id,
            package_id: booking.package_id,
            packageTitle: pkg?.title,
            packageCategory: pkg?.category
          });
        }
      } else {
        console.warn('[Bookings] Booking missing package_id:', {
          bookingId: booking.id,
          category: booking.category
        });
      }

      return {
        ...booking,
        booking_items: items || [],
        packages: packageInfo
      };
    }));

    res.json({
      success: true,
      data: bookingsWithItems
    });
  } catch (error) {
    console.error('Fetch bookings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings'
    });
  }
});

// POST /api/bookings - Create new booking
router.post('/', async (req, res) => {
  try {
    const userId = req.user.user.id;
    const { 
      packageId, 
      checkIn, 
      checkOut, 
      bookingId, // bookingId for edit mode
      guests,
      totalCost,
      paymentMode,
      perRoomGuests,
      contactNumber,
      specialRequests,
      selectedCottages,
      cottageDates, // Array of individual dates for cottage rentals
      // Function hall fields (dev-friendly; ignored if not provided)
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

    // Validate required fields
    if (!packageId || !checkIn || !checkOut) {
      console.log('[Booking] Missing required fields:', { packageId, checkIn, checkOut });
      return res.status(400).json({
        success: false,
        error: 'Required booking fields are missing: packageId, checkIn, or checkOut'
      });
    }
    
    if (!guests) {
      console.log('[Booking] Guests field missing or empty');
      return res.status(400).json({
        success: false,
        error: 'Required booking field missing: guests (must be an object with adults/children)'
      });
    }
    
    // Validate guests is an object with expected structure
    if (typeof guests !== 'object') {
      console.log('[Booking] Guests is not an object:', typeof guests, guests);
      return res.status(400).json({
        success: false,
        error: 'Guests must be an object with adults and/or children properties'
      });
    }
    
    // Validate guests has at least one person
    const totalGuests = (guests.adults || 0) + (guests.children || 0);
    if (totalGuests === 0) {
      console.warn('[Booking] Validation failed:', {
        field: 'guests',
        error: 'At least one guest must be specified',
        userId: userId,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        error: 'At least one guest must be specified'
      });
    }
    
    // Validate contact number - must be exactly 11 digits
    if (contactNumber) {
      const digitsOnly = String(contactNumber).replace(/\D/g, '');
      if (digitsOnly.length !== 11) {
        console.warn('[Booking] Validation failed:', {
          field: 'contactNumber',
          value: contactNumber,
          digitCount: digitsOnly.length,
          error: 'Contact number must be exactly 11 digits',
          userId: userId,
          timestamp: new Date().toISOString()
        });
        return res.status(400).json({
          success: false,
          error: `Contact number must be exactly 11 digits (received ${digitsOnly.length} digits)`
        });
      }
    } else {
      console.warn('[Booking] Validation failed:', {
        field: 'contactNumber',
        error: 'Contact number is required',
        userId: userId,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        error: 'Contact number is required'
      });
    }
    
    console.log('[Booking] Received valid booking data:', { 
      packageId, 
      checkIn, 
      checkOut, 
      totalGuests,
      perRoomGuests: perRoomGuests?.length || 0,
      contactNumberLength: String(contactNumber).replace(/\D/g, '').length
    });

    // Prevent duplicate cottage items in same request
    if (Array.isArray(selectedCottages) && selectedCottages.length > 0) {
      const unique = new Set(selectedCottages);
      if (unique.size !== selectedCottages.length) {
        return res.status(400).json({ success: false, error: 'Duplicate cottage types selected in the same booking are not allowed.' });
      }
    }

    // Server-side conflict check for cottages on the selected date
    if (Array.isArray(selectedCottages) && selectedCottages.length > 0) {
      try {
        const usageDateStr = formatDateToYMD(checkIn);
        console.log('[Booking] 🏠 Cottage conflict check - Selected cottages:', selectedCottages, 'Date:', checkIn, '-> normalized:', usageDateStr);

        // Fetch any booking_items of cottages for those item_ids with overlapping date
        const { data: conflictingItems, error: conflictErr } = await db
          .from('booking_items')
          .select(`id, item_id, item_type, usage_date, bookings!inner(id, check_in, check_out, status)`) 
          .eq('item_type', 'cottage')
          .in('item_id', selectedCottages);  // Filter by selected cottages for efficiency

        if (conflictErr) {
          throw conflictErr;
        }

        console.log('[Booking] 🏠 Found', conflictingItems?.length || 0, 'potential conflicting booking items');

        // Filter conflicts: cottages with matching usage_date or check_in fallback
        const conflicts = (conflictingItems || []).filter(row => {
          const b = row.bookings;
          if (!b) return false;
          
          // Exclude current booking if editing
          if (bookingId && String(b.id) === String(bookingId)) {
            console.log('[Booking] 🏠 Excluding current booking', bookingId, 'from conflict check');
            return false;
          }
          
          if (!['pending','confirmed'].includes(b.status)) return false;
          
          // For cottages, check usage_date first (most accurate)
          if (row.usage_date) {
            const rowUsageDateStr = formatDateToYMD(row.usage_date);
            console.log('[Booking] 🏠 Comparing usage_date:', rowUsageDateStr, 'with requested:', usageDateStr);
            // Exact match on usage_date
            if (rowUsageDateStr === usageDateStr) {
              console.log('[Booking] 🏠 ⚠️ CONFLICT detected: Cottage', row.item_id, 'booked on', rowUsageDateStr);
              return selectedCottages.includes(row.item_id);
            }
          } else {
            // Fallback: check booking date range (for old bookings without usage_date)
            const bStart = new Date(b.check_in); 
            bStart.setHours(0,0,0,0);
            const bEnd = new Date(b.check_out); 
            bEnd.setHours(0,0,0,0);
            const usageDate = new Date(checkIn);
            usageDate.setHours(0,0,0,0);
            // Overlap if usageDate within [bStart, bEnd] inclusive
            const overlaps = usageDate >= bStart && usageDate <= bEnd;
            if (overlaps && selectedCottages.includes(row.item_id)) {
              console.log('[Booking] 🏠 ⚠️ CONFLICT detected (fallback): Cottage', row.item_id, 'booked in range', b.check_in, 'to', b.check_out);
              return true;
            }
          }
          
          return false;
        });

        if (conflicts.length > 0) {
          console.log('[Booking] 🏠 ❌ Booking rejected due to conflicts:', conflicts.map(c => c.item_id));
          return res.status(409).json({
            success: false,
            error: 'Selected cottage is already booked for that date. Please choose a different cottage or date.',
            conflicts: conflicts.map(c => c.item_id)
          });
        }
        
        console.log('[Booking] 🏠 ✅ No conflicts found, booking allowed');
      } catch (e) {
        console.error('[Booking] Cottage conflict check failed:', e);
        return res.status(500).json({ success: false, error: 'Failed to validate cottage availability' });
      }
    }

    // Verify package exists - handle both string and number IDs
    console.log(`[Booking] Looking up package with ID: ${packageId} (type: ${typeof packageId})`);
    
    const { data: packageData, error: packageError } = await db
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single();

    console.log(`[Booking] Package lookup result:`, { 
      found: !!packageData, 
      error: packageError?.code || null,
      packageId: packageData?.id 
    });

    if (packageError || !packageData) {
      console.error(`[Booking] Package not found. ID: ${packageId}, Error:`, packageError);
      
      // Log available packages for debugging
      const { data: allPackages } = await db.from('packages').select('id, title');
      console.log('[Booking] Available packages:', allPackages);
      
      return res.status(404).json({
        success: false,
        error: `Package not found (ID: ${packageId})`
      });
    }
    
    console.log(`[Booking] Package found: ${packageData.title} (ID: ${packageData.id}), Category: ${packageData.category}`);
    
    // Determine category from request body if available, otherwise use package category
    // This is a defensive check in case package lookup returns wrong category
    const requestCategory = req.body.category; // Category sent from client
    const finalCategory = requestCategory || packageData.category;
    console.log(`[Booking] Category determination: requestCategory=${requestCategory}, packageCategory=${packageData.category}, finalCategory=${finalCategory}`);
    
    // Category-specific capacity validation (must happen AFTER package lookup to know category)
    const ROOM_CAPACITY = 4; // Maximum guests per room
    if (finalCategory === 'rooms') {
      // Validate room capacity if per-room guests provided
      if (Array.isArray(perRoomGuests) && perRoomGuests.length > 0) {
        for (const roomGuest of perRoomGuests) {
          const roomAdults = roomGuest.adults || 0;
          const roomChildren = roomGuest.children || 0;
          const roomTotal = roomAdults + roomChildren;
          
          if (roomTotal > ROOM_CAPACITY) {
            console.warn('[Booking] Validation failed:', {
              field: 'perRoomGuests',
              roomId: roomGuest.roomId || 'unknown',
              adults: roomAdults,
              children: roomChildren,
              total: roomTotal,
              capacity: ROOM_CAPACITY,
              error: `Room capacity exceeded: ${roomTotal} guests exceeds maximum of ${ROOM_CAPACITY}`,
              userId: userId,
              timestamp: new Date().toISOString()
            });
            return res.status(400).json({
              success: false,
              error: `Room ${roomGuest.roomId || 'unknown'} exceeds capacity: ${roomTotal} guests (maximum ${ROOM_CAPACITY} allowed)`
            });
          }
        }
      } else if (totalGuests > ROOM_CAPACITY) {
        // Validate main guests object for single room bookings
        console.warn('[Booking] Validation failed:', {
          field: 'guests',
          adults: guests.adults || 0,
          children: guests.children || 0,
          total: totalGuests,
          capacity: ROOM_CAPACITY,
          error: `Guest count exceeds room capacity: ${totalGuests} guests exceeds maximum of ${ROOM_CAPACITY}`,
          userId: userId,
          timestamp: new Date().toISOString()
        });
        return res.status(400).json({
          success: false,
          error: `Guest count exceeds room capacity: ${totalGuests} guests (maximum ${ROOM_CAPACITY} allowed per room)`
        });
      }
    }
    
    // Validate cottage capacity if this is a cottage booking
    const COTTAGE_CAPACITY = 8; // Maximum guests per cottage
    if (finalCategory === 'cottages') {
      if (totalGuests > COTTAGE_CAPACITY) {
        console.warn('[Booking] Validation failed:', {
          field: 'guests',
          category: 'cottages',
          adults: guests.adults || 0,
          children: guests.children || 0,
          total: totalGuests,
          capacity: COTTAGE_CAPACITY,
          error: `Guest count exceeds cottage capacity: ${totalGuests} guests exceeds maximum of ${COTTAGE_CAPACITY}`,
          userId: userId,
          timestamp: new Date().toISOString()
        });
        return res.status(400).json({
          success: false,
          error: `Guest count exceeds cottage capacity: ${totalGuests} guests (maximum ${COTTAGE_CAPACITY} allowed per cottage)`
        });
      }
    }
    
    // Validate function hall capacity if this is a function hall booking
    const FUNCTION_HALL_MAX_CAPACITY = 150; // Maximum guests per function hall
    if (finalCategory === 'function-halls') {
      // Function halls use adults + children format (totalGuests already calculated above)
      const functionHallGuests = totalGuests;
      if (functionHallGuests > FUNCTION_HALL_MAX_CAPACITY) {
        console.warn('[Booking] Validation failed:', {
          field: 'guests',
          category: 'function-halls',
          total: functionHallGuests,
          capacity: FUNCTION_HALL_MAX_CAPACITY,
          error: `Guest count exceeds function hall maximum capacity: ${functionHallGuests} guests exceeds maximum of ${FUNCTION_HALL_MAX_CAPACITY}`,
          userId: userId,
          timestamp: new Date().toISOString()
        });
        return res.status(400).json({
          success: false,
          error: `Guest count exceeds function hall maximum capacity: ${functionHallGuests} guests (maximum ${FUNCTION_HALL_MAX_CAPACITY} allowed)`
        });
      }
      // Log warning if exceeds recommended but within max (don't block, just log)
      const FUNCTION_HALL_RECOMMENDED_CAPACITY = 100;
      if (functionHallGuests > FUNCTION_HALL_RECOMMENDED_CAPACITY && functionHallGuests <= FUNCTION_HALL_MAX_CAPACITY) {
        const excessGuests = functionHallGuests - FUNCTION_HALL_RECOMMENDED_CAPACITY;
        const units = Math.ceil(excessGuests / 10);
        console.log('[Booking] Function hall booking exceeds recommended capacity:', {
          category: 'function-halls',
          total: functionHallGuests,
          recommended: FUNCTION_HALL_RECOMMENDED_CAPACITY,
          excess: excessGuests,
          extraChairsUnits: units,
          userId: userId,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Create main booking record
    // Note: per_room_guests and selected_cottages are stored in booking_items table
    const bookingDataToInsert = {
      user_id: userId,
      package_id: packageId,
      check_in: checkIn,
      check_out: checkOut,
      guests: guests, // Total guests summary
      total_cost: totalCost,
      payment_mode: paymentMode,
      contact_number: contactNumber,
      special_requests: specialRequests,
      status: 'pending'
      // created_at and updated_at are set automatically by database defaults
    };
    
    // Store function hall metadata if this is a function hall booking
    const fhMetadata = buildFunctionHallMetadata({
      hallId, hallName, eventName, eventType, setupType, decorationTheme,
      organization, startTime, endTime, soundSystemRequired, projectorRequired,
      cateringRequired, equipmentAddons
    });
    if (fhMetadata) {
      bookingDataToInsert.function_hall_metadata = fhMetadata;
      console.log('[Booking] Function hall metadata to save:', JSON.stringify(fhMetadata, null, 2));
    }
    
    console.log('[Booking] Inserting booking data:', JSON.stringify(bookingDataToInsert, null, 2));
    
    // 1. Create the main booking record
    // Insert without select first to avoid RLS issues, then fetch separately
    const { data: insertedData, error: insertError } = await db
      .from('bookings')
      .insert(bookingDataToInsert)
      .select()
      .single();

    if (insertError) {
      console.error('[Booking] Database insert error:', insertError);
      console.error('[Booking] Error details:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint
      });
      throw insertError;
    }
    
    // If insert with select returned data, use it
    let booking = insertedData;
    
    // If select didn't return data (RLS or other issue), fetch it separately
    if (!booking || !booking.id) {
      console.log('[Booking] Select after insert returned null, fetching booking separately...');
      
      // Fetch the most recent booking for this user with matching data
      const { data: fetchedBookings, error: fetchError } = await db
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .eq('package_id', packageId)
        .eq('check_in', checkIn)
        .eq('check_out', checkOut)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (fetchError) {
        console.error('[Booking] Error fetching booking after insert:', fetchError);
        throw new Error(`Booking created but could not be retrieved: ${fetchError.message}`);
      }
      
      if (!fetchedBookings || fetchedBookings.length === 0) {
        console.error('[Booking] Booking creation failed - booking not found after insert');
        throw new Error('Booking insert succeeded but booking could not be retrieved');
      }
      
      booking = fetchedBookings[0];
      console.log('[Booking] Successfully fetched booking after insert:', booking.id);
    }
    
    if (!booking || !booking.id) {
      console.error('[Booking] Booking creation failed - no booking ID available');
      throw new Error('Failed to create booking - no booking ID returned');
    }
    
    console.log('[Booking] Successfully created booking:', booking.id);

    // 2. Create booking_items for rooms
    // All individual items (rooms, cottages, function halls) are stored in booking_items
    // This is the single source of truth - no redundant storage in bookings table
    if (perRoomGuests && Array.isArray(perRoomGuests) && perRoomGuests.length > 0) {
      const roomItems = perRoomGuests.map(room => ({
        booking_id: booking.id,
        item_type: 'room',
        item_id: room.roomId, // e.g., "Room 01"
        guest_name: room.guestName,
        adults: room.adults,
        children: room.children
      }));
      
      console.log('[Booking] Creating room items:', JSON.stringify(roomItems, null, 2));
      
      const { error: roomsError } = await db
        .from('booking_items')
        .insert(roomItems);
      
      if (roomsError) {
        console.error('[Booking] Error creating room items:', roomsError);
        throw roomsError;
      }
      
      console.log(`[Booking] Created ${roomItems.length} room items`);
    }
    
    // 3. Create booking_items for cottages
    // 4. Create booking_items for function halls (single-day usage)
    if (hallId) {
      const hallItem = {
        booking_id: booking.id,
        item_type: 'function-hall',
        item_id: hallId,
        usage_date: checkIn // event is single-day; checkIn==checkOut
      };
      console.log('[Booking] Creating function-hall item:', JSON.stringify(hallItem));
      console.log('[Booking] Function hall metadata saved in bookings.function_hall_metadata');
      const { error: hallErr } = await db
        .from('booking_items')
        .insert([hallItem]);
      if (hallErr) {
        console.error('[Booking] Error creating function-hall item:', hallErr);
        throw hallErr;
      }
    }
    if (selectedCottages && Array.isArray(selectedCottages) && selectedCottages.length > 0) {
      // If cottageDates is provided, create one booking_item per cottage per date
      // This allows cottages to be rented on specific individual days
      if (cottageDates && Array.isArray(cottageDates) && cottageDates.length > 0) {
        const cottageItems = [];
        selectedCottages.forEach(cottageId => {
          cottageDates.forEach(date => {
            cottageItems.push({
              booking_id: booking.id,
              item_type: 'cottage',
              item_id: cottageId,
              usage_date: date // Store the specific date for this cottage rental
            });
          });
        });
        
        console.log('[Booking] Creating cottage items with individual dates:', JSON.stringify(cottageItems, null, 2));
        
        const { error: cottagesError } = await db
          .from('booking_items')
          .insert(cottageItems);
        
        if (cottagesError) {
          console.error('[Booking] Error creating cottage items:', cottagesError);
          throw cottagesError;
        }
        
        console.log(`[Booking] Created ${cottageItems.length} cottage items (${selectedCottages.length} cottages × ${cottageDates.length} dates)`);
      } else {
        // Fallback: Use main booking check_in as the usage_date (single-day rental)
        const cottageItems = selectedCottages.map(cottageId => ({
          booking_id: booking.id,
          item_type: 'cottage',
          item_id: cottageId,
          usage_date: checkIn // Cottages are single-day rentals, use check_in as usage date
        }));
        
        console.log('[Booking] Creating cottage items (fallback with usage_date):', JSON.stringify(cottageItems, null, 2));
        
        const { error: cottagesError } = await db
          .from('booking_items')
          .insert(cottageItems);
        
        if (cottagesError) {
          console.error('[Booking] Error creating cottage items:', cottagesError);
          throw cottagesError;
        }
        
        console.log(`[Booking] Created ${cottageItems.length} cottage items with usage_date=${checkIn}`);
      }
    }

    // Update user's total bookings (mock DB doesn't support RPC, so we'll do it manually)
    try {
      const { data: user } = await db.from('users').select('*').eq('id', userId).single();
      if (user) {
        await db.from('users').update({ total_bookings: (user.total_bookings || 0) + 1 }).eq('id', userId);
      }
    } catch (err) {
      // Ignore if user doesn't exist or update fails
      console.log('[Booking] Could not increment user bookings:', err.message);
    }

    // Add to reservations calendar
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDateToYMD(d);
      
      // Upsert reservation calendar entry (mock DB: check if exists, update or insert)
      try {
        const { data: existing } = await db
          .from('reservations_calendar')
          .select('*')
          .eq('package_id', packageId)
          .eq('date', dateStr)
          .single();
        
        if (existing) {
          await db
            .from('reservations_calendar')
            .update({ reserved_count: (existing.reserved_count || 0) + 1 })
            .eq('package_id', packageId)
            .eq('date', dateStr);
        } else {
          await db
            .from('reservations_calendar')
            .insert({
              package_id: packageId,
              date: dateStr,
              reserved_count: 1
            });
        }
      } catch (err) {
        // Ignore calendar errors - not critical for booking
        console.log('[Booking] Could not update calendar:', err.message);
      }
    }

    // Return booking with items and package info
    const { data: bookingItems } = await db
      .from('booking_items')
      .select('*')
      .eq('booking_id', booking.id);
    
    const bookingResponse = {
      ...booking,
      booking_items: bookingItems || [],
      packages: packageData
    };

    console.log('[BookingAPI] Booking created successfully:', {
      id: booking.id,
      packageId: booking.package_id,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      totalCost: booking.total_cost,
      itemsCount: bookingItems?.length || 0
    });

    res.status(201).json({
      success: true,
      data: bookingResponse
    });
  } catch (error) {
    console.error('Create booking error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create booking',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/bookings/:id - Get single booking
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.user.id;
    const { id } = req.params;

    const { data, error } = await db
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Fetch booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking'
    });
  }
});

// PATCH /api/bookings/:id - Update booking
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.user.user.id;
    const { id } = req.params;
    const { 
      status, 
      checkIn, 
      checkOut, 
      guests,
      totalCost,
      paymentMode,
      perRoomGuests,
      contactNumber,
      specialRequests,
      selectedCottages,
      cottageDates,
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

    console.log('[Booking] PATCH request for booking:', id);
    console.log('[Booking] 🏠 Update request includes:', {
      selectedCottages: selectedCottages?.length || 0,
      cottageDates: cottageDates?.length || 0,
      perRoomGuests: perRoomGuests?.length || 0
    });

    // Verify booking belongs to user
    const { data: existingBooking, error: fetchError } = await db
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingBooking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Prepare update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (status !== undefined) updateData.status = status;
    if (checkIn) updateData.check_in = checkIn;
    if (checkOut) updateData.check_out = checkOut;
    if (guests) updateData.guests = guests;
    if (totalCost !== undefined) updateData.total_cost = totalCost;
    if (paymentMode) updateData.payment_mode = paymentMode;
    if (contactNumber) updateData.contact_number = contactNumber;
    if (specialRequests !== undefined) updateData.special_requests = specialRequests;
    
    // Update function hall metadata if provided
    const fhMetadata = buildFunctionHallMetadata({
      hallId, hallName, eventName, eventType, setupType, decorationTheme,
      organization, startTime, endTime, soundSystemRequired, projectorRequired,
      cateringRequired, equipmentAddons
    });
    if (fhMetadata) {
      updateData.function_hall_metadata = fhMetadata;
      console.log('[Booking] Updating function hall metadata:', JSON.stringify(fhMetadata, null, 2));
    }

    // Update booking
    const { data, error } = await db
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update booking_items if provided
    
    // 1. Update room items if perRoomGuests is provided
    if (perRoomGuests && Array.isArray(perRoomGuests)) {
      console.log('[Booking] Updating room items:', perRoomGuests.length);
      
      // Delete existing room items
      const { error: deleteRoomsError } = await db
        .from('booking_items')
        .delete()
        .eq('booking_id', id)
        .eq('item_type', 'room');
      
      if (deleteRoomsError) {
        console.error('[Booking] Error deleting old room items:', deleteRoomsError);
      }
      
      // Create new room items
      if (perRoomGuests.length > 0) {
        const roomItems = perRoomGuests.map(room => ({
          booking_id: id,
          item_type: 'room',
          item_id: room.roomId,
          guest_name: room.guestName,
          adults: room.adults,
          children: room.children
        }));
        
        const { error: roomsError } = await db
          .from('booking_items')
          .insert(roomItems);
        
        if (roomsError) {
          console.error('[Booking] Error creating room items:', roomsError);
          throw roomsError;
        }
        
        console.log(`[Booking] Updated ${roomItems.length} room items`);
      }
    }
    
    // 2. Update cottage items if selectedCottages is provided
    if (selectedCottages !== undefined) {
      console.log('[Booking] 🏠 Updating cottage items:', { selectedCottages, cottageDates });
      
      // Delete existing cottage items
      const { error: deleteCottagesError } = await db
        .from('booking_items')
        .delete()
        .eq('booking_id', id)
        .eq('item_type', 'cottage');
      
      if (deleteCottagesError) {
        console.error('[Booking] Error deleting old cottage items:', deleteCottagesError);
      }
      
      // Create new cottage items
      if (Array.isArray(selectedCottages) && selectedCottages.length > 0) {
        // If cottageDates is provided, create one booking_item per cottage per date
        if (cottageDates && Array.isArray(cottageDates) && cottageDates.length > 0) {
          const cottageItems = [];
          selectedCottages.forEach(cottageId => {
            cottageDates.forEach(date => {
              cottageItems.push({
                booking_id: id,
                item_type: 'cottage',
                item_id: cottageId,
                usage_date: date
              });
            });
          });
          
          console.log('[Booking] 🏠 Creating cottage items with individual dates:', JSON.stringify(cottageItems, null, 2));
          
          const { error: cottagesError } = await db
            .from('booking_items')
            .insert(cottageItems);
          
          if (cottagesError) {
            console.error('[Booking] Error creating cottage items:', cottagesError);
            throw cottagesError;
          }
          
          console.log(`[Booking] 🏠 Updated ${cottageItems.length} cottage items (${selectedCottages.length} cottages × ${cottageDates.length} dates)`);
        } else {
          // Fallback: Create cottage items with check_in as usage_date (single-day rental)
          const cottageItems = selectedCottages.map(cottageId => ({
            booking_id: id,
            item_type: 'cottage',
            item_id: cottageId,
            usage_date: checkIn // Cottages are single-day rentals, use check_in as usage date
          }));
          
          console.log('[Booking] Creating cottage items (fallback with usage_date):', JSON.stringify(cottageItems, null, 2));
          
          const { error: cottagesError } = await db
            .from('booking_items')
            .insert(cottageItems);
          
          if (cottagesError) {
            console.error('[Booking] Error creating cottage items:', cottagesError);
            throw cottagesError;
          }
          
          console.log(`[Booking] Updated ${cottageItems.length} cottage items`);
        }
      } else {
        console.log('[Booking] 🏠 No cottages in update, all cottage items deleted');
      }
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update booking'
    });
  }
});

// DELETE /api/bookings/:id - Cancel booking
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.user.id;
    const { id } = req.params;

    // Verify booking belongs to user
    const { data: existingBooking, error: fetchError } = await db
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingBooking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Update status to cancelled instead of deleting
    const { data, error } = await db
      .from('bookings')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel booking'
    });
  }
});

export default router;
