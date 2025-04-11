import cloudinary from '../config/cloudinary.js';

/**
 * Uploads an image to Cloudinary
 * @param {Express.Multer.File} file - The file to upload
 * @returns {Promise<string>} - URL of the uploaded image
 */
const uploadImage = async (file) => {
    // Convert buffer to base64
    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = `data:${file.mimetype};base64,${b64}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'cravebites',
        resource_type: 'auto'
    });

    return result.secure_url;
};

export default uploadImage; 