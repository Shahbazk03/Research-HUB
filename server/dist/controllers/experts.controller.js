import bcrypt from "bcryptjs";
import User from "../models/User.js";
import WriterEngagement from "../models/WriterEngagement.js";
import { USER_ROLES, USER_STATUSES } from "../types/roles.js";
import { generateAccessToken } from "../utils/jwt.js";
import { cleanWriterProfileInput, toPublicExpert } from "../utils/writerData.js";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/**
 * GET /api/experts
 * Approved writers who consented to be shown AND that an admin featured.
 */
export const getPublicExperts = async (_req, res, next) => {
    try {
        const experts = await User.find({
            role: USER_ROLES.WRITER,
            status: USER_STATUSES.ACTIVE,
            "writerProfile.applicationStatus": "APPROVED",
            "writerProfile.showOnWebsite": true,
            "writerProfile.featuredOnWebsite": true,
        })
            .select("firstName lastName institution department writerProfile createdAt")
            .sort({ createdAt: 1 })
            .limit(60)
            .lean();
        const completed = await WriterEngagement.aggregate([
            { $match: { writerId: { $in: experts.map((e) => e._id) }, stage: "APPROVED" } },
            { $group: { _id: "$writerId", n: { $sum: 1 } } },
        ]);
        const counts = new Map(completed.map((c) => [String(c._id), c.n]));
        res.json({ success: true, data: experts.map((e) => toPublicExpert(e, counts.get(String(e._id)) || 0)) });
    }
    catch (error) {
        next(error);
    }
};
/**
 * POST /api/auth/register-writer
 * A professor / researcher applies to write for Research Hub. The account is
 * created immediately but stays PENDING until an admin approves it.
 */
export const registerWriter = async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, phone, whatsapp, institution, department } = req.body ?? {};
        if (typeof firstName !== "string" || !firstName.trim()) {
            res.status(400).json({ success: false, message: "First name is required" });
            return;
        }
        if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
            res.status(400).json({ success: false, message: "Please provide a valid email address" });
            return;
        }
        if (typeof password !== "string" || password.length < 8) {
            res.status(400).json({ success: false, message: "Password must contain at least 8 characters" });
            return;
        }
        if (typeof institution !== "string" || !institution.trim()) {
            res.status(400).json({ success: false, message: "Please tell us your university or organisation" });
            return;
        }
        const normalized = email.trim().toLowerCase();
        if (await User.exists({ email: normalized })) {
            res.status(409).json({ success: false, message: "An account with this email already exists. Please sign in instead." });
            return;
        }
        const profile = cleanWriterProfileInput(req.body?.writerProfile ?? {});
        if (!profile.designation) {
            res.status(400).json({ success: false, message: "Please tell us your designation" });
            return;
        }
        if (!profile.expertise || profile.expertise.length === 0) {
            res.status(400).json({ success: false, message: "Add at least one area of expertise" });
            return;
        }
        const user = await User.create({
            email: normalized,
            passwordHash: await bcrypt.hash(password, 12),
            firstName: firstName.trim().slice(0, 100),
            lastName: typeof lastName === "string" ? lastName.trim().slice(0, 100) : undefined,
            phone: typeof phone === "string" ? phone.trim().slice(0, 30) : undefined,
            whatsapp: typeof whatsapp === "string" ? whatsapp.trim().slice(0, 30) : undefined,
            institution: institution.trim().slice(0, 200),
            department: typeof department === "string" ? department.trim().slice(0, 200) : undefined,
            role: USER_ROLES.WRITER,
            status: USER_STATUSES.ACTIVE,
            writerProfile: {
                expertise: [],
                publications: [],
                showOnWebsite: false,
                ...profile,
                featuredOnWebsite: false,
                applicationStatus: "PENDING",
            },
        });
        const token = generateAccessToken({ userId: user._id.toString(), role: user.role });
        res.status(201).json({
            success: true,
            message: "Application received. We'll review your profile shortly.",
            data: {
                token,
                accessToken: token,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    whatsapp: user.whatsapp,
                    institution: user.institution,
                    department: user.department,
                    role: user.role,
                    status: user.status,
                    createdAt: user.createdAt,
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=experts.controller.js.map