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

        const authorValidationError = validateAcademicProfileAuthors(academicProfile);
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
        let activeTemplateId = templateId;
        if (!activeTemplateId) {
            const defaultTemplate = await RequirementTemplate.findOne({
                serviceId: service._id,
                isActive: true,
            }).sort({ isPublished: -1, version: -1 });

            if (defaultTemplate) {
                activeTemplateId = defaultTemplate._id;
            }
        }

        if (activeTemplateId && mongoose.Types.ObjectId.isValid(activeTemplateId)) {
            const requiredFields = await RequirementField.find({
                templateId: activeTemplateId,
                isRequired: true,
                isActive: true,
            });

            const missingFields: string[] = [];
            for (const field of requiredFields) {
                const val = requirements[field.key];
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
        const cleanedFiles = Array.isArray(referenceFiles)
            ? referenceFiles
                  .filter((f) => f && typeof f.url === "string" && f.url.trim())
                  .map((f) => ({
                      name: String(f.name || "Attachment").trim(),
                      url: String(f.url).trim(),
                      type: f.type ? String(f.type).trim() : undefined,
                      size: typeof f.size === "number" ? f.size : undefined,
                  }))
            : [];

        const requestNumber = generateRequestNumber();

        const serviceRequest = await ServiceRequest.create({
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
            templateId: activeTemplateId ? new mongoose.Types.ObjectId(activeTemplateId) : undefined,
            academicProfile: academicProfile || {},
            requirements,
            referenceFiles: cleanedFiles,
            additionalMessage: additionalMessage ? String(additionalMessage).trim() : undefined,
            preferredContactMethod: ["WHATSAPP", "EMAIL", "PHONE"].includes(preferredContactMethod)
                ? preferredContactMethod
                : "WHATSAPP",
            status: "NEW",
        });

        const populated = await ServiceRequest.findById(serviceRequest._id)
            .populate("serviceId", "name slug description turnaroundTime pricingModel priceRange priceAmount")
            .populate("domainId", "name slug")
            .populate("categoryId", "name slug")
            .lean();

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
            const regex = new RegExp(search.trim(), "i");
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
                .populate("serviceId", "name slug turnaroundTime pricingModel")
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

        if (serviceRequest.status === "COMPLETED") {
            res.status(400).json({
                success: false,
                message: "Cannot cancel a completed service request",
            });
            return;
        }

        serviceRequest.status = "CANCELLED";
        await serviceRequest.save();

        res.status(200).json({
            success: true,
            message: "Service request cancelled successfully",
            data: serviceRequest,
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
        const { message, files } = req.body;

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

        if (message) {
            serviceRequest.additionalMessage = serviceRequest.additionalMessage
                ? `${serviceRequest.additionalMessage}\n\n[Customer Update ${new Date().toISOString()}]: ${message}`
                : message;
        }

        if (Array.isArray(files) && files.length > 0) {
            serviceRequest.referenceFiles.push(...files);
        }

        // When customer responds, move status back to IN_PROGRESS if it was waiting
        if (serviceRequest.status === "WAITING_FOR_CUSTOMER" || (serviceRequest.status as any) === "NEEDS_INFORMATION") {
            serviceRequest.status = "IN_PROGRESS";
        }

        await serviceRequest.save();

        res.status(200).json({
            success: true,
            message: "Response submitted successfully",
            data: serviceRequest,
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
            : Number(amountPaid) || (serviceRequest.quotation?.amount || 0);

        serviceRequest.referral = referralPayload;
        serviceRequest.paymentSubmission = {
            transactionId: transactionId.trim(),
            amountPaid: paymentAmount,
            currency: currency || serviceRequest.quotation?.currency || "INR",
            payerName: payerName ? String(payerName).trim() : serviceRequest.customer.name,
            payerUpiId: payerUpiId ? String(payerUpiId).trim() : "",
            screenshotUrl: screenshotUrl || "",
            notes: notes || "",
            submittedAt: new Date(),
            status: "PENDING_VERIFICATION",
        };

        await serviceRequest.save();

        res.status(200).json({
            success: true,
            message: "Payment details submitted for verification",
            data: serviceRequest,
        });
    } catch (error) {
        next(error);
    }
};