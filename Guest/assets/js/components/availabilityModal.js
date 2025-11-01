// Availability Information Modal Component
// Displays availability details for a clicked date and provides "Book [type]" button

let currentAvailabilityModal = null;

/**
 * Open availability information modal for a specific date and category
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} category - Reservation category: 'rooms', 'cottages', or 'function-halls'
 */
export async function openAvailabilityModal(dateString, category = 'rooms') {
  console.log('[AvailabilityModal] Opening modal for date:', dateString, 'category:', category);
  
  // Close any existing modal
  closeAvailabilityModal();
  
  // Get availability data for the date
  const { checkAvailability } = await import('../utils/api.js');
  const packageId = 1; // Default package ID
  
  try {
    // Fetch availability (use same date for check-in and check-out for single day)
    const result = await checkAvailability(packageId, dateString, dateString, category);
    
    console.log('[AvailabilityModal] Availability result:', result);
    console.log('[AvailabilityModal] dateAvailability keys:', result?.dateAvailability ? Object.keys(result.dateAvailability) : 'none');
    console.log('[AvailabilityModal] Looking for date:', dateString);
    
    // Extract date-specific availability data
    const dateData = result?.dateAvailability?.[dateString];
    console.log('[AvailabilityModal] dateData for', dateString, ':', dateData);
    
    // Build modal content based on category
    let modalContent = '';
    let bookButtonText = '';
    let reservationType = '';
    
    if (category === 'rooms') {
      const availableCount = dateData?.availableCount || 0;
      const bookedCount = dateData?.bookedCount || 0;
      const totalCount = 4;
      const availableRooms = dateData?.availableRooms || [];
      const bookedRooms = dateData?.bookedRooms || [];
      
      const isFullyBooked = availableCount === 0;
      const isPartiallyBooked = availableCount > 0 && availableCount < totalCount;
      
      modalContent = `
        <div class="availability-info">
          <h3>Room Availability</h3>
          <div class="availability-date">${formatDateDisplay(dateString)}</div>
          
          <div class="availability-summary">
            <div class="availability-stat">
              <span class="stat-label">Available:</span>
              <span class="stat-value ${isFullyBooked ? 'booked' : 'available'}">${availableCount} of ${totalCount} rooms</span>
            </div>
            <div class="availability-stat">
              <span class="stat-label">Booked:</span>
              <span class="stat-value booked">${bookedCount} rooms</span>
            </div>
          </div>
          
          ${availableRooms.length > 0 ? `
            <div class="availability-details">
              <div class="available-items">
                <strong>Available Rooms:</strong>
                <div class="items-list">${availableRooms.map(room => `<span class="item-tag available">${room}</span>`).join('')}</div>
              </div>
            </div>
          ` : ''}
          
          ${bookedRooms.length > 0 ? `
            <div class="availability-details">
              <div class="booked-items">
                <strong>Booked Rooms:</strong>
                <div class="items-list">${bookedRooms.map(room => `<span class="item-tag booked">${room}</span>`).join('')}</div>
              </div>
            </div>
          ` : ''}
          
          ${isFullyBooked ? `
            <div class="availability-warning">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              All rooms are booked for this date.
            </div>
          ` : ''}
        </div>
      `;
      
      bookButtonText = 'Book Rooms';
      reservationType = 'room';
      
    } else if (category === 'cottages') {
      const availableCount = dateData?.availableCount ?? 0;
      const bookedCount = dateData?.bookedCount ?? 0;
      const totalCount = 3;
      const availableCottages = dateData?.availableCottages || dateData?.availableItems || [];
      const bookedCottages = dateData?.bookedCottages || dateData?.bookedItems || [];
      const isBooked = dateData?.isBooked ?? false;
      
      console.log('[AvailabilityModal] Cottage data:', {
        availableCount,
        bookedCount,
        availableCottages,
        bookedCottages,
        isBooked,
        allDateDataKeys: dateData ? Object.keys(dateData) : 'no dateData'
      });
      
      modalContent = `
        <div class="availability-info">
          <h3>Cottage Availability</h3>
          <div class="availability-date">${formatDateDisplay(dateString)}</div>
          
          <div class="availability-summary">
            <div class="availability-stat">
              <span class="stat-label">Available:</span>
              <span class="stat-value ${isBooked ? 'booked' : 'available'}">${availableCount} of ${totalCount} cottages</span>
            </div>
            <div class="availability-stat">
              <span class="stat-label">Booked:</span>
              <span class="stat-value booked">${bookedCount} cottages</span>
            </div>
          </div>
          
          ${availableCottages.length > 0 ? `
            <div class="availability-details">
              <div class="available-items">
                <strong>Available Cottages:</strong>
                <div class="items-list">${availableCottages.map(cottage => `<span class="item-tag available">${cottage}</span>`).join('')}</div>
              </div>
            </div>
          ` : ''}
          
          ${bookedCottages.length > 0 ? `
            <div class="availability-details">
              <div class="booked-items">
                <strong>Booked Cottages:</strong>
                <div class="items-list">${bookedCottages.map(cottage => `<span class="item-tag booked">${cottage}</span>`).join('')}</div>
              </div>
            </div>
          ` : ''}
          
          ${isBooked ? `
            <div class="availability-warning">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              All cottages are booked for this date.
            </div>
          ` : ''}
        </div>
      `;
      
      bookButtonText = 'Book Cottages';
      reservationType = 'cottage';
      
    } else if (category === 'function-halls') {
      const availableCount = dateData?.availableCount || 0;
      const bookedCount = dateData?.bookedCount || 0;
      const totalCount = 2;
      const availableHalls = dateData?.availableHalls || [];
      const bookedHalls = dateData?.bookedHalls || [];
      const isBooked = dateData?.isBooked || false;
      
      modalContent = `
        <div class="availability-info">
          <h3>Function Hall Availability</h3>
          <div class="availability-date">${formatDateDisplay(dateString)}</div>
          
          <div class="availability-summary">
            <div class="availability-stat">
              <span class="stat-label">Available:</span>
              <span class="stat-value ${isBooked ? 'booked' : 'available'}">${availableCount} of ${totalCount} halls</span>
            </div>
            <div class="availability-stat">
              <span class="stat-label">Booked:</span>
              <span class="stat-value booked">${bookedCount} halls</span>
            </div>
          </div>
          
          ${availableHalls.length > 0 ? `
            <div class="availability-details">
              <div class="available-items">
                <strong>Available Halls:</strong>
                <div class="items-list">${availableHalls.map(hall => `<span class="item-tag available">${hall}</span>`).join('')}</div>
              </div>
            </div>
          ` : ''}
          
          ${bookedHalls.length > 0 ? `
            <div class="availability-details">
              <div class="booked-items">
                <strong>Booked Halls:</strong>
                <div class="items-list">${bookedHalls.map(hall => `<span class="item-tag booked">${hall}</span>`).join('')}</div>
              </div>
            </div>
          ` : ''}
          
          ${isBooked ? `
            <div class="availability-warning">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              All function halls are booked for this date.
            </div>
          ` : ''}
        </div>
      `;
      
      bookButtonText = 'Book Function Halls';
      reservationType = 'function-hall';
    }
    
    // Create modal HTML
    const modalHTML = `
      <div class="availability-modal-overlay" id="availability-modal-overlay">
        <div class="availability-modal">
          <button class="availability-modal-close" onclick="closeAvailabilityModal()" aria-label="Close availability modal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          ${modalContent}
          
          <div class="availability-modal-actions">
            <button class="availability-modal-close-btn" onclick="closeAvailabilityModal()">Close</button>
            <button class="availability-modal-book-btn" onclick="window.handleAvailabilityBookClick('${dateString}', '${reservationType}', '${category}')" 
                    ${dateData?.isBooked || (category === 'rooms' && dateData?.availableCount === 0) ? 'disabled' : ''}>
              ${bookButtonText}
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    currentAvailabilityModal = document.getElementById('availability-modal-overlay');
    
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    
    // Add click outside to close
    currentAvailabilityModal.addEventListener('click', (e) => {
      if (e.target === currentAvailabilityModal) {
        closeAvailabilityModal();
      }
    });
    
    // Add escape key listener
    document.addEventListener('keydown', handleAvailabilityEscapeKey);
    
    // Animate modal in
    setTimeout(() => {
      currentAvailabilityModal.classList.add('show');
    }, 10);
    
  } catch (error) {
    console.error('[AvailabilityModal] Error fetching availability:', error);
    
    // Show error modal
    const errorModalHTML = `
      <div class="availability-modal-overlay" id="availability-modal-overlay">
        <div class="availability-modal">
          <button class="availability-modal-close" onclick="closeAvailabilityModal()" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          <div class="availability-info">
            <h3>Error Loading Availability</h3>
            <p>Unable to fetch availability information. Please try again later.</p>
          </div>
          
          <div class="availability-modal-actions">
            <button class="availability-modal-close-btn" onclick="closeAvailabilityModal()">Close</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', errorModalHTML);
    currentAvailabilityModal = document.getElementById('availability-modal-overlay');
    
    setTimeout(() => {
      currentAvailabilityModal.classList.add('show');
    }, 10);
  }
}

