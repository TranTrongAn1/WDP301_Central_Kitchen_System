const asyncHandler = require('express-async-handler');
const IngredientBatch = require('../models/IngredientBatch');
const Ingredient = require('../models/Ingredient');
const mongoose = require('mongoose');
const IngredientUsage = require('../models/IngredientUsage');
const { updateAllProductsStockStatus } = require('../utils/inventoryUtils');
/**
 * @desc    Get batches by ingredient ID
 * @route   GET /api/ingredients/:id/batches
 * @access  Private (All authenticated users can view)
 */
const getBatchesByIngredientId = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { activeOnly } = req.query;

  // Validate ingredient exists
  const ingredient = await Ingredient.findById(id);
  if (!ingredient) {
    res.status(404);
    throw new Error('Ingredient not found');
  }

  // Build query
  const query = { ingredientId: id };
  if (activeOnly === 'true') {
    query.isActive = true;
  }

  const batches = await IngredientBatch.find(query)
    .populate('ingredientId', 'ingredientName unit')
    .populate('supplierId', 'supplierName contactPhone')
    .sort({ expiryDate: 1 }); // Sort by expiry date (FEFO)

  res.status(200).json({
    success: true,
    count: batches.length,
    data: batches,
  });
});

/**
 * @desc    Get all ingredient batches
 * @route   GET /api/ingredient-batches
 * @access  Private (All authenticated users can view)
 */
const getAllBatches = asyncHandler(async (req, res) => {
  const { supplierId, isActive, expiring } = req.query;

  // Build query
  const query = {};

  if (supplierId) {
    query.supplierId = supplierId;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  // Handle expiring parameter (number of days until expiry)
  if (expiring) {
    const daysUntilExpiry = parseInt(expiring);
    if (!isNaN(daysUntilExpiry)) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysUntilExpiry);
      
      query.expiryDate = {
        $gte: new Date(), // Not expired yet
        $lte: futureDate, // Will expire within specified days
      };
    }
  }

  const batches = await IngredientBatch.find(query)
    .populate('ingredientId', 'ingredientName unit costPrice')
    .populate('supplierId', 'supplierName contactPhone email')
    .sort({ expiryDate: 1 }); // Sort by expiry date (FEFO)

  res.status(200).json({
    success: true,
    count: batches.length,
    data: batches,
  });
});

/**
 * @desc    Get single ingredient batch by ID
 * @route   GET /api/ingredient-batches/:id
 * @access  Private (All authenticated users can view)
 */
const getBatchById = asyncHandler(async (req, res) => {
  const batch = await IngredientBatch.findById(req.params.id)
    .populate('ingredientId', 'ingredientName unit costPrice warningThreshold totalQuantity')
    .populate('supplierId', 'supplierName contactPhone email address');

  if (!batch) {
    res.status(404);
    throw new Error('Ingredient batch not found');
  }

  res.status(200).json({
    success: true,
    data: batch,
  });
});

/**
 * @desc    Update ingredient batch
 * @route   PUT /api/ingredient-batches/:id
 * @access  Private (Admin, Kitchen_Manager, Manager only)
 */
const updateBatch = asyncHandler(async (req, res) => {
  const { currentQuantity, price, isActive } = req.body;

  // Find the batch
  const batch = await IngredientBatch.findById(req.params.id);
  if (!batch) {
    res.status(404);
    throw new Error('Ingredient batch not found');
  }

  // Store old quantity to calculate difference
  const oldQuantity = batch.currentQuantity;
  let quantityDifference = 0;

  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Update batch fields
    if (currentQuantity !== undefined) {
      if (currentQuantity < 0) throw new Error('Current quantity cannot be negative');
      batch.currentQuantity = currentQuantity;
      quantityDifference = currentQuantity - oldQuantity;

      // Auto-deactivate if quantity becomes 0
      if (currentQuantity === 0) batch.isActive = false;
    }

    if (price !== undefined) {
      if (price < 0) throw new Error('Price cannot be negative');
      batch.price = price;
    }

    if (isActive !== undefined) batch.isActive = isActive;

    await batch.save({ session });

    // Cập nhật Ingredient gốc nếu có thay đổi số lượng
    if (currentQuantity !== undefined && quantityDifference !== 0) {
      const ingredient = await Ingredient.findById(batch.ingredientId).session(session);
      
      if (!ingredient) throw new Error('Parent ingredient not found');

      ingredient.totalQuantity += quantityDifference;
      if (ingredient.totalQuantity < 0) throw new Error('Cannot update: would result in negative total quantity for ingredient');

      await ingredient.save({ session });

      // GHI LOG LỊCH SỬ CHỈNH SỬA KHO (ADJUSTMENT) 
      // Quy ước: Nếu quantityDifference < 0 là hao hụt/xuất kho. Nếu > 0 là nhập thêm/chỉnh sửa dư.
      // Vì bảng IngredientUsage của bạn thiết kế để ghi nhận 'sử dụng', ta sẽ lưu giá trị tuyệt đối của số lượng bị mất.
      const usageRecord = new IngredientUsage({
        ingredientId: batch.ingredientId,
        ingredientBatchId: batch._id,
        // Lưu số dương nếu trừ kho (hao hụt), lưu số âm nếu cộng kho (sửa nhầm)
        quantityUsed: -quantityDifference, 
        note: req.body.note || 'Điều chỉnh kho thủ công bởi Quản lý/Bếp trưởng',
        // productionPlanId: null -> Để trống để biết đây không phải do nấu ăn
      });
      await usageRecord.save({ session });
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // GỌI HÀM QUÉT MENU (Chạy ngầm sau khi Transaction thành công)
    if (quantityDifference !== 0) {
      const { updateAllProductsStockStatus } = require('../utils/inventoryUtils');
      updateAllProductsStockStatus().catch(console.error);
    }

    // Fetch updated batch with populated fields
    const updatedBatch = await IngredientBatch.findById(batch._id)
      .populate('ingredientId', 'ingredientName unit costPrice totalQuantity')
      .populate('supplierId', 'supplierName contactPhone');

    res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      data: updatedBatch,
    });

  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();
    
    res.status(400);
    throw error;
  }
});

module.exports = {
  getBatchesByIngredientId,
  getAllBatches,
  getBatchById,
  updateBatch,
};
