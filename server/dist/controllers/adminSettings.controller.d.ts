import { Request, Response, NextFunction } from "express";
export declare const getAdminSettings: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateAdminSettings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
