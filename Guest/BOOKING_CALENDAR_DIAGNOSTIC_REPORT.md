# Booking & Calendar Subsystem Diagnostic Report

## Executive Summary

This report identifies critical issues in the booking and calendar flow that cause:
1. Calendar date mismatch (shows 29 instead of 30-31) due to timezone normalization
2. Re-edit flow failures (booking not found) due to async/await handling in `setDates()`
3. Availability checks not blocking invalid submissions (partially fixed, needs verification)
4. Data shape inconsistencies between create response and list format

**Status**: Date normalization fixed in mock API. `setDates()` async issue remains. Availability validation added but needs testing.

---

## 1. Data Flow Consistency

### ✅ FINDING: CRUD Operations Route Correctly

**Location**: `assets/js/utils/api.js`

All booking CRUD operations correctly route to `/mock/*` when `USE_MOCK_BOOKINGS === true`:
- ✅ `fetchUserBookings()` → `/mock/bookings` (line 257)
- ✅ `createBooking()` → `/mock/bookings` POST (line 280)
- ✅ `updateBooking()` → `/mock/bookings/:id` PATCH (line 312)
- ✅ `cancelBooking()` → `/mock/bookings/:id` DELETE (line 337)
- ✅ `checkAvailability()` → `/mock/bookings/availability/:packageId` (line 204)

**Verdict**: No API endpoint mismatches. All operations use mock in dev mode.

### ⚠️ FINDING: ID Format Consistency

**Location**: `server/routes/mockBookings.js`

- **Create**: Returns `id: Date.now().toString()` (line 72) → **string**
- **List**: Returns booking objects with `id` from Map key (line 19-37) → **string**
- **Update/Delete**: Uses `id` from params as **string**

**Issue**: No ID format mismatch confirmed. Both create and list use string IDs.

**Test**: Verify `booking.id` from create matches `booking.id` used in re-edit lookup.

---

## 2. Re-Edit Flow Analysis

### 🔧 FINDING: Async Handling in `setDates()` Not Awaited

**Location**: `assets/js/utils/bookingState.js:29-34`

```javascript
setDates(checkin, checkout) {
  this.dates.checkin = checkin;
  this.dates.checkout = checkout;
  // Update available rooms and cottages when dates change
  this.updateAvailability();  // ⚠️ NOT AWAITED
},
```

**Problem**: `updateAvailability()` is now async (line 230), but `setDates()` doesn't await it. This is called from `packages.js:1138`:

```javascript
bookingState.setDates(checkinDate, checkoutDate);  // Not awaited
```

**Impact**: Low — this only affects availability state update timing, not the re-edit lookup.

### ✅ FINDING: Re-Edit Data Flow is Correct

**Location**: `assets/js/pages/myBookings.js:65-148`

**Flow**:
1. User clicks Re-Edit → `window.kinaEditBooking(bookingId)` (line 66)
2. Looks up booking: `allBookings.find(b => b.id === bookingId)` (line 70)
3. Prepares prefill data from booking object (lines 86-108)
4. Imports modal module dynamically (line 124)
5. Calls `openBookingModal()` with prefill data and `editMode=true` (lines 134-140)

**Verdict**: Logic is correct. If booking not found, likely because:
- Booking list (`allBookings`) is stale (not refetched after create)
- ID type mismatch (unlikely, both strings)
- Booking created but not persisted in mock DB

**Recommendation**: Add refetch logic after successful booking creation to refresh the list.

---

## 3. Availability & bookingState Logic

### ✅ FIXED: `updateAvailability()` Now Async with Awaits

**Location**: `assets/js/utils/bookingState.js:229-251`

**Status**: Fixed in previous implementation:
- Function is `async` (line 230)
- Awaits `getAvailableRooms()` and `getAvailableCottages()` (lines 232-233)
- Filters `selectedRooms` after await completes (lines 236-243)
- Includes array checks: `Array.isArray(this.availableRooms)` (line 237)

### ⚠️ REMAINING ISSUE: `setDates()` Doesn't Await

**Location**: `assets/js/utils/bookingState.js:29-34`

