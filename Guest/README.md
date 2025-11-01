# Kina Resort - Unified Booking & Management System

A full-stack web application for Kina Resort that combines guest booking capabilities with comprehensive admin management features. Guests can browse packages, make reservations, and manage their bookings, while administrators and staff have full control over the resort's operations through an integrated admin dashboard.

## System Overview

This is a **unified system** that merges two previously separate systems:
- **Guest System**: Modern SPA for customer-facing bookings and reservations
- **Admin System**: Complete administrative dashboard for resort management

### Key Features

**Guest-Facing Features:**
- 🏖️ Browse resort packages (Rooms, Cottages, Function Halls)
- 📅 Real-time availability calendar
- 🎯 AI-powered chat assistant
- 🌤️ Weather integration
- 💳 Secure booking and payment processing
- 📧 Automatic email confirmations
- 📱 Fully responsive PWA

**Admin/Staff Features:**
- 📊 Comprehensive dashboard with analytics
- 📋 Complete booking management
- 👥 User and staff account management
- 📜 Audit log tracking
- 📧 Email notification system
- 🔒 Role-based access control (Admin, Staff, Customer)
- 💰 Payment tracking and confirmations

## Tech Stack

### Frontend
- **HTML5/CSS3** - Modern, responsive design
- **Vanilla JavaScript (ES6+)** - Client-side routing and logic
- **Lenis** - Smooth scrolling
- **PWA** - Progressive Web App capabilities

### Backend
- **Node.js** with ES Modules
- **Express.js** - RESTful API
- **Supabase** - PostgreSQL database with authentication
- **JWT** - Token-based authentication
- **Nodemailer** - Email notifications
- **Jest** - Testing framework

### Database
- **PostgreSQL** via Supabase
- Row-Level Security (RLS) policies
- Role-based data access

## Architecture

The system uses a **Single Page Application (SPA)** architecture with:

1. **Client-Side Routing** - Hash-based navigation (`#/packages`, `#/admin`, etc.)
2. **RESTful API** - Backend serves JSON APIs
3. **JWT Authentication** - Stateless, token-based auth
4. **Role-Based Access** - Admin, Staff, and Customer roles

### File Structure

```
Guest/
├── index.html              # Main entry point
├── assets/
│   ├── css/
│   │   ├── styles.css     # Guest UI styles
│   │   └── admin.css      # Admin UI styles
│   └── js/
│       ├── app.js         # Main router
│       ├── pages/         # Page components
│       │   ├── home.js
│       │   ├── packages.js
│       │   ├── adminDashboard.js   # Admin pages
│       │   ├── adminBookings.js
│       │   ├── adminUsers.js
│       │   └── adminAudit.js
│       ├── components/    # Reusable components
│       └── utils/         # Utilities
├── server/
│   ├── routes/           # API routes
│   │   ├── auth.js       # Authentication
│   │   ├── bookings.js   # Guest bookings
│   │   ├── packages.js   # Package management
│   │   ├── adminBookings.js
│   │   ├── adminUsers.js
│   │   ├── adminDashboard.js
│   │   ├── adminAudit.js
│   │   └── payments.js   # Payment processing
│   ├── middleware/
│   │   ├── auth.js       # JWT verification
│   │   ├── roleCheck.js  # Role verification
│   │   └── auditLog.js   # Audit logging
│   ├── utils/
│   │   └── emailService.js  # Email templates
│   ├── migrations/       # Database migrations
│   │   └── merge-admin-schema.sql
│   ├── server.js         # Entry point
│   └── package.json
└── images/              # Assets

Admin/                    # Original admin system (backup)
```

## Installation

### Prerequisites
- Node.js v16 or higher
- Supabase account and project
- Email service credentials (for notifications)

### Step 1: Clone and Install

```bash
# Navigate to the project directory
cd Guest

# Install backend dependencies
cd server
npm install

# Install frontend dependencies (if any)
cd ..
npm install  # or cd to root directory
```

### Step 2: Configure Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and keys from Settings > API

### Step 3: Run Database Migrations

**Create the `kina` schema** and apply migrations in Supabase SQL Editor:

1. `server/migrations/create-kina-schema.sql` - **Create kina schema with all tables** (START HERE)
2. Alternatively, if migrating from public schema:
   - `server/supabase-setup.sql` - Base schema in public
   - `server/migration-restructure-booking-items.sql` - Booking items
   - `server/migration-add-booking-fields.sql` - Booking fields
   - `server/migration-add-function-hall-metadata.sql` - Function hall metadata
   - `server/migrations/merge-admin-schema.sql` - Admin features
   - Then migrate tables from public to kina schema

### Step 4: Environment Configuration

Create `server/.env` file:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=3000
NODE_ENV=development
PUBLIC_BASE_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-very-secure-random-secret-key-change-this

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password

# CORS (optional)
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

**Email Setup (Gmail):**
1. Enable 2-Factor Authentication
2. Generate App Password: Google Account > Security > App passwords
3. Use app password in `SMTP_PASSWORD`

### Step 5: Create Initial Admin Account

Via Supabase SQL Editor:

```sql
-- First, create the user in Supabase Auth
-- Then link the profile:

INSERT INTO public.users (id, email, first_name, last_name, full_name, role, is_active)
VALUES (
  'YOUR_AUTH_USER_ID_FROM_SUPABASE_AUTH',
  'admin@kinaresort.com',
  'Admin',
  'User',
  'Admin User',
  'admin',
  true
);
```

## Running the Application

### Backend Server

