const express = require('express');
const router = express.Router();
const {
  createPaymentLink,
  handlePayOSWebhook,
  depositToWallet,
  payWithWallet,
  getWalletBalance,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

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

/**
 * @route   POST /api/payments/deposit
 * @desc    Deposit funds to a store's wallet
 * @access  Private (Admin/Manager only)
 */
router.post('/deposit', protect, authorize('Admin', 'Manager'), depositToWallet);

/**
 * @route   POST /api/payments/pay-with-wallet
 * @desc    Pay an invoice using store's wallet balance
 * @access  Private (Store staff/Admin)
 */
router.post('/pay-with-wallet', protect, payWithWallet);

/**
 * @route   GET /api/payments/wallet/:storeId
 * @desc    Get wallet balance and transaction history for a store
 * @access  Private (Store staff/Admin)
 */
router.get('/wallet/:storeId', protect, getWalletBalance);

module.exports = router;
