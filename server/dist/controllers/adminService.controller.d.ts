import { Request, Response, NextFunction } from "express";
export declare const createService: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getServices: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getServiceById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateService: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteService: (req: Request, res: Response, next: NextFunction) => Promise<void>;
