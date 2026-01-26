const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const Store = require('../models/Store');

/**
 * Generate JWT Token
 * @param {string} id - User ID
 * @returns {string} JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public (can be restricted to Admin later)
 */
const register = async (req, res, next) => {
  try {
    const { username, password, fullName, email, roleId, storeId } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      res.status(400);
      return next(
        new Error(
          userExists.username === username
            ? 'Username already exists'
            : 'Email already exists'
        )
      );
    }

    // Validate role exists
    const role = await Role.findById(roleId);
    if (!role) {
      res.status(400);
      return next(new Error('Invalid role'));
    }

    // Validate storeId requirement for StoreStaff
    if (role.roleName === 'StoreStaff') {
      if (!storeId) {
        res.status(400);
        return next(new Error('StoreStaff must be assigned to a store'));
      }

      // Validate store exists
      const store = await Store.findById(storeId);
      if (!store) {
        res.status(400);
        return next(new Error('Invalid store'));
      }
    }

    // For other roles, storeId should be null
    const finalStoreId =
      role.roleName === 'StoreStaff' ? storeId : null;

    // Create user
    const user = await User.create({
      username,
      passwordHash: password, // Will be hashed by pre-save hook
      fullName,
      email,
      roleId,
      storeId: finalStoreId,
    });

    // Populate role and store information
    await user.populate('roleId', 'roleName');
    if (user.storeId) {
      await user.populate('storeId', 'storeName address');
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.roleId.roleName,
        storeId: user.storeId ? user.storeId._id : null,
        storeName: user.storeId ? user.storeId.storeName : null,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      res.status(400);
      return next(new Error('Please provide username and password'));
    }

    // Find user and include password field
    const user = await User.findOne({ username })
      .select('+passwordHash')
      .populate('roleId', 'roleName')
      .populate('storeId', 'storeName address');

    // Check if user exists and password matches
    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      return next(new Error('Invalid credentials'));
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(401);
      return next(new Error('Account is deactivated. Please contact administrator'));
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.roleId.roleName,
        storeId: user.storeId ? user.storeId._id : null,
        storeName: user.storeId ? user.storeId.storeName : null,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('roleId', 'roleName')
      .populate('storeId', 'storeName address');

    if (!user) {
      res.status(404);
      return next(new Error('User not found'));
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.roleId.roleName,
        storeId: user.storeId ? user.storeId._id : null,
        storeName: user.storeId ? user.storeId.storeName : null,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
};
