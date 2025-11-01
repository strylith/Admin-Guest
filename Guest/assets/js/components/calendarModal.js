// Calendar Modal Component for Package Availability and Date Selection
// No external libraries needed - using vanilla JavaScript

let currentModal = null;
let calendarState = {
  packageCategory: 'rooms',
  packageTitle: '',
  selectedCheckin: null,
  selectedCheckout: null,
  selectionStep: 1, // 1 = selecting check-in, 2 = selecting check-out
  modifyingDate: null, // 'checkin', 'checkout', or null for normal flow
  undoStack: [], // Stack to track previous states for undo functionality
  editBookingId: null, // ID of booking being re-edited (excluded from availability checks)
  constraintStartDate: null, // Min date constraint (e.g., room booking check-in)
  constraintEndDate: null, // Max date constraint (e.g., room booking check-out)
  selectedCottageDays: [] // Array of individual days selected for cottage rental (multi-day selection)
};

// Mock data for demonstration - in real app this would come from API
// Availability patterns:
// - Weekdays: Mostly available (good for testing)
// - Weekends: Mostly booked (realistic demand)
// - Holidays: Booked periods (Christmas week, summer peak)
// - Maintenance: Random 5% of dates
// - Most other dates: Available for testing
const mockReservationData = {
  'Standard Room': 15,
  'Ocean View Room': 12,
  'Deluxe Suite': 18,
  'Premium King': 20,
  'Beachfront Cottage': 8,
  'Garden View Cottage': 10,
  'Family Cottage': 14,
  'Grand Function Hall': 5,
  'Intimate Function Hall': 7
};

// Cache for availability data to avoid excessive API calls
let availabilityCache = new Map();

// Track which months have been fully loaded to prevent re-fetching
let loadedMonths = new Set();

// Debounce timer for month navigation to prevent rapid API calls
let monthNavigationTimer = null;

// Export function to clear cache when bookings change
window.clearCalendarCache = function() {
  console.log('[Calendar] Clearing availability cache...');
  availabilityCache.clear();
  loadedMonths.clear();
};

// Helper to normalize date strings/Date objects to YYYY-MM-DD strings
// This avoids timezone issues by working purely with date strings
// Returns null or YYYY-MM-DD string - NEVER returns Date objects
function normalizeDateInput(dateInput) {
  if (!dateInput) return null;
  
  // If it's already a string in YYYY-MM-DD format, return it directly
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // If it's already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // If it has a time component, extract just the date part
    if (trimmed.includes('T')) {
      return trimmed.split('T')[0];
    }
    // Try parsing it as a date and extract YYYY-MM-DD using local components
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return trimmed;
  }
  
  // If it's a Date object, convert to YYYY-MM-DD string using local date components
  if (dateInput instanceof Date) {
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

// Get availability status for dates (now integrated with database)
async function getDateStatus(date, packageId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Past dates
  if (date < today) {
    return { status: 'past', availableCount: 0 };
  }
  
  // Today is always marked as "today"
  if (date.toDateString() === today.toDateString()) {
    return { status: 'today', availableCount: 4 };
  }
  
  // Check cache first (include category to prevent cache pollution)
  const dateString = formatDateForInput(date);
  // Include editBookingId in cache key to avoid mixing re-edit availability
  const cacheKey = `${packageId}-${calendarState.packageCategory}-${dateString}${calendarState.editBookingId ? `-b${calendarState.editBookingId}` : ''}`;
  
  if (availabilityCache.has(cacheKey)) {
    console.log(`[Calendar] Cache hit for ${dateString} (category: ${calendarState.packageCategory})`);
    return availabilityCache.get(cacheKey);
  }
  
  try {
    // Fetch availability data from backend
    const { checkAvailability } = await import('../utils/api.js');
    
    // Get availability for a date range that includes this date
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0); // Ensure local midnight
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(0, 0, 0, 0); // Ensure local midnight
    
    const checkInStr = formatDateForInput(startDate);
    const checkOutStr = formatDateForInput(endDate);
    
    console.log('[Calendar] Availability request dates:', { 
      checkIn: checkInStr, 
      checkOut: checkOutStr,
      originalDate: dateString 
    });
    console.log(`[Calendar] 🌐 Fetching availability for ${dateString} (package ${packageId}, category: ${calendarState.packageCategory})`);
    
    // Pass category to get correct bookings
    // Exclude current booking from conflict checks if in re-edit mode
    const excludeBookingId = calendarState.editBookingId || null;
    if (excludeBookingId) {
      console.log(`[Calendar] 🔄 Re-edit mode: Excluding booking ${excludeBookingId} from availability checks`);
    }
    const result = await checkAvailability(packageId, checkInStr, checkOutStr, calendarState.packageCategory, excludeBookingId);
    
    console.log(`[Calendar] 📥 API Response for ${dateString}:`, result ? JSON.stringify(result, null, 2) : 'null');
    
    if (result && result.dateAvailability && result.dateAvailability[dateString]) {
      const dateData = result.dateAvailability[dateString];
      
      if (calendarState.packageCategory === 'rooms') {
        // Room package - return availability count
        const availableCount = dateData.availableCount || 0;
        const bookedCount = dateData.bookedCount || 0;
        
        console.log(`[Calendar] ${dateString}: ${availableCount} available, ${bookedCount} booked (category: rooms)`);
        
        const status = {
          status: availableCount === 0 ? 'booked-all' : 
                  availableCount === 4 ? 'available-all' : 
                  `available-${availableCount}`,
          availableCount: availableCount,
          bookedCount: bookedCount,
          availableRooms: dateData.availableRooms || [],
          bookedRooms: dateData.bookedRooms || []
        };
        
        availabilityCache.set(cacheKey, status);
        return status;
      } else {
        // Cottage or function hall - use category-aware logic
        const isBooked = dateData.isBooked || false;
        const category = calendarState.packageCategory;
        
        console.log(`[Calendar] 🏠 ${dateString}: isBooked=${isBooked}, status=${dateData.status} (category: ${category})`);
        console.log(`[Calendar] 🏠 ${dateString} dateData:`, {
          availableCottages: dateData.availableCottages,
          bookedCottages: dateData.bookedCottages,
          availableItems: dateData.availableItems,
          bookedItems: dateData.bookedItems,
          availableCount: dateData.availableCount,
          bookedCount: dateData.bookedCount
        });
        
        // Determine default status based on category
        const isFunctionHall = category === 'function-halls';
        const defaultStatusForCategory = isFunctionHall 
          ? (isBooked ? 'function-hall-booked-all' : 'function-hall-available')
          : (isBooked ? 'cottage-booked' : 'cottage-available');
        
        const status = {
          status: dateData.status || defaultStatusForCategory, // Use backend status or category-appropriate default
          isBooked: isBooked,
          availableItems: dateData.availableItems || 
            (isFunctionHall ? dateData.availableHalls : dateData.availableCottages) || [],
          bookedItems: dateData.bookedItems ||
            (isFunctionHall ? dateData.bookedHalls : dateData.bookedCottages) || [],
          // Keep legacy field names for backward compatibility
          availableCottages: dateData.availableCottages || (!isFunctionHall ? (dateData.availableItems || []) : []),
          bookedCottages: dateData.bookedCottages || (!isFunctionHall ? (dateData.bookedItems || []) : []),
          // Add function hall specific fields
          availableHalls: isFunctionHall ? (dateData.availableHalls || []) : [],
          bookedHalls: isFunctionHall ? (dateData.bookedHalls || []) : [],
          availableCount: dateData.availableCount,
          bookedCount: dateData.bookedCount
        };
        
        console.log(`[Calendar] 🏠 ${dateString} final status:`, status);
        
        availabilityCache.set(cacheKey, status);
        return status;
      }
    }
    
    // Default to available if no data returned
    console.log(`[Calendar] No data for ${dateString}, defaulting to available (category: ${calendarState.packageCategory})`);
    const category = calendarState.packageCategory;
    let defaultStatus;
    if (category === 'rooms') {
      defaultStatus = { status: 'available-all', availableCount: 4, bookedCount: 0 };
    } else if (category === 'cottages') {
      defaultStatus = { status: 'cottage-available', isBooked: false, availableCount: 3, bookedCount: 0 };
    } else if (category === 'function-halls') {
      defaultStatus = { status: 'function-hall-available', isBooked: false, availableCount: 2, bookedCount: 0 };
    } else {
      defaultStatus = { status: 'available-all', availableCount: 4, bookedCount: 0 };
    }
    
    availabilityCache.set(cacheKey, defaultStatus);
    return defaultStatus;
    
  } catch (error) {
    console.error(`[Calendar] Error fetching availability for ${dateString}:`, error);
    console.error(`[Calendar] Error details:`, error.message);
    console.error(`[Calendar] Category: ${calendarState.packageCategory}`);
    
    // Default to available on error, but log the issue
    const defaultStatus = calendarState.packageCategory === 'rooms' ? 
      { status: 'available-all', availableCount: 4, bookedCount: 0 } :
      { status: 'cottage-available', isBooked: false };
    
    availabilityCache.set(cacheKey, defaultStatus);
    
    // Show user-friendly message if backend is unavailable
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('fetch'))) {
      console.warn('[Calendar] Backend server may be unavailable. Calendar showing default availability.');
    }
    
    return defaultStatus;
  }
}

