const express = require('express');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// All routes require Admin or Manager role
// StoreStaff cannot access user management
router.get('/', authorize('Admin', 'Manager'), getUsers);
router.get('/:id', authorize('Admin', 'Manager'), getUserById);
router.post('/', authorize('Admin', 'Manager'), createUser);
router.put('/:id', authorize('Admin', 'Manager'), updateUser);

// Only Admin can soft-delete users
router.delete('/:id', authorize('Admin'), deleteUser);

module.exports = router;
