import { Request, Response, NextFunction } from "express";
import { USER_ROLES, UserRole } from "../types/roles.js";

export const requireAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: "Authentication required",
        });
        return;
    }

    if (req.user.role !== USER_ROLES.ADMIN) {
        res.status(403).json({
            success: false,
            message: "Admin access required",
        });
        return;
    }

    next();
};

export const requireStaff = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: "Authentication required",
        });
        return;
    }

    if (
        req.user.role !== USER_ROLES.ADMIN &&
        req.user.role !== USER_ROLES.TEAM_MEMBER
    ) {
        res.status(403).json({
            success: false,
            message: "Staff or Admin access required",
        });
        return;
    }

    next();
};

export const requireRole = (...allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: `Access denied. Requires one of: ${allowedRoles.join(", ")}`,
            });
            return;
        }

        next();
    };
};