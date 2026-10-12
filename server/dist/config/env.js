import dotenv from "dotenv";
import path from "path";
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), "server", ".env") });
export const env = {
    port: Number(process.env.PORT) || 5000,
    nodeEnv: (process.env.NODE_ENV || "development"),
    databaseUrl: process.env.DATABASE_URL || "",
    jwtSecret: process.env.JWT_SECRET || "research_hub_secure_default_secret_key_2026",
    whatsappNumber: process.env.WHATSAPP_NUMBER || "917905632280",
    adminEmail: process.env.ADMIN_EMAIL || "shahbaz@example.com",
    adminPassword: process.env.ADMIN_PASSWORD || "admin123",
    corsOrigins: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
        : ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
};
//# sourceMappingURL=env.js.map