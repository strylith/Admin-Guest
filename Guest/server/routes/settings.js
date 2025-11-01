import express from 'express';
import { db } from '../db/databaseClient.js';

const router = express.Router();

// GET /api/settings/booking_terms - Booking terms endpoint
router.get('/booking_terms', async (req, res) => {
  try {
    // Try to fetch from database first
    const { data, error } = await db
      .from('admin_settings')
      .select('value')
      .eq('key', 'booking_terms')
      .single();

    if (!error && data) {
      return res.json({
        success: true,
        terms: data.value
      });
    }

    // Fallback to default terms if not in database
    res.json({
      success: true,
      terms: "Guests must comply with resort booking and cancellation policies. Cancellations made 48 hours before check-in: Full refund. Cancellations made 24-48 hours before check-in: 50% refund. Cancellations made less than 24 hours before check-in: No refund."
    });
  } catch (error) {
    console.error('Fetch booking terms error:', error);
    // Return default terms on error
    res.json({
      success: true,
      terms: "Guests must comply with resort booking and cancellation policies. Please contact us for more details."
    });
  }
});

// GET /api/settings/:key
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;

    const { data, error } = await db
      .from('admin_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Setting not found'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: data.value
    });
  } catch (error) {
    console.error('Fetch setting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch setting'
    });
  }
});

export default router;




