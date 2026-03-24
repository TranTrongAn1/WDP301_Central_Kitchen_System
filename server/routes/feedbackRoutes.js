const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const {
  createFeedback,
  getFeedbackByOrder,
  getAllFeedbacks,
  updateFeedback,
  deleteFeedback,
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const baseName = path
      .basename(file.originalname || 'image', ext)
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 50);
    cb(null, `${Date.now()}-${baseName}${ext}`);
  },
});

const upload = multer({ storage });

// All routes require authentication
router.use(protect);

// Get all feedbacks (Admin, Manager only)
router.get('/', authorize('Admin', 'Manager'), getAllFeedbacks);

// Create feedback for a specific order
router.post('/:orderId', upload.array('images', 5), createFeedback);

// Get feedback for a specific order
router.get('/:orderId', getFeedbackByOrder);

// Update feedback for a specific order (Creator only)
router.put('/:orderId', upload.array('images', 5), updateFeedback);

// Delete feedback (Admin or Creator)
router.delete('/:orderId', deleteFeedback);

module.exports = router;
