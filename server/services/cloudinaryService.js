const cloudinary = require('../config/cloudinary');
const env = require('../config/env');
const logger = require('../utils/logger');

const isConfigured = () =>
  Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

/* Upload an in-memory buffer (from multer) to Cloudinary. If Cloudinary isn't
   configured yet, we no-op gracefully so the rest of the app keeps working. */
function uploadBuffer(buffer, folder = 'tailor-erp/fabrics') {
  if (!isConfigured()) {
    logger.warn('Cloudinary not configured — skipping image upload');
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id }))
    );
    stream.end(buffer);
  });
}

async function destroy(publicId) {
  if (!isConfigured() || !publicId) return;
  try { await cloudinary.uploader.destroy(publicId); }
  catch (e) { logger.error(`Cloudinary destroy failed: ${e.message}`); }
}

module.exports = { uploadBuffer, destroy, isConfigured };
