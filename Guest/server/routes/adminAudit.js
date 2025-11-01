import express from 'express';
import { db } from '../db/databaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// GET /api/admin/audit-logs - Get audit logs
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const { data: logs, error } = await db
      .from('audit_logs')
      .select('*, users(id, email, full_name, first_name, last_name)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching audit logs:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
    }
    
    // Format logs with user info
    const formattedLogs = logs?.map(log => ({
      ...log,
      user: log.users ? {
        id: log.users.id,
        email: log.users.email,
        name: log.users.full_name || `${log.users.first_name} ${log.users.last_name}`
      } : null
    })) || [];
    
    res.json({
      success: true,
      logs: formattedLogs
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/admin/audit-logs/stats - Get audit log statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total logs count
    const { count: totalLogs } = await db
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });
    
    // Get logs by action type (top 10)
    const { data: actionCounts } = await db
      .from('audit_logs')
      .select('action')
      .order('created_at', { ascending: false })
      .limit(1000);
    
    const actionStats = {};
    actionCounts?.forEach(log => {
      const actionType = log.action.split('_')[0]; // Extract base action (booking, user, etc.)
      actionStats[actionType] = (actionStats[actionType] || 0) + 1;
    });
    
    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: recentLogs } = await db
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());
    
    res.json({
      success: true,
      stats: {
        totalLogs: totalLogs || 0,
        recentLogs: recentLogs || 0,
        actionBreakdown: actionStats
      }
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/admin/audit-logs/search - Search audit logs
router.get('/search', async (req, res) => {
  try {
    const { action, userId, startDate, endDate } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    let query = db
      .from('audit_logs')
      .select('*, users(id, email, full_name, first_name, last_name)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (action) {
      query = query.ilike('action', `%${action}%`);
    }
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    const { data: logs, error } = await query;
    
    if (error) {
      console.error('Error searching audit logs:', error);
      return res.status(500).json({ success: false, error: 'Failed to search audit logs' });
    }
    
    // Format logs with user info
    const formattedLogs = logs?.map(log => ({
      ...log,
      user: log.users ? {
        id: log.users.id,
        email: log.users.email,
        name: log.users.full_name || `${log.users.first_name} ${log.users.last_name}`
      } : null
    })) || [];
    
    res.json({
      success: true,
      logs: formattedLogs
    });
  } catch (error) {
    console.error('Search audit logs error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;