```javascript
setDates(checkin, checkout) {
  this.dates.checkin = checkin;
  this.dates.checkout = checkout;
  this.updateAvailability();  // ⚠️ Fire-and-forget async call
},
```

**Fix Required**: Make `setDates()` async and await `updateAvailability()`, OR call it separately with await.

**Usage**: `packages.js:1138` calls `bookingState.setDates()` without await.

---

## 4. Calendar Date Handling

### ✅ FIXED: Date Normalization in Mock API

**Location**: `server/routes/mockBookings.js:323-361`

**Status**: Fixed in previous implementation:
- Helper function `normalizeDateString()` (lines 324-338)
- Uses `new Date(dateString + 'T00:00:00')` for local midnight parsing
- Applied to query params and booking dates
- Extensive debug logging added

**Verdict**: Calendar date mismatch should be resolved.

### ⚠️ POTENTIAL ISSUE: Calendar Modal Date Parsing

**Location**: `assets/js/components/calendarModal.js:453-463`

```javascript
const checkinDate = new Date(calendarState.selectedCheckin);
checkinDate.setHours(0, 0, 0, 0);
const checkoutDate = new Date(calendarState.selectedCheckout);
checkoutDate.setHours(0, 0, 0, 0);
const currentDate = new Date(date);
currentDate.setHours(0, 0, 0, 0);
```

**Issue**: If `calendarState.selectedCheckin` is already a `Date` object, this is fine. But if it's a string like `'2025-10-30'`, `new Date('2025-10-30')` may cause timezone shift.

**Recommendation**: Normalize date strings in calendar state to ensure consistent parsing:
```javascript
const normalizeDate = (date) => {
  if (!date) return null;
  if (typeof date === 'string') {
    const d = new Date(date + 'T00:00:00');
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (date instanceof Date) {
    date.setHours(0, 0, 0, 0);
    return date;
  }
  return null;
};
```

---

## 5. Calendar Rendering & Labels

### ✅ FINDING: Calendar Uses Availability API, Not Direct Booking Records

**Location**: `assets/js/components/calendarModal.js:240-273`

The calendar fetches availability via `checkAvailability()` API (line 245), which returns `dateAvailability` map with status per date. It does NOT directly render booking `check_in`/`check_out` dates from booking records.

**How Highlights Work**:
- Calendar calls `/mock/bookings/availability/:packageId` with date range (line 245)
- Mock API returns `dateAvailability[dateString]` with `status`, `availableRooms`, `bookedRooms` (lines 417-423 in mockBookings.js)
- Calendar renders cells with CSS classes based on status: `available-all`, `available-1`, `available-2`, `booked-all` (line 394)

**Verdict**: Calendar highlighting is via availability status, not direct booking date rendering. This is correct architecture.

### ⚠️ FINDING: Selection State Uses Date Objects

**Location**: `assets/js/components/calendarModal.js:338-363`

Calendar state stores `selectedCheckin` and `selectedCheckout` as `Date` objects (lines 339-340, 347-348). Date comparisons use `.getTime()` (lines 341, 349).

**Potential Issue**: If dates come from form inputs as strings, they're converted to Date objects. Ensure normalization happens on assignment.

---

## 6. Blocking Invalid Booking Submissions

### ✅ FIXED: Availability Validation Added

**Location**: `assets/js/components/bookingModal.js:1864-1939`

**Status**: Fixed in previous implementation:
- Availability check added before `saveBooking()` (lines 1866-1900 for rooms, 1904-1939 for cottages)
- Checks `result.dateAvailability` for room bookings
- Validates `availableRooms` contains at least one selected room across all dates
- Shows error toast: "No rooms available for the selected dates."
- Skips validation in edit mode (line 1866: `if (!bookingFormState.editMode)`)

**Verdict**: Should block invalid submissions. Needs verification testing.

---

## 7. Errors & Logging Gaps

### Missing Logs Identified

1. **Re-edit flow logging** ✅ FIXED
   - Location: `assets/js/pages/myBookings.js:67-142`
   - Status: Comprehensive logs added in previous fix

2. **Booking creation success** ✅ FIXED
   - Location: `assets/js/utils/api.js:278-284`
   - Status: Log added: `[BookingAPI] Created booking using mock/real API`

