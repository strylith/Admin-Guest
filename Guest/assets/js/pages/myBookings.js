import { showToast } from '../components/toast.js';
import { getAuthState } from '../utils/state.js';
import { listBookings, cancelBooking as cancelBookingApi } from '../services/bookingsService.js';

export async function MyBookingsPage() {
  // Check authentication
  const authState = getAuthState();
  
  if (!authState.isLoggedIn) {
    location.hash = '#/auth?return=' + encodeURIComponent('#/rooms');
    return '<div class="container"><p>Redirecting to login...</p></div>';
  }

  const userName = `${authState.user?.firstName || ''} ${authState.user?.lastName || ''}`.trim() || 'Guest';

  // Fetch bookings from API or localStorage (already filtered by user in API)
  let allBookings = [];
  try {
    const result = await listBookings();
    // Handle both API response format and direct array
    allBookings = result?.data || result || [];
    
    // Additional client-side filter as safety measure
    const user = authState.user;
    if (user && (user.id || user.email)) {
      const userBookings = allBookings.filter(b => {
        // Try both UUID string comparison and case-insensitive comparison
        const matchesId = (
          (b.user_id === user.id) || 
          (String(b.user_id) === String(user.id)) ||
          (b.userId === user.id) ||
          (String(b.userId) === String(user.id))
        );
        const matchesEmail = (
          (b.guest_email === user.email) || 
          (b.email === user.email) ||
          (String(b.guest_email || '').toLowerCase() === String(user.email || '').toLowerCase())
        );
        
        if (!matchesId && !matchesEmail) {
          console.log('[MyBookings] Booking filtered out:', {
            bookingId: b.id,
            bookingUserId: b.user_id || b.userId,
            bookingEmail: b.guest_email || b.email,
            currentUserId: user.id,
            currentUserEmail: user.email,
            idMatch: matchesId,
            emailMatch: matchesEmail
          });
        }
        
        return matchesId || matchesEmail;
      });
      
      console.log('[MyBookings] Filtered bookings by user:', {
        totalBookings: allBookings.length,
        userBookings: userBookings.length,
        userId: user.id,
        email: user.email,
        userIdType: typeof user.id
      });
      
      // Debug log for verification
      console.log('[MyBookings] Scope check:', {
        totalBookings: allBookings.length,
        visibleToUser: userBookings.length,
        calendarHighlights: 'N/A (global, not filtered)'
      });
      
      allBookings = userBookings;
    } else {
      console.warn('[MyBookings] No user logged in, showing all bookings (should not happen)');
    }
    
    console.log('[MyBookings] Final bookings count:', {
      count: allBookings.length,
      ids: allBookings.map(b => ({ id: b.id, type: typeof b.id, user_id: b.user_id }))
    });
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    showToast('Failed to load bookings', 'error');
  }
  
  // Export refresh function for external calls (e.g., after booking creation)
  window.refreshBookingsList = async function() {
    try {
      console.log('[MyBookings] Refreshing bookings list...');
      const result = await listBookings();
      allBookings = result?.data || result || [];
      console.log('[MyBookings] Refreshed bookings:', {
        count: allBookings.length,
        ids: allBookings.map(b => b.id).join(', ')
      });
      // Navigate to My Bookings page instead of reloading
      location.hash = '#/my-bookings';
    } catch (error) {
      console.error('[MyBookings] Failed to refresh bookings:', error);
    }
  };
  
  // Separate current and past bookings
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const currentBookings = allBookings.filter(booking => {
    const checkoutDate = new Date(booking.check_out);
    checkoutDate.setHours(0, 0, 0, 0);
    return checkoutDate >= today && booking.status !== 'cancelled';
  });
  
  const pastBookings = allBookings.filter(booking => {
    const checkoutDate = new Date(booking.check_out);
    checkoutDate.setHours(0, 0, 0, 0);
    return checkoutDate < today || booking.status === 'cancelled';
  });

  // Cancel booking function
  window.kinaCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }
    
    try {
      await cancelBookingApi(bookingId);
      
      // Clear calendar cache
      if (window.clearCalendarCache) {
        window.clearCalendarCache();
      }
      
      showToast('Booking cancelled successfully', 'success');
      location.reload();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      showToast('Failed to cancel booking', 'error');
    }
  };

  // Edit booking function
  window.kinaEditBooking = async (bookingId) => {
    console.log('[Re-Edit] Button clicked, bookingId:', bookingId, 'type:', typeof bookingId);
    console.log('[Re-Edit] Current allBookings:', {
      count: allBookings.length,
      ids: allBookings.map(b => ({ id: b.id, type: typeof b.id, user_id: b.user_id }))
    });
    
    try {
      // Try both string and number comparison since IDs might be mixed types
      const booking = allBookings.find(b => {
        const bookingIdNum = Number(bookingId);
        const bookingIdStr = String(bookingId);
        return b.id === bookingId || b.id === bookingIdNum || String(b.id) === bookingIdStr;
      });
      
      if (!booking) {
        console.error('[Re-Edit] Booking not found in list:', bookingId);
        console.error('[Re-Edit] Available booking IDs:', allBookings.map(b => ({ id: b.id, type: typeof b.id })));
        console.error('[Re-Edit] Current user:', {
          id: authState.user?.id,
          email: authState.user?.email,
          userIdType: typeof authState.user?.id
        });
        showToast('Booking not found', 'error');
        return;
      }
      
      // Verify booking belongs to current user (additional safety check)
      const user = authState.user;
      if (user && (user.id || user.email)) {
        const isOwner = (user.id && (booking.user_id === user.id || booking.userId === user.id)) ||
                       (user.email && (booking.guest_email === user.email || booking.email === user.email));
        if (!isOwner) {
          console.error('[Re-Edit] Unauthorized: Booking does not belong to user', {
            bookingUserId: booking.user_id || booking.userId,
            bookingEmail: booking.guest_email || booking.email,
            currentUserId: user.id,
            currentEmail: user.email
          });
          showToast('Unauthorized: Cannot edit this booking', 'error');
          return;
        }
      }
      
      console.log('[Re-Edit] Found booking (ownership verified):', booking);
      
      // Extract booking items
      const bookingItems = booking.booking_items || [];
      const rooms = bookingItems.filter(item => item.item_type === 'room');
      const cottages = bookingItems.filter(item => item.item_type === 'cottage');
      
      // Prepare pre-fill data
      // Extract guest info - check multiple possible fields
      const guestName = booking.guest_name || booking.guests?.name || userName;
      const guestEmail = booking.guest_email || booking.guests?.email || authState.user?.email || '';
      const guestContact = booking.contact_number || booking.contact || '';
      
      // Extract cottage dates if available
      const cottageDates = cottages
        .map(c => c.usage_date)
        .filter(date => date) // Remove null/undefined dates
        .filter((date, index, self) => self.indexOf(date) === index) // Remove duplicates
        .sort(); // Sort chronologically
      
      const preFillData = {
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        selectedRooms: rooms.map(r => r.item_id),
        selectedCottages: cottages.map(c => c.item_id),
        cottageDates: cottageDates, // Include cottage rental dates
        guestInfo: {
          name: guestName,
          email: guestEmail,
          contact: guestContact
        },
        paymentMode: booking.payment_mode,
        perRoomGuests: rooms.map(r => ({
          roomId: r.item_id,
          guestName: r.guest_name || guestName,
          adults: r.adults || 1,
          children: r.children || 0
        })),
        guests: booking.guests
      };

      // Function hall prefill: event date and selected hall from booking_items
      const functionHalls = bookingItems.filter(item => item.item_type === 'function-hall');
      if (functionHalls.length > 0) {
        const fhItem = functionHalls[0];
        preFillData.eventDate = fhItem.usage_date || booking.check_in;
        preFillData.hallId = fhItem.item_id;
        preFillData.hallName = fhItem.item_id;
        
        // Extract function hall metadata from bookings.function_hall_metadata JSONB column
        const fhMetadata = booking.function_hall_metadata || {};
        console.log('[Re-Edit] Function hall metadata from booking:', fhMetadata);
        
        // Use metadata from database if available, fallback to legacy fields
        preFillData.eventName = fhMetadata.eventName || booking.event_name || booking.selections?.eventName || null;
        preFillData.eventType = fhMetadata.eventType || booking.event_type || booking.selections?.eventType || null;
        preFillData.setupType = fhMetadata.setupType || booking.setup_type || booking.selections?.setupType || null;
        preFillData.startTime = fhMetadata.startTime || booking.start_time || booking.dates?.startTime || null;
        preFillData.endTime = fhMetadata.endTime || booking.end_time || booking.dates?.endTime || null;
        preFillData.decorationTheme = fhMetadata.decorationTheme || booking.decoration_theme || booking.selections?.decorationTheme || null;
        preFillData.organization = fhMetadata.organization || booking.organization || booking.selections?.organization || null;
        // Handle both new format (adults+children) and old format (total) for backward compatibility
        let guestCount = null;
        if (typeof booking.guests === 'object') {
          const adults = booking.guests.adults || 0;
          const children = booking.guests.children || 0;
          const total = booking.guests.total || 0;
          guestCount = (adults + children > 0) ? (adults + children) : (total || null);
        } else {
          guestCount = booking.guests || null;
        }
        preFillData.guestCount = guestCount;
        preFillData.soundSystemRequired = fhMetadata.soundSystemRequired !== undefined ? fhMetadata.soundSystemRequired : (booking.sound_system_required || booking.selections?.soundSystemRequired || false);
        preFillData.projectorRequired = fhMetadata.projectorRequired !== undefined ? fhMetadata.projectorRequired : (booking.projector_required || booking.selections?.projectorRequired || false);
        preFillData.cateringRequired = fhMetadata.cateringRequired !== undefined ? fhMetadata.cateringRequired : (booking.catering_required || booking.selections?.cateringRequired || false);
        preFillData.equipmentAddons = Array.isArray(fhMetadata.equipmentAddons) ? fhMetadata.equipmentAddons : (Array.isArray(booking.equipment_addons) ? booking.equipment_addons : (Array.isArray(booking.selections?.equipmentAddons) ? booking.selections.equipmentAddons : []));
        
        // Extract specialRequests - it's stored in booking.special_requests (string field)
        preFillData.specialRequests = booking.special_requests || null;
        console.log('[Re-Edit] Special requests extracted:', preFillData.specialRequests);
        
        // Use hallName from metadata if available
        if (fhMetadata.hallName) {
          preFillData.hallName = fhMetadata.hallName;
        }
        
        console.log('[Re-Edit] Function hall prefill data extracted:', {
          eventName: preFillData.eventName,
          eventType: preFillData.eventType,
          setupType: preFillData.setupType,
          startTime: preFillData.startTime,
          endTime: preFillData.endTime,
          decorationTheme: preFillData.decorationTheme,
          organization: preFillData.organization,
          soundSystemRequired: preFillData.soundSystemRequired,
          projectorRequired: preFillData.projectorRequired,
          cateringRequired: preFillData.cateringRequired,
          equipmentAddons: preFillData.equipmentAddons,
          specialRequests: preFillData.specialRequests
        });
      }
      
      console.log('[Re-Edit] Pre-fill data prepared:', preFillData);
      
      // Determine reservation type from booking category or booking items
      let reservationType = 'room';
      // First check booking.category field (new unified system)
      if (booking.category) {
        const categoryToType = {
          'rooms': 'room',
          'cottages': 'cottage',
          'function-halls': 'function-hall'
        };
        reservationType = categoryToType[booking.category] || 'room';
      }
      // Fallback: determine from booking items if category not set
      else if (cottages.length > 0 && rooms.length === 0) {
        reservationType = 'cottage';
      } else if (booking.packages?.category === 'function-halls') {
        reservationType = 'function-hall';
      }
      
      console.log('[Re-Edit] Category detected:', booking.category || booking.packages?.category);
      
      console.log('[Re-Edit] Reservation type determined:', reservationType);
      console.log('[Re-Edit] Loading booking modal module...');
      
      // Always import the modal module - don't check for window.openBookingModal first
      const { openBookingModal } = await import('../components/bookingModal.js');
      
      console.log('[Re-Edit] Modal module loaded successfully, opening with editMode=true');
      console.log('[Re-Edit] Opening modal with:', {
        reservationType,
        packageTitle: booking.packages?.title || 'Booking',
        bookingId,
        hasPreFillData: !!preFillData
      });
      
      openBookingModal(
        reservationType,
        booking.packages?.title || 'Booking',
        preFillData,
        true,  // editMode
        bookingId,
        booking.category || booking.packages?.category,  // category
        booking.package_id  // package_id
      );
      
      console.log('[Re-Edit] Modal open call completed');
    } catch (error) {
      console.error('[Re-Edit] Failed to open booking modal:', error);
      console.error('[Re-Edit] Error stack:', error.stack);
      showToast('Failed to open booking editor: ' + error.message, 'error');
    }
  };

  // View booking details function
  window.kinaViewBookingDetails = (bookingId) => {
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    // Log package lookup for debugging
    const category = booking.category || booking.packages?.category || '';
    console.log('[Table] Package lookup for booking details:', {
      bookingId: booking.id,
      package_id: booking.package_id,
      category: category,
      hasPackages: !!booking.packages,
      packageTitle: booking.packages?.title,
      packageCategory: booking.packages?.category
    });
    
    // Map category to simplified display name
    const displayNameMap = {
      'rooms': 'Room',
      'cottages': 'Cottage',
      'function-halls': 'Function Hall',
      'function-hall': 'Function Hall'
    };
    const packageName = displayNameMap[category] || 'Room';
    const packageType = booking.packages?.category || 'room';
    
    // Parse guests data
    let guestsDisplay = '';
    if (typeof booking.guests === 'object') {
      guestsDisplay = `${booking.guests.adults || 0} Adults, ${booking.guests.children || 0} Children`;
    } else {
      guestsDisplay = booking.guests || 'N/A';
    }
    
    // Extract booking items
    const bookingItems = booking.booking_items || [];
    const rooms = bookingItems.filter(item => item.item_type === 'room');
    const cottages = bookingItems.filter(item => item.item_type === 'cottage');
    const functionHalls = bookingItems.filter(item => item.item_type === 'function-hall');
    
    // Build room details
    let roomDetails = '';
    if (rooms.length > 0) {
      roomDetails = `
        <div class="detail-section">
          <strong>Selected Rooms:</strong>
          <ul class="room-details-list">
            ${rooms.map(room => `
              <li>
                <strong>${room.item_id}</strong><br>
                <small>Guest: ${room.guest_name || 'N/A'}, Adults: ${room.adults}, Children: ${room.children}</small>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }
    
    // Build cottage details
    let cottageDetails = '';
    if (cottages.length > 0) {
      // Group cottages by item_id and collect their usage dates
      const cottageGroups = {};
      cottages.forEach(cottage => {
        if (!cottageGroups[cottage.item_id]) {
          cottageGroups[cottage.item_id] = [];
        }
        if (cottage.usage_date) {
          cottageGroups[cottage.item_id].push(cottage.usage_date);
        }
      });
      
      cottageDetails = `
        <div class="detail-section">
          <strong>Selected Cottages:</strong>
          <ul class="cottage-details-list">
            ${Object.entries(cottageGroups).map(([cottageId, dates]) => {
              let dateInfo = '';
              if (dates.length > 0) {
                const formattedDates = dates.map(date => {
                  const d = new Date(date + 'T00:00:00');
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }).join(', ');
                dateInfo = `<br><small style="color: #1e40af;">Rental dates: ${formattedDates} (${dates.length} ${dates.length === 1 ? 'day' : 'days'})</small>`;
              }
              return `<li><strong>${cottageId}</strong>${dateInfo}</li>`;
            }).join('')}
          </ul>
        </div>
      `;
    }
    
    // Build function hall details
    let hallDetails = '';
    if (functionHalls.length > 0) {
      hallDetails = `
        <div class="detail-section">
          <strong>Selected Function Halls:</strong>
          <ul class="hall-details-list">
            ${functionHalls.map(hall => `<li><strong>${hall.item_id}</strong></li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    const detailsHTML = `
      <div class="booking-details-modal">
        <h3>Booking Details</h3>
        <div class="booking-details-content">
          <div class="detail-row">
            <strong>Booking ID:</strong> ${booking.id}
          </div>
          <div class="detail-row">
            <strong>Package:</strong> ${packageName}
          </div>
          <div class="detail-row">
            <strong>Type:</strong> ${packageType}
          </div>
          <div class="detail-row">
            <strong>Check-in:</strong> ${new Date(booking.check_in).toLocaleDateString()}
          </div>
          <div class="detail-row">
            <strong>Check-out:</strong> ${new Date(booking.check_out).toLocaleDateString()}
          </div>
          <div class="detail-row">
            <strong>Guests:</strong> ${guestsDisplay}
          </div>
          ${roomDetails}
          ${cottageDetails}
          ${hallDetails}
          <div class="detail-row">
            <strong>Contact:</strong> ${booking.contact_number || 'N/A'}
          </div>
          <div class="detail-row">
            <strong>Total Cost:</strong> ₱${booking.total_cost?.toLocaleString() || 'N/A'}
          </div>
          <div class="detail-row">
            <strong>Payment Mode:</strong> ${booking.payment_mode || 'N/A'}
          </div>
          <div class="detail-row">
            <strong>Status:</strong> <span class="booking-status-badge ${booking.status.toLowerCase()}">${booking.status}</span>
          </div>
          <div class="detail-row">
            <strong>Booked on:</strong> ${new Date(booking.created_at).toLocaleDateString()}
          </div>
          ${booking.special_requests ? `
            <div class="detail-row">
              <strong>Special Requests:</strong>
              <p>${booking.special_requests}</p>
            </div>
          ` : ''}
        </div>
        <div class="modal-actions">
          <button class="btn" onclick="document.querySelector('.modal').remove()">Close</button>
        </div>
      </div>
    `;
    
    // Use existing modal system
    if (window.openModal) {
      window.openModal(detailsHTML);
    }
  };

  // Generate table rows for bookings
  const generateBookingRows = (bookings, showActions = true) => {
    if (bookings.length === 0) {
      return `
        <tr>
          <td colspan="${showActions ? '8' : '7'}" class="empty-state">
            <div class="bookings-empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M3 7v6h6"/>
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
              </svg>
              <p>${showActions ? 'No current bookings. Start planning your stay!' : 'No past bookings yet.'}</p>
            </div>
          </td>
        </tr>
      `;
    }

    return bookings.map(booking => {
      // Log package lookup for debugging
      console.log('[Table] Package lookup for booking row:', {
        bookingId: booking.id,
        package_id: booking.package_id,
        category: booking.category,
        hasPackages: !!booking.packages,
        packageTitle: booking.packages?.title,
        packageCategory: booking.packages?.category,
        fallback: 'Standard Room'
      });
      
      // Map category to simplified display name
      const category = booking.category || booking.packages?.category || '';
      const displayNameMap = {
        'rooms': 'Room',
        'cottages': 'Cottage',
        'function-halls': 'Function Hall',
        'function-hall': 'Function Hall'
      };
      const packageName = displayNameMap[category] || 'Room';
      const packageType = booking.packages?.category || 'room';
      const statusClass = booking.status === 'confirmed' ? 'confirmed' : 
                         booking.status === 'pending' ? 'pending' : 'cancelled';
      
      // Parse guests - check category to determine format (category already declared above)
      const isFunctionHall = category === 'function-halls' || category === 'function-hall';
      
      console.log('[generateBookingRows] Processing booking:', {
        id: booking.id,
        category,
        isFunctionHall,
        guests: booking.guests,
        guestsType: typeof booking.guests
      });
      
      let guestsDisplay = '';
      if (typeof booking.guests === 'object') {
        // Check for adults/children format first (new format, preferred)
        if (booking.guests.adults !== undefined || booking.guests.children !== undefined) {
          const adults = booking.guests.adults || 0;
          const children = booking.guests.children || 0;
          const total = adults + children;
          if (isFunctionHall) {
            // Function halls: show total count
            guestsDisplay = `${total} Guests`;
            console.log('[generateBookingRows] Function hall - using adults+children:', total);
          } else {
            // Rooms and cottages: show adults and children separately
            guestsDisplay = `${adults}A, ${children}C`;
            console.log('[generateBookingRows] Room/cottage - using adults/children:', guestsDisplay);
          }
        } else if (isFunctionHall && booking.guests.total !== undefined) {
          // Backward compatibility: old function hall format with total
          guestsDisplay = `${booking.guests.total} Guests`;
          console.log('[generateBookingRows] Function hall - using total (backward compat):', booking.guests.total);
        } else {
          guestsDisplay = 'N/A';
          console.warn('[generateBookingRows] Unknown guests format:', booking.guests);
        }
      } else {
        guestsDisplay = booking.guests || 'N/A';
        console.log('[generateBookingRows] Guests is not an object:', guestsDisplay);
      }
      
      // Extract actual item names from booking_items array
      const bookingItems = booking.booking_items || [];
      const rooms = bookingItems.filter(item => item.item_type === 'room');
      const cottages = bookingItems.filter(item => item.item_type === 'cottage');
      const halls = bookingItems.filter(item => item.item_type === 'function-hall');
      
      // Get unique room and cottage names
      const uniqueRooms = [...new Set(rooms.map(r => r.item_id))];
      const uniqueCottages = [...new Set(cottages.map(c => c.item_id))];
      const uniqueHalls = [...new Set(halls.map(h => h.item_id))];
      
      const itemsParts = [];
      if (uniqueRooms.length > 0) {
        itemsParts.push(uniqueRooms.length > 2 ? `${uniqueRooms.length} rooms` : uniqueRooms.join(', '));
      }
      if (uniqueCottages.length > 0) {
        itemsParts.push(uniqueCottages.length > 2 ? `${uniqueCottages.length} cottages` : uniqueCottages.join(', '));
      }
      if (uniqueHalls.length > 0) {
        itemsParts.push(uniqueHalls.join(', '));
      }
      
      const itemsDisplay = itemsParts.join(' + ') || 'N/A';
      
      // Derive category for display tweaks (category already declared above)
      const isCottage = category === 'cottages' || category === 'cottage';
      const checkInDisp = new Date(booking.check_in).toLocaleDateString();
      const checkOutDisp = isCottage ? '-' : new Date(booking.check_out).toLocaleDateString();
      return `
      <tr>
        <td>${booking.id}</td>
        <td>${packageName}</td>
        <td>${itemsDisplay}</td>
        <td>${checkInDisp}</td>
        <td>${checkOutDisp}</td>
        <td>${guestsDisplay}</td>
        <td><span class="booking-status-badge ${statusClass}">${booking.status}</span></td>
        ${showActions ? `
          <td class="booking-actions">
            ${(booking.status === 'confirmed' || booking.status === 'pending') && new Date(booking.check_in) > new Date() ? 
              `<button class="btn small danger" onclick="kinaCancelBooking('${booking.id}')">Cancel</button>` : ''
            }
            ${(booking.status === 'confirmed' || booking.status === 'pending') && new Date(booking.check_in) > new Date() ? 
              `<button class="btn small btn-edit" onclick="kinaEditBooking('${booking.id}')">Re-Edit</button>` : ''
            }
          </td>
        ` : ''}
      </tr>
    `}).join('');
  };

  return `
    <section class="container my-bookings-page">
      <div class="bookings-header">
        <h2>My Bookings</h2>
        <p class="user-welcome">Welcome back, ${userName}!</p>
        <div class="bookings-controls">
          <button class="btn primary" onclick="location.hash='#/packages'">Make a Booking</button>
        </div>
      </div>

      <!-- Current Bookings Section -->
      <div class="bookings-section">
        <h3>Current Bookings</h3>
        <div class="bookings-table-wrapper">
          <table class="bookings-table" aria-label="Current bookings">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Type</th>
                <th>Rooms/Cottages</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Guests</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${generateBookingRows(currentBookings, true)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Past Bookings Section -->
      <div class="bookings-section">
        <h3>Past Bookings</h3>
        <div class="bookings-table-wrapper">
          <table class="bookings-table" aria-label="Past bookings">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Type</th>
                <th>Rooms/Cottages</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Guests</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${generateBookingRows(pastBookings, false)}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <style>
      .my-bookings-page {
        padding: 40px 20px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .bookings-header {
        text-align: center;
        margin-bottom: 40px;
        padding-bottom: 20px;
        border-bottom: 2px solid var(--border);
      }

      .bookings-header h2 {
        margin: 0 0 8px 0;
        color: var(--color-text);
        font-size: 2.5rem;
        font-weight: 700;
      }

      .user-welcome {
        color: var(--color-text-secondary);
        margin: 0 0 20px 0;
        font-size: 1.1rem;
      }

      .bookings-controls {
        margin-top: 20px;
      }

      .bookings-section {
        margin-bottom: 40px;
      }

      .bookings-section h3 {
        color: var(--color-text);
        margin-bottom: 20px;
        font-size: 1.5rem;
        font-weight: 600;
        padding-left: 8px;
        border-left: 4px solid var(--color-accent);
      }

      .bookings-table-wrapper {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        overflow-x: auto;
      }

      .bookings-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 800px;
      }

      .bookings-table th {
        background: var(--color-accent);
        color: white;
        padding: 16px 12px;
        text-align: left;
        font-weight: 600;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .bookings-table td {
        padding: 16px 12px;
        border-bottom: 1px solid var(--border);
        vertical-align: middle;
      }

      .bookings-table tr:hover {
        background: var(--color-bg);
      }

      .booking-status-badge {
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .booking-status-badge.confirmed {
        background: #d4edda;
        color: #155724;
      }

      .booking-status-badge.pending {
        background: #fff3cd;
        color: #856404;
      }

      .booking-status-badge.cancelled {
        background: #f8d7da;
        color: #721c24;
      }

      .booking-status-badge.completed {
        background: #cce5ff;
        color: #004085;
      }

      .booking-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .btn.small {
        padding: 6px 12px;
        font-size: 0.8rem;
        border-radius: 6px;
      }

      .btn.danger {
        background: #dc3545;
        color: white;
        border: none;
      }

      .btn.danger:hover {
        background: #c82333;
      }

      .btn-edit {
        background: #4CAF50;
        color: white;
        border: none;
      }

      .btn-edit:hover {
        background: #45a049;
      }

      .btn-edit:disabled {
        background: #cccccc;
        cursor: not-allowed;
      }

      .bookings-empty-state {
        text-align: center;
        padding: 40px 20px;
        color: var(--color-text-secondary);
      }

      .bookings-empty-state svg {
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .bookings-empty-state p {
        margin: 0;
        font-size: 1.1rem;
      }

      .empty-state {
        text-align: center;
      }

      /* Booking Details Modal Styles */
      .booking-details-modal h3 {
        margin-top: 0;
        color: var(--color-text);
        border-bottom: 2px solid var(--border);
        padding-bottom: 12px;
      }

      .booking-details-content {
        margin: 20px 0;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--border);
      }

      .detail-row:last-child {
        border-bottom: none;
      }

      .modal-actions {
        text-align: right;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 2px solid var(--border);
      }

      /* Mobile Responsive */
      @media (max-width: 768px) {
        .my-bookings-page {
          padding: 20px 10px;
        }

        .bookings-header h2 {
          font-size: 2rem;
        }

        .bookings-table {
          font-size: 0.9rem;
        }

        .bookings-table th,
        .bookings-table td {
          padding: 12px 8px;
        }

        .booking-actions {
          flex-direction: column;
        }

        .btn.small {
          width: 100%;
          text-align: center;
        }

        .detail-row {
          flex-direction: column;
          gap: 4px;
        }
      }
    </style>
  `;
}

