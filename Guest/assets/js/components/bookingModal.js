// Comprehensive Booking Modal Component
// Handles Room, Cottage, and Function Hall reservations

import { bookingState } from '../utils/bookingState.js';
import { normalizeDateInputToYMD } from '../utils/calendarUtils.js';

// Constants
const ROOM_CAPACITY = 4; // Maximum guests per room
const COTTAGE_CAPACITY = 8; // Maximum guests per cottage
const FUNCTION_HALL_RECOMMENDED_CAPACITY = 100; // Recommended guests per function hall
const FUNCTION_HALL_MAX_CAPACITY = 150; // Maximum guests per function hall
const ROOM_PRICE = 1500; // Price per room per night (₱1,500)
const COTTAGE_PRICE = 700; // Price per cottage (₱700)
const CONTACT_NUMBER_LENGTH = 11; // Required contact number length in digits

// Function Hall Pricing Constants
const FUNCTION_HALL_BASE_PRICE_INTIMATE = 10000;
const FUNCTION_HALL_BASE_PRICE_GRAND = 15000;
const FUNCTION_HALL_SOUND_SYSTEM_PRICE = 2400;
const FUNCTION_HALL_PROJECTOR_PRICE = 2000;
const FUNCTION_HALL_CATERING_PRICE_PER_HEAD = 450;
const FUNCTION_HALL_EXTRA_CHAIRS_TABLES_PRICE = 70; // Price per 10 guests over recommended
const FUNCTION_HALL_LED_LIGHTING_PRICE = 2500;

let currentBookingModal = null;
let bookingFormState = {
  reservationType: 'room',
  category: 'rooms',
  addCottageToRoom: false,
  addRoomToCottage: false,
  formData: {},
  errors: {},
  savedFormData: {},
  returningFromCottage: false, // Track if we're returning from cottage selection
  editMode: false, // Track if we're editing an existing booking
  bookingId: null, // ID of booking being edited
  cottageDates: [] // Array of individual dates selected for cottage rental
};

// Reset all transient booking modal state and selections
function resetBookingModalState() {
  console.log('[resetBookingModalState] Resetting modal state (NOT clearing global selections)');
  
  try {
    // Clear modal-local state
    bookingFormState.reservationType = 'room';
    bookingFormState.category = 'rooms';
    bookingFormState.addCottageToRoom = false;
    bookingFormState.addRoomToCottage = false;
    bookingFormState.formData = {};
    bookingFormState.errors = {};
    bookingFormState.savedFormData = {};
    bookingFormState.returningFromCottage = false;
    bookingFormState.editMode = false;
    bookingFormState.bookingId = null;
    bookingFormState.preFillDates = null;
    bookingFormState.selectedRoomsFromFlow = [];
    bookingFormState.selectedCottagesFromFlow = [];
    bookingFormState.guestInfo = {};
    bookingFormState.paymentMode = null;
    bookingFormState.perRoomGuests = [];
    bookingFormState.pendingRoomsSelection = null;
    bookingFormState.pendingCottagesSelection = null;
    bookingFormState.cottageDates = [];
  } catch (_) {}
  
  // DO NOT clear bookingState.selectedCottages or bookingState.selectedRooms
  // These represent the user's selections from the cottage/room selection flow
  // and should persist even when the modal closes without completing booking
  
  try {
    // Clear any pending preselection coming from cards
    if (window.preselectedCottageType) delete window.preselectedCottageType;
  } catch (_) {}
  
  console.log('[resetBookingModalState] Modal state reset, global selections preserved');
}

// Room types for selection
const roomTypes = ['Room 01', 'Room 02', 'Room 03', 'Room 04'];
const cottageTypes = ['Beachfront Cottage', 'Garden View Cottage', 'Family Cottage'];
const functionHallTypes = ['Grand Function Hall', 'Intimate Function Hall'];

// Mock reservation data for consistent availability
const mockReservationData = {
  'Room 01': 8,
  'Room 02': 12,
  'Room 03': 6,
  'Room 04': 15,
  'Grand Function Hall': 5,
  'Intimate Function Hall': 7
};

// Mock booking database for availability checking
const mockBookings = {
  'Room 01': [],
  'Room 02': [],
  'Room 03': [],
  'Room 04': []
};

// Check if room is available for given dates (using database)
async function isRoomAvailable(roomId, checkinDate, checkoutDate) {
  try {
    const { checkAvailability } = await import('../utils/api.js');
    
    // Exclude current booking from conflict checks if in edit mode
    const excludeBookingId = bookingFormState.editMode && bookingFormState.bookingId 
      ? bookingFormState.bookingId 
      : null;
    
    // Check availability for the entire date range
    const result = await checkAvailability(1, checkinDate, checkoutDate, null, excludeBookingId);
    
    // If not available, check if there are conflicts
    if (!result.available) {
      // Check specific dates in the range
  let currentDate = new Date(checkinDate);
  const endDate = new Date(checkoutDate);
  
  const formatDateLocal = (d) => {
    const dd = new Date(d); dd.setHours(0,0,0,0);
    return `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`;
  };
  while (currentDate < endDate) {
        const dateString = formatDateLocal(currentDate);
        
        // Check if this date is in booked dates
        const isBooked = result.bookedDates?.some(booking => {
          const bookingCheckinStr = formatDateLocal(booking.check_in);
          const bookingCheckoutStr = formatDateLocal(booking.check_out);
          return dateString >= bookingCheckinStr && dateString < bookingCheckoutStr; // checkout exclusive
        });
        
        if (isBooked) {
      return false;
    }
        
    currentDate.setDate(currentDate.getDate() + 1);
  }
    }
    
    return result.available;
  } catch (error) {
    console.error('Error checking room availability:', error);
    // Fallback to true on error to allow booking
    return true;
  }
}

