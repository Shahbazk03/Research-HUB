import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import ServiceRequest from "../models/ServiceRequest.js";
import Service from "../models/Service.js";
import RequirementTemplate from "../models/RequirementTemplate.js";
import RequirementField from "../models/RequirementField.js";
import ReferralCode from "../models/ReferralCode.js";
import { validateAcademicProfileAuthors } from "../utils/requestAuthorValidation.js";
import { calculateReferralDiscount, normalizeReferralCode } from "../utils/referralValidation.js";
import { USER_ROLES } from "../types/roles.js";
import { safeContainsRegex, addActivity, cleanFileList, isSafeHttpUrl } from "../utils/requestActivity.js";

const SERVICE_POPULATE = "name slug description turnaroundTime pricingModel priceRange priceAmount currency";

/** Statuses from which a customer may still cancel (work has not started and nothing is paid). */
const CUSTOMER_CANCELLABLE: string[] = ["NEW", "UNDER_REVIEW", "QUOTATION_SENT", "WAITING_FOR_CUSTOMER", "NEEDS_INFORMATION"];

const populateForCustomer = (id: unknown) =>
    ServiceRequest.findById(id)
        .select("-adminNotes")
        .populate("serviceId", SERVICE_POPULATE)
        .populate("domainId", "name slug")
        .populate("categoryId", "name slug")
        .lean();

const toStr = (val: unknown): string => (Array.isArray(val) ? String(val[0] || "") : String(val || ""));

const generateRequestNumber = (): string => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `RH-${timestamp}-${random}`;
};

export const createServiceRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required to submit a research request",
            });
            return;
        }

        const {
            name,
            email,
            phone,
            whatsapp,
            serviceId,
            domainId,
            categoryId,
            templateId,
            academicProfile,
            requirements = {},
            referenceFiles = [],
            additionalMessage,
            preferredContactMethod = "WHATSAPP",
        } = req.body;

        const authorValidationError =
            academicProfile && typeof academicProfile === "object"
                ? validateAcademicProfileAuthors(academicProfile)
                : "Corresponding author and supervisor details are required.";
        if (authorValidationError) {
            res.status(400).json({
                success: false,
                message: authorValidationError,
            });
            return;
        }

        if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) {
            res.status(400).json({
                success: false,
                message: "A valid Service ID is required",
            });
            return;
        }

        const service = await Service.findById(serviceId);
        if (!service) {
            res.status(404).json({
                success: false,
                message: "Selected service does not exist",
            });
            return;
        }

        if (!name || typeof name !== "string" || !name.trim()) {
            res.status(400).json({
                success: false,
                message: "Customer name is required",
            });
            return;
        }

        if (!email || typeof email !== "string" || !email.trim()) {
            res.status(400).json({
                success: false,
                message: "Customer email is required",
            });
            return;
        }

        // Validate template fields if a template exists
        // A client-supplied template is only honoured if it belongs to the selected service
        let activeTemplateId: mongoose.Types.ObjectId | undefined;
        if (templateId && mongoose.Types.ObjectId.isValid(templateId)) {
            const ownTemplate = await RequirementTemplate.findOne({
                _id: templateId,
                serviceId: service._id,
            }).select("_id");
            if (ownTemplate) activeTemplateId = ownTemplate._id as mongoose.Types.ObjectId;
        }
        if (!activeTemplateId) {
            const defaultTemplate = await RequirementTemplate.findOne({
                serviceId: service._id,
                isActive: true,
            }).sort({ isPublished: -1, version: -1 });

            if (defaultTemplate) {
                activeTemplateId = defaultTemplate._id as mongoose.Types.ObjectId;
            }
        }

        const requirementValues: Record<string, unknown> =
            requirements && typeof requirements === "object" && !Array.isArray(requirements)
                ? requirements
                : {};

        if (activeTemplateId) {
            const requiredFields = await RequirementField.find({
                templateId: activeTemplateId,
                isRequired: true,
                isActive: true,
            });

            const missingFields: string[] = [];
            for (const field of requiredFields) {
                const val = requirementValues[field.key];
                if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
                    missingFields.push(field.label);
                }
            }

            if (missingFields.length > 0) {
                res.status(400).json({
                    success: false,
                    message: `Please complete the required fields: ${missingFields.join(", ")}`,
                    missingFields,
                });
                return;
            }
        }

        // Format clean reference files
        const cleanedFiles = cleanFileList(referenceFiles);

        const requestNumber = generateRequestNumber();

        const serviceRequest = await ServiceRequest.create({
            activity: [
                {
                    type: "CREATED",
                    actor: "CUSTOMER",
                    actorName: name.trim(),
                    message: "Request submitted",
                    createdAt: new Date(),
                },
            ],
            requestNumber,
            userId: new mongoose.Types.ObjectId(req.user.userId),
            customer: {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                phone: phone ? String(phone).trim() : undefined,
                whatsapp: whatsapp ? String(whatsapp).trim() : undefined,
            },
            serviceId: service._id,
            domainId: domainId && mongoose.Types.ObjectId.isValid(domainId)
                ? new mongoose.Types.ObjectId(domainId)
                : service.domainIds?.[0],
            categoryId: categoryId && mongoose.Types.ObjectId.isValid(categoryId)
                ? new mongoose.Types.ObjectId(categoryId)
                : service.categoryIds?.[0],
            templateId: activeTemplateId,
            academicProfile,
            requirements: requirementValues,
            referenceFiles: cleanedFiles,
            additionalMessage: additionalMessage ? String(additionalMessage).trim() : undefined,
            preferredContactMethod: ["WHATSAPP", "EMAIL", "PHONE"].includes(preferredContactMethod)
                ? preferredContactMethod
                : "WHATSAPP",
            status: "NEW",
        });

        const populated = await populateForCustomer(serviceRequest._id);

        res.status(201).json({
            success: true,
            message: "Research request submitted successfully",
            data: populated,
        });
    } catch (error) {
        next(error);
    }
};

