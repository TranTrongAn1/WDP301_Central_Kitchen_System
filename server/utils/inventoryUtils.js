const Product = require('../models/Product');
const Ingredient = require('../models/Ingredient');

/**
 * Hàm quét toàn bộ sản phẩm và tự động bật/tắt isOutOfStock
 * Dựa trên Tồn kho khả dụng (Available = Total - Reserved)
 */
const updateAllProductsStockStatus = async (session = null) => {
  try {
    // 1. Lấy toàn bộ kho nguyên liệu lên và tính "Khả dụng"
    const ingredients = await Ingredient.find({}).session(session);
    const availableMap = {};
    ingredients.forEach(ing => {
      // Khả dụng = Có trong tủ lạnh - Đã hứa cho đơn khác
      availableMap[ing._id.toString()] = ing.totalQuantity - (ing.reservedQuantity || 0);
    });

    // 2. Lấy toàn bộ Sản phẩm đang bán (Kèm công thức của nó và bánh con)
    const products = await Product.find({ isActive: true })
      .populate({
        path: 'bundleItems.childProductId',
        select: 'recipe'
      })
      .session(session);

    const bulkOps = [];

    // 3. Phân tích từng sản phẩm
    for (const product of products) {
      let isOutOfStock = false;
      const requiredIngs = {}; // Gom nhóm lượng nguyên liệu cần cho ĐÚNG 1 CÁI BÁNH (hoặc 1 HỘP)

      // Kịch bản A: Sản phẩm đơn lẻ
      if (product.recipe && product.recipe.length > 0) {
        for (const item of product.recipe) {
          const ingId = item.ingredientId.toString();
          requiredIngs[ingId] = (requiredIngs[ingId] || 0) + item.quantity;
        }
      }

      // Kịch bản B: Hộp Combo
      if (product.bundleItems && product.bundleItems.length > 0) {
        for (const bundle of product.bundleItems) {
          const child = bundle.childProductId;
          if (child && child.recipe) {
            for (const item of child.recipe) {
              const ingId = item.ingredientId.toString();
              requiredIngs[ingId] = (requiredIngs[ingId] || 0) + (item.quantity * bundle.quantity);
            }
          }
        }
      }

      // 4. So sánh với kho: Chỉ cần 1 nguyên liệu bị thiếu -> Báo hết hàng cả bánh!
      for (const [ingId, qtyNeeded] of Object.entries(requiredIngs)) {
        const available = availableMap[ingId] || 0;
        if (available < qtyNeeded) {
          isOutOfStock = true;
          break; // Thiếu 1 món là đủ kết luận rồi, không cần check món khác
        }
      }

      // 5. Nếu trạng thái thay đổi so với DB thì mới cập nhật (Tránh ghi DB quá nhiều)
      if (product.isOutOfStock !== isOutOfStock) {
        bulkOps.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $set: { isOutOfStock: isOutOfStock } }
          }
        });
      }
    }

    // 6. Thực thi cập nhật hàng loạt (Cực kỳ tối ưu tốc độ)
    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps, { session });
      console.log(`[Auto-Sync] Đã tự động cập nhật trạng thái isOutOfStock cho ${bulkOps.length} sản phẩm.`);
    }

  } catch (error) {
    console.error('[Auto-Sync Error] Lỗi khi tự động kiểm tra tồn kho sản phẩm:', error);
  }
};

module.exports = { updateAllProductsStockStatus };