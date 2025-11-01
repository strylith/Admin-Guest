# Kina Resort Admin & Staff System

A full-stack web system for managing Kina Resort operations with role-based access control for Admin and Staff users.

## Features

✅ **Authentication & Authorization**
- Secure login/registration with Supabase Auth
- Role-based access control (Admin & Staff)
- Session management with automatic logout after inactivity
- Password hashing with bcrypt

✅ **Admin Dashboard**
- Complete access to all modules
- View total bookings, occupancy rate, and daily revenue
- Manage bookings, rooms, and staff
- Real-time data updates
- Audit log tracking

✅ **Staff Dashboard**
- Limited access to reservations and customer handling
- View assigned bookings
- Today's check-ins/check-outs
- Confirm or modify reservations
- Search and filter functionality

✅ **Email Notifications**
- Automatic booking confirmations to customers
- Notification emails to Admin/Staff for new/modified reservations
- System alerts (e.g., maintenance announcements)
- Email history tracking in Supabase

✅ **Real-time Data Handling**
- Supabase Realtime subscriptions
- Live updates across all dashboards
- Synchronized data between Admin and Staff

✅ **Security Features**
- HTTPS enforcement
- Audit logs for all actions
- Input validation
- Session security
- Password validation

✅ **Responsive Design**
- Mobile-friendly layout
- Modern UI with beautiful gradients
- Dark/light theme support

## Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Node.js with Express
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Email Service:** Nodemailer
- **Session Management:** express-session

## Installation

### 1. Clone or Download the Project

```bash
cd kina-dashboard-main
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create an account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run the schema from `database-schema.sql`
4. Copy your project URL and anon key from Settings > API

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` and add your configuration:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SESSION_SECRET=your-secret-key-change-this
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

**Note:** For Gmail, you'll need to:
- Enable 2-Factor Authentication
- Create an App Password in your Google Account settings
- Use that App Password in the `SMTP_PASSWORD` field

### 5. Initialize the Database

Run the SQL schema file in your Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `database-schema.sql`
3. Paste and run the query

This will create:
- Users table
- Bookings table
- Audit logs table
- Email logs table
- Rooms table
- Necessary indexes and policies

### 6. Copy Assets

Make sure the logo exists at `public/assets/logo.png`. You can use any PNG logo file.

### 7. Start the Server

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Usage

### Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

You'll be redirected to the login page.

### Creating Your First Admin Account

Option 1: Use the registration form on the login page
- Enter your email, password, and full name
- Select "Admin" as role
- Click Register

Option 2: Insert directly into Supabase (recommended for first admin)

1. Generate a password hash:
   - Use online bcrypt generator: https://bcrypt-generator.com/
   - Or use Node.js: `bcrypt.hash('yourpassword', 10)`

2. Insert into users table via Supabase Dashboard → Table Editor → users

Example SQL:
```sql
INSERT INTO users (email, password, full_name, role) 
VALUES ('admin@kinaresort.com', '$2a$10$hashed_password_here', 'Admin User', 'admin');
```

### Role Capabilities

**Admin Role:**
- Full access to all modules
- Create, edit, delete bookings
- Manage staff accounts
- View audit logs
- Access reports
- Manage rooms

**Staff Role:**
- View assigned bookings
- Confirm/reschedule reservations
- View today's check-ins/check-outs
- Limited editing capabilities

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user
- `GET /api/me` - Get current user

### Bookings
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get single booking
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Delete booking (Admin only)

### Dashboard
- `GET /api/dashboard/stats` - Get admin dashboard stats
- `GET /api/dashboard/staff` - Get staff dashboard data

## Database Schema

### Users Table
- Stores user accounts with role-based access
- Fields: id, email, password (hashed), full_name, role, is_active, created_at, last_login

### Bookings Table
- Manages all reservations
- Fields: id, guest_name, guest_email, guest_phone, room_type, check_in, check_out, status, created_by, created_at, updated_at

### Audit Logs Table
- Tracks all system actions
- Fields: id, user_id, user_role, action, details, created_at

### Email Logs Table
- Tracks email notifications
- Fields: id, recipient, subject, status, error_message, sent_at

### Rooms Table
- Manages room inventory
- Fields: id, room_number, room_type, status, is_active, created_at, updated_at

## Security Features

1. **Password Hashing:** Uses bcrypt for secure password storage
2. **Session Management:** Express sessions with secure cookies
3. **Input Validation:** Server-side validation for all inputs
4. **Audit Logging:** All actions are logged in the database
5. **Role-based Access:** Middleware enforces role permissions
6. **Inactivity Logout:** Automatic logout after 30 minutes of inactivity
7. **Date Validation:** Prevents past-date reservations

## Email Configuration

The system uses Nodemailer for sending email notifications. Supported providers:

- Gmail (recommended for testing)
- Outlook/Hotmail
- SendGrid
- Any SMTP service

For Gmail:
1. Enable 2-Factor Authentication
2. Generate App Password
3. Use app password in .env file

## Troubleshooting

### Email not sending
- Check SMTP credentials in .env
- Verify firewall allows SMTP connections
- Check email logs in database (email_logs table)

### Database connection issues
- Verify SUPABASE_URL and SUPABASE_KEY are correct
- Check Row Level Security policies
- Ensure tables are created correctly

### Session issues
- Check SESSION_SECRET is set
- Verify cookie settings
- Check browser allows cookies

## Development

### File Structure
```
kina-dashboard-main/
├── server.js                 # Main server file
├── package.json              # Dependencies
├── .env                      # Environment variables
├── database-schema.sql       # Database schema
├── public/
│   ├── index.html           # Redirect to login
│   ├── login.html           # Login/Register page
│   ├── admin-dashboard.html # Admin dashboard
│   ├── staff-dashboard.html # Staff dashboard
│   ├── css/
│   │   ├── auth.css        # Auth page styles
│   │   └── dashboard.css   # Dashboard styles
│   └── js/
│       ├── auth.js          # Auth logic
│       ├── admin-dashboard.js # Admin logic
│       └── staff-dashboard.js  # Staff logic
└── README.md                # This file
```

## Production Deployment

1. Set `NODE_ENV=production` in .env
2. Use a strong `SESSION_SECRET`
3. Enable HTTPS
4. Use a production database
5. Configure proper SMTP service
6. Set up automated backups

## Deploy to GitHub + Render (Free)

Follow these steps to host the full app for free.

### 1) Push to GitHub

```bash
git init
git branch -M main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Note: `.env` is ignored by `.gitignore`. Do not commit secrets.

### 2) Deploy backend to Render

1. Create a free Web Service on Render and connect your GitHub repo.
2. Environment: Node. Build command: `npm install`. Start command: `node server.js`.
3. Set Environment Variables (from your local `.env`):
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SESSION_SECRET`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
   - `SERVER_HOST=0.0.0.0`
   - `PUBLIC_BASE_URL=https://<your-render-service>.onrender.com`
4. Deploy and copy the public URL.

### 3) Optional: Serve static frontend via GitHub Pages

If you want GitHub Pages as the frontend:
1. Create a separate repo or branch with only the `public/` folder contents.
2. In GitHub → Settings → Pages → choose the branch and root folder.
3. Update any frontend API calls to point to your Render URL, e.g. `https://<your-render-service>.onrender.com/api/...`.

Emails and Pay Now links use `PUBLIC_BASE_URL`. Ensure it’s set to your public domain.

## License

ISC License

## Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for Kina Resort**
