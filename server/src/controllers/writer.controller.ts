import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import User from "../models/User.js";
import ServiceRequest from "../models/ServiceRequest.js";
import WriterEngagement, { ACTIVE_ENGAGEMENT_STAGES, IWriterEngagement } from "../models/WriterEngagement.js";
import { USER_ROLES } from "../types/roles.js";
import { cleanWriterProfileInput, toWriterBrief } from "../utils/writerData.js";
import { calculateWriterPenalty } from "../utils/writerPenalty.js";
import { isSafeHttpUrl } from "../utils/requestActivity.js";
import { extractProfileFromCv, resolveCvPath } from "../utils/cvExtraction.js";
import fs from "fs/promises";

const toStr = (v: unknown) => (Array.isArray(v) ? String(v[0] ?? "") : String(v ?? ""));
const BRIEF_POPULATE = [
    { path: "serviceId", select: "name slug" },
    { path: "domainId", select: "name slug" },
];

/** Requests writers may browse: live, not cancelled/completed, and not yet given to a writer. */
const OPEN_REQUEST_FILTER: Record<string, unknown> = {
    status: { $nin: ["CANCELLED", "COMPLETED"] },
    assignedTo: null,
};

/** Stages after which the writer has accepted and may see the full brief and files. */
const FULL_ACCESS_STAGES = ["ACCEPTED", "SUBMITTED", "CHANGES_REQUESTED", "APPROVED"];

const writerName = async (userId: string) => {
    const u = await User.findById(userId).select("firstName lastName writerProfile.title");
    return u ? [u.writerProfile?.title, u.firstName, u.lastName].filter(Boolean).join(" ") : "Writer";
};

/** Shape an engagement for the writer: live penalty figures, no internal admin data. */
export const presentEngagement = (e: IWriterEngagement | Record<string, any>) => {
    const doc: Record<string, any> = typeof (e as any).toObject === "function" ? (e as any).toObject() : e;
    let penalty = null;
    if (doc.offer?.deadline && ["ACCEPTED", "SUBMITTED", "CHANGES_REQUESTED", "APPROVED"].includes(doc.stage)) {
        const approved = (doc.submissions || []).find((s: any) => s.review?.decision === "APPROVED");
        const lastSubmission = doc.submissions?.length ? doc.submissions[doc.submissions.length - 1] : null;
        const deliveredAt = approved?.submittedAt || (doc.stage === "SUBMITTED" ? lastSubmission?.submittedAt : null);
        penalty = calculateWriterPenalty({
            fee: doc.offer.fee,
            deadline: doc.offer.deadline,
            deliveredAt,
            penaltyPerDayPct: doc.offer.penaltyPerDayPct,
            maxPenaltyPct: doc.offer.maxPenaltyPct,
        });
    }
    return { ...doc, penalty };
};

/* ------------------------------------------------------------------ */
/* Middleware: the signed-in writer must be approved to take on work    */
/* ------------------------------------------------------------------ */

export const requireApprovedWriter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (req.user?.role !== USER_ROLES.WRITER) {
            res.status(403).json({ success: false, message: "Writer access only" });
            return;
        }
        const user = await User.findById(req.user.userId).select("writerProfile.applicationStatus");
        const status = user?.writerProfile?.applicationStatus;
        if (status !== "APPROVED") {
            res.status(403).json({
                success: false,
                code: "WRITER_NOT_APPROVED",
                message:
                    status === "SUSPENDED"
                        ? "Your writer account is suspended. Please contact the Research Hub team."
                        : "Your profile is under review. You'll be able to see projects once it is approved.",
            });
            return;
        }
        next();
    } catch (error) {
        next(error);
    }
};

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export const getWriterProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await User.findById(req.user!.userId).lean();
        if (!user || user.role !== USER_ROLES.WRITER) {
            res.status(404).json({ success: false, message: "Writer profile not found" });
            return;
        }
        const { adminNotes: _internal, ...profile } = (user.writerProfile || {}) as Record<string, unknown>;
        res.json({
            success: true,
            data: {
                id: String(user._id),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                whatsapp: user.whatsapp,
                institution: user.institution,
                department: user.department,
                createdAt: user.createdAt,
                writerProfile: profile,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const updateWriterProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await User.findById(req.user!.userId);
        if (!user || user.role !== USER_ROLES.WRITER) {
            res.status(404).json({ success: false, message: "Writer profile not found" });
            return;
        }
        const body = req.body ?? {};
        for (const key of ["firstName", "lastName", "phone", "whatsapp", "institution", "department"] as const) {
            if (typeof body[key] === "string") {
                const v = body[key].trim();
                if (key === "firstName" && !v) continue;
                user.set(key, v.slice(0, 200));
            }
        }
        const patch = cleanWriterProfileInput(body.writerProfile ?? body);
        if (!user.writerProfile) user.set("writerProfile", { applicationStatus: "PENDING" });
        for (const [k, v] of Object.entries(patch)) user.set(`writerProfile.${k}`, v);
        await user.save();
        await getWriterProfile(req, res, next);
    } catch (error) {
        next(error);
    }
};

/* ------------------------------------------------------------------ */
/* Open briefs                                                         */
/* ------------------------------------------------------------------ */

export const listOpenRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const writerId = new mongoose.Types.ObjectId(req.user!.userId);
        const page = Math.max(1, parseInt(toStr(req.query.page), 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(toStr(req.query.limit), 10) || 20));

        const [items, total, mine] = await Promise.all([
            ServiceRequest.find(OPEN_REQUEST_FILTER)
                .select("-customer -userId -adminNotes -paymentSubmission -paymentQr -quotation -referral -activity")
                .populate(BRIEF_POPULATE)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ServiceRequest.countDocuments(OPEN_REQUEST_FILTER),
            WriterEngagement.find({ writerId }).select("requestId stage proposal").lean(),
        ]);

        const byRequest = new Map(mine.map((e) => [String(e.requestId), e]));
        res.json({
            success: true,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: items.map((r) => ({
                ...toWriterBrief(r),
                myEngagement: byRequest.get(String(r._id))
                    ? { _id: String(byRequest.get(String(r._id))!._id), stage: byRequest.get(String(r._id))!.stage, proposal: byRequest.get(String(r._id))!.proposal }
                    : null,
            })),
        });
    } catch (error) {
        next(error);
    }
};

