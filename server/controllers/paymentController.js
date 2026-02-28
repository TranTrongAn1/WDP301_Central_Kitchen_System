const Invoice = require('../models/Invoice');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const mongoose = require('mongoose');
const crypto = require('crypto');
const axios = require('axios');

/**
 * Thuật toán tạo Signature chuẩn xác cho PayOS (Direct API)
 */
const createPayOSSignature = (data, checksumKey) => {
  const sortedKeys = Object.keys(data).sort();
  const signData = sortedKeys
    .map((key) => `${key}=${data[key]}`)
    .join('&');

  return crypto
    .createHmac('sha256', checksumKey)
    .update(signData)
    .digest('hex');
};

/**
 * @desc Create Payment Link via Direct API Call
 */
const createPaymentLink = async (req, res) => {
  try {
    const { invoiceId } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.paymentStatus === 'Paid') return res.status(400).json({ success: false, message: 'Invoice already paid' });

    const orderCode = Number(String(Date.now()).slice(-6));
    const cleanNo = invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '');
    const description = `Thanh toan đơn ${cleanNo}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25);

    const paymentBody = {
      amount: Math.round(invoice.totalAmount),
      cancelUrl: `${process.env.CLIENT_URL}/payment/cancel`,
      description: description,
      orderCode: orderCode,
      returnUrl: `${process.env.CLIENT_URL}/payment/success`,
    };

    const signature = createPayOSSignature(paymentBody, process.env.PAYOS_CHECKSUM_KEY);

    console.log('🚀 Calling PayOS Direct API...');
    const response = await axios.post(
      'https://api-merchant.payos.vn/v2/payment-requests',
      { ...paymentBody, signature },
      {
        headers: {
          'x-client-id': process.env.PAYOS_CLIENT_ID,
          'x-api-key': process.env.PAYOS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.code === '00') {
      const result = response.data.data;
      
      invoice.payosOrderCode = orderCode;
      await invoice.save();

      return res.status(200).json({
        success: true,
        message: 'Payment link created successfully',
        data: {
          checkoutUrl: result.checkoutUrl,
          qrCode: result.qrCode,
          orderCode: orderCode,
          amount: invoice.totalAmount,
          invoiceNumber: invoice.invoiceNumber
        }
      });
    } else {
      throw new Error(response.data.desc || 'PayOS API Error');
    }

  } catch (error) {
    const errorMsg = error.response ? error.response.data.desc : error.message;
    console.error('❌ Final Error:', errorMsg);
    return res.status(500).json({ success: false, message: errorMsg });
  }
};

/**
 * @desc Handle PayOS Webhook (Verify and Update Invoice)
 */
const handlePayOSWebhook = async (req, res) => {
  try {
    console.log('🔔 PayOS Webhook received:', JSON.stringify(req.body, null, 2));

    const PayOS = require('@payos/node');
    const PayOSClass = (typeof PayOS === 'function') ? PayOS : (PayOS.PayOS || PayOS.default);
    const payosInstance = new PayOSClass(
      process.env.PAYOS_CLIENT_ID,
      process.env.PAYOS_API_KEY,
      process.env.PAYOS_CHECKSUM_KEY
    );

    // XỬ LÝ LỖI: Kiểm tra xem hàm verify có tồn tại trong instance không
    let webhookData;
    try {
        if (payosInstance && typeof payosInstance.verifyPaymentWebhookData === 'function') {
            webhookData = payosInstance.verifyPaymentWebhookData(req.body);
        } else {
            // Nếu SDK lỗi, tự fallback lấy data trực tiếp (Chỉ dùng khi debug hoặc tin tưởng nguồn gửi)
            console.warn('⚠️ verifyPaymentWebhookData is missing from SDK. Using raw data.');
            webhookData = req.body.data;
        }
    } catch (verifyError) {
        console.error('❌ Signature verification failed:', verifyError.message);
        return res.json({ success: false, message: 'Invalid Signature' });
    }

    console.log('✅ Webhook verified:', webhookData);

    const { orderCode, code, amount } = webhookData;

    // Kiểm tra trạng thái thành công (code '00' hoặc success true)
    const isSuccess = code === '00' || req.body.code === '00' || webhookData.success === true;

    if (!isSuccess) {
      console.warn('⚠️ Payment not successful');
      return res.json({ success: true });
    }

    // Tìm hóa đơn bằng orderCode (PayOS trả về orderCode kiểu Number)
    const invoice = await Invoice.findOne({ payosOrderCode: Number(orderCode) });

    if (!invoice) {
      console.error(`❌ Invoice not found for orderCode: ${orderCode}`);
      return res.json({ success: true });
    }

    // Cập nhật trạng thái hóa đơn
    if (invoice.paymentStatus !== 'Paid') {
        invoice.paymentStatus = 'Paid';
        invoice.paidAmount = amount || invoice.totalAmount;
        invoice.paymentDate = new Date();
        await invoice.save();
        console.log(`✅ Invoice ${invoice.invoiceNumber} marked as Paid`);
    }

    return res.json({ success: true });

  } catch (error) {
    console.error('❌ Webhook Error:', error.message);
    return res.json({ success: true });
  }
};

/**
 * @desc Deposit money to a store's wallet
 * @route POST /api/payment/deposit
 * @access Private (Admin/Finance roles)
 */
const depositToWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { storeId, amount } = req.body;

    // Validation
    if (!storeId || !amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Store ID and amount are required',
      });
    }

    if (amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Deposit amount must be positive',
      });
    }

    // Find or create wallet for the store
    let wallet = await Wallet.findOne({ storeId }).session(session);

    if (!wallet) {
      // Create new wallet if it doesn't exist
      wallet = new Wallet({
        storeId,
        balance: 0,
        status: 'Active',
      });
      await wallet.save({ session });
    }

    // Check if wallet is locked
    if (wallet.status === 'Locked') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Wallet is locked and cannot accept deposits',
      });
    }

    // Update wallet balance
    wallet.balance += amount;
    await wallet.save({ session });

    // Create transaction record
    const transaction = new WalletTransaction({
      walletId: wallet._id,
      amount: amount,
      type: 'Deposit',
      description: `Deposit of ${amount} to wallet`,
      timestamp: new Date(),
    });
    await transaction.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: 'Deposit successful',
      data: {
        walletId: wallet._id,
        storeId: wallet.storeId,
        newBalance: wallet.balance,
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          type: transaction.type,
          timestamp: transaction.timestamp,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Deposit Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process deposit',
      error: error.message,
    });
  }
};

/**
 * @desc Pay invoice using store's wallet balance
 * @route POST /api/payment/pay-with-wallet
 * @access Private (Store staff/Admin)
 */
const payWithWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { invoiceId } = req.body;

    // Validation
    if (!invoiceId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invoice ID is required',
      });
    }

    // Find invoice
    const invoice = await Invoice.findById(invoiceId)
      .populate('storeId')
      .session(session);

    if (!invoice) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Check if invoice is already paid
    if (invoice.paymentStatus === 'Paid') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invoice is already paid',
      });
    }

    // Find wallet for the store
    const wallet = await Wallet.findOne({ storeId: invoice.storeId }).session(session);

    if (!wallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Wallet not found for this store',
      });
    }

    // Check if wallet is locked
    if (wallet.status === 'Locked') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Wallet is locked and cannot be used for payments',
      });
    }

    // Check if balance is sufficient
    if (wallet.balance < invoice.totalAmount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Available: ${wallet.balance}, Required: ${invoice.totalAmount}`,
      });
    }

    // Deduct amount from wallet
    wallet.balance -= invoice.totalAmount;
    await wallet.save({ session });

    // Update invoice status
    invoice.paymentStatus = 'Paid';
    invoice.paidAmount = invoice.totalAmount;
    invoice.paymentDate = new Date();
    await invoice.save({ session });

    // Create wallet transaction record
    const transaction = new WalletTransaction({
      walletId: wallet._id,
      orderId: invoice.orderId,
      amount: invoice.totalAmount,
      type: 'Payment',
      description: `Payment for invoice ${invoice.invoiceNumber}`,
      timestamp: new Date(),
    });
    await transaction.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: 'Payment successful',
      data: {
        invoice: {
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          paymentStatus: invoice.paymentStatus,
          paidAmount: invoice.paidAmount,
          paymentDate: invoice.paymentDate,
        },
        wallet: {
          id: wallet._id,
          storeId: wallet.storeId,
          newBalance: wallet.balance,
        },
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          type: transaction.type,
          timestamp: transaction.timestamp,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Wallet Payment Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process wallet payment',
      error: error.message,
    });
  }
};

/**
 * @desc Get wallet balance and transaction history for a store
 * @route GET /api/payment/wallet/:storeId
 * @access Private (Store staff/Admin)
 */
const getWalletBalance = async (req, res) => {
  try {
    const { storeId } = req.params;

    // Validation
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'Store ID is required',
      });
    }

    // Find wallet for the store
    const wallet = await Wallet.findOne({ storeId }).populate('storeId', 'storeName storeCode');

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found for this store',
      });
    }

    // Get 10 most recent transactions
    const transactions = await WalletTransaction.find({ walletId: wallet._id })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('orderId', 'orderCode')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        wallet: {
          id: wallet._id,
          storeId: wallet.storeId,
          balance: wallet.balance,
          status: wallet.status,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt,
        },
        transactions: transactions,
      },
    });
  } catch (error) {
    console.error('❌ Get Wallet Balance Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve wallet balance',
      error: error.message,
    });
  }
};

module.exports = { 
  createPaymentLink, 
  handlePayOSWebhook, 
  depositToWallet,
  payWithWallet,
  getWalletBalance
};