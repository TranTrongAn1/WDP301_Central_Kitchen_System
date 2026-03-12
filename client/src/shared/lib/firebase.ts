const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;
const DEFAULT_FOLDER = (import.meta.env.VITE_CLOUDINARY_FOLDER as string) || 'products';

/**
 * Upload ảnh sản phẩm lên Cloudinary (unsigned upload).
 * Trả về secure_url để lưu vào Product.image.
 */
export async function uploadProductImage(file: File, productId?: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured correctly (missing CLOUD_NAME or UPLOAD_PRESET).');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  // Folder để dễ quản lý trên Cloudinary, có thể group theo productId nếu cần
  const folder = productId ? `${DEFAULT_FOLDER}/${productId}` : DEFAULT_FOLDER;
  formData.append('folder', folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let message = 'Cannot upload image to Cloudinary.';
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) {
        message = errJson.error.message;
      }
    } catch {
      // ignore JSON parse error
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { secure_url?: string; url?: string };
  const url = data.secure_url || data.url;
  if (!url) {
    throw new Error('Cloudinary response missing secure_url.');
  }
  return url;
}

