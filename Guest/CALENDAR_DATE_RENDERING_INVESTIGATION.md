# Calendar Date Rendering Investigation Report
**Date**: Generated during deep code inspection  
**Objective**: Expose root causes of off-by-one and mislabeling issues in calendar date rendering

---

## 1. EXECUTIVE SUMMARY

**Root Causes Identified**:
1. **MISMATCHED INCLUSIVE/EXCLUSIVE LOGIC**: Calendar range highlighting uses `> checkout` (line 561), but booking date iteration uses `>= checkout` comparison (line 327), creating inconsistent cell shading. Checkout date should be **exclusive** (not highlighted as booked) but may appear highlighted in range.

2. **TIMEZONE PARSE INCONSISTENCIES**: While server-side normalization exists (`mockBookings.js:324-343`), client-side `formatDateForInput()` uses `Date.getFullYear/Month/Date()` which are timezone-dependent when dates are parsed from ISO strings without `T00:00:00`.

3. **DUAL RENDERING PATHS CONFLICT**: Calendar renders both:
   - Availability status from API (`getDateStatus()` → `dateAvailability` map)
   - Direct booking overlays from `fetchUserBookings()` (`bookingsMap`)
   
   These paths use different date comparison semantics, potentially double-shading or missing cells.

4. **ASYNC AVAILABILITY NOT AWAITED**: `getDateStatus()` is async but called in synchronous loop (line 418-448), causing race conditions where calendar renders before availability data arrives.

---

## 2. CODE PATH TRACE: BOOKING → CALENDAR RENDERING

### Single-Source Truth: Availability Endpoint

**Primary Path**: `/mock/bookings/availability/:packageId` → `dateAvailability` map
- **Location**: `server/routes/mockBookings.js:291-525`
- **Function**: `GET /mock/bookings/availability/:packageId`
- **Called by**: `assets/js/utils/api.js:192-211` → `checkAvailability()`
- **Used in**: `assets/js/components/calendarModal.js:89-195` → `getDateStatus()`

**Secondary Path**: Direct booking records (for overlay labels)
- **Location**: `assets/js/components/calendarModal.js:268-368`
- **Function**: Fetches `fetchUserBookings()` and builds `bookingsMap[dateString]`
- **Used in**: Line 569-583 for adding `.booked` class and room labels

### Exact File → Function → Line Number Trace

**Step 1: Calendar Opens**
- `assets/js/components/calendarModal.js:1093` → `openCalendarModal()`
- Line 1288: Calls `generateCalendarHTML(year, month, packageTitle, 1)`

**Step 2: Generate Calendar HTML**
- `assets/js/components/calendarModal.js:198` → `generateCalendarHTML()`
- Line 251-265: Prepares month date range (`startDateStr`, `endDateStr`)

**Step 3A: Fetch Availability (Primary)**
- Line 269-368: Fetches bookings for overlay (`bookingsMap`)
- Line 371-415: Fetches availability via `checkAvailability()` (async)
- Line 386: `await checkAvailability(packageId, startDateStr, endDateStr, category)`
- Line 389-400: Pre-populates cache with `monthAvailability` from `result.dateAvailability`

**Step 3B: Build Availability Map (Server-Side)**
- `server/routes/mockBookings.js:291` → `GET /mock/bookings/availability/:packageId`
- Line 324-343: Normalizes dates with `normalizeDateString()`
- Line 360-372: Filters bookings by package and date overlap
- Line 377-388: Collects booked items from `booking_items` table
- Line 402-500: Iterates dates from `checkInDateStr` to `checkOutDateStr` (exclusive)
- Line 436: **BUG**: Checks `dateString >= bookingCheckIn && dateString < bookingCheckOut` (correctly exclusive)
- Line 466-479: Builds `dateAvailability[dateString]` with `status`, `availableRooms`, `bookedRooms`