export const getCustomerServiceRequests = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const {
            status,
            search,
            page = "1",
            limit = "20",
        } = req.query;

        const filter: Record<string, unknown> = {
            userId: new mongoose.Types.ObjectId(req.user.userId),
        };

        if (status && typeof status === "string" && status.trim()) {
            filter.status = status.trim();
        }

        if (search && typeof search === "string" && search.trim()) {
            const regex = safeContainsRegex(search);
            filter.$or = [
                { requestNumber: regex },
                { "academicProfile.discipline": regex },
                { "academicProfile.targetJournal": regex },
                { "academicProfile.university": regex },
                { additionalMessage: regex },
            ];
        }

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [requests, total] = await Promise.all([
            ServiceRequest.find(filter)
                .select("-adminNotes")
                .populate("serviceId", SERVICE_POPULATE)
                .populate("domainId", "name slug")
                .populate("categoryId", "name slug")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            ServiceRequest.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: requests.length,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            data: requests,
        });
    } catch (error) {
        next(error);
    }
};

export const getServiceRequestById = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const id = toStr(req.params.id);
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid request ID",
            });
            return;
        }

        const query: Record<string, unknown> = { _id: id };

        // If not admin/staff, only allow viewing own requests
        if (req.user.role === USER_ROLES.CUSTOMER) {
            query.userId = new mongoose.Types.ObjectId(req.user.userId);
        }

        const serviceRequest = await ServiceRequest.findOne(query)
            .select("-adminNotes")
            .populate("serviceId")
            .populate("domainId", "name slug")
            .populate("categoryId", "name slug")
            .populate("templateId")
            .lean();

        if (!serviceRequest) {
            res.status(404).json({
                success: false,
                message: "Service request not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: serviceRequest,
        });
    } catch (error) {
        next(error);
    }
};

export const cancelCustomerRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const id = toStr(req.params.id);
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid request ID",
            });
            return;
        }

        const serviceRequest = await ServiceRequest.findOne({
            _id: id,
            userId: new mongoose.Types.ObjectId(req.user.userId),
        });

        if (!serviceRequest) {
            res.status(404).json({
                success: false,
                message: "Service request not found",
            });
            return;
        }

        if (
            !CUSTOMER_CANCELLABLE.includes(serviceRequest.status) ||
            serviceRequest.paymentSubmission?.status === "VERIFIED"
        ) {
            res.status(400).json({
                success: false,
                message:
                    "This request can no longer be cancelled online because work has started or payment is confirmed. Please contact our team.",
            });
            return;
        }

        serviceRequest.status = "CANCELLED";
        addActivity(serviceRequest, {
            type: "STATUS",
            actor: "CUSTOMER",
            actorName: serviceRequest.customer.name,
            status: "CANCELLED",
            message: "Request cancelled by customer",
        });
        await serviceRequest.save();

        res.status(200).json({
            success: true,
            message: "Service request cancelled successfully",
            data: await populateForCustomer(serviceRequest._id),
        });
    } catch (error) {
        next(error);
    }
};

