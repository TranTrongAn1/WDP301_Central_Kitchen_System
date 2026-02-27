const express = require('express');
const router = express.Router();
const {
  createPaymentLink,
  handlePayOSWebhook,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/payments/create-link
 * @desc    Create PayOS payment link for an invoice
 * @access  Private (requires authentication)
 */
router.post('/create-link', protect, createPaymentLink);

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle PayOS webhook for payment confirmation
 * @access  Public (PayOS servers call this endpoint)
 */
router.post('/webhook', handlePayOSWebhook);

module.exports = router;