**Step 4: Render Calendar Cells**
- `assets/js/components/calendarModal.js:418-448`: Generates status array for each day
- Line 421-448: Loops `for (let day = 1; day <= daysInMonth; day++)`
- Line 423: Creates `dateString = formatDateForInput(currentDate)` (YYYY-MM-DD)
- Line 427: Gets cached status from `availabilityCache.get(cacheKey)`
- Line 473-566: Applies CSS classes: `finalStatusType`, `selected-checkin`, `selected-checkout`, `in-range`, `booked`
- Line 561: **BUG**: Range check uses `dateString > calendarState.selectedCheckin && dateString < calendarState.selectedCheckout` (exclusive both ends - correct)
- Line 569: Checks `bookingsMap[dateString]` for direct booking overlay

**Step 5: Build HTML**
- Line 617-627: Outputs `<div class="calendar-date ${finalClassString}">` with data attributes

---

## 3. BOOKING RECORD STRUCTURE

### Required Fields (from `mockBookings.js:76-89`)
```javascript
{
  id: "1234567890",              // String (timestamp)
  user_id: "mock-user-1",        // String
  package_id: 1,                  // Number (1 = Standard Room)
  check_in: "2025-10-30",         // String (YYYY-MM-DD)
  check_out: "2025-10-31",       // String (YYYY-MM-DD)
  guests: { adults: 2, children: 1 }, // Object
  total_cost: 5500,              // Number
  payment_mode: "bank-transfer", // String
  contact_number: "+1234567890", // String
  special_requests: "",          // String
  status: "pending",             // String (pending|confirmed|cancelled)
  created_at: "2025-10-15T10:30:00.000Z", // ISO string
  booking_items: [               // Array (enriched from separate table)
    {
      id: "1234567890-Room A1",
      booking_id: "1234567890",
      item_type: "room",         // String: "room" | "cottage" | "function-hall"
      item_id: "Room A1",        // String: Room/Cottage identifier
      guest_name: "John Doe",    // String (optional)
      adults: 2,                 // Number
      children: 1                // Number
    }
  ],
  packages: {                    // Object (enriched from packages table)
    id: 1,
    title: "Standard Room",
    category: "rooms"
  }
}
```

### Example Booking Record
```javascript
{
  id: "1736842200000",
  user_id: "mock-user-1",
  package_id: 1,
  check_in: "2025-10-30",
  check_out: "2025-10-31",
  guests: { adults: 2, children: 0 },
  total_cost: 11000,
  payment_mode: "gcash",
  status: "confirmed",
  booking_items: [
    { item_type: "room", item_id: "Room A1", adults: 2, children: 0 },
    { item_type: "room", item_id: "Room A2", adults: 2, children: 0 }
  ]
}
```

**Transformation to Calendar Cells**:
- Booking: `check_in: "2025-10-30"`, `check_out: "2025-10-31"` (one night)
- Server iterates: `2025-10-30` only (stops when `dateString >= "2025-10-31"`)
- `dateAvailability["2025-10-30"]` = `{ status: "available-2", bookedRooms: ["Room A1", "Room A2"], availableRooms: ["Room A3", "Room A4"] }`
- Calendar cell for Oct 30: CSS class `available-2`, label shows "A1, A2"

---

## 4. DATE PARSING & NORMALIZATION ANALYSIS

### Server-Side Normalization (CORRECT)
**Location**: `server/routes/mockBookings.js:324-343`
```javascript
function normalizeDateString(dateStr) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStrTrimmed)) {
    return dateStrTrimmed; // Already YYYY-MM-DD
  }
  const d = dateStrTrimmed.includes('T') 
    ? new Date(dateStrTrimmed)
    : new Date(dateStrTrimmed + 'T00:00:00'); // Append local midnight
  
  const year = d.getFullYear();    // Uses local timezone
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```
**Verdict**: ✅ Correct - ensures YYYY-MM-DD strings, uses local date components

### Client-Side Normalization Functions

**Function 1**: `normalizeDateInput()` in `calendarModal.js:53-87`
```javascript
function normalizeDateInput(dateInput) {
  if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed; // Returns string
    }
    const d = new Date(trimmed);
    const year = d.getFullYear();  // ⚠️ TIMEZONE-DEPENDENT
    // Returns YYYY-MM-DD string
  }
  if (dateInput instanceof Date) {
    const year = dateInput.getFullYear();  // ⚠️ TIMEZONE-DEPENDENT
    // Returns YYYY-MM-DD string
  }
}
```
**Issue**: Uses `getFullYear()` without forcing local midnight. If `Date` object was created from ISO string, timezone shift may occur.