/**
 * Close the availability modal
 */
export function closeAvailabilityModal() {
  if (currentAvailabilityModal) {
    currentAvailabilityModal.classList.remove('show');
    
    // Restore background scrolling
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    
    setTimeout(() => {
      if (currentAvailabilityModal && currentAvailabilityModal.parentNode) {
        currentAvailabilityModal.parentNode.removeChild(currentAvailabilityModal);
      }
      currentAvailabilityModal = null;
    }, 300);
    
    // Remove escape key listener
    document.removeEventListener('keydown', handleAvailabilityEscapeKey);
  }
}

/**
 * Handle escape key press
 */
function handleAvailabilityEscapeKey(e) {
  if (e.key === 'Escape') {
    closeAvailabilityModal();
  }
}

/**
 * Format date string for display
 */
function formatDateDisplay(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * Handle book button click - opens booking modal
 */
window.handleAvailabilityBookClick = async function(dateString, reservationType, category) {
  console.log('[AvailabilityModal] Book button clicked:', { dateString, reservationType, category });
  
  // Close availability modal
  closeAvailabilityModal();
  
  // Open booking modal with pre-filled date
  const { openBookingModal } = await import('./bookingModal.js');
  
  let preFillData = {};
  if (reservationType === 'room') {
    // For rooms, we need both check-in and check-out dates
    // Since this is from calendar page, we'll use the clicked date as check-in
    // User can modify dates in booking modal
    preFillData = {
      checkin: dateString,
      checkout: dateString // Will need to be updated by user
    };
  } else {
    // Cottages and function halls are single-day bookings
    preFillData = {
      date: dateString
    };
  }
  
  const packageTitle = category === 'rooms' ? 'Room Booking' :
                      category === 'cottages' ? 'Cottage Booking' :
                      'Function Hall Booking';
  
  openBookingModal(reservationType, packageTitle, preFillData, false, null, category);
};

// Make functions globally available
window.closeAvailabilityModal = closeAvailabilityModal;
window.openAvailabilityModal = openAvailabilityModal;

