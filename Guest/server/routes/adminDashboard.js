import express from 'express';
import { db } from '../db/databaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = express.Router();

// All admin routes require authentication and admin/staff role
router.use(authenticateToken);
router.use(requireRole(['admin', 'staff']));

// GET /api/admin/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Get all bookings
    const { data: bookings, error: bookingsError } = await db
      .from('bookings')
      .select('*');

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
    }

    const totalBookings = bookings?.length || 0;
    const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0;
    const confirmedBookings = bookings?.filter(b => b.status === 'confirmed').length || 0;
    const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;
    const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;
    
    // Calculate occupancy rate (confirmed bookings / total bookings)
    const occupancyRate = totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0;
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Get today's bookings
    const todayBookings = bookings?.filter(b => {
      const checkIn = new Date(b.check_in);
      checkIn.setHours(0, 0, 0, 0);
      return checkIn.toISOString().split('T')[0] === todayStr;
    }).length || 0;
    
    // Get packages count
    const { count: packagesCount } = await db
      .from('packages')
      .select('*', { count: 'exact', head: true });
    
    // Get active users count
    const { count: usersCount } = await db
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    res.json({
      success: true,
      stats: {
        totalBookings,
        pendingBookings,
        confirmedBookings,
        cancelledBookings,
        completedBookings,
        todayBookings,
        occupancyRate,
        packagesCount: packagesCount || 0,
        usersCount: usersCount || 0
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/admin/dashboard/recent-bookings - Get recent bookings
router.get('/recent-bookings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const { data: bookings, error } = await db
      .from('bookings')
      .select('*, packages(*)')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching recent bookings:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch recent bookings' });
    }
    
    res.json({
      success: true,
      bookings: bookings || []
    });
  } catch (error) {
    console.error('Recent bookings error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/admin/dashboard/today-operations - Get today's operations
router.get('/today-operations', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's check-ins
    const { data: checkIns } = await db
      .from('bookings')
      .select('*, packages(*)')
      .eq('check_in', today)
      .in('status', ['confirmed', 'pending']);
    
    // Get today's check-outs
    const { data: checkOuts } = await db
      .from('bookings')
      .select('*, packages(*)')
      .eq('check_out', today)
      .in('status', ['confirmed']);
    
    res.json({
      success: true,
      checkIns: checkIns || [],
      checkOuts: checkOuts || []
    });
  } catch (error) {
    console.error('Today operations error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;

