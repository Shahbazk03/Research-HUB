import { Request, Response, NextFunction } from "express";
export declare const createServiceRequest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCustomerServiceRequests: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getServiceRequestById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const cancelCustomerRequest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const respondCustomerRequest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const submitCustomerPayment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
