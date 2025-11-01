# Testing Documentation

## Overview

The Kina Resort Backend uses **Jest with real Supabase integration** for integration testing. This approach ensures tests validate actual database behavior, constraints, and Supabase features.

## Test Strategy

### Why Real Supabase?

We migrated from mock database to real Supabase testing because:

1. **Accuracy**: Tests run against actual database constraints (RLS, triggers, foreign keys)
2. **Confidence**: Validates real Supabase API behavior, not mocked approximations
3. **Early Detection**: Catches schema mismatches and permission issues before production
4. **Maintainability**: No need to maintain mock implementations that mirror Supabase

### Test Isolation

Each test is completely isolated:
- Creates its own unique test data
- Tracks all created records
- Automatically cleans up after completion
- Handles foreign key constraints properly

### Test Database

Tests use the same Supabase project as development but with careful data management:
- All test data uses unique identifiers (UUIDs, unique emails)
- Cleanup runs after each test via global `afterEach` hook
- Failed tests still trigger cleanup to prevent data pollution
- Operates on the `kina` schema

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- auth.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="should login"
```

### Debug Mode

Enable detailed logging to troubleshoot test issues:

```bash
DEBUG_TESTS=true npm test
```

This will show:
- Database connection status
- Test data creation logs
- Cleanup operation details
- Auth middleware decisions

## Test Utilities

### Location
`__tests__/utils/testDb.js`

### Available Functions

#### User Management

```javascript
// Create a test user (auth + profile)
const testUser = await createTestUser({
  email: 'custom@example.com',  // Optional, auto-generated if not provided
  firstName: 'Test',
  lastName: 'User',
  loyaltyPoints: 100,
  totalBookings: 0
});
// Returns: { id, email, firstName, lastName, authUser, profile }

// Generate unique email for tests
const email = generateTestEmail();
// Returns: "test-{uuid}@example.com"

// Generate unique user ID
const userId = generateTestUserId();
// Returns: UUID string
```

#### Package Management

```javascript
// Create test packages
const packages = await createTestPackages([
  {
    title: 'Test Room',
    category: 'rooms',
    price: '₱5,500/night',
    capacity: 4,
    description: 'Test room',
    image_url: 'images/test.jpg'
  }
]);
// Returns: Array of created package objects
```

#### Booking Management

```javascript
// Create a test booking
const booking = await createTestBooking({
  user_id: testUser.id,
  package_id: testPackages[0].id,
  check_in: '2025-01-15',
  check_out: '2025-01-16',
  guests: { adults: 2, children: 1 },
  status: 'confirmed',
  total_cost: 5500,
  payment_mode: 'cash'
});
// Returns: Created booking object
```

#### Cleanup

```javascript
// Manual cleanup (usually not needed, done automatically)
await cleanupTestData();

// Reset tracking
resetTracking();

// Delete specific records
await deleteTestUser(userId);
await deleteTestBooking(bookingId);
await deleteTestPackage(packageId);
```

## Writing Tests

### Basic Test Structure

```javascript
import request from 'supertest';
import express from 'express';
import { createTestUser, createTestPackages } from '../utils/testDb.js';

const app = express();
app.use(express.json());
app.use('/api/route', yourRoute);

