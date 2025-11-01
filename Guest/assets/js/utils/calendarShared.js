// Shared Calendar Utility Functions
// Extracted from calendarModal.js for reuse in both modal and page views

/**
 * Generate calendar HTML for a given month/year
 * This function is shared between calendar modal and calendar page
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @param {string} packageTitle - Package title for display
 * @param {number} packageId - Package ID
 * @param {Object} state - Calendar state object (shared between modal and page)
 * @param {Object} cache - Cache and loaded months tracking (shared between modal and page)
 * @param {boolean|Function} isPageViewOrCallback - If boolean true, indicates page view mode. If function, is date click callback (deprecated, use boolean)
 */
export async function generateCalendarHTML(year, month, packageTitle, packageId, state, cache, isPageViewOrCallback = false) {
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
  
  // Determine if this is page view
  const isPageView = isPageViewOrCallback === true || (typeof isPageViewOrCallback === 'boolean' && isPageViewOrCallback);
  
  // Use appropriate navigation handlers based on context
  const navHandlerPrefix = isPageView ? 'window.calendarPage.' : '';
  
  let calendarHTML = `
    <div class="calendar-header">
      <button class="calendar-nav-btn" onclick="${navHandlerPrefix}navigateMonth(-1)" ${year <= currentYear && month <= currentMonth ? 'disabled' : ''}>
        <span>‹</span>
      </button>
      <div class="calendar-month-year">
        <select class="calendar-month-select" onchange="${navHandlerPrefix}changeMonth(this.value)">
          ${generateMonthOptions(month)}
        </select>
        <select class="calendar-year-select" onchange="${navHandlerPrefix}changeYear(this.value)">
          ${generateYearOptions(year, currentYear, maxYear)}
        </select>
      </div>
      <button class="calendar-nav-btn" onclick="${navHandlerPrefix}navigateMonth(1)" ${year >= maxYear && month >= maxMonth ? 'disabled' : ''}>
        <span>›</span>
      </button>
    </div>
    ${isPageView ? '' : `<div class="calendar-selection-instruction">
      ${getSelectionInstruction(state)}
    </div>`}
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
  const monthKey = `${packageId}-${state.packageCategory}-${year}-${month}${state.editBookingId ? `-b${state.editBookingId}` : ''}`;
  
  // Check if this month is already fully loaded
  let monthAvailability = {};
  if (cache.loadedMonths.has(monthKey)) {
    if (localStorage.getItem('DEBUG_CALENDAR') === 'true') {
      console.log(`[Calendar Perf] Month ${year}-${month} already loaded (cache hit)`);
    }
    // Reconstruct monthAvailability from cache for this month (include category)
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dateString = formatDateForInput(currentDate);
      const cacheKey = `${packageId}-${state.packageCategory}-${dateString}`;
      const cachedStatus = cache.availabilityCache.get(cacheKey);
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
      const excludeBookingId = state.editBookingId || null;
      if (excludeBookingId) {
        console.log(`[Calendar] 🔄 Re-edit mode: Month fetch excluding booking ${excludeBookingId} from availability`);
      }
      
      console.log(`[Calendar] 📅 Calendar Page: Fetching availability for ${state.packageCategory} from ${startDateStr} to ${endDateStr}`);
      
      const result = await checkAvailability(packageId, startDateStr, endDateStr, state.packageCategory, excludeBookingId);
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
          const cacheKey = `${packageId}-${state.packageCategory}-${dateStr}${state.editBookingId ? `-b${state.editBookingId}` : ''}`;
          cache.availabilityCache.set(cacheKey, dateData);
        });
        
        // Mark this month as loaded
        cache.loadedMonths.add(monthKey);
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
    const cacheKey = `${packageId}-${state.packageCategory}-${dateString}`;
    const cachedStatus = cache.availabilityCache.get(cacheKey);
    
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
        defaultStatus = state.packageCategory === 'rooms' ?
          { status: 'today', availableCount: 4 } :
          { status: 'today', isBooked: false, availableCount: state.packageCategory === 'cottages' ? 3 : 2 };
      } else {
        if (state.packageCategory === 'rooms') {
          defaultStatus = { status: 'available-all', availableCount: 4, bookedCount: 0 };
        } else if (state.packageCategory === 'cottages') {
          defaultStatus = { status: 'cottage-available', isBooked: false, availableCount: 3, bookedCount: 0 };
        } else {
          // Function halls
          defaultStatus = { status: 'cottage-available', isBooked: false, availableCount: 2, bookedCount: 0 };
        }
      }
      statuses.push(defaultStatus);
    }
  }
  
  // Now generate HTML for each day
  console.log('[Calendar] ===== RENDERING CALENDAR =====');
  console.log('[Calendar] Month being rendered:', year, month + 1, `(month index ${month})`);
  console.log('[Calendar] Calendar state:', {
    checkin: state.selectedCheckin,
    checkout: state.selectedCheckout,
    packageCategory: state.packageCategory
  });
  
  for (let i = 0; i < daysInMonth; i++) {
    const { day, dateString, currentDate } = dayData[i];
    const statusData = statuses[i];
    
    // Extract status string and availability count
    const statusType = typeof statusData === 'object' ? statusData.status : statusData;
    const availableCount = typeof statusData === 'object' ? (statusData.availableCount || 0) : 0;
    
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
    if (state.constraintStartDate || state.constraintEndDate) {
      if (state.constraintStartDate && dateString < state.constraintStartDate) {
        isOutsideConstraints = true;
      }
      if (state.constraintEndDate && dateString >= state.constraintEndDate) {
        isOutsideConstraints = true;
      }
    }
    
    // Override status for past dates, constrained dates, and today
    let finalStatusType = statusType;
    if (isPast) {
      finalStatusType = 'past';
    } else if (isOutsideConstraints) {
      finalStatusType = 'constrained';
      additionalClasses += ' constrained';
    } else if (isToday) {
      finalStatusType = 'today';
    }
    
    // For page view, we don't show selection highlights (that's for modal only)
    // But we still need to mark booked dates
    const bookedRoomsForDate = bookingsMap[dateString] || [];
    const hasBookings = bookedRoomsForDate.length > 0;
    
    // Add booked class if date has bookings
    if (hasBookings) {
      additionalClasses += ' booked';
    }
    
    // Build tooltip text for availability
    let tooltipText = '';
    if (hasBookings) {
      const bookedRoomsList = Array.from(new Set(bookedRoomsForDate)).map(room => {
        return room.startsWith('Room ') ? room.replace('Room ', '') : room;
      }).join(', ');
      tooltipText = `title="Booked: ${bookedRoomsList}"`;
    } else if (state.packageCategory === 'rooms' && availableCount !== undefined && !isPast) {
      tooltipText = `title="${availableCount} of 4 rooms available"`;
    } else if (statusType && statusType.includes('cottage-booked')) {
      const categoryLabel = state.packageCategory === 'function-halls' ? 'Function hall' : 'Cottage';
      const statusDataObj = typeof statuses[i] === 'object' ? statuses[i] : null;
      
      if (statusDataObj && statusDataObj.bookedCottages && Array.isArray(statusDataObj.bookedCottages) && statusDataObj.bookedCottages.length > 0) {
        const bookedList = statusDataObj.bookedCottages.join(', ');
        const availableCount = statusDataObj.availableCount || 0;
        const totalCount = state.packageCategory === 'cottages' ? 3 : 2;
        tooltipText = `title="Booked: ${bookedList} | ${availableCount} of ${totalCount} available"`;
      } else {
        tooltipText = `title="${categoryLabel} booked on this date"`;
      }
    } else if (statusType && statusType.includes('cottage')) {
      const categoryLabel = state.packageCategory === 'function-halls' ? 'Function hall' : 'Cottage';
      const statusDataObj = typeof statuses[i] === 'object' ? statuses[i] : null;
      if (statusDataObj && statusDataObj.availableCount !== undefined) {
        const totalCount = state.packageCategory === 'cottages' ? 3 : 2;
        const categoryPlural = categoryLabel.toLowerCase() + (categoryLabel.toLowerCase() === 'function hall' ? 's' : 's');
        tooltipText = `title="${statusDataObj.availableCount} of ${totalCount} ${categoryPlural} available"`;
      } else {
        tooltipText = `title="${categoryLabel} available on this date"`;
      }
    }
    
    // Build available rooms count badge
    let availableRoomsBadge = '';
    if (state.packageCategory === 'rooms' && availableCount !== undefined && !isPast && availableCount < 4) {
      availableRoomsBadge = `<div class="available-rooms-badge">${availableCount}</div>`;
    } else if ((state.packageCategory === 'cottages' || state.packageCategory === 'function-halls') && 
               statusData && typeof statusData === 'object' && !isPast) {
      const availableCount = statusData.availableCount !== undefined ? statusData.availableCount : (statusData.availableItems?.length);
      const totalCount = state.packageCategory === 'cottages' ? 3 : 2;
      
      if (availableCount !== undefined) {
        if (availableCount > 0 && availableCount < totalCount) {
          availableRoomsBadge = `<div class="available-rooms-badge">${availableCount}</div>`;
        } else if (availableCount === 0) {
          availableRoomsBadge = `<div class="available-rooms-badge fully-booked">0</div>`;
        }
      }
    }
    
    // For page view, add click handler to show availability modal
    const clickHandler = isPageView && !isPast && !isOutsideConstraints ? 
      `onclick="if(window.handleCalendarPageDateClick){window.handleCalendarPageDateClick('${dateString}', '${state.packageCategory}');}"` : '';
    
    // Build final class string
    const hasBookingsGeneric = (state.packageCategory === 'cottages' || state.packageCategory === 'function-halls') 
      && statusType && statusType.includes('booked');
    const genericBookedClass = hasBookingsGeneric ? ' booked' : '';
    const finalClassString = `calendar-date ${finalStatusType}${genericBookedClass}${additionalClasses}`.trim().replace(/\s+/g, ' ');
    
    calendarHTML += `
      <div class="${finalClassString}" 
           data-date="${dateString}" 
           data-datestring="${dateString}"
           data-status="${finalStatusType}"
           data-available-count="${availableCount}"
           ${tooltipText}
           ${clickHandler}>
        <span class="date-number">${day}</span>
        ${availableRoomsBadge}
      </div>
    `;
  }
  
  console.log('[Calendar] ===== END RENDERING =====');
  
  calendarHTML += '</div>';
  
  // Performance summary logging
  const totalTime = performance.now() - perfStart;
  if (localStorage.getItem('DEBUG_CALENDAR') === 'true') {
    console.log(`[Calendar Perf] Month ${year}-${month}: ${totalTime.toFixed(0)}ms total`);
    if (perfStats.fetchTime > 0) {
      console.log(`  - API fetch: ${perfStats.fetchTime.toFixed(0)}ms`);
      console.log(`  - Generation: ${(totalTime - perfStats.fetchTime).toFixed(0)}ms`);
    }
  }
  
  return calendarHTML;
}

/**
 * Generate month options for select dropdown
 */
function generateMonthOptions(selectedMonth) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return monthNames.map((month, index) => 
    `<option value="${index}" ${index === selectedMonth ? 'selected' : ''}>${month}</option>`
  ).join('');
}

/**
 * Generate year options for select dropdown
 */
function generateYearOptions(selectedYear, minYear, maxYear) {
  let options = '';
  for (let year = minYear; year <= maxYear; year++) {
    options += `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}</option>`;
  }
  return options;
}

/**
 * Get selection instruction based on package type and current state
 */
function getSelectionInstruction(state) {
  if (state.modifyingDate) {
    if (state.modifyingDate === 'checkin') {
      return 'Click a date to select your check-in date';
    } else if (state.modifyingDate === 'checkout') {
      return 'Click a date after check-in to select your check-out date';
    }
  }
  
  if (state.packageCategory === 'rooms') {
    if (state.selectionStep === 1) {
      return 'Click a date to select check-in date';
    } else {
      const checkinDate = state.selectedCheckin ? new Date(state.selectedCheckin + 'T00:00:00') : null;
      const displayDate = checkinDate ? checkinDate.toLocaleDateString() : state.selectedCheckin;
      return 'Click a date after ' + displayDate + ' to select check-out date';
    }
  } else {
    return 'Click a date to select your preferred date';
  }
}

/**
 * Format date for input field (YYYY-MM-DD)
 */
function formatDateForInput(date) {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0); // Ensure local midnight to avoid timezone issues
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

