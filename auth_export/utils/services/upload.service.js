import cloudinary from "../../config/cloudinary.js";
import fs from "fs";

export const uploadToCloudinary = async (localFilePath, folder = "user_profiles") => {
  try {
    if (!localFilePath) return null;
    const result = await cloudinary.uploader.upload(localFilePath, { folder });
    fs.unlinkSync(localFilePath); 
    return result.secure_url;
  } catch (err) {
    throw new Error("Cloudinary upload failed: " + err.message);
  }
};
