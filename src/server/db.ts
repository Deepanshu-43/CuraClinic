import mongoose from "mongoose";

let isConnected = false;

export async function connectDB(): Promise<boolean> {
  const rawUri = process.env.MONGODB_URI?.trim();

  // Validate that a valid connection string starting with mongodb:// or mongodb+srv:// is present
  if (!rawUri || (!rawUri.startsWith("mongodb://") && !rawUri.startsWith("mongodb+srv://"))) {
    console.log("[DB] Running in zero-configuration mode with high-performance in-memory adapter & Firestore synchronization.");
    return false;
  }

  if (isConnected) {
    return true;
  }

  try {
    await mongoose.connect(rawUri, {
      serverSelectionTimeoutMS: 2500,
      connectTimeoutMS: 2500,
    });
    isConnected = true;
    console.log("[DB] Connected to MongoDB database successfully.");
    return true;
  } catch (error: any) {
    console.log(`[DB] Notice: MongoDB connection unavailable (${error?.message || "unreachable"}). Utilizing in-memory adapter and Firestore synchronization.`);
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}
