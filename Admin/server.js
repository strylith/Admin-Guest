const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.SERVER_HOST || '0.0.0.0';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Configure Nodemailer for email notifications
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Email utility functions
async function sendEmail({ to, subject, text, html }) {
  try {
    const mailOptions = {
      from: `"Kina Resort" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // Log email in database
    await supabase
      .from('email_logs')
      .insert({
        recipient: to,
        subject,
        status: 'sent',
        sent_at: new Date().toISOString()
      });
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email error:', error);
    
    // Log failed email
    await supabase
      .from('email_logs')
      .insert({
        recipient: to,
        subject,
        status: 'failed',
        error_message: error.message,
        sent_at: new Date().toISOString()
      });
    
    return { success: false, error: error.message };
  }
}

// Payment link signing helpers
function generatePaymentToken(bookingId, email) {
  const secret = process.env.SESSION_SECRET || 'kina-default-secret';
  const payload = `${bookingId}.${email}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function buildPaymentLink(req, booking) {
  const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  const token = generatePaymentToken(booking.id, booking.guest_email);
  return `${baseUrl}/pay/${booking.id}?t=${token}`;
}

function verifyPaymentToken(bookingId, email, token) {
  const expected = generatePaymentToken(bookingId, email);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token || ''));
}

// Log audit trail
async function logAudit({ userId, action, details, userRole, req }) {
  try {
    // Determine table name from action
    let tableName = 'users';
    if (action.includes('booking')) {
      tableName = 'bookings';
    } else if (action.includes('user')) {
      tableName = 'users';
    }
    
    const auditData = {
        user_id: userId,
        action,
      table_name: tableName,
        created_at: new Date().toISOString()
    };
    
    // Add optional fields if available
    if (details) {
      auditData.new_values = { details, role: userRole };
    }
    
    if (req) {
      // Extract IP address and convert to INET format if needed
      const ipAddr = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      // Remove '::ffff:' prefix if present (IPv4-mapped IPv6)
      const cleanIp = ipAddr ? ipAddr.replace(/^::ffff:/, '') : null;
      if (cleanIp) {
        auditData.ip_address = cleanIp;
      }
      auditData.user_agent = req.get('user-agent');
    }
    
    // Extract record_id from details if present (e.g., "Created booking <id>")
    const idMatch = details.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
    if (idMatch) {
      auditData.record_id = idMatch[0];
    }
    
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(auditData)
      .select();
    
    if (error) {
      console.error('Audit logging error:', error.message, error.details || '');
    } else {
      console.log('Audit log created:', action, 'by user:', userId);
    }
  } catch (error) {
    console.error('Audit logging exception:', error.message, error);
  }
  
  // Always return, don't block the main request
  return;
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Check role middleware
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.session.user || !allowedRoles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// ==================== AUTHENTICATION ROUTES ====================

// Register new user
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, full_name, role = 'staff' } = req.body;
    
    // Validate inputs
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user into database
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        full_name,
        role: role === 'admin' ? 'admin' : 'staff',
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({ error: 'Registration failed' });
    }
    
    // Log audit
    await logAudit({
      userId: user.id,
      action: 'user_register',
      details: `New ${role} user registered`,
      userRole: role,
      req
    });
    
    res.status(201).json({ message: 'Registration successful', userId: user.id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    
    if (!email || !password || !userType) {
      return res.status(400).json({ error: 'Email, password, and user type required' });
    }
    
    // Validate user type
    if (userType !== 'admin' && userType !== 'staff') {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }
    
    // Verify user type matches
    if (user.role !== userType) {
      return res.status(403).json({ error: `This account is not authorized as ${userType}` });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create session
    req.session.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };
    
    // Log audit
    await logAudit({
      userId: user.id,
      action: 'user_login',
      details: `User logged in from ${req.ip}`,
      userRole: user.role,
      req
    });
    
    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);
    
    res.json({
      message: 'Login successful',
      user: req.session.user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
app.post('/api/logout', requireAuth, async (req, res) => {
  try {
    // Log audit
    await logAudit({
      userId: req.session.user.id,
      action: 'user_logout',
      details: 'User logged out',
      userRole: req.session.user.role,
      req
    });
    
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logout successful' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

// ==================== BOOKINGS ROUTES ====================

// Get all bookings
app.get('/api/bookings', requireAuth, async (req, res) => {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get single booking
app.get('/api/bookings/:id', requireAuth, async (req, res) => {
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    
    res.json({ booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create new booking
app.post('/api/bookings', requireAuth, async (req, res) => {
  try {
    const { guest_name, guest_email, guest_phone, room_type, check_in, check_out, booking_time, status = 'pending', guest_count = 1, adults, kids, visit_time, cottage, entrance_fee, cottage_fee } = req.body;
    
    // Calculate extra guest charge (₱100 per guest over 4)
    const baseCapacity = 4;
    const additionalGuests = Math.max(0, guest_count - baseCapacity);
    const extraGuestCharge = additionalGuests * 100;
    
    // Validate dates
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkInDate < today) {
      return res.status(400).json({ error: 'Check-in date cannot be in the past' });
    }
    
    if (checkOutDate < checkInDate) {
      return res.status(400).json({ error: 'Check-out date cannot be before check-in date' });
    }
    
    // Check for conflicts - bookings overlap if:
    // new check_in < existing check_out AND new check_out > existing check_in
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('*')
      .eq('room_type', room_type)
      .in('status', ['confirmed', 'pending'])
      .lt('check_in', check_out)
      .gte('check_out', check_in);
    
    if (conflicts && conflicts.length > 0) {
      return res.status(400).json({ error: 'Room is already booked for these dates' });
    }
    
    // Create booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        guest_name,
        guest_email,
        guest_phone,
        room_type,
        check_in,
        check_out,
        booking_time: booking_time || null,
        status,
        guest_count: guest_count || 1,
        extra_guest_charge: extraGuestCharge || 0,
        adults: adults || 0,
        kids: kids || 0,
        visit_time: visit_time || null,
        cottage: cottage || null,
        entrance_fee: entrance_fee || 0,
        cottage_fee: cottage_fee || 0,
        created_by: req.session.user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Log audit
    await logAudit({
      userId: req.session.user.id,
      action: 'booking_create',
      details: `Created booking ${booking.id} for ${guest_name}`,
      userRole: req.session.user.role,
      req
    });
    
    // Calculate total cost
    const totalCost = (entrance_fee || 0) + (cottage_fee || 0) + extraGuestCharge;
    
    // Send booking receipt email for all bookings
    if (guest_email) {
      const statusMessage = status === 'confirmed' 
        ? 'Your booking has been confirmed!' 
        : status === 'pending' 
        ? 'Your booking request has been received and is pending confirmation.'
        : 'Your booking has been cancelled.';
      
      const payNowLink = buildPaymentLink(req, booking);
      const emailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4e8fff 0%, #4e8fff 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .details-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .details-box h2 { margin-top: 0; color: #4e8fff; border-bottom: 2px solid #4e8fff; padding-bottom: 10px; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: 600; color: #666; }
            .detail-value { color: #333; text-align: right; }
            .status-badge { padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize; display: inline-block; }
            .status-confirmed { background: #27ae60; color: white; }
            .status-pending { background: #f8f32b; color: #333; }
            .status-cancelled { background: #e74c3c; color: white; }
            .total-box { background: #4e8fff; color: white; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .total-box h3 { margin: 0 0 10px 0; font-size: 18px; }
            .total-amount { font-size: 32px; font-weight: 700; margin: 0; }
            .actions { text-align: center; margin-top: 20px; }
            .btn { display: inline-block; padding: 12px 20px; background: #27ae60; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 700; }
            .btn:hover { background: #1f8a4d; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏖️ Kina Resort</h1>
              <p style="margin: 10px 0 0 0;">Booking Receipt</p>
            </div>
            
            <div class="content">
              <p>Dear ${guest_name},</p>
              <p><strong>${statusMessage}</strong></p>
              
              <div class="details-box">
                <h2>Guest Information</h2>
                <div class="detail-row">
                  <span class="detail-label">Name:</span>
                  <span class="detail-value">${guest_name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Email:</span>
                  <span class="detail-value">${guest_email}</span>
                </div>
                ${guest_phone ? `
                <div class="detail-row">
                  <span class="detail-label">Phone:</span>
                  <span class="detail-value">${guest_phone}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="detail-label">Booking Status:</span>
                  <span class="detail-value"><span class="status-badge status-${status}">${status}</span></span>
                </div>
              </div>
              
              <div class="details-box">
                <h2>Booking Details</h2>
                <div class="detail-row">
                  <span class="detail-label">Room Type:</span>
                  <span class="detail-value">${room_type.charAt(0).toUpperCase() + room_type.slice(1)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Total Guests:</span>
                  <span class="detail-value">${guest_count || 1}</span>
                </div>
                ${adults > 0 || kids > 0 ? `
                <div class="detail-row">
                  <span class="detail-label">Guest Breakdown:</span>
                  <span class="detail-value">${adults} Adult(s), ${kids} Kid(s)</span>
                </div>
                ` : ''}
                ${visit_time ? `
                <div class="detail-row">
                  <span class="detail-label">Visit Time:</span>
                  <span class="detail-value">${visit_time}</span>
                </div>
                ` : ''}
                ${cottage ? `
                <div class="detail-row">
                  <span class="detail-label">Cottage:</span>
                  <span class="detail-value">${cottage.charAt(0).toUpperCase() + cottage.slice(1)}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="detail-label">Check-in:</span>
                  <span class="detail-value">${new Date(check_in).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Check-out:</span>
                  <span class="detail-value">${new Date(check_out).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                ${booking_time ? `
                <div class="detail-row">
                  <span class="detail-label">Booking Time:</span>
                  <span class="detail-value">${booking_time}</span>
                </div>
                ` : ''}
              </div>
              
              ${totalCost > 0 ? `
              <div class="details-box">
                <h2>Cost Breakdown</h2>
                ${entrance_fee > 0 ? `
                <div class="detail-row">
                  <span class="detail-label">Entrance Fee:</span>
                  <span class="detail-value">₱${entrance_fee.toFixed(2)}</span>
                </div>
                ` : ''}
                ${cottage_fee > 0 ? `
                <div class="detail-row">
                  <span class="detail-label">Cottage Fee:</span>
                  <span class="detail-value">₱${cottage_fee.toFixed(2)}</span>
                </div>
                ` : ''}
                ${extraGuestCharge > 0 ? `
                <div class="detail-row">
                  <span class="detail-label">Extra Guest Charge:</span>
                  <span class="detail-value">₱${extraGuestCharge.toFixed(2)}</span>
                </div>
                ` : ''}
              </div>
              
              <div class="total-box">
                <h3>Total Amount</h3>
                <p class="total-amount">₱${totalCost.toFixed(2)}</p>
              </div>
              ` : ''}
              ${(status !== 'cancelled' && totalCost > 0) ? `
              <div class="actions">
                <a href="${payNowLink}" class="btn">Pay Now</a>
              </div>
              ` : ''}
              
              <div class="footer">
                <p><strong>Thank you for choosing Kina Resort!</strong></p>
                <p>If you have any questions, please contact us at your earliest convenience.</p>
                <p style="margin-top: 20px; font-size: 12px;">
                  This is an automated email. Please do not reply directly to this message.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      await sendEmail({
        to: guest_email,
        subject: status === 'confirmed' ? 'Booking Confirmation - Kina Resort' : status === 'pending' ? 'Booking Receipt - Kina Resort' : 'Booking Cancellation - Kina Resort',
        html: emailBody
      });
    }
    
    res.status(201).json({ booking });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Update booking
app.put('/api/bookings/:id', requireAuth, async (req, res) => {
  try {
    const { guest_name, guest_email, guest_phone, room_type, check_in, check_out, status, guest_count, adults, kids, visit_time, cottage, booking_time, entrance_fee, cottage_fee } = req.body;
    
    // Calculate extra guest charge if guest_count is updated or if adults/kids changed
    let finalGuestCount = guest_count;
    if (adults !== undefined || kids !== undefined) {
      finalGuestCount = (adults || 0) + (kids || 0);
    } else if (guest_count !== undefined) {
      finalGuestCount = guest_count;
    }
    
    if (finalGuestCount !== undefined) {
      const baseCapacity = 4;
      const additionalGuests = Math.max(0, finalGuestCount - baseCapacity);
      const extraGuestCharge = additionalGuests * 100;
      req.body.extra_guest_charge = extraGuestCharge;
      req.body.guest_count = finalGuestCount;
    }
    
    // Recalculate entrance fees if visit_time, adults, or kids are updated
    if (visit_time !== undefined && (adults !== undefined || kids !== undefined)) {
      const adultPrice = visit_time === 'morning' ? 70 : visit_time === 'night' ? 120 : 0;
      const kidPrice = visit_time === 'morning' ? 60 : visit_time === 'night' ? 100 : 0;
      const calculatedEntranceFee = ((adults || 0) * adultPrice) + ((kids || 0) * kidPrice);
      req.body.entrance_fee = calculatedEntranceFee;
    }
    
    // Recalculate cottage fee if cottage is updated
    if (cottage !== undefined) {
      const cottagePrices = {
        'tropahan': 300,
        'barkads': 400,
        'family': 500
      };
      req.body.cottage_fee = cottage ? (cottagePrices[cottage] || 0) : 0;
    }
    
    // If dates or room_type are being updated, check for conflicts
    if (check_in || check_out || room_type) {
      // Get current booking to check what's being changed
      const { data: currentBooking } = await supabase
        .from('bookings')
        .select('room_type, check_in, check_out')
        .eq('id', req.params.id)
        .single();
      
      const finalRoomType = room_type || currentBooking?.room_type;
      const finalCheckIn = check_in || currentBooking?.check_in;
      const finalCheckOut = check_out || currentBooking?.check_out;
      
      // Validate dates
      if (finalCheckIn && finalCheckOut) {
        const checkInDate = new Date(finalCheckIn);
        const checkOutDate = new Date(finalCheckOut);
        
        if (checkOutDate < checkInDate) {
          return res.status(400).json({ error: 'Check-out date cannot be before check-in date' });
        }
        
        // Check for conflicts (excluding current booking)
        // Updated to handle same-day bookings (check_out can equal check_in)
        const { data: conflicts } = await supabase
          .from('bookings')
          .select('*')
          .eq('room_type', finalRoomType)
          .in('status', ['confirmed', 'pending'])
          .neq('id', req.params.id)
          .lt('check_in', finalCheckOut)
          .gte('check_out', finalCheckIn);
        
        if (conflicts && conflicts.length > 0) {
          return res.status(400).json({ error: 'Room is already booked for these dates' });
        }
      }
    }
    
    const { data: booking, error } = await supabase
      .from('bookings')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    await logAudit({
      userId: req.session.user.id,
      action: 'booking_update',
      details: `Updated booking ${req.params.id}`,
      userRole: req.session.user.role,
      req
    });
    
    res.json({ booking });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Delete booking
app.delete('/api/bookings/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    await logAudit({
      userId: req.session.user.id,
      action: 'booking_delete',
      details: `Deleted booking ${req.params.id}`,
      userRole: req.session.user.role,
      req
    });
    
    res.json({ message: 'Booking deleted' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// ==================== DASHBOARD STATS ====================

// Get dashboard stats for Admin
app.get('/api/dashboard/stats', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    // Get total bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*');
    
    if (error) throw error;
    
    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
    
    // Calculate occupancy rate (simplified)
    const occupancyRate = totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0;
    
    // Calculate daily revenue (mock data - replace with actual revenue calculation)
    const dailyRevenue = confirmedBookings * 150; // Assuming $150 per room
    
    res.json({
      totalBookings,
      occupancyRate,
      dailyRevenue,
      pendingBookings,
      confirmedBookings,
      cancelledBookings
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get staff dashboard data
app.get('/api/dashboard/staff', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's check-ins
    const { data: checkIns } = await supabase
      .from('bookings')
      .select('*')
      .eq('check_in', today)
      .in('status', ['confirmed', 'pending']);
    
    // Get today's check-outs
    const { data: checkOuts } = await supabase
      .from('bookings')
      .select('*')
      .eq('check_out', today)
      .in('status', ['confirmed', 'pending']);
    
    // Get assigned bookings for staff (if staff role assigns bookings)
    const { data: assignedBookings } = await supabase
      .from('bookings')
      .select('*')
      .in('status', ['pending'])
      .limit(20);
    
    res.json({
      checkIns: checkIns || [],
      checkOuts: checkOuts || [],
      assignedBookings: assignedBookings || []
    });
  } catch (error) {
    console.error('Staff dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch staff dashboard data' });
  }
});

// Get all users/staff
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ users: users || [] });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user (Admin only)
app.post('/api/users/create', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;
    
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        full_name,
        role,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Create user error:', error);
      return res.status(500).json({ error: 'Failed to create account' });
    }
    
    // Log audit
    await logAudit({
      userId: req.session.user.id,
      action: 'user_create',
      details: `Created ${role} account for ${email}`,
      userRole: req.session.user.role,
      req
    });
    
    res.status(201).json({ message: 'Account created successfully', user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user
app.put('/api/users/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    await logAudit({
      userId: req.session.user.id,
      action: 'user_update',
      details: `Updated user ${req.params.id}`,
      userRole: req.session.user.role,
      req
    });
    
    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (Admin only)
app.delete('/api/users/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    // Check if this is the last admin
    const { data: admins } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .eq('is_active', true);
    
    // Get user to delete
    const { data: userToDelete } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deleting last admin
    if (userToDelete.role === 'admin' && admins.length === 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin account' });
    }
    
    // Prevent deleting yourself
    if (userToDelete.id === req.session.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Delete user
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    // Log audit
    await logAudit({
      userId: req.session.user.id,
      action: 'user_delete',
      details: `Deleted user account: ${userToDelete.email}`,
      userRole: req.session.user.role,
      req
    });
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ==================== AUDIT LOGS ROUTES ====================

// Get audit logs (Admin only)
app.get('/api/audit-logs', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('Audit logs query error:', error);
      throw error;
    }
    
    console.log('Fetched audit logs count:', logs?.length || 0);
    
    // Get unique user IDs
    const userIds = [...new Set((logs || []).map(log => log.user_id).filter(Boolean))];
    
    // Fetch all users at once for better performance
    // Try both 'users' and 'user_profiles' tables
    let usersMap = {};
    if (userIds.length > 0) {
      // First try 'users' table
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);
      
      if (!usersError && users) {
        usersMap = users.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {});
      }
      
      // If no users found, try 'user_profiles'
      if (Object.keys(usersMap).length === 0) {
        const { data: userProfiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        if (!profilesError && userProfiles) {
          usersMap = userProfiles.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {});
        }
      }
    }
    
    // Map logs with user details
    const logsWithUsers = (logs || []).map(log => {
      if (log.user_id && usersMap[log.user_id]) {
        return {
          ...log,
          user: usersMap[log.user_id]
        };
      }
      return {
        ...log,
        user: { id: null, full_name: 'System', email: 'N/A' }
      };
    });
    
    res.json({ logs: logsWithUsers });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ==================== FORGOT PASSWORD ROUTES ====================

// Generate and send OTP
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      return res.status(400).json({ error: 'No account found with this email' });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration time (15 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    
    // Save OTP to database
    const { error: insertError } = await supabase
      .from('password_reset_otps')
      .insert({
        email,
        otp,
        expires_at: expiresAt.toISOString(),
        used: false
      });
    
    if (insertError) {
      console.error('OTP insert error:', insertError);
      return res.status(500).json({ error: 'Failed to send OTP' });
    }
    
    // Send OTP via email
    await sendEmail({
      to: email,
      subject: 'Password Reset OTP - Kina Resort',
      html: `
        <h2>Password Reset Request</h2>
        <p>Dear ${user.full_name},</p>
        <p>You requested to reset your password. Please use the OTP below:</p>
        <div style="background: #667eea; color: white; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Thank you,<br>Kina Resort Team</p>
      `
    });
    
    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }
    
    // Check OTP from database
    const { data: otpRecord, error } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !otpRecord) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    // Check if OTP has expired
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);
    
    if (now > expiresAt) {
      return res.status(400).json({ error: 'OTP has expired' });
    }
    
    // Mark OTP as used
    await supabase
      .from('password_reset_otps')
      .update({ used: true })
      .eq('id', otpRecord.id);
    
    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if there's a valid (recently used) OTP for this email
    const { data: recentOtp } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('email', email)
      .eq('used', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!recentOtp || (new Date() - new Date(recentOtp.created_at)) > 5 * 60 * 1000) {
      return res.status(400).json({ error: 'Please verify OTP first' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update user password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', email);
    
    if (updateError) {
      return res.status(500).json({ error: 'Failed to reset password' });
    }
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Payment selection page (guest-facing)
app.get('/pay/:id', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const token = req.query.t;
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();
    if (!booking || !verifyPaymentToken(bookingId, booking.guest_email, token)) {
      return res.status(400).send('<h2>Invalid or expired payment link.</h2>');
    }

    const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const amount = ((booking.entrance_fee || 0) + (booking.cottage_fee || 0) + (booking.extra_guest_charge || 0)).toFixed(2);
    res.send(`
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pay for Booking</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f5f7fb; padding: 20px; color: #333; }
      .card { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); padding: 24px; }
      h1 { margin: 0 0 8px 0; font-size: 22px; }
      .muted { color: #666; margin-top: 0; }
      .amount { background: #4e8fff; color: #fff; padding: 12px 16px; border-radius: 8px; font-weight: 700; display: inline-block; margin: 12px 0 18px; }
      .methods { display: grid; gap: 10px; margin: 12px 0 18px; }
      .option { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; }
      .option input { margin-right: 8px; }
      .submit { display: inline-block; padding: 12px 18px; background: #27ae60; color: #fff; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; }
      .submit:hover { background: #1f8a4d; }
      .small { color: #777; font-size: 12px; margin-top: 10px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Kina Resort Payment</h1>
      <p class="muted">Booking for ${booking.guest_name} • ${new Date(booking.check_in).toLocaleDateString()} - ${new Date(booking.check_out).toLocaleDateString()}</p>
      <div class="amount">Amount Due: ₱${amount}</div>
      <form method="POST" action="${baseUrl}/api/payments/confirm">
        <input type="hidden" name="booking_id" value="${bookingId}" />
        <input type="hidden" name="token" value="${token}" />
        <div class="methods">
          <label class="option"><input type="radio" name="method" value="bank" required /> Bank Payment</label>
          <label class="option"><input type="radio" name="method" value="gcash" /> GCash Payment</label>
          <label class="option"><input type="radio" name="method" value="cashier" /> Pay at Counter/Cashier</label>
        </div>
        <button type="submit" class="submit">Confirm Payment</button>
        <div class="small">Note: This demo flow records your choice and sends a receipt email.</div>
      </form>
    </div>
  </body>
  </html>
    `);
  } catch (e) {
    console.error('Render payment page error:', e);
    res.status(500).send('<h2>Unable to load payment page.</h2>');
  }
});

// Confirm payment (guest-facing)
app.post('/api/payments/confirm', async (req, res) => {
  try {
    const { booking_id, token, method } = req.body;
    if (!booking_id || !token || !method) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();
    if (!booking || !verifyPaymentToken(booking_id, booking.guest_email, token)) {
      return res.status(400).json({ error: 'Invalid or expired payment link' });
    }

    // Optionally mark as confirmed (no separate payment_status column exists)
    if (booking.status !== 'cancelled' && booking.status !== 'confirmed') {
      await supabase
        .from('bookings')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', booking_id);
    }

    const totalCost = (booking.entrance_fee || 0) + (booking.cottage_fee || 0) + (booking.extra_guest_charge || 0);

    // Send receipt email
    await sendEmail({
      to: booking.guest_email,
      subject: 'Payment Confirmation - Kina Resort',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="background:#27ae60;color:#fff;padding:16px;border-radius:8px 8px 0 0;margin:0;">Payment Confirmed</h2>
          <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
            <p>Dear ${booking.guest_name},</p>
            <p>Your payment has been recorded successfully.</p>
            <p><strong>Payment Method:</strong> ${method.toUpperCase()}</p>
            <p><strong>Booking ID:</strong> ${booking.id}</p>
            <p><strong>Amount Paid:</strong> ₱${totalCost.toFixed(2)}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
            <p>Check-in: ${new Date(booking.check_in).toLocaleDateString()}</p>
            <p>Check-out: ${new Date(booking.check_out).toLocaleDateString()}</p>
            ${booking.booking_time ? `<p>Booking Time: ${booking.booking_time}</p>` : ''}
            ${booking.visit_time ? `<p>Visit Time: ${booking.visit_time}</p>` : ''}
            <p style="margin-top:20px;">Thank you for choosing Kina Resort!</p>
          </div>
        </div>
      `
    });

    // Log audit trail
    await logAudit({
      userId: null,
      action: 'booking_payment',
      details: `Payment confirmed for booking ${booking.id} via ${method}`,
      userRole: 'guest',
      req
    });

    // Redirect back to a simple thank-you page
    res.send(`
      <h2>Thank you! Your payment has been recorded.</h2>
      <p>A confirmation receipt was sent to ${booking.guest_email}.</p>
    `);
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Access the application at: http://localhost:${PORT}`);
});
