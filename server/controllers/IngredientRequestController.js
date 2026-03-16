const mongoose = require('mongoose');

const IngredientRequest = require('../models/IngredientRequests');
const IngredientBatch = require('../models/IngredientBatch');
const Ingredient = require('../models/Ingredient');


exports.createRequest = async (req, res) => {
  try {
    // 1. Nhận thêm neededByDate từ Frontend gửi lên
    const { ingredientId, quantityRequested, unit, requestType, note, neededByDate } = req.body;

    if (!ingredientId || !quantityRequested) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập đủ nguyên liệu và số lượng" });
    }

    const newRequest = new IngredientRequest({
      ingredientId,
      quantityRequested,
      unit: unit || 'kg',
      requestType: requestType || 'URGENT',
      neededByDate: neededByDate || null,
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
    // Lấy thêm expectedDeliveryDate và supplierId từ app của Điều phối gởi lên
    const { status, expectedDeliveryDate, supplierId } = req.body; 

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

    // Cập nhật trạng thái
    request.status = status;
    request.approvedBy = req.user._id; 

    // NẾU LÀ DUYỆT (APPROVED) PHIẾU KẾ HOẠCH -> Lưu ngày giao dự kiến và NCC
    if (status === 'APPROVED') {
      if (expectedDeliveryDate) request.expectedDeliveryDate = expectedDeliveryDate;
      if (supplierId) request.supplierId = supplierId; // Chốt luôn là mua của ai
    }

    await request.save();

    res.status(200).json({ 
      success: true, 
      message: `Đã ${status === 'APPROVED' ? 'duyệt' : 'từ chối'} phiếu`, 
      data: request 
    });
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
    // Dùng đúng tên biến: expiryDate
    const { actualCost, expiryDate, supplierId, supplierName, receiptImage } = req.body;

    // VALIDATE BẮT BUỘC: Phải có Hạn sử dụng
    if (!expiryDate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "An toàn thực phẩm: Bắt buộc phải nhập Hạn sử dụng (Expiry Date)." });
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
    if (supplierName) request.supplierName = supplierName;
    if (receiptImage) request.receiptImage = receiptImage;
    if (supplierId) request.supplierId = supplierId;
    await request.save({ session });

    // 4.2 TẠO LÔ MỚI (Khớp 100% với Schema IngredientBatch của bạn)
    const newBatch = new IngredientBatch({
      ingredientId: request.ingredientId,
      // NẾU KHÔNG CÓ SUPPLIER ID, BẠN PHẢI TRUYỀN ID CỦA 'NCC VÃNG LAI' VÀO ĐÂY ĐỂ TRÁNH LỖI (Tạm thời throw error nếu thiếu)
      supplierId: supplierId || request.supplierId, 
      batchCode: `REQ-${request.requestType === 'URGENT' ? 'URG' : 'PLN'}-${request._id.toString().substring(0, 5).toUpperCase()}`, 
      expiryDate: new Date(expiryDate),
      initialQuantity: request.quantityRequested,
      currentQuantity: request.quantityRequested,
      price: actualCost ? actualCost / request.quantityRequested : 0,
      isActive: true
    });

    if (!newBatch.supplierId) {
       await session.abortTransaction();
       session.endSession();
       return res.status(400).json({ success: false, message: "Lỗi Schema: Bắt buộc phải chọn Nhà cung cấp (supplierId) cho lô hàng mới." });
    }

    await newBatch.save({ session });

    // 4.3 CỰC KỲ QUAN TRỌNG: CỘNG TỒN KHO VÀO INGREDIENT GỐC
    const ingredient = await Ingredient.findById(request.ingredientId).session(session);
    if (ingredient) {
      ingredient.totalQuantity += request.quantityRequested;
      await ingredient.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ 
      success: true, 
      message: "Đã chốt hàng, lưu biên lai, tạo Lô kho mới và cập nhật Tồn kho thành công!" 
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Lỗi khi hoàn tất phiếu:", error);
    res.status(500).json({ success: false, message: error.message || "Lỗi server khi nhập kho" });
  }
};