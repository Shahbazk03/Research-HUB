import mongoose from "mongoose";
import { env } from "./env.js";
export const connectDatabase = async () => {
    const databaseUrl = env.databaseUrl || process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is not configured in .env");
    }
    try {
        await mongoose.connect(databaseUrl, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
        });
        console.log("✅ MongoDB Atlas connected successfully");
    }
    catch (error) {
        console.error("❌ MongoDB connection failed:", error);
        throw error;
    }
};
//# sourceMappingURL=database.js.map