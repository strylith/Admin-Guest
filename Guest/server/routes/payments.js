import express from 'express';
import { db } from '../db/databaseClient.js';
import { sendEmail, generatePaymentToken, verifyPaymentToken, generatePaymentConfirmationEmail } from '../utils/emailService.js';
import { logAudit } from '../middleware/auditLog.js';

const router = express.Router();

// Payment selection page (guest-facing)
router.get('/pay/:id', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const token = req.query.t;
    
    const { data: booking } = await db
      .from('bookings')
      .select('*, packages(*)')
      .eq('id', bookingId)
      .single();
    
    if (!booking) {
      return res.status(404).send('<h2>Booking not found.</h2>');
    }
    
    // Verify payment token
    if (!token || !verifyPaymentToken(bookingId, booking.email || booking.users?.email || '', token)) {
      return res.status(400).send('<h2>Invalid or expired payment link.</h2>');
    }

    const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    
    // Calculate total cost based on booking details
    const entranceFee = booking.entrance_fee || 0;
    const cottageFee = booking.cottage_fee || 0;
    const extraGuestCharge = booking.extra_guest_charge || 0;
    const amount = (entranceFee + cottageFee + extraGuestCharge).toFixed(2);
    
    const guestName = booking.users ? `${booking.users.first_name} ${booking.users.last_name}` : 'Guest';
    
    res.send(`
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pay for Booking - Kina Resort</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f5f7fb; padding: 20px; color: #333; }
      .card { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); padding: 24px; }
      h1 { margin: 0 0 8px 0; font-size: 22px; }
      .muted { color: #666; margin-top: 0; }
      .amount { background: #4e8fff; color: #fff; padding: 12px 16px; border-radius: 8px; font-weight: 700; display: inline-block; margin: 12px 0 18px; }
      .methods { display: grid; gap: 10px; margin: 12px 0 18px; }
      .option { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; }
      .option:hover { background: #f9fafb; }
      .option input { margin-right: 8px; }
      .submit { display: inline-block; padding: 12px 18px; background: #27ae60; color: #fff; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; }
      .submit:hover { background: #1f8a4d; }
      .small { color: #777; font-size: 12px; margin-top: 10px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>🏖️ Kina Resort Payment</h1>
      <p class="muted">Booking for ${guestName} • ${new Date(booking.check_in).toLocaleDateString()} - ${new Date(booking.check_out).toLocaleDateString()}</p>
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
router.post('/api/payments/confirm', async (req, res) => {
  try {
    const { booking_id, token, method } = req.body;
    
    if (!booking_id || !token || !method) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const { data: booking } = await db
      .from('bookings')
      .select('*, packages(*), users(*)')
      .eq('id', booking_id)
      .single();
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Verify payment token
    if (!verifyPaymentToken(booking_id, booking.users?.email || booking.email || '', token)) {
      return res.status(400).json({ error: 'Invalid or expired payment link' });
    }

    // Optionally mark as confirmed (no separate payment_status column exists)
    if (booking.status !== 'cancelled' && booking.status !== 'confirmed') {
      await db
        .from('bookings')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', booking_id);
    }

    const totalCost = (booking.entrance_fee || 0) + (booking.cottage_fee || 0) + (booking.extra_guest_charge || 0);
    const guestEmail = booking.users?.email || booking.email;
    const guestName = booking.users ? `${booking.users.first_name} ${booking.users.last_name}` : 'Guest';

    // Send receipt email
    const emailHtml = generatePaymentConfirmationEmail({
      guestName,
      guestEmail,
      bookingId: booking_id.toString(),
      paymentMethod: method,
      amountPaid: totalCost,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      bookingTime: booking.booking_time,
      visitTime: booking.visit_time
    });
    
    await sendEmail({
      to: guestEmail,
      subject: 'Payment Confirmation - Kina Resort',
      html: emailHtml
    });

    // Log audit trail
    await logAudit({
      userId: booking.user_id || null,
      action: 'booking_payment',
      details: `Payment confirmed for booking ${booking_id} via ${method}`,
      userRole: 'guest',
      req,
      tableName: 'bookings',
      recordId: booking_id.toString()
    });

    // Redirect back to a simple thank-you page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Payment Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f5f7fb; padding: 40px; text-align: center; }
          .card { max-width: 500px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
          h2 { color: #27ae60; margin-bottom: 20px; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>✅ Thank you! Your payment has been recorded.</h2>
          <p>A confirmation receipt was sent to ${guestEmail}.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

export default router;