// Generate calendar HTML for a given month/year
async function generateCalendarHTML(year, month, packageTitle, packageId) {
  const date = new Date(year, month, 1);
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // Calculate max year (one year from current date)
  const maxYear = currentYear + 1;
  const maxMonth = currentMonth;
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = date.getDay();
  
  let calendarHTML = `
    <div class="calendar-header">
      <button class="calendar-nav-btn" onclick="navigateMonth(-1)" ${year <= currentYear && month <= currentMonth ? 'disabled' : ''}>
        <span>‹</span>
      </button>
      <div class="calendar-month-year">
        <select class="calendar-month-select" onchange="changeMonth(this.value)">
          ${generateMonthOptions(month)}
        </select>
        <select class="calendar-year-select" onchange="changeYear(this.value)">
          ${generateYearOptions(year, currentYear, maxYear)}
        </select>
      </div>
      <button class="calendar-nav-btn" onclick="navigateMonth(1)" ${year >= maxYear && month >= maxMonth ? 'disabled' : ''}>
        <span>›</span>
      </button>
    </div>
    <div class="calendar-selection-instruction">
      ${getSelectionInstruction()}
    </div>
    <div class="calendar-grid">
      <div class="calendar-day-header">Sun</div>
      <div class="calendar-day-header">Mon</div>
      <div class="calendar-day-header">Tue</div>
      <div class="calendar-day-header">Wed</div>
      <div class="calendar-day-header">Thu</div>
      <div class="calendar-day-header">Fri</div>
      <div class="calendar-day-header">Sat</div>
  `;
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarHTML += '<div class="calendar-date empty"></div>';
  }
  
  // Batch availability check for the entire month at once
  const firstDate = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0); // Last day of month
  const startDateStr = formatDateForInput(firstDate);
  const endDateStr = formatDateForInput(lastDate);
  
  // Performance tracking
  const perfStart = performance.now();
  const perfStats = {
    fetchTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalDates: daysInMonth
  };
  
  // Make month cache key aware of category and editBookingId (re-edit mode)
  const monthKey = `${packageId}-${calendarState.packageCategory}-${year}-${month}${calendarState.editBookingId ? `-b${calendarState.editBookingId}` : ''}`;
  
  // Check if this month is already fully loaded
  let monthAvailability = {};
  if (loadedMonths.has(monthKey)) {
    if (localStorage.getItem('DEBUG_CALENDAR') === 'true') {
      console.log(`[Calendar Perf] Month ${year}-${month} already loaded (cache hit)`);
    }
    // Reconstruct monthAvailability from cache for this month (include category)
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dateString = formatDateForInput(currentDate);
      const cacheKey = `${packageId}-${calendarState.packageCategory}-${dateString}`;
      const cachedStatus = availabilityCache.get(cacheKey);
      if (cachedStatus) {
        monthAvailability[dateString] = cachedStatus;
      }
    }
  } else {
    if (localStorage.getItem('DEBUG_CALENDAR') === 'true') {
      console.log(`[Calendar] Fetching availability for entire month: ${startDateStr} to ${endDateStr}`);
    }
    
    // Fetch availability for entire month in one request
    const fetchStart = performance.now();
    try {
      const { checkAvailability } = await import('../utils/api.js');
      // Pass category to filter bookings appropriately
      // Exclude current booking from conflict checks if in re-edit mode
      const excludeBookingId = calendarState.editBookingId || null;
      if (excludeBookingId) {
        console.log(`[Calendar] 🔄 Re-edit mode: Month fetch excluding booking ${excludeBookingId} from availability`);
      }
      const result = await checkAvailability(packageId, startDateStr, endDateStr, calendarState.packageCategory, excludeBookingId);
      perfStats.fetchTime = performance.now() - fetchStart;
      
      if (result && result.dateAvailability) {
        monthAvailability = result.dateAvailability;
        if (localStorage.getItem('DEBUG_CALENDAR') === 'true') {
          console.log(`[Calendar] Retrieved availability for ${Object.keys(monthAvailability).length} dates`);
        }
        console.log('[Calendar] monthAvailability keys:', Object.keys(monthAvailability || {}).slice(0, 10));
        
        // Pre-populate cache with all dates (include category to prevent cache pollution)
        Object.keys(monthAvailability).forEach(dateStr => {
          const dateData = monthAvailability[dateStr];
      const cacheKey = `${packageId}-${calendarState.packageCategory}-${dateStr}${calendarState.editBookingId ? `-b${calendarState.editBookingId}` : ''}`;
          availabilityCache.set(cacheKey, dateData);
        });
        
        // Mark this month as loaded
        loadedMonths.add(monthKey);
      }
    } catch (error) {
      console.error('[Calendar] Error fetching month availability:', error);
      if (localStorage.getItem('DEBUG_CALENDAR') === 'true') {
        console.error('[Calendar] Error details:', error.message, error.stack);
      } else {
        console.warn('[Calendar] Backend server may be unavailable. Check if server is running on http://localhost:3000');
      }
      perfStats.fetchTime = performance.now() - fetchStart;
      // Don't mark month as loaded on error, allow retry
    }
  }
  
  // Build bookingsMap derived from monthAvailability (consolidate data sources)
  const bookingsMap = {}; // Maps dateString to array of booked room IDs
  Object.keys(monthAvailability || {}).forEach(dateString => {
    const dayData = monthAvailability[dateString];
    if (dayData && Array.isArray(dayData.bookedRooms) && dayData.bookedRooms.length > 0) {
      bookingsMap[dateString] = dayData.bookedRooms.slice(); // Copy array
    }
  });
  
  console.log(`[Calendar] Derived bookingsMap from availability for ${Object.keys(bookingsMap).length} dates`);
  
  // Now generate status for each day
  const statuses = [];
  const dayData = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dateString = formatDateForInput(currentDate);
    dayData.push({ day, dateString, currentDate });
    
    // Get status from cache or use default (include category to prevent cache pollution)
    const cacheKey = `${packageId}-${calendarState.packageCategory}-${dateString}`;
    const cachedStatus = availabilityCache.get(cacheKey);
    
    if (cachedStatus) {
      statuses.push(cachedStatus);
    } else {
      // Generate default status
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let defaultStatus;
      if (currentDate < today) {
        defaultStatus = { status: 'past', availableCount: 0 };
      } else if (currentDate.toDateString() === today.toDateString()) {
        // Today status varies by category
        defaultStatus = calendarState.packageCategory === 'rooms' ?
          { status: 'today', availableCount: 4 } :
          { status: 'today', isBooked: false, availableCount: calendarState.packageCategory === 'cottages' ? 3 : 2 };
      } else {
        if (calendarState.packageCategory === 'rooms') {
          defaultStatus = { status: 'available-all', availableCount: 4, bookedCount: 0 };
        } else if (calendarState.packageCategory === 'cottages') {
          defaultStatus = { status: 'cottage-available', isBooked: false, availableCount: 3, bookedCount: 0 };
        } else {
          // Function halls
          defaultStatus = { status: 'function-hall-available', isBooked: false, availableCount: 2, bookedCount: 0 };
        }
      }
      statuses.push(defaultStatus);
    }
  }
  
  // Now generate HTML for each day
  // Log calendar state before rendering for debugging
  console.log('[Calendar] ===== RENDERING CALENDAR =====');
  console.log('[Calendar] Month being rendered:', year, month + 1, `(month index ${month})`);
  console.log('[Calendar] Calendar state:', {
    checkin: calendarState.selectedCheckin,
    checkout: calendarState.selectedCheckout,
    checkinType: typeof calendarState.selectedCheckin,
    checkoutType: typeof calendarState.selectedCheckout,
    packageCategory: calendarState.packageCategory
  });
  
  // Track which dates should be highlighted
  const datesToHighlight = [];
  if (calendarState.selectedCheckin || calendarState.selectedCheckout) {
    console.log('[Calendar] Will highlight dates between:', calendarState.selectedCheckin, 'and', calendarState.selectedCheckout);
    console.log('[Calendar] Raw state values (JSON):', JSON.stringify({
      checkin: calendarState.selectedCheckin,
      checkout: calendarState.selectedCheckout
    }));
  }
  
  for (let i = 0; i < daysInMonth; i++) {
    const { day, dateString, currentDate } = dayData[i];
    const statusData = statuses[i];
    
    // Log first few dates to verify dateString generation
    if (i < 7 || (day >= 1 && day <= 7)) {
      console.log(`[Calendar] Day ${day}: dateString="${dateString}" (type: ${typeof dateString}, length: ${dateString.length}), currentDate=${currentDate.toISOString()}`);
    }
    
    // Extract status string and availability count
    const statusType = typeof statusData === 'object' ? statusData.status : statusData;
    const availableCount = typeof statusData === 'object' ? (statusData.availableCount || 0) : 0;
    
    // Enhanced debug log for cottage bookings
    if ((i < 7 || day <= 5) || (statusType && statusType.includes('cottage-booked'))) {
      console.log(`[Calendar] cell ${dateString}: status=${statusType}, category=${calendarState.packageCategory}, availableCount=${availableCount}, bookedCount=${typeof statusData === 'object' ? statusData.bookedCount : 'N/A'}, isBooked=${typeof statusData === 'object' ? statusData.isBooked : 'N/A'}`);
    }
    
    // Determine additional classes for selection state
    let additionalClasses = '';
    
    // Normalize dates for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const normalizedCurrentDate = new Date(currentDate);
    normalizedCurrentDate.setHours(0, 0, 0, 0);
    const isPast = currentDate < today;
    const isToday = currentDate.toDateString() === today.toDateString();
    
    // Check if date is outside constraint range (for cottage selection within room booking dates)
    let isOutsideConstraints = false;
    if (calendarState.constraintStartDate || calendarState.constraintEndDate) {
      if (calendarState.constraintStartDate && dateString < calendarState.constraintStartDate) {
        isOutsideConstraints = true;
      }
      // For cottage selection, exclude checkout date (guests check out on that day)
      // Use >= instead of > to make checkout date unselectable
      if (calendarState.constraintEndDate && dateString >= calendarState.constraintEndDate) {
        isOutsideConstraints = true;
      }
    }
    
    // Override status for past dates, constrained dates, and today
    let finalStatusType = statusType;
    if (isPast) {
      finalStatusType = 'past';
    } else if (isOutsideConstraints) {
      finalStatusType = 'constrained'; // New status for dates outside allowed range
      additionalClasses += ' constrained';
    } else if (isToday) {
      finalStatusType = 'today';
    }
    
    // Compare dates using string format (calendarState stores YYYY-MM-DD strings)
    if (calendarState.selectedCheckin) {
      // calendarState.selectedCheckin is now a YYYY-MM-DD string
      const checkinState = String(calendarState.selectedCheckin);
      const dateStr = String(dateString);
      const matchesCheckin = dateStr === checkinState;
      
      if (matchesCheckin) {
        additionalClasses += ' selected-checkin';
        datesToHighlight.push({ day, dateString, type: 'checkin', additionalClasses: additionalClasses.trim() });
        console.log(`[Calendar] ✓ CHECKIN MATCH: Day ${day}, dateString="${dateStr}" === checkin="${checkinState}" | Classes: "${additionalClasses.trim()}"`);
      } else if (day <= 10) {
        // Log first 10 days for debugging with detailed comparison
        const charDiff = [];
        for (let j = 0; j < Math.max(dateStr.length, checkinState.length); j++) {
          if (dateStr[j] !== checkinState[j]) {
            charDiff.push(`pos ${j}: "${dateStr[j] || ''}" !== "${checkinState[j] || ''}"`);
          }
        }
        console.log(`[Calendar]   Checkin mismatch Day ${day}: dateString="${dateStr}" (len:${dateStr.length}) !== checkin="${checkinState}" (len:${checkinState.length})`, charDiff.length > 0 ? `| Differences: ${charDiff.join(', ')}` : '');
      }
    }
    
    if (calendarState.selectedCheckout) {
      // calendarState.selectedCheckout is now a YYYY-MM-DD string
      const checkoutState = String(calendarState.selectedCheckout);
      const dateStr = String(dateString);
      const matchesCheckout = dateStr === checkoutState;
      
      if (matchesCheckout) {
        additionalClasses += ' selected-checkout';
        datesToHighlight.push({ day, dateString, type: 'checkout', additionalClasses: additionalClasses.trim() });
        console.log(`[Calendar] ✓ CHECKOUT MATCH: Day ${day}, dateString="${dateStr}" === checkout="${checkoutState}" | Classes: "${additionalClasses.trim()}"`);
      } else if (day <= 10) {
        const charDiff = [];
        for (let j = 0; j < Math.max(dateStr.length, checkoutState.length); j++) {
          if (dateStr[j] !== checkoutState[j]) {
            charDiff.push(`pos ${j}: "${dateStr[j] || ''}" !== "${checkoutState[j] || ''}"`);
          }
        }
        console.log(`[Calendar]   Checkout mismatch Day ${day}: dateString="${dateStr}" (len:${dateStr.length}) !== checkout="${checkoutState}" (len:${checkoutState.length})`, charDiff.length > 0 ? `| Differences: ${charDiff.join(', ')}` : '');
      }
    }
    
    // For cottage multi-day selection (in room booking mode)
    if (window.bookingModalCottageMode && calendarState.packageCategory === 'cottages') {
      if (calendarState.selectedCottageDays.includes(dateString)) {
        additionalClasses += ' selected-cottage-day';
      }
    }
    // For cottage and function-hall single date selection (normal mode)
    else if (calendarState.packageCategory === 'cottages' || calendarState.packageCategory === 'function-halls') {
      if (calendarState.selectedCheckin && !calendarState.selectedCheckout) {
        if (dateString === calendarState.selectedCheckin) {
          additionalClasses += ' selected-checkin';
        }
      }
    }
    
    // Check if date is in range using string comparison (more reliable than Date objects)
    // Skip in-range highlighting for cottage multi-day selection mode
    if (calendarState.selectedCheckin && calendarState.selectedCheckout) {
      // Exclusive checkout: highlight between check-in and the day before checkout
      const isInRange = dateString > calendarState.selectedCheckin && dateString < calendarState.selectedCheckout;
      // Only apply in-range styling for room bookings, not cottage multi-day selection
      if (isInRange && !(window.bookingModalCottageMode && calendarState.packageCategory === 'cottages')) {
        additionalClasses += ' in-range';
        datesToHighlight.push({ day, dateString, type: 'in-range', additionalClasses: additionalClasses.trim() });
      }
    }
    
    // Debug log for inclusive range (temporary)
    if (i === 0 && calendarState.selectedCheckin && calendarState.selectedCheckout) {
      console.log('[Calendar] Highlight range inclusive:', calendarState.selectedCheckin, '→', calendarState.selectedCheckout);
    }
    
    // Check if this date has existing bookings (bookingsMap now contains array of room IDs)
    const bookedRoomsForDate = bookingsMap[dateString] || [];
    const hasBookings = bookedRoomsForDate.length > 0;
    
    // Collect all booked rooms for this date
    const allBookedRoomsForDate = new Set(bookedRoomsForDate);
    
    // Add booked class if date has bookings
    if (hasBookings) {
      additionalClasses += ' booked';
    }
    
    // Build tooltip text for availability
    let tooltipText = '';
    if (hasBookings) {
      const bookedRoomsList = Array.from(allBookedRoomsForDate).map(room => {
        return room.startsWith('Room ') ? room.replace('Room ', '') : room;
      }).join(', ');
      tooltipText = `title="Booked rooms: ${bookedRoomsList}"`;
    } else if (calendarState.packageCategory === 'rooms' && availableCount !== undefined && !isPast) {
      tooltipText = `title="${availableCount} of 4 rooms available"`;
    } else if (statusType && (statusType.includes('cottage-booked') || statusType.includes('function-hall-booked'))) {
      const isFunctionHall = statusType.includes('function-hall');
      const categoryLabel = isFunctionHall ? 'Function hall' : 'Cottage';
      const statusData = typeof statuses[i] === 'object' ? statuses[i] : null;
      
      // Handle function hall booked data
      if (isFunctionHall && statusData && statusData.bookedHalls && Array.isArray(statusData.bookedHalls) && statusData.bookedHalls.length > 0) {
        const bookedList = statusData.bookedHalls.join(', ');
        const availableCount = statusData.availableCount || 0;
        const totalCount = 2;
        tooltipText = `title="Booked: ${bookedList} | ${availableCount} of ${totalCount} halls available"`;
      } else if (!isFunctionHall && statusData && statusData.bookedCottages && Array.isArray(statusData.bookedCottages) && statusData.bookedCottages.length > 0) {
        const bookedList = statusData.bookedCottages.join(', ');
        const availableCount = statusData.availableCount || 0;
        const totalCount = 3;
        tooltipText = `title="Booked: ${bookedList} | ${availableCount} of ${totalCount} cottages available"`;
      } else {
        tooltipText = `title="${categoryLabel} booked on this date"`;
      }
    } else if (statusType && (statusType.includes('cottage') || statusType.includes('function-hall'))) {
      const isFunctionHall = statusType.includes('function-hall');
      const categoryLabel = isFunctionHall ? 'Function hall' : 'Cottage';
      const statusData = typeof statuses[i] === 'object' ? statuses[i] : null;
      
      if (statusData && statusData.availableCount !== undefined) {
        const totalCount = isFunctionHall ? 2 : 3;
        const categoryPlural = isFunctionHall ? 'halls' : 'cottages';
        tooltipText = `title="${statusData.availableCount} of ${totalCount} ${categoryPlural} available"`;
      } else if (statusData) {
        // Handle availableHalls for function halls or availableCottages for cottages
        const availableItems = isFunctionHall ? (statusData.availableHalls || []) : (statusData.availableCottages || statusData.availableItems || []);
        if (Array.isArray(availableItems) && availableItems.length > 0) {
          const availableCount = availableItems.length;
          const totalCount = isFunctionHall ? 2 : 3;
          const categoryPlural = isFunctionHall ? 'halls' : 'cottages';
          tooltipText = `title="${availableCount} of ${totalCount} ${categoryPlural} available"`;
        } else {
          tooltipText = `title="${categoryLabel} available on this date"`;
        }
      } else {
        tooltipText = `title="${categoryLabel} available on this date"`;
      }
    }
    
    // Build available rooms count badge - show in top right corner
    let availableRoomsBadge = '';
    if (calendarState.packageCategory === 'rooms' && availableCount !== undefined && !isPast && availableCount < 4) {
      // Show available count badge for room packages when not all rooms available
      availableRoomsBadge = `<div class="available-rooms-badge">${availableCount}</div>`;
    } else if ((calendarState.packageCategory === 'cottages' || calendarState.packageCategory === 'function-halls') && 
               statusData && typeof statusData === 'object' && !isPast) {
      // Show badge when partial availability exists (removed !statusData.isBooked condition)
      const availableCount = statusData.availableCount !== undefined ? statusData.availableCount : (statusData.availableItems?.length);
      const totalCount = calendarState.packageCategory === 'cottages' ? 3 : 2; // Total cottages/halls
      
      // Only show badge if we have valid data (not undefined)
      if (availableCount !== undefined) {
        if (availableCount > 0 && availableCount < totalCount) {
          availableRoomsBadge = `<div class="available-rooms-badge">${availableCount}</div>`;
        } else if (availableCount === 0) {
          // Show "0" badge only when we have confirmed zero availability
          availableRoomsBadge = `<div class="available-rooms-badge fully-booked">0</div>`;
        }
      }
    }
    
    // Cottage names removed - availability count badge is sufficient
    
    // Build final class string with proper spacing
    // Add generic .booked class for cottages/halls with bookings (for consistent hover/selection behavior with rooms)
    const hasBookingsGeneric = (calendarState.packageCategory === 'cottages' || calendarState.packageCategory === 'function-halls') 
      && statusType && statusType.includes('booked');
    const genericBookedClass = hasBookingsGeneric ? ' booked' : '';
    const finalClassString = `calendar-date ${finalStatusType}${genericBookedClass}${additionalClasses}`.trim().replace(/\s+/g, ' ');
    
    calendarHTML += `
      <div class="${finalClassString}" 
           data-date="${dateString}" 
           data-datestring="${dateString}"
           data-status="${finalStatusType}"
           data-available-count="${availableCount}"
           ${tooltipText}>
        <span class="date-number">${day}</span>
        ${availableRoomsBadge}
      </div>
    `;
  }
  
  // Log summary of highlighted dates
  if (datesToHighlight.length > 0) {
    console.log('[Calendar] Dates highlighted:', datesToHighlight.map(d => `Day ${d.day} (${d.dateString}) - ${d.type}`).join(', '));
  } else if (calendarState.selectedCheckin || calendarState.selectedCheckout) {
    console.warn('[Calendar] ⚠️ WARNING: No dates matched! Checkin:', calendarState.selectedCheckin, 'Checkout:', calendarState.selectedCheckout);
  }
  
  console.log('[Calendar] ===== END RENDERING =====');
  
  calendarHTML += '</div>';
  
  // Don't generate buttons in calendar HTML - they're handled separately
  
  // Performance summary logging
  const totalTime = performance.now() - perfStart;
  if (localStorage.getItem('DEBUG_CALENDAR') === 'true') {
    console.log(`[Calendar Perf] Month ${year}-${month}: ${totalTime.toFixed(0)}ms total`);
    if (perfStats.fetchTime > 0) {
      console.log(`  - API fetch: ${perfStats.fetchTime.toFixed(0)}ms`);
      console.log(`  - Generation: ${(totalTime - perfStats.fetchTime).toFixed(0)}ms`);
    }
    console.log(`  - Cache hits: ${perfStats.cacheHits}/${perfStats.totalDates}`);
  }
  
  return calendarHTML;
}