export const expressInterest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const requestId = toStr(req.params.id);
        if (!mongoose.Types.ObjectId.isValid(requestId)) {
            res.status(400).json({ success: false, message: "Invalid request ID" });
            return;
        }

        const fee = Number(req.body?.fee);
        const days = Number(req.body?.days);
        const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 2000) : "";

        if (!Number.isFinite(fee) || fee <= 0) {
            res.status(400).json({ success: false, message: "Please enter your expected fee" });
            return;
        }
        if (!Number.isInteger(days) || days < 1 || days > 365) {
            res.status(400).json({ success: false, message: "Please enter how many days you need (1–365)" });
            return;
        }

        const request = await ServiceRequest.findOne({ _id: requestId, ...OPEN_REQUEST_FILTER }).select("_id");
        if (!request) {
            res.status(409).json({ success: false, message: "This project is no longer open" });
            return;
        }

        const writerId = new mongoose.Types.ObjectId(req.user!.userId);
        const existing = await WriterEngagement.findOne({ requestId, writerId });
        if (existing && ACTIVE_ENGAGEMENT_STAGES.includes(existing.stage)) {
            res.status(409).json({ success: false, message: "You are already working on this project" });
            return;
        }

        const engagement = existing ?? new WriterEngagement({ requestId, writerId, submissions: [], messages: [] });
        engagement.stage = "INTERESTED";
        engagement.set("proposal", { fee, currency: "INR", days, note, proposedAt: new Date() });
        engagement.messages.push({
            from: "WRITER",
            authorName: await writerName(req.user!.userId),
            text: note || "I'm interested in this project.",
            proposedFee: fee,
            proposedDays: days,
            createdAt: new Date(),
        });
        await engagement.save();

        res.status(existing ? 200 : 201).json({ success: true, message: "Your interest has been sent", data: presentEngagement(engagement) });
    } catch (error) {
        next(error);
    }
};

/* ------------------------------------------------------------------ */
/* My engagements                                                      */
/* ------------------------------------------------------------------ */

const loadOwnEngagement = async (req: Request, res: Response) => {
    const id = toStr(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: "Invalid ID" });
        return null;
    }
    const engagement = await WriterEngagement.findOne({ _id: id, writerId: req.user!.userId });
    if (!engagement) {
        res.status(404).json({ success: false, message: "Project not found" });
        return null;
    }
    return engagement;
};

const withBrief = async (engagement: IWriterEngagement) => {
    const request = await ServiceRequest.findById(engagement.requestId)
        .select("-customer -userId -adminNotes -paymentSubmission -paymentQr -quotation -referral -activity")
        .populate(BRIEF_POPULATE)
        .lean();
    return {
        ...presentEngagement(engagement),
        brief: request ? toWriterBrief(request, { full: FULL_ACCESS_STAGES.includes(engagement.stage) }) : null,
    };
};

