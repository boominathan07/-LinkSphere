import mongoose from "mongoose";

let isConnected = false;

export async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error("MONGODB_URI is not set");
    }

    if (isConnected && mongoose.connection.readyState === 1) {
      console.log("✅ MongoDB already connected");
      return;
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log("✅ Connected to MongoDB successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    isConnected = false;
    throw error;
  }
}

export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

// Handle connection events
mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected");
  isConnected = false;
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err.message);
  isConnected = false;
});