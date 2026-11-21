import { Request, Response, NextFunction } from "express";
import { IWriterEngagement } from "../models/WriterEngagement.js";
/** Shape an engagement for the writer: live penalty figures, no internal admin data. */
export declare const presentEngagement: (e: IWriterEngagement | Record<string, any>) => {
    penalty: import("../utils/writerPenalty.js").PenaltyResult | null;
};
export declare const requireApprovedWriter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getWriterProfile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateWriterProfile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const listOpenRequests: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const expressInterest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const listMyEngagements: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getMyEngagement: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const withdrawInterest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const respondToOffer: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const postWriterMessage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const submitWork: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getWriterEarnings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** At most CV_LIMIT extractions per user per hour (each AI read costs money). */
export declare const allowCvExtraction: (userId: string) => boolean;
export declare const runCvExtraction: (cvUrl: unknown, userId: string, res: Response, next: NextFunction) => Promise<void>;
/** POST /api/writer/me/cv-extract — suggestions only; nothing is saved. */
export declare const extractMyCv: (req: Request, res: Response, next: NextFunction) => Promise<void>;