```bash
cd server

# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server runs on `http://localhost:3000`

### Frontend

The frontend is served statically. Use any HTTP server:

**Option 1: Live Server (VS Code)**
- Install Live Server extension
- Right-click `index.html` > Open with Live Server

**Option 2: Python**
```bash
python -m http.server 5500
```

**Option 3: Node.js http-server**
```bash
npx http-server -p 5500
```

Access at: `http://localhost:5500`

## User Roles

### Customer (Default)
- Browse packages and availability
- Create and manage own bookings
- View booking history
- Access profile and loyalty points

### Staff
- All customer capabilities
- View assigned bookings
- Manage today's check-ins/check-outs
- Limited booking modifications

### Admin
- All staff capabilities
- Full booking management (view/edit/delete all bookings)
- Create and manage staff accounts
- View system audit logs
- Access analytics dashboard
- Manage packages and availability

## API Endpoints

### Guest Endpoints
- `POST /api/auth/register` - Register as customer
- `POST /api/auth/login` - Login
- `GET /api/packages` - Browse packages
- `GET /api/bookings/availability/:packageId` - Check availability
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get my bookings
- `PATCH /api/bookings/:id` - Update booking

### Admin Endpoints
- `POST /api/auth/admin/register` - Create staff/admin account (admin only)
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/bookings` - Get all bookings
- `PATCH /api/admin/bookings/:id` - Update any booking
- `DELETE /api/admin/bookings/:id` - Delete booking
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/audit-logs` - View audit trail

### Payment Endpoints
- `GET /pay/:id` - Payment page (guest-facing)
- `POST /api/payments/confirm` - Confirm payment

## Frontend Routes

### Guest Routes
- `/` - Homepage with promotions
- `/packages` - Browse all packages
- `/rooms` - My bookings
- `/weather` - Availability calendar
- `/auth` - Login/Register modal
- `/about` - About page

### Admin Routes
- `/admin` - Dashboard overview
- `/admin/bookings` - Booking management
- `/admin/users` - User management
- `/admin/audit` - Audit logs

## Database Schema

### Core Tables
- `users` - User profiles with roles
- `packages` - Available packages (rooms, cottages, halls)
- `bookings` - Reservation records
- `booking_items` - Individual booked items

### Admin Tables
- `audit_logs` - Administrative action tracking
- `email_logs` - Email notification history
- `password_reset_otps` - Password reset tokens
- `rooms` - Physical room inventory

### Security Features
- **Row-Level Security (RLS)** - Database-level access control
- **JWT Authentication** - Stateless sessions
- **Role Verification** - Middleware-based authorization
- **Audit Logging** - Comprehensive action tracking
- **Email Logging** - Notification delivery tracking

## Email Notifications

Automatic emails sent for:
- Booking confirmations
- Payment receipts
- Booking modifications
- Password reset (OTP)
- Admin notifications

Email templates use HTML with inline styles for compatibility.

## Testing

```bash
cd server

# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Tests use real Supabase database with automatic cleanup.

## Deployment

### Recommended Setup

**Backend**: Deploy to Render, Heroku, or Railway
- Set all environment variables
- Use PostgreSQL addon
- Configure `PUBLIC_BASE_URL` to your domain

**Frontend**: Serve statically via GitHub Pages, Netlify, or Vercel
- Update API endpoint to backend URL
- Enable HTTPS

### Environment Variables for Production

```env
NODE_ENV=production
PUBLIC_BASE_URL=https://your-domain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
JWT_SECRET=production-secret-key-generate-securely
```

## Troubleshooting

### Database Connection Issues
- Verify Supabase URL and keys in `.env`
- Check RLS policies are correctly configured
- Ensure migrations are applied

### Authentication Problems
- Confirm JWT_SECRET is set
- Check token expiry (default 7 days)
- Verify role field exists in users table

### Email Not Sending
- Verify SMTP credentials
- Check firewall allows SMTP (port 587)
- Review email_logs table for errors
- Use Gmail App Password (not regular password)

### Admin Dashboard Not Loading
- Confirm user has admin/staff role
- Check browser console for errors
- Verify admin routes are registered in server.js

### Permissions Denied (RLS Errors)
- Review RLS policies in merge-admin-schema.sql
- Ensure service_role key is used for admin operations
- Check user role matches policy conditions

## Security Considerations

1. **Never commit** `.env` files
2. **Use strong** JWT_SECRET in production
3. **Enable HTTPS** in production
4. **Regularly update** dependencies
5. **Monitor** audit logs for suspicious activity
6. **Limit** service_role key usage (admin operations only)
7. **Review** RLS policies periodically

## Support & Maintenance

### Regular Tasks
- Monitor email delivery rates
- Review audit logs weekly
- Check database performance
- Update dependencies monthly
- Backup database regularly

### Common Operations

**Create Staff Account:**
Admin Dashboard → Users → Create Staff Account

**View Booking Activity:**
Admin Dashboard → Audit Logs

**Check Email Status:**
Query `email_logs` table in Supabase

**Reset User Password:**
User must use forgot-password flow (OTP-based)

## Migration Notes

This system successfully merges:
- ✅ Admin session-based auth → Supabase JWT auth
- ✅ Simple room bookings → Package-based booking system
- ✅ Separate databases → Unified schema with RLS
- ✅ Traditional MPA → Modern SPA
- ✅ Admin-only access → Role-based access for all users

## License

MIT

## Acknowledgments

Built for Kina Resort with modern web technologies to provide an exceptional booking experience for guests and efficient management tools for staff.