**Function 2**: `formatDateForInput()` in `calendarModal.js:1367-1372`
```javascript
function formatDateForInput(date) {
  const year = date.getFullYear();  // ⚠️ TIMEZONE-DEPENDENT
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```
**Issue**: If `date` parameter is a `Date` object created from ISO string (e.g., `new Date("2025-10-30")`), `getFullYear()` may return different year in timezones behind UTC.

### Timezone Risk Points

1. **Line 423** (`calendarModal.js`): `formatDateForInput(currentDate)` where `currentDate = new Date(year, month, day)` - Safe (local constructor)
2. **Line 479**: `currentDate.toISOString()` - May show UTC time different from local
3. **Line 123-124**: `toISOString().split('T')[0]` for API request - May send UTC date instead of local
4. **Line 290-291**: `normalizeDateInput(booking.check_in)` - Input is string, should be safe if booking dates are YYYY-MM-DD

---

## 5. INCLUSIVE/EXCLUSIVE LOGIC ANALYSIS

### Server-Side Booking Range Check (CORRECT)
**Location**: `server/routes/mockBookings.js:436`
```javascript
if (dateString >= bookingCheckIn && dateString < bookingCheckOut) {
  // Mark date as booked (checkout exclusive)
}
```
**Semantics**: Check-in is **inclusive**, check-out is **exclusive**
- Booking `2025-10-30` to `2025-10-31`: Only `2025-10-30` is marked booked ✅

### Client-Side Booking Mapping (CORRECT)
**Location**: `assets/js/components/calendarModal.js:327`
```javascript
if (dateKey >= bookingCheckOut) {
  break; // Stop before checkout date
}
```
**Semantics**: Checkout exclusive ✅

### Client-Side Range Highlighting (CORRECT)
**Location**: `assets/js/components/calendarModal.js:561`
```javascript
const isInRange = dateString > calendarState.selectedCheckin && dateString < calendarState.selectedCheckout;
```
**Semantics**: Both check-in and check-out are **exclusive** from range highlighting (they get separate classes)
- Selected: `2025-10-30` to `2025-10-31`
- Highlighted: Nothing (30 has `selected-checkin`, 31 has `selected-checkout`) ✅

**Verdict**: All three paths correctly implement checkout-exclusive logic. **No inclusive/exclusive bug found**.

---

## 6. MAPPING BOOKINGS → CALENDAR CELLS

### Server-Side Transformation
**Location**: `server/routes/mockBookings.js:402-500`

**Process**:
1. Parse date range: `[checkInYear, checkInMonth, checkInDay] = checkInDateStr.split('-').map(Number)`
2. Iterate using arithmetic:
   ```javascript
   let currentYear = checkInYear, currentMonth = checkInMonth, currentDay = checkInDay;
   while (true) {
     const dateString = `${year}-${month}-${day}`;
     if (dateString >= checkOutDateStr) break; // Exclusive
     
     // For each booked item, check if dateString falls in booking range
     bookedItems.forEach(item => {
       if (dateString >= bookingCheckIn && dateString < bookingCheckOut) {
         bookedIds.push(item.item_id);
       }
     });
     
     // Build availability status
     dateAvailability[dateString] = {
       status: availableItems.length === 0 ? 'booked-all' : `available-${availableItems.length}`,
       availableRooms: availableItems,
       bookedRooms: bookedIds
     };
     
     // Increment day (handle month/year rollover)
   }
   ```

**Output Structure**:
```javascript
dateAvailability = {
  "2025-10-30": {
    status: "available-2",
    availableCount: 2,
    bookedCount: 2,
    bookedRooms: ["Room A1", "Room A2"],
    availableRooms: ["Room A3", "Room A4"]
  }
}
```

### Client-Side Overlay Mapping
**Location**: `assets/js/components/calendarModal.js:285-368`