export const listMyEngagements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const engagements = await WriterEngagement.find({ writerId: req.user!.userId }).sort({ updatedAt: -1 }).limit(200);
        const requests = await ServiceRequest.find({ _id: { $in: engagements.map((e) => e.requestId) } })
            .select("requestNumber serviceId domainId requirements academicProfile status createdAt")
            .populate(BRIEF_POPULATE)
            .lean();
        const byId = new Map(requests.map((r) => [String(r._id), r]));
        res.json({
            success: true,
            data: engagements.map((e) => {
                const r = byId.get(String(e.requestId));
                return { ...presentEngagement(e), brief: r ? toWriterBrief(r) : null };
            }),
        });
    } catch (error) {
        next(error);
    }
};

export const getMyEngagement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const engagement = await loadOwnEngagement(req, res);
        if (!engagement) return;
        res.json({ success: true, data: await withBrief(engagement) });
    } catch (error) {
        next(error);
    }
};

export const withdrawInterest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const engagement = await loadOwnEngagement(req, res);
        if (!engagement) return;
        if (engagement.stage !== "INTERESTED") {
            res.status(400).json({ success: false, message: "Only a pending interest can be withdrawn" });
            return;
        }
        engagement.stage = "WITHDRAWN";
        await engagement.save();
        res.json({ success: true, data: await withBrief(engagement) });
    } catch (error) {
        next(error);
    }
};

export const respondToOffer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const engagement = await loadOwnEngagement(req, res);
        if (!engagement) return;
        const action = req.body?.action;
        if (engagement.stage !== "OFFERED" || !engagement.offer) {
            res.status(400).json({ success: false, message: "There is no open offer to respond to" });
            return;
        }
        if (action !== "ACCEPT" && action !== "DECLINE") {
            res.status(400).json({ success: false, message: "action must be ACCEPT or DECLINE" });
            return;
        }

        const name = await writerName(req.user!.userId);
        const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 1000) : "";

        if (action === "ACCEPT") {
            engagement.stage = "ACCEPTED";
            engagement.acceptedAt = new Date();
            engagement.messages.push({ from: "WRITER", authorName: name, text: "I accept the offer and its terms.", createdAt: new Date() });
            await engagement.save();
            // Other writers who were interested are informed the project went elsewhere
            await WriterEngagement.updateMany(
                { requestId: engagement.requestId, _id: { $ne: engagement._id }, stage: "INTERESTED" },
                { $set: { stage: "NOT_SELECTED" } }
            );
        } else {
            engagement.stage = "DECLINED";
            engagement.closedReason = reason || "Declined by writer";
            engagement.messages.push({ from: "WRITER", authorName: name, text: reason ? `Declined: ${reason}` : "I have declined this offer.", createdAt: new Date() });
            await engagement.save();
            // Re-open the project to other writers
            await ServiceRequest.updateOne({ _id: engagement.requestId, assignedTo: engagement.writerId }, { $set: { assignedTo: null } });
        }

        res.json({ success: true, data: await withBrief(engagement) });
    } catch (error) {
        next(error);
    }
};

export const postWriterMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const engagement = await loadOwnEngagement(req, res);
        if (!engagement) return;
        if (["DECLINED", "WITHDRAWN", "NOT_SELECTED", "CANCELLED"].includes(engagement.stage)) {
            res.status(400).json({ success: false, message: "This conversation is closed" });
            return;
        }
        const text = typeof req.body?.text === "string" ? req.body.text.trim().slice(0, 3000) : "";
        const fee = req.body?.proposedFee !== undefined && req.body.proposedFee !== "" ? Number(req.body.proposedFee) : undefined;
        const days = req.body?.proposedDays !== undefined && req.body.proposedDays !== "" ? Number(req.body.proposedDays) : undefined;
        if (!text && fee === undefined && days === undefined) {
            res.status(400).json({ success: false, message: "Write a message or propose new terms" });
            return;
        }
        if ((fee !== undefined && !(fee > 0)) || (days !== undefined && !(Number.isInteger(days) && days >= 1 && days <= 365))) {
            res.status(400).json({ success: false, message: "Fee must be positive and days between 1 and 365" });
            return;
        }
        // While negotiating, a counter-proposal also updates the writer's standing proposal
        if (engagement.stage === "INTERESTED" && (fee !== undefined || days !== undefined)) {
            engagement.set("proposal", {
                ...(engagement.proposal || {}),
                ...(fee !== undefined ? { fee } : {}),
                ...(days !== undefined ? { days } : {}),
                proposedAt: new Date(),
            });
        }
        engagement.messages.push({
            from: "WRITER",
            authorName: await writerName(req.user!.userId),
            text: text || undefined,
            proposedFee: fee,
            proposedDays: days,
            createdAt: new Date(),
        });
        await engagement.save();
        res.json({ success: true, data: await withBrief(engagement) });
    } catch (error) {
        next(error);
    }
};

