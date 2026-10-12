import { Request, Response, NextFunction } from "express";
export declare const register: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const login: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCurrentUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const logout: (_req: Request, res: Response) => Promise<void>;
export declare const updateProfile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
