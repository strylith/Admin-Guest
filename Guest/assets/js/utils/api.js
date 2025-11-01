import { getApiBase, getMockBase, isProduction as isProdEnv, getRunMode } from './config.js';

// Backend API configuration
const isProduction = isProdEnv();
const USE_CLIENT_STORAGE = isProduction;
const USE_MOCK_BOOKINGS = getRunMode() === 'mock';

const API_BASE = getApiBase();
const MOCK_API_BASE = getMockBase();

// Log which API is being used
console.log('🌐 API Configuration:');
console.log('  Location:', window.location.href);
console.log('  Hostname:', window.location.hostname);
console.log('  Is Production:', isProduction);
console.log('  Using Client Storage:', USE_CLIENT_STORAGE);
console.log('  Using Mock Bookings:', USE_MOCK_BOOKINGS);
console.log('  API_BASE:', API_BASE);
console.log('  MOCK_API_BASE:', MOCK_API_BASE);

// Helper function to get auth token
function getAuthToken() {
  return localStorage.getItem('auth_token');
}

// Helper function to make API requests
export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  const fullUrl = `${API_BASE}${endpoint}`;
  console.log('📡 API Request:', fullUrl);

  try {
    const response = await fetch(fullUrl, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
    
    // Detect connection refused errors
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Cannot connect to server. Please ensure the backend server is running on http://localhost:3000');
    }
    
    throw error;
  }
}

// Public request helper for consumers
export async function request(path, options = {}) {
  return apiRequest(path, options);
}

// Weather API (keeping mock for now)
export async function fetchWeatherSummary() {
  await new Promise(res => setTimeout(res, 300));
    return {
      location: 'Kina Resort',
      current: { tempC: 31, condition: 'Sunny', icon: '☀️' },
      nextDays: [
        { d: 'Mon', t: 30, c: 'Sunny' },
        { d: 'Tue', t: 29, c: 'Cloudy' },
        { d: 'Wed', t: 31, c: 'Sunny' },
        { d: 'Thu', t: 31, c: 'Sunny' },
        { d: 'Fri', t: 29, c: 'Partly Cloudy' },
        { d: 'Sat', t: 30, c: 'Sunny' },
        { d: 'Sun', t: 28, c: 'Showers' },
      ],
      suggestion: 'Best time to visit: sunny Fri–Mon afternoons.'
    };
  }

// Authentication API
export async function login(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  // Store token
  if (data.token) {
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
  }
  
  return data;
}

export async function register(userData) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName
    })
  });
  
  // Store token
  if (data.token) {
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
  }
  
  return data;
}

