import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User, { WRITER_APPLICATION_STATUSES } from "../models/User.js";
import ServiceRequest from "../models/ServiceRequest.js";
import WriterEngagement, { ACTIVE_ENGAGEMENT_STAGES, ENGAGEMENT_STAGES } from "../models/WriterEngagement.js";
import { USER_ROLES, USER_STATUSES } from "../types/roles.js";
import { cleanWriterProfileInput, toWriterBrief } from "../utils/writerData.js";
import { calculateWriterPenalty, DEFAULT_MAX_PENALTY_PCT, DEFAULT_PENALTY_PER_DAY_PCT } from "../utils/writerPenalty.js";
import { addActivity, safeContainsRegex } from "../utils/requestActivity.js";
import { presentEngagement, runCvExtraction } from "./writer.controller.js";
const toStr = (v) => (Array.isArray(v) ? String(v[0] ?? "") : String(v ?? ""));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WRITER_SUMMARY = "firstName lastName email phone whatsapp institution department writerProfile createdAt status";
const staffName = async (userId) => {
    const u = userId ? await User.findById(userId).select("firstName lastName") : null;
    return u ? `${u.firstName} ${u.lastName || ""}`.trim() : "Research Hub team";
};
const invalidId = (res, id) => {
    if (mongoose.Types.ObjectId.isValid(id))
        return false;
    res.status(400).json({ success: false, message: "Invalid ID" });
    return true;
};
/* ------------------------------------------------------------------ */
/* Writers                                                             */
/* ------------------------------------------------------------------ */
export const listWriters = async (req, res, next) => {
    try {
        const filter = { role: USER_ROLES.WRITER };
        const status = toStr(req.query.status);
        if (WRITER_APPLICATION_STATUSES.includes(status))
            filter["writerProfile.applicationStatus"] = status;
        const search = toStr(req.query.search).trim();
        if (search) {
            const rx = safeContainsRegex(search);
            filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }, { institution: rx }, { "writerProfile.expertise": rx }];
        }
        const writers = await User.find(filter).select(WRITER_SUMMARY).sort({ createdAt: -1 }).limit(200).lean();
        const stats = await WriterEngagement.aggregate([
            { $match: { writerId: { $in: writers.map((w) => w._id) } } },
            {
                $group: {
                    _id: "$writerId",
                    active: { $sum: { $cond: [{ $in: ["$stage", ["OFFERED", "ACCEPTED", "SUBMITTED", "CHANGES_REQUESTED"]] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ["$stage", "APPROVED"] }, 1, 0] } },
                    interested: { $sum: { $cond: [{ $eq: ["$stage", "INTERESTED"] }, 1, 0] } },
                },
            },
        ]);
        const byId = new Map(stats.map((s) => [String(s._id), s]));
        const counts = await User.aggregate([
            { $match: { role: USER_ROLES.WRITER } },
            { $group: { _id: "$writerProfile.applicationStatus", n: { $sum: 1 } } },
        ]);
        res.json({
            success: true,
            counts: Object.fromEntries(counts.map((c) => [c._id || "PENDING", c.n])),
            data: writers.map((w) => ({
                ...w,
                id: String(w._id),
                stats: { active: byId.get(String(w._id))?.active || 0, completed: byId.get(String(w._id))?.completed || 0, interested: byId.get(String(w._id))?.interested || 0 },
            })),
        });
    }
    catch (error) {
        next(error);
    }
};
export const getWriter = async (req, res, next) => {
    try {
        const id = toStr(req.params.id);
        if (invalidId(res, id))
            return;
        const writer = await User.findOne({ _id: id, role: USER_ROLES.WRITER }).select(WRITER_SUMMARY).lean();
        if (!writer) {
            res.status(404).json({ success: false, message: "Writer not found" });
            return;
        }
        const engagements = await WriterEngagement.find({ writerId: id }).sort({ updatedAt: -1 }).limit(100).lean();
        const requests = await ServiceRequest.find({ _id: { $in: engagements.map((e) => e.requestId) } }).select("requestNumber serviceId").populate("serviceId", "name").lean();
        const reqById = new Map(requests.map((r) => [String(r._id), r]));
        res.json({
            success: true,
            data: {
                ...writer,
                id: String(writer._id),
                engagements: engagements.map((e) => ({
                    ...presentEngagement(e),
                    request: reqById.get(String(e.requestId))
                        ? { requestNumber: reqById.get(String(e.requestId)).requestNumber, serviceName: reqById.get(String(e.requestId)).serviceId?.name }
                        : null,
                })),
            },
        });
    }
    catch (error) {
        next(error);
    }
};
export const createWriter = async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, phone, institution, department } = req.body ?? {};
        if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
            res.status(400).json({ success: false, message: "A valid email is required" });
            return;
        }
        if (typeof password !== "string" || password.length < 8) {
            res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
            return;
        }
        if (typeof firstName !== "string" || !firstName.trim()) {
            res.status(400).json({ success: false, message: "First name is required" });
            return;
        }
        const normalized = email.trim().toLowerCase();
        if (await User.exists({ email: normalized })) {
            res.status(409).json({ success: false, message: "An account with this email already exists" });
            return;
        }
        const profile = cleanWriterProfileInput(req.body?.writerProfile ?? {}, { admin: true });
        const writer = await User.create({
            email: normalized,
            passwordHash: await bcrypt.hash(password, 12),
            firstName: firstName.trim().slice(0, 100),
            lastName: typeof lastName === "string" ? lastName.trim().slice(0, 100) : undefined,
            phone: typeof phone === "string" ? phone.trim().slice(0, 30) : undefined,
            institution: typeof institution === "string" ? institution.trim().slice(0, 200) : undefined,
            department: typeof department === "string" ? department.trim().slice(0, 200) : undefined,
            role: USER_ROLES.WRITER,
            status: USER_STATUSES.ACTIVE,
            writerProfile: { expertise: [], publications: [], showOnWebsite: false, featuredOnWebsite: false, ...profile, applicationStatus: "APPROVED", reviewedAt: new Date() },
        });
        res.status(201).json({ success: true, message: "Writer account created", data: { id: String(writer._id), email: writer.email } });
    }
    catch (error) {
        next(error);
    }
};
export const updateWriter = async (req, res, next) => {
    try {
        const id = toStr(req.params.id);
        if (invalidId(res, id))
            return;
        const writer = await User.findOne({ _id: id, role: USER_ROLES.WRITER });
        if (!writer) {
            res.status(404).json({ success: false, message: "Writer not found" });
            return;
        }
        const body = req.body ?? {};
        for (const key of ["firstName", "lastName", "phone", "whatsapp", "institution", "department"]) {
            if (typeof body[key] === "string" && (key !== "firstName" || body[key].trim()))
                writer.set(key, body[key].trim().slice(0, 200));
        }
        if (!writer.writerProfile)
            writer.set("writerProfile", { applicationStatus: "PENDING", expertise: [], publications: [] });
        const patch = cleanWriterProfileInput(body.writerProfile ?? body, { admin: true });
        for (const [k, v] of Object.entries(patch))
            writer.set(`writerProfile.${k}`, v);
        const status = body.applicationStatus ?? body.writerProfile?.applicationStatus;
        if (status !== undefined) {
            if (!WRITER_APPLICATION_STATUSES.includes(status)) {
                res.status(400).json({ success: false, message: "Invalid application status" });
                return;
            }
            writer.set("writerProfile.applicationStatus", status);
            writer.set("writerProfile.reviewedAt", new Date());
            if (status !== "APPROVED")
                writer.set("writerProfile.featuredOnWebsite", false);
        }
        await writer.save();
        req.params.id = id;
        await getWriter(req, res, next);
    }
    catch (error) {
        next(error);
    }
};
/* ------------------------------------------------------------------ */
/* Engagements                                                         */
/* ------------------------------------------------------------------ */
const presentForAdmin = async (engagementIds, filter = {}) => {
    const query = engagementIds ? { _id: { $in: engagementIds } } : filter;
    const engagements = await WriterEngagement.find(query).sort({ updatedAt: -1 }).limit(300).lean();
    const [writers, requests] = await Promise.all([
        User.find({ _id: { $in: engagements.map((e) => e.writerId) } }).select("firstName lastName email institution writerProfile.title writerProfile.designation writerProfile.expertise").lean(),
        ServiceRequest.find({ _id: { $in: engagements.map((e) => e.requestId) } }).select("requestNumber serviceId status academicProfile.deadline").populate("serviceId", "name").lean(),
    ]);
    const w = new Map(writers.map((x) => [String(x._id), x]));
    const r = new Map(requests.map((x) => [String(x._id), x]));
    return engagements.map((e) => {
        const writer = w.get(String(e.writerId));
        const request = r.get(String(e.requestId));
        return {
            ...presentEngagement(e),
            writer: writer
                ? {
                    id: String(writer._id),
                    name: [writer.writerProfile?.title, writer.firstName, writer.lastName].filter(Boolean).join(" "),
                    email: writer.email,
                    institution: writer.institution,
                    designation: writer.writerProfile?.designation,
                    expertise: writer.writerProfile?.expertise || [],
                }
                : null,
            request: request
                ? { id: String(request._id), requestNumber: request.requestNumber, serviceName: request.serviceId?.name, status: request.status, customerDeadline: request.academicProfile?.deadline }
                : null,
        };
    });
};
export const listEngagements = async (req, res, next) => {
    try {
        const filter = {};
        const stage = toStr(req.query.stage);
        if (ENGAGEMENT_STAGES.includes(stage))
            filter.stage = stage;
        else if (stage === "ACTIVE")
            filter.stage = { $in: ["OFFERED", "ACCEPTED", "SUBMITTED", "CHANGES_REQUESTED"] };
        else if (stage === "OVERDUE") {
            filter.stage = { $in: ["ACCEPTED", "CHANGES_REQUESTED"] };
            filter["offer.deadline"] = { $lt: new Date() };
        }
        const writerId = toStr(req.query.writerId);
        if (mongoose.Types.ObjectId.isValid(writerId))
            filter.writerId = writerId;
        const data = await presentForAdmin(undefined, filter);
        const counts = await WriterEngagement.aggregate([{ $group: { _id: "$stage", n: { $sum: 1 } } }]);
        const overdue = await WriterEngagement.countDocuments({ stage: { $in: ["ACCEPTED", "CHANGES_REQUESTED"] }, "offer.deadline": { $lt: new Date() } });
        res.json({ success: true, counts: { ...Object.fromEntries(counts.map((c) => [c._id, c.n])), OVERDUE: overdue }, data });
    }
    catch (error) {
        next(error);
    }
};
export const getRequestEngagements = async (req, res, next) => {
    try {
        const id = toStr(req.params.id);
        if (invalidId(res, id))
            return;
        const request = await ServiceRequest.findById(id).populate("serviceId", "name slug").populate("domainId", "name slug").lean();
        if (!request) {
            res.status(404).json({ success: false, message: "Request not found" });
            return;
        }
        const ids = (await WriterEngagement.find({ requestId: id }).select("_id").lean()).map((e) => e._id);
        res.json({
            success: true,
            data: {
                request: { ...toWriterBrief(request, { full: true }), assignedTo: request.assignedTo ? String(request.assignedTo) : null },
                engagements: await presentForAdmin(ids),
            },
        });
    }
    catch (error) {
        next(error);
    }
};
export const assignWriter = async (req, res, next) => {
    try {
        const requestId = toStr(req.params.id);
        if (invalidId(res, requestId))
            return;
        const { writerId, fee, currency, deadline, penaltyPerDayPct, maxPenaltyPct, notes } = req.body ?? {};
        if (!mongoose.Types.ObjectId.isValid(writerId)) {
            res.status(400).json({ success: false, message: "Choose a writer" });
            return;
        }
        const amount = Number(fee);
        if (!Number.isFinite(amount) || amount <= 0) {
            res.status(400).json({ success: false, message: "Agreed fee must be a positive amount" });
            return;
        }
        const due = new Date(deadline);
        if (!deadline || Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
            res.status(400).json({ success: false, message: "Deadline must be a future date and time" });
            return;
        }
        const perDay = penaltyPerDayPct === undefined || penaltyPerDayPct === "" ? DEFAULT_PENALTY_PER_DAY_PCT : Number(penaltyPerDayPct);
        const maxPct = maxPenaltyPct === undefined || maxPenaltyPct === "" ? DEFAULT_MAX_PENALTY_PCT : Number(maxPenaltyPct);
        if (!(perDay >= 0 && perDay <= 100 && maxPct >= 0 && maxPct <= 100)) {
            res.status(400).json({ success: false, message: "Penalty percentages must be between 0 and 100" });
            return;
        }
        const [request, writer] = await Promise.all([
            ServiceRequest.findById(requestId),
            User.findOne({ _id: writerId, role: USER_ROLES.WRITER, "writerProfile.applicationStatus": "APPROVED", status: USER_STATUSES.ACTIVE }),
        ]);
        if (!request) {
            res.status(404).json({ success: false, message: "Request not found" });
            return;
        }
        if (["CANCELLED", "COMPLETED"].includes(request.status)) {
            res.status(400).json({ success: false, message: "This request is closed" });
            return;
        }
        if (!writer) {
            res.status(400).json({ success: false, message: "Writer not found or not approved" });
            return;
        }
        const active = await WriterEngagement.findOne({ requestId, stage: { $in: ACTIVE_ENGAGEMENT_STAGES } });
        if (active && String(active.writerId) !== String(writerId)) {
            res.status(409).json({ success: false, message: "Another writer already holds this request. Cancel that assignment first." });
            return;
        }
        if (active && active.stage !== "OFFERED") {
            res.status(409).json({ success: false, message: "This writer has already accepted; terms can't be changed now" });
            return;
        }
        const engagement = active ?? (await WriterEngagement.findOne({ requestId, writerId })) ?? new WriterEngagement({ requestId, writerId, submissions: [], messages: [] });
        engagement.stage = "OFFERED";
        engagement.closedReason = undefined;
        engagement.set("offer", {
            fee: Math.round(amount),
            currency: typeof currency === "string" && currency.trim() ? currency.trim().toUpperCase().slice(0, 3) : "INR",
            deadline: due,
            penaltyPerDayPct: perDay,
            maxPenaltyPct: maxPct,
            notes: typeof notes === "string" ? notes.trim().slice(0, 2000) : undefined,
            offeredAt: new Date(),
        });
        engagement.messages.push({
            from: "ADMIN",
            authorName: await staffName(req.user?.userId),
            text: `Offer sent: ${Math.round(amount).toLocaleString("en-IN")} ${engagement.offer.currency}, due ${due.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}. Late penalty ${perDay}% per day (max ${maxPct}%).${engagement.offer.notes ? ` ${engagement.offer.notes}` : ""}`,
            createdAt: new Date(),
        });
        await engagement.save();
        request.set("assignedTo", writer._id);
        await request.save();
        res.json({ success: true, message: "Offer sent to writer", data: (await presentForAdmin([engagement._id]))[0] });
    }
    catch (error) {
        next(error);
    }
};
const loadEngagement = async (req, res) => {
    const id = toStr(req.params.id);
    if (invalidId(res, id))
        return null;
    const engagement = await WriterEngagement.findById(id);
    if (!engagement) {
        res.status(404).json({ success: false, message: "Assignment not found" });
        return null;
    }
    return engagement;
};
export const getEngagement = async (req, res, next) => {
    try {
        const engagement = await loadEngagement(req, res);
        if (!engagement)
            return;
        res.json({ success: true, data: (await presentForAdmin([engagement._id]))[0] });
    }
    catch (error) {
        next(error);
    }
};
export const postAdminMessage = async (req, res, next) => {
    try {
        const engagement = await loadEngagement(req, res);
        if (!engagement)
            return;
        const text = typeof req.body?.text === "string" ? req.body.text.trim().slice(0, 3000) : "";
        const fee = req.body?.proposedFee !== undefined && req.body.proposedFee !== "" ? Number(req.body.proposedFee) : undefined;
        const days = req.body?.proposedDays !== undefined && req.body.proposedDays !== "" ? Number(req.body.proposedDays) : undefined;
        if (!text && fee === undefined && days === undefined) {
            res.status(400).json({ success: false, message: "Write a message or propose terms" });
            return;
        }
        if ((fee !== undefined && !(fee > 0)) || (days !== undefined && !(Number.isInteger(days) && days >= 1 && days <= 365))) {
            res.status(400).json({ success: false, message: "Fee must be positive and days between 1 and 365" });
            return;
        }
        engagement.messages.push({ from: "ADMIN", authorName: await staffName(req.user?.userId), text: text || undefined, proposedFee: fee, proposedDays: days, createdAt: new Date() });
        await engagement.save();
        res.json({ success: true, data: (await presentForAdmin([engagement._id]))[0] });
    }
    catch (error) {
        next(error);
    }
};
/** Copies an approved submission to the customer's request as the final deliverable. */
const releaseSubmission = async (requestId, submission, notes, actorName) => {
    const request = await ServiceRequest.findById(requestId);
    if (!request)
        return;
    request.set("finalDeliverable", {
        fileName: submission.fileName,
        fileUrl: submission.fileUrl,
        fileSize: submission.fileSize || 0,
        doiUrl: request.finalDeliverable?.doiUrl || "",
        notes: notes || "",
        uploadedAt: new Date(),
    });
    addActivity(request, { actor: "STAFF", actorName, type: "DELIVERABLE", message: "Your deliverable is ready to download" });
    await request.save();
};
export const reviewSubmission = async (req, res, next) => {
    try {
        const engagement = await loadEngagement(req, res);
        if (!engagement)
            return;
        const { decision, notes, releaseToCustomer, customerNote } = req.body ?? {};
        if (engagement.stage !== "SUBMITTED" || engagement.submissions.length === 0) {
            res.status(400).json({ success: false, message: "There is no submission waiting for review" });
            return;
        }
        if (decision !== "APPROVED" && decision !== "CHANGES_REQUESTED") {
            res.status(400).json({ success: false, message: "decision must be APPROVED or CHANGES_REQUESTED" });
            return;
        }
        const reviewNotes = typeof notes === "string" ? notes.trim().slice(0, 3000) : "";
        if (decision === "CHANGES_REQUESTED" && !reviewNotes) {
            res.status(400).json({ success: false, message: "Tell the writer what needs to change" });
            return;
        }
        const reviewerName = await staffName(req.user?.userId);
        const latest = engagement.submissions[engagement.submissions.length - 1];
        latest.review = { decision, notes: reviewNotes || undefined, reviewedAt: new Date(), reviewerName, releasedToCustomer: decision === "APPROVED" && releaseToCustomer === true };
        engagement.markModified("submissions");
        if (decision === "APPROVED") {
            engagement.stage = "APPROVED";
            engagement.approvedAt = new Date();
            const penalty = calculateWriterPenalty({
                fee: engagement.offer?.fee || 0,
                deadline: engagement.offer?.deadline || new Date(),
                deliveredAt: latest.submittedAt,
                penaltyPerDayPct: engagement.offer?.penaltyPerDayPct,
                maxPenaltyPct: engagement.offer?.maxPenaltyPct,
            });
            engagement.set("payout", { lateDays: penalty.lateDays, penaltyAmount: penalty.penaltyAmount, payableAmount: penalty.payableAmount, status: "UNPAID" });
            engagement.messages.push({ from: "ADMIN", authorName: reviewerName, text: reviewNotes ? `Approved. ${reviewNotes}` : "Your submission has been approved. Thank you!", createdAt: new Date() });
            await engagement.save();
            if (releaseToCustomer === true) {
                await releaseSubmission(engagement.requestId, latest, typeof customerNote === "string" ? customerNote.trim().slice(0, 2000) : undefined, reviewerName);
            }
        }
        else {
            engagement.stage = "CHANGES_REQUESTED";
            engagement.messages.push({ from: "ADMIN", authorName: reviewerName, text: `Changes requested: ${reviewNotes}`, createdAt: new Date() });
            await engagement.save();
        }
        res.json({ success: true, data: (await presentForAdmin([engagement._id]))[0] });
    }
    catch (error) {
        next(error);
    }
};
export const releaseToCustomer = async (req, res, next) => {
    try {
        const engagement = await loadEngagement(req, res);
        if (!engagement)
            return;
        const approved = [...engagement.submissions].reverse().find((s) => s.review?.decision === "APPROVED");
        if (engagement.stage !== "APPROVED" || !approved) {
            res.status(400).json({ success: false, message: "Only approved work can be sent to the customer" });
            return;
        }
        await releaseSubmission(engagement.requestId, approved, typeof req.body?.customerNote === "string" ? req.body.customerNote.trim().slice(0, 2000) : undefined, await staffName(req.user?.userId));
        approved.review.releasedToCustomer = true;
        engagement.markModified("submissions");
        await engagement.save();
        res.json({ success: true, message: "Sent to the customer", data: (await presentForAdmin([engagement._id]))[0] });
    }
    catch (error) {
        next(error);
    }
};
export const cancelEngagement = async (req, res, next) => {
    try {
        const engagement = await loadEngagement(req, res);
        if (!engagement)
            return;
        if (["APPROVED", "DECLINED", "WITHDRAWN", "NOT_SELECTED", "CANCELLED"].includes(engagement.stage)) {
            res.status(400).json({ success: false, message: "This assignment is already closed" });
            return;
        }
        const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 1000) : "";
        const wasActive = ACTIVE_ENGAGEMENT_STAGES.includes(engagement.stage);
        engagement.stage = "CANCELLED";
        engagement.closedReason = reason || "Cancelled by admin";
        engagement.messages.push({ from: "ADMIN", authorName: await staffName(req.user?.userId), text: reason ? `Assignment cancelled: ${reason}` : "This assignment has been cancelled.", createdAt: new Date() });
        await engagement.save();
        if (wasActive) {
            await ServiceRequest.updateOne({ _id: engagement.requestId, assignedTo: engagement.writerId }, { $set: { assignedTo: null } });
            // Writers previously passed over can be considered again
            await WriterEngagement.updateMany({ requestId: engagement.requestId, stage: "NOT_SELECTED" }, { $set: { stage: "INTERESTED" } });
        }
        res.json({ success: true, data: (await presentForAdmin([engagement._id]))[0] });
    }
    catch (error) {
        next(error);
    }
};
export const updatePayout = async (req, res, next) => {
    try {
        const engagement = await loadEngagement(req, res);
        if (!engagement)
            return;
        if (engagement.stage !== "APPROVED" || !engagement.payout) {
            res.status(400).json({ success: false, message: "Payout is available after the work is approved" });
            return;
        }
        const { status, penaltyAmount, note } = req.body ?? {};
        if (penaltyAmount !== undefined) {
            const p = Number(penaltyAmount);
            const fee = engagement.offer?.fee || 0;
            if (!(p >= 0 && p <= fee)) {
                res.status(400).json({ success: false, message: "Penalty must be between 0 and the agreed fee" });
                return;
            }
            engagement.set("payout.penaltyAmount", Math.round(p));
            engagement.set("payout.payableAmount", Math.max(0, fee - Math.round(p)));
        }
        if (status === "PAID" || status === "UNPAID") {
            engagement.set("payout.status", status);
            engagement.set("payout.paidAt", status === "PAID" ? new Date() : undefined);
        }
        if (typeof note === "string")
            engagement.set("payout.note", note.trim().slice(0, 1000));
        await engagement.save();
        res.json({ success: true, data: (await presentForAdmin([engagement._id]))[0] });
    }
    catch (error) {
        next(error);
    }
};
/** POST /api/admin/writers/:id/cv-extract — suggestions from the writer's saved CV. */
export const extractWriterCv = async (req, res, next) => {
    const id = toStr(req.params.id);
    if (invalidId(res, id))
        return;
    const writer = await User.findOne({ _id: id, role: USER_ROLES.WRITER }).select("writerProfile.cvUrl");
    if (!writer) {
        res.status(404).json({ success: false, message: "Writer not found" });
        return;
    }
    await runCvExtraction(writer.writerProfile?.cvUrl, req.user.userId, res, next);
};
//# sourceMappingURL=adminWriter.controller.js.map