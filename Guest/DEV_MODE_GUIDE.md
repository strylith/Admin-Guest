# Dev Mode Interface Selector Guide

## How to Use

The Dev Mode Interface Selector is a floating panel that appears in the bottom-right corner when running on localhost. It provides quick access to switch between Guest and Admin interfaces.

### Accessing the Selector

1. **Open the app**: Navigate to `http://localhost:5500` or `http://localhost:3000`
2. **Look for the button**: Find the **🎯 Dev Mode** button in the bottom-right corner
3. **Click to expand**: Click the button to see your options

### Interface Options

#### 🏖️ Guest Interface
- **Purpose**: Browse packages, make bookings, view your reservations
- **Access**: Click "Guest Interface" button
- **Landing Page**: `/packages` page
- **Features**:
  - Browse rooms, cottages, and function halls
  - View weather forecast
  - Make new bookings
  - Check your existing bookings
  - See loyalty points

#### 🎛️ Admin Dashboard
- **Purpose**: Manage bookings, users, and system settings
- **Access**: Click "Admin Dashboard" button (requires login)
- **Landing Page**: `/admin` page
- **Features**:
  - View all bookings
  - Manage users and staff
  - Track audit logs
  - View dashboard statistics
  - Update booking statuses

### Current Interface Indicator

The selector shows which interface you're currently viewing:
- **Green "Guest"** = You're in the guest interface
- **Gold "Admin"** = You're in the admin interface

### Quick Switching

**From Guest to Admin**:
1. Click "🎯 Dev Mode" button
2. Click "Admin Dashboard"
3. If not logged in, you'll be redirected to login first

**From Admin to Guest**:
1. Click "🎯 Dev Mode" button  
2. Click "Guest Interface"
3. Instantly navigate to packages page

### Visual Design

- **Floating Panel**: Non-intrusive, collapsible design
- **Color Coding**:
  - Guest = Green accents
  - Admin = Gold/Yellow accents
  - Button = Purple/Indigo gradient
- **Smooth Animations**: Slide-up effect when opening
- **Mobile Friendly**: Responsive design for all screen sizes

### Development Only

✅ **Shows**: localhost, 127.0.0.1  
❌ **Hidden**: Production domains, deployed sites

The selector only appears in development mode for security and UX reasons.

### Troubleshooting

**Selector not showing?**
- Make sure you're on `localhost` or `127.0.0.1`
- Check browser console for errors
- Hard refresh (Ctrl+F5) to clear cache

**Can't access Admin Dashboard?**
- You must be logged in first
- System will redirect to login page
- Use valid admin or staff credentials

**Button not responding?**
- Check if JavaScript is enabled
- Verify `interfaceSelector.js` loaded correctly
- Look for conflicts in browser console

### Testing Checklist

- [ ] Selector appears on localhost
- [ ] Panel expands when clicking "Dev Mode"
- [ ] Guest Interface button navigates correctly
- [ ] Admin Dashboard button requires login
- [ ] Current interface label updates correctly
- [ ] Panel collapses when toggling
- [ ] Mobile view works properly
- [ ] Selector hidden on production domains

---

**Happy Testing! 🎉**

The Dev Mode selector makes it super easy to test both guest and admin functionality without manually typing URLs or searching for links.

