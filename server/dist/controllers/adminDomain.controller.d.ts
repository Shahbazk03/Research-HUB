import { Request, Response, NextFunction } from "express";
export declare const createDomain: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getDomains: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getDomainById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateDomain: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteDomain: (req: Request, res: Response, next: NextFunction) => Promise<void>;
