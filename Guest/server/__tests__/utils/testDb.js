// Test Database Utilities for Supabase Integration Tests
import { getSupabaseService } from '../../db/supabaseClient.js';
import { randomUUID } from 'crypto';

const supabase = getSupabaseService();

// Store created test data for cleanup
const testData = {
  users: new Set(),
  bookings: new Set(),
  packages: new Set(),
  bookingItems: new Set()
};

/**
 * Generate a unique test email
 */
export function generateTestEmail() {
  return `test-${randomUUID()}@example.com`;
}

/**
 * Generate a unique test user ID
 */
export function generateTestUserId() {
  return randomUUID();
}

/**
 * Create a test user in Supabase Auth and kina.users table
 */
export async function createTestUser(userData = {}) {
  const userId = generateTestUserId();
  const email = userData.email || generateTestEmail();
  const firstName = userData.firstName || 'Test';
  const lastName = userData.lastName || 'User';

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      id: userId,
      email,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    });

    if (authError) throw authError;

    // Create user profile in kina.users
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        loyalty_points: userData.loyaltyPoints || 0,
        total_bookings: userData.totalBookings || 0
      })
      .select()
      .single();

    if (profileError) throw profileError;

    // Track for cleanup
    testData.users.add(userId);

    return {
      id: userId,
      email,
      firstName,
      lastName,
      authUser: authData.user,
      profile: profileData
    };
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

/**
 * Create test packages
 */
export async function createTestPackages(packages = []) {
  const defaultPackages = packages.length > 0 ? packages : [
    {
      title: 'Standard Room',
      category: 'rooms',
      price: '₱5,500/night',
      capacity: 4,
      description: 'Comfortable room with air conditioning',
      image_url: 'images/room1.jpg'
    },
    {
      title: 'Beachfront Cottage',
      category: 'cottages',
      price: '₱9,500/night',
      capacity: 6,
      description: 'Beach access cottage',
      image_url: 'images/cottage1.jpg'
    }
  ];

  try {
    const { data, error } = await supabase
      .from('packages')
      .insert(defaultPackages)
      .select();

    if (error) throw error;

    // Track for cleanup
    data.forEach(pkg => testData.packages.add(pkg.id));

    return data;
  } catch (error) {
    console.error('Error creating test packages:', error);
    throw error;
  }
}

/**
 * Create a test booking
 */
export async function createTestBooking(bookingData = {}) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        user_id: bookingData.user_id,
        package_id: bookingData.package_id,
        check_in: bookingData.check_in || new Date().toISOString().split('T')[0],
        check_out: bookingData.check_out || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        guests: bookingData.guests || { adults: 2, children: 0 },
        status: bookingData.status || 'pending',
        total_cost: bookingData.total_cost || 5500,
        payment_mode: bookingData.payment_mode || 'cash',
        contact_number: bookingData.contact_number || '+639123456789'
      })
      .select()
      .single();

    if (error) throw error;

    // Track for cleanup
    testData.bookings.add(data.id);

    return data;
  } catch (error) {
    console.error('Error creating test booking:', error);
    throw error;
  }
}

/**
 * Clean up test data created during tests
 */
export async function cleanupTestData() {
  const errors = [];

  // Clean up booking items first (foreign key constraint)
  if (testData.bookingItems.size > 0) {
    try {
      const { error } = await supabase
        .from('booking_items')
        .delete()
        .in('id', Array.from(testData.bookingItems));
      
      if (error) errors.push({ table: 'booking_items', error });
    } catch (error) {
      errors.push({ table: 'booking_items', error });
    }
  }

  // Clean up bookings
  if (testData.bookings.size > 0) {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .in('id', Array.from(testData.bookings));
      
      if (error) errors.push({ table: 'bookings', error });
    } catch (error) {
      errors.push({ table: 'bookings', error });
    }
  }

  // Clean up packages
  if (testData.packages.size > 0) {
    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .in('id', Array.from(testData.packages));
      
      if (error) errors.push({ table: 'packages', error });
    } catch (error) {
      errors.push({ table: 'packages', error });
    }
  }

  // Clean up user profiles
  if (testData.users.size > 0) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .in('id', Array.from(testData.users));
      
      if (error) errors.push({ table: 'users', error });
    } catch (error) {
      errors.push({ table: 'users', error });
    }
  }

  // Clean up auth users (must be last)
  if (testData.users.size > 0) {
    for (const userId of testData.users) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) errors.push({ table: 'auth.users', userId, error });
      } catch (error) {
        errors.push({ table: 'auth.users', userId, error });
      }
    }
  }

  // Clear tracking sets
  testData.users.clear();
  testData.bookings.clear();
  testData.packages.clear();
  testData.bookingItems.clear();

  // Log errors if any (but don't fail tests)
  if (errors.length > 0 && process.env.DEBUG_TESTS) {
    console.warn('Cleanup warnings:', errors);
  }
}

/**
 * Delete user by ID (cleanup helper)
 */
export async function deleteTestUser(userId) {
  try {
    // Delete from kina.users
    await supabase.from('users').delete().eq('id', userId);
    
    // Delete from auth
    await supabase.auth.admin.deleteUser(userId);
    
    // Remove from tracking
    testData.users.delete(userId);
  } catch (error) {
    console.error('Error deleting test user:', error);
  }
}

/**
 * Delete booking by ID (cleanup helper)
 */
export async function deleteTestBooking(bookingId) {
  try {
    await supabase.from('bookings').delete().eq('id', bookingId);
    testData.bookings.delete(bookingId);
  } catch (error) {
    console.error('Error deleting test booking:', error);
  }
}

/**
 * Delete package by ID (cleanup helper)
 */
export async function deleteTestPackage(packageId) {
  try {
    await supabase.from('packages').delete().eq('id', packageId);
    testData.packages.delete(packageId);
  } catch (error) {
    console.error('Error deleting test package:', error);
  }
}

/**
 * Get all test users created
 */
export function getTrackedUsers() {
  return Array.from(testData.users);
}

/**
 * Get all test bookings created
 */
export function getTrackedBookings() {
  return Array.from(testData.bookings);
}

/**
 * Reset tracking (useful for test isolation)
 */
export function resetTracking() {
  testData.users.clear();
  testData.bookings.clear();
  testData.packages.clear();
  testData.bookingItems.clear();
}

export default {
  createTestUser,
  createTestPackages,
  createTestBooking,
  cleanupTestData,
  deleteTestUser,
  deleteTestBooking,
  deleteTestPackage,
  generateTestEmail,
  generateTestUserId,
  getTrackedUsers,
  getTrackedBookings,
  resetTracking
};


