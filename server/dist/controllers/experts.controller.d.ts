import { Request, Response, NextFunction } from "express";
/**
 * GET /api/experts
 * Approved writers who consented to be shown AND that an admin featured.
 */
export declare const getPublicExperts: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/auth/register-writer
 * A professor / researcher applies to write for Research Hub. The account is
 * created immediately but stays PENDING until an admin approves it.
 */
export declare const registerWriter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