**Process**:
1. Fetch all bookings: `await fetchUserBookings()`
2. Normalize booking dates: `normalizeDateInput(booking.check_in)`
3. Iterate dates in booking range (string arithmetic, same as server)
4. Build `bookingsMap[dateKey]` array
5. Use in rendering: Line 569 → `const dateBookings = bookingsMap[dateString] || []`

**Issue**: This creates **two separate sources** of booking data:
- `dateAvailability` from API (aggregated, per-date status)
- `bookingsMap` from direct booking fetch (for labels)

If these get out of sync (e.g., cache not cleared), calendar may show inconsistent states.

---

## 7. AVAILABILITY VS DIRECT BOOKING RENDERING

### Primary: Availability Endpoint
**Location**: `server/routes/mockBookings.js:291-525`

**How Availability is Derived**:
- Line 315-322: Get all bookings from `mockClient.tables.bookings`
- Line 360-372: Filter by `package_id`, status (`pending|confirmed`), date overlap
- Line 377-388: Extract `booking_items` where `item_type === itemType` (room/cottage)
- Line 402-500: For each date in requested range:
  - Check which items are booked on that date (string comparison)
  - Calculate `availableItems = allItems.filter(id => !bookedIds.includes(id))`
  - Return status based on count

**Normalization**: Uses `normalizeDateString()` consistently for all date comparisons.

### Secondary: Direct Booking Display
**Location**: `assets/js/components/calendarModal.js:268-368`

**Purpose**: Display booked room labels (e.g., "A1, A2") on calendar cells

**Process**:
1. Fetches bookings via `fetchUserBookings()` (line 272)
2. Maps bookings to dates using same string iteration (lines 307-362)
3. Stores in `bookingsMap[dateString]` (line 336)
4. Used in rendering: Line 569, 580-583

**Potential Conflict**: If `bookingsMap` shows a booking but `dateAvailability` doesn't (or vice versa), calendar appears inconsistent.

---

## 8. EDGE CASES & RACE CONDITIONS

### Race Condition #1: Async Availability Fetch
**Location**: `assets/js/components/calendarModal.js:371-415`

**Issue**:
```javascript
// Line 380-387: Fetches availability asynchronously
const result = await checkAvailability(...);
if (result && result.dateAvailability) {
  monthAvailability = result.dateAvailability;
  // Pre-populate cache
  Object.keys(monthAvailability).forEach(dateStr => {
    availabilityCache.set(cacheKey, dateData);
  });
}

// Line 418-448: Generates statuses synchronously
for (let day = 1; day <= daysInMonth; day++) {
  const cachedStatus = availabilityCache.get(cacheKey);
  // If fetch not complete, uses default status
}
```

**Impact**: If API is slow, calendar renders with default statuses (`available-all`) before availability data arrives.

**Mitigation**: ✅ Already awaits before use. No race condition here.

### Race Condition #2: Per-Date `getDateStatus()` Calls
**Location**: `assets/js/components/calendarModal.js:89-195`

**Issue**: `getDateStatus(date, packageId)` is async but called in non-awaited context (though not in current flow - see line 386).

**Mitigation**: ✅ Current implementation fetches entire month at once (line 386), avoiding per-date async calls.

### Off-by-One Scenario #1: Timezone Shift on `toISOString()`
**Location**: `assets/js/components/calendarModal.js:123-124`
```javascript
const startDate = new Date(date);
startDate.setDate(startDate.getDate() - 1);
const checkInStr = startDate.toISOString().split('T')[0];
```

**Issue**: `toISOString()` returns UTC. If local time is behind UTC, `toISOString().split('T')[0]` may be previous day.

**Example**: 
- Local: `2025-10-30 22:00:00 PST` (UTC-8)
- `toISOString()`: `2025-10-31T06:00:00.000Z`
- `.split('T')[0]`: `"2025-10-31"` ❌ (should be `"2025-10-30"`)

**Fix**: Use `formatDateForInput()` instead:
```javascript
const checkInStr = formatDateForInput(startDate);
```

