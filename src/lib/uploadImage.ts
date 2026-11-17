// src/lib/uploadImage.ts
import imageCompression from 'browser-image-compression';

export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary setup missing in .env");
  }

  // 1. Compress Image (Max 1MB, Max width/height 1024px)
  const options = {
    maxSizeMB: 0.5, // 500 KB kulla compress aagidum
    maxWidthOrHeight: 1024,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);

    // 2. Prepare for Cloudinary
    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("upload_preset", uploadPreset);

    // 3. Upload to Cloudinary API
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();
    
    if (data.secure_url) {
      return data.secure_url; // Ithu thaan namba Firebase-la save panna pora link!
    } else {
      throw new Error("Image upload failed");
    }
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};