import { Platform } from "react-native";

/**
 * Hàm upload ảnh lên Cloudinary dành cho React Native
 * @param {string|object} fileInput - Có thể là URI (string) hoặc Object chứa {uri, type, name}
 * @returns {Promise<string|null>} - Trả về URL ảnh (https) hoặc null nếu lỗi
 */
export const uploadToCloudinary = async (fileInput) => {
  const cloudName = 'dlhohaq79';
  const uploadPreset = 'central_kitchen_products'; 

  try {
    // 1. Kiểm tra đầu vào và lấy URI chuẩn
    // Nếu fileInput là object (từ ImagePicker), lấy thuộc tính .uri
    let fileUri = typeof fileInput === 'object' ? fileInput.uri : fileInput;

    if (!fileUri) {
      console.error("Cloudinary Upload: fileUri không hợp lệ hoặc bị undefined");
      return null;
    }

    // 2. Chuẩn hóa URI cho Android (Phải có tiền tố file:// để fetch hiểu đó là file cục bộ)
    const finalUri = Platform.OS === 'android' && !fileUri.startsWith('file://') 
                      ? `file://${fileUri}` 
                      : fileUri;

    // 3. Khởi tạo FormData
    const data = new FormData();
    
    // Định nghĩa cấu trúc file mà React Native yêu cầu để upload multipart/form-data
    data.append('file', {
      uri: finalUri,
      type: 'image/jpeg', // Mặc định là jpeg, Cloudinary sẽ tự nhận diện lại định dạng thực tế
      name: 'upload_image.jpg',
    });
    
    data.append('upload_preset', uploadPreset);

    // 4. Thực hiện fetch request
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: data,
        // LƯU Ý CỰC QUAN TRỌNG: 
        // Không set 'Content-Type': 'multipart/form-data' thủ công.
        // Để fetch tự động tạo boundary thì upload mới thành công.
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    const result = await response.json();

    // 5. Kiểm tra kết quả trả về từ Cloudinary
    if (result.error) {
      console.error("Cloudinary API Error:", result.error.message);
      return null;
    }

    // Trả về link bảo mật https
    return result.secure_url; 

  } catch (error) {
    // Thường là lỗi Network request failed (do sai format FormData hoặc mất mạng)
    console.error("Lỗi kết nối khi upload Cloudinary:", error);
    return null;
  }
};