import express from 'express';
import { db, dbAuth } from '../db/databaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { logAudit } from '../middleware/auditLog.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// GET /api/admin/users - Get all users/staff
router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    
    let query = db
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (role) {
      query = query.eq('role', role);
    }
    
    const { data: users, error } = await query;
    
    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
    
    res.json({
      success: true,
      users: users || []
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/admin/users/:id - Get single user
router.get('/:id', async (req, res) => {
  try {
    const { data: user, error } = await db
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) {
      console.error('Error fetching user:', error);
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PATCH /api/admin/users/:id - Update user
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = { ...req.body };
    
    // Update user
    const { data: user, error } = await db
      .from('users')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ success: false, error: 'Failed to update user' });
    }
    
    // Log audit
    await logAudit({
      userId: req.user.user.id,
      action: 'user_update',
      details: `Updated user ${userId}`,
      userRole: req.userRole,
      req,
      tableName: 'users',
      recordId: userId
    });
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id - Delete user (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if this is the last admin
    const { data: admins } = await db
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .eq('is_active', true);
    
    // Get user to delete
    const { data: userToDelete } = await db
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!userToDelete) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Prevent deleting last admin
    if (userToDelete.role === 'admin' && admins.length <= 1) {
      return res.status(400).json({ success: false, error: 'Cannot delete the last admin account' });
    }
    
    // Prevent deleting yourself
    if (userToDelete.id === req.user.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }
    
    // Delete from auth (if using Supabase auth)
    try {
      await dbAuth.admin.deleteUser(userId);
    } catch (authError) {
      console.warn('Could not delete auth user:', authError.message);
      // Continue with database deletion even if auth deletion fails
    }
    
    // Delete from database
    const { error } = await db
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
    
    // Log audit
    await logAudit({
      userId: req.user.user.id,
      action: 'user_delete',
      details: `Deleted user account: ${userToDelete.email}`,
      userRole: req.userRole,
      req,
      tableName: 'users',
      recordId: userId
    });
    
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;