export const respondCustomerRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const id = toStr(req.params.id);
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: "Invalid request ID" });
            return;
        }

        const { message, files } = req.body ?? {};
        const text = typeof message === "string" ? message.trim() : "";
        const cleanFiles = cleanFileList(files, 10);

        if (!text && cleanFiles.length === 0) {
            res.status(400).json({ success: false, message: "Please write a message or attach a file" });
            return;
        }

        if (text.length > 5000) {
            res.status(400).json({ success: false, message: "Message must be 5000 characters or fewer" });
            return;
        }

        const serviceRequest = await ServiceRequest.findOne({
            _id: id,
            userId: new mongoose.Types.ObjectId(req.user.userId),
        });

        if (!serviceRequest) {
            res.status(404).json({
                success: false,
                message: "Service request not found",
            });
            return;
        }

        addActivity(serviceRequest, {
            type: "MESSAGE",
            actor: "CUSTOMER",
            actorName: serviceRequest.customer.name,
            message: text || undefined,
            files: cleanFiles.map((f) => ({ name: f.name, url: f.url })),
        });

        if (cleanFiles.length > 0) {
            serviceRequest.referenceFiles.push(...cleanFiles);
        }

        // When customer responds, move status back to IN_PROGRESS if it was waiting
        if (serviceRequest.status === "WAITING_FOR_CUSTOMER" || (serviceRequest.status as any) === "NEEDS_INFORMATION") {
            serviceRequest.status = "IN_PROGRESS";
        }

        await serviceRequest.save();

        res.status(200).json({
            success: true,
            message: "Response submitted successfully",
            data: await populateForCustomer(serviceRequest._id),
        });
    } catch (error) {
        next(error);
    }
};

export const submitCustomerPayment = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const id = toStr(req.params.id);
        const {
            transactionId,
            amountPaid,
            currency = "INR",
            payerName,
            payerUpiId,
            screenshotUrl,
            notes,
            referralCode,
        } = req.body;

        if (!transactionId || typeof transactionId !== "string" || !transactionId.trim()) {
            res.status(400).json({
                success: false,
                message: "UPI Transaction ID / UTR number is required",
            });
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: "Invalid request ID" });
            return;
        }

        const serviceRequest = await ServiceRequest.findOne({
            _id: id,
            userId: new mongoose.Types.ObjectId(req.user.userId),
        });

        if (!serviceRequest) {
            res.status(404).json({
                success: false,
                message: "Service request not found",
            });
            return;
        }

        if (["CANCELLED", "COMPLETED"].includes(serviceRequest.status)) {
            res.status(400).json({ success: false, message: "Payments cannot be submitted for a closed request" });
            return;
        }

        if (!(Number(serviceRequest.quotation?.amount) > 0)) {
            res.status(400).json({
                success: false,
                message: "A quotation has not been issued for this request yet",
            });
            return;
        }

        if (serviceRequest.paymentSubmission?.status === "VERIFIED") {
            res.status(400).json({ success: false, message: "Payment for this request is already confirmed" });
            return;
        }

        const normalizedReferralCode = normalizeReferralCode(referralCode);
        let referralPayload: typeof serviceRequest.referral | undefined;

        if (normalizedReferralCode) {
            const referralRecord = await ReferralCode.findOne({
                code: normalizedReferralCode,
                isActive: true,
            });

            if (!referralRecord) {
                res.status(400).json({
                    success: false,
                    message: "Referral code is invalid or inactive",
                });
                return;
            }

            const baseAmount = Number(serviceRequest.quotation?.amount ?? 0) || 0;
            const calculated = calculateReferralDiscount({
                code: referralRecord.code,
                referrerName: referralRecord.referrerName,
                discountAmount: referralRecord.discountAmount,
                baseAmount,
                currency: serviceRequest.quotation?.currency || currency || "INR",
            });

            referralPayload = {
                code: calculated.code,
                referrerName: calculated.referrerName,
                discountAmount: calculated.discountAmount,
                originalAmount: calculated.originalAmount,
                finalAmount: calculated.finalAmount,
                currency: calculated.currency,
                appliedAt: new Date(),
            };
        }

        const paymentAmount = referralPayload
            ? referralPayload.finalAmount
            : Number(serviceRequest.quotation?.amount) || Number(amountPaid) || 0;

        serviceRequest.referral = referralPayload;
        serviceRequest.paymentSubmission = {
            transactionId: transactionId.trim(),
            amountPaid: paymentAmount,
            currency: currency || serviceRequest.quotation?.currency || "INR",
            payerName: payerName ? String(payerName).trim() : serviceRequest.customer.name,
            payerUpiId: payerUpiId ? String(payerUpiId).trim() : "",
            screenshotUrl: isSafeHttpUrl(screenshotUrl) ? screenshotUrl.trim() : "",
            notes: notes ? String(notes).trim().slice(0, 2000) : "",
            submittedAt: new Date(),
            status: "PENDING_VERIFICATION",
        };

        addActivity(serviceRequest, {
            type: "PAYMENT_SUBMITTED",
            actor: "CUSTOMER",
            actorName: serviceRequest.customer.name,
            message: `Payment reference ${transactionId.trim()} submitted for verification`,
        });

        await serviceRequest.save();

        res.status(200).json({
            success: true,
            message: "Payment details submitted for verification",
            data: await populateForCustomer(serviceRequest._id),
        });
    } catch (error) {
        next(error);
    }
};