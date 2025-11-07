export const uploadToCloudinary = async (file, options = {}) => {
  const CLOUD_NAME = import.meta.env.VITE_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_UPLOAD_PRESET;

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary env vars missing: VITE_CLOUD_NAME or VITE_UPLOAD_PRESET');
  }

  const resourceType = file?.type?.startsWith('image/') ? 'image' : 'raw';
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  if (options.folder) {
    formData.append('folder', options.folder);
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || 'Cloudinary upload failed';
    throw new Error(message);
  }

  return data.secure_url || data.url;
};

export const isImageUrl = (url) => {
  if (!url) return false;
  const extMatch = url.match(/\.(png|jpe?g|gif|webp|bmp|tiff)$/i);
  const cldImage = url.includes('/image/upload/');
  return !!(extMatch || cldImage);
};

export const thumbnailUrl = (url, { width = 160, height = 120 } = {}) => {
  if (!url) return url;
  // If Cloudinary image, inject a simple transformation for a small thumbnail
  if (url.includes('/image/upload/')) {
    return url.replace(
      '/image/upload/',
      `/image/upload/c_fill,f_auto,q_auto,w_${width},h_${height}/`
    );
  }
  // Fallback: return original; browser will scale
  return url;
};