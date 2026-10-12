import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types/roles.js";
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireStaff: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireRole: (...allowedRoles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
