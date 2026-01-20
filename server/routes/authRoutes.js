const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', protect, authorize('Admin'), register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;
