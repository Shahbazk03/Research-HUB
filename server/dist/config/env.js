import dotenv from "dotenv";
import path from "path";
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), "server", ".env") });
export const env = {
    port: Number(process.env.PORT) || 5000,
    nodeEnv: (process.env.NODE_ENV || "development"),
    databaseUrl: process.env.DATABASE_URL || "",
    jwtSecret: process.env.JWT_SECRET || "",
    whatsappNumber: process.env.WHATSAPP_NUMBER || "917905632280",
    adminEmail: process.env.ADMIN_EMAIL || "shahbaz@example.com",
    adminPassword: process.env.ADMIN_PASSWORD || "admin123",
    corsOrigins: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
        : ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
};
if (!env.jwtSecret) {
    if (env.nodeEnv === "production") {
        // Refuse to run with a guessable signing key: anyone could forge admin tokens.
        throw new Error("JWT_SECRET is not set. Configure a long random JWT_SECRET before starting in production.");
    }
    console.warn("⚠️  JWT_SECRET is not set. Using an insecure development-only key.");
    env.jwtSecret = "insecure-dev-only-secret-do-not-use-in-production-0000";
}
else if (env.jwtSecret.length < 32) {
    console.warn("⚠️  JWT_SECRET is shorter than 32 characters. Use a longer random value.");
}
//# sourceMappingURL=env.js.map