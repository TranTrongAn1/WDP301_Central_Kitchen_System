const express = require('express');
const router = express.Router();
const Role = require('../models/Role'); // Đảm bảo đúng đường dẫn Model

// API lấy tất cả role
router.get('/', async (req, res) => {
  try {
    const roles = await Role.find({});
    res.json(roles);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;