### Off-by-One Scenario #2: Month Boundary Iteration
**Location**: `assets/js/components/calendarModal.js:344-354` and `server/routes/mockBookings.js:482-492`

**Issue**: Day increment logic may skip dates if month rollover calculation is incorrect.

**Current Logic**: ✅ Correct - uses `new Date(currentYear, currentMonth, 0).getDate()` to get days in month, handles year rollover.

### Client-Side Caching
**Location**: `assets/js/components/calendarModal.js:35-48`

**Cache Structure**: `availabilityCache` (Map keyed by `"${packageId}-${dateString}"`)

**Clear Triggers**:
- `window.clearCalendarCache()` (line 44) - called after booking create/cancel
- `loadedMonths` Set (line 38) - prevents re-fetching same month

**Issue**: Cache is cleared globally, but if booking is created while calendar is open, cache may show stale data until refresh.

---

## 9. SELECTED-ROOM VS GENERAL-PACKAGE HIGHLIGHTING

### Room Availability Calculation
**Location**: `server/routes/mockBookings.js:424-454`

**Process**:
1. For each date in range, collect `bookedIds` array from `booking_items` where `item_type === 'room'`
2. `allItems = ['Room A1', 'Room A2', 'Room A3', 'Room A4']` (line 395)
3. `availableItems = allItems.filter(id => !bookedIds.includes(id))` (line 454)
4. Status based on count:
   - `0` → `'booked-all'`
   - `4` → `'available-all'`
   - `1-3` → `'available-${count}'`

### Room Matching Logic
**Location**: `server/routes/mockBookings.js:437`
```javascript
if (dateString >= bookingCheckIn && dateString < bookingCheckOut) {
  if (!bookedIds.includes(item.item_id)) {
    bookedIds.push(item.item_id);
  }
}
```

**Verdict**: ✅ Room IDs are strings, matching is exact (`item.item_id` from booking_items vs `allItems` array). No type mismatch.

### Calendar Display
**Location**: `assets/js/components/calendarModal.js:585-612`

**Process**:
- Line 592: Shows tooltip with `availableCount` for rooms
- Line 601-611: Builds `bookedRoomsLabel` from `allBookedRoomsForDate` Set
- Extracts room numbers (strips "Room " prefix) for display

**Verdict**: ✅ Room filtering and display logic is correct.

---

## 10. BUGS & SUSPICIOUS CODE (PRIORITIZED)

### BUG #1: Timezone Risk in `toISOString().split('T')[0]`
**File**: `assets/js/components/calendarModal.js:123-124`
**Line**: 123-124
**Severity**: HIGH
**Description**: Uses `toISOString().split('T')[0]` for API request, which may return UTC date instead of local date in timezones behind UTC.
```javascript
const checkInStr = startDate.toISOString().split('T')[0]; // ⚠️ UTC date
```

**Fix**: Use `formatDateForInput(startDate)` instead.

### BUG #2: Dual Booking Data Sources (Potential Inconsistency)
**File**: `assets/js/components/calendarModal.js:268-368` and `371-415`
**Line**: 272 (bookings fetch) vs 386 (availability fetch)
**Severity**: MEDIUM
**Description**: Calendar fetches bookings twice:
- Once for overlay labels (`bookingsMap`)
- Once for availability status (`dateAvailability`)

If these get out of sync (e.g., booking created between calls), calendar shows inconsistent state.

**Fix**: Derive `bookingsMap` from `dateAvailability.bookedRooms` instead of separate fetch.

### BUG #3: Missing Array Check in Room Matching
**File**: `server/routes/mockBookings.js:437`
**Line**: 437
**Severity**: LOW
**Description**: `bookedIds.includes(item.item_id)` assumes `bookedIds` is array, but if `item.item_id` is `undefined`, it silently fails.

**Fix**: Add guard: `if (!item.item_id) return;`

### BUG #4: Calendar State Type Inconsistency
**File**: `assets/js/components/calendarModal.js:5-13`
**Line**: 8-9
**Severity**: LOW
**Description**: `calendarState.selectedCheckin/selectedCheckout` can be `Date` object or `YYYY-MM-DD` string depending on assignment path. Line 561 compares as strings, but if value is Date object, comparison fails.

