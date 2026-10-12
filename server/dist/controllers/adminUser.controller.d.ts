import { Request, Response, NextFunction } from "express";
export declare const getAdminUsers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateAdminUserStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateAdminUserRole: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const resetAdminUserPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
