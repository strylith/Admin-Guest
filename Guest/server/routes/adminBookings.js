import express from 'express';
import { db } from '../db/databaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { logAudit } from '../middleware/auditLog.js';
import { sendEmail, generateBookingConfirmationEmail } from '../utils/emailService.js';

const router = express.Router();

// All admin routes require authentication and admin/staff role
router.use(authenticateToken);

// GET /api/admin/bookings - Get all bookings (admin/staff only)
router.get('/', requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const { status, packageId, limit = 100, offset = 0 } = req.query;
    
    let query = db
      .from('bookings')
      .select('*, packages(*), users(*)')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    if (packageId) {
      query = query.eq('package_id', packageId);
    }
    
    const { data: bookings, error } = await query;
    
    if (error) {
      console.error('Error fetching bookings:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
    }
    
    res.json({
      success: true,
      bookings: bookings || []
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/admin/bookings/:id - Get single booking
router.get('/:id', requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const { data: booking, error } = await db
      .from('bookings')
      .select('*, packages(*), users(*), booking_items(*)')
      .eq('id', req.params.id)
      .single();
    
    if (error) {
      console.error('Error fetching booking:', error);
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    
    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PATCH /api/admin/bookings/:id - Update booking (admin/staff only)
router.patch('/:id', requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const bookingId = req.params.id;
    const updateData = { ...req.body };
    
    // Get current booking to check if status changed
    const { data: currentBooking } = await db
      .from('bookings')
      .select('*, packages(*)')
      .eq('id', bookingId)
      .single();
    
    if (!currentBooking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    
    // Update booking
    const { data: booking, error } = await db
      .from('bookings')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select('*, packages(*)')
      .single();
    
    if (error) {
      console.error('Error updating booking:', error);
      return res.status(500).json({ success: false, error: 'Failed to update booking' });
    }
    
    // Log audit
    await logAudit({
      userId: req.user.user.id,
      action: 'booking_update',
      details: `Updated booking ${bookingId}`,
      userRole: req.userRole,
      req,
      tableName: 'bookings',
      recordId: bookingId.toString()
    });
    
    // If status changed to confirmed, send confirmation email
    if (updateData.status === 'confirmed' && currentBooking.status !== 'confirmed') {
      const user = booking.users || currentBooking.users;
      const guestEmail = user?.email || booking.email;
      const guestName = user ? `${user.first_name} ${user.last_name}` : 'Guest';
      
      if (guestEmail && guestName) {
        const emailHtml = generateBookingConfirmationEmail({
          guestName,
          guestEmail,
          bookingId: bookingId.toString(),
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          packageTitle: booking.packages?.title || 'Package',
          guests: booking.guests || 1,
          status: 'confirmed'
        });
        
        await sendEmail({
          to: guestEmail,
          subject: 'Booking Confirmation - Kina Resort',
          html: emailHtml
        });
      }
    }
    
    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/admin/bookings/:id - Delete booking (admin only)
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const bookingId = req.params.id;
    
    const { error } = await db
      .from('bookings')
      .delete()
      .eq('id', bookingId);
    
    if (error) {
      console.error('Error deleting booking:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete booking' });
    }
    
    // Log audit
    await logAudit({
      userId: req.user.user.id,
      action: 'booking_delete',
      details: `Deleted booking ${bookingId}`,
      userRole: req.userRole,
      req,
      tableName: 'bookings',
      recordId: bookingId.toString()
    });
    
    res.json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;

