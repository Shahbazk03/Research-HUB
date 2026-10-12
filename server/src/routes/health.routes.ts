import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (_req: Request, res: Response): void => {
    res.status(200).json({
        success: true,
        message: "Research Hub API is running",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});

export default router;