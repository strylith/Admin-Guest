import { db } from '../db/databaseClient.js';

/**
 * Log an audit entry for administrative actions
 * @param {Object} options - Audit log details
 * @param {string} options.userId - User ID performing the action
 * @param {string} options.action - Action description
 * @param {string} options.details - Additional details
 * @param {string} options.userRole - Role of the user
 * @param {Object} options.req - Express request object (optional)
 * @param {string} options.tableName - Database table name
 * @param {string} options.recordId - Record ID being acted upon
 * @param {Object} options.newValues - New values being set (JSONB)
 * @returns {Promise<void>}
 */
export async function logAudit({ 
  userId, 
  action, 
  details, 
  userRole, 
  req,
  tableName = null,
  recordId = null,
  newValues = null
}) {
  try {
    // Determine table name from action if not provided
    let resolvedTableName = tableName;
    if (!resolvedTableName) {
      if (action.includes('booking')) {
        resolvedTableName = 'bookings';
      } else if (action.includes('user')) {
        resolvedTableName = 'users';
      } else if (action.includes('package')) {
        resolvedTableName = 'packages';
      }
    }
    
    const auditData = {
      user_id: userId,
      user_role: userRole,
      action,
      table_name: resolvedTableName,
      created_at: new Date().toISOString()
    };
    
    // Add optional fields if available
    if (details) {
      auditData.details = details;
    }
    
    if (req) {
      // Extract IP address
      const ipAddr = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress;
      // Remove '::ffff:' prefix if present (IPv4-mapped IPv6)
      const cleanIp = ipAddr ? ipAddr.replace(/^::ffff:/, '').split(',')[0].trim() : null;
      if (cleanIp) {
        auditData.ip_address = cleanIp;
      }
      auditData.user_agent = req.get('user-agent') || null;
    }
    
    // Extract record_id from details if present
    if (recordId) {
      auditData.record_id = recordId;
    } else if (details) {
      const uuidMatch = details.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
      const intMatch = details.match(/\b([0-9]+)\b/);
      if (uuidMatch) {
        auditData.record_id = uuidMatch[0];
      } else if (intMatch && details.includes('booking')) {
        auditData.record_id = intMatch[0];
      }
    }
    
    if (newValues) {
      auditData.new_values = newValues;
    } else if (userRole) {
      auditData.new_values = { role: userRole };
    }
    
    const { data, error } = await db
      .from('audit_logs')
      .insert(auditData)
      .select();
    
    if (error) {
      console.error('Audit logging error:', error.message, error.details || '');
    } else {
      console.log('✅ Audit log created:', action, 'by user:', userId);
    }
  } catch (error) {
    console.error('Audit logging exception:', error.message);
  }
  
  // Always return, don't block the main request
  return;
}

/**
 * Middleware to automatically log requests (optional)
 * Use this for routes that need automatic audit logging
 */
export const auditLogMiddleware = async (req, res, next) => {
  // Store original send to intercept response
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log after response is sent
    if (req.user && req.user.user && req.userRole && res.statusCode < 400) {
      const action = `${req.method} ${req.path}`;
      logAudit({
        userId: req.user.user.id,
        action,
        userRole: req.userRole,
        req
      });
    }
    return originalSend.call(this, data);
  };
  
  next();
};

export default {
  logAudit,
  auditLogMiddleware
};

