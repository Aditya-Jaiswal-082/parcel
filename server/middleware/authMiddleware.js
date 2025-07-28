const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ✅ Enhanced authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No valid authorization header provided',
        details: 'Expected format: Bearer <token>'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.id) {
      return res.status(401).json({ error: 'Invalid token structure' });
    }

    // Find user
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        details: 'User may have been deleted or deactivated'
      });
    }

    // Check if user is active (if you have this field)
    if (user.status && user.status !== 'active') {
      return res.status(401).json({ error: 'User account is inactive' });
    }

    req.user = user;
    next();
    
  } catch (err) {
    console.error('Authentication error:', err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    return res.status(500).json({ error: 'Authentication failed', details: err.message });
  }
};

// ✅ Enhanced role authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!req.user.role) {
        return res.status(403).json({ 
          error: 'User role not defined',
          details: 'Please contact administrator to assign role'
        });
      }

      // Convert to lowercase for case-insensitive comparison
      const userRole = req.user.role.toLowerCase();
      const allowedRoles = roles.map(role => role.toLowerCase());

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: 'Access denied: insufficient permissions',
          details: `Required roles: ${roles.join(', ')}. Your role: ${req.user.role}`
        });
      }

      next();
    } catch (err) {
      console.error('Authorization error:', err.message);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

module.exports = { authenticate, authorizeRoles };
