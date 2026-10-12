import { Router, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// Allow authenticated users (both admin and customer) to upload assets
router.post("/", authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { filename, base64Data, folder = "files" } = req.body;

        if (!base64Data || typeof base64Data !== "string") {
            res.status(400).json({ success: false, message: "base64Data is required" });
            return;
        }

        // Sanitize folder
        const safeFolder = ["qrcodes", "payments", "deliverables", "references"].includes(folder)
            ? folder
            : "files";

        const uploadDir = path.join(process.cwd(), "uploads", safeFolder);
        await fs.mkdir(uploadDir, { recursive: true });

        // Clean base64 string
        let cleanBase64 = base64Data;
        let ext = path.extname(filename || "").toLowerCase();

        if (base64Data.includes(";base64,")) {
            const parts = base64Data.split(";base64,");
            cleanBase64 = parts[1];
            if (!ext) {
                const mimeMatch = parts[0].match(/data:(.*?)$/);
                if (mimeMatch) {
                    const mime = mimeMatch[1];
                    if (mime.includes("pdf")) ext = ".pdf";
                    else if (mime.includes("png")) ext = ".png";
                    else if (mime.includes("jpeg") || mime.includes("jpg")) ext = ".jpg";
                    else if (mime.includes("webp")) ext = ".webp";
                }
            }
        }

        if (!ext) ext = ".bin";

        const baseName = path
            .basename(filename || "upload", path.extname(filename || ""))
            .replace(/[^a-zA-Z0-9_-]/g, "_")
            .substring(0, 50);

        const safeFilename = `${Date.now()}_${baseName}${ext}`;
        const filePath = path.join(uploadDir, safeFilename);

        const buffer = Buffer.from(cleanBase64, "base64");
        await fs.writeFile(filePath, buffer);

        // Serve URL - dynamic host so it works in both local and deployed production environments
        const host = req.get("host") || "localhost:5000";
        const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
        const fileUrl = `${protocol}://${host}/uploads/${safeFolder}/${safeFilename}`;

        res.status(200).json({
            success: true,
            url: fileUrl,
            fileName: filename || safeFilename,
            size: buffer.length,
        });
    } catch (err: any) {
        console.error("Upload error:", err);
        res.status(500).json({ success: false, message: err?.message || "File upload failed" });
    }
});

export default router;
