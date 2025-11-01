import express from 'express';
import { db } from '../db/databaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/users/profile - Get user profile with stats
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.user.id;

    // Get user profile
    const { data: profile, error: profileError } = await db
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw profileError;
    }

    // Get booking stats
    const { data: bookings, error: bookingsError } = await db
      .from('bookings')
      .select('id, status, created_at')
      .eq('user_id', userId);

    if (bookingsError) {
      throw bookingsError;
    }

    // Calculate stats
    const stats = {
      totalBookings: bookings?.length || 0,
      upcomingBookings: bookings?.filter(b => 
        b.status === 'confirmed' || b.status === 'pending'
      ).length || 0,
      pastBookings: bookings?.filter(b => 
        b.status === 'completed' || b.status === 'cancelled'
      ).length || 0
    };

    res.json({
      success: true,
      data: {
        profile: {
          id: profile.id,
          email: profile.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          memberSince: profile.member_since,
          loyaltyPoints: profile.loyalty_points,
          totalBookings: profile.total_bookings
        },
        stats
      }
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

// PATCH /api/users/profile - Update user profile
router.patch('/profile', async (req, res) => {
  try {
    const userId = req.user.user.id;
    const { firstName, lastName } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'First name and last name are required'
      });
    }

    const updateData = {
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString()
    };

    // Update user profile
    const { data, error } = await db
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        memberSince: data.member_since,
        loyaltyPoints: data.loyalty_points,
        totalBookings: data.total_bookings
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

export default router;



