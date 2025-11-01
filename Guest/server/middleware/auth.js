import jwt from 'jsonwebtoken';
import { dbAuth } from '../db/databaseClient.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('[Auth] No token provided');
      return res.status(401).json({ 
        success: false, 
        error: 'Access token required' 
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret-key-for-tests');
      console.log('[Auth] Token decoded:', { userId: decoded.userId, email: decoded.email });
    } catch (jwtError) {
      console.error('[Auth] JWT verification failed:', jwtError.message);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }
    
    // Get user from Auth to ensure they still exist
    const { data, error } = await dbAuth.admin.getUserById(decoded.userId);
    const user = data?.user || data; // Handle both Supabase response formats
    
    console.log('[Auth] User lookup result:', { 
      found: !!user, 
      error: error?.message || null,
      userId: decoded.userId 
    });
    
    if (error || !user) {
      console.error('[Auth] User not found in database:', error);
      
      // In mock mode, if user doesn't exist but token is valid, create a minimal user
      if (process.env.USE_MOCK_DB === 'true') {
        console.log('[Auth] Mock mode: Creating user from token');
        const mockUser = {
          id: decoded.userId,
          email: decoded.email || `user-${decoded.userId}@example.com`,
          user_metadata: decoded.user_metadata || {}
        };
        
        // Store in mock auth users
        const { mockClient } = await import('../db/databaseClient.js');
        mockClient.authUsers.set(decoded.userId, mockUser);
        
        req.user = { user: mockUser };
        console.log('[Auth] Mock user created and attached:', mockUser.id);
        return next();
      }
      
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }

    // Attach user to request - normalize to { user } format for routes
    req.user = { user };
    console.log('[Auth] User authenticated:', user.id);
    next();
  } catch (error) {
    console.error('[Auth] Middleware error:', error);
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
};

export default authenticateToken;



