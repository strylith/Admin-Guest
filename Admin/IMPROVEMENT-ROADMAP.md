# System Improvement Roadmap

## 🎯 Priority-Based Action Plan

### ⚡ **PRIORITY 1: Critical Security (Must Do)**

#### 1.1 Add HTTPS Enforcement
**Why:** Security requirement, protects data in transit
**Effort:** Low (1-2 hours)
**Steps:**
```javascript
// Add to server.js after express() initialization
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```
**Deployment:** Configure SSL certificate in production (Let's Encrypt, Cloudflare, etc.)

#### 1.2 Add Multi-Factor Authentication (MFA)
**Why:** Critical security requirement for admin login
**Effort:** Medium (3-4 hours)
**Steps:**
1. Install MFA library: `npm install speakeasy qrcode`
2. Add MFA setup to user table (secret field)
3. Generate QR code on first login
4. Require TOTP code after password verification
5. Save backup codes for recovery

**Implementation:**
- Add `mfa_enabled` and `mfa_secret` columns to users table
- Modify login flow to check MFA if enabled
- Add MFA setup page in admin settings
- Generate QR codes for authenticator apps (Google Authenticator, Authy)

#### 1.3 Encrypt Customer Data
**Why:** Protect sensitive customer information
**Effort:** Medium (2-3 hours)
**Steps:**
1. Install encryption: `npm install crypto-js`
2. Create encryption utility functions
3. Encrypt before saving: email, phone, name
4. Decrypt when displaying

**Implementation:**
```javascript
// Create utils/encryption.js
const CryptoJS = require('crypto-js');
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key';

function encrypt(text) {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

function decrypt(ciphertext) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

---

### 📊 **PRIORITY 2: Essential Features (Should Do)**

#### 2.1 Add Report Export Functionality
**Why:** Allows audit and booking data export
**Effort:** Medium (2-3 hours)
**Steps:**
1. Install CSV library: `npm install json2csv`
2. Create export endpoints:
   - `/api/reports/audit/csv` - Export audit logs
   - `/api/reports/bookings/csv` - Export bookings
   - `/api/reports/revenue/csv` - Export revenue data
3. Add export buttons in dashboard
4. Support date range filtering

**Implementation:**
```javascript
// Add to server.js
const { parse } = require('json2csv');

app.get('/api/reports/audit/csv', requireAuth, requireRole(['admin']), async (req, res) => {
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });
  
  const csv = parse(logs);
  res.header('Content-Type', 'text/csv');
  res.attachment('audit-logs.csv');
  res.send(csv);
});
```

#### 2.2 Complete Room Management UI
**Why:** Currently can only view rooms, need to add/edit
**Effort:** Medium (3-4 hours)
**Steps:**
1. Add "Add Room" button and modal
2. Create room editing form
3. Add pricing fields to room table
4. Update server endpoints for CRUD operations
5. Add room type management

**Database Changes:**
```sql
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT;
CREATE TABLE IF NOT EXISTS room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  capacity INT,
  amenities TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.3 Add Seasonal Pricing System
**Why:** Dynamic pricing based on dates
**Effort:** Medium (4-5 hours)
**Steps:**
1. Create `seasonal_pricing` table
2. Add pricing rules UI
3. Calculate price based on date ranges
4. Apply seasonal rates to bookings