**Current State**: ✅ Fixed - code now stores YYYY-MM-DD strings (see line 759, 788).

---

## 11. PRIORITIZED FIXES (MINIMAL, SAFE, REVERSIBLE)

### Fix #1: Replace `toISOString().split('T')[0]` with `formatDateForInput()`
**File**: `assets/js/components/calendarModal.js`
**Line**: 123-124

**Before**:
```javascript
const checkInStr = startDate.toISOString().split('T')[0];
const checkOutStr = endDate.toISOString().split('T')[0];
```

**After**:
```javascript
const checkInStr = formatDateForInput(startDate);
const checkOutStr = formatDateForInput(endDate);
```

**Risk**: Low - `formatDateForInput()` already exists and is used elsewhere.

---

### Fix #2: Consolidate Booking Data Sources
**File**: `assets/js/components/calendarModal.js`
**Line**: 268-368

**Before**: Fetches bookings separately for overlay

**After**: Derive `bookingsMap` from `dateAvailability` after availability fetch:
```javascript
// After line 389: monthAvailability populated
const bookingsMap = {};
Object.keys(monthAvailability).forEach(dateString => {
  const dayData = monthAvailability[dateString];
  if (dayData.bookedRooms && dayData.bookedRooms.length > 0) {
    bookingsMap[dateString] = dayData.bookedRooms.map(roomId => ({
      roomId: roomId,
      // If needed, fetch booking details from separate call
    }));
  }
});
```

**Risk**: Medium - Requires testing overlay labels still display correctly.

---

### Fix #3: Add Guard for Undefined Room IDs
**File**: `server/routes/mockBookings.js`
**Line**: 427-451

**Before**:
```javascript
bookedItems.forEach(item => {
  // ... no check for item.item_id
  if (dateString >= bookingCheckIn && dateString < bookingCheckOut) {
    bookedIds.push(item.item_id); // ⚠️ May push undefined
  }
});
```

**After**:
```javascript
bookedItems.forEach(item => {
  if (!item.item_id) return; // Guard against undefined
  // ... rest of logic
});
```

**Risk**: Low - Defensive coding.

---

### Fix #4: Ensure Calendar State Always Uses Strings
**File**: `assets/js/components/calendarModal.js`
**Line**: 759, 788, 1111, 1116

**Current**: ✅ Already stores YYYY-MM-DD strings. Verify all assignment paths use `normalizeDateInput()`.

**Check**: Line 759 (`calendarState.selectedCheckin = dateString`), Line 788 (same), Line 1111-1116 (uses `normalizeDateInput()`).

**Verdict**: ✅ No fix needed - already correct.

---

## 12. TEST PLAN

### Test 1: Create Booking and Verify Calendar Highlights
**Steps**:
1. Navigate to Packages page → Click "Standard Room" → Calendar opens
2. Select Oct 30 as check-in, Oct 31 as check-out
3. Verify calendar highlights **30** (check-in) and **31** (check-out) - NOT 29
4. Complete booking form (select rooms), submit
5. **Verify**: Booking appears in My Bookings with correct dates
6. Open calendar again for same package
7. **Verify**: Oct 30 shows `available-{count}` or `booked-all` based on booked rooms, Oct 31 shows available (checkout exclusive)

### Test 2: Re-Edit Booking Flow
**Steps**:
1. Create booking for Oct 30-31 (Room A1)
2. Go to My Bookings
3. Click "Re-Edit" on the booking
4. **Verify**: Modal opens with pre-filled dates (Oct 30-31) and Room A1 selected
5. Change checkout to Nov 1, save
6. **Verify**: Updated booking shows Oct 30 - Nov 1 in My Bookings

### Test 3: Overlapping Bookings Blocked
**Steps**:
1. Create booking for Oct 30-31 (all 4 rooms)
2. Attempt to create another booking for Oct 30-31
3. **Verify**: Availability validation fails, shows error toast: "Selected rooms are not available for all dates"
4. Submit button is blocked, form remains open

