const mongoose = require('mongoose');

const IngredientRequest = require('../models/IngredientRequests');
const IngredientBatch = require('../models/IngredientBatch');
const Ingredient = require('../models/Ingredient');


exports.createRequest = async (req, res) => {
  try {
    const { ingredientId, quantityRequested, unit, requestType, note } = req.body;

    // Validate cơ bản
    if (!ingredientId || !quantityRequested) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập đủ nguyên liệu và số lượng" });
    }

    const newRequest = new IngredientRequest({
      ingredientId,
      quantityRequested,
      unit: unit || 'kg',
      requestType: requestType || 'URGENT', // THÊM DÒNG NÀY ĐỂ LƯU VÀO DB
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
// 2. LẤY DANH SÁCH YÊU CẦU (Có filter theo status)
exports.getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Điều kiện lọc
    const filter = {};
    if (status && status !== 'ALL') {
      filter.status = status;
    }

    // SỬA DÒNG NÀY: Thêm 'ingredientName' vào list các field cần populate
    const requests = await IngredientRequest.find(filter)
      .populate('ingredientId', 'name ingredientName code unit') // Cứ liệt kê hết các field có thể chứa tên vào đây cho chắc cú
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

exports.completeRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    // Bắt buộc Frontend phải gửi kèm expDate (Hạn sử dụng) và thông tin nguồn gốc
    const { actualCost, expDate, mfgDate, supplierId, supplierName, receiptImage } = req.body;

    // VALIDATE BẮT BUỘC TRONG F&B: Phải có Hạn sử dụng
    if (!expDate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "An toàn thực phẩm: Bắt buộc phải nhập Hạn sử dụng (EXP) của lô hàng mới." });
    }

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

    // 4.1 Cập nhật thông tin phiếu mua hàng
    request.status = 'COMPLETED';
    request.actualCost = actualCost || 0;
    if (supplierId) request.supplierId = supplierId;
    if (supplierName) request.supplierName = supplierName;
    if (receiptImage) request.receiptImage = receiptImage;
    await request.save({ session });

    // 4.2 TẠO LÔ MỚI (Luôn luôn tạo lô mới để không mix lộn hạn sử dụng)
    const newBatch = new IngredientBatch({
      ingredientId: request.ingredientId,
      quantity: request.quantityRequested,
      originalQuantity: request.quantityRequested,
      unitPrice: actualCost ? actualCost / request.quantityRequested : 0,
      
      // TRUY XUẤT NGUỒN GỐC NẰM Ở ĐÂY
      mfgDate: mfgDate || new Date(), // Ngày sản xuất
      expDate: expDate,               // Ngày hết hạn (Chìa khóa quản lý)
      supplierId: supplierId || null, 
      
      batchCode: `REQ-${request.requestType === 'URGENT' ? 'URG' : 'PLN'}-${request._id.toString().substring(0, 5).toUpperCase()}`, 
      importDate: new Date(),
      note: `Tự động nhập kho từ Phiếu Yêu Cầu #${request._id.toString().substring(0, 5)}. Nguồn: ${supplierName || 'NCC Hệ thống'}`
    });

    await newBatch.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ 
      success: true, 
      message: "Đã chốt hàng, lưu biên lai và tạo Lô kho mới thành công!" 
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Lỗi khi hoàn tất phiếu:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi nhập kho" });
  }
};