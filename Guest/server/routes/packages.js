import express from 'express';
import { db, mockClient } from '../db/databaseClient.js';

const router = express.Router();

// GET /api/packages/debug - Debug endpoint to list all packages
router.get('/debug', async (req, res) => {
  try {
    if (process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test') {
      const packages = Array.from(mockClient.tables.packages.values());
      return res.json({
        success: true,
        mode: 'mock',
        count: packages.length,
        packages: packages
      });
    } else {
      const { data, error } = await db.from('packages').select('*');
      if (error) throw error;
      return res.json({
        success: true,
        mode: 'database',
        count: data?.length || 0,
        packages: data || []
      });
    }
  } catch (error) {
    console.error('Debug packages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch packages debug info'
    });
  }
});

// GET /api/packages
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = db.from('packages').select('*');

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Fetch packages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch packages'
    });
  }
});

// GET /api/packages/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await db
      .from('packages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Package not found'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Fetch package error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch package'
    });
  }
});

// GET /api/packages/:id/availability
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Start and end dates are required'
      });
    }

    // Check bookings for this package in the date range
    const { data: bookings, error: bookingsError } = await db
      .from('bookings')
      .select('check_in, check_out, guests')
      .eq('package_id', id)
      .in('status', ['pending', 'confirmed']);

    if (bookingsError) {
      throw bookingsError;
    }

    // Check reservations calendar for specific dates
    const { data: reservations, error: reservationsError } = await db
      .from('reservations_calendar')
      .select('date, reserved_count')
      .eq('package_id', id)
      .gte('date', start)
      .lte('date', end);

    if (reservationsError) {
      throw reservationsError;
    }

    // Get package capacity
    const { data: packageData, error: packageError } = await db
      .from('packages')
      .select('capacity')
      .eq('id', id)
      .single();

    if (packageError) {
      throw packageError;
    }

    // Combine booking and reservation data
    const availability = {
      bookings: bookings || [],
      reservations: reservations || [],
      capacity: packageData.capacity || 10
    };

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability'
    });
  }
});

export default router;



