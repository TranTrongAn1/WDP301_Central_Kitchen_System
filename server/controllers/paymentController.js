const Invoice = require('../models/Invoice');
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
 * @desc Create Payment Link via Direct API Call (Bypass SDK bugs)
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

    // 1. Chuẩn bị dữ liệu thanh toán
    const paymentBody = {
      amount: Math.round(invoice.totalAmount),
      cancelUrl: `${process.env.CLIENT_URL}/payment/cancel`,
      description: description,
      orderCode: orderCode,
      returnUrl: `${process.env.CLIENT_URL}/payment/success`,
    };

    // 2. Tạo Signature thủ công
    const signature = createPayOSSignature(paymentBody, process.env.PAYOS_CHECKSUM_KEY);

    // 3. Gọi trực tiếp API PayOS bằng Axios
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

    // 1. Initialize PayOS with safe pattern
    const PayOS = require('@payos/node');
    const PayOSClass = (typeof PayOS === 'function') ? PayOS : (PayOS.PayOS || PayOS.default);
    const payosInstance = new PayOSClass(
      process.env.PAYOS_CLIENT_ID,
      process.env.PAYOS_API_KEY,
      process.env.PAYOS_CHECKSUM_KEY
    );

    // 2. Verify webhook data authenticity
    const webhookData = payosInstance.verifyPaymentWebhookData(req.body);
    console.log('✅ Webhook verified:', webhookData);

    // 3. Extract payment information
    const { orderCode, code, desc, amount } = webhookData;

    // 4. Check if payment was successful
    const isSuccess = code === '00' || webhookData.success === true;

    if (!isSuccess) {
      console.warn('⚠️ Payment not successful:', desc);
      return res.json({ success: true }); // Still return success to prevent retries
    }

    // 5. Find invoice by orderCode
    const invoice = await Invoice.findOne({ payosOrderCode: orderCode });

    if (!invoice) {
      console.error(`❌ Invoice not found for orderCode: ${orderCode}`);
      return res.json({ success: true }); // Still return success
    }

    // 6. Update invoice status
    invoice.paymentStatus = 'Paid';
    invoice.paidAmount = amount || invoice.totalAmount;
    invoice.paymentDate = new Date();
    await invoice.save();

    console.log(`✅ Invoice ${invoice.invoiceNumber} marked as Paid`);

    return res.json({ success: true });

  } catch (error) {
    console.error('❌ Webhook Error:', error.message);
    // Always return success to prevent PayOS from retrying
    return res.json({ success: true });
  }
};

module.exports = { createPaymentLink, handlePayOSWebhook };