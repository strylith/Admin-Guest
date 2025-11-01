# Kina Resort Backend API

Backend API for the Kina Resort reservation system built with Express.js and Supabase.

## Features

- User authentication with JWT
- Booking management
- Package/Room management
- User profiles and loyalty points
- Real-time availability checking

## Tech Stack

- **Node.js** with ES Modules
- **Express.js** - Web framework
- **Supabase** - Backend as a Service (PostgreSQL database, authentication)
- **JWT** - Token-based authentication
- **Jest** - Testing framework with Supabase integration

## Setup

### Prerequisites

- Node.js (v16 or higher)
- Supabase account and project

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:

Create a `.env` file in the `server` directory with the following:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Server Configuration
PORT=3000
NODE_ENV=development
USE_MOCK_DB=false

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
```

### Database Schema

The application uses the `kina` schema in Supabase with the following tables:
- `users` - User profiles with roles
- `packages` - Available rooms, cottages, and function halls
- `bookings` - Booking records
- `booking_items` - Individual items within bookings
- `reservations_calendar` - Availability tracking
- `admin_settings` - System settings
- `audit_logs` - Administrative action tracking
- `email_logs` - Email notification history
- `password_reset_otps` - Password reset tokens
- `rooms` - Physical room inventory

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` by default.

## Testing

### Running Tests

The project uses Jest with **real Supabase integration** for accurate testing against actual database behavior.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Configuration

- **Test Environment**: Uses real Supabase database with the `kina` schema
- **Test Isolation**: Each test creates its own data and cleans up afterward
- **Test Timeout**: 30 seconds (for network operations)
- **Test Utilities**: Located in `__tests__/utils/testDb.js`

### Test Database Management

Tests automatically:
1. Create unique test data before each test
2. Track created records (users, bookings, packages)
3. Clean up all test data after each test
4. Handle foreign key constraints properly

### Writing Tests

Example test structure:

```javascript
import { createTestUser, createTestPackages } from '../utils/testDb.js';

describe('My Feature', () => {
  let testUser;
  let testPackages;

  beforeEach(async () => {
    // Create test data
    testUser = await createTestUser();
    testPackages = await createTestPackages();
  });

  // Cleanup is handled automatically by global afterEach hook

  it('should do something', async () => {
    // Your test logic here
    // Data will be automatically cleaned up
  });
});
```

### Debug Mode

Enable detailed logging during tests:
```bash
DEBUG_TESTS=true npm test
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with OTP

### Users (Protected)

- `GET /api/users/profile` - Get user profile and stats
- `PATCH /api/users/profile` - Update user profile

### Packages

- `GET /api/packages` - Get all packages (with optional category filter)
- `GET /api/packages/:id` - Get package by ID

### Bookings (Protected)

- `POST /api/bookings` - Create new booking
- `GET /api/bookings` - Get user's bookings
- `GET /api/bookings/:id` - Get booking details
- `PATCH /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

## Database Client Architecture

The application uses a factory pattern for database clients:

- **Production**: Uses real Supabase client
- **Testing**: Uses real Supabase with automatic cleanup
- **Optional Mock**: Can enable mock database with `USE_MOCK_DB=true`

### Schema Configuration

All database operations use the `kina` schema by default. The Supabase client is configured to:
- Use `kina` schema for data operations
- Use `auth` schema for authentication
- Support both service role and anon key operations

## Migration from Mock Database

This project was recently migrated from an in-memory mock database to real Supabase integration for testing. Benefits include:

✅ Tests run against real database constraints (RLS, triggers, foreign keys)  
✅ Validates actual Supabase behavior  
✅ Catches schema mismatches early  
✅ Better confidence in production readiness  
✅ Simplified codebase (no mock maintenance)

The mock database implementation is still available in `db/mockDatabaseClient.js` but is no longer used by default.

## Troubleshooting

### Tests Failing with Permission Errors

If you see "permission denied for schema kina" errors, ensure your Supabase service role has proper permissions:

```sql
GRANT USAGE ON SCHEMA kina TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA kina TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA kina TO service_role;
```

### Connection Timeouts

If tests timeout when connecting to Supabase:
- Check your internet connection
- Verify Supabase URL and keys are correct
- Check if Supabase project is paused (free tier)

### Test Data Not Cleaning Up

If test data persists between runs:
- Check `__tests__/setup.js` cleanup hooks
- Manually clean up with the test utilities
- Verify foreign key constraints are handled in correct order

## Project Structure

```
server/
├── __tests__/           # Test files
│   ├── routes/          # Route tests
│   ├── utils/           # Test utilities
│   └── setup.js         # Global test setup
├── config/              # Configuration files
├── db/                  # Database clients
│   ├── databaseClient.js      # Factory pattern
│   ├── supabaseClient.js      # Real Supabase client
│   └── mockDatabaseClient.js  # Mock client (legacy)
├── middleware/          # Express middleware
├── routes/              # API routes
├── utils/               # Utility functions
├── .env                 # Environment variables
├── server.js            # Entry point
└── package.json         # Dependencies
```

## License

MIT
 