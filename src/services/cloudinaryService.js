export const uploadToCloudinary = (file, options = {}) => {
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

  // If caller provided an onProgress callback, use XHR to get upload progress events
  if (typeof options.onProgress === 'function') {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', endpoint);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            try {
              options.onProgress(percent);
            } catch (err) {
              // swallow progress handler errors
              console.warn('onProgress handler error:', err);
            }
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText || '{}');
              resolve(data.secure_url || data.url);
            } catch (err) {
              reject(err);
            }
          } else {
            try {
              const data = JSON.parse(xhr.responseText || '{}');
              const message = data?.error?.message || 'Cloudinary upload failed';
              reject(new Error(message));
            } catch (err) {
              reject(new Error('Cloudinary upload failed'));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error during Cloudinary upload'));
        xhr.send(formData);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Fallback: use fetch when progress tracking is not required
  return (async () => {
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
  })();
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