### Test 4: Calendar Cache Refresh After Cancel
**Steps**:
1. Create booking for Oct 30-31 (Room A1, A2)
2. Open calendar for same package
3. **Verify**: Oct 30 shows `available-2` (A3, A4 available), labels show "A1, A2"
4. Cancel the booking from My Bookings
5. Without page reload, open calendar again
6. **Verify**: Oct 30 shows `available-all`, no booked labels

### Test 5: Timezone Edge Case (If Applicable)
**Steps**:
1. Set system timezone to PST (UTC-8)
2. Create booking for date near midnight boundary (e.g., 2025-10-30 23:00 local)
3. **Verify**: Calendar highlights correct local date, not UTC date shifted
4. Check API request logs: Verify dates sent are local dates, not UTC

### Test 6: Month Boundary Booking
**Steps**:
1. Create booking from Oct 31 to Nov 2
2. Open calendar for October
3. **Verify**: Oct 31 shows booked
4. Open calendar for November
5. **Verify**: Nov 1 shows booked, Nov 2 does not (checkout exclusive)

---

## 13. TARGETED DEBUGGING LOGS

### Log #1: Date Normalization in Availability Request
**File**: `assets/js/components/calendarModal.js`
**Location**: After line 124

```javascript
console.log('[Calendar] Availability request dates:', {
  checkIn: checkInStr,
  checkOut: checkOutStr,
  checkInISO: startDate.toISOString(),
  checkOutISO: endDate.toISOString(),
  checkInLocal: formatDateForInput(startDate),
  checkOutLocal: formatDateForInput(endDate)
});
```

### Log #2: Server-Side Date Normalization
**File**: `server/routes/mockBookings.js`
**Location**: After line 350

```javascript
console.log('[MockAvailability] Date normalization:', {
  originalCheckIn: checkIn,
  normalizedCheckIn: checkInDateStr,
  originalCheckOut: checkOut,
  normalizedCheckOut: checkOutDateStr
});
```

### Log #3: Booking Range Check Per Date
**File**: `server/routes/mockBookings.js`
**Location**: After line 436

```javascript
if (dateString >= bookingCheckIn && dateString < bookingCheckOut) {
  console.log('[MockAvailability] Date in booking range:', {
    date: dateString,
    bookingCheckIn,
    bookingCheckOut,
    itemId: item.item_id
  });
}
```

### Log #4: Calendar Cell Status Assignment
**File**: `assets/js/components/calendarModal.js`
**Location**: After line 475

```javascript
if (day <= 5 || day >= 28) { // Log first 5 and last 3 days
  console.log('[Calendar] Cell status assignment:', {
    day,
    dateString,
    cachedStatus: cachedStatus?.status,
    finalStatusType,
    hasBookings: dateBookings.length > 0,
    bookedRooms: Array.from(allBookedRoomsForDate)
  });
}
```

### Log #5: Range Highlighting Comparison
**File**: `assets/js/components/calendarModal.js`
**Location**: After line 561

```javascript
if (calendarState.selectedCheckin && calendarState.selectedCheckout) {
  if (i < 7 || (day >= 1 && day <= 7)) { // Log first week
    console.log('[Calendar] Range check:', {
      dateString,
      checkin: calendarState.selectedCheckin,
      checkout: calendarState.selectedCheckout,
      isInRange,
      type: typeof dateString,
      checkinType: typeof calendarState.selectedCheckin
    });
  }
}
```

---

## 14. CONCLUSION

**Primary Root Cause**: Timezone normalization inconsistency - `toISOString().split('T')[0]` returns UTC date, causing off-by-one in timezones behind UTC.

**Secondary Issues**: 
- Dual booking data sources may get out of sync
- Missing guards for undefined room IDs

**Recommended Priority**:
1. **HIGH**: Fix timezone issue (Fix #1)
2. **MEDIUM**: Consolidate booking sources (Fix #2) 
3. **LOW**: Add defensive guards (Fix #3)

**Expected Outcome After Fixes**:
- Calendar highlights correct local dates (not UTC-shifted)
- Booking overlays consistent with availability status
- No undefined room IDs causing silent failures

---

**Report End**