export async function logout() {
  try {
    await apiRequest('/auth/logout', {
      method: 'POST'
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
}

export async function resetPassword(email) {
  return await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function getCurrentUser() {
  try {
    const data = await apiRequest('/auth/me');
    return data.user;
  } catch (error) {
    // If not authenticated, return null
    return null;
  }
}

// Packages API
export async function fetchPackages(category = '') {
  // Use localStorage in production
  if (USE_CLIENT_STORAGE) {
    const { getAllPackages, getPackagesByCategory } = await import('./localStorage.js');
    const packages = category ? getPackagesByCategory(category) : getAllPackages();
    return packages;
  }
  
  const endpoint = category ? `/packages?category=${category}` : '/packages';
  const data = await apiRequest(endpoint);
  return data.data || [];
}

export async function fetchPackage(id) {
  // Use localStorage in production
  if (USE_CLIENT_STORAGE) {
    const { getPackageById } = await import('./localStorage.js');
    return getPackageById(id);
  }
  
  const data = await apiRequest(`/packages/${id}`);
  return data.data;
}

export async function fetchPackageAvailability(packageId, startDate, endDate) {
  const data = await apiRequest(
    `/packages/${packageId}/availability?start=${startDate}&end=${endDate}`
  );
  return data.data;
}

// Check booking availability (conditionally routed)
export async function checkAvailability(packageId, checkIn, checkOut, category = null, excludeBookingId = null) {
  // Use localStorage in production
  if (USE_CLIENT_STORAGE) {
    console.log('[ClientStorage] Checking availability via localStorage...');
    const { checkAvailability: checkStorageAvailability } = await import('./localStorage.js');
    return checkStorageAvailability(packageId, checkIn, checkOut, category);
  }
  
  // Build query parameters (dates expected as local YYYY-MM-DD)
  console.log('[Calendar] Availability request dates:', { checkInLocal: checkIn, checkOutLocal: checkOut, category });
  let queryParams = `checkIn=${checkIn}&checkOut=${checkOut}`;
  if (category) queryParams += `&category=${category}`;
  if (excludeBookingId) queryParams += `&excludeBookingId=${excludeBookingId}`;
  
  // Use mock API in development mode
  if (USE_MOCK_BOOKINGS) {
    console.log('[MockDB] Checking availability via mock API...', excludeBookingId ? `(excluding booking ${excludeBookingId})` : '');
    const url = `/bookings/availability/${packageId}?${queryParams}`;
    const data = await mockApiRequest(url, { method: 'GET' });
    
    // Detailed response logging for debugging
    console.log('[API Response] 📦 Full availability response:', data);
    console.log('[API Response] 📦 Response keys:', Object.keys(data || {}));
    if (data?.dateAvailability) {
      console.log('[API Response] 📦 dateAvailability keys:', Object.keys(data.dateAvailability));
      console.log('[API Response] 📦 dateAvailability structure:', data.dateAvailability);
    }
    if (category === 'function-halls') {
      console.log('[API Response] 🏛️ Function halls response - checking for availableHalls/bookedHalls');
      Object.entries(data?.dateAvailability || {}).forEach(([date, dayData]) => {
        console.log(`[API Response] 🏛️ ${date}: availableHalls=${JSON.stringify(dayData.availableHalls)}, bookedHalls=${JSON.stringify(dayData.bookedHalls)}`);
      });
    }
    
    return data;
  } else {
    const url = `/bookings/availability/${packageId}?${queryParams}`;
    const data = await apiRequest(url, { method: 'GET' });
    
    // Log response for real API too
    console.log('[API Response] 📦 Full availability response:', data);
    console.log('[API Response] 📦 Response keys:', Object.keys(data || {}));
    
    return data;
  }
}

// Bookings API - use mock API (no auth required)
async function mockApiRequest(endpoint, options = {}) {
  const fullUrl = `${MOCK_API_BASE}${endpoint}`;
  console.log('📡 Mock API Request:', fullUrl);

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Mock API request failed');
    }

    return data;
  } catch (error) {
    console.error('Mock API request error:', error);
    throw error;
  }
}

// Bookings API
export async function fetchUserBookings(filterByUser = true) {
  // Use localStorage in production
  if (USE_CLIENT_STORAGE) {
    console.log('[ClientStorage] Fetching user bookings from localStorage...');
    const { getAllBookings, getBookingsByUserId } = await import('./localStorage.js');
    const currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
    const allBookings = getAllBookings();
    // Filter by current user if logged in, otherwise return all (for demo)
    const userBookings = (filterByUser && currentUser.id) 
      ? getBookingsByUserId(currentUser.id)
      : allBookings;
    return { success: true, data: userBookings };
  }
  
  // Get user info for filtering if requested
  let endpoint = '/bookings';
  if (filterByUser) {
    const userInfo = getCurrentUserInfo();
    if (userInfo) {
      const params = new URLSearchParams();
      if (userInfo.id) params.append('userId', userInfo.id);
      if (userInfo.email) params.append('email', userInfo.email);
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
        console.log('[BookingAPI] Fetching bookings filtered by user:', { userId: userInfo.id, email: userInfo.email });
      }
    }
  } else {
    console.log('[BookingAPI] Fetching all bookings (no filter - for calendar)');
  }
  
  if (USE_MOCK_BOOKINGS) {
    console.log('[MockDB] Fetching user bookings from mock API...');
    const data = await mockApiRequest(endpoint);
    return data.data || [];
  } else {
    const data = await apiRequest(endpoint);
    return data.data || [];
  }
}

// Helper to get current user info
function getCurrentUserInfo() {
  if (window.kinaAuth && window.kinaAuth.getCurrentUser) {
    const user = window.kinaAuth.getCurrentUser();
    if (user) {
      return { id: user.id, email: user.email };
    }
  }
  // Fallback to auth state (synchronous import already available)
  try {
    const authState = window.getAuthState ? window.getAuthState() : null;
    if (authState && authState.user) {
      return { id: authState.user.id, email: authState.user.email };
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

export async function createBooking(bookingData) {
  // Use localStorage in production
  if (USE_CLIENT_STORAGE) {
    console.log('[ClientStorage] Creating booking in localStorage...');
    const { createBooking: createStorageBooking } = await import('./localStorage.js');
    const currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
    const booking = createStorageBooking({
      ...bookingData,
      userId: currentUser.id || 'guest-' + Date.now(),
      email: currentUser.email || null
    });
    return { success: true, data: booking };
  }
  
  // Attach user info to booking data
  const userInfo = getCurrentUserInfo();
  if (userInfo) {
    bookingData.userId = userInfo.id;
    bookingData.email = userInfo.email;
    console.log('[BookingAPI] Attached user info to booking:', { userId: userInfo.id, email: userInfo.email });
  } else {
    console.warn('[BookingAPI] No user logged in, booking will be created without user association');
  }
  
  if (USE_MOCK_BOOKINGS) {
    console.log('[MockDB] Creating booking via mock API...');
    const data = await mockApiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
    console.log(`[BookingAPI] Created booking using ${USE_MOCK_BOOKINGS ? 'mock' : 'real'} API`);
    return data.data;
  } else {
    // Send full payload so backend can persist items and meta
    const data = await apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
    console.log(`[BookingAPI] Created booking using ${USE_MOCK_BOOKINGS ? 'mock' : 'real'} API`);
    return data.data;
  }
}

export async function updateBooking(bookingId, updates) {
  // Use localStorage in production
  if (USE_CLIENT_STORAGE) {
    console.log('[ClientStorage] Updating booking in localStorage...');
    const { updateBooking: updateStorageBooking } = await import('./localStorage.js');
    const updated = updateStorageBooking(bookingId, updates);
    return { success: true, data: updated };
  }
  
  // Attach user info for permission checking
  const userInfo = getCurrentUserInfo();
  if (userInfo) {
    updates.userId = userInfo.id;
    updates.email = userInfo.email;
    console.log('[BookingAPI] Attached user info to update request:', { userId: userInfo.id, email: userInfo.email });
  }
  
  if (USE_MOCK_BOOKINGS) {
    console.log('[MockDB] Updating booking via mock API...');
    const data = await mockApiRequest(`/bookings/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    return data.data;
  } else {
    const data = await apiRequest(`/bookings/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    return data.data;
  }
}

export async function cancelBooking(bookingId) {
  // Use localStorage in production
  if (USE_CLIENT_STORAGE) {
    console.log('[ClientStorage] Cancelling booking in localStorage...');
    const { cancelBooking: cancelStorageBooking } = await import('./localStorage.js');
    cancelStorageBooking(bookingId);
    return { success: true, message: 'Booking cancelled successfully' };
  }
  
  // Attach user info for permission checking via query params
  const userInfo = getCurrentUserInfo();
  let endpoint = `/bookings/${bookingId}`;
  if (userInfo) {
    const params = new URLSearchParams({
      userId: userInfo.id,
      email: userInfo.email
    });
    endpoint += `?${params.toString()}`;
    console.log('[BookingAPI] Attached user info to cancel request:', { userId: userInfo.id, email: userInfo.email });
  }
  
  if (USE_MOCK_BOOKINGS) {
    console.log('[MockDB] Cancelling booking via mock API...');
    const data = await mockApiRequest(endpoint, {
      method: 'DELETE'
    });
    return data;
  } else {
    const data = await apiRequest(endpoint, {
      method: 'DELETE'
    });
    return data;
  }
}

export async function getBooking(bookingId) {
  const data = await apiRequest(`/bookings/${bookingId}`);
  return data.data;
}

// Users API
export async function fetchUserProfile() {
  const data = await apiRequest('/users/profile');
  return data.data;
}

export async function updateUserProfile(profileData) {
  const data = await apiRequest('/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(profileData)
  });
  return data.data;
}


