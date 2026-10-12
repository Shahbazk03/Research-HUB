import { Request, Response, NextFunction } from "express";
export declare const getPublicDomains: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getPublicCategories: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getPublicServices: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getPublicServiceBySlugOrId: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getPublicServiceTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getPublicReferenceData: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getPublicSettings: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getPublicFaqs: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
