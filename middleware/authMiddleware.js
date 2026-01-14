const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - Verify JWT token
 * @desc Middleware to verify JWT token and attach user to request
 */
const protect = async (req, res, next) => {
  let token;

  // Check if authorization header exists and starts with 'Bearer'
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token (exclude password)
      req.user = await User.findById(decoded.id)
        .select('-passwordHash')
        .populate('roleId', 'roleName')
        .populate('storeId', 'storeName address');

      if (!req.user) {
        res.status(401);
        return next(new Error('User not found'));
      }

      // Check if user is active
      if (!req.user.isActive) {
        res.status(401);
        return next(new Error('Account is deactivated'));
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401);
      return next(new Error('Not authorized, token failed'));
    }
  }

  if (!token) {
    res.status(401);
    return next(new Error('Not authorized, no token'));
  }
};

/**
 * Authorize user based on roles
 * @param {...string} roles - Allowed roles
 * @returns {Function} Middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roleId) {
      res.status(403);
      return next(new Error('User role not found'));
    }

    if (!roles.includes(req.user.roleId.roleName)) {
      res.status(403);
      return next(
        new Error(
          `User role '${req.user.roleId.roleName}' is not authorized to access this route`
        )
      );
    }

    next();
  };
};

module.exports = { protect, authorize };
