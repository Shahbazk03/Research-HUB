import { Request, Response, NextFunction } from "express";
export declare const validateReferralCode: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getReferralCodes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