// Get selection instruction based on package type and current state
function getSelectionInstruction() {
  // Check if we're modifying a specific date from booking modal
  if (calendarState.modifyingDate) {
    if (calendarState.modifyingDate === 'checkin') {
      return 'Click a date to select your check-in date';
    } else if (calendarState.modifyingDate === 'checkout') {
      return 'Click a date after check-in to select your check-out date';
    }
  }
  
  // Normal flow for standalone calendar
  if (calendarState.packageCategory === 'rooms') {
    if (calendarState.selectionStep === 1) {
      return 'Click a date to select check-in date';
    } else {
      // Convert YYYY-MM-DD string to Date for display
      const checkinDate = calendarState.selectedCheckin ? new Date(calendarState.selectedCheckin + 'T00:00:00') : null;
      const displayDate = checkinDate ? checkinDate.toLocaleDateString() : calendarState.selectedCheckin;
      return 'Click a date after ' + displayDate + ' to select check-out date';
    }
  } else {
    return 'Click a date to select your preferred date';
  }
}

// Check if dateString is in selected range (accepts YYYY-MM-DD string)
// calendarState.selectedCheckin/selectedCheckout are YYYY-MM-DD strings
function isDateInRange(dateString) {
  if (!calendarState.selectedCheckin || !calendarState.selectedCheckout) {
    return false;
  }
  
  // All values are YYYY-MM-DD strings, so direct string comparison works
  if (localStorage.getItem('DEBUG_CALENDAR') === 'true') {
    console.log('[Calendar] Comparing dates in isDateInRange:', {
      checkin: calendarState.selectedCheckin,
      checkout: calendarState.selectedCheckout,
      currentDate: dateString,
      inRange: dateString > calendarState.selectedCheckin && dateString <= calendarState.selectedCheckout
    });
  }
  
  // Don't highlight the check-in and check-out dates themselves (they have their own styling)
  // String comparison works correctly for YYYY-MM-DD format (inclusive checkout)
  return dateString > calendarState.selectedCheckin && dateString <= calendarState.selectedCheckout;
}

