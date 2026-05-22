import { v2 as cloudinary } from "cloudinary";

// Initialize Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class CloudinaryService {
  async uploadAvatar(buffer, userId) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `todoapp/avatars/${userId}`,
          public_id: `avatar_${Date.now()}`,
          overwrite: true,
          invalidate: true,
          resource_type: "image",
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face", fetch_format: "auto", quality: "auto" }
          ]
        },
        (error, result) => {
          if (error) {
            console.error(`Cloudinary upload failed for user ${userId}:`, error.message || error);
            reject(error);
          } else {
            console.log("Avatar upload successful:", {
              userId,
              publicId: result.public_id,
              secureUrlExists: !!result.secure_url
            });
            resolve({
              publicId: result.public_id,
              secureUrl: result.secure_url,
              thumbnails: this.generateThumbnails(result.secure_url)
            });
          }
        }
      );
      uploadStream.end(buffer);
    });
  }

  /**
   * Delete resources on Cloudinary
   * @param {string} publicId - The resource public ID
   * @returns {Promise<object>} Destroy status
   */
  async deleteAvatar(publicId) {
    if (!publicId) return { result: "not_found" };
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, { invalidate: true }, (error, result) => {
        if (error) {
          console.error("Cloudinary deletion failed:", error);
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Extract public ID from a Cloudinary URL
   * @param {string} url - The secure URL
   * @returns {string|null} The public ID
   */
  extractPublicId(url) {
    if (!url) return null;
    try {
      const parts = url.split("/upload/");
      if (parts.length < 2) return null;
      const pathAfterUpload = parts[1];
      const segments = pathAfterUpload.split("/");
      if (segments[0].match(/^v\d+$/)) {
        segments.shift();
      }
      const publicIdWithExtension = segments.join("/");
      return publicIdWithExtension.replace(/\.[^/.]+$/, "");
    } catch (e) {
      console.error("Failed to extract public_id from Cloudinary URL:", e);
      return null;
    }
  }

  /**
   * Generates URLs for small and medium thumbnails dynamically
   * @param {string} secureUrl - Original avatar secure URL
   * @returns {object} Object containing small and medium thumbnail URLs
   */
  generateThumbnails(secureUrl) {
    if (!secureUrl) return { small: null, medium: null };
    try {
      const parts = secureUrl.split("/upload/");
      if (parts.length < 2) return { small: secureUrl, medium: secureUrl };
      const smallUrl = `${parts[0]}/upload/c_fill,f_auto,g_face,h_80,q_auto,w_80/${parts[1]}`;
      const mediumUrl = `${parts[0]}/upload/c_fill,f_auto,g_face,h_200,q_auto,w_200/${parts[1]}`;
      return {
        small: smallUrl,
        medium: mediumUrl
      };
    } catch (e) {
      return { small: secureUrl, medium: secureUrl };
    }
  }
}

export default new CloudinaryService();
