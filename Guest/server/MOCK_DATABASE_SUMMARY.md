# Mock Database - Archive Notice

## ⚠️ Status: Archived (No Longer In Active Use)

This document is maintained for historical reference. The mock database implementation has been **replaced with real Supabase integration** for testing as of the migration completed on the date of this update.

---

## Historical Context

### What Was It?

The mock database (`db/mockDatabaseClient.js`) was an in-memory implementation that simulated Supabase's API for Jest testing. It provided:

- In-memory Map-based storage
- Supabase-compatible query builder methods
- Mock authentication system
- Automatic reset between tests

### Why Was It Created?

Originally implemented to:
1. Enable fast, offline testing
2. Avoid dependency on external services during development
3. Provide quick test feedback loops
4. Reduce test complexity

### Why Was It Replaced?

The mock database was replaced with real Supabase integration because:

#### Limitations Found

1. **API Discrepancies**: Mock couldn't perfectly replicate Supabase behavior
2. **Missing Features**: Database triggers, RLS policies, and constraints not simulated
3. **Maintenance Burden**: Required updates whenever Supabase API changed
4. **False Confidence**: Tests passed with mock but failed with real database
5. **Schema Drift**: Mock schema could diverge from actual Supabase schema

#### Real Supabase Benefits

✅ **Accuracy**: Tests against actual database constraints and features  
✅ **Reliability**: Catches real-world issues before production  
✅ **Maintainability**: No need to maintain mock implementation  
✅ **Confidence**: Tests validate actual system behavior  
✅ **Schema Validation**: Automatically tests against correct schema

---

## Mock Implementation (Preserved for Reference)

### File Location
`server/db/mockDatabaseClient.js`

### Key Features

```javascript
class MockDatabaseClient {
  constructor() {
    this.tables = {
      users: new Map(),
      packages: new Map(),
      bookings: new Map(),
      booking_items: new Map(),
      reservations_calendar: new Map(),
      admin_settings: new Map()
    };
    this.authUsers = new Map();
  }

  // Methods
  reset()           // Clear all data
  seed(table, data) // Insert test data
  from(table)       // Query builder
  auth.admin        // Auth operations
}
```

### Supported Operations

- **CRUD**: select, insert, update, delete
- **Filters**: eq, in, gte, lte
- **Modifiers**: single, order
- **Auth**: createUser, deleteUser, getUserById, listUsers, signInWithPassword

### Usage Pattern (Legacy)

```javascript
// Old test setup with mock
import { mockClient } from '../db/databaseClient.js';

beforeEach(() => {
  mockClient.reset();
  mockClient.seed('packages', testData);
});
```

---

## Migration Details

### What Changed

#### 1. Environment Configuration
- Changed `USE_MOCK_DB=true` to `USE_MOCK_DB=false`
- Updated database client to use real Supabase by default
- Removed `NODE_ENV === 'test'` check that forced mock mode

#### 2. Database Client Selection
**Before:**
```javascript
const useMock = process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test';
```

**After:**
```javascript
const useMock = process.env.USE_MOCK_DB === 'true';  // Explicit opt-in only
```

#### 3. Test Infrastructure
- Created `__tests__/utils/testDb.js` with real Supabase utilities
- Implemented automatic cleanup after each test
- Added tracking for created test data
- Configured schema permissions for service role

#### 4. Test Files Updated
- `auth.test.js`: Use real user creation and unique emails
- `packages.test.js`: Handle existing database data
- `users.test.js`: Create real auth users and profiles
- `setup.js`: Configure for real Supabase with cleanup hooks

#### 5. Schema Configuration
All Supabase clients configured to use `kina` schema:
```javascript
{
  db: {
    schema: 'kina'
  }
}
```

### Migration Results

**Test Execution**:
- All 10 tests passing
- 3 test suites successfully migrated
- ~10 second execution time (acceptable for integration tests)

**Coverage**:
- Auth routes: Registration, login, validation
- Package routes: List, filter, retrieve
- User routes: Profile retrieval, updates

---

## If You Need Mock Database

### Enabling Mock Mode

The mock database can still be enabled if needed:

1. Set environment variable:
```env
USE_MOCK_DB=true
```

2. Tests will automatically use mock client

3. Import mock utilities:
```javascript
import { mockClient } from '../db/databaseClient.js';

beforeEach(() => {
  mockClient.reset();
});
```

### When Mock Might Be Useful

- **Offline Development**: No internet connection
- **CI/CD Speed**: If real Supabase adds too much time
- **Unit Testing**: For pure logic without I/O
- **Local Development**: Quick iteration on test logic

### Limitations to Remember

- Does not validate RLS policies
- Does not test database triggers
- Does not verify foreign key constraints
- May not match Supabase API exactly
- Does not test connection issues
- Does not validate schema structure

---

## Recommendations

### For New Tests
✅ **Use real Supabase** (current default)  
✅ **Use test utilities** from `__tests__/utils/testDb.js`  
✅ **Let cleanup run automatically**

### For Legacy Code
If you encounter old mock-based tests:
1. Replace `mockClient` imports with test utilities
2. Use `createTestUser`, `createTestPackages`, etc.
3. Remove manual `mockClient.reset()` calls
4. Update assertions to handle existing data

### For Debugging
- Enable `DEBUG_TESTS=true` for detailed logs
- Check test utilities for data tracking
- Verify cleanup is running after tests
- Ensure schema permissions are correct

---

## Code Artifacts

The following files are preserved for reference:

### Active Files
- `db/mockDatabaseClient.js` - Mock implementation (unused)
- `db/databaseClient.js` - Factory pattern with mock support

### Test Utilities (New)
- `__tests__/utils/testDb.js` - Real Supabase test utilities
- `__tests__/setup.js` - Global test configuration

### Documentation
- `README.md` - Updated with Supabase testing
- `TESTING.md` - Comprehensive testing guide
- `MOCK_DATABASE_SUMMARY.md` - This archive

---

## Questions?

For current testing practices, see:
- [`TESTING.md`](./TESTING.md) - Comprehensive testing guide
- [`README.md`](./README.md) - Project setup and overview
- [`__tests__/utils/testDb.js`](./__ tests__/utils/testDb.js) - Test utility reference

---

*Last Updated: Migration to Supabase completed*  
*Mock Database Status: Archived but preserved for reference*
 