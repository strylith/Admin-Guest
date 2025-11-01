// Test setup file for Supabase integration tests
process.env.USE_MOCK_DB = 'false';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-tests';

// Import test database utilities
import { cleanupTestData, resetTracking } from './utils/testDb.js';

// Clean up test data after each test
afterEach(async () => {
  try {
    await cleanupTestData();
  if (process.env.DEBUG_TESTS) {
      console.log('🧹 Test data cleaned up');
    }
  } catch (error) {
    console.error('Error during test cleanup:', error);
    // Continue even if cleanup fails to avoid blocking other tests
  }
});

// Setup test environment
beforeAll(() => {
  if (process.env.DEBUG_TESTS) {
    console.log('🔗 Connecting to Supabase test database...');
    console.log('✅ Test environment initialized with real Supabase');
  }
});

// Final cleanup after all tests
afterAll(async () => {
  try {
    await cleanupTestData();
    resetTracking();
    if (process.env.DEBUG_TESTS) {
      console.log('🧹 Final cleanup completed');
    }
  } catch (error) {
    console.error('Error during final cleanup:', error);
  }
});