// Handle date click
// Initialize event delegation for date selection (performance optimization)
function initializeCalendarEvents() {
  const calendarGrid = document.querySelector('.calendar-grid');
  if (calendarGrid) {
    // Remove any existing listener
    const existingListener = calendarGrid._dateClickListener;
    if (existingListener) {
      calendarGrid.removeEventListener('click', existingListener);
    }
    
    // Add single event listener to calendar container
    const listener = (e) => {
      const dateCell = e.target.closest('.calendar-date');
      if (dateCell && !dateCell.classList.contains('past') && !dateCell.classList.contains('maintenance')) {
        const dateString = dateCell.dataset.datestring;
        const status = dateCell.dataset.status;
        if (dateString) {
          handleDateClick(dateString, status);
        }
      }
    };
    
    calendarGrid._dateClickListener = listener;
    calendarGrid.addEventListener('click', listener);
  }
}

// Toggle a day for cottage multi-day selection
function toggleCottageDay(dateString) {
  const index = calendarState.selectedCottageDays.indexOf(dateString);
  
  if (index > -1) {
    // Day already selected, remove it
    calendarState.selectedCottageDays.splice(index, 1);
    console.log('[Calendar] Removed cottage day:', dateString);
  } else {
    // Add day to selection
    calendarState.selectedCottageDays.push(dateString);
    console.log('[Calendar] Added cottage day:', dateString);
  }
  
  console.log('[Calendar] Selected cottage days:', calendarState.selectedCottageDays);
  updateSelectionVisuals();
  updateCalendarButtons();
}

function handleDateClick(dateString, status) {
  // Don't allow clicking on past dates, maintenance, or constrained dates
  if (status === 'past' || status === 'maintenance' || status === 'constrained') {
    return;
  }
  
  // Check if date has existing bookings - warn user but allow selection (availability check will catch conflicts)
  const dateCell = document.querySelector(`.calendar-date[data-datestring="${dateString}"]`);
  if (dateCell && dateCell.classList.contains('booked')) {
    const bookedRoomsLabel = dateCell.querySelector('.booked-rooms-label');
    const bookedRooms = bookedRoomsLabel ? bookedRoomsLabel.textContent : 'some rooms';
    console.warn(`[Calendar] ⚠️ Date ${dateString} has existing bookings (${bookedRooms}). Availability check will validate.`);
    // Don't block - let availability validation handle it during booking submission
  }
  
  // Special handling for cottage multi-day selection in room bookings
  if (window.bookingModalCottageMode && calendarState.packageCategory === 'cottages') {
    toggleCottageDay(dateString);
    return;
  }
  
  // dateString is already in YYYY-MM-DD format from data-date attribute
  // No need to convert to Date object and back
  
  // Save current state before making changes (for undo functionality)
  saveStateForUndo();
  
  console.log('[Calendar] Date clicked:', dateString);
  console.log('[Calendar] Current modifying mode:', calendarState.modifyingDate);
  
  // Check if we're modifying a specific date from booking modal
  if (calendarState.modifyingDate) {
    console.log('[Calendar] In modify mode, modifyingDate =', calendarState.modifyingDate);
    
    if (calendarState.modifyingDate === 'checkin') {
      calendarState.selectedCheckin = dateString;
      console.log('[Calendar] Setting checkin:', dateString);
      // If checkout exists and is before new checkin, clear it (compare as strings)
      if (calendarState.selectedCheckout && dateString >= calendarState.selectedCheckout) {
        calendarState.selectedCheckout = null;
        console.log('[Calendar] Cleared checkout (before checkin)');
      }
    } else if (calendarState.modifyingDate === 'checkout') {
      // Check if checkout is after checkin (compare as strings)
      if (calendarState.selectedCheckin && dateString <= calendarState.selectedCheckin) {
        alert('Check-out date must be after check-in date');
        return;
      }
      calendarState.selectedCheckout = dateString;
      console.log('[Calendar] Setting checkout:', dateString);
    } else if (calendarState.modifyingDate === 'cottage') {
      // Handle cottage date modification
      calendarState.selectedCheckin = dateString;
      console.log('[Calendar] Setting cottage date:', dateString);
    } else if (calendarState.modifyingDate === 'function-hall') {
      // Handle function hall date modification
      calendarState.selectedCheckin = dateString;
      console.log('[Calendar] Setting function hall date:', dateString);
    } else {
      console.warn('[Calendar] Unknown modifying mode:', calendarState.modifyingDate);
    }
    
    console.log('[Calendar] State after modify:', { checkin: calendarState.selectedCheckin, checkout: calendarState.selectedCheckout });
    updateSelectionVisuals();
    
    // Don't auto-close - let user confirm with button
    return;
  }
  
  // Normal flow for standalone calendar
  
  if (calendarState.packageCategory === 'rooms') {
    if (calendarState.selectionStep === 1) {
      // First click - select check-in
      calendarState.selectedCheckin = dateString;
      calendarState.selectionStep = 2;
      console.log('[Calendar] Setting checkin (step 1):', dateString);
      updateSelectionVisuals();
    } else {
      // Second click - select check-out (compare as strings)
      if (dateString > calendarState.selectedCheckin) {
        calendarState.selectedCheckout = dateString;
        console.log('[Calendar] Setting checkout (step 2):', dateString);
        console.log('[Calendar] Final state:', { checkin: calendarState.selectedCheckin, checkout: calendarState.selectedCheckout });
        updateSelectionVisuals();
        // No automatic confirmation - user will click Confirm button when ready
      } else {
        alert('Check-out date must be after check-in date');
      }
    }
  } else {
    // Cottage or function hall - single date selection
    calendarState.selectedCheckin = dateString;
    console.log('[Calendar] Setting checkin (cottage/hall):', dateString);
    updateSelectionVisuals();
    // Show confirmation after a brief delay to show the selection
    setTimeout(() => {
      const packageType = calendarState.packageCategory === 'cottages' ? 'cottage' : 'function hall';
      // Convert YYYY-MM-DD string to Date for display
      const checkinDate = new Date(calendarState.selectedCheckin + 'T00:00:00');
      if (confirm(`Confirm your ${packageType} booking for ${checkinDate.toLocaleDateString()}?`)) {
        openBookingWithDates();
      } else {
        resetDateSelection();
      }
    }, 100);
  }
}

// Save current state to undo stack
function saveStateForUndo() {
  const stateSnapshot = {
    selectedCheckin: calendarState.selectedCheckin, // Keep as string
    selectedCheckout: calendarState.selectedCheckout, // Keep as string
    selectionStep: calendarState.selectionStep,
    modifyingDate: calendarState.modifyingDate
  };
  
  // Only save if state actually changed (compare as strings)
  const lastState = calendarState.undoStack[calendarState.undoStack.length - 1];
  if (!lastState || 
      lastState.selectedCheckin !== stateSnapshot.selectedCheckin ||
      lastState.selectedCheckout !== stateSnapshot.selectedCheckout ||
      lastState.selectionStep !== stateSnapshot.selectionStep ||
      lastState.modifyingDate !== stateSnapshot.modifyingDate) {
    calendarState.undoStack.push(stateSnapshot);
    
    // Limit undo stack to prevent memory issues
    if (calendarState.undoStack.length > 10) {
      calendarState.undoStack.shift();
    }
  }
}

// Undo last date selection
function undoLastSelection() {
  if (calendarState.undoStack.length === 0) {
    return; // Nothing to undo
  }
  
  const previousState = calendarState.undoStack.pop();
  
  calendarState.selectedCheckin = previousState.selectedCheckin;
  calendarState.selectedCheckout = previousState.selectedCheckout;
  calendarState.selectionStep = previousState.selectionStep;
  calendarState.modifyingDate = previousState.modifyingDate;
  
  updateCalendarDisplay();
}

