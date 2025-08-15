/**
 * Converts a file to a base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} A promise that resolves with the base64 string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

/**
 * Converts a canvas to a base64 string
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {number} [quality=0.7] - Image quality (0-1)
 * @returns {string} The base64 string
 */
export const canvasToBase64 = (canvas, quality = 0.7) => {
  return canvas.toDataURL('image/jpeg', quality);
};

/**
 * Resizes an image to a maximum dimension while maintaining aspect ratio
 * @param {string} base64 - The base64 string of the image
 * @param {number} maxDimension - Maximum width/height
 * @returns {Promise<string>} A promise that resolves with the resized base64 string
 */
export const resizeImage = (base64, maxDimension = 800) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions
      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
      
      // Create canvas for resizing
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert back to base64
      const resizedBase64 = canvasToBase64(canvas);
      resolve(resizedBase64);
    };
    
    // If image fails to load, return original
    img.onerror = () => resolve(base64);
  });
};
