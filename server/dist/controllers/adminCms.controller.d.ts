import { Request, Response, NextFunction } from "express";
export declare const getAdminFaqs: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createAdminFaq: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateAdminFaq: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteAdminFaq: (req: Request, res: Response, next: NextFunction) => Promise<void>;