**Database Schema:**
```sql
CREATE TABLE seasonal_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  multiplier DECIMAL(3,2) DEFAULT 1.0, -- 1.5 = 50% increase
  fixed_price DECIMAL(10,2), -- Optional override
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### ✨ **PRIORITY 3: Enhancements (Nice to Have)**

#### 3.1 Customer Preferences System
**Why:** Better customer relationship management
**Effort:** Medium (3-4 hours)
**Steps:**
1. Create `customer_preferences` table
2. Add preferences form during booking
3. Store preferences (room floor, view, bed type, etc.)
4. Auto-apply preferences to future bookings

#### 3.2 Promo Frame Management
**Why:** Manage promotional banners
**Effort:** Medium (2-3 hours)
**Steps:**
1. Create `promotions` table
2. Add promotion management UI
3. Create API to fetch active promotions
4. Display on frontend (if you have public website)

#### 3.3 Advanced Reporting Dashboard
**Why:** Better analytics visualization
**Effort:** Medium (3-4 hours)
**Steps:**
1. Install chart library: `npm install chart.js`
2. Create revenue charts (daily, weekly, monthly)
3. Add occupancy trends
4. Show booking status distribution

#### 3.4 CSRF Protection
**Why:** Prevent cross-site request forgery
**Effort:** Low (1 hour)
**Steps:**
1. Install: `npm install csurf`
2. Add CSRF tokens to forms
3. Validate tokens on POST requests

---

## 🚀 **Quick Wins (Implement First)**

These can be done in 30 minutes each:

1. **Add Export Buttons** - Just CSV export for audit logs (2 hours)
2. **Improve Room Management** - Add basic CRUD UI (3 hours)
3. **Add HTTPS Redirect** - Simple middleware (30 minutes)
4. **Customer Preferences** - Basic preferences table (2 hours)

---

## 📋 **Implementation Order (Recommended)**

### Week 1: Security Foundation
1. ✅ HTTPS Enforcement (Day 1)
2. ✅ CSRF Protection (Day 1)
3. ✅ Data Encryption (Day 2-3)
4. ✅ MFA Setup (Day 3-5)

### Week 2: Core Features
1. ✅ Report Exports (Day 1-2)
2. ✅ Complete Room Management (Day 2-4)
3. ✅ Seasonal Pricing (Day 4-5)

### Week 3: Enhancements
1. ✅ Customer Preferences (Day 1-2)
2. ✅ Promo Management (Day 2-3)
3. ✅ Advanced Analytics (Day 3-5)

---

## 🛠️ **Tools & Libraries Needed**

```json
{
  "dependencies": {
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3",
    "crypto-js": "^4.2.0",
    "json2csv": "^6.0.0",
    "chart.js": "^4.4.0",
    "csurf": "^1.11.0"
  }
}
```

---

## 📝 **Database Migrations Required**

### 1. MFA Support
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes TEXT[];
```

### 2. Room Pricing
```sql
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT;
```

### 3. Seasonal Pricing
```sql
CREATE TABLE IF NOT EXISTS seasonal_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  multiplier DECIMAL(3,2) DEFAULT 1.0,
  fixed_price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Customer Preferences
```sql
CREATE TABLE IF NOT EXISTS customer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_email VARCHAR(255) NOT NULL,
  room_floor_preference INT,
  bed_type VARCHAR(50),
  special_requests TEXT,
  loyalty_points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Promotions
```sql
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  banner_image_url VARCHAR(500),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  discount_percent DECIMAL(5,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎓 **For Your Professor's Review**

### What to Highlight:
1. ✅ **Core System is Functional** - All booking, user, and audit features work
2. ✅ **Security Best Practices** - Password hashing, session management, audit trails
3. ✅ **Responsive Design** - Works on all devices
4. ✅ **Real-time Updates** - Supabase Realtime integration
5. ⚠️ **Enhancement Opportunities** - MFA, exports, advanced features identified

### Action Plan Presentation:
- Show implemented features first
- Present improvement roadmap as "Future Enhancements"
- Demonstrate understanding of security requirements
- Show priority-based approach

---

## 💡 **Recommendation**

**Start with Priority 1 items** because:
1. Security is non-negotiable
2. Small effort, big impact
3. Will significantly improve your compliance score

**Then tackle Priority 2** to add the missing core features.

**Priority 3** can be presented as "future roadmap" to show you understand what's needed but focused on core functionality first.

---

## 📞 **Next Steps**

1. Review this roadmap
2. Choose which improvements to implement
3. I can help implement any of these features
4. Focus on Priority 1 for maximum impact with minimal effort

Let me know which feature you'd like to implement first!


