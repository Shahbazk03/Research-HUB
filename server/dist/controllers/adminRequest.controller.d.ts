import { Request, Response, NextFunction } from "express";
export declare const escapeRegExp: (value: string) => string;
export declare const buildAdminRequestSearchFilter: (search?: string) => Record<string, unknown>;
export declare const getAdminServiceRequests: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getAdminServiceRequestById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateAdminServiceRequest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteAdminServiceRequest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateAdminServiceRequestStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getAdminServiceRequestStats: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