describe('Feature Name', () => {
  let testUser;
  let testPackages;

  beforeEach(async () => {
    // Setup test data
    testUser = await createTestUser();
    testPackages = await createTestPackages();
  });

  // Cleanup is handled automatically in global afterEach

  it('should perform action', async () => {
    const response = await request(app)
      .get('/api/route')
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

### Testing Protected Routes

```javascript
import jwt from 'jsonwebtoken';
import { createTestUser } from '../utils/testDb.js';

describe('Protected Route', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    testUser = await createTestUser();
    authToken = jwt.sign(
      { userId: testUser.id }, 
      process.env.JWT_SECRET
    );
  });

  it('should access protected resource', async () => {
    const response = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });
});
```

### Testing with Existing Data

When testing against real database with existing data:

```javascript
it('should find test data among existing data', async () => {
  const response = await request(app)
    .get('/api/packages')
    .expect(200);

  // Don't assert exact counts
  expect(response.body.data.length).toBeGreaterThanOrEqual(1);

  // Verify your test data is present
  const titles = response.body.data.map(p => p.title);
  expect(titles).toContain('Test Package Title');
});
```

## Test Configuration

### Jest Config (`jest.config.js`)

```javascript
export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['routes/**/*.js', 'middleware/**/*.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testTimeout: 30000  // 30 seconds for Supabase operations
};
```

### Global Setup (`__tests__/setup.js`)

The setup file:
1. Configures environment for testing
2. Imports cleanup utilities
3. Registers global cleanup hooks
4. Sets appropriate timeout

```javascript
process.env.USE_MOCK_DB = 'false';  // Use real Supabase
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-tests';

afterEach(async () => {
  await cleanupTestData();  // Cleanup after each test
});
```

## Common Issues and Solutions

### Issue: Tests Timing Out

**Symptoms**: Tests take > 30 seconds and timeout

**Solutions**:
- Check internet connection
- Verify Supabase project isn't paused
- Ensure `.env` has correct credentials
- Increase timeout in `jest.config.js` if needed

### Issue: Permission Denied Errors

**Symptoms**: `permission denied for schema kina`

**Solution**: Grant permissions to service role:
```sql
GRANT USAGE ON SCHEMA kina TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA kina TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA kina TO service_role;
```

### Issue: Foreign Key Constraint Violations

**Symptoms**: Cannot delete test data due to foreign key references

**Solution**: The cleanup utility handles this automatically by deleting in correct order:
1. booking_items (references bookings)
2. bookings (references users, packages)
3. packages
4. user profiles (kina.users)
5. auth users (auth.users)

### Issue: Duplicate Key Errors

**Symptoms**: Test fails with unique constraint violation

**Solution**: Always use generated unique identifiers:
```javascript
const email = generateTestEmail();  // Unique email
const user = await createTestUser({ email });
```

### Issue: Test Data Persisting

**Symptoms**: Old test data accumulates in database

**Solution**:
1. Check that `afterEach` cleanup is running
2. Verify test utilities are tracking created data
3. Manually run cleanup if needed:
   ```javascript
   await cleanupTestData();
   resetTracking();
   ```

### Issue: Auth Token Invalid

**Symptoms**: Protected route tests fail with 401

**Solution**: Ensure JWT secret matches:
```javascript
const token = jwt.sign(
  { userId: testUser.id },
  process.env.JWT_SECRET  // Must match setup.js
);
```

## Best Practices

### ✅ Do's

- **Use test utilities** for data creation
- **Generate unique identifiers** for emails, IDs
- **Test against real constraints** (RLS, triggers)
- **Check for presence** rather than exact counts when existing data is possible
- **Use descriptive test names** that explain what's being tested
- **Test error cases** in addition to happy paths

### ❌ Don'ts

- **Don't hardcode user emails** - use `generateTestEmail()`
- **Don't assume empty database** - tests may run against data from other sources
- **Don't skip cleanup** - always let global hooks run
- **Don't use production credentials** in tests
- **Don't test implementation details** - test behavior
- **Don't share state** between tests

## Example Test Files

### Authentication Tests
See `__tests__/routes/auth.test.js` for examples of:
- User registration
- Login with credentials
- Error handling for invalid inputs

### Package Tests
See `__tests__/routes/packages.test.js` for examples of:
- Listing with filters
- Retrieving single items
- Handling non-existent records

### User Profile Tests
See `__tests__/routes/users.test.js` for examples of:
- Protected routes with JWT
- Profile retrieval with stats
- Profile updates

## Performance Considerations

- **Test execution time**: Expect 8-15 seconds for full suite
- **Individual test time**: 1-3 seconds per test
- **Cleanup overhead**: ~200-500ms per test
- **Network latency**: Depends on connection to Supabase

## Migration Notes

This project was migrated from mock database to real Supabase. Key changes:

1. **Removed**: Mock database implementation from active use
2. **Added**: Test database utilities (`testDb.js`)
3. **Changed**: Test setup to use real Supabase
4. **Updated**: All test files to create/cleanup real data
5. **Improved**: Tests now validate actual database behavior

The old mock implementation is preserved in `db/mockDatabaseClient.js` for reference but is no longer used.


