const express = require('express');
const {
  createFeedback,
  getFeedbackByOrder,
  getAllFeedbacks,
  updateFeedback,
  deleteFeedback,
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all feedbacks (Admin, Manager only)
router.get('/', authorize('Admin', 'Manager'), getAllFeedbacks);

// Create feedback for a specific order
router.post('/:orderId', createFeedback);

// Get feedback for a specific order
router.get('/:orderId', getFeedbackByOrder);

// Update feedback for a specific order (Creator only)
router.put('/:orderId', updateFeedback);

// Delete feedback (Admin or Creator)
router.delete('/:orderId', deleteFeedback);

module.exports = router;