3. **Availability state updates** ✅ FIXED
   - Location: `assets/js/utils/bookingState.js:245, 249`
   - Status: Logs added for completion

4. **Date normalization in calendar** ⚠️ NEEDS ADDITIONAL
   - Location: `assets/js/components/calendarModal.js:453-463`
   - Recommendation: Add log showing normalized dates before comparison

5. **Booking list fetch results** ⚠️ NEEDS ADDITIONAL
   - Location: `assets/js/pages/myBookings.js:19-25`
   - Recommendation: Log count of bookings received and their IDs

---

## Root Causes Summary

### Priority 1: Critical Bugs

1. **`setDates()` doesn't await async `updateAvailability()`**
   - **File**: `assets/js/utils/bookingState.js:29-34`
   - **Impact**: Availability state may not update synchronously
   - **Fix**: Make `setDates()` async and await `updateAvailability()`, update all callers

2. **Calendar date parsing inconsistency (potential)**
   - **File**: `assets/js/components/calendarModal.js:453-463, 770-773`
   - **Impact**: Off-by-one day errors if date strings parsed as local vs UTC
   - **Fix**: Normalize all date strings using helper before creating Date objects

### Priority 2: Data Consistency

3. **Booking list not refreshed after create**
   - **File**: `assets/js/components/bookingModal.js:1959-1968`
   - **Impact**: Re-edit may fail if page not reloaded after booking creation
   - **Fix**: Refetch bookings list after successful create, or push new booking to in-memory list

4. **Date string normalization in calendar state**
   - **File**: `assets/js/components/calendarModal.js` (multiple locations)
   - **Impact**: Inconsistent date comparisons
   - **Fix**: Use date normalization helper when setting calendarState.selectedCheckin/checkout

### Priority 3: Logging & Debugging

5. **Missing logs in calendar date comparisons**
   - **File**: `assets/js/components/calendarModal.js:453-463`
   - **Fix**: Add logs showing normalized dates and comparison results

---

## Proposed Fixes (Prioritized)

### Fix 1: Make `setDates()` Async and Update Callers

**File**: `assets/js/utils/bookingState.js`

```javascript
// BEFORE (line 29)
setDates(checkin, checkout) {
  this.dates.checkin = checkin;
  this.dates.checkout = checkout;
  this.updateAvailability();  // Not awaited
},

// AFTER
async setDates(checkin, checkout) {
  this.dates.checkin = checkin;
  this.dates.checkout = checkout;
  await this.updateAvailability();
},

// Also update getAvailableCottages to be async if not already
async getAvailableCottages(checkin, checkout) {
  // If this calls async functions internally, make it async
  if (!checkin || !checkout) return [];
  
  return this.allCottages.filter(cottageId => 
    this.isCottageAvailable(cottageId, checkin, checkout)
  );
},
```

**Update Callers**:
- `assets/js/pages/packages.js:1138`: Add `await`:
```javascript
await bookingState.setDates(checkinDate, checkoutDate);
```

### Fix 2: Normalize Calendar Date Parsing

**File**: `assets/js/components/calendarModal.js`

Add helper function at top of file:

```javascript
// Helper to normalize date strings to Date objects (local midnight)
function normalizeDateInput(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    const d = new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (typeof dateInput === 'string') {
    const normalized = dateInput.trim();
    const d = normalized.includes('T') 
      ? new Date(normalized)
      : new Date(normalized + 'T00:00:00');
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null;
}
```

Update date parsing locations:
- Line 454-459: Use helper
- Line 770-773: Use helper when setting calendarState

### Fix 3: Refetch or Push Booking After Create

**File**: `assets/js/components/bookingModal.js`

After successful booking creation (line ~1960):

```javascript
const savedBooking = await saveBooking(bookingData);
console.log('Booking saved successfully:', savedBooking);

// Trigger refresh of bookings list if on My Bookings page
if (window.refreshBookingsList) {
  window.refreshBookingsList();
}

// Clear calendar cache so it refreshes
if (window.clearCalendarCache) {
  window.clearCalendarCache();
}
```

**File**: `assets/js/pages/myBookings.js`

