const User = require('../models/User');
const Role = require('../models/Role');
const Store = require('../models/Store');

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private (Admin, Manager only)
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .populate('roleId', 'roleName')
      .populate('storeId', 'storeName address phone')
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Private (Admin, Manager)
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('roleId', 'roleName')
      .populate('storeId', 'storeName address phone')
      .select('-passwordHash');

    if (!user) {
      res.status(404);
      return next(new Error('User not found'));
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new user
 * @route   POST /api/users
 * @access  Private (Admin, Manager)
 */
const createUser = async (req, res, next) => {
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

    // Business Logic: Validate storeId for StoreStaff
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

    // Create user (storeId will be null for HQ roles)
    const user = await User.create({
      username,
      passwordHash: password, // Will be hashed by pre-save hook
      fullName,
      email,
      roleId,
      storeId: role.roleName === 'StoreStaff' ? storeId : null,
    });

    // Populate for response
    await user.populate('roleId', 'roleName');
    if (user.storeId) {
      await user.populate('storeId', 'storeName address phone');
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private (Admin, Manager)
 */
const updateUser = async (req, res, next) => {
  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      return next(new Error('User not found'));
    }

    // If updating role, validate business logic
    if (req.body.roleId) {
      const role = await Role.findById(req.body.roleId);
      if (!role) {
        res.status(400);
        return next(new Error('Invalid role'));
      }

      // If changing to StoreStaff, storeId must be provided
      if (role.roleName === 'StoreStaff' && !req.body.storeId) {
        res.status(400);
        return next(new Error('StoreStaff must be assigned to a store'));
      }

      // If changing from StoreStaff to HQ role, clear storeId
      if (role.roleName !== 'StoreStaff') {
        req.body.storeId = null;
      }
    }

    // If updating storeId, validate it exists
    if (req.body.storeId) {
      const store = await Store.findById(req.body.storeId);
      if (!store) {
        res.status(400);
        return next(new Error('Invalid store'));
      }
    }

    // If updating password, it will be hashed by pre-save hook
    if (req.body.password) {
      user.passwordHash = req.body.password;
      delete req.body.password;
    }

    // Update user
    user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('roleId', 'roleName')
      .populate('storeId', 'storeName address phone')
      .select('-passwordHash');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft delete user (set isActive: false)
 * @route   DELETE /api/users/:id
 * @access  Private (Admin only)
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      return next(new Error('User not found'));
    }

    // Soft delete: set isActive to false instead of deleting
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully (soft delete)',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
