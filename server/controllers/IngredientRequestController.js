const mongoose = require('mongoose');

const IngredientRequest = require('../models/IngredientRequests');
const IngredientBatch = require('../models/IngredientBatch');
const Ingredient = require('../models/Ingredient');


exports.createRequest = async (req, res) => {
  try {
    const { ingredientId, quantityRequested, unit, note } = req.body;

    // Validate cơ bản
    if (!ingredientId || !quantityRequested) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập đủ nguyên liệu và số lượng" });
    }

    const newRequest = new IngredientRequest({
      ingredientId,
      quantityRequested,
      unit: unit || 'kg',
      note,
      status: 'PENDING',
      requestedBy: req.user._id 
    });

    await newRequest.save();

    res.status(201).json({ success: true, message: "Tạo yêu cầu mua hàng thành công", data: newRequest });
  } catch (error) {
    console.error("Lỗi khi tạo yêu cầu:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 2. LẤY DANH SÁCH YÊU CẦU (Có filter theo status)
exports.getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Điều kiện lọc
    const filter = {};
    if (status && status !== 'ALL') {
      filter.status = status;
    }

    // Dùng populate để lấy tên nguyên liệu từ bảng Ingredients
    const requests = await IngredientRequest.find(filter)
      .populate('ingredientId', 'name code') // Kéo field name và code từ Ingredient
      .sort({ createdAt: -1 }); // Mới nhất lên đầu

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 3. ĐIỀU PHỐI DUYỆT / TỪ CHỐI YÊU CẦU
exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' hoặc 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
    }

    const request = await IngredientRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu yêu cầu" });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: "Chỉ có thể duyệt phiếu đang ở trạng thái PENDING" });
    }

    request.status = status;
     request.approvedBy = req.user._id; 
    await request.save();

    res.status(200).json({ success: true, message: `Đã ${status === 'APPROVED' ? 'duyệt' : 'từ chối'} phiếu`, data: request });
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 4. CHỐT HÀNG & NHẬP TIỀN ĐI CHỢ (Tự động nhập kho bằng Mongoose Transaction)
exports.completeRequest = async (req, res) => {
  // Bắt đầu một session để dùng Transaction (Đảm bảo an toàn dữ liệu)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { actualCost } = req.body;

    // Tìm request trong khuôn khổ session
    const request = await IngredientRequest.findById(id).session(session);
    
    if (!request) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu yêu cầu" });
    }

    if (request.status !== 'APPROVED') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Chỉ có thể hoàn tất phiếu đã được APPROVED" });
    }

    // 4.1 Cập nhật Phiếu thành COMPLETED
    request.status = 'COMPLETED';
    request.actualCost = actualCost || 0;
    await request.save({ session });

    // 4.2 TỰ ĐỘNG CỘNG TỒN KHO: Tạo lô mới trong bảng IngredientBatch
    const newBatch = new IngredientBatch({
      ingredientId: request.ingredientId,
      quantity: request.quantityRequested,
      originalQuantity: request.quantityRequested,
      unitPrice: actualCost ? actualCost / request.quantityRequested : 0,
      batchCode: `REQ-${request._id.toString().substring(0, 6).toUpperCase()}`, // Sinh mã lô nhanh
      importDate: new Date(),
      note: `Tự động nhập kho từ Phiếu Yêu Cầu #${request._id.toString().substring(0, 8)}`
    });

    await newBatch.save({ session });

    // Xác nhận lưu toàn bộ thay đổi
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, message: "Đã chốt hàng, nhập tiền và TỰ ĐỘNG CỘNG KHO thành công!" });
  } catch (error) {
    // Nếu có lỗi, rollback (hủy) toàn bộ thay đổi
    await session.abortTransaction();
    session.endSession();
    console.error("Lỗi khi hoàn tất phiếu:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi nhập kho" });
  }
};