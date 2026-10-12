import { NextFunction, Request, Response } from "express";
export interface AppError extends Error {
    statusCode?: number;
}
export declare const errorHandler: (error: AppError, _req: Request, res: Response, _next: NextFunction) => void;