// Confirm date selection and proceed with booking
async function confirmDateSelection() {
  console.log('[confirmDateSelection] 🔍 Debug:', {
    bookingModalCottageMode: window.bookingModalCottageMode,
    packageCategory: calendarState.packageCategory,
    selectedCottageDays: calendarState.selectedCottageDays,
    selectedCottageDaysLength: calendarState.selectedCottageDays?.length,
    selectedCheckin: calendarState.selectedCheckin,
    selectedCheckout: calendarState.selectedCheckout
  });
  
  // Special handling for cottage multi-day selection mode (in room bookings)
  if (window.bookingModalCottageMode && calendarState.packageCategory === 'cottages') {
    console.log('[confirmDateSelection] ✅ Entered cottage multi-day mode');
    if (calendarState.selectedCottageDays.length === 0) {
      alert('Please select at least one date for cottage rental');
      return;
    }
    console.log('[confirmDateSelection] Confirming cottage multi-day selection:', calendarState.selectedCottageDays);
    openBookingWithDates();
    return;
  }
  
  console.log('[confirmDateSelection] ⚠️ Not in cottage multi-day mode, checking standard flow');
  
  // Safety check - different requirements for single-day vs multi-day bookings
  const isSingleDayBooking = calendarState.packageCategory === 'cottages' || calendarState.packageCategory === 'function-halls';
  
  if (isSingleDayBooking) {
    // Single-day bookings only need check-in date
    if (!calendarState.selectedCheckin) {
      console.warn('[confirmDateSelection] No check-in date selected for single-day booking');
      return;
    }
  } else {
    // Multi-day bookings (rooms) need both check-in and check-out
    if (!calendarState.selectedCheckin || !calendarState.selectedCheckout) {
      console.warn('[confirmDateSelection] Missing dates for multi-day booking');
      return;
    }
  }
  
  console.log('[confirmDateSelection] Confirming selection:', {
    category: calendarState.packageCategory,
    checkin: calendarState.selectedCheckin,
    checkout: calendarState.selectedCheckout,
    modifyingDate: calendarState.modifyingDate
  });
  
  // If re-editing, validate that selected items are available on new date(s)
  if (calendarState.modifyingDate && window.bookingFormState) {
    // Cottage booking validation
    if (calendarState.packageCategory === 'cottages') {
      const editingCottages = window.bookingFormState.selectedCottagesFromFlow || [];
      
      if (editingCottages.length > 0) {
        console.log('[confirmDateSelection] Validating cottage availability for:', editingCottages);
        
        const { checkAvailability } = await import('../utils/api.js');
        const newDate = calendarState.selectedCheckin;
        
        try {
          // Get package ID from booking being edited, or from booking data, or default to 1
          let packageId = window.bookingFormState?.packageId;
          if (!packageId && calendarState.editBookingId) {
            // Try to get from booking data if available
            const booking = window.allBookings?.find(b => String(b.id) === String(calendarState.editBookingId));
            packageId = booking?.package_id;
            if (packageId) {
              console.log('[confirmDateSelection] Retrieved packageId from booking data:', packageId);
            }
          }
          packageId = packageId || 1;  // Last resort default
          
          console.log('[confirmDateSelection] Checking cottage availability:', {
            newDate,
            editingCottages,
            packageId,
            editBookingId: calendarState.editBookingId,
            editBookingIdType: typeof calendarState.editBookingId,
            packageIdSource: window.bookingFormState?.packageId ? 'bookingFormState' : (calendarState.editBookingId ? 'bookingData' : 'default')
          });
          
          const availabilityResult = await checkAvailability(packageId, newDate, newDate, 'cottages', calendarState.editBookingId);
          const dayData = availabilityResult?.dateAvailability?.[newDate];
          const availableCottages = dayData?.availableCottages || [];
          
          console.log('[confirmDateSelection] Availability result:', {
            newDate,
            availableCottages,
            editingCottages,
            editBookingId: calendarState.editBookingId,
            hasDayData: !!dayData
          });
          
          const unavailableCottages = editingCottages.filter(cottage => !availableCottages.includes(cottage));
          
          if (unavailableCottages.length > 0) {
            console.error('[confirmDateSelection] Cottage conflict detected:', {
              unavailableCottages,
              availableCottages,
              editingCottages,
              editBookingId: calendarState.editBookingId,
              date: newDate
            });
            alert(`Cannot change to ${newDate}:\n\nThe following cottages are already booked:\n${unavailableCottages.join(', ')}\n\nPlease select a different date or remove these cottages from your booking.`);
            return;
          }
          
          console.log('[confirmDateSelection] All cottages available on new date');
        } catch (error) {
          console.error('[confirmDateSelection] Error checking cottage availability:', error);
        }
      }
    }
    
    // Room booking validation
    if (calendarState.packageCategory === 'rooms') {
      const editingRooms = window.bookingFormState.selectedRoomsFromFlow || [];
      
      if (editingRooms.length > 0 && calendarState.selectedCheckin && calendarState.selectedCheckout) {
        console.log('[confirmDateSelection] Validating room availability for:', editingRooms);
        
        const { checkAvailability } = await import('../utils/api.js');
        const newCheckin = calendarState.selectedCheckin;
        const newCheckout = calendarState.selectedCheckout;
        
        try {
          const availabilityResult = await checkAvailability(1, newCheckin, newCheckout, 'rooms', calendarState.editBookingId);
          
          // Check each date in the range
          const unavailableRooms = [];
          const dateRange = [];
          let currentDate = new Date(newCheckin + 'T00:00:00');
          const endDate = new Date(newCheckout + 'T00:00:00');
          
          while (currentDate < endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            dateRange.push(dateStr);
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          // Check if each room is available for all dates
          for (const room of editingRooms) {
            for (const dateStr of dateRange) {
              const dayData = availabilityResult?.dateAvailability?.[dateStr];
              const availableRooms = dayData?.availableRooms || [];
              
              if (!availableRooms.includes(room)) {
                if (!unavailableRooms.some(ur => ur.room === room && ur.date === dateStr)) {
                  unavailableRooms.push({ room, date: dateStr });
                }
              }
            }
          }
          
          if (unavailableRooms.length > 0) {
            const conflicts = unavailableRooms.map(ur => `${ur.room} on ${ur.date}`).join('\n');
            alert(`Cannot change dates:\n\nThe following rooms are already booked:\n${conflicts}\n\nPlease select different dates or remove these rooms from your booking.`);
            return;
          }
          
          console.log('[confirmDateSelection] All rooms available for new date range');
        } catch (error) {
          console.error('[confirmDateSelection] Error checking room availability:', error);
        }
      }
    }
  }
  
  // If we're modifying dates from booking modal, update the booking modal directly
  if (calendarState.modifyingDate) {
    openBookingWithDates();
  } else if (calendarState.packageCategory === 'rooms' && calendarState.packageTitle === 'Standard Room') {
    // For Standard Room, show available rooms selection instead of booking modal
    // calendarState.selectedCheckin/selectedCheckout are already YYYY-MM-DD strings
    const checkinDate = calendarState.selectedCheckin;
    const checkoutDate = calendarState.selectedCheckout;
    
    // Close calendar modal
    closeCalendarModal();
    
    // Show available rooms selection
    if (window.showAvailableRooms) {
      window.showAvailableRooms(checkinDate, checkoutDate);
    }
  } else {
    // Normal flow - proceed with booking
    openBookingWithDates();
  }
}

// Reset date selection
function resetDateSelection() {
  calendarState.selectedCheckin = null;
  calendarState.selectedCheckout = null;
  calendarState.selectionStep = 1;
  calendarState.modifyingDate = null;
  calendarState.undoStack = []; // Clear undo stack on reset
  updateCalendarDisplay();
}

// DOM Verification: Check which calendar elements actually have highlight classes
function verifyCalendarHighlighting() {
  if (!calendarState.selectedCheckin && !calendarState.selectedCheckout) {
    return; // No dates to verify
  }
  
  console.log('[Calendar] 🔍 DOM Verification Starting...');
  console.log('[Calendar] Expected checkin:', calendarState.selectedCheckin);
  console.log('[Calendar] Expected checkout:', calendarState.selectedCheckout);
  
  // Find all elements with highlight classes
  const checkinElements = document.querySelectorAll('.calendar-date.selected-checkin');
  const checkoutElements = document.querySelectorAll('.calendar-date.selected-checkout');
  const inRangeElements = document.querySelectorAll('.calendar-date.in-range');
  
  console.log('[Calendar] DOM Elements found:');
  console.log(`  - ${checkinElements.length} elements with "selected-checkin" class`);
  console.log(`  - ${checkoutElements.length} elements with "selected-checkout" class`);
  console.log(`  - ${inRangeElements.length} elements with "in-range" class`);
  
  // Verify checkin elements
  checkinElements.forEach((el, idx) => {
    const dataDate = el.getAttribute('data-date');
    const dataDateString = el.getAttribute('data-datestring');
    const classList = Array.from(el.classList).join(' ');
    const dayNumber = el.querySelector('.date-number')?.textContent;
    
    console.log(`[Calendar] Checkin Element ${idx + 1}:`, {
      dayNumber,
      dataDate,
      dataDateString,
      classList,
      matches: dataDate === calendarState.selectedCheckin || dataDateString === calendarState.selectedCheckin
    });
    
    if (dataDate !== calendarState.selectedCheckin && dataDateString !== calendarState.selectedCheckin) {
      console.warn(`[Calendar] ⚠️ MISMATCH: Checkin element has data-date="${dataDate}" but expected "${calendarState.selectedCheckin}"`);
    }
  });
  
  // Verify checkout elements
  checkoutElements.forEach((el, idx) => {
    const dataDate = el.getAttribute('data-date');
    const dataDateString = el.getAttribute('data-datestring');
    const classList = Array.from(el.classList).join(' ');
    const dayNumber = el.querySelector('.date-number')?.textContent;
    
    console.log(`[Calendar] Checkout Element ${idx + 1}:`, {
      dayNumber,
      dataDate,
      dataDateString,
      classList,
      matches: dataDate === calendarState.selectedCheckout || dataDateString === calendarState.selectedCheckout
    });
    
    if (dataDate !== calendarState.selectedCheckout && dataDateString !== calendarState.selectedCheckout) {
      console.warn(`[Calendar] ⚠️ MISMATCH: Checkout element has data-date="${dataDate}" but expected "${calendarState.selectedCheckout}"`);
    }
  });
  
  // Verify in-range elements
  if (calendarState.selectedCheckin && calendarState.selectedCheckout) {
    inRangeElements.forEach((el, idx) => {
      const dataDate = el.getAttribute('data-date');
      const dayNumber = el.querySelector('.date-number')?.textContent;
      const isExpectedInRange = dataDate > calendarState.selectedCheckin && dataDate <= calendarState.selectedCheckout;
      
      if (!isExpectedInRange) {
        console.warn(`[Calendar] ⚠️ Unexpected in-range: Day ${dayNumber} (${dataDate}) is not between ${calendarState.selectedCheckin} and ${calendarState.selectedCheckout}`);
      }
    });
    
    console.log(`[Calendar] Verified ${inRangeElements.length} in-range elements`);
  }
  
  console.log('[Calendar] 🔍 DOM Verification Complete');
}

// Update calendar display
async function updateCalendarDisplay(year = null, month = null) {
  const calendarContainer = document.querySelector('.calendar-container');
  if (calendarContainer) {
    const today = new Date();
    
    // If no year/month provided, try to get current calendar view
    if (year === null || month === null) {
      const monthSelect = document.querySelector('.calendar-month-select');
      const yearSelect = document.querySelector('.calendar-year-select');
      
      if (monthSelect && yearSelect) {
        // Use current calendar view
        year = parseInt(yearSelect.value);
        month = parseInt(monthSelect.value);
      } else {
        // Fallback to current date
        year = today.getFullYear();
        month = today.getMonth();
      }
    }
    
    // Load calendar asynchronously
    calendarContainer.innerHTML = '<div style="text-align: center; padding: 40px;">Loading calendar...</div>';
    try {
      const html = await generateCalendarHTML(year, month, calendarState.packageTitle, 1);
      calendarContainer.innerHTML = html;
      
      // DOM Verification: Check which elements actually have highlight classes
      verifyCalendarHighlighting();
      
      // Update button visibility after calendar renders
      updateCalendarButtons();
    } catch (error) {
      console.error('Error generating calendar:', error);
      const errorMessage = error.message.includes('backend server') 
        ? error.message 
        : 'Error loading calendar. Please try again.';
      calendarContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #d32f2f; background: #ffebee; border-radius: 8px; margin: 20px;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 16px;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3 style="margin: 0 0 8px 0;">Unable to Load Calendar</h3>
          <p style="margin: 0;">${errorMessage}</p>
        </div>
      `;
    }
  }
}

// Open booking modal with selected dates
async function openBookingWithDates() {
  let reservationType = 'room';
  let preFillDates = {};
  
  if (calendarState.packageCategory === 'rooms') {
    reservationType = 'room';
    // calendarState.selectedCheckin/selectedCheckout are already YYYY-MM-DD strings
    preFillDates = {
      checkin: calendarState.selectedCheckin,
      checkout: calendarState.selectedCheckout
    };
  } else if (calendarState.packageCategory === 'cottages') {
    reservationType = 'cottage';
    // calendarState.selectedCheckin is already a YYYY-MM-DD string
    preFillDates = {
      date: calendarState.selectedCheckin
    };
  } else if (calendarState.packageCategory === 'function-halls') {
    reservationType = 'function-hall';
    // calendarState.selectedCheckin is already a YYYY-MM-DD string
    preFillDates = {
      date: calendarState.selectedCheckin
    };
  }
  
  // Save booking modal mode before closing (it gets cleared in closeCalendarModal)
  const wasModifyingFromBookingModal = window.bookingModalCalendarMode;
  
  console.log('[openBookingWithDates] Before close - bookingModalCalendarMode:', wasModifyingFromBookingModal);
  console.log('[openBookingWithDates] Dates to apply:', preFillDates);
  
  // Close calendar modal
  closeCalendarModal();
  
  // Check if we were modifying dates from booking modal
  if (wasModifyingFromBookingModal) {
    console.log('[openBookingWithDates] Updating booking modal dates');
    // Update the booking modal dates directly
    if (calendarState.packageCategory === 'rooms' && window.updateBookingDates && preFillDates.checkin && preFillDates.checkout) {
      console.log('[openBookingWithDates] Calling updateBookingDates with:', preFillDates.checkin, preFillDates.checkout);
      window.updateBookingDates(preFillDates.checkin, preFillDates.checkout);
    }
    // Cottage single-date update
    if (calendarState.packageCategory === 'cottages' && window.updateCottageDate && preFillDates.date) {
      console.log('[openBookingWithDates] Calling updateCottageDate with:', preFillDates.date);
      window.updateCottageDate(preFillDates.date);
    }
    // Function hall single-date update
    if (calendarState.packageCategory === 'function-halls' && window.updateFunctionHallDate && preFillDates.date) {
      console.log('[openBookingWithDates] Calling updateFunctionHallDate with:', preFillDates.date);
      window.updateFunctionHallDate(preFillDates.date);
    }
  } else {
    // reservationType is already determined above based on packageCategory
    
    console.log('[Calendar] Opening booking modal with reservationType:', reservationType, 'category:', calendarState.packageCategory);
    
    // Check if we're adding cottages to a room booking (special mode - multi-day selection)
    if (window.bookingModalCottageMode && calendarState.packageCategory === 'cottages') {
      console.log('[Calendar] Cottage multi-day selection for room booking - dates selected:', calendarState.selectedCottageDays);
      
      // Store the selected cottage dates for use in the booking modal
      if (window.updateCottageDatesForRoomBooking && calendarState.selectedCottageDays.length > 0) {
        // Pass array of selected dates (not a range)
        window.updateCottageDatesForRoomBooking(calendarState.selectedCottageDays);
      } else {
        alert('Please select at least one date for cottage rental');
        return;
      }
      
      // Clear the cottage mode flag and reset selected days
      window.bookingModalCottageMode = false;
      calendarState.selectedCottageDays = [];
      return;
    }
    
    // Room selection bypass ONLY applies to rooms category
    if (calendarState.packageCategory === 'rooms' && reservationType === 'room') {
      if (window.showAvailableRooms) {
        window.showAvailableRooms(preFillDates.checkin, preFillDates.checkout);
        return;
      }
    }
    // Cottage selection: show available cottages for the selected day
    if (calendarState.packageCategory === 'cottages' && reservationType === 'cottage') {
      const visitDate = calendarState.selectedCheckin || preFillDates.date;
      if (window.showAvailableCottages) {
        window.showAvailableCottages(visitDate);
        return;
      }
    }
    // Function halls: show available halls for the selected day
    if (calendarState.packageCategory === 'function-halls') {
      const visitDate = calendarState.selectedCheckin || preFillDates.checkin;
      if (window.showAvailableFunctionHalls) {
        window.showAvailableFunctionHalls(visitDate, visitDate);
        return;
      }
      // Local fallback: render function hall selection if global handler isn't available
      if (visitDate) {
        try {
          await (async function localShowAvailableFunctionHalls(checkin, checkout) {
          const container = document.getElementById('function-halls-container');
          // If there's no dedicated container on this page, create a simple full-screen layer
          let host = container;
          if (!host) {
            host = document.createElement('div');
            host.id = 'function-halls-container';
            host.style.position = 'fixed';
            host.style.inset = '0';
            host.style.background = 'rgba(255,255,255,0.98)';
            host.style.zIndex = '9999';
            host.style.overflow = 'auto';
            document.body.appendChild(host);
          }

          host.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--color-muted);">Checking availability...</div>';

          const visit = checkin || null;
          window.functionHallVisitDate = visit;
          let available = [];
          try {
            const { checkAvailability } = await import('../utils/api.js');
            const result = visit ? await checkAvailability(1, visit, visit, 'function-halls') : null;
            available = (result?.dateAvailability?.[visit]?.availableHalls) || result?.availableHalls || [];
          } catch (_) {
            available = [];
          }

          let halls = [];
          try {
            const mod = await import('../utils/bookingState.js');
            halls = mod.bookingState?.allFunctionHalls || ['Grand Function Hall','Intimate Function Hall'];
          } catch (_) {
            halls = ['Grand Function Hall','Intimate Function Hall'];
          }

          host.innerHTML = `
            <div class="fh-wrap" style="width:100%; max-width:1100px; margin:40px auto; padding: 0 16px;">
              <div class="room-selection-header" style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                <div style="min-width:240px; flex:1 1 auto;">
                  <h4 style="margin:0; text-align:left;">Select Your Function Hall</h4>
                  <p style="margin:4px 0 0 0; text-align:left;">${visit ? `Date: ${visit}` : 'Pick a date to view availability'}</p>
                </div>
                <div style="display:flex; gap:10px; flex:0 0 auto;">
                  <button class="back-to-calendar-btn" onclick="openCalendarModal('Function Hall Booking', 5, 'function-halls')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Change Dates
                  </button>
                  <button id="fh-exit-btn" class="exit-selection-btn" onclick="(function(){ const layer=document.getElementById('function-halls-container'); if(layer && layer.parentNode){layer.parentNode.removeChild(layer);} window.selectedHallId=null; })()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    Exit
                  </button>
                </div>
              </div>
              <div class="room-selection-grid" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:16px;">
                ${halls.filter(hall => Array.isArray(available) && available.includes(hall)).map(hall => {
                  return `
                  <div class="room-selection-card" data-hall-id="${hall}">
                    <div class="room-card-image">
                      <img src="images/Function Hall.JPG" alt="${hall}">
                      <div class="room-selection-indicator">
                        <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\"><path d=\"M20 6L9 17l-5-5\"></path></svg>
                      </div>
                    </div>
                    <div class="room-card-content">
                      <h4>${hall}</h4>
                      <div class="room-price">${hall.includes('Grand') ? '₱15,000/day' : '₱10,000/day'}</div>
                      <button class="room-select-btn">Select</button>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            </div>`;

          // Attach interactions using onclick handlers (matching packages.js approach)
          const cards = host.querySelectorAll('.room-selection-card[data-hall-id]');
          cards.forEach(card => {
            const id = card.getAttribute('data-hall-id');
            card.setAttribute('onclick', `toggleHallSelection('${id}')`);
          });

          // Call the global button renderer if available, otherwise create local fallback
          if (typeof window.renderFunctionHallsContinueCTA === 'function') {
            window.renderFunctionHallsContinueCTA();
          } else {
            // Fallback: create button directly
            let cta = document.getElementById('floating-continue-btn');
            if (!cta) {
              cta = document.createElement('button');
              cta.id = 'floating-continue-btn';
              cta.className = 'floating-continue-btn';
              cta.textContent = 'Continue Booking';
              cta.onclick = function() {
                if (!window.selectedHallId || !window.functionHallVisitDate) return;
                if (window.openBookingModal) {
                  const preFill = { date: window.functionHallVisitDate, hallId: window.selectedHallId, hallName: window.selectedHallId };
                  window.openBookingModal('function-hall', 'Function Hall Booking', preFill, false, null, 'function-halls');
                }
              };
              document.body.appendChild(cta);
            }
            cta.style.display = 'flex';
            cta.disabled = !window.selectedHallId || !window.functionHallVisitDate;
          }
        })(visitDate, visitDate);
        return;
        } catch (e) {
          // If fallback fails, proceed to open modal directly as a last resort
          console.warn('[Calendar] Local hall selection fallback failed:', e);
        }
      }
    }
    
    // Fallback: if show functions are not available, open booking modal directly
    if (window.openBookingModal) {
      window.openBookingModal(reservationType, calendarState.packageTitle, preFillDates);
    }
  }
}

