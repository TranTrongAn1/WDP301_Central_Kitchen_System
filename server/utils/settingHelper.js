const SystemSetting = require('../models/SystemSetting'); // Sửa đường dẫn nếu cần

/**
 * Lấy giá trị setting dạng số (Number)
 * @param {string} key - Tên khóa (VD: MAX_DELIVERY_TRIPS_PER_DAY)
 * @param {number} defaultValue - Giá trị mặc định nếu không tìm thấy trong DB
 */
const getSettingNumber = async (key, defaultValue = 0) => {
  try {
    const setting = await SystemSetting.findOne({ key });
    if (setting && setting.value) {
      return Number(setting.value);
    }
    return defaultValue;
  } catch (error) {
    console.error(`Lỗi khi lấy setting ${key}:`, error);
    return defaultValue;
  }
};

module.exports = { getSettingNumber };