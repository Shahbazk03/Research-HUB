import "express";
import type { UserRole } from "./roles.js";

declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                role: UserRole;
            };
        }
    }
}

export { };
