import cloudinary from "./config/cloudinary.js";
import dotenv from "dotenv";
dotenv.config();

console.log("Cloud name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key set:", !!process.env.CLOUDINARY_API_KEY);
console.log("API Secret set:", !!process.env.CLOUDINARY_API_SECRET);

async function test() {
  try {
    const result = await cloudinary.uploader.upload(
      "https://picsum.photos/200/200",
      { folder: "linksphere/test" }
    );
    console.log("✅ Cloudinary SUCCESS!");
    console.log("URL:", result.secure_url);
  } catch (error) {
    console.error("❌ Cloudinary FAILED:", error.message);
  }
}

test();