import ImageKit from 'imagekit';

// Initialize ImageKit with your credentials
// Get these from https://imagekit.io/dashboard/developer/api-keys
const imagekit = new ImageKit({
  publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || 'public_key',
  privateKey: import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY || 'private_key',
  urlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/your_imagekit_id',
  authenticationEndpoint: import.meta.env.VITE_IMAGEKIT_AUTH_ENDPOINT || `${import.meta.env.VITE_API_URL}/api/imagekit/auth`,
});

/**
 * Upload image to ImageKit
 * @param {File} file - The image file to upload
 * @param {string} folder - Folder path (e.g., 'products', 'damage')
 * @returns {Promise} - Returns uploaded file details
 */
export const uploadImageToKit = async (file, folder = 'products') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    formData.append('folder', `/${folder}`);

    // Get authentication signature from backend
    const authResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/imagekit/auth`, {
      method: 'GET',
    });
    const authData = await authResponse.json();

    formData.append('signature', authData.signature);
    formData.append('expire', authData.expire);
    formData.append('token', authData.token);
    formData.append('publicKey', import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY);

    // Upload to ImageKit
    const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData,
    });

    const uploadData = await uploadResponse.json();

    if (uploadData.error) {
      throw new Error(uploadData.error.message);
    }

    return {
      url: uploadData.url,
      fileId: uploadData.fileId,
      name: uploadData.name,
      size: uploadData.size,
    };
  } catch (error) {
    console.error('ImageKit upload error:', error);
    throw error;
  }
};

/**
 * Delete image from ImageKit
 * @param {string} fileId - The file ID to delete
 * @returns {Promise}
 */
export const deleteImageFromKit = async (fileId) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/imagekit/delete/${fileId}`, {
      method: 'DELETE',
    });
    return response.json();
  } catch (error) {
    console.error('ImageKit delete error:', error);
    throw error;
  }
};

export default imagekit;