const SUBMISSION_EXT = /\.(docx?|pdf|zip)$/i;

export const submitWork = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const engagement = await loadOwnEngagement(req, res);
        if (!engagement) return;
        if (engagement.stage !== "ACCEPTED" && engagement.stage !== "CHANGES_REQUESTED") {
            res.status(400).json({ success: false, message: "You can upload work only for an accepted project" });
            return;
        }
        const { fileName, fileUrl, fileSize, note } = req.body ?? {};
        if (!isSafeHttpUrl(fileUrl) || !/\/uploads\/writer-submissions\//.test(String(fileUrl))) {
            res.status(400).json({ success: false, message: "Please upload your file first" });
            return;
        }
        if (typeof fileName !== "string" || !SUBMISSION_EXT.test(fileName)) {
            res.status(400).json({ success: false, message: "Submit a Word (.doc/.docx), PDF or ZIP file" });
            return;
        }
        engagement.submissions.push({
            fileName: fileName.slice(0, 300),
            fileUrl: String(fileUrl).trim(),
            fileSize: Number(fileSize) || undefined,
            note: typeof note === "string" ? note.trim().slice(0, 3000) : undefined,
            submittedAt: new Date(),
        });
        engagement.stage = "SUBMITTED";
        await engagement.save();
        res.json({ success: true, message: "Your work has been submitted for review", data: await withBrief(engagement) });
    } catch (error) {
        next(error);
    }
};

export const getWriterEarnings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const engagements = await WriterEngagement.find({
            writerId: req.user!.userId,
            stage: { $in: ["ACCEPTED", "SUBMITTED", "CHANGES_REQUESTED", "APPROVED"] },
        }).lean();
        const rows: Record<string, any>[] = engagements.map((e) => presentEngagement(e));
        const sum = (f: (r: any) => number) => rows.reduce((s, r) => s + (f(r) || 0), 0);
        res.json({
            success: true,
            data: {
                inProgressValue: sum((r) => (r.stage !== "APPROVED" ? r.offer?.fee : 0)),
                approvedValue: sum((r) => (r.stage === "APPROVED" ? r.payout?.payableAmount ?? r.penalty?.payableAmount ?? r.offer?.fee : 0)),
                paid: sum((r) => (r.payout?.status === "PAID" ? r.payout?.payableAmount : 0)),
                penalties: sum((r) => (r.stage === "APPROVED" ? r.payout?.penaltyAmount ?? 0 : 0)),
                completedCount: rows.filter((r) => r.stage === "APPROVED").length,
            },
        });
    } catch (error) {
        next(error);
    }
};

/* ------------------------------------------------------------------ */
/* CV auto-fill                                                        */
/* ------------------------------------------------------------------ */

const cvAttempts = new Map<string, number[]>();
const CV_LIMIT = 10;
const CV_WINDOW_MS = 60 * 60 * 1000;

/** At most CV_LIMIT extractions per user per hour (each AI read costs money). */
export const allowCvExtraction = (userId: string): boolean => {
    const now = Date.now();
    const recent = (cvAttempts.get(userId) || []).filter((t) => now - t < CV_WINDOW_MS);
    if (recent.length >= CV_LIMIT) {
        cvAttempts.set(userId, recent);
        return false;
    }
    recent.push(now);
    cvAttempts.set(userId, recent);
    return true;
};

export const runCvExtraction = async (cvUrl: unknown, userId: string, res: Response, next: NextFunction) => {
    try {
        if (typeof cvUrl !== "string" || !cvUrl) {
            res.status(400).json({ success: false, message: "Upload a CV first" });
            return;
        }
        const filePath = resolveCvPath(cvUrl);
        if (!filePath) {
            res.status(400).json({ success: false, message: "That file is not an uploaded CV" });
            return;
        }
        try {
            await fs.access(filePath);
        } catch {
            res.status(404).json({ success: false, message: "The CV file could not be found. Please upload it again." });
            return;
        }
        if (!allowCvExtraction(userId)) {
            res.status(429).json({ success: false, message: "Too many CV readings this hour. Please try again later." });
            return;
        }
        const result = await extractProfileFromCv(filePath);
        res.json({ success: true, data: result });
    } catch (error: any) {
        if (error?.statusCode) {
            res.status(error.statusCode).json({ success: false, message: error.message });
            return;
        }
        next(error);
    }
};

/** POST /api/writer/me/cv-extract — suggestions only; nothing is saved. */
export const extractMyCv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await User.findById(req.user!.userId).select("writerProfile.cvUrl");
    await runCvExtraction(req.body?.cvUrl || user?.writerProfile?.cvUrl, req.user!.userId, res, next);
};