// Check if cottage is available for given date (using database)
async function isCottageAvailable(cottageId, visitDate) {
  try {
    // Normalize date to ensure consistent format
    const normalizedDate = normalizeDateInputToYMD(visitDate);
    if (!normalizedDate) {
      console.error('[isCottageAvailable] Failed to normalize date:', visitDate);
      return true; // Default to available on error
    }
    
    console.log(`[isCottageAvailable] Checking cottage ${cottageId} for date: ${visitDate} -> normalized: ${normalizedDate}`);
    
    const { checkAvailability } = await import('../utils/api.js');
    
    // Exclude current booking from conflict checks if in edit mode
    const excludeBookingId = bookingFormState.editMode && bookingFormState.bookingId 
      ? bookingFormState.bookingId 
      : null;
    
    // Single-day cottage booking: check_in === check_out === visitDate (use normalized date)
    const result = await checkAvailability(1, normalizedDate, normalizedDate, 'cottages', excludeBookingId);
    
    if (result && result.dateAvailability) {
      // Use normalized date as key for lookup
      const dayData = result.dateAvailability[normalizedDate];
      
      if (dayData) {
        const availableCottages = dayData.availableCottages || [];
        const isAvailable = availableCottages.includes(cottageId);
        
        console.log(`[isCottageAvailable] Cottage ${cottageId} availability on ${normalizedDate}:`, isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE');
        console.log(`[isCottageAvailable] Available cottages on ${normalizedDate}:`, availableCottages);
        
        return isAvailable;
      } else {
        console.warn(`[isCottageAvailable] No dayData for ${normalizedDate}. Available dates:`, Object.keys(result.dateAvailability).join(', '));
      }
    }
    
    console.log(`[isCottageAvailable] No availability data for cottage ${cottageId} on ${normalizedDate}, defaulting to available`);
    return true; // Default to available if no data
  } catch (error) {
    console.error('[isCottageAvailable] Error checking cottage availability:', error);
    return true; // Allow on error
  }
}


// Open booking modal with optional pre-selection and pre-filled dates
export function openBookingModal(initialType = 'room', packageTitle = '', preFillData = null, editMode = false, bookingId = null, categoryArg = null, packageIdArg = null) {
  console.log('[BookingModal] openBookingModal called:', {
    initialType,
    packageTitle,
    editMode,
    bookingId,
    categoryArg,
    packageIdArg,
    hasPreFillData: !!preFillData
  });
  
  // Check authentication (allow edit mode to proceed as it's already authenticated)
  if (!editMode) {
    const authState = window.getAuthState ? window.getAuthState() : { isLoggedIn: false };
    if (!authState.isLoggedIn) {
      console.log('[openBookingModal] User not authenticated, redirecting to login');
      
      // Store booking modal parameters for after login
      const bookingIntent = {
        initialType,
        packageTitle,
        preFillData,
        categoryArg,
        timestamp: Date.now()
      };
      sessionStorage.setItem('bookingModalIntent', JSON.stringify(bookingIntent));
      
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
  
  // Hide continue button while modal is open
  const floatingBtn = document.getElementById('floating-continue-btn');
  if (floatingBtn) {
    floatingBtn.style.display = 'none';
    console.log('[openBookingModal] Hiding continue button while modal is open');
  }
  
  closeBookingModal();
  
  bookingFormState.reservationType = initialType;
  // Set category, prefer explicit arg otherwise derive from type
  const typeToCategory = { 'room': 'rooms', 'cottage': 'cottages', 'function-hall': 'function-halls' };
  bookingFormState.category = categoryArg || typeToCategory[initialType] || 'rooms';
  bookingFormState.editMode = editMode;
  bookingFormState.bookingId = bookingId;
  bookingFormState.addCottageToRoom = false;
  
  // Set package ID if provided (important for re-edit)
  if (packageIdArg) {
    bookingFormState.packageId = packageIdArg;
    console.log('[openBookingModal] Set packageId from argument:', packageIdArg);
  } else if (preFillData?.packageId) {
    bookingFormState.packageId = preFillData.packageId;
    console.log('[openBookingModal] Set packageId from preFillData:', preFillData.packageId);
  } else {
    // Will be determined later when creating booking
    bookingFormState.packageId = null;
    console.log('[openBookingModal] PackageId not provided, will be determined later');
  }
  bookingFormState.addRoomToCottage = false;
  bookingFormState.formData = {};
  bookingFormState.errors = {};
  
  // If editing and has cottages, set flag to show cottage section
  if (editMode && preFillData?.selectedCottages && preFillData.selectedCottages.length > 0 && initialType === 'room') {
    bookingFormState.addCottageToRoom = true;
    console.log('[BookingModal] Edit mode with cottages detected, setting addCottageToRoom=true');
  }
  
  // Handle pre-fill data (dates, selected rooms/cottages/function-hall, etc.)
  if (preFillData) {
    if (editMode) {
      console.log('[BookingModal] Edit mode: Loading pre-fill data into form state');
      // Pre-fill all fields for editing
      bookingFormState.preFillDates = {
        checkin: preFillData.checkIn || preFillData.checkin,
        checkout: preFillData.checkOut || preFillData.checkout,
        date: preFillData.date // For single-day bookings (cottages)
      };
      bookingFormState.selectedRoomsFromFlow = preFillData.selectedRooms || [];
      bookingFormState.selectedCottagesFromFlow = preFillData.selectedCottages || [];
      bookingFormState.cottageDates = preFillData.cottageDates || []; // Load cottage rental dates
      bookingFormState.guestInfo = preFillData.guestInfo || {};
      bookingFormState.paymentMode = preFillData.paymentMode;
      bookingFormState.perRoomGuests = preFillData.perRoomGuests || [];
      
      // Set bookingState.selectedCottages for display in edit mode (ensure unique)
      if (preFillData.selectedCottages && preFillData.selectedCottages.length > 0) {
        bookingState.selectedCottages = Array.from(new Set(preFillData.selectedCottages));
        console.log('[BookingModal] Set bookingState.selectedCottages for edit mode (deduped):', bookingState.selectedCottages);
      }
      
      console.log('[BookingModal] Pre-fill data loaded:', {
        dates: bookingFormState.preFillDates,
        rooms: bookingFormState.selectedRoomsFromFlow,
        cottages: bookingFormState.selectedCottagesFromFlow,
        cottageDates: bookingFormState.cottageDates,
        guestInfo: bookingFormState.guestInfo,
        paymentMode: bookingFormState.paymentMode,
        perRoomGuests: bookingFormState.perRoomGuests?.length || 0
      });
    } else if (preFillData.fromDateSelection) {
      // Coming from date selection flow
      bookingFormState.preFillDates = {
        checkin: preFillData.checkin,
        checkout: preFillData.checkout,
        date: preFillData.date // For single-day bookings (cottages)
      };
      bookingFormState.selectedRoomsFromFlow = preFillData.selectedRooms || [];
      bookingFormState.selectedCottagesFromFlow = preFillData.selectedCottages || [];
    } else {
      // Legacy preFillDates format
      bookingFormState.preFillDates = preFillData;
      bookingFormState.selectedRoomsFromFlow = [];
      bookingFormState.selectedCottagesFromFlow = [];
    }
    // Map function-hall specific prefill fields into a simple formData cache for rendering defaults
    if (initialType === 'function-hall') {
      console.log('[BookingModal] Setting up function hall formData from preFillData:', preFillData);
      
      bookingFormState.formData = {
        eventDate: preFillData.eventDate || preFillData.date || null,
        startTime: preFillData.startTime || null,
        endTime: preFillData.endTime || null,
        eventName: preFillData.eventName || null,
        eventType: preFillData.eventType || null,
        setupType: preFillData.setupType || null,
        decorationTheme: preFillData.decorationTheme || null,
        organization: preFillData.organization || null,
        guestCount: preFillData.guestCount || null,
        hallId: preFillData.hallId || null,
        hallName: preFillData.hallName || null,
        soundSystemRequired: !!preFillData.soundSystemRequired,
        projectorRequired: !!preFillData.projectorRequired,
        cateringRequired: !!preFillData.cateringRequired,
        equipmentAddons: Array.isArray(preFillData.equipmentAddons) ? preFillData.equipmentAddons : [],
        specialRequests: preFillData.specialRequests || null
      };
      
      console.log('[BookingModal] Function hall formData set:', {
        eventName: bookingFormState.formData.eventName,
        eventType: bookingFormState.formData.eventType,
        setupType: bookingFormState.formData.setupType,
        startTime: bookingFormState.formData.startTime,
        endTime: bookingFormState.formData.endTime,
        decorationTheme: bookingFormState.formData.decorationTheme,
        organization: bookingFormState.formData.organization,
        soundSystemRequired: bookingFormState.formData.soundSystemRequired,
        projectorRequired: bookingFormState.formData.projectorRequired,
        cateringRequired: bookingFormState.formData.cateringRequired,
        equipmentAddons: bookingFormState.formData.equipmentAddons,
        specialRequests: bookingFormState.formData.specialRequests
      });
      
      // Also reflect hall info in preFillDates used by selected-hall header
      bookingFormState.preFillDates = {
        ...(bookingFormState.preFillDates || {}),
        date: (bookingFormState.preFillDates && (bookingFormState.preFillDates.date || bookingFormState.preFillDates.eventDate)) || preFillData.eventDate || preFillData.date || null,
        hallId: preFillData.hallId || bookingFormState.preFillDates?.hallId || null,
        hallName: preFillData.hallName || bookingFormState.preFillDates?.hallName || null
      };
      
      console.log('[BookingModal] Function hall preFillDates set:', bookingFormState.preFillDates);
    }
  } else {
    bookingFormState.preFillDates = null;
    bookingFormState.selectedRoomsFromFlow = [];
    bookingFormState.selectedCottagesFromFlow = [];
    bookingFormState.guestInfo = {};
    bookingFormState.paymentMode = null;
    bookingFormState.perRoomGuests = [];
  }
  
  const modalHTML = `
    <div class="booking-modal-overlay" id="booking-modal-overlay">
      <div class="booking-modal">
        <button class="booking-modal-close" id="booking-modal-close" aria-label="Close booking modal" title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div class="booking-modal-header">
          <h2>${bookingFormState.editMode ? 'Edit Booking' : getModalTitle()}</h2>
          <p class="booking-subtitle">${bookingFormState.editMode ? 'Update your booking details below' : 'Complete your booking details below'}</p>
        </div>
        
        <form class="booking-form" id="booking-form">
          <div class="booking-form-content">
            ${renderFormFields(initialType)}
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  currentBookingModal = document.getElementById('booking-modal-overlay');
  
  // Add event listeners
  currentBookingModal.addEventListener('click', (e) => {
    if (e.target === currentBookingModal) {
      closeBookingModal();
    }
  });
  const closeBtn = document.getElementById('booking-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', () => closeBookingModal());
  const formEl = document.getElementById('booking-form');
  if (formEl) formEl.addEventListener('submit', (e) => { e.preventDefault(); window.submitBooking && window.submitBooking(e); });
  
  // Prevent background scrolling when modal is open
  document.body.style.overflow = 'hidden';
  document.body.classList.add('modal-open');
  
  // Disable Lenis smooth scrolling when modal is open
  const lenisInstance = window.lenisInstance || document.querySelector('.lenis')?.lenis;
  if (lenisInstance) {
    lenisInstance.stop();
  }
  
  // Prevent scroll events from bubbling to background
  currentBookingModal.addEventListener('wheel', (e) => {
    e.stopPropagation();
  }, { passive: false });
  
  // Prevent middle mouse scroll from affecting background
  currentBookingModal.addEventListener('mousedown', (e) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault();
    }
  });
  
  document.addEventListener('keydown', handleEscapeKey);
  
  // Initialize form
  initializeForm();
  
  // Animate modal in
  setTimeout(() => {
    currentBookingModal.classList.add('show');
  }, 10);
}

// Close booking modal
export function closeBookingModal() {
  if (currentBookingModal) {
    currentBookingModal.classList.remove('show');
    
    // Restore background scrolling
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    
    // Re-enable Lenis smooth scrolling when modal is closed
    const lenisInstance = window.lenisInstance || document.querySelector('.lenis')?.lenis;
    if (lenisInstance) {
      lenisInstance.start();
    }
    
    setTimeout(() => {
      if (currentBookingModal && currentBookingModal.parentNode) {
        currentBookingModal.parentNode.removeChild(currentBookingModal);
      }
      currentBookingModal = null;
      // Reset modal state once closed
      resetBookingModalState();
    }, 300);
    
    document.removeEventListener('keydown', handleEscapeKey);
    
    // Show floating continue button if there are still selections
    // This ensures button reappears after modal closes if selections exist
    setTimeout(() => {
      // Don't restore button if another modal is already open
      const modalStillOpen = document.querySelector('.booking-modal-overlay.show');
      if (modalStillOpen) {
        console.log('[closeBookingModal] Another modal is open, not restoring button');
        return;
      }
      
      const btn = document.getElementById('floating-continue-btn');
      if (btn) {
        const hasSelections = (bookingState.selectedCottages && bookingState.selectedCottages.length > 0) ||
                              (bookingState.selectedRooms && bookingState.selectedRooms.length > 0);
        
        if (hasSelections) {
          console.log('[closeBookingModal] Selections still exist, showing continue button');
          btn.style.display = 'flex';
          
          // Update button text and onclick based on selection type
          if (bookingState.selectedCottages && bookingState.selectedCottages.length > 0) {
            const count = bookingState.selectedCottages.length;
            btn.textContent = count > 0 
              ? `Continue with ${count} cottage${count > 1 ? 's' : ''}` 
              : 'Select at least one cottage';
            btn.disabled = count === 0;
            
            // Restore onclick handler for cottages
            btn.onclick = function() {
              if (bookingState.selectedCottages.length > 0) {
                window.openBookingModal('cottage', 'Cottage Booking', {
                  date: bookingState.dates.checkin,
                  selectedCottages: bookingState.selectedCottages,
                  fromDateSelection: true
                });
              }
            };
          } else if (bookingState.selectedRooms && bookingState.selectedRooms.length > 0) {
            const count = bookingState.selectedRooms.length;
            btn.textContent = count > 0 
              ? `Continue with ${count} room${count > 1 ? 's' : ''}` 
              : 'Select at least one room';
            btn.disabled = count === 0;
            
            // Restore onclick handler for rooms
            btn.onclick = function() {
              if (bookingState.selectedRooms.length > 0) {
                window.openBookingModal('room', 'Room Booking', {
                  checkin: bookingState.dates.checkin,
                  checkout: bookingState.dates.checkout,
                  selectedRooms: bookingState.selectedRooms,
                  fromDateSelection: true
                });
              }
            };
          }
        } else {
          console.log('[closeBookingModal] No selections, hiding continue button');
          btn.style.display = 'none';
        }
      }
    }, 350); // Wait for modal close animation to complete
  }
}

// Change reservation type
function changeReservationType(type) {
  bookingFormState.reservationType = type;
  const typeToCategory = { 'room': 'rooms', 'cottage': 'cottages', 'function-hall': 'function-halls' };
  bookingFormState.category = typeToCategory[type] || 'rooms';
  bookingFormState.addCottageToRoom = false;
  bookingFormState.addRoomToCottage = false;
  
  // Update active tab
  document.querySelectorAll('.type-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-type="${type}"]`).classList.add('active');
  
  // Re-render form
  const formContent = document.querySelector('.booking-form-content');
  formContent.innerHTML = renderFormFields(type);
  
  // Re-initialize form
  initializeForm();
}

// Render form fields based on reservation type
function renderFormFields(type) {
  const baseFields = `
    <div class="form-section">
      <h3>Main Booker Information</h3>
      <p class="section-description">Person making the reservation and responsible for payment</p>
      <div class="form-field">
        <label for="guest-name" class="form-label">Full Name *</label>
        <input type="text" id="guest-name" name="guestName" class="form-input" value="${bookingFormState.guestInfo?.name || ''}" required>
        <div class="form-error" id="guest-name-error"></div>
      </div>
      
      <div class="form-field">
        <label for="email" class="form-label">Email Address *</label>
        <input type="email" id="email" name="email" class="form-input" value="${bookingFormState.guestInfo?.email || ''}" required>
        <div class="form-error" id="email-error"></div>
      </div>
      
      <div class="form-field">
        <label for="contact" class="form-label">Contact Number *</label>
        <input type="tel" id="contact" name="contact" class="form-input" value="${bookingFormState.guestInfo?.contact || ''}" required>
        <div class="form-error" id="contact-error"></div>
      </div>
    </div>
  `;
  
  if (type === 'room') {
    return baseFields + renderRoomFields();
  } else if (type === 'cottage') {
    return baseFields + renderCottageFields();
  } else if (type === 'function-hall') {
    return baseFields + renderFunctionHallFields();
  }
}

// Render room booking fields
function renderRoomFields() {
  return `
    <div class="form-section">
      <h3>Room Details</h3>
      
      <div class="date-time-group">
        <div class="form-field">
          <label for="checkin-date" class="form-label">Check-in Date *</nlabel>
          <input type="date" id="checkin-date" name="checkinDate" class="form-input" readonly data-required="true">
          <div class="form-error" id="checkin-date-error"></div>
        </div>
        
        <div class="form-field">
          <label for="checkout-date" class="form-label">Check-out Date *</label>
          <input type="date" id="checkout-date" name="checkoutDate" class="form-input" readonly data-required="true">
          <div class="form-error" id="checkout-date-error"></div>
        </div>
      </div>
      
      <div class="form-field auto-calculated-field">
        <label class="form-label">Number of Nights</label>
        <div class="calculated-value" id="nights-display">0</div>
      </div>
      
      ${generatePerRoomGuestInputs()}
        
        <div class="form-field">
        <div class="total-guests-display" id="total-guests-display">
          <strong>Total: 0 adults, 0 children across 0 rooms</strong>
        </div>
      </div>
      
      <div class="add-option-section">
        <button type="button" class="add-option-toggle" id="add-more-rooms-toggle" onclick="toggleAddMoreRooms()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add More Rooms
        </button>
        
        <div class="form-field" id="rooms-selection-field" style="display: none;" onclick="event.stopPropagation();">
          <label class="form-label">Available Rooms</label>
          <div class="room-selection-grid" id="inline-rooms-grid" style="grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 12px;">
            <!-- Rooms will be populated here -->
          </div>
          <div id="rooms-confirm-section" style="margin-top: 16px; display: none; text-align: right;">
            <button type="button" class="btn" onclick="event.stopPropagation(); cancelRoomsSelection()" style="margin-right: 8px;">Cancel</button>
            <button type="button" class="btn primary" onclick="event.stopPropagation(); confirmRoomsSelection()">Confirm Selection</button>
          </div>
          <div id="rooms-close-section" style="margin-top: 16px; display: none; text-align: right;">
            <button type="button" class="btn" onclick="event.stopPropagation(); closeRoomsSelection()">Close</button>
          </div>
        </div>
        
        ${generateSelectedRoomsOnlyDisplay()}
      </div>
      
      <div class="add-option-section">
        <button type="button" class="add-option-toggle" id="add-cottage-toggle" onclick="toggleAddCottage()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Cottage to Room Booking
        </button>
        
        <div class="form-field" id="cottage-selection-field" style="display: none;" onclick="event.stopPropagation();">
          <label class="form-label">Available Cottages</label>
          <div id="cottage-dates-display" style="background: #f0f9ff; padding: 12px; border-radius: 8px; margin: 12px 0; display: none; flex-direction: row; align-items: center;">
            <div style="flex: 1;">
              <strong style="color: #1e40af;">Selected Dates:</strong>
              <span id="cottage-dates-text" style="color: #1e40af; margin-left: 8px;"></span>
            </div>
            <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); changeCottageDates()" style="margin-left: 12px; padding: 6px 12px; font-size: 13px;">
              Change Dates
            </button>
          </div>          <div class="room-selection-grid" id="inline-cottage-grid" style="grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 12px;">
            <!-- Cottages will be populated here -->
          </div>
          <div id="cottages-confirm-section" style="margin-top: 16px; display: none; text-align: right;">
            <button type="button" class="btn" onclick="event.stopPropagation(); cancelCottagesSelection()" style="margin-right: 8px;">Cancel</button>
            <button type="button" class="btn primary" onclick="event.stopPropagation(); confirmCottagesSelection()">Confirm Selection</button>
          </div>
          <div id="cottages-close-section" style="margin-top: 16px; display: none; text-align: right;">
            <button type="button" class="btn" onclick="event.stopPropagation(); closeCottagesSelection()">Close</button>
          </div>
        </div>
        
        ${generateSelectedCottagesOnlyDisplay()}
      </div>
    </div>
    
    ${renderPaymentAndAgreement()}
  `;
}

// Render cottage booking fields
function renderCottageFields() {
  return `
    <div class="form-section">
      <h3>Cottage Details</h3>
      
      <div class="form-field">
        <label for="cottage-date" class="form-label">Date of Visit *</label>
        <input type="date" id="cottage-date" name="cottageDate" class="form-input" onclick="openCalendarForCottage()" readonly data-required="true">
        <div class="form-error" id="cottage-date-error"></div>
      </div>
      
      <div class="guests-group">
        <div class="form-field">
          <label for="cottage-adults" class="form-label">Number of Adults *</label>
          <input type="number" id="cottage-adults" name="cottageAdults" class="form-input" min="1" value="1" required onchange="validateCottageCapacity('cottage-adults')" oninput="validateCottageCapacity('cottage-adults')" onfocus="validateCottageCapacity('cottage-adults')">
          <div class="form-error" id="cottage-adults-error"></div>
        </div>
        
        <div class="form-field">
          <label for="cottage-children" class="form-label">Number of Children</label>
          <input type="number" id="cottage-children" name="cottageChildren" class="form-input" min="0" value="0" onchange="validateCottageCapacity('cottage-children')" oninput="validateCottageCapacity('cottage-children')" onfocus="validateCottageCapacity('cottage-children')">
          <div class="form-error" id="cottage-children-error"></div>
        </div>
      </div>
      
      ${generateSelectedCottagesDisplay()}
      
      ${renderCottageCostSummary()}
      
    </div>
    
    ${renderPaymentAndAgreement()}
  `;
}

// Render function hall booking fields
function renderFunctionHallFields() {
  const hallName = bookingFormState.preFillDates?.hallName || 'Not selected';
  const isGrand = hallName.includes('Grand');
  const hallPrice = isGrand ? '₱15,000/day' : '₱10,000/day';
  const hallCapacity = isGrand ? 'Capacity: 200 guests' : 'Capacity: 100 guests';
  const fh = bookingFormState.formData || {};
  
  return `
    <div class="form-section">
      <div class="selected-hall-display" style="background: var(--color-bg); padding: 16px; border-radius: 12px; margin-bottom: 24px; border: 2px solid var(--color-primary);">
        <h4 style="margin: 0 0 8px; color: var(--color-text);">Selected Function Hall</h4>
        <div style="font-size: 18px; font-weight: 600; color: var(--color-primary);">
          ${hallName}
        </div>
        <div style="font-size: 14px; color: var(--color-muted); margin-top: 4px;">
          ${hallPrice} • ${hallCapacity}
        </div>
      </div>
      
      <h3>Event Details</h3>
      
      <div class="form-field">
        <label for="organization" class="form-label">Organization (Optional)</label>
        <input type="text" id="organization" name="organization" class="form-input" placeholder="Company or organization name" value="${fh.organization || ''}">
      </div>
      
      <div class="form-field">
        <label for="event-name" class="form-label">Event Name *</label>
        <input type="text" id="event-name" name="eventName" class="form-input" placeholder="e.g., Corporate Seminar, Wedding Reception" data-required="true" value="${fh.eventName || ''}">
        <div class="form-error" id="event-name-error"></div>
      </div>
      
      <div class="form-field">
        <label for="event-date" class="form-label">Event Date *</label>
        <input type="date" id="event-date" name="eventDate" class="form-input" onclick="openCalendarForFunctionHall()" readonly data-required="true" value="${fh.eventDate || bookingFormState.preFillDates?.date || ''}">
        <div class="form-error" id="event-date-error"></div>
      </div>
      
      <div class="form-field">
        <label class="form-label">Event Time Range *</label>
        <div style="display: flex; gap: 12px; align-items: center;">
          <div style="flex: 1;">
            <label for="event-start" class="form-label" style="font-size: 0.9em; margin-bottom: 4px;">Start Time</label>
            <input type="time" id="event-start" name="eventStart" class="form-input" required value="${fh.startTime || ''}">
            <div class="form-error" id="event-start-error"></div>
          </div>
          <div style="flex: 1;">
            <label for="event-end" class="form-label" style="font-size: 0.9em; margin-bottom: 4px;">End Time</label>
            <input type="time" id="event-end" name="eventEnd" class="form-input" required value="${fh.endTime || ''}">
            <div class="form-error" id="event-end-error"></div>
          </div>
        </div>
      </div>
      
      <div class="form-field">
        <label for="event-type" class="form-label">Event Type *</label>
        <select id="event-type" name="eventType" class="form-select" required data-required="true">
          <option value="" ${!fh.eventType ? 'selected' : ''}>Select Event Type</option>
          <option value="wedding" ${fh.eventType==='wedding'?'selected':''}>Wedding</option>
          <option value="birthday" ${fh.eventType==='birthday'?'selected':''}>Birthday Party</option>
          <option value="conference" ${fh.eventType==='conference'?'selected':''}>Conference</option>
          <option value="meeting" ${fh.eventType==='meeting'?'selected':''}>Meeting</option>
          <option value="other" ${fh.eventType==='other'?'selected':''}>Other</option>
        </select>
        <div class="form-error" id="event-type-error"></div>
      </div>
      
      <div class="form-field">
        <label for="setup-type" class="form-label">Setup Type *</label>
        <select id="setup-type" name="setupType" class="form-select" required data-required="true">
          <option value="" ${!fh.setupType ? 'selected' : ''}>Select Setup Type</option>
          <option value="banquet" ${fh.setupType==='banquet'?'selected':''}>Banquet</option>
          <option value="theater" ${fh.setupType==='theater'?'selected':''}>Theater</option>
          <option value="classroom" ${fh.setupType==='classroom'?'selected':''}>Classroom</option>
          <option value="other" ${fh.setupType==='other'?'selected':''}>Other</option>
        </select>
        <div class="form-error" id="setup-type-error"></div>
      </div>
      
      <div class="form-field">
        <label for="event-guests" class="form-label">Number of Guests * (Recommended: ${FUNCTION_HALL_RECOMMENDED_CAPACITY}, Max: ${FUNCTION_HALL_MAX_CAPACITY})</label>
        <input type="number" id="event-guests" name="eventGuests" class="form-input" min="1" max="${FUNCTION_HALL_MAX_CAPACITY}" required data-required="true" value="${fh.guestCount || ''}" onchange="validateFunctionHallGuests('event-guests'); updateFunctionHallCost()" oninput="validateFunctionHallGuests('event-guests'); updateFunctionHallCost()" onfocus="validateFunctionHallGuests('event-guests')">
        <div class="form-error" id="event-guests-error"></div>
      </div>
      
      <div class="form-field">
        <label for="decoration-theme" class="form-label">Decoration Theme (Optional)</label>
        <input type="text" id="decoration-theme" name="decorationTheme" class="form-input" placeholder="e.g., Rustic, Modern, Elegant" value="${fh.decorationTheme || ''}">
      </div>
      
      <div class="form-field">
        <label class="form-label">Equipment Requirements</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="sound-system" name="soundSystem" value="true" style="width: 18px; height: 18px; cursor: pointer;" ${fh.soundSystemRequired ? 'checked' : ''} onchange="updateFunctionHallCost()">
            <span>Sound System Required</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="projector" name="projector" value="true" style="width: 18px; height: 18px; cursor: pointer;" ${fh.projectorRequired ? 'checked' : ''} onchange="updateFunctionHallCost()">
            <span>Projector/Screen Required</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="catering-required" name="cateringRequired" value="true" style="width: 18px; height: 18px; cursor: pointer;" ${fh.cateringRequired ? 'checked' : ''} onchange="updateFunctionHallCost()">
            <span>Catering Required</span>
          </label>
        </div>
      </div>
      
      <div class="form-field">
        <label class="form-label">Additional Equipment Add-ons</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" name="equipmentAddons" value="lighting" style="width: 18px; height: 18px; cursor: pointer;" ${(fh.equipmentAddons||[]).includes('lighting')?'checked':''} onchange="updateFunctionHallCost()">
            <span>Lighting</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" name="equipmentAddons" value="extra-chairs" style="width: 18px; height: 18px; cursor: pointer;" ${(fh.equipmentAddons||[]).includes('extra-chairs')?'checked':''} onchange="updateFunctionHallCost()">
            <span>Extra Chairs</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" name="equipmentAddons" value="extra-tables" style="width: 18px; height: 18px; cursor: pointer;" ${(fh.equipmentAddons||[]).includes('extra-tables')?'checked':''} onchange="updateFunctionHallCost()">
            <span>Extra Tables</span>
          </label>
        </div>
      </div>
      
      <div class="form-field">
        <label for="special-requests" class="form-label">Special Requests</label>
        <textarea id="special-requests" name="specialRequests" class="form-textarea" rows="3" placeholder="Any special requirements or requests...">${fh.specialRequests || ''}</textarea>
      </div>
      
      ${renderFunctionHallCostSummary()}
    </div>
    
    ${renderPaymentAndAgreement()}
  `;
}

// Render cost summary (for room bookings)
function renderCostSummary() {
  const costs = calculateTotalCost();
  if (!costs || !bookingFormState.selectedRoomsFromFlow?.length) return '';
  
  // Calculate cottage price details for display
  let cottagePriceDetails = '';
  if (bookingState.selectedCottages.length > 0) {
    const cottagePrices = bookingState.selectedCottages.map(c => {
      const info = getCottageInfo(c);
      return info.price.replace('₱', '');
    });
    const uniquePrices = [...new Set(cottagePrices)];
    if (uniquePrices.length === 1) {
      cottagePriceDetails = `₱${parseInt(uniquePrices[0]).toLocaleString()}`;
    } else {
      cottagePriceDetails = 'various prices';
    }
  }
  
  return `
    <div class="booking-cost-summary">
      <h4>Cost Breakdown</h4>
      <div class="cost-line">
        <span>Rooms (${bookingFormState.selectedRoomsFromFlow?.length || 0} × ₱${ROOM_PRICE.toLocaleString()} × ${costs.nights} nights)</span>
        <span>₱${costs.roomCost.toLocaleString()}</span>
      </div>
      ${bookingState.selectedCottages.length > 0 ? `
        <div class="cost-line">
          <span>Cottages (${bookingState.selectedCottages.length} × ${cottagePriceDetails} × ${costs.cottageDays || costs.nights} ${costs.cottageDays ? 'days' : 'nights'})</span>
          <span>₱${costs.cottageCost.toLocaleString()}</span>
        </div>
      ` : ''}
      <div class="cost-total">
        <span><strong>Total</strong></span>
        <span><strong>₱${costs.total.toLocaleString()}</strong></span>
      </div>
    </div>
  `;
}

// Render cottage cost summary (for cottage-only bookings)
function renderCottageCostSummary() {
  const selectedCottages = bookingState.selectedCottages || [];
  if (selectedCottages.length === 0) return '';
  
  // Calculate total cost from individual cottage prices
  const totalCost = selectedCottages.reduce((sum, cottageId) => {
    const info = getCottageInfo(cottageId);
    const priceNum = parseInt(info.price.replace(/[₱,]/g, '')) || 0;
    return sum + priceNum;
  }, 0);
  
  // Build price details string
  const cottagePriceDetails = selectedCottages.length === 1 
    ? getCottageInfo(selectedCottages[0]).price.replace('₱', '')
    : 'various prices';
  
  return `
    <div class="booking-cost-summary">
      <h4>Cost Breakdown</h4>
      <div class="cost-line">
        <span>Cottages (${selectedCottages.length} × ${cottagePriceDetails === 'various prices' ? cottagePriceDetails : `₱${parseInt(cottagePriceDetails).toLocaleString()}`})</span>
        <span>₱${totalCost.toLocaleString()}</span>
      </div>
      <div class="cost-total">
        <span><strong>Total</strong></span>
        <span><strong>₱${totalCost.toLocaleString()}</strong></span>
      </div>
    </div>
  `;
}

// Calculate function hall equipment costs
function calculateFunctionHallEquipmentCost() {
  const soundSystem = document.getElementById('sound-system')?.checked || false;
  const projector = document.getElementById('projector')?.checked || false;
  const catering = document.getElementById('catering-required')?.checked || false;
  const guestsInput = document.getElementById('event-guests');
  const guestCount = parseInt(guestsInput?.value || '0') || 0;
  
  const equipmentAddons = Array.from(document.querySelectorAll('input[name="equipmentAddons"]:checked')).map(cb => cb.value);
  const extraChairs = equipmentAddons.includes('extra-chairs');
  const extraTables = equipmentAddons.includes('extra-tables');
  const lighting = equipmentAddons.includes('lighting');
  
  let total = 0;
  const items = [];
  
  if (soundSystem) {
    total += FUNCTION_HALL_SOUND_SYSTEM_PRICE;
    items.push({ name: 'Sound System', price: FUNCTION_HALL_SOUND_SYSTEM_PRICE });
  }
  
  if (projector) {
    total += FUNCTION_HALL_PROJECTOR_PRICE;
    items.push({ name: 'Projector/Screen', price: FUNCTION_HALL_PROJECTOR_PRICE });
  }
  
  if (catering && guestCount > 0) {
    const cateringCost = guestCount * FUNCTION_HALL_CATERING_PRICE_PER_HEAD;
    total += cateringCost;
    items.push({ name: `Catering (${guestCount} × ₱${FUNCTION_HALL_CATERING_PRICE_PER_HEAD})`, price: cateringCost });
  }
  
  // Auto-calculate required extra chairs when guests exceed recommended capacity
  if (guestCount > FUNCTION_HALL_RECOMMENDED_CAPACITY) {
    const excessGuests = guestCount - FUNCTION_HALL_RECOMMENDED_CAPACITY;
    const units = Math.ceil(excessGuests / 10);
    const requiredExtraChairsCost = units * FUNCTION_HALL_EXTRA_CHAIRS_TABLES_PRICE;
    total += requiredExtraChairsCost;
    items.push({ 
      name: `Extra Chairs/Tables (Required: ${excessGuests} guests over recommended = ${units} unit${units > 1 ? 's' : ''} × ₱${FUNCTION_HALL_EXTRA_CHAIRS_TABLES_PRICE})`, 
      price: requiredExtraChairsCost 
    });
  }
  
  // Optional extra chairs/tables (manual checkbox selection)
  if (extraChairs || extraTables) {
    total += FUNCTION_HALL_EXTRA_CHAIRS_TABLES_PRICE;
    items.push({ name: 'Extra Chairs/Tables (Additional)', price: FUNCTION_HALL_EXTRA_CHAIRS_TABLES_PRICE });
  }
  
  if (lighting) {
    total += FUNCTION_HALL_LED_LIGHTING_PRICE;
    items.push({ name: 'LED Lightings', price: FUNCTION_HALL_LED_LIGHTING_PRICE });
  }
  
  return { items, total };
}

// Render function hall cost summary
function renderFunctionHallCostSummary() {
  const hallName = bookingFormState.preFillDates?.hallName || 'Not selected';
  const isGrand = hallName.includes('Grand');
  const basePrice = isGrand ? FUNCTION_HALL_BASE_PRICE_GRAND : FUNCTION_HALL_BASE_PRICE_INTIMATE;
  
  const equipment = calculateFunctionHallEquipmentCost();
  const totalCost = basePrice + equipment.total;
  
  return `
    <div class="booking-cost-summary">
      <h4>Cost Breakdown</h4>
      <div class="cost-line">
        <span>Function Hall (${hallName})</span>
        <span>₱${basePrice.toLocaleString()}</span>
      </div>
      ${equipment.items.map(item => `
        <div class="cost-line">
          <span>${item.name}</span>
          <span>₱${item.price.toLocaleString()}</span>
        </div>
      `).join('')}
      <div class="cost-total">
        <span><strong>Total</strong></span>
        <span><strong>₱${totalCost.toLocaleString()}</strong></span>
      </div>
    </div>
  `;
}

// Update function hall cost breakdown in real-time
window.updateFunctionHallCost = function() {
  if (bookingFormState.reservationType !== 'function-hall') return;
  
  const costSummaryEl = document.querySelector('.booking-cost-summary');
  if (costSummaryEl) {
    costSummaryEl.outerHTML = renderFunctionHallCostSummary();
  }
};

// Render payment and agreement section
function renderPaymentAndAgreement() {
  // Only show room cost summary for room bookings (cottage has its own)
  const costSummary = bookingFormState.reservationType === 'room' ? renderCostSummary() : '';
  return `
    ${costSummary}
    
    <div class="form-section">
      <h3>Payment</h3>
      
      <div class="form-field">
        <label for="payment-mode" class="form-label">Mode of Payment *</label>
        <select id="payment-mode" name="paymentMode" class="form-select" required>
          <option value="" ${!bookingFormState.paymentMode ? 'disabled selected' : ''}>Select Payment Method</option>
          <option value="bank-transfer" ${bookingFormState.paymentMode === 'bank-transfer' ? 'selected' : ''}>Bank Transfer</option>
          <option value="gcash" ${bookingFormState.paymentMode === 'gcash' ? 'selected' : ''}>GCash</option>
          <option value="credit-card" ${bookingFormState.paymentMode === 'credit-card' ? 'selected' : ''}>Credit Card</option>
        </select>
        <div class="form-error" id="payment-mode-error"></div>
      </div>
      
      ${!bookingFormState.editMode ? `
      <div class="agreement-section">
        <div class="terms-container" id="terms-container">
          <div class="terms-header" onclick="toggleTermsExpansion()">
            <h4>Terms & Conditions</h4>
            <button type="button" class="terms-toggle-btn" id="terms-toggle-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>
          <div class="terms-content collapsed" id="terms-content">
            <div class="terms-inner" id="terms-inner">
              Loading terms...
            </div>
          </div>
        </div>
        
        <label class="agreement-checkbox">
          <input type="checkbox" id="agreement" name="agreement" required>
          <span class="agreement-text">
            I have read and agree to the above booking and cancellation policy
          </span>
        </label>
        <div class="form-error" id="agreement-error"></div>
      </div>
      ` : ''}
      
      <button type="submit" class="booking-submit-btn" ${!bookingFormState.editMode ? 'disabled style="opacity: 0.5; cursor: not-allowed; background-color: #cccccc;"' : ''}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 12l2 2 4-4"></path>
          ${bookingFormState.editMode ? '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>' : '<path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>'}
          <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
          <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"></path>
          <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3"></path>
        </svg>
        ${getSubmitButtonText()}
      </button>
    </div>
  `;
}

// Update submit button state based on agreement checkbox
function updateSubmitButtonState() {
  const submitButton = document.querySelector('.booking-submit-btn');
  
  if (submitButton) {
    // In edit mode, agreement is not required (already agreed during initial booking)
    if (bookingFormState.editMode) {
      submitButton.disabled = false;
      submitButton.style.opacity = '1';
      submitButton.style.cursor = 'pointer';
      submitButton.style.backgroundColor = '';
    } else {
      // New booking mode: require agreement checkbox
      const agreementCheckbox = document.getElementById('agreement');
      if (agreementCheckbox) {
        const isChecked = agreementCheckbox.checked;
        submitButton.disabled = !isChecked;
        
        if (!isChecked) {
          submitButton.style.opacity = '0.5';
          submitButton.style.cursor = 'not-allowed';
          submitButton.style.backgroundColor = '#cccccc';
        } else {
          submitButton.style.opacity = '1';
          submitButton.style.cursor = 'pointer';
          submitButton.style.backgroundColor = '';
        }
      }
    }
  }
}

// Validate room capacity in real-time - uses reusable function
// activeFieldId: ID of the field currently being edited (to prioritize error display)
window.validateRoomCapacity = function(roomId = null, activeFieldId = null) {
  if (roomId) {
    // Validate specific room
    const adultsInput = document.getElementById(`${roomId}-adults`);
    const childrenInput = document.getElementById(`${roomId}-children`);
    validateSingleRoomCapacity(adultsInput, childrenInput, activeFieldId);
  } else {
    // Validate default room inputs
    const adultsInput = document.getElementById('adults');
    const childrenInput = document.getElementById('children');
    validateSingleRoomCapacity(adultsInput, childrenInput, activeFieldId);
  }
};

// Validate cottage capacity in real-time - uses reusable function
// activeFieldId: ID of the field currently being edited (to prioritize error display)
window.validateCottageCapacity = function(activeFieldId = null) {
  const adultsInput = document.getElementById('cottage-adults');
  const childrenInput = document.getElementById('cottage-children');
  validateSingleCottageCapacity(adultsInput, childrenInput, activeFieldId);
};

// Validate function hall guest capacity in real-time
// activeFieldId: ID of the field currently being edited (to prioritize error display)
window.validateFunctionHallGuests = function(activeFieldId = null) {
  const guestsInput = document.getElementById('event-guests');
  if (!guestsInput) return;
  
  const guests = parseInt(guestsInput.value || '0') || 0;
  const guestsId = guestsInput.id || guestsInput.name;
  
  // Clear previous errors/warnings
  clearFieldError(guestsId);
  guestsInput.classList.remove('error', 'warning');
  
  if (guests > FUNCTION_HALL_MAX_CAPACITY) {
    // Error: exceeds maximum capacity
    const errorMsg = `Number of guests (${guests}) exceeds maximum capacity of ${FUNCTION_HALL_MAX_CAPACITY}`;
    showFieldError(guestsId, errorMsg);
    guestsInput.classList.add('error');
    return { isValid: false, message: errorMsg };
  } else if (guests > FUNCTION_HALL_RECOMMENDED_CAPACITY) {
    // Warning: exceeds recommended but within max (allow submission, show warning)
    const excessGuests = guests - FUNCTION_HALL_RECOMMENDED_CAPACITY;
    const units = Math.ceil(excessGuests / 10);
    const warningMsg = `Number of guests (${guests}) exceeds recommended capacity of ${FUNCTION_HALL_RECOMMENDED_CAPACITY} (maximum ${FUNCTION_HALL_MAX_CAPACITY}). Extra seating charges (${units} units × ₱${FUNCTION_HALL_EXTRA_CHAIRS_TABLES_PRICE}) will apply.`;
    showFieldError(guestsId, warningMsg);
    guestsInput.classList.add('warning'); // Use warning class instead of error
    return { isValid: true, message: warningMsg }; // Allow submission with warning
  } else {
    // Within recommended capacity - no issues
    return { isValid: true, message: '' };
  }
};

// Get submit button text based on reservation type and edit mode
function getSubmitButtonText() {
  if (bookingFormState.editMode) {
    return 'Update Booking';
  }
  switch (bookingFormState.reservationType) {
    case 'room':
      return 'Book My Room';
    case 'cottage':
      return 'Book Cottage';
    case 'function-hall':
      return 'Book Function Hall';
    default:
      return 'Complete Booking';
  }
}

// Generate room checkboxes with availability checking
function generateRoomCheckboxes() {
  const checkinDate = document.getElementById('checkin-date')?.value;
  const checkoutDate = document.getElementById('checkout-date')?.value;
  
  return roomTypes.map(room => {
    let isAvailable = true;
    let availabilityClass = '';
    let availabilityLabel = '';
    
    if (checkinDate && checkoutDate) {
      isAvailable = isRoomAvailable(room, checkinDate, checkoutDate);
      if (!isAvailable) {
        availabilityClass = 'unavailable';
        availabilityLabel = '<span class="not-available-label">Not Available</span>';
      }
    }
    
    return `
      <label class="checkbox-item ${availabilityClass}">
        <input type="checkbox" name="selectedRooms" value="${room}" ${!isAvailable ? 'disabled' : ''}>
        <span class="checkbox-label">
          <span class="${!isAvailable ? 'room-name-strike' : ''}">${room}</span>
          ${availabilityLabel}
        </span>
      </label>
    `;
  }).join('');
}

// Generate per-room guest inputs
function generatePerRoomGuestInputs() {
  // Get selected rooms from booking flow or default to empty
  const selectedRooms = bookingFormState.selectedRoomsFromFlow || [];
  
  if (selectedRooms.length === 0) {
    // No pre-selected rooms, show default single set of inputs
    return `
      <div class="guests-group">
        <div class="form-field">
          <label for="adults" class="form-label">Number of Adults *</label>
          <input type="number" id="adults" name="adults" class="form-input" min="1" value="1" required onchange="validateRoomCapacity(null, 'adults')" oninput="validateRoomCapacity(null, 'adults')" onfocus="validateRoomCapacity(null, 'adults')">
          <div class="form-error" id="adults-error"></div>
        </div>
        
        <div class="form-field">
          <label for="children" class="form-label">Number of Children</label>
          <input type="number" id="children" name="children" class="form-input" min="0" value="0" onchange="validateRoomCapacity(null, 'children')" oninput="validateRoomCapacity(null, 'children')" onfocus="validateRoomCapacity(null, 'children')">
          <div class="form-error" id="children-error"></div>
        </div>
      </div>
    `;
  }
  
  // Generate per-room guest inputs with name field
  let html = '<div class="per-room-guests-section">';
  
  selectedRooms.forEach(roomId => {
    // Get pre-filled data for this room if in edit mode
    const roomGuest = bookingFormState.perRoomGuests?.find(rg => rg.roomId === roomId);
    const guestName = roomGuest?.guestName || '';
    const adults = roomGuest?.adults || 1;
    const children = roomGuest?.children || 0;
    
    html += `
      <div class="room-guests-card" data-room-id="${roomId}">
        <h5>${roomId}</h5>
        
        <div class="form-field">
          <label for="${roomId}-guest-name" class="form-label">Primary Guest Name (Optional)</label>
          <input type="text" id="${roomId}-guest-name" name="${roomId}-guestName" class="form-input" value="${guestName}" placeholder="Leave blank if same as main booker">
          <small class="form-hint">The person staying in this room</small>
        </div>
        
        <div class="guests-inputs-row">
          <div class="form-field">
            <label for="${roomId}-adults" class="form-label">Adults *</label>
            <input type="number" id="${roomId}-adults" name="${roomId}-adults" class="form-input" min="1" max="4" value="${adults}" required onchange="updateTotalGuests(); validateRoomCapacity('${roomId}', '${roomId}-adults')" oninput="validateRoomCapacity('${roomId}', '${roomId}-adults')" onfocus="validateRoomCapacity('${roomId}', '${roomId}-adults')">
            <div class="form-error" id="${roomId}-adults-error"></div>
          </div>
          <div class="form-field">
            <label for="${roomId}-children" class="form-label">Children</label>
            <input type="number" id="${roomId}-children" name="${roomId}-children" class="form-input" min="0" max="3" value="${children}" onchange="updateTotalGuests(); validateRoomCapacity('${roomId}', '${roomId}-children')" oninput="validateRoomCapacity('${roomId}', '${roomId}-children')" onfocus="validateRoomCapacity('${roomId}', '${roomId}-children')">
            <div class="form-error" id="${roomId}-children-error"></div>
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

// Generate selected rooms only display (for room bookings - shown below Add More Rooms)
function generateSelectedRoomsOnlyDisplay() {
  const selectedRooms = bookingFormState.selectedRoomsFromFlow || [];
  
  if (selectedRooms.length === 0) {
    return '';
  }
  
  let html = '<div style="margin-top: 16px;"><h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Selected Rooms</h4><div class="selected-items-grid">';
  
  // Add room cards
  selectedRooms.forEach(roomId => {
    html += `
      <div class="selected-item-card">
        <div class="selected-item-icon">🏨</div>
        <div class="selected-item-info">
          <strong>${roomId}</strong>
          <span>Standard Room</span>
        </div>
      </div>
    `;
  });
  
  html += '</div></div>';
  return html;
}

// Generate selected cottages only display (for room bookings - shown below Add Cottage)
function generateSelectedCottagesOnlyDisplay() {
  const selectedCottages = bookingState.selectedCottages || [];
  
  if (selectedCottages.length === 0) {
    return '';
  }
  
  let html = '<div style="margin-top: 16px;"><h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Selected Cottages</h4>';
  
  // Show cottage dates if available
  if (bookingFormState.cottageDates && bookingFormState.cottageDates.length > 0) {
    const formattedDates = bookingFormState.cottageDates.map(date => {
      const d = new Date(date + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }).join(', ');
    html += `<p style="margin: 0 0 12px 0; color: #1e40af; font-size: 13px;">Rental dates: ${formattedDates} (${bookingFormState.cottageDates.length} ${bookingFormState.cottageDates.length === 1 ? 'day' : 'days'})</p>`;
  }
  
  html += '<div class="selected-items-grid">';
  
  // Add cottage cards
  selectedCottages.forEach(cottageId => {
    html += `
      <div class="selected-item-card">
        <div class="selected-item-icon">🏡</div>
        <div class="selected-item-info">
          <strong>${cottageId}</strong>
          <span>Cottage</span>
        </div>
      </div>
    `;
  });
  
  html += '</div></div>';
  return html;
}

// Generate selected cottages display (for cottage bookings)
function generateSelectedCottagesDisplay() {
  const selectedCottages = bookingFormState.selectedCottagesFromFlow || [];
  
  let html = '<div class="form-section"><h3>Selected Cottages</h3><div class="selected-items-grid">';
  
  if (selectedCottages.length === 0) {
    html += '<div class="empty-selected" style="color: var(--color-muted);">No cottages selected yet.</div>';
  }
  
  // Add cottage cards
  selectedCottages.forEach(cottageId => {
    html += `
      <div class="selected-item-card">
        <div class="selected-item-icon">🏡</div>
        <div class="selected-item-info">
          <strong>${cottageId}</strong>
          <span>Cottage</span>
        </div>
      </div>
    `;
  });
  
  html += '</div></div>';
  return html;
}

// Update room availability when dates change
function updateRoomAvailability() {
  const roomCheckboxes = document.getElementById('room-checkboxes');
  if (roomCheckboxes) {
    roomCheckboxes.innerHTML = generateRoomCheckboxes();
  }
}

// Update total guests display
function updateTotalGuests() {
  const selectedRooms = bookingFormState.selectedRoomsFromFlow || [];
  let totalAdults = 0;
  let totalChildren = 0;
  
  selectedRooms.forEach(roomId => {
    const adultsInput = document.getElementById(`${roomId}-adults`);
    const childrenInput = document.getElementById(`${roomId}-children`);
    
    if (adultsInput) totalAdults += parseInt(adultsInput.value) || 0;
    if (childrenInput) totalChildren += parseInt(childrenInput.value) || 0;
  });
  
  const display = document.getElementById('total-guests-display');
  if (display) {
    display.innerHTML = `<strong>Total: ${totalAdults} adults, ${totalChildren} children across ${selectedRooms.length} room${selectedRooms.length > 1 ? 's' : ''}</strong>`;
  }
}

// Make updateTotalGuests globally available
window.updateTotalGuests = updateTotalGuests;

// Remove selected items handlers
window.removeSelectedRoom = function(roomId) {
  // Remove from selectedRoomsFromFlow
  bookingFormState.selectedRoomsFromFlow = (bookingFormState.selectedRoomsFromFlow || []).filter(id => id !== roomId);
  // Rerender content
  const formContent = document.querySelector('.booking-form-content');
  if (formContent) {
    formContent.innerHTML = renderFormFields(bookingFormState.reservationType);
    initializeForm();
  }
};

window.removeSelectedCottage = function(cottageId) {
  bookingState.removeCottage(cottageId);
  const formContent = document.querySelector('.booking-form-content');
  if (formContent) {
    formContent.innerHTML = renderFormFields(bookingFormState.reservationType);
    initializeForm();
  }
};

// Remove cottage from cottage booking flow
window.removeCottageFromBooking = function(cottageId) {
  // Remove from selectedCottagesFromFlow
  bookingFormState.selectedCottagesFromFlow = (bookingFormState.selectedCottagesFromFlow || []).filter(id => id !== cottageId);
  // Rerender content
  const formContent = document.querySelector('.booking-form-content');
  if (formContent) {
    formContent.innerHTML = renderFormFields(bookingFormState.reservationType);
    initializeForm();
  }
};

// Open inline items manager
window.openItemsManager = async function() {
  const container = document.querySelector('.booking-form-content');
  if (!container) return;
  // Build panel
  const panelId = 'items-manager-panel';
  let panel = document.getElementById(panelId);
  if (!panel) {
    panel = document.createElement('div');
    panel.id = panelId;
    panel.style.position = 'relative';
    panel.innerHTML = `
      <div class="form-section" id="items-manager" style="border:1px solid var(--border); border-radius:8px; padding:12px; background:#fafafa;">
        <h3>Manage Items</h3>
        <div id="items-manager-grid">Loading...</div>
      </div>
    `;
    container.appendChild(panel);
  }
  // Render available items by category
  await renderItemsManagerGrid();
  // outside click closes
  function handleOutside(e){
    const box = document.getElementById('items-manager');
    if (box && !box.contains(e.target)) {
      panel.remove();
      document.removeEventListener('click', handleOutside, true);
    }
  }
  setTimeout(() => document.addEventListener('click', handleOutside, true), 0);
};

async function renderItemsManagerGrid() {
  const grid = document.getElementById('items-manager-grid');
  if (!grid) return;
  const category = bookingFormState.category; // 'rooms' | 'cottages'
  const dates = bookingFormState.preFillDates || {};
  try {
    if (category === 'rooms') {
      const checkin = dates.checkin;
      const checkout = dates.checkout;
      const rooms = await bookingState.getAvailableRooms(checkin, checkout);
      grid.innerHTML = `
        <div class="room-selection-grid" style="grid-template-columns: repeat(4, 1fr);">${rooms.map(r => `
          <div class="room-selection-card ${ (bookingFormState.selectedRoomsFromFlow||[]).includes(r) ? 'selected' : '' }" data-room-id="${r}" onclick="toggleManagerRoom('${r}')">
            <div class="room-card-image"><img src="images/kina1.jpg" alt="${r}"><div class="room-selection-indicator"><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\"><path d=\"M20 6L9 17l-5-5\"></path></svg></div></div>
            <div class="room-card-content"><h4>${r}</h4><div class="room-price">₱${ROOM_PRICE.toLocaleString()}/night</div><button class="room-select-btn">${(bookingFormState.selectedRoomsFromFlow||[]).includes(r) ? 'Selected' : 'Select'}</button></div>
          </div>`).join('')}
        </div>`;
    } else if (category === 'cottages') {
      const visit = dates.date;
      const { checkAvailability } = await import('../utils/api.js');
      const result = await checkAvailability(1, visit, visit, 'cottages');
      let available = (result?.dateAvailability?.[visit]?.availableCottages) || ['Standard Cottage','Open Cottage','Family Cottage'];
      // In manager, show all with unavailable/selected states (same as inline)
      const all = ['Standard Cottage','Open Cottage','Family Cottage'];
      grid.innerHTML = `
        <div class="room-selection-grid" style="grid-template-columns: repeat(3, 1fr);">${all.map(c => {
          const isAvailable = available.includes(c);
          const isSelected = (bookingState.selectedCottages||[]).includes(c);
          return `
          <div class="room-selection-card ${ isSelected ? 'selected' : '' } ${isAvailable ? '' : 'unavailable'}" data-cottage-id="${c}" onclick="toggleManagerCottage('${c}')">
            <div class="room-card-image"><img src="images/cottage_1.JPG" alt="${c}"><div class="room-selection-indicator"><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\"><path d=\"M20 6L9 17l-5-5\"></path></svg></div></div>
            <div class="room-card-content"><h4>${c}</h4><div class="room-price">${getCottageInfo(c).price}</div><button class="room-select-btn" ${isAvailable ? '' : 'disabled'}>${isSelected ? 'Selected' : (isAvailable ? 'Select' : 'Unavailable')}</button></div>
          </div>`}).join('')}
        </div>`;
    }
  } catch (e) {
    grid.innerHTML = '<div style="padding:12px; color:#c00;">Failed to load availability.</div>';
  }
}

window.toggleManagerRoom = function(roomId) {
  const list = bookingFormState.selectedRoomsFromFlow || [];
  const idx = list.indexOf(roomId);
  if (idx >= 0) list.splice(idx, 1); else list.push(roomId);
  bookingFormState.selectedRoomsFromFlow = list;
  renderItemsManagerGrid();
};

window.toggleManagerCottage = function(cottageId) {
  // Single-per-type toggle
  if ((bookingState.selectedCottages||[]).includes(cottageId)) {
    bookingState.removeCottage(cottageId);
  } else {
    // Allow adding if not already selected; we keep list unique
    bookingState.addCottage(cottageId);
  }
  renderItemsManagerGrid();
};

// Open cottage items manager (for cottage-only bookings)
window.openCottageItemsManager = async function() {
  const container = document.querySelector('.booking-form-content');
  if (!container) return;
  // Build panel
  const panelId = 'cottage-items-manager-panel';
  let panel = document.getElementById(panelId);
  if (!panel) {
    panel = document.createElement('div');
    panel.id = panelId;
    panel.style.position = 'relative';
    panel.innerHTML = `
      <div class="form-section" id="cottage-items-manager" style="border:1px solid var(--border); border-radius:8px; padding:12px; background:#fafafa;">
        <h3>Add/Remove Cottages</h3>
        <div id="cottage-items-manager-grid">Loading...</div>
        <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 12px;">
          <button type="button" class="btn" onclick="closeCottageItemsManager()">Cancel</button>
          <button type="button" class="btn primary" onclick="confirmCottageItemsManager()">Confirm</button>
        </div>
      </div>
    `;
    container.appendChild(panel);
  }
  // Render available cottages
  await renderCottageItemsManagerGrid();
  // outside click closes (but don't update form on outside click, only on confirm)
  function handleOutside(e){
    const box = document.getElementById('cottage-items-manager');
    const cancelBtn = e.target.closest('.btn');
    const confirmBtn = e.target.closest('.btn.primary');
    if (box && !box.contains(e.target) && !cancelBtn && !confirmBtn) {
      panel.remove();
      document.removeEventListener('click', handleOutside, true);
    }
  }
  setTimeout(() => document.addEventListener('click', handleOutside, true), 0);
};

async function renderCottageItemsManagerGrid() {
  const grid = document.getElementById('cottage-items-manager-grid');
  if (!grid) return;
  const dates = bookingFormState.preFillDates || {};
  const visitDate = dates.date;
  
  try {
    // Get available cottages for the visit date
    const availableCottages = await bookingState.getAvailableCottages(visitDate);
    
    grid.innerHTML = `
      <div class="room-selection-grid" style="grid-template-columns: repeat(3, 1fr);">
        ${availableCottages.map(cottageId => {
          const isSelected = (bookingFormState.selectedCottagesFromFlow||[]).includes(cottageId);
          const cottageInfo = getCottageInfo(cottageId);
          
          return `
            <div class="room-selection-card ${isSelected ? 'selected' : ''}" data-cottage-id="${cottageId}" onclick="toggleCottageInManager('${cottageId}')">
              <div class="room-card-image">
                <img src="${cottageInfo.image}" alt="${cottageId}">
                <div class="room-selection-indicator">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M20 6L9 17l-5-5"></path>
                  </svg>
                </div>
              </div>
              <div class="room-card-content">
                <h4>${cottageId}</h4>
                <div class="room-price">${cottageInfo.price}</div>
                <button class="room-select-btn">${isSelected ? 'Selected' : 'Select'}</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (e) {
    console.error('[Cottage Manager] Error loading cottages:', e);
    grid.innerHTML = '<div style="padding:12px; color:#c00;">Failed to load available cottages.</div>';
  }
}

window.toggleCottageInManager = function(cottageId) {
  const list = bookingFormState.selectedCottagesFromFlow || [];
  const idx = list.indexOf(cottageId);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(cottageId);
  }
  bookingFormState.selectedCottagesFromFlow = list;
  renderCottageItemsManagerGrid();
};

// Close cottage items manager without saving
window.closeCottageItemsManager = function() {
  const panel = document.getElementById('cottage-items-manager-panel');
  if (panel) {
    panel.remove();
  }
};

// Confirm and close cottage items manager
window.confirmCottageItemsManager = function() {
  // Update the form display when confirming
  const formContent = document.querySelector('.booking-form-content');
  if (formContent) {
    formContent.innerHTML = renderFormFields(bookingFormState.reservationType);
    initializeForm();
  }
  // Remove the panel
  const panel = document.getElementById('cottage-items-manager-panel');
  if (panel) {
    panel.remove();
  }
};

// Inline grid toggle for cottages (for cottage-only bookings, use pending version for room bookings)
window.toggleInlineCottage = function(cottageId) {
  // Check if this is a room booking with inline cottage grid
  const grid = document.getElementById('inline-cottage-grid');
  const cottageField = document.getElementById('cottage-selection-field');
  
  // If this is in the room booking inline grid, use pending selection
  if (grid && cottageField && cottageField.style.display !== 'none' && bookingFormState.reservationType === 'room') {
    togglePendingCottage(cottageId);
    return;
  }
  
  // Otherwise, use immediate selection (for cottage-only bookings)
  if ((bookingState.selectedCottages||[]).includes(cottageId)) {
    bookingState.removeCottage(cottageId);
  } else {
    bookingState.addCottage(cottageId);
  }
  // Re-render inline grid to reflect new state
  if (grid) {
    // Trigger full form re-render to keep totals/costs in sync
    const formContent = document.querySelector('.booking-form-content');
    if (formContent) {
      formContent.innerHTML = renderFormFields(bookingFormState.reservationType);
      initializeForm();
    }
  }
};

// Calculate total booking cost
function calculateTotalCost() {
  console.log('[calculateTotalCost] Starting cost calculation');
  console.log('[calculateTotalCost] Reservation type:', bookingFormState.reservationType);
  
  // Handle function hall bookings separately
  if (bookingFormState.reservationType === 'function-hall') {
    // Try multiple sources for hall name
    let hallName = bookingFormState.preFillDates?.hallName || 
                   window.selectedHallId || 
                   '';
    
    // If still empty, try to get from form (as fallback)
    if (!hallName) {
      // Note: This is a fallback - normally hall name should be in preFillDates or selectedHallId
      console.warn('[calculateTotalCost] Hall name not found in state, checking form...');
    }
    
    console.log('[calculateTotalCost] Function hall - hallName:', hallName);
    
    // Function hall base prices
    let baseCost = 0;
    if (hallName.includes('Grand')) {
      baseCost = FUNCTION_HALL_BASE_PRICE_GRAND;
    } else if (hallName.includes('Intimate')) {
      baseCost = FUNCTION_HALL_BASE_PRICE_INTIMATE;
    } else {
      console.warn('[calculateTotalCost] Unknown function hall name:', hallName);
      // Default to Intimate Function Hall price if hall name is not recognized
      baseCost = FUNCTION_HALL_BASE_PRICE_INTIMATE;
    }
    
    // Calculate equipment costs (reuse same function as UI)
    const equipment = calculateFunctionHallEquipmentCost();
    const totalCost = baseCost + equipment.total;
    
    console.log('[calculateTotalCost] Function hall cost calculated:', { baseCost, equipmentTotal: equipment.total, totalCost });
    
    return {
      functionHallCost: baseCost,
      equipmentCost: equipment.total,
      total: totalCost
    };
  }
  
  // Handle room and cottage bookings (existing logic)
  const checkin = bookingFormState.preFillDates?.checkin;
  const checkout = bookingFormState.preFillDates?.checkout;
  
  if (!checkin || !checkout) {
    console.log('[calculateTotalCost] No checkin/checkout dates, returning null');
    return null;
  }
  
  const nights = Math.ceil((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));
  console.log('[calculateTotalCost] Nights calculated:', nights);
  
  // Room costs
  const roomCost = bookingFormState.selectedRoomsFromFlow?.length * ROOM_PRICE * nights || 0;
  console.log('[calculateTotalCost] Room cost:', roomCost);
  
  // Cottage costs
  let cottageCosts = 0;
  let cottageDays = nights; // Default to room nights if no cottage dates specified
  
  // Prefer selected list if present (room add-on flow or single-type cottage)
  if (Array.isArray(bookingState.selectedCottages) && bookingState.selectedCottages.length > 0) {
    // Use cottageDates if available, otherwise fall back to nights
    if (bookingFormState.cottageDates && bookingFormState.cottageDates.length > 0) {
      cottageDays = bookingFormState.cottageDates.length;
    }
    
    cottageCosts = bookingState.selectedCottages.map(cottageId => {
      const cottageInfo = getCottageInfo(cottageId);
      return parseInt(cottageInfo.price.replace(/[₱,]/g, ''));
    }).reduce((sum, price) => sum + (price * cottageDays), 0);
  } else {
    // Cottage standalone flow single cottage (day-use). Cost preview handled separately.
    const typeEl = document.getElementById('cottage-type');
    const selectedType = typeEl?.value || '';
    if (selectedType) {
      const info = getCottageInfo(selectedType);
      const priceNum = parseInt(info.price.replace(/[₱,]/g, '')) || 0;
      cottageCosts = priceNum; // single cottage, day-use
    }
  }
  console.log('[calculateTotalCost] Cottage cost:', cottageCosts);
  
  const total = roomCost + cottageCosts;
  console.log('[calculateTotalCost] Total cost:', total);
  
  return {
    roomCost,
    cottageCost: cottageCosts,
    nights,
    cottageDays,
    total: total
  };
}

// Show cottage selection interface
async function showCottageSelection() {
  // Set flag to indicate we're navigating to cottage selection
  bookingFormState.returningFromCottage = false;
  
  // SAVE FORM VALUES FIRST before replacing HTML
  const form = document.getElementById('booking-form');
  if (form) {
    bookingFormState.savedFormData = {
      guestName: document.getElementById('guest-name')?.value || '',
      email: document.getElementById('email')?.value || '',
      contact: document.getElementById('contact')?.value || '',
      paymentMode: document.getElementById('payment-mode')?.value || '',
      agreement: document.getElementById('agreement')?.checked || false
    };
    
    // Save per-room guest info
    const selectedRooms = bookingFormState.selectedRoomsFromFlow || [];
    selectedRooms.forEach(roomId => {
      const guestName = document.getElementById(`${roomId}-guest-name`)?.value;
      const adults = document.getElementById(`${roomId}-adults`)?.value;
      const children = document.getElementById(`${roomId}-children`)?.value;
      
      if (guestName !== undefined) bookingFormState.savedFormData[`${roomId}-guest-name`] = guestName || '';
      if (adults !== undefined) bookingFormState.savedFormData[`${roomId}-adults`] = adults || '1';
      if (children !== undefined) bookingFormState.savedFormData[`${roomId}-children`] = children || '0';
    });
    
    console.log('[showCottageSelection] Saved form values before cottage view:', bookingFormState.savedFormData);
  }
  
  // Get dates from booking state
  const checkin = bookingFormState.preFillDates?.checkin;
  const checkout = bookingFormState.preFillDates?.checkout;
  
  if (!checkin || !checkout) {
    alert('Please select dates first');
    return;
  }
  
  // Get available cottages from database
  console.log('Checking cottage availability for dates:', checkin, 'to', checkout);
  
  // Get available cottages using database checks
  const availableCottages = await getAvailableCottagesFromDatabase(checkin, checkout);
  
  console.log('Available cottages:', availableCottages);
  
  // Replace booking modal content with cottage selection view
  const modalContent = document.querySelector('.booking-form-content');
  if (modalContent) {
    modalContent.innerHTML = generateCottageSelectionView(availableCottages, checkin, checkout);
    initializeCottageSelectionHandlers();
  }
}

// Get available cottages from database
async function getAvailableCottagesFromDatabase(checkin, checkout) {
  try {
    // For now, return all cottages (since we don't have booking data yet)
    // This will be filtered once bookings start being created
    const allCottages = ['Standard Cottage', 'Open Cottage', 'Family Cottage'];
    
    // Check availability for each cottage
    const availableCottages = [];
    
    for (const cottageId of allCottages) {
      // Check if cottage is available for the date range
      const isAvailable = await checkCottageAvailabilityInDatabase(cottageId, checkin, checkout);
      if (isAvailable) {
        availableCottages.push(cottageId);
      }
    }
    
    return availableCottages.length > 0 ? availableCottages : allCottages; // Fallback to all if DB check fails
  } catch (error) {
    console.error('Error getting available cottages:', error);
    // Fallback to showing all cottages
    return ['Standard Cottage', 'Open Cottage', 'Family Cottage'];
  }
}

// Check if a specific cottage is available in the database
async function checkCottageAvailabilityInDatabase(cottageId, checkin, checkout) {
  try {
    // TODO: Implement actual database check once bookings are being created
    // For now, return true (available)
    return true;
  } catch (error) {
    console.error('Error checking cottage availability:', error);
    // Default to available on error
    return true;
  }
}

// Generate cottage selection view HTML
function generateCottageSelectionView(availableCottages, checkin, checkout) {
  if (availableCottages.length === 0) {
    return `
      <div class="cottage-selection-view">
        <button type="button" class="back-to-booking-btn" onclick="showBookingForm()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
          Back to Booking
        </button>
        
        <div class="no-cottages-available">
          <h3>No Cottages Available</h3>
          <p>No cottages are available for the selected dates (${checkin} to ${checkout}).</p>
          <button type="button" class="btn" onclick="showBookingForm()">Return to Booking</button>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="cottage-selection-view">
      <button type="button" class="back-to-booking-btn" onclick="showBookingForm()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
        Back to Booking
      </button>
      
      <div class="cottage-selection-header">
        <h3>Select Cottages</h3>
        <p>Available for ${checkin} to ${checkout}</p>
      </div>
      
      <div class="cottage-selection-grid">
        ${availableCottages.map(cottageId => {
          const cottageInfo = getCottageInfo(cottageId);
          return `
            <div class="cottage-selection-card ${bookingState.selectedCottages.includes(cottageId) ? 'selected' : ''}" 
                 data-cottage-id="${cottageId}"
                 onclick="toggleCottageSelection('${cottageId}')">
              <div class="cottage-card-image">
                <img src="${cottageInfo.image}" alt="${cottageId}" loading="lazy">
                <div class="cottage-selection-indicator">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M20 6L9 17l-5-5"></path>
                  </svg>
                </div>
              </div>
              <div class="cottage-card-content">
                <h4>${cottageId}</h4>
                <p class="cottage-price">${cottageInfo.price}</p>
                <p class="cottage-capacity">Up to ${cottageInfo.capacity} guests</p>
                <button class="cottage-select-btn">${bookingState.selectedCottages.includes(cottageId) ? 'Selected' : 'Select Cottage'}</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      
      ${bookingState.selectedCottages.length > 0 ? `
        <div class="cottage-selection-summary">
          <div>
            <p><strong>${bookingState.selectedCottages.length} cottage${bookingState.selectedCottages.length > 1 ? 's' : ''} selected</strong></p>
            ${(() => {
              const costs = calculateTotalCost();
              if (costs && costs.cottageCost > 0) {
                return `<p class="cost-preview">Additional: ₱${costs.cottageCost.toLocaleString()}</p>`;
              }
              return '';
            })()}
          </div>
          <button type="button" class="btn primary" onclick="addSelectedCottagesToBooking()">
            Add to Booking
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

// Get cottage information
function getCottageInfo(cottageId) {
  const cottageData = {
    'Standard Cottage': {
      image: 'images/cottage_1.JPG',
      price: '₱400',
      capacity: COTTAGE_CAPACITY
    },
    'Open Cottage': {
      image: 'images/cottage_2.JPG',
      price: '₱300',
      capacity: COTTAGE_CAPACITY
    },
    'Family Cottage': {
      image: 'images/kina1.jpg',
      price: '₱500',
      capacity: COTTAGE_CAPACITY
    }
  };
  
  return cottageData[cottageId] || { image: 'images/kina1.jpg', price: `₱${COTTAGE_PRICE}`, capacity: COTTAGE_CAPACITY };
}

// Update bookingState.selectedCottages and UI price/capacity previews from form inputs
function updateCottageDerivedState() {
  const typeEl = null; // no dropdown; selection via grid
  const adultsEl = document.getElementById('cottage-adults');
  const childrenEl = document.getElementById('cottage-children');
  
  const selectedType = (bookingState.selectedCottages && bookingState.selectedCottages[0]) || '';
  const adults = Math.max(0, parseInt(adultsEl?.value || '0'));
  const children = Math.max(0, parseInt(childrenEl?.value || '0'));
  
  // DO NOT clear bookingState.selectedCottages here
  // It's managed by the cottage selection flow, not the form
  // This function should only update UI previews based on existing selections
  
  // Capacity note
  const noteEl = document.getElementById('cottage-capacity-note');
  if (noteEl && selectedType) {
    const cap = getCottageInfo(selectedType).capacity || 0;
    const maxGuests = cap;
    noteEl.textContent = `Capacity: up to ${maxGuests} guests (${cap} per cottage)`;
  } else if (noteEl) {
    noteEl.textContent = '';
  }
  
  // Price preview
  const priceEl = document.getElementById('cottage-price-preview');
  if (priceEl && selectedType) {
    const info = getCottageInfo(selectedType);
    const priceNum = parseInt(info.price.replace(/[₱,]/g, '')) || 0;
    const total = priceNum;
    priceEl.textContent = `Estimated: ₱${total.toLocaleString()} (${selectedType})`;
  } else if (priceEl) {
    priceEl.textContent = '';
  }
  
  // Basic capacity validation visual (non-blocking here)
  const totalGuests = adults + children;
  if (noteEl && selectedType) {
    const cap = getCottageInfo(selectedType).capacity || 0;
    const maxGuests = cap;
    noteEl.style.color = totalGuests > maxGuests ? '#d32f2f' : 'var(--color-text-secondary)';
  }
}

// Initialize cottage selection handlers
function initializeCottageSelectionHandlers() {
  // Event handlers are attached via onclick in the generated HTML
}

// Toggle cottage selection
function toggleCottageSelection(cottageId) {
  if (bookingState.selectedCottages.includes(cottageId)) {
    bookingState.removeCottage(cottageId);
  } else {
    bookingState.addCottage(cottageId);
  }
  
  console.log('[toggleCottageSelection] Updated cottages:', bookingState.selectedCottages);
  
  // Update visual state
  const card = document.querySelector(`.cottage-selection-card[data-cottage-id="${cottageId}"]`);
  if (card) {
    if (bookingState.selectedCottages.includes(cottageId)) {
      card.classList.add('selected');
      card.querySelector('.cottage-select-btn').textContent = 'Selected';
    } else {
      card.classList.remove('selected');
      card.querySelector('.cottage-select-btn').textContent = 'Select Cottage';
    }
  }
  
  // Update summary section
  updateCottageSelectionSummary();
}

// Update cottage selection summary
function updateCottageSelectionSummary() {
  const summarySection = document.querySelector('.cottage-selection-summary');
  if (bookingState.selectedCottages.length > 0) {
    if (!summarySection) {
      // Add summary section
      const view = document.querySelector('.cottage-selection-view');
      const summaryHTML = `
        <div class="cottage-selection-summary">
          <p><strong>${bookingState.selectedCottages.length} cottage${bookingState.selectedCottages.length > 1 ? 's' : ''} selected</strong></p>
          <button type="button" class="btn primary" onclick="addSelectedCottagesToBooking()">
            Add to Booking
          </button>
        </div>
      `;
      view.insertAdjacentHTML('beforeend', summaryHTML);
    } else {
      // Update existing summary
      summarySection.querySelector('p strong').textContent = `${bookingState.selectedCottages.length} cottage${bookingState.selectedCottages.length > 1 ? 's' : ''} selected`;
    }
  } else if (summarySection) {
    summarySection.remove();
  }
}

// Add selected cottages to booking and return to form
function addSelectedCottagesToBooking() {
  if (bookingState.selectedCottages.length === 0) {
    alert('Please select at least one cottage');
    return;
  }
  
  // Set flag to indicate we're returning from cottage selection
  bookingFormState.returningFromCottage = true;
  
  // Close selection modal if open
  const modalEl = document.querySelector('.modal');
  if (modalEl) {
    modalEl.remove();
  }
  // Show booking form again
  showBookingForm();
}

// Show booking form (restore original form)
function showBookingForm() {
  console.warn('[showBookingForm] Called - preserving form state');
  
  const form = document.getElementById('booking-form');
  
  // If returning from cottage, skip saving (use existing savedFormData)
  if (!bookingFormState.returningFromCottage && form) {
    // Save form values to state BEFORE re-rendering
    bookingFormState.savedFormData = {
      guestName: document.getElementById('guest-name')?.value || '',
      email: document.getElementById('email')?.value || '',
      contact: document.getElementById('contact')?.value || '',
      paymentMode: document.getElementById('payment-mode')?.value || '',
      agreement: document.getElementById('agreement')?.checked || false
    };
    
    // Save per-room guest info
    const selectedRooms = bookingFormState.selectedRoomsFromFlow || [];
    selectedRooms.forEach(roomId => {
      const guestName = document.getElementById(`${roomId}-guest-name`)?.value;
      const adults = document.getElementById(`${roomId}-adults`)?.value;
      const children = document.getElementById(`${roomId}-children`)?.value;
      
      if (guestName !== undefined) bookingFormState.savedFormData[`${roomId}-guest-name`] = guestName || '';
      if (adults !== undefined) bookingFormState.savedFormData[`${roomId}-adults`] = adults || '1';
      if (children !== undefined) bookingFormState.savedFormData[`${roomId}-children`] = children || '0';
    });
    
    console.log('[showBookingForm] Saved to state (from form):', bookingFormState.savedFormData);
  } else if (bookingFormState.returningFromCottage) {
    console.log('[showBookingForm] Returning from cottage - using existing saved state:', bookingFormState.savedFormData);
  }
  
  // Re-render form
  const formContent = document.querySelector('.booking-form-content');
  if (formContent && bookingFormState.reservationType) {
    formContent.innerHTML = renderFormFields(bookingFormState.reservationType);
    initializeForm();
    
    // Restore values from state
    if (bookingFormState.savedFormData) {
      Object.entries(bookingFormState.savedFormData).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (input) {
          if (input.type === 'checkbox') {
            input.checked = value;
          } else {
            input.value = value;
          }
          // Trigger change event
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      console.log('[showBookingForm] Form values restored from state');
    }
    
    // Reset the flag after restoring
    bookingFormState.returningFromCottage = false;
  }
}

// Make functions globally available
window.showCottageSelection = showCottageSelection;

// Toggle add more rooms section
window.toggleAddMoreRooms = function() {
  const field = document.getElementById('rooms-selection-field');
  const button = document.getElementById('add-more-rooms-toggle');
  
  if (!field || !button) return;
  
  const isVisible = field.style.display !== 'none';
  
  if (isVisible) {
    field.style.display = 'none';
    // Reset pending selection when closing
    bookingFormState.pendingRoomsSelection = null;
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Add More Rooms
    `;
  } else {
    field.style.display = 'block';
    // Reset pending selection when opening
    bookingFormState.pendingRoomsSelection = null;
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Hide Rooms
    `;
    // Populate rooms grid if not already populated
    populateInlineRoomsGrid();
  }
};

// Toggle add cottage section - Opens calendar with room booking date constraints
window.toggleAddCottage = function() {
  const field = document.getElementById('cottage-selection-field');
  const button = document.getElementById('add-cottage-toggle');
  
  if (!field || !button) return;
  
  const dates = bookingFormState.preFillDates || {};
  const checkin = dates.checkin;
  const checkout = dates.checkout;
  
  if (field.style.display === 'none' || !field.style.display) {
    // EXPANDING - check if we have dates first
    if (!checkin || !checkout) {
      alert('Please select check-in and check-out dates first for your room booking');
      return;
    }
    
    // If no cottage dates selected yet, open calendar to select dates
    if (!bookingFormState.cottageDates || bookingFormState.cottageDates.length === 0) {
      console.log('[toggleAddCottage] No cottage dates yet, opening calendar');
      window.changeCottageDates();
      return;
    }
    
    // Show section
    field.style.display = 'block';
    bookingFormState.addCottageToRoom = true;
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Hide Cottages
    `;
    
    // Show dates display
    const datesDisplay = document.getElementById('cottage-dates-display');
    if (datesDisplay) {
      datesDisplay.style.display = 'block';
    }
    
    // Populate grid with available cottages for selected dates
    populateInlineCottageGrid();
    
  } else {
    // COLLAPSING
    field.style.display = 'none';
    bookingFormState.addCottageToRoom = false;
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Add Cottage to Room Booking
    `;
  }
};

// New function to change/select cottage dates
window.changeCottageDates = function() {
  const dates = bookingFormState.preFillDates || {};
  const checkin = dates.checkin;
  const checkout = dates.checkout;
  
  if (!checkin || !checkout) {
    alert('Please select check-in and check-out dates first for your room booking');
    return;
  }
  
  console.log('[changeCottageDates] Opening cottage calendar with date constraints:', checkin, 'to', checkout);
  
  // Open calendar modal with date constraints
  if (window.openCalendarModal) {
    const constraintDates = {
      startDate: checkin,
      endDate: checkout
    };
    
    // Mark that we're adding cottages to room booking
    window.bookingModalCottageMode = true;
    
    // Pass editBookingId if we're in re-edit mode so calendar excludes current booking from availability
    const editBookingId = bookingFormState.bookingId || null;
    console.log('[changeCottageDates] editBookingId:', editBookingId);
    console.log('[changeCottageDates] Skipping booked dates for current booking:', editBookingId);
    
    window.openCalendarModal('Select Cottage Dates', 3, 'cottages', editBookingId, constraintDates);
  } else {
    alert('Calendar modal not available');
  }
};

// Handle cottage dates selected from calendar (for adding cottages to room booking)
window.updateCottageDatesForRoomBooking = async function(selectedDates) {
  console.log('[updateCottageDatesForRoomBooking] Cottage dates selected:', selectedDates);
  
  if (!Array.isArray(selectedDates) || selectedDates.length === 0) {
    alert('No dates selected for cottage rental');
    return;
  }
  
  // Store the cottage dates in booking form state (array of individual dates)
  bookingFormState.cottageDates = selectedDates.sort(); // Sort dates chronologically
  
  // Show the cottage selection field and populate with available cottages
  const field = document.getElementById('cottage-selection-field');
  const button = document.getElementById('add-cottage-toggle');
  
  if (field && button) {
    field.style.display = 'block';
    
    // Format dates for display
    const dateLabels = selectedDates.length > 3 
      ? `${selectedDates.length} days selected`
      : selectedDates.join(', ');
    
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Hide Cottages (${dateLabels})
    `;
    
    // Update the cottage dates display section
    const datesDisplay = document.getElementById('cottage-dates-display');
    const datesText = document.getElementById('cottage-dates-text');
    if (datesDisplay && datesText) {
      datesDisplay.style.display = 'block';
      // Format dates nicely (e.g., "Nov 6, Nov 7, Nov 8")
      const formattedDates = selectedDates.map(date => {
        const d = new Date(date + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }).join(', ');
      datesText.textContent = `${formattedDates} (${selectedDates.length} ${selectedDates.length === 1 ? 'day' : 'days'})`;
    }
    
    // Check availability for each selected date and get intersection
    try {
      const availabilityPromises = selectedDates.map(date => 
        bookingState.getAvailableCottages(date, date)
      );
      
      const availabilityResults = await Promise.all(availabilityPromises);
      console.log('[updateCottageDatesForRoomBooking] Availability results:', availabilityResults);
      
      // Get intersection of available cottages across all selected dates
      let availableCottages = availabilityResults[0] || [];
      for (let i = 1; i < availabilityResults.length; i++) {
        availableCottages = availableCottages.filter(cottage => 
          availabilityResults[i].includes(cottage)
        );
      }
      
      console.log('[updateCottageDatesForRoomBooking] Available cottages for all dates:', availableCottages);
      
      // Populate the grid with available cottages
      const grid = document.getElementById('inline-cottage-grid');
      if (!grid) return;
      
      const pending = bookingFormState.pendingCottagesSelection;
      const current = bookingState.selectedCottages || [];
      const selected = (pending != null) ? pending : current; // != checks for both null and undefined
      
      if (availableCottages.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; padding:12px; color:#c00;">No cottages available for all selected dates.</div>';
        return;
      }
      
      // Only render available cottages
      grid.innerHTML = availableCottages.map(c => {
        const isSelected = selected.includes(c);
        return `
          <div class="room-selection-card ${isSelected ? 'selected' : ''}" data-cottage-id="${c}" onclick="togglePendingCottage('${c}', event)">
            <div class="room-card-image">
              <img src="${getCottageInfo(c).image}" alt="${c}">
              <div class="room-selection-indicator">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
              </div>
            </div>
            <div class="room-card-content">
              <h4>${c}</h4>
              <div class="room-price">${getCottageInfo(c).price}</div>
              <button type="button" class="room-select-btn" onclick="event.stopPropagation(); togglePendingCottage('${c}', event)">${isSelected ? 'Selected' : 'Select'}</button>
            </div>
          </div>
        `;
      }).join('');
      
      // Show confirm/close buttons
      const confirmSection = document.getElementById('cottages-confirm-section');
      const closeSection = document.getElementById('cottages-close-section');
      if (confirmSection && closeSection) {
        const hasChanges = (pending != null) && JSON.stringify(pending) !== JSON.stringify(current);
        confirmSection.style.display = hasChanges ? 'block' : 'none';
        closeSection.style.display = hasChanges ? 'none' : 'block';
      }
    } catch (error) {
      console.error('[updateCottageDatesForRoomBooking] Error checking availability:', error);
      console.error('[updateCottageDatesForRoomBooking] Error stack:', error.stack);
      console.error('[updateCottageDatesForRoomBooking] Error message:', error.message);
      alert('Error checking cottage availability: ' + error.message);
    }
  }
};

// Populate inline rooms grid
async function populateInlineRoomsGrid() {
  const grid = document.getElementById('inline-rooms-grid');
  if (!grid) return;
  
  const dates = bookingFormState.preFillDates || {};
  const checkin = dates.checkin;
  const checkout = dates.checkout;
  
  if (!checkin || !checkout) {
    grid.innerHTML = '<div style="grid-column:1/-1; padding:12px; color:#c00;">Please select check-in and check-out dates first.</div>';
    return;
  }
  
  try {
    const rooms = await bookingState.getAvailableRooms(checkin, checkout);
    // Use pending selection if available, otherwise use current selection
      const pending = bookingFormState.pendingRoomsSelection;
      const current = bookingFormState.selectedRoomsFromFlow || [];
      const selected = (pending != null) ? pending : current; // != checks for both null and undefined
    
    if (rooms.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1; padding:12px; color:#c00;">No rooms available for selected dates.</div>';
      return;
    }
    
    grid.innerHTML = rooms.map(roomId => {
      const isSelected = selected.includes(roomId);
      return `
        <div class="room-selection-card ${isSelected ? 'selected' : ''}" data-room-id="${roomId}" onclick="togglePendingRoom('${roomId}', event)">
          <div class="room-card-image">
            <img src="images/kina1.jpg" alt="${roomId}">
            <div class="room-selection-indicator">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </div>
          </div>
          <div class="room-card-content">
            <h4>${roomId}</h4>
            <div class="room-price">₱${ROOM_PRICE.toLocaleString()}/night</div>
            <button type="button" class="room-select-btn" onclick="event.stopPropagation(); togglePendingRoom('${roomId}', event)">${isSelected ? 'Selected' : 'Select'}</button>
          </div>
        </div>
      `;
    }).join('');
    
    // Show/hide confirm/close buttons based on whether there are pending changes
      const confirmSection = document.getElementById('rooms-confirm-section');
      const closeSection = document.getElementById('rooms-close-section');
      if (confirmSection && closeSection) {
        const hasChanges = (pending != null) && JSON.stringify(pending) !== JSON.stringify(current);
        confirmSection.style.display = hasChanges ? 'block' : 'none';
        closeSection.style.display = hasChanges ? 'none' : 'block';
      }
  } catch (e) {
    console.error('[populateInlineRoomsGrid] Error:', e);
    grid.innerHTML = '<div style="grid-column:1/-1; padding:12px; color:#c00;">Failed to load rooms.</div>';
  }
}

// Populate inline cottage grid for room bookings
async function populateInlineCottageGrid() {
  const grid = document.getElementById('inline-cottage-grid');
  if (!grid) return;
  
  console.log('[populateInlineCottageGrid] 🔍 Called');
  
  const dates = bookingFormState.preFillDates || {};
  const checkin = dates.checkin;
  const checkout = dates.checkout;
  
  if (!checkin || !checkout) {
    grid.innerHTML = '<div style="grid-column:1/-1; padding:12px; color:#c00;">Please select check-in and check-out dates first.</div>';
    return;
  }
  
  try {
    // Use the new getAvailableCottages method which checks availability across the ENTIRE date range
    const cottages = await bookingState.getAvailableCottages(checkin, checkout);
    console.log('[populateInlineCottageGrid] Available cottages:', cottages);
    
    // Remove duplicates from cottages array (just in case)
    const uniqueCottages = [...new Set(cottages)];
    console.log('[populateInlineCottageGrid] Unique cottages:', uniqueCottages);
    
    // Use pending selection if available, otherwise use current selection
      const pending = bookingFormState.pendingCottagesSelection;
      const current = bookingState.selectedCottages || [];
      const selected = (pending != null) ? pending : current; // != checks for both null and undefined
    
    console.log('[populateInlineCottageGrid] Selected cottages:', selected);
    
    if (uniqueCottages.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1; padding:12px; color:#c00;">No cottages available for selected dates.</div>';
      return;
    }
    
    // Only render available cottages (filter out unavailable ones)
    grid.innerHTML = uniqueCottages.map(c => {
      const isSelected = selected.includes(c);
      return `
        <div class="room-selection-card ${isSelected ? 'selected' : ''}" data-cottage-id="${c}" onclick="togglePendingCottage('${c}', event)">
          <div class="room-card-image">
            <img src="${getCottageInfo(c).image}" alt="${c}">
            <div class="room-selection-indicator">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </div>
          </div>
          <div class="room-card-content">
            <h4>${c}</h4>
            <div class="room-price">${getCottageInfo(c).price}</div>
            <button type="button" class="room-select-btn" onclick="event.stopPropagation(); togglePendingCottage('${c}', event)">${isSelected ? 'Selected' : 'Select'}</button>
          </div>
        </div>
      `;
    }).join('');
    
    // Show/hide confirm/close buttons based on whether there are pending changes
    const confirmSection = document.getElementById('cottages-confirm-section');
    const closeSection = document.getElementById('cottages-close-section');
    if (confirmSection && closeSection) {
      const hasChanges = pending !== null && JSON.stringify(pending) !== JSON.stringify(current);
      confirmSection.style.display = hasChanges ? 'block' : 'none';
      closeSection.style.display = hasChanges ? 'none' : 'block';
    }
  } catch (e) {
    console.error('[populateInlineCottageGrid] Error:', e);
    grid.innerHTML = '<div style="grid-column:1/-1; padding:12px; color:#c00;">Failed to load cottages.</div>';
  }
}

// Toggle pending room selection (before confirmation)
window.togglePendingRoom = function(roomId, event) {
  // Prevent form submission and event bubbling
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  // Initialize pending selection from current if not set (check for both null and undefined)
  if (bookingFormState.pendingRoomsSelection == null) {
    bookingFormState.pendingRoomsSelection = [...(bookingFormState.selectedRoomsFromFlow || [])];
  }
  
  const list = bookingFormState.pendingRoomsSelection;
  const idx = list.indexOf(roomId);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(roomId);
  }
  
  // Update the grid to reflect pending selection
  populateInlineRoomsGrid();
};

// Confirm rooms selection
window.confirmRoomsSelection = function() {
  if (bookingFormState.pendingRoomsSelection != null) {
    bookingFormState.selectedRoomsFromFlow = [...bookingFormState.pendingRoomsSelection];
    bookingFormState.pendingRoomsSelection = null;
  }
  
  // Update form to refresh guest inputs and totals
  const formContent = document.querySelector('.booking-form-content');
  if (formContent) {
    formContent.innerHTML = renderFormFields(bookingFormState.reservationType);
    initializeForm();
  }
  
  // Close the selection area after confirming
  closeRoomsSelection();
};

// Cancel rooms selection (revert pending changes and close)
window.cancelRoomsSelection = function() {
  bookingFormState.pendingRoomsSelection = null;
  populateInlineRoomsGrid();
  // Close the selection area
  closeRoomsSelection();
};

// Close rooms selection area
window.closeRoomsSelection = function() {
  const field = document.getElementById('rooms-selection-field');
  const button = document.getElementById('add-more-rooms-toggle');
  
  if (field) field.style.display = 'none';
  if (button) {
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Add More Rooms
    `;
  }
  // Reset pending selection when closing
  bookingFormState.pendingRoomsSelection = null;
};

// Toggle inline room selection (keep for backward compatibility, but use pending version)
window.toggleInlineRoom = function(roomId, event) {
  togglePendingRoom(roomId, event);
};

// Toggle pending cottage selection (before confirmation)
window.togglePendingCottage = function(cottageId, event) {
  // Prevent form submission and event bubbling
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  // Initialize pending selection from current if not set (check for both null and undefined)
  if (bookingFormState.pendingCottagesSelection == null) {
    bookingFormState.pendingCottagesSelection = [...(bookingState.selectedCottages || [])];
  }
  
  const list = bookingFormState.pendingCottagesSelection;
  const idx = list.indexOf(cottageId);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(cottageId);
  }
  
  // Update the grid to reflect pending selection
  populateInlineCottageGrid();
};

// Confirm cottages selection
window.confirmCottagesSelection = function() {
  if (bookingFormState.pendingCottagesSelection != null) {
    // Clear existing and add new selections
    bookingState.selectedCottages = [...bookingFormState.pendingCottagesSelection];
    bookingFormState.pendingCottagesSelection = null;
  }
  
  // Update form to refresh totals
  const formContent = document.querySelector('.booking-form-content');
  if (formContent) {
    formContent.innerHTML = renderFormFields(bookingFormState.reservationType);
    initializeForm();
  }
  
  // Close the selection area after confirming
  closeCottagesSelection();
};

// Cancel cottages selection (revert pending changes and close)
window.cancelCottagesSelection = function() {
  bookingFormState.pendingCottagesSelection = null;
  populateInlineCottageGrid();
  // Close the selection area
  closeCottagesSelection();
};

// Close cottages selection area
window.closeCottagesSelection = function() {
  const field = document.getElementById('cottage-selection-field');
  const button = document.getElementById('add-cottage-toggle');
  
  if (field) field.style.display = 'none';
  if (button) {
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Add Cottage to Room Booking
    `;
  }
  // Reset pending selection when closing
  bookingFormState.pendingCottagesSelection = null;
};

window.toggleCottageSelection = toggleCottageSelection;
window.addSelectedCottagesToBooking = addSelectedCottagesToBooking;
window.showBookingForm = showBookingForm;

// Toggle add room to cottage booking
function toggleAddRoom() {
  bookingFormState.addRoomToCottage = !bookingFormState.addRoomToCottage;
  const field = document.getElementById('room-overnight-field');
  const button = document.querySelector('.add-option-toggle');
  
  if (bookingFormState.addRoomToCottage) {
    field.style.display = 'block';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Remove Room from Booking
    `;
  } else {
    field.style.display = 'none';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Add Room for Overnight Stay
    `;
  }
}

// Initialize form with event listeners
function initializeForm() {
  // Set minimum date to today
    const todayDate = new Date(); todayDate.setHours(0,0,0,0);
    const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth()+1).padStart(2,'0')}-${String(todayDate.getDate()).padStart(2,'0')}`;
  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.min = today;
  });
  
  // Pre-fill main booker info from logged-in user
  const authUser = localStorage.getItem('auth_user');
  if (authUser) {
    try {
      const user = JSON.parse(authUser);
      const nameInput = document.getElementById('guest-name');
      const emailInput = document.getElementById('email');
      
      if (nameInput && !nameInput.value && user.firstName && user.lastName) {
        nameInput.value = `${user.firstName} ${user.lastName}`;
      }
      if (emailInput && !emailInput.value && user.email) {
        emailInput.value = user.email;
      }
    } catch (e) {
      console.error('Failed to parse user data:', e);
    }
  }
  
  // Pre-fill dates if provided
  if (bookingFormState.preFillDates) {
    if (bookingFormState.preFillDates.checkin && bookingFormState.preFillDates.checkout) {
      // Room booking - pre-fill check-in and check-out
      const checkinInput = document.getElementById('checkin-date');
      const checkoutInput = document.getElementById('checkout-date');
      if (checkinInput) {
        checkinInput.value = bookingFormState.preFillDates.checkin;
        console.log('Pre-filled checkin date:', checkinInput.value);
      }
      if (checkoutInput) {
        checkoutInput.value = bookingFormState.preFillDates.checkout;
        console.log('Pre-filled checkout date:', checkoutInput.value);
      }
    } else if (bookingFormState.preFillDates.date) {
      // Cottage or function hall - pre-fill single date
      const dateInput = document.getElementById('cottage-date') || document.getElementById('event-date');
      if (dateInput) dateInput.value = bookingFormState.preFillDates.date;
    }
  }
  
  // No time/duration handling for cottages (day-use only)
  
  // Auto-calculate nights for room booking
  const checkinInput = document.getElementById('checkin-date');
  const checkoutInput = document.getElementById('checkout-date');
  const nightsDisplay = document.getElementById('nights-display');
  if (checkinInput) {
    checkinInput.addEventListener('click', (e) => { e.preventDefault(); openCalendarForCheckin(); });
  }
  if (checkoutInput) {
    checkoutInput.addEventListener('click', (e) => { e.preventDefault(); openCalendarForCheckout(); });
  }
  
  if (checkinInput && checkoutInput && nightsDisplay) {
    const calculateNights = () => {
      const checkin = new Date(checkinInput.value);
      const checkout = new Date(checkoutInput.value);
      
      if (checkin && checkout && checkout > checkin) {
        const diffTime = Math.abs(checkout - checkin);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        nightsDisplay.textContent = diffDays;
        // Update room availability when dates change
        updateRoomAvailability();
      } else {
        nightsDisplay.textContent = '0';
      }
    };
    
    checkinInput.addEventListener('change', calculateNights);
    checkoutInput.addEventListener('change', calculateNights);
    
    // Calculate nights on initial load if dates are pre-filled
    if (checkinInput.value && checkoutInput.value) {
      calculateNights();
    }
  }
  
  // Handle room selection based on number of rooms
  const numRoomsSelect = document.getElementById('num-rooms');
  
  if (numRoomsSelect) {
    numRoomsSelect.addEventListener('change', (e) => {
      const numRooms = parseInt(e.target.value);
      
      // Show instruction
      const instruction = document.createElement('div');
      instruction.className = 'room-selection-instruction';
      instruction.textContent = `Please select ${numRooms} room${numRooms > 1 ? 's' : ''}`;
      
      const existingInstruction = document.querySelector('.room-selection-instruction');
      if (existingInstruction) {
        existingInstruction.remove();
      }
      
      document.getElementById('room-selection-field').appendChild(instruction);
    });
  }
  
  // Real-time validation - validate during input, not just clear errors
  document.querySelectorAll('.form-input, .form-select').forEach(input => {
    // Always validate on blur
    input.addEventListener('blur', () => validateField(input));
    
    // Validate during input with debouncing for contact number
    input.addEventListener('input', () => {
      if (input.name === 'contact') {
        // Debounce contact validation (wait 300ms after typing stops)
        clearTimeout(window.contactValidationTimeout);
        window.contactValidationTimeout = setTimeout(() => {
          validateField(input);
        }, 300);
      } else {
        // Immediate validation for other fields
        validateField(input);
      }
    });
  });
  
  // Update total guests display if coming from room selection flow
  if (bookingFormState.selectedRoomsFromFlow && bookingFormState.selectedRoomsFromFlow.length > 0) {
    updateTotalGuests();
  }
  
  // Load terms and conditions (only in new booking mode)
  if (!bookingFormState.editMode) {
    loadTermsAndConditions();
    
    // Add event listener to agreement checkbox to enable/disable submit button
    const agreementCheckbox = document.getElementById('agreement');
    if (agreementCheckbox) {
      agreementCheckbox.addEventListener('change', () => {
        updateSubmitButtonState();
      });
    }
  }
  
  // Initialize submit button state (handles both edit and new booking modes)
  updateSubmitButtonState();
  
  // Initialize function hall cost breakdown if applicable
  if (bookingFormState.reservationType === 'function-hall') {
    updateFunctionHallCost();
  }

  // Cottage form dynamic handlers
  const cottageTypeEl = document.getElementById('cottage-type');
  const cottageAdultsEl = document.getElementById('cottage-adults');
  const cottageChildrenEl = document.getElementById('cottage-children');
  if (cottageTypeEl || cottageAdultsEl || cottageChildrenEl) {
    [cottageTypeEl, cottageAdultsEl, cottageChildrenEl].forEach(el => {
      if (el) el.addEventListener('change', updateCottageDerivedState);
      if (el) el.addEventListener('input', updateCottageDerivedState);
    });
    // Initialize preview
    updateCottageDerivedState();
  }

  // Inline cottage grid population (reuse room card UI)
  if (bookingFormState.reservationType === 'cottage') {
    const grid = document.getElementById('inline-cottage-grid');
    const visit = bookingFormState.preFillDates?.date;
    if (grid && visit) {
      (async () => {
        try {
          const { checkAvailability } = await import('../utils/api.js');
          const result = await checkAvailability(1, visit, visit, 'cottages');
          let available = (result?.dateAvailability?.[visit]?.availableCottages) || ['Standard Cottage','Open Cottage','Family Cottage'];
          const selected = bookingState.selectedCottages || [];
          // For inline UI, show all three with selected state; disable ones not in available list
          const all = ['Standard Cottage','Open Cottage','Family Cottage'];
          grid.innerHTML = all.map(c => {
            const isAvailable = available.includes(c);
            const isSelected = selected.includes(c);
            return `
              <div class="room-selection-card ${isSelected ? 'selected' : ''} ${isAvailable ? '' : 'unavailable'}" data-cottage-id="${c}" onclick="toggleInlineCottage('${c}')">
                <div class="room-card-image">
                  <img src="${getCottageInfo(c).image}" alt="${c}">
                  <div class="room-selection-indicator"><svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\"><path d=\"M20 6L9 17l-5-5\"></path></svg></div>
                </div>
                <div class="room-card-content">
                  <h4>${c}</h4>
                  <div class="room-price">${getCottageInfo(c).price}</div>
                  <button class="room-select-btn" ${isAvailable ? '' : 'disabled'}>${isSelected ? 'Selected' : (isAvailable ? 'Select' : 'Unavailable')}</button>
                </div>
              </div>`;
          }).join('');
        } catch (e) {
          grid.innerHTML = '<div style="grid-column:1/-1; padding:12px; color:#c00;">Failed to load cottages.</div>';
        }
      })();
    }
  }
  
  // Inline rooms and cottage grids for room bookings (populate if fields are visible)
  if (bookingFormState.reservationType === 'room') {
    const roomsField = document.getElementById('rooms-selection-field');
    const cottageField = document.getElementById('cottage-selection-field');
    
    // Populate rooms grid if field is visible
    if (roomsField && roomsField.style.display !== 'none') {
      populateInlineRoomsGrid();
    }
    
    // Populate cottage grid if field is visible
    if (cottageField && cottageField.style.display !== 'none') {
      populateInlineCottageGrid();
    }
    
    // Prepare cottage dates display if cottage dates exist (for editing)
    // But keep section COLLAPSED initially - user can expand it by clicking button
    if (bookingFormState.cottageDates && bookingFormState.cottageDates.length > 0) {
      const datesDisplay = document.getElementById('cottage-dates-display');
      const datesText = document.getElementById('cottage-dates-text');
      
      // Pre-populate dates display (but keep hidden until section is expanded)
      if (datesDisplay && datesText) {
        const formattedDates = bookingFormState.cottageDates.map(date => {
          const d = new Date(date + 'T00:00:00');
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }).join(', ');
        datesText.textContent = `${formattedDates} (${bookingFormState.cottageDates.length} ${bookingFormState.cottageDates.length === 1 ? 'day' : 'days'})`;
      }
      
      // DO NOT show cottage section initially - keep collapsed
      // DO NOT change button text - keep as "Add Cottage to Room Booking"
      // User will click to expand and see their selected cottages
    }
  }
}

// Toggle terms expansion
window.toggleTermsExpansion = function() {
  const termsContent = document.getElementById('terms-content');
  const toggleBtn = document.getElementById('terms-toggle-btn');
  
  if (termsContent && toggleBtn) {
    const isCollapsed = termsContent.classList.contains('collapsed');
    
    if (isCollapsed) {
      termsContent.classList.remove('collapsed');
      toggleBtn.classList.add('expanded');
    } else {
      termsContent.classList.add('collapsed');
      toggleBtn.classList.remove('expanded');
    }
  }
};

// Fetch and display terms from API or use fallback
async function loadTermsAndConditions() {
  const termsInner = document.getElementById('terms-inner');
  if (!termsInner) return;

  // Check cache first
  if (window.__bookingTermsCache) {
    termsInner.innerHTML = window.__bookingTermsCache;
    return;
  }

  // If coming from a cottage card selection, preselect that cottage in the modal
  if (bookingFormState.category === 'cottages' && window.preselectedCottageType) {
    const pre = String(window.preselectedCottageType);
    if (!Array.isArray(bookingState.selectedCottages) || bookingState.selectedCottages.length === 0) {
      bookingState.selectedCottages = [pre];
    } else if (!bookingState.selectedCottages.includes(pre)) {
      bookingState.selectedCottages.push(pre);
    }
    try { delete window.preselectedCottageType; } catch(_){}
  }

  try {
    // Try to fetch from API
    const { request } = await import('../utils/api.js');
    const data = await request('/settings/booking_terms');
    if (data && (data.data?.content || data.content)) {
      const content = data.data?.content || data.content;
      window.__bookingTermsCache = content;
      termsInner.innerHTML = content;
      return;
    }
  } catch (error) {
    console.log('API terms not available, using fallback:', error.message);
  }

  // Fallback: Use static booking terms
  const fallbackTerms = `
    <div style="line-height: 1.6; color: #333;">
      <h3 style="margin-top: 0; color: #667eea; font-size: 18px;">Reservations and Payment</h3>
      <p><strong>Booking Process:</strong> All reservations are subject to availability and confirmation. A valid payment method is required to secure your booking.</p>
      <p><strong>Payment Terms:</strong> Full payment is required at the time of booking. We accept major credit cards, bank transfers, and other approved payment methods. All prices are in Philippine Peso (PHP) and include applicable taxes.</p>
      
      <h3 style="margin-top: 24px; color: #667eea; font-size: 18px;">Cancellation and Refund Policy</h3>
      <ul style="margin: 12px 0; padding-left: 20px;">
        <li><strong>7 days or more before arrival:</strong> Full refund</li>
        <li><strong>3-6 days before arrival:</strong> 50% refund</li>
        <li><strong>Less than 3 days before arrival:</strong> No refund</li>
        <li><strong>No-shows:</strong> Full amount charged, no refund</li>
      </ul>
      
      <h3 style="margin-top: 24px; color: #667eea; font-size: 18px;">Guest Responsibilities</h3>
      <ul style="margin: 12px 0; padding-left: 20px;">
        <li>Provide accurate information during booking and check-in</li>
        <li>Follow resort policies, safety guidelines, and local regulations</li>
        <li>Respect other guests, staff, and resort property</li>
        <li>Report any damages, safety concerns, or issues immediately</li>
      </ul>
      
      <p style="margin-top: 24px; font-size: 14px; color: #666; font-style: italic;">
        <strong>Note:</strong> For complete Terms & Conditions, please visit our 
        <a href="#/terms" style="color: #667eea; text-decoration: underline;" target="_blank">Terms & Conditions</a> page.
      </p>
    </div>
  `;

  window.__bookingTermsCache = fallbackTerms;
  termsInner.innerHTML = fallbackTerms;
}

// Reusable validation functions

// Validate contact number - must be exactly CONTACT_NUMBER_LENGTH digits
function validateContactNumber(value) {
  if (!value || typeof value !== 'string') {
    return { isValid: false, message: 'Contact number is required' };
  }
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length !== CONTACT_NUMBER_LENGTH) {
    return { 
      isValid: false, 
      message: `Contact number must be exactly ${CONTACT_NUMBER_LENGTH} digits` 
    };
  }
  return { isValid: true, message: '' };
}

// Generic capacity validation function - reusable for both rooms and cottages
function validateCapacity(adultsInput, childrenInput, capacity, capacityType, activeFieldId = null) {
  if (!adultsInput || !childrenInput) {
    return { isValid: true, message: '' };
  }
  
  const adults = parseInt(adultsInput.value || '0') || 0;
  const children = parseInt(childrenInput.value || '0') || 0;
  const totalGuests = adults + children;
  
  // Get field IDs (showFieldError adds '-error' suffix)
  const adultsId = adultsInput.id || adultsInput.name;
  const childrenId = childrenInput.id || childrenInput.name;
  
  if (totalGuests > capacity) {
    const errorMsg = `Total guests (${totalGuests}) exceeds ${capacityType} capacity of ${capacity}`;
    
    // Mark both fields with error class (visual indication)
    adultsInput.classList.add('error');
    childrenInput.classList.add('error');
    
    // Show error message on the active/focused field (the one currently being edited)
    if (activeFieldId === adultsId || document.activeElement === adultsInput) {
      // Show error on adults field (the one being edited)
      showFieldError(adultsId, errorMsg);
      clearFieldError(childrenId); // Clear from children to avoid duplication
    } else if (activeFieldId === childrenId || document.activeElement === childrenInput) {
      // Show error on children field (the one being edited)
      showFieldError(childrenId, errorMsg);
      clearFieldError(adultsId); // Clear from adults to avoid duplication
    } else {
      // Neither field is focused, show error on the field with higher value (most likely cause)
      if (adults > children) {
        showFieldError(adultsId, errorMsg);
        clearFieldError(childrenId);
      } else {
        showFieldError(childrenId, errorMsg);
        clearFieldError(adultsId);
      }
    }
    
    return { isValid: false, message: errorMsg };
  } else {
    // Clear errors from both fields
    clearFieldError(adultsId);
    clearFieldError(childrenId);
    adultsInput.classList.remove('error');
    childrenInput.classList.remove('error');
    
    return { isValid: true, message: '' };
  }
}

// Validate room capacity - returns validation result and sets errors
// activeFieldId: ID of the field currently being edited (prioritize error on this field)
function validateSingleRoomCapacity(adultsInput, childrenInput, activeFieldId = null) {
  return validateCapacity(adultsInput, childrenInput, ROOM_CAPACITY, 'room', activeFieldId);
}

// Validate cottage capacity - returns validation result and sets errors
// activeFieldId: ID of the field currently being edited (prioritize error on this field)
function validateSingleCottageCapacity(adultsInput, childrenInput, activeFieldId = null) {
  return validateCapacity(adultsInput, childrenInput, COTTAGE_CAPACITY, 'cottage', activeFieldId);
}

// Validate individual field
function validateField(field) {
  const value = field.value.trim();
  const fieldName = field.name;
  let isValid = true;
  let errorMessage = '';
  
  // Special handling for pre-filled readonly date fields
  if (field.hasAttribute('readonly') && 
      (fieldName === 'checkinDate' || fieldName === 'checkoutDate' || fieldName === 'cottageDate' || fieldName === 'eventDate') &&
      bookingFormState.preFillDates) {
    // Dates are pre-filled via state, skip validation if empty since they'll be populated via state
    const isRequired = field.hasAttribute('required') || field.getAttribute('data-required') === 'true';
    if (!value && isRequired) {
      console.warn(`Readonly date field ${fieldName} is required but empty. Checking state...`);
      console.log('bookingFormState.preFillDates:', bookingFormState.preFillDates);
      // Don't mark as invalid if preFillDates exists - the value will be used from state
      return true;
    }
  }
  
  // Required field validation (check both 'required' attribute and 'data-required' for date fields)
  const isRequired = field.hasAttribute('required') || field.getAttribute('data-required') === 'true';
  
  if (isRequired && !value) {
    // Skip validation for readonly date fields when preFillDates exists
    const isReadonlyDate = field.hasAttribute('readonly') && 
                           (fieldName === 'checkinDate' || fieldName === 'checkoutDate' || fieldName === 'cottageDate' || fieldName === 'eventDate') &&
                           bookingFormState.preFillDates;
    
    if (!isReadonlyDate) {
    isValid = false;
    errorMessage = 'This field is required';
    }
  }
  
  // Email validation
  if (fieldName === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      isValid = false;
      errorMessage = 'Please enter a valid email address';
    }
  }
  
  // Phone validation - use reusable function
  if (fieldName === 'contact') {
    const contactValidation = validateContactNumber(value);
    if (!contactValidation.isValid) {
      isValid = false;
      errorMessage = contactValidation.message;
    }
  }
  
  // Date validation
  if (field.type === 'date' && value) {
    const selectedDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      isValid = false;
      errorMessage = 'Date cannot be in the past';
    }
  }
  
  // Check-out date validation
  if (fieldName === 'checkoutDate' && value) {
    const checkinDate = document.getElementById('checkin-date')?.value;
    if (checkinDate && value <= checkinDate) {
      isValid = false;
      errorMessage = 'Check-out date must be after check-in date';
    }
  }
  
  // Time validation
  if (field.type === 'time' && value) {
    const startTime = document.getElementById('start-time')?.value;
    const endTime = document.getElementById('end-time')?.value;
    
    if (fieldName === 'endTime' && startTime && value <= startTime) {
      isValid = false;
      errorMessage = 'End time must be after start time';
    }
  }
  
  // Number validation
  if (field.type === 'number' && value) {
    const min = field.getAttribute('min');
    if (min && parseInt(value) < parseInt(min)) {
      isValid = false;
      errorMessage = `Value must be at least ${min}`;
    }
  }
  
  // Update field appearance and error message
  if (isValid) {
    field.classList.remove('error');
    clearFieldError(field);
  } else {
    field.classList.add('error');
    showFieldError(field, errorMessage);
  }
  
  return isValid;
}

// Show field error
function showFieldError(field, message) {
  // Handle both element and string field names
  let fieldId = typeof field === 'string' ? field : (field?.id || field?.name || 'unknown');
  
  // Convert name to ID format if using name (hyphens instead of camelCase)
  if (fieldId.includes('paymentMode') || fieldId.includes('checkinDate') || fieldId.includes('checkoutDate') || fieldId.includes('endTime') || fieldId.includes('startTime')) {
    // Convert camelCase to kebab-case
    fieldId = fieldId.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
  
  const errorElement = document.getElementById(`${fieldId}-error`);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    console.warn(`Validation error on ${fieldId}: ${message}`);
  } else {
    // Fallback: try to find element by name instead
    console.warn('Error element not found for field:', fieldId, 'Message:', message);
  }
}

// Clear field error
function clearFieldError(field) {
  // Handle both element and string field names
  let fieldId = typeof field === 'string' ? field : (field?.id || field?.name || 'unknown');
  
  // Convert name to ID format if using name (hyphens instead of camelCase)
  if (fieldId.includes('paymentMode') || fieldId.includes('checkinDate') || fieldId.includes('checkoutDate') || fieldId.includes('endTime') || fieldId.includes('startTime')) {
    // Convert camelCase to kebab-case
    fieldId = fieldId.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
  
  const errorElement = document.getElementById(`${fieldId}-error`);
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.style.display = 'none';
  }
  
  if (field && field.classList) {
  field.classList.remove('error');
  }
}

// Validate entire form
function validateForm() {
  let isValid = true;
  console.log('=== Form Validation Details ===');
  console.log('Reservation type:', bookingFormState.reservationType);
  
  // Validate all input fields
  document.querySelectorAll('.form-input, .form-select').forEach(field => {
    const fieldValid = validateField(field);
    if (!fieldValid) {
      console.error(`Validation failed for field: ${field.id || field.name}`, 
                   `Value: "${field.value}", Required: ${field.required || 'N/A'}`);
      isValid = false;
    } else {
      console.log(`Validation passed: ${field.id || field.name}`);
    }
  });
  
  // Validate checkboxes/radio buttons
  if (bookingFormState.reservationType === 'room') {
    // If rooms selected from flow, validate per-room guest counts against capacity
    if (bookingFormState.selectedRoomsFromFlow?.length > 0) {
      console.log('Rooms pre-selected from flow:', bookingFormState.selectedRoomsFromFlow);
      
      // Validate each room's guest count using reusable function
      bookingFormState.selectedRoomsFromFlow.forEach(roomId => {
        const adultsInput = document.getElementById(`${roomId}-adults`);
        const childrenInput = document.getElementById(`${roomId}-children`);
        
        if (adultsInput && childrenInput) {
          const result = validateSingleRoomCapacity(adultsInput, childrenInput, roomId);
          if (!result.isValid) {
            isValid = false;
          }
        }
      });
      
      // Also check the default adults/children inputs if no per-room inputs (edge case)
      if (bookingFormState.selectedRoomsFromFlow.length === 0) {
        const adultsInput = document.getElementById('adults');
        const childrenInput = document.getElementById('children');
        if (adultsInput && childrenInput) {
          const result = validateSingleRoomCapacity(adultsInput, childrenInput);
          if (!result.isValid) {
            isValid = false;
          }
        }
      }
    } else {
      const selectedRooms = document.querySelectorAll('input[name="selectedRooms"]:checked');
      const numRooms = parseInt(document.getElementById('num-rooms')?.value || '1');
      
      console.log(`Room validation: ${selectedRooms.length} selected, ${numRooms} expected`);
    
      if (selectedRooms.length !== numRooms) {
        isValid = false;
        const numRoomsField = document.getElementById('num-rooms');
        if (numRoomsField) {
          showFieldError('num-rooms', `Please select exactly ${numRooms} room${numRooms > 1 ? 's' : ''}`);
        }
      }
      
      // Validate default room guest count using reusable function
      const adultsInput = document.getElementById('adults');
      const childrenInput = document.getElementById('children');
      if (adultsInput && childrenInput) {
        const result = validateSingleRoomCapacity(adultsInput, childrenInput);
        if (!result.isValid) {
          isValid = false;
        }
      }
    }
  }
  
  if (bookingFormState.reservationType === 'cottage') {
    // Require at least one cottage selected via items manager
    // Check selectedCottagesFromFlow (primary) - matches submission logic
    // Fallback to bookingState.selectedCottages for edit mode compatibility
    const selectedCottages = bookingFormState.selectedCottagesFromFlow || bookingState.selectedCottages || [];
    if (!selectedCottages.length) {
      isValid = false;
      showFieldError('cottage-date', 'Select a cottage type via Add/Remove Items');
    }
    
    // Validate cottage capacity using reusable function
    const adultsEl = document.getElementById('cottage-adults');
    const childrenEl = document.getElementById('cottage-children');
    if (adultsEl && childrenEl) {
      const totalGuests = (parseInt(adultsEl.value || '0') || 0) + (parseInt(childrenEl.value || '0') || 0);
      if (totalGuests < 1) {
        isValid = false;
        showFieldError('cottage-adults', 'At least one guest is required');
      } else {
        const result = validateSingleCottageCapacity(adultsEl, childrenEl);
        if (!result.isValid) {
          isValid = false;
        }
      }
    }
  }
  
  if (bookingFormState.reservationType === 'function-hall') {
    // Validate event name
    const eventName = document.getElementById('event-name');
    if (!eventName?.value?.trim()) {
      isValid = false;
      showFieldError('event-name', 'Event name is required');
    }
    
    // Validate event date
    const eventDate = document.getElementById('event-date');
    if (!eventDate?.value) {
      isValid = false;
      showFieldError('event-date', 'Event date is required');
    }
    
    // Validate event time range
    const eventStart = document.getElementById('event-start');
    const eventEnd = document.getElementById('event-end');
    if (!eventStart?.value) {
      isValid = false;
      showFieldError('event-start', 'Start time is required');
    }
    if (!eventEnd?.value) {
      isValid = false;
      showFieldError('event-end', 'End time is required');
    }
    if (eventStart?.value && eventEnd?.value && eventEnd.value <= eventStart.value) {
      isValid = false;
      showFieldError('event-end', 'End time must be after start time');
    }
    
    // Validate event type
    const eventType = document.getElementById('event-type');
    if (!eventType?.value) {
      isValid = false;
      showFieldError('event-type', 'Event type is required');
    }
    
    // Validate setup type
    const setupType = document.getElementById('setup-type');
    if (!setupType?.value) {
      isValid = false;
      showFieldError('setup-type', 'Setup type is required');
    }
    
    // Validate guest count
    const eventGuests = document.getElementById('event-guests');
    if (!eventGuests?.value || parseInt(eventGuests.value) < 1) {
      isValid = false;
      showFieldError('event-guests', 'Number of guests must be at least 1');
    } else {
      const result = validateFunctionHallGuests();
      // Only block submission if exceeds maximum (150), warnings are acceptable
      if (!result.isValid) {
        isValid = false;
      }
    }
    
    // Validate hall selection (should be set from flow)
    if (!bookingFormState.preFillDates?.hallId && !window.selectedHallId) {
      isValid = false;
      alert('Please select a function hall before continuing');
    }
  }
  
  // Validate agreement checkbox (skip in edit mode - already agreed during initial booking)
  if (!bookingFormState.editMode) {
    const agreement = document.getElementById('agreement');
    if (!agreement?.checked) {
      isValid = false;
      showFieldError('agreement', 'You must agree to the booking policy');
    }
  }
  
  return isValid;
}

// Save booking to API (mock or real)
async function saveBooking(bookingData) {
  console.log('[Booking] saveBooking called with:', bookingData);
  
  try {
    // Calculate total cost
    console.log('[saveBooking] Starting cost calculation for booking type:', bookingFormState.reservationType);
    const costs = calculateTotalCost();
    const totalCost = costs ? costs.total : 0;
    console.log('[saveBooking] Cost calculation result:', costs);
    console.log('[saveBooking] Total cost extracted:', totalCost);
    
    if (totalCost === 0 && bookingFormState.reservationType === 'function-hall') {
      console.warn('[saveBooking] ⚠️ Function hall booking has zero cost! Check hall selection and calculation.');
    }

    // Map reservationType to category for backend storage
    const categoryMap = {
      'room': 'rooms',
      'cottage': 'cottages',
      'function-hall': 'function-halls'
    };
    const category = categoryMap[bookingFormState.reservationType] || 'rooms';
    
    // Get correct package ID based on category
    const { getPackageIdByCategory } = await import('../utils/packageMapping.js');
    const packageId = getPackageIdByCategory(category);
    console.log('[Booking] Determined packageId:', { category, packageId, reservationType: bookingFormState.reservationType });
    
    // Prepare booking payload
    const bookingPayload = {
      packageId: packageId,
      checkIn: bookingData.dates.checkin || bookingData.dates.eventDate || bookingData.dates.date,
      checkOut: bookingData.dates.checkout || bookingData.dates.eventDate || bookingData.dates.date,
      guests: bookingData.guests, // Send the full guests object with adults/children
      totalCost: totalCost,
      paymentMode: bookingData.payment,
      perRoomGuests: bookingData.perRoomGuests || [],
      contactNumber: bookingData.guestInfo.contact,
      specialRequests: bookingData.selections.specialRequests || '',
      selectedCottages: category === 'cottages' ? (bookingFormState.selectedCottagesFromFlow || bookingData.selections?.cottages || []) : (bookingState.selectedCottages || []),
      selectedHall: null, // Function hall selection removed from modal
      category: category, // Store category in booking record
      cottageDates: bookingData.dates.cottageDates || [] // Array of individual dates for cottage rentals
    };
    if (category === 'cottages') {
      bookingPayload.usage_date = bookingData.dates.usage_date || bookingData.dates.date;
      bookingPayload.duration_type = bookingData.dates.duration_type || bookingData.dates.durationType;
      if (bookingData.dates.startTime) bookingPayload.start_time = bookingData.dates.startTime;
      if (bookingData.dates.endTime) bookingPayload.end_time = bookingData.dates.endTime;
    }
    
    if (category === 'function-halls') {
      bookingPayload.hallId = bookingData.selections?.hallId;
      bookingPayload.hallName = bookingData.selections?.hallName;
      bookingPayload.eventName = bookingData.selections?.eventName;
      bookingPayload.eventType = bookingData.selections?.eventType;
      bookingPayload.setupType = bookingData.selections?.setupType;
      bookingPayload.decorationTheme = bookingData.selections?.decorationTheme;
      bookingPayload.organization = bookingData.selections?.organization;
      bookingPayload.soundSystemRequired = bookingData.selections?.soundSystemRequired || false;
      bookingPayload.projectorRequired = bookingData.selections?.projectorRequired || false;
      bookingPayload.cateringRequired = bookingData.selections?.cateringRequired || false;
      bookingPayload.equipmentAddons = bookingData.selections?.equipmentAddons || [];
      bookingPayload.startTime = bookingData.dates?.startTime;
      bookingPayload.endTime = bookingData.dates?.endTime;
      bookingPayload.selectedHall = bookingData.selections?.hallId; // Keep for backward compatibility
    }
    
    // Preview payload shapes per category (UI step only)
    if (category === 'cottages') {
      const preview = {
        category: 'cottages',
        visit_date: bookingData.dates.usage_date || bookingData.dates.date,
        selected_cottages: bookingData.selections?.cottages || [],
        adults: Number(bookingData.guests?.adults || 0),
        children: Number(bookingData.guests?.children || 0),
        guest_info: bookingData.guestInfo,
        payment_mode: bookingData.payment,
        special_requests: bookingData.selections?.specialRequests || bookingData.specialRequests || '',
        agreement: bookingData.agreement === true
      };
      console.log('[UI Preview] Cottage payload shape:', preview);
    } else if (category === 'function-halls') {
      const preview = {
        category: 'function-hall',
        hall_id: bookingData.selections?.hallId,
        hall_name: bookingData.selections?.hallName,
        event_name: bookingData.selections?.eventName,
        event_type: bookingData.selections?.eventType,
        event_date: bookingData.dates?.eventDate,
        start_time: bookingData.dates?.startTime,
        end_time: bookingData.dates?.endTime,
        setup_type: bookingData.selections?.setupType,
        decoration_theme: bookingData.selections?.decorationTheme,
        organization: bookingData.selections?.organization,
        guest_count: Number((bookingData.guests?.adults || 0) + (bookingData.guests?.children || 0) || bookingData.guests?.total || 0),
        sound_system_required: bookingData.selections?.soundSystemRequired || false,
        projector_required: bookingData.selections?.projectorRequired || false,
        catering_required: bookingData.selections?.cateringRequired || false,
        equipment_addons: bookingData.selections?.equipmentAddons || [],
        special_requests: bookingData.selections?.specialRequests || '',
        guest_info: bookingData.guestInfo,
        payment_mode: bookingData.payment,
        agreement: bookingData.agreement === true
      };
      console.log('[UI Preview] Function Hall payload shape:', preview);
    }
    console.log('[Booking] Booking payload:', JSON.stringify(bookingPayload, null, 2));

    // Use service abstraction
    const { createBooking } = await import('../services/bookingsService.js');
    const created = await createBooking(bookingPayload);
    return created;
  } catch (error) {
    console.error('[Booking] Save booking error:', error);
    console.error('[Booking] Error stack:', error.stack);
    
    // Provide user-friendly error message
    if (error.message.includes('backend server') || error.message === 'Failed to fetch') {
      throw new Error('Backend server is not running. Please start the server with "npm start" in the server directory and try again.');
    }
    
    throw error;
  }
}

// Update existing booking
async function updateExistingBooking(bookingId, bookingData) {
  console.log('[BookingModal] updateExistingBooking called');
  console.log('[BookingModal] Update parameters:', { bookingId, bookingData });
  
  try {
    const costs = calculateTotalCost();
    const totalCost = costs ? costs.total : 0;
    console.log('[Booking] Calculated total cost:', totalCost);

    // Map reservationType to category for backend storage
    const categoryMap = {
      'room': 'rooms',
      'cottage': 'cottages',
      'function-hall': 'function-halls'
    };
    const category = categoryMap[bookingFormState.reservationType] || 'rooms';
    
    // Get correct package ID based on category
    const { getPackageIdByCategory } = await import('../utils/packageMapping.js');
    const packageId = getPackageIdByCategory(category);
    console.log('[Booking] Determined packageId for update:', { category, packageId, reservationType: bookingFormState.reservationType });
    
    const bookingPayload = {
      packageId: packageId,
      checkIn: bookingData.dates.checkin || bookingData.dates.eventDate || bookingData.dates.date,
      checkOut: bookingData.dates.checkout || bookingData.dates.eventDate || bookingData.dates.date,
      guests: bookingData.guests,
      totalCost: totalCost,
      paymentMode: bookingData.payment,
      perRoomGuests: bookingData.perRoomGuests || [],
      contactNumber: bookingData.guestInfo.contact,
      specialRequests: bookingData.selections.specialRequests || '',
      selectedCottages: bookingState.selectedCottages || [],
      selectedHall: null, // Function hall selection removed from modal
      category: category, // Store category in booking record
      cottageDates: bookingData.dates.cottageDates || [] // Array of individual dates for cottage rentals
    };
    if (category === 'cottages') {
      bookingPayload.usage_date = bookingData.dates.usage_date || bookingData.dates.date;
      bookingPayload.duration_type = bookingData.dates.duration_type || bookingData.dates.durationType;
      if (bookingData.dates.startTime) bookingPayload.start_time = bookingData.dates.startTime;
      if (bookingData.dates.endTime) bookingPayload.end_time = bookingData.dates.endTime;
    }
    
    if (category === 'function-halls') {
      bookingPayload.hallId = bookingData.selections?.hallId;
      bookingPayload.hallName = bookingData.selections?.hallName;
      bookingPayload.eventName = bookingData.selections?.eventName;
      bookingPayload.eventType = bookingData.selections?.eventType;
      bookingPayload.setupType = bookingData.selections?.setupType;
      bookingPayload.decorationTheme = bookingData.selections?.decorationTheme;
      bookingPayload.organization = bookingData.selections?.organization;
      bookingPayload.soundSystemRequired = bookingData.selections?.soundSystemRequired || false;
      bookingPayload.projectorRequired = bookingData.selections?.projectorRequired || false;
      bookingPayload.cateringRequired = bookingData.selections?.cateringRequired || false;
      bookingPayload.equipmentAddons = bookingData.selections?.equipmentAddons || [];
      bookingPayload.startTime = bookingData.dates?.startTime;
      bookingPayload.endTime = bookingData.dates?.endTime;
      bookingPayload.selectedHall = bookingData.selections?.hallId; // Keep for backward compatibility
    }
    
    console.log('[Booking] Update payload:', JSON.stringify(bookingPayload, null, 2));
    
    // Debug: Verify cottage dates are included in update
    if (bookingPayload.cottageDates && bookingPayload.cottageDates.length > 0) {
      console.log('[Booking] 🏠 Update includes cottage dates:', bookingPayload.cottageDates);
    } else {
      console.log('[Booking] ⚠️ Update does NOT include cottage dates');
    }

    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const useMockApi = !isProduction;
    
    console.log('[Booking] Updating via', useMockApi ? 'mock' : 'real', 'API');

    const { updateBooking } = await import('../services/bookingsService.js');
    const result = await updateBooking(bookingId, bookingPayload);
    
    console.log('[Booking] Update response:', result);
    return result;
  } catch (error) {
    console.error('[Booking] Update booking error:', error);
    throw error;
  }
}

// Helper functions to extract booking information
function getPackageName(bookingData) {
  if (bookingData.reservationType === 'room') {
    return bookingData.selections.rooms.join(', ') || 'Room Booking';
  } else if (bookingData.reservationType === 'cottage') {
    return bookingData.selections.cottages.join(', ') || 'Cottage Booking';
  } else if (bookingData.reservationType === 'function-hall') {
    return bookingData.selections.hall || 'Function Hall Booking';
  }
  return 'Booking';
}

function getCheckInDate(bookingData) {
  if (bookingData.reservationType === 'room') {
    return bookingData.dates.checkin;
  } else if (bookingData.reservationType === 'cottage') {
    return bookingData.dates.date;
  } else if (bookingData.reservationType === 'function-hall') {
    return bookingData.dates.eventDate;
  }
  return new Date().toISOString().split('T')[0];
}

function getCheckOutDate(bookingData) {
  if (bookingData.reservationType === 'room') {
    return bookingData.dates.checkout;
  } else if (bookingData.reservationType === 'cottage') {
    return bookingData.dates.date; // Same day for cottage
  } else if (bookingData.reservationType === 'function-hall') {
    return bookingData.dates.eventDate; // Same day for function hall
  }
  return new Date().toISOString().split('T')[0];
}

function getTotalGuests(bookingData) {
  if (bookingData.reservationType === 'room') {
    return parseInt(bookingData.guests.adults) + parseInt(bookingData.guests.children);
  } else if (bookingData.reservationType === 'cottage') {
    return parseInt(bookingData.guests.adults) + parseInt(bookingData.guests.children);
  } else if (bookingData.reservationType === 'function-hall') {
    // Use adults + children (backward compatible with old total format)
    const adults = parseInt(bookingData.guests?.adults || 0);
    const children = parseInt(bookingData.guests?.children || 0);
    const total = parseInt(bookingData.guests?.total || 0);
    // Prefer adults+children, fallback to total for backward compatibility
    return adults + children > 0 ? adults + children : total;
  }
  return 1;
}

// Submit booking form
window.submitBooking = async function(event) {
  event.preventDefault();
  
  console.log('=== Booking Submission Started ===');
  console.log('Form validation starting...');
  
  if (!validateForm()) {
    console.error('Form validation failed');
    // Scroll to first error
    const firstError = document.querySelector('.form-input.error, .form-select.error');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  
  console.log('Form validation passed');
  console.log('Collecting form data...');
  
  // Collect form data
  const formData = new FormData(event.target);
  const bookingData = {
    reservationType: bookingFormState.reservationType,
    guestInfo: {
      name: formData.get('guestName'),
      email: formData.get('email'),
      contact: formData.get('contact')
    },
    dates: {},
    guests: {},
    selections: {},
    payment: formData.get('paymentMode'),
    agreement: formData.get('agreement') === 'on'
  };
  
  // Add type-specific data
  if (bookingFormState.reservationType === 'room') {
    // Use pre-filled dates if available (from date-first flow), otherwise from form
    const checkIn = bookingFormState.preFillDates?.checkin || formData.get('checkinDate');
    const checkOut = bookingFormState.preFillDates?.checkout || formData.get('checkoutDate');
    
    bookingData.dates = {
      checkin: checkIn,
      checkout: checkOut,
      nights: document.getElementById('nights-display')?.textContent || '0'
    };
    
    // Calculate total guests from per-room guests (or use main guests field if no per-room data)
    let totalAdults = 0;
    let totalChildren = 0;
    
    if (bookingFormState.selectedRoomsFromFlow?.length > 0) {
      // Calculate from per-room guests
      bookingFormState.selectedRoomsFromFlow.forEach(roomId => {
        const adultsInput = document.getElementById(`${roomId}-adults`);
        const childrenInput = document.getElementById(`${roomId}-children`);
        totalAdults += parseInt(adultsInput?.value || 0);
        totalChildren += parseInt(childrenInput?.value || 0);
      });
    } else {
      // Fallback to main form fields
      totalAdults = parseInt(formData.get('adults') || 0);
      totalChildren = parseInt(formData.get('children') || 0);
    }
    
    bookingData.guests = {
      adults: totalAdults,
      children: totalChildren
    };
    // Get selected rooms from flow or form
    const selectedRooms = bookingFormState.selectedRoomsFromFlow || Array.from(formData.getAll('selectedRooms'));
    
    bookingData.selections = {
      rooms: selectedRooms,
      cottages: bookingFormState.addCottageToRoom ? (bookingState.selectedCottages || []) : []
    };
    
    console.log('[Booking] 🏠 Cottage selection:', {
      addCottageToRoom: bookingFormState.addCottageToRoom,
      selectedCottages: bookingState.selectedCottages,
      cottageDates: bookingFormState.cottageDates
    });
    
    // Add cottage dates if cottages were selected for room booking
    // Include whenever cottageDates exist, regardless of addCottageToRoom flag
    if (bookingFormState.cottageDates && bookingFormState.cottageDates.length > 0 && bookingState.selectedCottages && bookingState.selectedCottages.length > 0) {
      bookingData.dates.cottageDates = bookingFormState.cottageDates; // Array of individual dates
      console.log('[Booking] Including cottage dates:', bookingFormState.cottageDates);
    } else if (bookingState.selectedCottages && bookingState.selectedCottages.length > 0 && (!bookingFormState.cottageDates || bookingFormState.cottageDates.length === 0)) {
      console.warn('[Booking] ⚠️ Cottages selected but no cottage dates - will use booking date range');
    }
    
    // Collect per-room guest details
    const perRoomGuests = [];
    if (bookingFormState.selectedRoomsFromFlow?.length > 0) {
      // Date-first flow: Use per-room guest inputs
      bookingFormState.selectedRoomsFromFlow.forEach(roomId => {
        const guestNameInput = document.getElementById(`${roomId}-guest-name`);
        const adultsInput = document.getElementById(`${roomId}-adults`);
        const childrenInput = document.getElementById(`${roomId}-children`);
        
        perRoomGuests.push({
          roomId: roomId,
          guestName: guestNameInput?.value || bookingData.guestInfo.name, // Default to main booker
          adults: parseInt(adultsInput?.value || 1),
          children: parseInt(childrenInput?.value || 0)
        });
      });
    } else if (selectedRooms.length > 0) {
      // Modal-first flow: Create per-room data from selected rooms using main guest counts
      const mainAdults = parseInt(formData.get('adults') || 1);
      const mainChildren = parseInt(formData.get('children') || 0);
      
      selectedRooms.forEach(roomId => {
        perRoomGuests.push({
          roomId: roomId,
          guestName: bookingData.guestInfo.name, // Use main booker
          adults: mainAdults,
          children: mainChildren
        });
      });
      
      console.log('[Booking] Created per-room guests from modal selection:', perRoomGuests);
    }
    
    // Add to booking data
    if (perRoomGuests.length > 0) {
      bookingData.perRoomGuests = perRoomGuests;
    } else {
      console.warn('[Booking] ⚠️ No rooms selected - booking will have no booking_items!');
    }
  } else if (bookingFormState.reservationType === 'cottage') {
    // Use pre-filled date if available (from date-first flow), otherwise from form
    const visitDate = bookingFormState.preFillDates?.date || formData.get('cottageDate');
    
    bookingData.dates = {
      date: visitDate,
      usage_date: visitDate
    };
    bookingData.guests = {
      adults: parseInt(formData.get('cottageAdults') || 1),
      children: parseInt(formData.get('cottageChildren') || 0)
    };
    // Use selected cottages from flow (selectedCottagesFromFlow)
    const cottagesArray = bookingFormState.selectedCottagesFromFlow || [];
    bookingData.selections = {
      cottages: cottagesArray,
      rooms: bookingFormState.addRoomToCottage ? Array.from(formData.getAll('selectedRooms')) : []
    };
    
    if (bookingFormState.addRoomToCottage) {
      bookingData.dates.roomCheckin = formData.get('roomCheckin');
      bookingData.dates.roomCheckout = formData.get('roomCheckout');
    }
  } else if (bookingFormState.reservationType === 'function-hall') {
    bookingData.dates = {
      eventDate: formData.get('eventDate'),
      startTime: formData.get('eventStart'),
      endTime: formData.get('eventEnd')
    };
    bookingData.selections = {
      hallId: bookingFormState.preFillDates?.hallId || window.selectedHallId,
      hallName: bookingFormState.preFillDates?.hallName || window.selectedHallId,
      eventName: formData.get('eventName'),
      eventType: formData.get('eventType'),
      setupType: formData.get('setupType'),
      decorationTheme: formData.get('decorationTheme'),
      organization: formData.get('organization'),
      soundSystemRequired: document.getElementById('sound-system')?.checked || false,
      projectorRequired: document.getElementById('projector')?.checked || false,
      cateringRequired: document.getElementById('catering-required')?.checked || false,
      equipmentAddons: Array.from(formData.getAll('equipmentAddons')),
      specialRequests: formData.get('specialRequests')
    };
    // Convert function hall guest count to standard adults/children format
    // Function halls use a single guest count input, map it to adults (children = 0)
    const eventGuestCount = parseInt(formData.get('eventGuests') || 0);
    bookingData.guests = {
      adults: eventGuestCount,
      children: 0
    };
  }
  
  // Save booking to API
  console.log('=== Attempting to save booking ===');
  console.log('Booking data:', JSON.stringify(bookingData, null, 2));
  
  try {
    // Validate availability before saving
    if (bookingFormState.reservationType === 'room') {
      const checkIn = bookingData.dates.checkin;
      const checkOut = bookingData.dates.checkout;
      const selectedRooms = bookingData.selections.rooms || [];
      
      console.log('[Booking] Validating availability before save:', { checkIn, checkOut, selectedRooms, editMode: bookingFormState.editMode });
      
      if (checkIn && checkOut && selectedRooms.length > 0) {
        const { checkAvailability } = await import('../utils/api.js');
        const category = 'rooms'; // For room bookings
        // Exclude current booking from conflict checks if in edit mode
        const excludeBookingId = bookingFormState.editMode && bookingFormState.bookingId 
          ? bookingFormState.bookingId 
          : null;
        const result = await checkAvailability(1, checkIn, checkOut, category, excludeBookingId);
        
        console.log('[Booking] Availability check result:', result);
        
        // Check availability: For each selected room, verify it's available on ALL dates in the range
        if (result && result.dateAvailability && selectedRooms.length > 0) {
          const unavailableRooms = [];
          const dateAvailabilityMap = result.dateAvailability;
          
          // Filter dates to only include dates within the booking range (checkout is exclusive)
          const checkInDate = new Date(checkIn);
          const checkOutDate = new Date(checkOut);
          checkInDate.setHours(0, 0, 0, 0);
          checkOutDate.setHours(0, 0, 0, 0);
          
          // Get only dates within the booking range (exclusive of checkout date)
          const datesInRange = Object.keys(dateAvailabilityMap).filter(dateString => {
            const date = new Date(dateString);
            date.setHours(0, 0, 0, 0);
            return date >= checkInDate && date < checkOutDate; // Checkout exclusive
          });
          
          console.log('[Booking] Availability validation:', {
            checkIn,
            checkOut,
            selectedRooms,
            datesInRange,
            totalDatesInAvailability: Object.keys(dateAvailabilityMap).length,
            dateAvailabilityKeys: Object.keys(dateAvailabilityMap)
          });
          
          // For each selected room, check if it's available on every date in the range
          selectedRooms.forEach(selectedRoom => {
            const unavailableDates = [];
            
            // Normalize selected room name for comparison
            const normalizedSelectedRoom = String(selectedRoom).trim();
            
            // Check availability of this room on each date IN THE RANGE
            datesInRange.forEach(dateString => {
              const dayData = dateAvailabilityMap[dateString];
              if (!dayData) {
                console.warn(`[Booking] No availability data for date ${dateString}`);
                unavailableDates.push(dateString);
                return;
              }
              
              const availableRooms = dayData.availableRooms || [];
              
              // Normalize available rooms for comparison
              const normalizedAvailableRooms = availableRooms.map(room => String(room).trim());
              
              // If this selected room is NOT in the available rooms list for this date, it's unavailable
              const isAvailable = normalizedAvailableRooms.includes(normalizedSelectedRoom);
              
              if (!isAvailable) {
                unavailableDates.push(dateString);
                console.log(`[Booking] Room ${normalizedSelectedRoom} unavailable on ${dateString}:`, {
                  availableRooms: normalizedAvailableRooms,
                  selectedRoom: normalizedSelectedRoom
                });
              }
            });
            
            // If this room is unavailable on any date, record it
            if (unavailableDates.length > 0) {
              unavailableRooms.push({
                room: selectedRoom,
                unavailableDates: unavailableDates
              });
            }
          });
          
          // If any selected rooms are unavailable, fail the validation
          if (unavailableRooms.length > 0) {
            console.error('[Booking] Availability check failed: Some rooms are not available on all dates:', unavailableRooms);
            
            // Build detailed error message
            const roomMessages = unavailableRooms.map(({ room, unavailableDates }) => {
              const datesList = unavailableDates.join(', ');
              return `${room} is not available on: ${datesList}`;
            });
            
            const errorMessage = `Selected rooms are not available for all dates:\n${roomMessages.join('\n')}\n\nPlease choose different dates or rooms.`;
            
            const { showToast } = await import('./toast.js');
            showToast(errorMessage, 'error');
            return;
          }
          
          console.log('[Booking] ✓ All selected rooms are available on all dates');
        } else if (result && result.available === false) {
          console.error('[Booking] Availability check failed: Overall availability is false');
          const { showToast } = await import('./toast.js');
          showToast('No rooms available for the selected dates. Please choose different dates.', 'error');
          return;
        }
      }
    }
    // Validate availability for function halls (single-day)
    if (bookingFormState.reservationType === 'function-hall') {
      const eventDate = bookingData.dates.eventDate;
      const hallId = bookingData.selections.hallId || bookingData.selections.hallName;
      if (eventDate && hallId) {
        const { checkAvailability } = await import('../utils/api.js');
        const excludeBookingId = bookingFormState.editMode && bookingFormState.bookingId ? bookingFormState.bookingId : null;
        const result = await checkAvailability(1, eventDate, eventDate, 'function-halls', excludeBookingId);
        const availableHalls = result?.dateAvailability?.[eventDate]?.availableHalls
          || result?.availableHalls
          || result?.availableItems
          || [];
        if (!Array.isArray(availableHalls) || !availableHalls.includes(hallId)) {
          const { showToast } = await import('./toast.js');
          showToast(`Selected hall is not available on ${eventDate}. Please choose a different date or hall.`, 'error');
          return;
        }
      }
    }
    
    // Also check availability for cottage bookings (mirrors room validation logic)
    if (bookingFormState.reservationType === 'cottage') {
      const visitDate = bookingData.dates.date; // Single date for cottage
      const selectedCottages = bookingFormState.selectedCottagesFromFlow || bookingData.selections.cottages || [];
      
      console.log('[Booking] Validating cottage availability before save:', { visitDate, selectedCottages, editMode: bookingFormState.editMode });
      
      if (visitDate && selectedCottages.length > 0) {
        const { checkAvailability } = await import('../utils/api.js');
        const category = 'cottages';
        // Exclude current booking from conflict checks if in edit mode
        const excludeBookingId = bookingFormState.editMode && bookingFormState.bookingId 
          ? bookingFormState.bookingId 
          : null;
        // For single day, use the same date for check-in and check-out
        const result = await checkAvailability(1, visitDate, visitDate, category, excludeBookingId);
        
        console.log('[Booking] Cottage availability check result:', result);
        
        // Check availability: For each selected cottage, verify it's available on the date
        if (result && result.dateAvailability && selectedCottages.length > 0) {
          const unavailableCottages = [];
          const dateAvailabilityMap = result.dateAvailability;
          
          // For each selected cottage, check if it's available on the visit date
          selectedCottages.forEach(selectedCottage => {
            if (dateAvailabilityMap[visitDate]) {
              const availableCottages = dateAvailabilityMap[visitDate].availableCottages || [];
              
              // If this selected cottage is NOT in the available cottages list, it's unavailable
              if (!availableCottages.includes(selectedCottage)) {
                unavailableCottages.push(selectedCottage);
              }
            }
          });
          
          // If any selected cottages are unavailable, fail the validation
          if (unavailableCottages.length > 0) {
            console.error('[Booking] Availability check failed: Some cottages are not available:', unavailableCottages);
            
            // Build detailed error message
            const cottageList = unavailableCottages.join(', ');
            const errorMessage = `❌ Booking Conflict\n\nThe following cottages are not available on ${visitDate}:\n${cottageList}\n\nPlease select different cottages or choose another date.`;
            
            const { showToast } = await import('./toast.js');
            showToast(errorMessage, 'error');
            return;
          }
          
          console.log('[Booking] ✓ All selected cottages are available on the visit date');
        } else if (result && result.available === false) {
          console.error('[Booking] Cottage availability check failed: Overall availability is false');
          const { showToast } = await import('./toast.js');
          showToast('No cottages available for the selected date. Please choose a different date.', 'error');
          return;
        }
      }
    }
    
    if (bookingFormState.editMode && bookingFormState.bookingId) {
      console.log('Updating existing booking...');
      const updatedBooking = await updateExistingBooking(bookingFormState.bookingId, bookingData);
      console.log('Booking updated successfully:', updatedBooking);
      
      // Clear calendar cache
      if (window.clearCalendarCache) {
        window.clearCalendarCache();
      }
      
      // Use toast notification
      const { showToast } = await import('./toast.js');
      showToast('Booking updated successfully!', 'success');
      
      closeBookingModal();
      // Reload bookings page
      location.reload();
    } else {
      console.log('Calling saveBooking...');
      const savedBooking = await saveBooking(bookingData);
      console.log('[Booking] Created booking with ID:', savedBooking?.id);
      console.log('Booking saved successfully:', savedBooking);
      
      // Trigger refresh of bookings list if available
      if (typeof window.refreshBookingsList === 'function') {
        console.log('[Booking] Refreshing bookings list...');
        await window.refreshBookingsList();
      } else {
        console.log('[Booking] refreshBookingsList not available, will refresh on next page load');
      }
      
      // Clear calendar cache to ensure availability updates
      if (window.clearCalendarCache) {
        console.log('[Booking] Clearing calendar cache after successful booking...');
        window.clearCalendarCache();
      }
      
      showBookingSuccess(bookingData, savedBooking);
      console.log('=== Booking Submission Complete ===');
    }
  } catch (error) {
    console.error('Failed to save booking:', error);
    console.error('Error details:', error.message);
    alert(`Failed to complete booking: ${error.message}\n\nPlease try again or contact support.`);
    return;
  }
}

// Show booking success
function showBookingSuccess(bookingData, savedBooking) {
  console.log('[showBookingSuccess] Starting success modal display');
  console.log('[showBookingSuccess] Booking data:', JSON.stringify(bookingData, null, 2));
  console.log('[showBookingSuccess] Saved booking:', JSON.stringify(savedBooking, null, 2));
  console.log('[showBookingSuccess] Reservation type:', bookingData.reservationType);
  console.log('[showBookingSuccess] Guests data:', bookingData.guests);
  
  const packageName = bookingData.reservationType === 'room' ? 'Standard Room' : 
                      bookingData.reservationType === 'cottage' ? 'Cottage' : 'Function Hall';
  
  // Extract selected rooms and cottages
  const selectedRooms = bookingData.selections.rooms || [];
  // Use bookingState for cottages since it's managed there
  const selectedCottages = bookingState.selectedCottages || bookingData.selections.cottages || [];
  
  // Build rooms list
  let roomsList = '';
  if (selectedRooms.length > 0) {
    roomsList = `
      <div class="success-section">
        <h4>Selected Rooms</h4>
        <ul class="booking-items-list">
          ${selectedRooms.map(roomId => {
            const roomGuest = bookingData.perRoomGuests?.find(rg => rg.roomId === roomId);
            return `
              <li>
                <strong>${roomId}</strong>
                ${roomGuest ? `<br><small>Guest: ${roomGuest.guestName}, Adults: ${roomGuest.adults}, Children: ${roomGuest.children}</small>` : ''}
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
  }
  
  // Build cottages list
  let cottagesList = '';
  // Build function hall details
  let functionHallDetails = '';
  if (bookingData.reservationType === 'function-hall') {
    const fh = bookingData.selections || {};
    functionHallDetails = `
      <div class="success-section">
        <h4>Function Hall Details</h4>
        <ul class="booking-items-list">
          <li><strong>Hall:</strong> ${fh.hallName || fh.hallId || 'N/A'}</li>
          <li><strong>Date:</strong> ${bookingData.dates.eventDate || 'N/A'}</li>
          <li><strong>Time:</strong> ${(bookingData.dates.startTime || '') && (bookingData.dates.endTime || '') ? `${bookingData.dates.startTime} - ${bookingData.dates.endTime}` : 'N/A'}</li>
          <li><strong>Guests:</strong> ${(bookingData.guests?.adults || 0) + (bookingData.guests?.children || 0) || bookingData.guests?.total || 'N/A'}</li>
          <li><strong>Event:</strong> ${fh.eventName || 'N/A'} (${fh.eventType || 'type N/A'})</li>
          <li><strong>Setup:</strong> ${fh.setupType || 'N/A'}</li>
          ${fh.decorationTheme ? `<li><strong>Theme:</strong> ${fh.decorationTheme}</li>` : ''}
          ${fh.organization ? `<li><strong>Organization:</strong> ${fh.organization}</li>` : ''}
          <li><strong>Requirements:</strong> ${[
            fh.soundSystemRequired ? 'Sound System' : null,
            fh.projectorRequired ? 'Projector/Screen' : null,
            fh.cateringRequired ? 'Catering' : null
          ].filter(Boolean).join(', ') || 'None'}</li>
          ${Array.isArray(fh.equipmentAddons) && fh.equipmentAddons.length ? `<li><strong>Add-ons:</strong> ${fh.equipmentAddons.join(', ')}</li>` : ''}
        </ul>
      </div>
    `;
  }
  if (selectedCottages.length > 0) {
    // Get cottage dates if available
    const cottageDates = bookingFormState.cottageDates || bookingData.dates.cottageDates || [];
    const hasSpecificDates = cottageDates.length > 0;
    
    cottagesList = `
      <div class="success-section">
        <h4>Selected Cottages</h4>
        ${hasSpecificDates ? `<p style="color: #1e40af; font-size: 13px; margin-bottom: 8px;">Rental dates: ${cottageDates.map(date => {
          const d = new Date(date + 'T00:00:00');
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }).join(', ')} (${cottageDates.length} ${cottageDates.length === 1 ? 'day' : 'days'})</p>` : ''}
        <ul class="booking-items-list">
          ${selectedCottages.map(cottageId => `<li><strong>${cottageId}</strong></li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  const successHTML = `
    <div class="booking-success-modal">
      <div class="success-content">
        <div class="success-icon-outer">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #4caf50;">
            <path d="M9 12l2 2 4-4"></path>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        </div>
        <h3>Booking Confirmed!</h3>
        <p>Your reservation has been successfully created.</p>
        
        <div class="booking-summary">
          <h4>Booking Summary</h4>
          <div class="summary-details">
            <div class="summary-item">
              <span>Booking ID:</span>
              <strong>#${savedBooking.id}</strong>
            </div>
            <div class="summary-item">
              <span>Package:</span>
              <strong>${packageName}</strong>
            </div>
            ${bookingData.dates.checkin ? `
              <div class="summary-item">
                <span>Check-in:</span>
                <strong>${bookingData.dates.checkin}</strong>
              </div>
              <div class="summary-item">
                <span>Check-out:</span>
                <strong>${bookingData.dates.checkout}</strong>
              </div>
            ` : ''}
            ${bookingData.dates.nights ? `
              <div class="summary-item">
                <span>Nights:</span>
                <strong>${bookingData.dates.nights}</strong>
              </div>
            ` : ''}
            ${bookingData.reservationType === 'function-hall' ? `
              <div class="summary-item">
                <span>Total Guests:</span>
                <strong>${(bookingData.guests?.adults || 0) + (bookingData.guests?.children || 0) || bookingData.guests?.total || 'N/A'} Guests</strong>
              </div>
            ` : `
              <div class="summary-item">
                <span>Total Guests:</span>
                <strong>${bookingData.guests?.adults || 0} Adults, ${bookingData.guests?.children || 0} Children</strong>
              </div>
            `}
            <div class="summary-item">
              <span>Total Cost:</span>
              <strong>₱${(savedBooking.total_cost || 0).toLocaleString()}</strong>
            </div>
            <div class="summary-item">
              <span>Payment:</span>
              <strong>${bookingData.payment}</strong>
            </div>
          </div>
          
          ${roomsList}
          ${cottagesList}
          ${functionHallDetails}
        </div>
        
        <div class="success-actions">
          <button class="btn primary" onclick="window.goToMyBookings()">View My Bookings</button>
          <button class="btn" onclick="closeBookingModal()">Close</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', successHTML);
  
  // Clear selections after successful booking
  console.log('[showBookingSuccess] Booking successful, clearing selections');
  bookingState.selectedCottages = [];
  bookingState.selectedRooms = [];
  
  // Hide floating button when showing success (don't remove it)
  const floatingBtn = document.getElementById('floating-continue-btn');
  if (floatingBtn) {
    floatingBtn.style.display = 'none';
  }
  
  // Close main modal
  setTimeout(() => {
    closeBookingModal();
  }, 1000);
}

// Global function for navigating to My Bookings
window.goToMyBookings = function() {
  document.querySelector('.booking-success-modal')?.remove();
  closeBookingModal();
  location.hash = '#/my-bookings';
}

// Handle escape key
function handleEscapeKey(e) {
  if (e.key === 'Escape') {
    closeBookingModal();
  }
}

// Show policy (placeholder)
function showPolicy() {
  alert('Booking and Cancellation Policy:\n\n- Cancellations made 48 hours before check-in: Full refund\n- Cancellations made 24-48 hours before check-in: 50% refund\n- Cancellations made less than 24 hours before check-in: No refund\n- No-shows: No refund\n\nFor more details, please contact our reservations team.');
}

// Calendar integration functions
function openCalendarForCheckin() {
  // Store current booking modal state
  window.bookingModalCalendarMode = 'checkin';
  
  // Only store actual date values, not empty strings
  const checkinValue = document.getElementById('checkin-date')?.value;
  const checkoutValue = document.getElementById('checkout-date')?.value;
  
  window.bookingModalCurrentDates = {
    checkin: checkinValue && checkinValue.trim() !== '' ? checkinValue : null,
    checkout: checkoutValue && checkoutValue.trim() !== '' ? checkoutValue : null
  };
  
  // Open calendar modal for room booking
  // Pass bookingId if in edit mode to exclude it from availability checks
  if (window.openCalendarModal) {
    const editBookingId = bookingFormState.editMode && bookingFormState.bookingId 
      ? bookingFormState.bookingId 
      : null;
    window.openCalendarModal('Room Booking', 15, 'rooms', editBookingId);
  }
}

function openCalendarForCheckout() {
  // Store current booking modal state
  window.bookingModalCalendarMode = 'checkout';
  
  // Only store actual date values, not empty strings
  const checkinValue = document.getElementById('checkin-date')?.value;
  const checkoutValue = document.getElementById('checkout-date')?.value;
  
  window.bookingModalCurrentDates = {
    checkin: checkinValue && checkinValue.trim() !== '' ? checkinValue : null,
    checkout: checkoutValue && checkoutValue.trim() !== '' ? checkoutValue : null
  };
  
  // Open calendar modal for room booking
  // Pass bookingId if in edit mode to exclude it from availability checks
  if (window.openCalendarModal) {
    const editBookingId = bookingFormState.editMode && bookingFormState.bookingId 
      ? bookingFormState.bookingId 
      : null;
    window.openCalendarModal('Room Booking', 15, 'rooms', editBookingId);
  }
}

function updateBookingDates(checkinDate, checkoutDate) {
  const checkinInput = document.getElementById('checkin-date');
  const checkoutInput = document.getElementById('checkout-date');
  
  if (checkinInput && checkinDate) {
    checkinInput.value = checkinDate;
  }
  
  if (checkoutInput && checkoutDate) {
    checkoutInput.value = checkoutDate;
  }
  
  // Trigger change events to update nights calculation
  if (checkinInput) checkinInput.dispatchEvent(new Event('change'));
  if (checkoutInput) checkoutInput.dispatchEvent(new Event('change'));
}

// Update cottage date from calendar
function updateCottageDate(date) {
  const dateInput = document.getElementById('cottage-date');
  if (dateInput && date) {
    // Normalize date to YYYY-MM-DD format to prevent timezone shifts
    const normalizedDate = normalizeDateInputToYMD(date);
    if (normalizedDate) {
      dateInput.value = normalizedDate;
      dateInput.dispatchEvent(new Event('change'));
      console.log('[updateCottageDate] Date normalized:', date, '->', normalizedDate);
    } else {
      console.warn('[updateCottageDate] Failed to normalize date:', date);
    }
  }
}

// Make functions globally available
window.openBookingModal = openBookingModal;
window.closeBookingModal = closeBookingModal;
window.changeReservationType = changeReservationType;
window.toggleAddCottage = toggleAddCottage;
window.submitBooking = submitBooking;
window.showPolicy = showPolicy;

// Calendar integration functions
function openCalendarForCottage() {
  // Mark that we're modifying cottage date from within the booking modal
  window.bookingModalCalendarMode = 'cottage';
  // Store current cottage date if present
  const cottageDateValue = document.getElementById('cottage-date')?.value;
  window.bookingModalCurrentDates = { date: cottageDateValue && cottageDateValue.trim() !== '' ? cottageDateValue : null };
  if (window.openCalendarModal) {
    const editBookingId = bookingFormState.editMode && bookingFormState.bookingId 
      ? bookingFormState.bookingId 
      : null;
    window.openCalendarModal('Cottage Booking', 8, 'cottages', editBookingId);
  }
}

function openCalendarForFunctionHall() {
  // Mark that we're modifying function hall date from within the booking modal
  window.bookingModalCalendarMode = 'function-hall';
  // Store current function hall date if present
  const eventDateValue = document.getElementById('event-date')?.value;
  window.bookingModalCurrentDates = { date: eventDateValue && eventDateValue.trim() !== '' ? eventDateValue : null };
  
  if (window.openCalendarModal) {
    const editBookingId = bookingFormState.editMode && bookingFormState.bookingId 
      ? bookingFormState.bookingId 
      : null;
    window.openCalendarModal('Function Hall Booking', 5, 'function-halls', editBookingId);
  }
}

// Update function hall date from calendar
function updateFunctionHallDate(date) {
  const dateInput = document.getElementById('event-date');
  if (dateInput && date) {
    dateInput.value = date;
    dateInput.dispatchEvent(new Event('change'));
  }
}

window.openCalendarForCheckin = openCalendarForCheckin;
window.openCalendarForCheckout = openCalendarForCheckout;
window.updateBookingDates = updateBookingDates;
window.openCalendarForCottage = openCalendarForCottage;
window.openCalendarForFunctionHall = openCalendarForFunctionHall;
window.updateCottageDate = updateCottageDate;
window.updateFunctionHallDate = updateFunctionHallDate;
window.bookingFormState = bookingFormState; // Expose for calendar validation

// Open cottage selection as a separate modal overlay (like room add-on flow)
window.openCottageSelectionModal = async function() {
  const visit = document.getElementById('cottage-date')?.value || bookingFormState.preFillDates?.date;
  if (!visit) {
    alert('Please select a date first');
    return;
  }
  // Build selection view using existing generator
  try {
    const html = generateCottageSelectionView(await (async () => {
      const { checkAvailability } = await import('../utils/api.js');
      const result = await checkAvailability(1, visit, visit, 'cottages');
      let available = (result?.dateAvailability?.[visit]?.availableCottages) || ['Standard Cottage','Open Cottage','Family Cottage'];
      // Filter out already-selected to avoid duplicates in selection modal
      const selected = bookingState.selectedCottages || [];
      available = available.filter(c => !selected.includes(c));
      return available;
    })(), visit, visit);
    if (window.openModal) {
      // Wrap with a container so our existing buttons work
      window.openModal(html);
    } else {
      // Fallback: inject into form if modal utility is unavailable
      const content = document.querySelector('.booking-form-content');
      if (content) content.innerHTML = html;
    }
  } catch (e) {
    alert('Failed to load cottage availability. Please try again.');
  }
};

// Modal title helper based on category
function getModalTitle() {
  if (bookingFormState.editMode) return 'Edit Booking';
  const map = {
    'rooms': 'Book a Room',
    'cottages': 'Book a Cottage',
    'function-halls': 'Book a Function Hall'
  };
  return map[bookingFormState.category] || 'Make a Reservation';
}