Add refresh function:

```javascript
// Export refresh function for external calls
window.refreshBookingsList = async function() {
  try {
    const result = await listBookings();
    allBookings = result?.data || result || [];
    // Re-render page or update table
    location.reload(); // Simple: reload page
  } catch (error) {
    console.error('Failed to refresh bookings:', error);
  }
};
```

### Fix 4: Add Date Comparison Logs

**File**: `assets/js/components/calendarModal.js`

In `isDateInRange()` function (around line 453):

```javascript
console.log('[Calendar] Comparing dates:', {
  checkin: checkinDate.toISOString(),
  checkout: checkoutDate.toISOString(),
  currentDate: currentDate.toISOString(),
  inRange: currentDate > checkinDate && currentDate < checkoutDate
});
```

---

## Verification Checklist

After applying fixes, test:

### Test 1: Create Booking for Oct 30-31
1. Navigate to Packages page
2. Click "Standard Room" → Calendar opens
3. Select Oct 30 as check-in, Oct 31 as check-out
4. Verify calendar highlights **30** and **31** (not 29)
5. Complete booking form and submit
6. Verify booking appears in My Bookings immediately
7. Click Re-Edit → Modal opens with pre-filled data matching booking

### Test 2: Availability Blocking
1. Create a booking for Oct 30-31 (all 4 rooms)
2. Attempt to create another booking for same dates
3. Verify error: "No rooms available for the selected dates."
4. Submit is blocked; form remains open

### Test 3: Calendar Auto-Update
1. Create a booking for Oct 30-31
2. Open calendar modal for same package
3. Verify Oct 30-31 show as `available-0` or `booked-all` status
4. Cancel the booking
5. Without page reload, open calendar again
6. Verify Oct 30-31 now show `available-all`

### Test 4: Re-Edit with Fresh Data
1. Create booking → Verify in My Bookings
2. Click Re-Edit without page reload
3. Verify modal opens with correct data
4. Change dates and save
5. Verify updated booking reflects new dates in My Bookings

---

## Code Snippets for Fixes

### Fix 1: Async setDates (bookingState.js)

```javascript
async setDates(checkin, checkout) {
  this.dates.checkin = checkin;
  this.dates.checkout = checkout;
  await this.updateAvailability();
},
```

### Fix 2: Calendar Date Normalization (calendarModal.js)

Add helper:
```javascript
function normalizeDateInput(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    const d = new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (typeof dateInput === 'string') {
    const normalized = dateInput.trim();
    const d = normalized.includes('T') 
      ? new Date(normalized)
      : new Date(normalized + 'T00:00:00');
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null;
}
```

Update isDateInRange:
```javascript
function isDateInRange(date) {
  if (!calendarState.selectedCheckin || !calendarState.selectedCheckout) {
    return false;
  }
  
  const checkinDate = normalizeDateInput(calendarState.selectedCheckin);
  const checkoutDate = normalizeDateInput(calendarState.selectedCheckout);
  const currentDate = normalizeDateInput(date);
  
  if (!checkinDate || !checkoutDate || !currentDate) return false;
  
  console.log('[Calendar] Comparing dates:', {
    checkin: checkinDate.toISOString(),
    checkout: checkoutDate.toISOString(),
    currentDate: currentDate.toISOString()
  });
  
  return currentDate > checkinDate && currentDate < checkoutDate;
}
```

### Fix 3: Booking List Refresh (bookingModal.js)

After line 1960:
```javascript
const savedBooking = await saveBooking(bookingData);
console.log('[Booking] Created booking with ID:', savedBooking?.id);
console.log('Booking saved successfully:', savedBooking);

// Refresh bookings list if available
if (typeof window.refreshBookingsList === 'function') {
  await window.refreshBookingsList();
}

// Clear calendar cache
if (window.clearCalendarCache) {
  window.clearCalendarCache();
}
```

---

## Test Plan

### Pre-Fix Baseline
- Document current behavior:
  - Calendar shows incorrect dates (29 vs 30-31)
  - Re-edit fails with "Booking not found"
  - Availability not blocking submissions (fixed)
  - `updateAvailability()` async issue causes crashes

