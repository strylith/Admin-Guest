# 🚀 Quick Start Guide - Kina Resort System

## ✅ Your System is Ready!

Your Supabase credentials are configured. Now let's get it running:

## 📋 Prerequisites Checklist

- ✅ Node.js installed
- ✅ npm installed  
- ✅ Dependencies installed (just completed)
- ✅ Supabase project configured
- ⚠️ **Need to:** Set up Gmail App Password (see GMAIL-SETUP.md)

## 🏃‍♂️ Start the Server

### Option 1: Using the Batch File (Windows)
```bash
START.bat
```

### Option 2: Using npm directly
```bash
npm start
```

### Option 3: Development mode (auto-restart on changes)
```bash
npm run dev
```

## 🌐 Access the Application

Once the server starts, you'll see:
```
Server running on http://192.168.100.14:3000
Access the application at: http://192.168.100.14:3000
Local access: http://localhost:3000
```

Open your browser to:
- **On this computer:** `http://localhost:3000`
- **From network devices:** `http://192.168.100.14:3000`

## 👤 Create Your First Admin Account

### Step 1: Go to Registration
1. Open the login page
2. Click "Register here" link

### Step 2: Fill in the Form
- **Email:** your-admin@email.com
- **Password:** (choose a strong password)
- **Confirm Password:** (repeat)
- **Full Name:** Your Name
- **Role:** Admin

### Step 3: Submit and Login
After registration, login with your credentials.

## 🔧 Email Configuration (Optional but Recommended)

Before the system can send email notifications, set up Gmail App Password:

1. Read: `GMAIL-SETUP.md`
2. Enable 2FA on Google account
3. Generate app password
4. Update `.env` file:
   ```
   SMTP_PASSWORD=your-app-password-here
   ```
5. Restart server

## 🎯 What You Can Do Now

### As Admin:
- ✅ View dashboard statistics
- ✅ Manage all bookings
- ✅ View and manage staff
- ✅ Access audit logs
- ✅ View reports
- ✅ Room management

### As Staff:
- ✅ View assigned bookings
- ✅ See today's schedule
- ✅ Confirm/reject bookings
- ✅ Check-in/check-out guests
- ✅ Search bookings

## 📊 Next Steps

1. **Test the system:**
   - Login as admin
   - Create a test booking
   - Check if it appears in the bookings list

2. **Add sample data:**
   - Create a few bookings
   - Add some staff accounts
   - Test different room types

3. **Configure email:**
   - Follow GMAIL-SETUP.md
   - Test sending booking confirmations

4. **Customize:**
   - Change logo (place at `public/assets/logo.png`)
   - Modify colors and styles as needed

## 🐛 Troubleshooting

### "Cannot connect to database"
- Check your Supabase credentials in `.env`
- Verify Supabase project is active
- Run the database schema SQL in Supabase

### "Session expires immediately"
- Check SESSION_SECRET is set in `.env`
- Clear browser cookies
- Try in incognito/private browsing mode

### "Email not sending"
- Gmail requires App Password (see GMAIL-SETUP.md)
- Check SMTP settings in `.env`
- Verify firewall allows SMTP

### "Port already in use"
- Change PORT in `.env` to something else (e.g., 3001)
- Or stop the process using port 3000

## 📚 Documentation Files

- **README.md** - Full system documentation
- **SETUP-GUIDE.md** - Detailed setup instructions  
- **QUICK-START.md** - This file (quick reference)
- **GMAIL-SETUP.md** - Email configuration guide
- **IMPLEMENTATION-SUMMARY.md** - Features overview

## 🎉 You're All Set!

Your Kina Resort Admin & Staff System is running! 

**Start the server and begin managing your resort operations!** 🏨

---

**Need help?** Check the documentation files or review the error messages in your server console.

