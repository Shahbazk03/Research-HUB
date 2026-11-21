import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { UserRole } from "../types/roles.js";

const JWT_SECRET = env.jwtSecret;

export interface JwtPayload {
    userId: string;
    role: UserRole;
    email?: string;
}

export const generateAccessToken = (payload: JwtPayload): string => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: "7d",
    });
};

export const verifyAccessToken = (token: string): JwtPayload => {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
};