# Kina Resort System - Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project (e.g., "kina-resort")
3. Wait for the project to be ready (takes 1-2 minutes)

## Step 3: Create Database Tables

1. In Supabase Dashboard, go to **SQL Editor**
2. Open the file `database-schema.sql` from this project
3. Copy all the SQL content
4. Paste it into the Supabase SQL Editor
5. Click **Run** to execute
6. You should see "Success" message

## Step 4: Configure Environment Variables

1. Copy `env.example.txt` to `.env`:
   ```bash
   cp env.example.txt .env
   ```

2. Get your Supabase credentials:
   - In Supabase Dashboard, go to **Settings** → **API**
   - Copy the "Project URL" - paste it as `SUPABASE_URL`
   - Copy the "anon public" key - paste it as `SUPABASE_KEY`

3. Set up a strong session secret:
   - Generate a random string for `SESSION_SECRET`
   - You can use: `openssl rand -hex 32`

4. (Optional) Configure Email:
   - For Gmail:
     - Enable 2-Factor Authentication
     - Go to Google Account → Security → App Passwords
     - Generate an app password
     - Use that as `SMTP_PASSWORD`

## Step 5: Add Logo (Optional)

1. Place your logo file at: `public/assets/logo.png`
2. Recommended size: 200x200px or larger
3. If you don't have a logo, create a placeholder PNG file

## Step 6: Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

## Step 7: Access the Application

Open your browser and go to:
```
http://localhost:3000
```

You'll be redirected to the login page at: `http://localhost:3000/login.html`

## Step 8: Create Your First Admin Account

### Option A: Via Registration Form (Easier)

1. Click "Register here" link on the login page
2. Fill in:
   - Email: your-admin@email.com
   - Password: (choose a strong password)
   - Confirm Password: (repeat)
   - Full Name: Admin User
   - Role: Admin
3. Click Register
4. Login with your credentials

### Option B: Via Supabase Dashboard (For Production)

1. In Supabase Dashboard, go to **Authentication** → **Users**
2. Create a new user OR
3. Go to **Table Editor** → **users** table
4. Insert a new row with bcrypt-hashed password

To hash a password, use online bcrypt generator or:
```javascript
// In Node.js:
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('yourpassword', 10);
console.log(hash);
```

Then insert:
```sql
INSERT INTO users (email, password, full_name, role) 
VALUES ('admin@kinaresort.com', '$2a$10$yOur_Hashed_Password_Here', 'Admin User', 'admin');
```

## Step 9: Test the System

1. **Login** with your admin account
2. You should see the **Admin Dashboard**
3. Try creating a test booking:
   - Click "Bookings" in navigation
   - Click "Add Booking"
   - Fill in guest details
   - Submit
4. Check if it appears in the bookings list
5. Try changing the status (confirm, cancel, etc.)

## Step 10: Add Sample Data (Optional)

To populate with sample bookings and rooms, you can:

1. Go to Supabase Dashboard → Table Editor
2. Add sample bookings manually, or
3. Use the application to create them

## Troubleshooting

### "Cannot find module" errors

Run:
```bash
npm install
```

### Database connection failed

- Check your `.env` file has correct Supabase credentials
- Verify you ran the database-schema.sql in SQL Editor
- Check Supabase project is active

### Session keeps logging out

- Check SESSION_SECRET is set in .env
- Make sure your browser accepts cookies
- Check the session configuration in server.js

### Email not working

- Verify SMTP credentials in .env
- Check firewall allows SMTP connections
- For Gmail, use app password, not regular password
- Test SMTP settings with a simple email client first

### Cannot access admin dashboard

- Check your user role in database
- Verify you're logged in (check /api/me endpoint)
- Make sure session is valid

### Page shows "Unauthorized"

- Logout and login again
- Check session isn't expired (30 min inactivity)
- Verify your user role in the database

## Next Steps

1. Create staff accounts
2. Add room inventory
3. Configure email notifications
4. Customize branding (logo, colors)
5. Set up production deployment

## Production Deployment

Before deploying to production:

1. Change `SESSION_SECRET` to a strong random string
2. Set `NODE_ENV=production` in .env
3. Use a production database (Supabase production tier)
4. Set up proper SMTP service (not Gmail for production)
5. Enable HTTPS
6. Set up automated backups
7. Configure monitoring and logging

## Support

If you encounter any issues:
1. Check the console for error messages
2. Check Supabase logs in Dashboard
3. Verify all environment variables are set
4. Review the main README.md for detailed documentation

Good luck with your Kina Resort System! 🏨
