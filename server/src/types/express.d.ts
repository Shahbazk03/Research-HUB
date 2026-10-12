import "express";

declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                role: "CUSTOMER" | "TEAM_MEMBER" | "ADMIN";
            };
        }
    }
}

export { };