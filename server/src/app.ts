import express, {
    type Express,
    type Request,
    type Response,
    type NextFunction,
} from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import path from "path";

// Routes
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import requestRoutes from "./routes/request.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import publicRoutes from "./routes/public.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

const app: Express = express();

// Required when app runs behind Render/Vercel reverse proxy so X-Forwarded-* headers are trusted
app.set("trust proxy", 1);

/*
|--------------------------------------------------------------------------
| Security & Middlewares
|--------------------------------------------------------------------------
*/

// Helmet security headers (configured for cross-origin APIs)
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);

// CORS
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow all localhost/127.0.0.1 or undefined origins (e.g., Postman/mobile apps)
            if (
                !origin ||
                origin.includes("localhost") ||
                origin.includes("127.0.0.1") ||
                origin.includes("ngrok")
            ) {
                callback(null, true);
            } else {
                callback(null, true); // Permissive for development
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Generous limit for development & normal browsing
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests from this IP, please try again after 15 minutes",
    },
});
app.use("/api", limiter);

// Body parsers
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Health check
app.use("/api/health", healthRoutes);

// Authentication
app.use("/api/auth", authRoutes);

// Customer Service Requests
app.use("/api/requests", requestRoutes);

// Admin Portal Routes
app.use("/api/admin", adminRoutes);

// Public Catalog, Reference Data, Settings & CMS
app.use("/api", publicRoutes);

// File & Asset Uploads (QR codes, Deliverables, Payment receipts)
app.use("/api/upload", uploadRoutes);

// Static uploads serving
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API Root info
app.get("/api", (_req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "Research Hub API is running",
        version: "2.0.0",
        docs: {
            auth: "/api/auth",
            publicCatalog: "/api/services, /api/domains, /api/categories, /api/reference-data, /api/settings",
            customerRequests: "/api/requests",
            admin: "/api/admin",
        },
    });
});

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: "API route not found",
        path: req.originalUrl,
    });
});

/*
|--------------------------------------------------------------------------
| Centralized Error Handler
|--------------------------------------------------------------------------
*/
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Centralized API Error:", error);

    if (error instanceof Error) {
        // Handle Mongoose duplicate key error
        if ((error as any).code === 11000) {
            const field = Object.keys((error as any).keyValue || {})[0] || "field";
            res.status(409).json({
                success: false,
                message: `A record with this ${field} already exists`,
            });
            return;
        }

        // Handle Mongoose validation errors
        if (error.name === "ValidationError") {
            res.status(400).json({
                success: false,
                message: error.message,
            });
            return;
        }

        // Handle JWT errors
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            res.status(401).json({
                success: false,
                message: "Invalid or expired token",
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
        return;
    }

    res.status(500).json({
        success: false,
        message: "Internal server error",
    });
});

export default app;