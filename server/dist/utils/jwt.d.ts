import { UserRole } from "../types/roles.js";
export interface JwtPayload {
    userId: string;
    role: UserRole;
    email?: string;
}
export declare const generateAccessToken: (payload: JwtPayload) => string;
export declare const verifyAccessToken: (token: string) => JwtPayload;
