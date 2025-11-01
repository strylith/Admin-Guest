import { db } from '../db/databaseClient.js';

// Role checking middleware factory
export const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      const userId = req.user.user.id;
      const { data: profile, error } = await db
        .from('users')
        .select('role, is_active')
        .eq('id', userId)
        .single();

      console.log('Role check for user:', userId);
      console.log('Profile data:', profile);
      console.log('Profile error:', error);

      if (error) {
        console.error('Database error fetching user profile:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch user profile'
        });
      }

      if (!profile) {
        console.error('No profile found for user:', userId);
        return res.status(404).json({
          success: false,
          error: 'User profile not found'
        });
      }

      if (!profile.role) {
        console.error('User has no role:', userId, profile);
        return res.status(403).json({
          success: false,
          error: 'User role not configured'
        });
      }

      if (!allowedRoles.includes(profile.role)) {
        console.error('User role not allowed:', profile.role, 'required:', allowedRoles);
        return res.status(403).json({ 
          success: false, 
          error: 'Insufficient permissions' 
        });
      }

      if (profile.is_active === false) {
        return res.status(403).json({ 
          success: false, 
          error: 'Account is deactivated' 
        });
      }

      // Attach role to request for use in routes
      req.userRole = profile.role;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Authorization check failed' 
      });
    }
  };
};

export default requireRole;

