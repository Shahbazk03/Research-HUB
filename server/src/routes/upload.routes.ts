import { Router, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { authenticate } from "../middleware/auth.middleware.js";
import { USER_ROLES } from "../types/roles.js";

const router = Router();

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB decoded

/*
| Only document and image formats are accepted. Each type is checked against
| the file's leading bytes, so a renamed .html / .js / .svg file is rejected
| and nothing executable is ever served from /uploads.
*/
const FILE_SIGNATURES: Record<string, (buf: Buffer) => boolean> = {
    ".pdf": (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
    ".png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ".jpg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    ".jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    ".webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
    // Office Open XML (zip container)
    ".docx": (b) => b[0] === 0x50 && b[1] === 0x4b,
    ".xlsx": (b) => b[0] === 0x50 && b[1] === 0x4b,
    ".pptx": (b) => b[0] === 0x50 && b[1] === 0x4b,
    ".zip": (b) => b[0] === 0x50 && b[1] === 0x4b,
    // Legacy Office (OLE compound file)
    ".doc": (b) => b.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])),
    ".xls": (b) => b.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])),
    ".ppt": (b) => b.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])),
};

const MIME_TO_EXT: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
};

const CUSTOMER_FOLDERS = ["payments", "references", "messages"];
const WRITER_FOLDERS = ["writer-cv", "writer-photos", "writer-submissions"];
const STAFF_FOLDERS = ["qrcodes", "deliverables", ...CUSTOMER_FOLDERS, ...WRITER_FOLDERS];

/** Folder-specific file types, on top of the global allow-list. */
const FOLDER_TYPES: Record<string, string[]> = {
    "writer-photos": [".png", ".jpg", ".jpeg", ".webp"],
    "writer-cv": [".pdf", ".doc", ".docx"],
    "writer-submissions": [".pdf", ".doc", ".docx", ".zip"],
};

router.post("/", authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { filename, base64Data, folder = "references" } = req.body ?? {};

        if (!base64Data || typeof base64Data !== "string") {
            res.status(400).json({ success: false, message: "base64Data is required" });
            return;
        }

        const role = req.user?.role;
        const isStaff = role === USER_ROLES.ADMIN || role === USER_ROLES.TEAM_MEMBER;
        const allowedFolders = isStaff ? STAFF_FOLDERS : role === USER_ROLES.WRITER ? WRITER_FOLDERS : CUSTOMER_FOLDERS;

        if (typeof folder !== "string" || !allowedFolders.includes(folder)) {
            res.status(403).json({ success: false, message: "You cannot upload to this location" });
            return;
        }

        let cleanBase64 = base64Data;
        let mime = "";
        if (base64Data.includes(";base64,")) {
            const [prefix, data] = base64Data.split(";base64,");
            cleanBase64 = data;
            mime = (prefix.match(/^data:(.*)$/)?.[1] || "").toLowerCase();
        }

        let ext = path.extname(typeof filename === "string" ? filename : "").toLowerCase();
        if (!ext && mime) ext = MIME_TO_EXT[mime] || "";

        const verify = FILE_SIGNATURES[ext];
        if (FOLDER_TYPES[folder] && !FOLDER_TYPES[folder].includes(ext)) {
            res.status(415).json({
                success: false,
                message: `This upload accepts ${FOLDER_TYPES[folder].join(", ").toUpperCase().replace(/\./g, "")} files only.`,
            });
            return;
        }
        if (!verify) {
            res.status(415).json({
                success: false,
                message: "Unsupported file type. Please upload PDF, Word, Excel, PowerPoint, ZIP, PNG, JPG or WEBP files.",
            });
            return;
        }

        const buffer = Buffer.from(cleanBase64, "base64");

        if (buffer.length === 0) {
            res.status(400).json({ success: false, message: "The file is empty" });
            return;
        }

        if (buffer.length > MAX_BYTES) {
            res.status(413).json({ success: false, message: "Files must be 10 MB or smaller" });
            return;
        }

        if (!verify(buffer)) {
            res.status(415).json({ success: false, message: "The file content does not match its type" });
            return;
        }

        const uploadDir = path.join(process.cwd(), "uploads", folder);
        await fs.mkdir(uploadDir, { recursive: true });

        const baseName = path
            .basename(typeof filename === "string" ? filename : "upload", path.extname(typeof filename === "string" ? filename : ""))
            .replace(/[^a-zA-Z0-9_-]/g, "_")
            .substring(0, 50) || "upload";

        const safeFilename = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}_${baseName}${ext}`;
        await fs.writeFile(path.join(uploadDir, safeFilename), buffer);

        const host = req.get("host") || "localhost:5000";
        const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";

        res.status(200).json({
            success: true,
            url: `${protocol}://${host}/uploads/${folder}/${safeFilename}`,
            fileName: typeof filename === "string" && filename ? filename.slice(0, 200) : safeFilename,
            size: buffer.length,
        });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ success: false, message: "File upload failed" });
    }
});

export default router;
