const Feedback = require('../models/Feedback');
const Order = require('../models/Order');
const Store = require('../models/Store');

/**
 * @desc    Create feedback for an order
 * @route   POST /api/feedback/:orderId
 * @access  Private (Store Manager, Store Staff)
 */
const createFeedback = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { rating, content, tags } = req.body;
    const userId = req.user._id;
    const numericRating = Number(rating);

    let parsedTags = [];
    if (Array.isArray(tags)) {
      parsedTags = tags.map((tag) => String(tag).trim()).filter(Boolean);
    } else if (typeof tags === 'string' && tags.trim() !== '') {
      const rawTags = tags.trim();
      try {
        const jsonTags = JSON.parse(rawTags);
        if (Array.isArray(jsonTags)) {
          parsedTags = jsonTags.map((tag) => String(tag).trim()).filter(Boolean);
        } else {
          parsedTags = rawTags.split(',').map((tag) => tag.trim()).filter(Boolean);
        }
      } catch (parseError) {
        parsedTags = rawTags.split(',').map((tag) => tag.trim()).filter(Boolean);
      }
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const imageUrls = files.map(
      (file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
    );

    // Validate input
    if (!numericRating) {
      res.status(400);
      return next(new Error('Rating is required'));
    }

    if (numericRating < 1 || numericRating > 5) {
      res.status(400);
      return next(new Error('Rating must be between 1 and 5'));
    }

    // Check if Order exists and is in Received status
    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    if (order.status !== 'Received') {
      res.status(400);
      return next(
        new Error('Can only provide feedback for received orders')
      );
    }

    // Check if feedback already exists for this order
    const existingFeedback = await Feedback.findOne({ orderId });

    if (existingFeedback) {
      res.status(400);
      return next(new Error('Feedback already exists for this order'));
    }

    // Verify store exists
    const store = await Store.findById(order.storeId);

    if (!store) {
      res.status(404);
      return next(new Error('Store not found'));
    }

    // Create feedback
    const feedback = await Feedback.create({
      orderId,
      storeId: order.storeId,
      rating: numericRating,
      content: content || '',
      tags: parsedTags,
      images: imageUrls,
      createdBy: userId,
    });

    // Populate references
    await feedback.populate([
      { path: 'orderId', select: 'orderCode status' },
      { path: 'storeId', select: 'storeName storeCode' },
      { path: 'createdBy', select: 'username email' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Feedback created successfully',
      data: feedback,
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      res.status(400);
      return next(new Error('Feedback already exists for this order'));
    }
    next(error);
  }
};

/**
 * @desc    Get feedback for a specific order
 * @route   GET /api/feedback/:orderId
 * @access  Private
 */
const getFeedbackByOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    // Check if order exists
    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    // Find feedback for this order
    const feedback = await Feedback.findOne({ orderId }).populate([
      { path: 'orderId', select: 'orderCode status receivedDate' },
      { path: 'storeId', select: 'storeName storeCode address' },
      { path: 'createdBy', select: 'username email' },
    ]);

    if (!feedback) {
      res.status(404);
      return next(new Error('Feedback not found for this order'));
    }

    res.status(200).json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all feedbacks (Admin/Manager view)
 * @route   GET /api/feedback
 * @access  Private (Admin, Manager)
 */
const getAllFeedbacks = async (req, res, next) => {
  try {
    const { rating, storeId, startDate, endDate } = req.query;

    // Build filter
    const filter = {};

    if (rating) {
      filter.rating = parseInt(rating);
    }

    if (storeId) {
      filter.storeId = storeId;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const feedbacks = await Feedback.find(filter)
      .populate([
        { path: 'orderId', select: 'orderCode status' },
        { path: 'storeId', select: 'storeName storeCode' },
        { path: 'createdBy', select: 'username email' },
      ])
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update feedback
 * @route   PUT /api/feedback/:orderId
 * @access  Private (Creator only)
 */
const updateFeedback = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { rating, content, tags } = req.body;
    const userId = req.user._id;
    const hasRating = rating !== undefined && rating !== null && String(rating).trim() !== '';
    const numericRating = hasRating ? Number(rating) : undefined;

    let hasParsedTags = false;
    let parsedTags = [];
    if (Array.isArray(tags)) {
      hasParsedTags = true;
      parsedTags = tags.map((tag) => String(tag).trim()).filter(Boolean);
    } else if (typeof tags === 'string') {
      const rawTags = tags.trim();
      if (rawTags !== '') {
        hasParsedTags = true;
        try {
          const jsonTags = JSON.parse(rawTags);
          if (Array.isArray(jsonTags)) {
            parsedTags = jsonTags.map((tag) => String(tag).trim()).filter(Boolean);
          } else {
            parsedTags = rawTags.split(',').map((tag) => tag.trim()).filter(Boolean);
          }
        } catch (parseError) {
          parsedTags = rawTags.split(',').map((tag) => tag.trim()).filter(Boolean);
        }
      }
    }

    // Find feedback
    const feedback = await Feedback.findOne({ orderId });

    if (!feedback) {
      res.status(404);
      return next(new Error('Feedback not found'));
    }

    // Check if user is the creator
    if (feedback.createdBy.toString() !== userId.toString()) {
      res.status(403);
      return next(new Error('Not authorized to update this feedback'));
    }

    // Validate rating if provided
    if (hasRating && (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5)) {
      res.status(400);
      return next(new Error('Rating must be between 1 and 5'));
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const hasNewImages = files.length > 0;
    const newImageUrls = files.map(
      (file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
    );

    // Update fields
    if (hasRating) feedback.rating = numericRating;
    if (content !== undefined) feedback.content = content;
    if (hasParsedTags) feedback.tags = parsedTags;
    if (hasNewImages) feedback.images = newImageUrls;

    await feedback.save();

    // Populate references
    await feedback.populate([
      { path: 'orderId', select: 'orderCode status' },
      { path: 'storeId', select: 'storeName storeCode' },
      { path: 'createdBy', select: 'username email' },
    ]);

    res.status(200).json({
      success: true,
      message: 'Feedback updated successfully',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete feedback
 * @route   DELETE /api/feedback/:orderId
 * @access  Private (Admin, Creator)
 */
const deleteFeedback = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role?.roleName;

    // Find feedback
    const feedback = await Feedback.findOne({ orderId });

    if (!feedback) {
      res.status(404);
      return next(new Error('Feedback not found'));
    }

    // Check authorization (Admin or Creator)
    if (
      userRole !== 'Admin' &&
      feedback.createdBy.toString() !== userId.toString()
    ) {
      res.status(403);
      return next(new Error('Not authorized to delete this feedback'));
    }

    await feedback.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Feedback deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFeedback,
  getFeedbackByOrder,
  getAllFeedbacks,
  updateFeedback,
  deleteFeedback,
};