### Post-Fix Verification
1. Date normalization test
   - Create booking 2025-10-30 to 2025-10-31
   - Inspect console: `[MockAvailability] Normalized checkIn:` shows correct ISO
   - Calendar highlights days 30 and 31

2. Re-edit flow test
   - Create booking → Verify in list
   - Click Re-Edit → Verify modal opens
   - Verify all fields pre-filled correctly

3. Availability blocking test
   - Book all 4 rooms for a date range
   - Attempt to book again for same dates
   - Verify error toast appears, form not submitted

4. Async state update test
   - Set dates in bookingState
   - Verify console: `[BookingState] updateAvailability complete` appears
   - Verify `availableRooms` is array (not Promise)

---

## Optional: calendarUtils.js Proposal

Create `assets/js/utils/calendarUtils.js`:

```javascript
// Date normalization utilities
export function parseDateToYMD(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return dateInput.toISOString().split('T')[0];
  }
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    return trimmed.includes('T') ? trimmed.split('T')[0] : trimmed;
  }
  return null;
}

export function ymdToUTCDate(ymdString) {
  if (!ymdString) return null;
  const d = new Date(ymdString + 'T00:00:00');
  d.setHours(0, 0, 0, 0);
  return d;
}

export function sameDay(date1, date2) {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  if (!d1 || !d2) return false;
  return d1.getTime() === d2.getTime();
}

export function normalizeDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    const d = new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (typeof dateInput === 'string') {
    const normalized = dateInput.trim();
    const d = normalized.includes('T') 
      ? new Date(normalized)
      : new Date(normalized + 'T00:00:00');
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null;
}

// Status to CSS class mapping
export function getStatusClass(status) {
  const statusMap = {
    'available-all': 'available-all',
    'available-1': 'available-1',
    'available-2': 'available-2',
    'available-3': 'available-3',
    'booked-all': 'booked-all',
    'cottage-available': 'cottage-available',
    'cottage-booked': 'cottage-booked',
    'past': 'past',
    'today': 'today'
  };
  return statusMap[status] || 'unknown';
}

// Availability merging helpers
export function mergeAvailability(dateAvailability1, dateAvailability2) {
  const merged = { ...dateAvailability1 };
  Object.keys(dateAvailability2).forEach(date => {
    if (merged[date]) {
      // Merge available rooms (union)
      const rooms1 = merged[date].availableRooms || [];
      const rooms2 = dateAvailability2[date].availableRooms || [];
      merged[date].availableRooms = [...new Set([...rooms1, ...rooms2])];
    } else {
      merged[date] = dateAvailability2[date];
    }
  });
  return merged;
}
```

**Usage**: Import and use in `calendarModal.js` and `bookingState.js` for consistent date handling.

---

## Summary of Files Requiring Changes

1. **assets/js/utils/bookingState.js**
   - Make `setDates()` async
   - Ensure `getAvailableCottages()` is async if needed

2. **assets/js/pages/packages.js**
   - Await `bookingState.setDates()` call

3. **assets/js/components/calendarModal.js**
   - Add date normalization helper
   - Use helper in `isDateInRange()` and state assignment

4. **assets/js/components/bookingModal.js**
   - Add booking list refresh after create (optional)

5. **assets/js/pages/myBookings.js**
   - Add `window.refreshBookingsList` function (optional)

**Optional**:
6. **assets/js/utils/calendarUtils.js** (new file)
   - Centralize date utilities

---

## Next Steps

1. Apply Fix 1 (async setDates) — **HIGH PRIORITY**
2. Apply Fix 2 (calendar date normalization) — **HIGH PRIORITY**
3. Test date mismatch resolution
4. Apply Fix 3 (booking list refresh) — **MEDIUM PRIORITY**
5. Add logging improvements — **LOW PRIORITY**
6. Create calendarUtils.js if desired — **OPTIONAL**

---

## Notes

- Mock database uses in-memory Map storage; bookings persist for server session only
- All booking IDs are strings (timestamp-based)
- Date strings should be in `YYYY-MM-DD` format
- Availability API returns per-date status; calendar renders accordingly
- Calendar cache clearing (`window.clearCalendarCache()`) is already in place


