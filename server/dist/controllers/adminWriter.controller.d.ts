import { Request, Response, NextFunction } from "express";
export declare const listWriters: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getWriter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createWriter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateWriter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const listEngagements: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getRequestEngagements: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const assignWriter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getEngagement: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const postAdminMessage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const reviewSubmission: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const releaseToCustomer: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const cancelEngagement: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updatePayout: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/** POST /api/admin/writers/:id/cv-extract — suggestions from the writer's saved CV. */
export declare const extractWriterCv: (req: Request, res: Response, next: NextFunction) => Promise<void>;
