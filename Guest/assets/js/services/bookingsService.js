import { getRunMode } from '../utils/config.js';
import { request, checkAvailability as checkAvailabilityApi, fetchUserBookings as fetchUserBookingsApi, createBooking as createBookingApi, updateBooking as updateBookingApi, cancelBooking as cancelBookingApi } from '../utils/api.js';

// Mock-first routing via existing api.js helpers which already respect mode

export async function getAvailability(packageId, checkIn, checkOut, category = null) {
  return checkAvailabilityApi(packageId, checkIn, checkOut, category);
}

export async function listBookings() {
  return fetchUserBookingsApi();
}

export async function createBooking(payload) {
  return createBookingApi(payload);
}

export async function updateBooking(bookingId, updates) {
  return updateBookingApi(bookingId, updates);
}

export async function cancelBooking(bookingId) {
  return cancelBookingApi(bookingId);
}



