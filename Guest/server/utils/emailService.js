import nodemailer from 'nodemailer';
import { db } from '../db/databaseClient.js';
import crypto from 'crypto';

// Configure Nodemailer transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Send email and log to database
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body
 * @returns {Promise<Object>} - Result with success status
 */
export async function sendEmail({ to, subject, text, html }) {
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
    await db
      .from('email_logs')
      .insert({
        recipient: to,
        subject,
        status: 'sent',
        sent_at: new Date().toISOString()
      });
    
    console.log(`✅ Email sent to ${to}: ${subject}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email error:', error);
    
    // Log failed email
    await db
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

/**
 * Generate payment token for secure payment links
 * @param {string} bookingId - Booking ID
 * @param {string} email - Guest email
 * @returns {string} - HMAC token
 */
export function generatePaymentToken(bookingId, email) {
  const secret = process.env.JWT_SECRET || 'test-secret-key-for-tests';
  const payload = `${bookingId}.${email}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Build payment link with token
 * @param {Object} req - Express request object
 * @param {Object} booking - Booking object
 * @returns {string} - Payment URL
 */
export function buildPaymentLink(req, booking) {
  const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  const token = generatePaymentToken(booking.id, booking.guest_email || booking.email);
  return `${baseUrl}/pay/${booking.id}?t=${token}`;
}

/**
 * Verify payment token
 * @param {string} bookingId - Booking ID
 * @param {string} email - Guest email
 * @param {string} token - Token to verify
 * @returns {boolean} - True if valid
 */
export function verifyPaymentToken(bookingId, email, token) {
  const expected = generatePaymentToken(bookingId, email);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token || ''));
}

/**
 * Generate booking confirmation email HTML
 * @param {Object} options - Booking details
 * @returns {string} - HTML email template
 */
export function generateBookingConfirmationEmail({
  guestName,
  guestEmail,
  guestPhone,
  bookingId,
  checkIn,
  checkOut,
  packageTitle,
  guests,
  status = 'confirmed',
  totalCost = 0,
  payNowLink,
  bookingTime = null,
  visitTime = null,
  cottage = null,
  entranceFee = 0,
  cottageFee = 0,
  extraGuestCharge = 0,
  adults = 0,
  kids = 0
}) {
  const statusMessage = status === 'confirmed' 
    ? 'Your booking has been confirmed!' 
    : status === 'pending' 
    ? 'Your booking request has been received and is pending confirmation.'
    : 'Your booking has been cancelled.';
  
  const statusBadgeClass = status === 'confirmed' ? 'status-confirmed' :
                          status === 'pending' ? 'status-pending' :
                          'status-cancelled';

  return `
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
          <p>Dear ${guestName},</p>
          <p><strong>${statusMessage}</strong></p>
          
          <div class="details-box">
            <h2>Guest Information</h2>
            <div class="detail-row">
              <span class="detail-label">Name:</span>
              <span class="detail-value">${guestName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${guestEmail}</span>
            </div>
            ${guestPhone ? `
            <div class="detail-row">
              <span class="detail-label">Phone:</span>
              <span class="detail-value">${guestPhone}</span>
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="detail-label">Booking Status:</span>
              <span class="detail-value"><span class="status-badge ${statusBadgeClass}">${status}</span></span>
            </div>
          </div>
          
          <div class="details-box">
            <h2>Booking Details</h2>
            <div class="detail-row">
              <span class="detail-label">Package:</span>
              <span class="detail-value">${packageTitle}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Guests:</span>
              <span class="detail-value">${guests}</span>
            </div>
            ${adults > 0 || kids > 0 ? `
            <div class="detail-row">
              <span class="detail-label">Guest Breakdown:</span>
              <span class="detail-value">${adults} Adult(s), ${kids} Kid(s)</span>
            </div>
            ` : ''}
            ${visitTime ? `
            <div class="detail-row">
              <span class="detail-label">Visit Time:</span>
              <span class="detail-value">${visitTime}</span>
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
              <span class="detail-value">${new Date(checkIn).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Check-out:</span>
              <span class="detail-value">${new Date(checkOut).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            ${bookingTime ? `
            <div class="detail-row">
              <span class="detail-label">Booking Time:</span>
              <span class="detail-value">${bookingTime}</span>
            </div>
            ` : ''}
          </div>
          
          ${totalCost > 0 ? `
          <div class="details-box">
            <h2>Cost Breakdown</h2>
            ${entranceFee > 0 ? `
            <div class="detail-row">
              <span class="detail-label">Entrance Fee:</span>
              <span class="detail-value">₱${entranceFee.toFixed(2)}</span>
            </div>
            ` : ''}
            ${cottageFee > 0 ? `
            <div class="detail-row">
              <span class="detail-label">Cottage Fee:</span>
              <span class="detail-value">₱${cottageFee.toFixed(2)}</span>
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
          ${(status !== 'cancelled' && totalCost > 0 && payNowLink) ? `
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
}

/**
 * Generate payment confirmation email HTML
 * @param {Object} options - Payment details
 * @returns {string} - HTML email template
 */
export function generatePaymentConfirmationEmail({
  guestName,
  guestEmail,
  bookingId,
  paymentMethod,
  amountPaid,
  checkIn,
  checkOut,
  bookingTime = null,
  visitTime = null
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
        .header { background: #27ae60; color: #fff; padding: 16px; border-radius: 8px 8px 0 0; margin: 0; }
        .content { border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div>
        <h2 class="header" style="background:#27ae60;color:#fff;padding:16px;border-radius:8px 8px 0 0;margin:0;">Payment Confirmed</h2>
        <div class="content">
          <p>Dear ${guestName},</p>
          <p>Your payment has been recorded successfully.</p>
          <p><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Amount Paid:</strong> ₱${amountPaid.toFixed(2)}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
          <p>Check-in: ${new Date(checkIn).toLocaleDateString()}</p>
          <p>Check-out: ${new Date(checkOut).toLocaleDateString()}</p>
          ${bookingTime ? `<p>Booking Time: ${bookingTime}</p>` : ''}
          ${visitTime ? `<p>Visit Time: ${visitTime}</p>` : ''}
          <p style="margin-top:20px;">Thank you for choosing Kina Resort!</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default {
  sendEmail,
  generatePaymentToken,
  buildPaymentLink,
  verifyPaymentToken,
  generateBookingConfirmationEmail,
  generatePaymentConfirmationEmail
};