// Confirm date selection
window.confirmDateSelection = function() {
  openBookingWithDates();
};

// Create and show the calendar modal
export function openCalendarModal(packageTitle, reservationCount, packageCategory = 'rooms', editBookingId = null, constraintDates = null) {
  // Check authentication (allow edit mode to proceed as it's already authenticated)
  if (!editBookingId) {
    const authState = window.getAuthState ? window.getAuthState() : { isLoggedIn: false };
    if (!authState.isLoggedIn) {
      console.log('[openCalendarModal] User not authenticated, redirecting to login');
      
      // Store calendar parameters for after login
      const calendarIntent = {
        packageTitle,
        reservationCount,
        packageCategory,
        timestamp: Date.now()
      };
      sessionStorage.setItem('calendarIntent', JSON.stringify(calendarIntent));
      
      // Show toast message
      if (window.showToast) {
        window.showToast('Please login to continue booking', 'info');
      } else {
        alert('Please login to continue booking');
      }
      
      // Get current page for return URL
      const currentHash = window.location.hash || '#/packages';
      const returnUrl = currentHash.includes('#/auth') || currentHash.includes('#/register') 
        ? '#/packages' 
        : currentHash;
      
      // Redirect to login with return URL
      window.location.hash = `#/auth?return=${encodeURIComponent(returnUrl)}`;
      return;
    }
  }
  
  // Save booking modal state BEFORE closing (so it doesn't get cleared)
  const savedModalMode = window.bookingModalCalendarMode;
  const savedModalDates = window.bookingModalCurrentDates;
  
  // Close any existing modal
  closeCalendarModal();
  
  // Restore booking modal state after closing
  window.bookingModalCalendarMode = savedModalMode;
  window.bookingModalCurrentDates = savedModalDates;
  
  // Clear any stale booking modal state unless explicitly coming from booking modal
  // This prevents old state from interfering with new bookings
  if (!window.bookingModalCalendarMode) {
    window.bookingModalCurrentDates = null;
  }
  
  // Reset calendar state for fresh selection
  calendarState.selectedCheckin = null;
  calendarState.selectedCheckout = null;
  calendarState.selectionStep = 1;
  calendarState.undoStack = [];
  calendarState.selectedCottageDays = []; // Reset cottage days
  
  // Pre-load cottage dates when opening in cottage mode for re-editing
  if (window.bookingModalCottageMode && packageCategory === 'cottages' && window.bookingFormState?.cottageDates) {
    calendarState.selectedCottageDays = [...window.bookingFormState.cottageDates];
    console.log('[Calendar] 🏠 Pre-loading cottage dates for re-edit:', calendarState.selectedCottageDays);
    console.log('[Calendar] ✅ Pre-selection loaded successfully - these dates will be highlighted as selected');
    
    // Verify the dates are in correct format
    calendarState.selectedCottageDays.forEach((date, idx) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.error(`[Calendar] ❌ Invalid date format at index ${idx}:`, date);
      }
    });
  } else if (window.bookingModalCottageMode && packageCategory === 'cottages') {
    console.log('[Calendar] ℹ️ Cottage mode active but no existing dates to pre-load');
    console.log('[Calendar] 🔍 Debug:', {
      bookingFormState: window.bookingFormState,
      cottageDates: window.bookingFormState?.cottageDates
    });
  }
  
  console.log('[Calendar] 🔍 Calendar state after opening:', {
    selectedCheckin: calendarState.selectedCheckin,
    selectedCheckout: calendarState.selectedCheckout,
    selectedCottageDays: calendarState.selectedCottageDays,
    constraintStartDate: calendarState.constraintStartDate,
    constraintEndDate: calendarState.constraintEndDate,
    bookingModalCottageMode: window.bookingModalCottageMode,
    packageCategory: calendarState.packageCategory,
    editBookingId: calendarState.editBookingId
  });
  
  console.log('[Calendar] Opening for category:', packageCategory, 'package:', packageTitle);
  console.log('[Calendar] Booking modal mode:', window.bookingModalCalendarMode);
  console.log('[Calendar] Booking modal dates:', window.bookingModalCurrentDates);
  
  // Clear cache if category changed to prevent cache pollution
  const previousCategory = calendarState.packageCategory;
  if (previousCategory && previousCategory !== packageCategory) {
    console.log(`[Calendar] Category changed from '${previousCategory}' to '${packageCategory}', clearing cache`);
    availabilityCache.clear();
    loadedMonths.clear();
  }
  // Also clear cache when opening in re-edit mode to avoid stale availability
  if (editBookingId) {
    console.log('[Calendar] Re-edit detected (excludeBookingId set) - clearing availability cache');
    availabilityCache.clear();
    loadedMonths.clear();
  }
  
  // Initialize calendar state
  calendarState.packageCategory = packageCategory;
  calendarState.editBookingId = editBookingId; // Store booking ID being re-edited
  calendarState.packageTitle = packageTitle;
  
  // Set date constraints if provided (for cottage selection within room booking range)
  if (constraintDates) {
    calendarState.constraintStartDate = constraintDates.startDate || null;
    calendarState.constraintEndDate = constraintDates.endDate || null;
    console.log('[Calendar] Date constraints set:', calendarState.constraintStartDate, 'to', calendarState.constraintEndDate);
  } else {
    calendarState.constraintStartDate = null;
    calendarState.constraintEndDate = null;
  }
  
  // Check if we're coming from booking modal with existing dates
  if (window.bookingModalCalendarMode && window.bookingModalCurrentDates) {
    // Set which date we're modifying
    calendarState.modifyingDate = window.bookingModalCalendarMode;
    
    // Only pre-populate if dates are actually selected (not null or empty)
    const hasCheckin = window.bookingModalCurrentDates.checkin !== null && window.bookingModalCurrentDates.checkin !== '';
    const hasCheckout = window.bookingModalCurrentDates.checkout !== null && window.bookingModalCurrentDates.checkout !== '';
    
    if (hasCheckin) {
      calendarState.selectedCheckin = normalizeDateInput(window.bookingModalCurrentDates.checkin);
      console.log('[Calendar] Setting selectedCheckin from booking modal:', window.bookingModalCurrentDates.checkin, '→', calendarState.selectedCheckin);
      console.log('[Calendar] Current state checkin type:', typeof calendarState.selectedCheckin, calendarState.selectedCheckin);
    }
    if (hasCheckout) {
      calendarState.selectedCheckout = normalizeDateInput(window.bookingModalCurrentDates.checkout);
      console.log('[Calendar] Setting selectedCheckout from booking modal:', window.bookingModalCurrentDates.checkout, '→', calendarState.selectedCheckout);
      console.log('[Calendar] Current state checkout type:', typeof calendarState.selectedCheckout, calendarState.selectedCheckout);
    }
    
    // Log final state after setting from booking modal
    if (hasCheckin || hasCheckout) {
      console.log('[Calendar] State after booking modal init:', { 
        checkin: calendarState.selectedCheckin, 
        checkout: calendarState.selectedCheckout,
        checkinType: typeof calendarState.selectedCheckin,
        checkoutType: typeof calendarState.selectedCheckout
      });
    }
    
    // Set selection step based on what dates are available
    if (hasCheckin && hasCheckout) {
      calendarState.selectionStep = 2; // Both dates selected
    } else if (hasCheckin) {
      calendarState.selectionStep = 2; // Check-in selected, ready for check-out
    } else {
      calendarState.selectionStep = 1; // Start fresh
    }
  } else {
    calendarState.selectedCheckin = null;
    calendarState.selectedCheckout = null;
    calendarState.selectionStep = 1;
    calendarState.modifyingDate = null;
  }
  
  const today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth();
  
  // If we have pre-filled dates, use their month/year to open calendar to correct month
  if (window.bookingModalCurrentDates) {
    const checkinDate = window.bookingModalCurrentDates.checkin;
    if (checkinDate) {
      // Parse YYYY-MM-DD string to get year and month
      const dateParts = checkinDate.split('-');
      if (dateParts.length === 3) {
        const checkinYear = parseInt(dateParts[0], 10);
        const checkinMonth = parseInt(dateParts[1], 10) - 1; // Convert to 0-indexed month
        if (!isNaN(checkinYear) && !isNaN(checkinMonth)) {
          currentYear = checkinYear;
          currentMonth = checkinMonth;
          console.log('[Calendar] Opening to month from checkin date:', checkinDate, '→ Year:', currentYear, 'Month:', currentMonth + 1);
        }
      }
    }
  }
  
  const modalHTML = `
    <div class="calendar-modal-overlay" id="calendar-modal-overlay">
      <div class="calendar-modal">
        <button class="calendar-modal-close" onclick="closeCalendarModal()" aria-label="Close calendar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div class="calendar-modal-header">
          <h3>Select Your Dates</h3>
          <p class="calendar-package-title">${packageTitle}</p>
          <p class="calendar-reservation-count">${reservationCount} total reservations</p>
        </div>
        
        <div class="calendar-container" id="calendar-content">
          Loading calendar...
        </div>
        
        <!-- Action buttons will be dynamically added here -->
        <div class="calendar-actions-dynamic" id="calendar-actions-dynamic" style="display: none; margin: 20px 0; text-align: center; gap: 12px; flex-wrap: wrap; justify-content: center;">
        </div>
        
        <div class="calendar-legend">
          <div class="legend-item">
            <div class="legend-color past"></div>
            <span>Past Dates</span>
          </div>
          <div class="legend-item">
            <div class="legend-color today"></div>
            <span>Today</span>
          </div>
          ${packageCategory === 'rooms' ? `
          <div class="legend-item">
            <div class="legend-color available-all"></div>
            <span>All Available</span>
          </div>
          <div class="legend-item">
            <div class="legend-color available-2"></div>
            <span>Partial</span>
          </div>
          <div class="legend-item">
            <div class="legend-color available-1"></div>
            <span>Limited</span>
          </div>
          <div class="legend-item">
            <div class="legend-color booked-all"></div>
            <span>Fully Booked</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #ffcdd2; color: #b71c1c; font-size: 10px; padding: 4px; line-height: 1;">A1, A2</div>
            <span>Booked Rooms</span>
          </div>
          ` : packageCategory === 'cottages' ? `
          <div class="legend-item">
            <div class="legend-color cottage-available"></div>
            <span>Available</span>
          </div>
          <div class="legend-item">
            <div class="legend-color cottage-partial"></div>
            <span>Partially Booked</span>
          </div>
          <div class="legend-item">
            <div class="legend-color cottage-booked"></div>
            <span>Fully Booked</span>
          </div>
          ` : packageCategory === 'function-halls' ? `
          <div class="legend-item">
            <div class="legend-color function-hall-available"></div>
            <span>Available</span>
          </div>
          <div class="legend-item">
            <div class="legend-color function-hall-partial"></div>
            <span>Partially Booked</span>
          </div>
          <div class="legend-item">
            <div class="legend-color function-hall-booked-all"></div>
            <span>Fully Booked</span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  
  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  currentModal = document.getElementById('calendar-modal-overlay');
  
  // Prevent background scrolling
  document.body.style.overflow = 'hidden';
  document.body.classList.add('modal-open');
  
  // Disable Lenis smooth scrolling when modal is open
  const lenisInstance = window.lenisInstance || document.querySelector('.lenis')?.lenis;
  if (lenisInstance) {
    lenisInstance.stop();
  }
  
  // Add click outside to close
  currentModal.addEventListener('click', (e) => {
    if (e.target === currentModal) {
      closeCalendarModal();
    }
  });
  
  // Prevent scroll events from bubbling to background
  currentModal.addEventListener('wheel', (e) => {
    e.stopPropagation();
  }, { passive: false });
  
  // Prevent middle mouse scroll from affecting background
  currentModal.addEventListener('mousedown', (e) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault();
    }
  });
  
  // Additional scroll prevention for the modal content
  const modalContent = currentModal.querySelector('.calendar-modal');
  if (modalContent) {
    modalContent.addEventListener('wheel', (e) => {
      e.stopPropagation();
    }, { passive: false });
    
    modalContent.addEventListener('mousedown', (e) => {
      if (e.button === 1) { // Middle mouse button
        e.preventDefault();
      }
    });
  }
  
  // Load calendar asynchronously after modal is rendered with skeleton
  const calendarContainer = document.getElementById('calendar-content');
  if (calendarContainer) {
    // Show loading skeleton immediately
    calendarContainer.innerHTML = `
      <div class="calendar-loading-skeleton">
        <div class="skeleton-header"></div>
        <div class="skeleton-grid">
          ${Array(35).fill('<div class="skeleton-day"></div>').join('')}
        </div>
      </div>
    `;
    
    // Load calendar asynchronously (non-blocking)
    requestAnimationFrame(() => {
      generateCalendarHTML(currentYear, currentMonth, packageTitle, 1).then(html => {
        if (calendarContainer) {
          calendarContainer.innerHTML = html;
          
          // DOM Verification: Check which elements actually have highlight classes
          verifyCalendarHighlighting();
          
          // Update button visibility after calendar renders
          updateCalendarButtons();
          
          // Initialize event delegation for date selection
          initializeCalendarEvents();
        }
      }).catch(error => {
        console.error('Error loading calendar:', error);
        if (calendarContainer) {
          const errorMessage = error.message.includes('backend server') 
            ? error.message 
            : 'Error loading calendar. Please try again.';
          calendarContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #d32f2f; background: #ffebee; border-radius: 8px; margin: 20px;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 16px;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <h3 style="margin: 0 0 8px 0;">Unable to Load Calendar</h3>
              <p style="margin: 0;">${errorMessage}</p>
            </div>
          `;
        }
      });
    });
  }
  
  // Add escape key to close
  document.addEventListener('keydown', handleEscapeKey);
  
  // Animate modal in
  setTimeout(() => {
    currentModal.classList.add('show');
  }, 10);
}

// Close the calendar modal
export function closeCalendarModal() {
  if (currentModal) {
    currentModal.classList.remove('show');
    
    // Restore background scrolling
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    
    // Re-enable Lenis smooth scrolling when modal is closed
    const lenisInstance = window.lenisInstance || document.querySelector('.lenis')?.lenis;
    if (lenisInstance) {
      lenisInstance.start();
    }
    
    setTimeout(() => {
      if (currentModal && currentModal.parentNode) {
        currentModal.parentNode.removeChild(currentModal);
      }
      currentModal = null;
    }, 300);
    
    // Remove escape key listener
    document.removeEventListener('keydown', handleEscapeKey);
    
    // Clear booking modal state when calendar closes
    // This prevents stale state from interfering with subsequent calendar opens
    console.log('[Calendar] Closing modal, clearing booking modal state');
    window.bookingModalCalendarMode = null;
    window.bookingModalCurrentDates = null;
  }
}

// Handle escape key press
function handleEscapeKey(e) {
  if (e.key === 'Escape') {
    closeCalendarModal();
  }
}

// Format date for input field (YYYY-MM-DD)
function formatDateForInput(date) {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0); // Ensure local midnight to avoid timezone issues
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Generate month options for select dropdown
function generateMonthOptions(selectedMonth) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return monthNames.map((month, index) => 
    `<option value="${index}" ${index === selectedMonth ? 'selected' : ''}>${month}</option>`
  ).join('');
}

// Generate year options for select dropdown
function generateYearOptions(selectedYear, minYear, maxYear) {
  let options = '';
  for (let year = minYear; year <= maxYear; year++) {
    options += `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}</option>`;
  }
  return options;
}

// Update only the visual selection state without regenerating entire calendar
function updateSelectionVisuals() {
  document.querySelectorAll('.calendar-date').forEach(el => {
    const dateString = el.dataset.date; // Already in YYYY-MM-DD format
    if (!dateString) return;
    
    // Remove previous selection classes
    el.classList.remove('selected-checkin', 'selected-checkout', 'in-range', 'selected-cottage-day');
    
    // Handle cottage multi-day selection mode
    if (window.bookingModalCottageMode && calendarState.packageCategory === 'cottages') {
      if (calendarState.selectedCottageDays.includes(dateString)) {
        el.classList.add('selected-cottage-day');
      }
    } else {
      // Normal mode: Add new selection classes if applicable (calendarState stores YYYY-MM-DD strings)
      if (calendarState.selectedCheckin && dateString === calendarState.selectedCheckin) {
        el.classList.add('selected-checkin');
      }
      
      if (calendarState.selectedCheckout && dateString === calendarState.selectedCheckout) {
        el.classList.add('selected-checkout');
      }
      
      // Add in-range class (compare as strings)
      if (calendarState.selectedCheckin && calendarState.selectedCheckout) {
        // Only apply in-range for non-cottage modes
        if (!(window.bookingModalCottageMode && calendarState.packageCategory === 'cottages')) {
          // Compare as strings to determine if date is in range (exclusive checkout)
          if (dateString > calendarState.selectedCheckin && dateString < calendarState.selectedCheckout) {
            el.classList.add('in-range');
          }
        }
      }
    }
  });
  
  // Update button visibility after visual selection update
  updateCalendarButtons();
}

// Update calendar button visibility
function updateCalendarButtons() {
  const actionsDiv = document.getElementById('calendar-actions-dynamic');
  if (!actionsDiv) return;
  
  const hasUndoActions = calendarState.undoStack.length > 0;
  const hasBothDates = calendarState.selectedCheckin && calendarState.selectedCheckout;
  const isModifyingSingleDate = calendarState.modifyingDate && (calendarState.selectedCheckin || calendarState.selectedCheckout);
  
  // For single-day bookings (cottages/function halls), only need check-in date
  const isSingleDayBooking = calendarState.packageCategory === 'cottages' || calendarState.packageCategory === 'function-halls';
  const hasSingleDate = isSingleDayBooking && calendarState.selectedCheckin;
  
  // For cottage multi-day selection mode
  const hasCottageDaysSelected = window.bookingModalCottageMode && calendarState.selectedCottageDays.length > 0;
  
  const shouldShow = hasUndoActions || hasBothDates || isModifyingSingleDate || hasSingleDate || hasCottageDaysSelected;
  
  if (shouldShow) {
    // Generate button HTML
    let buttonsHTML = '';
    
    if (hasUndoActions) {
      buttonsHTML += `
        <button class="calendar-undo-btn" onclick="undoLastSelection()" title="Undo last selection">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7v6h6"/>
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
          </svg>
          Undo
        </button>
      `;
    }
    
    if (hasBothDates || isModifyingSingleDate || hasSingleDate || hasCottageDaysSelected) {
      // Determine button text based on mode
      let buttonText = 'Confirm Selection';
      if (hasCottageDaysSelected) {
        const dayCount = calendarState.selectedCottageDays.length;
        buttonText = `Confirm ${dayCount} Day${dayCount > 1 ? 's' : ''}`;
      }
      
      buttonsHTML += `
        <button class="calendar-confirm-btn" onclick="confirmDateSelection()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          ${buttonText}
        </button>
      `;
    }
    
    actionsDiv.innerHTML = buttonsHTML;
    actionsDiv.style.display = 'flex';
    
    if (localStorage.getItem('DEBUG_CALENDAR') === 'true') {
      console.log('[Calendar] Updated buttons:', { hasUndoActions, hasBothDates, isModifyingSingleDate, hasSingleDate });
    }
  } else {
    actionsDiv.innerHTML = '';
    actionsDiv.style.display = 'none';
  }
}

// Navigate to previous/next month
function navigateMonth(direction) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // Get current calendar state
  const calendarContainer = document.querySelector('.calendar-container');
  if (!calendarContainer) return;
  
  // Extract current year and month from the selects
  const monthSelect = document.querySelector('.calendar-month-select');
  const yearSelect = document.querySelector('.calendar-year-select');
  
  if (!monthSelect || !yearSelect) return;
  
  let newMonth = parseInt(monthSelect.value) + direction;
  let newYear = parseInt(yearSelect.value);
  
  // Handle month overflow
  if (newMonth < 0) {
    newMonth = 11;
    newYear--;
  } else if (newMonth > 11) {
    newMonth = 0;
    newYear++;
  }
  
  // Check bounds (one year limit)
  const maxYear = currentYear + 1;
  const maxMonth = currentMonth;
  
  if (newYear < currentYear || (newYear === currentYear && newMonth < currentMonth)) {
    return; // Can't go before current month
  }
  
  if (newYear > maxYear || (newYear === maxYear && newMonth > maxMonth)) {
    return; // Can't go beyond one year
  }
  
  // Show loading indicator
  calendarContainer.classList.add('calendar-transitioning');
  
  // Debounce month navigation to prevent rapid API calls
  if (monthNavigationTimer) {
    clearTimeout(monthNavigationTimer);
  }
  
  monthNavigationTimer = setTimeout(() => {
    updateCalendarDisplay(newYear, newMonth).then(() => {
      calendarContainer.classList.remove('calendar-transitioning');
      // Re-initialize event delegation after calendar update
      initializeCalendarEvents();
    });
    monthNavigationTimer = null;
  }, 150); // 150ms debounce for better UX
}

// Change month via select dropdown
function changeMonth(monthValue) {
  const yearSelect = document.querySelector('.calendar-year-select');
  if (!yearSelect) return;
  
  const newYear = parseInt(yearSelect.value);
  const newMonth = parseInt(monthValue);
  
  updateCalendarDisplay(newYear, newMonth);
}

// Change year via select dropdown
function changeYear(yearValue) {
  const monthSelect = document.querySelector('.calendar-month-select');
  if (!monthSelect) return;
  
  const newYear = parseInt(yearValue);
  const newMonth = parseInt(monthSelect.value);
  
  updateCalendarDisplay(newYear, newMonth);
}

// Make functions globally available for onclick handlers
window.closeCalendarModal = closeCalendarModal;
window.openCalendarModal = openCalendarModal;
window.handleDateClick = handleDateClick;
window.resetDateSelection = resetDateSelection;
window.undoLastSelection = undoLastSelection;
window.confirmDateSelection = confirmDateSelection;
window.navigateMonth = navigateMonth;
window.changeMonth = changeMonth;
window.changeYear = changeYear;
