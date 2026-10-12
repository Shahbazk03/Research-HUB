import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
const JWT_SECRET = env.jwtSecret || process.env.JWT_SECRET || "research_hub_secure_default_secret_key_2026";
export const generateAccessToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: "7d",
    });
};
export const verifyAccessToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};
//# sourceMappingURL=jwt.js.map