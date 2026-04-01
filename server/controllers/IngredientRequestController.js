const mongoose = require('mongoose');

const IngredientRequest = require('../models/IngredientRequests');
const IngredientBatch = require('../models/IngredientBatch');
const Ingredient = require('../models/Ingredient');
const { updateAllProductsStockStatus } = require('../utils/inventoryUtils');
const IngredientUsage = require('../models/IngredientUsage');

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
    // Thêm note vào destructuring từ req.body
    const { actualCost, expiryDate, supplierId, supplierName, receiptImage, note } = req.body;

    // 1. VALIDATE BẮT BUỘC
    if (!expiryDate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "An toàn thực phẩm: Bắt buộc phải nhập Hạn sử dụng." });
    }

    const request = await IngredientRequest.findById(id).session(session);
    
    if (!request || request.status !== 'APPROVED') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Yêu cầu không tồn tại hoặc chưa được duyệt (APPROVED)." });
    }

    // 2. CẬP NHẬT PHIẾU YÊU CẦU
    request.status = 'COMPLETED';
    request.actualCost = actualCost || 0;
    if (supplierName) request.supplierName = supplierName;
    if (receiptImage) request.receiptImage = receiptImage;
    if (supplierId) request.supplierId = supplierId;
    await request.save({ session });

    // 3. TẠO LÔ MỚI (IngredientBatch)
    // Kiểm tra supplierId trước khi tạo để tránh rollback lãng phí
    const finalSupplierId = supplierId || request.supplierId;
    if (!finalSupplierId) {
       await session.abortTransaction();
       session.endSession();
       return res.status(400).json({ success: false, message: "Lỗi: Thiếu ID nhà cung cấp cho lô hàng." });
    }

    const newBatch = new IngredientBatch({
      ingredientId: request.ingredientId,
      supplierId: finalSupplierId, 
      batchCode: `REQ-${request.requestType === 'URGENT' ? 'URG' : 'PLN'}-${request._id.toString().slice(-5).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      expiryDate: new Date(expiryDate),
      initialQuantity: request.quantityRequested,
      currentQuantity: request.quantityRequested,
      price: actualCost ? actualCost / request.quantityRequested : 0,
      isActive: true
    });

    await newBatch.save({ session });

    // 4. GHI NHẬN VÀO BẢNG USAGE (Lịch sử nhập lô)
    // Việc dùng số ÂM cho nhập kho là một cách hay để phân biệt với Xuất kho (số DƯƠNG)
    const usage = new IngredientUsage({
      productionPlanId: null, 
      productId: null,        
      ingredientId: request.ingredientId,
      ingredientBatchId: newBatch._id,
      quantityUsed: -request.quantityRequested, 
      note: note || `Nhập kho từ phiếu yêu cầu: ${request._id}. NCC: ${supplierName || 'N/A'}`,
      recordedAt: new Date()
    });

    await usage.save({ session });

    // 5. CẬP NHẬT TỔN KHO TỔNG (Ingredient)
    const ingredient = await Ingredient.findById(request.ingredientId).session(session);
    if (ingredient) {
      ingredient.totalQuantity += request.quantityRequested;
      await ingredient.save({ session });
    }

    // 6. HOÀN TẤT TRANSACTION
    await session.commitTransaction();
    session.endSession();

    // Side effect: Cập nhật trạng thái sản phẩm ngoài transaction
    updateAllProductsStockStatus().catch(err => console.error("Lỗi cập nhật stock status:", err));

    res.status(200).json({ 
      success: true, 
      message: "Đã chốt hàng, tạo lô và ghi nhận lịch sử sử dụng thành công!" 
    });

  } catch (error) {
    if (session.inAtomicityStatus !== 0) { // Kiểm tra nếu transaction còn mở thì mới abort
        await session.abortTransaction();
    }
    session.endSession();
    console.error("Lỗi hệ thống:", error);
    res.status(500).json({ success: false, message: error.message || "Lỗi server khi nhập kho" });
  }
};