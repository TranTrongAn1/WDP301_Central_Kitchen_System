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
    // Lấy thêm trường 'images' (mảng URL Cloudinary) từ body
    const { rating, content, tags, images } = req.body; 
    const userId = req.user._id;
    const numericRating = Number(rating);

    // 1. Xử lý Tags (Giữ nguyên logic cũ nhưng làm gọn lại)
    let parsedTags = [];
    if (Array.isArray(tags)) {
      parsedTags = tags.map((tag) => String(tag).trim()).filter(Boolean);
    } else if (typeof tags === 'string' && tags.trim() !== '') {
      try {
        const jsonTags = JSON.parse(tags);
        parsedTags = Array.isArray(jsonTags) 
          ? jsonTags.map(t => String(t).trim()).filter(Boolean)
          : tags.split(',').map(t => t.trim()).filter(Boolean);
      } catch (e) {
        parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    // 2. XỬ LÝ HÌNH ẢNH (PHẦN CẦN SỬA)
    let finalImages = [];
    
    // Kiểm tra file vật lý upload trực tiếp lên Render
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      finalImages = files.map(
        (file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
      );
    } 
    // Nếu không có file vật lý, kiểm tra xem có mảng URL Cloudinary từ body không
    else if (Array.isArray(images) && images.length > 0) {
      finalImages = images;
    }

    // 3. Validate input
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      res.status(400);
      return next(new Error('Rating must be between 1 and 5'));
    }

    // 4. Kiểm tra đơn hàng (Order)
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    if (order.status !== 'Received') {
      res.status(400);
      return next(new Error('Can only provide feedback for received orders'));
    }

    // 5. Kiểm tra Feedback đã tồn tại chưa
    const existingFeedback = await Feedback.findOne({ orderId });
    if (existingFeedback) {
      res.status(400);
      return next(new Error('Feedback already exists for this order'));
    }

    // 6. TẠO FEEDBACK MỚI
    const feedback = await Feedback.create({
      orderId,
      storeId: order.storeId,
      rating: numericRating,
      content: content || '',
      tags: parsedTags,
      images: finalImages, // Sử dụng mảng ảnh đã xử lý ở bước 2
      createdBy: userId,
    });

    // 7. Populate và trả về dữ liệu
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
    // Lấy thêm trường 'images' từ body (Đây là mảng URL Cloudinary)
    const { rating, content, tags, images } = req.body; 
    const userId = req.user._id;

    // 1. Tìm Feedback hiện có
    const feedback = await Feedback.findOne({ orderId });

    if (!feedback) {
      res.status(404);
      return next(new Error('Feedback not found'));
    }

    // 2. Kiểm tra quyền sở hữu
    if (feedback.createdBy.toString() !== userId.toString()) {
      res.status(403);
      return next(new Error('Not authorized to update this feedback'));
    }

    // 3. Xử lý Rating
    const hasRating = rating !== undefined && rating !== null && String(rating).trim() !== '';
    if (hasRating) {
      const numericRating = Number(rating);
      if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        res.status(400);
        return next(new Error('Rating must be between 1 and 5'));
      }
      feedback.rating = numericRating;
    }

    // 4. Xử lý Content
    if (content !== undefined) {
      feedback.content = content.trim();
    }

    // 5. Xử lý Tags (Hỗ trợ cả mảng và chuỗi JSON)
    if (tags !== undefined) {
      let parsedTags = [];
      if (Array.isArray(tags)) {
        parsedTags = tags.map((tag) => String(tag).trim()).filter(Boolean);
      } else if (typeof tags === 'string' && tags.trim() !== '') {
        try {
          const jsonTags = JSON.parse(tags);
          parsedTags = Array.isArray(jsonTags) 
            ? jsonTags.map(t => String(t).trim()).filter(Boolean)
            : tags.split(',').map(t => t.trim()).filter(Boolean);
        } catch (e) {
          parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
        }
      }
      feedback.tags = parsedTags;
    }

    // 6. XỬ LÝ HÌNH ẢNH (PHẦN QUAN TRỌNG NHẤT)
    let finalImages = feedback.images; // Mặc định giữ ảnh cũ

    // Trường hợp A: Có file upload trực tiếp lên Render (qua Multer)
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      finalImages = files.map(
        (file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
      );
    } 
    // Trường hợp B: Có mảng URL Cloudinary gửi từ body (Ưu tiên nếu Mobile đã upload xong)
    else if (Array.isArray(images) && images.length > 0) {
      finalImages = images;
    }

    feedback.images = finalImages;

    // 7. Lưu và trả về kết quả
    await feedback.save();

    // Populate thông tin liên quan
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
