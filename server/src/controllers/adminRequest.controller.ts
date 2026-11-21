import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import ServiceRequest, { isValidStatusTransition, type IRequestActivity } from "../models/ServiceRequest.js";
import User from "../models/User.js";
import { USER_ROLES } from "../types/roles.js";
import { addActivity, cleanFileList, isSafeHttpUrl } from "../utils/requestActivity.js";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const isValidObjectId = (id: unknown): boolean => {
    return (
        typeof id === "string" &&
        mongoose.Types.ObjectId.isValid(id)
    );
};

const getParamString = (
    value: string | string[] | undefined
): string | undefined => {
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
};

export const escapeRegExp = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const buildAdminRequestSearchFilter = (search?: string): Record<string, unknown> => {
    const searchValue = search?.trim();

    if (!searchValue) {
        return {};
    }

    const escaped = escapeRegExp(searchValue);
    const referenceLike = /(?:^|[-\s])rh[-\s]?\d|^\d{3,}$|^rh[-\s]?\d/i.test(searchValue);

    if (referenceLike) {
        return {
            $or: [
                { requestNumber: { $regex: `^${escaped}$`, $options: "i" } },
                { requestNumber: { $regex: escaped, $options: "i" } },
            ],
        };
    }

    return {
        $or: [
            { requestNumber: { $regex: escaped, $options: "i" } },
            { "customer.email": { $regex: escaped, $options: "i" } },
            { "customer.name": { $regex: escaped, $options: "i" } },
            { "customer.phone": { $regex: escaped, $options: "i" } },
            { "customer.whatsapp": { $regex: escaped, $options: "i" } },
            { "requirements.research_topic": { $regex: escaped, $options: "i" } },
            { "requirements.topic": { $regex: escaped, $options: "i" } },
            { "requirements.title": { $regex: escaped, $options: "i" } },
            { "requirements.working_title": { $regex: escaped, $options: "i" } },
            { "requirements.paper_title": { $regex: escaped, $options: "i" } },
            { additionalMessage: { $regex: escaped, $options: "i" } },
        ],
    };
};

/*
|--------------------------------------------------------------------------
| Allowed Statuses
|--------------------------------------------------------------------------
*/

const ALLOWED_STATUSES = [
    "NEW",
    "IN_PROGRESS",
    "WAITING_FOR_CUSTOMER",
    "COMPLETED",
    "CANCELLED",
    "UNDER_REVIEW",
    "NEEDS_INFORMATION",
    "QUOTATION_SENT",
] as const;

type RequestStatus = (typeof ALLOWED_STATUSES)[number];

/*
|--------------------------------------------------------------------------
| Allowed Contact Methods
|--------------------------------------------------------------------------
*/

const ALLOWED_CONTACT_METHODS = [
    "WHATSAPP",
    "EMAIL",
    "PHONE",
] as const;

type ContactMethod =
    (typeof ALLOWED_CONTACT_METHODS)[number];

/*
|--------------------------------------------------------------------------
| GET ALL ADMIN SERVICE REQUESTS
|--------------------------------------------------------------------------
|
| GET /api/admin/requests
|
| Query:
|
| ?status=NEW
| ?serviceId=SERVICE_ID
| ?page=1
| ?limit=20
|
|--------------------------------------------------------------------------
*/

export const getAdminServiceRequests = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            status,
            serviceId,
            search,
            page = "1",
            limit = "20",
        } = req.query;

        /*
        |--------------------------------------------------------------------------
        | Pagination
        |--------------------------------------------------------------------------
        */

        const parsedPage = Math.max(
            Number(page) || 1,
            1
        );

        const parsedLimit = Math.min(
            Math.max(Number(limit) || 20, 1),
            100
        );

        const skip =
            (parsedPage - 1) * parsedLimit;

        /*
        |--------------------------------------------------------------------------
        | Build Filter
        |--------------------------------------------------------------------------
        */

        const filter: Record<string, unknown> = {};

        /*
        |--------------------------------------------------------------------------
        | Status Filter
        |--------------------------------------------------------------------------
        */

        if (status !== undefined) {
            const statusValue = getParamString(
                status as string | string[]
            );

            if (
                !statusValue ||
                !ALLOWED_STATUSES.includes(
                    statusValue as RequestStatus
                )
            ) {
                res.status(400).json({
                    success: false,
                    message: "Invalid request status",
                    allowedStatuses:
                        ALLOWED_STATUSES,
                });

                return;
            }

            filter.status = statusValue;
        }

        /*
        |--------------------------------------------------------------------------
        | Service Filter
        |--------------------------------------------------------------------------
        */

        if (serviceId !== undefined) {
            const serviceIdValue =
                getParamString(
                    serviceId as string | string[]
                );

            if (!isValidObjectId(serviceIdValue)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid serviceId",
                });

                return;
            }

            filter.serviceId = serviceIdValue;
        }

        const searchValue = getParamString(search as string | string[] | undefined);
        const searchFilter = buildAdminRequestSearchFilter(searchValue);

        Object.assign(filter, searchFilter);

        /*
        |--------------------------------------------------------------------------
        | Fetch Requests
        |--------------------------------------------------------------------------
        */

        const [requests, total] =
            await Promise.all([
                ServiceRequest.find(filter)
                    .populate(
                        "serviceId",
                        "name slug description pricingModel priceAmount priceRange currency turnaroundTime"
                    )
                    .populate(
                        "domainId",
                        "name slug description"
                    )
                    .populate(
                        "categoryId",
                        "name slug description"
                    )
                    .populate(
                        "templateId",
                        "name version isPublished"
                    )
                    .sort({
                        createdAt: -1,
                    })
                    .skip(skip)
                    .limit(parsedLimit)
                    .lean(),

                ServiceRequest.countDocuments(filter),
            ]);

        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */

        res.status(200).json({
            success: true,
            count: requests.length,
            total,
            page: parsedPage,
            limit: parsedLimit,
            totalPages:
                Math.ceil(
                    total / parsedLimit
                ),
            data: requests,
        });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE ADMIN SERVICE REQUEST
|--------------------------------------------------------------------------
|
| GET /api/admin/requests/:id
|
|--------------------------------------------------------------------------
*/

export const getAdminServiceRequestById = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = getParamString(
            req.params.id
        );

        /*
        |--------------------------------------------------------------------------
        | Validate ID
        |--------------------------------------------------------------------------
        */

        if (!isValidObjectId(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid request ID",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Find Request
        |--------------------------------------------------------------------------
        */

        const serviceRequest =
            await ServiceRequest.findById(id)
                .populate(
                    "serviceId",
                    "name slug description pricingModel priceAmount priceRange currency turnaroundTime"
                )
                .populate(
                    "domainId",
                    "name slug description"
                )
                .populate(
                    "categoryId",
                    "name slug description"
                )
                .populate(
                    "templateId",
                    "name version isPublished"
                )
                .lean();

        /*
        |--------------------------------------------------------------------------
        | Not Found
        |--------------------------------------------------------------------------
        */

        if (!serviceRequest) {
            res.status(404).json({
                success: false,
                message:
                    "Service request not found",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        res.status(200).json({
            success: true,
            data: serviceRequest,
        });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| UPDATE ADMIN SERVICE REQUEST
|--------------------------------------------------------------------------
|
| PUT /api/admin/requests/:id
|
| Body can contain:
|
| {
|   name,
|   email,
|   phone,
|   whatsapp,
|   status,
|   requirements,
|   referenceFiles,
|   additionalMessage,
|   preferredContactMethod
| }
|
|--------------------------------------------------------------------------
*/

export const updateAdminServiceRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = getParamString(req.params.id);

        if (!isValidObjectId(id)) {
            res.status(400).json({ success: false, message: "Invalid request ID" });
            return;
        }

        const body: Record<string, any> =
            req.body && typeof req.body === "object" ? req.body : {};

        const {
            name,
            email,
            phone,
            whatsapp,
            status,
            requirements,
            referenceFiles,
            additionalMessage,
            preferredContactMethod,
            adminNotes,
            quotation,
            paymentQr,
            finalDeliverable,
            paymentVerificationAction,
            paymentVerificationNotes,
            message,
            messageFiles,
        } = body;

        /*
        | Money-related fields are ADMIN only. Team members can progress work,
        | write notes, message the customer and deliver files, but cannot set
        | prices, change where customers pay, or confirm payments.
        */
        const isAdmin = req.user?.role === USER_ROLES.ADMIN;
        const adminOnlyTouched = ["quotation", "paymentQr", "paymentVerificationAction", "paymentSubmission"].filter(
            (key) => body[key] !== undefined
        );

        if (!isAdmin && adminOnlyTouched.length > 0) {
            res.status(403).json({
                success: false,
                message: "Only administrators can change quotations, payment QR codes or payment verification.",
            });
            return;
        }

        if (body.paymentSubmission !== undefined) {
            res.status(400).json({
                success: false,
                message: "Payment submissions are recorded by the customer. Use the verify / reject actions instead.",
            });
            return;
        }

        if (status !== undefined && !ALLOWED_STATUSES.includes(status as RequestStatus)) {
            res.status(400).json({ success: false, message: "Invalid request status", allowedStatuses: ALLOWED_STATUSES });
            return;
        }

        if (
            preferredContactMethod !== undefined &&
            !ALLOWED_CONTACT_METHODS.includes(preferredContactMethod as ContactMethod)
        ) {
            res.status(400).json({ success: false, message: "Invalid preferred contact method" });
            return;
        }

        if (
            requirements !== undefined &&
            (typeof requirements !== "object" || requirements === null || Array.isArray(requirements))
        ) {
            res.status(400).json({ success: false, message: "requirements must be an object" });
            return;
        }

        if (referenceFiles !== undefined && !Array.isArray(referenceFiles)) {
            res.status(400).json({ success: false, message: "referenceFiles must be an array" });
            return;
        }

        if (
            paymentVerificationAction !== undefined &&
            paymentVerificationAction !== "VERIFY" &&
            paymentVerificationAction !== "REJECT"
        ) {
            res.status(400).json({ success: false, message: "paymentVerificationAction must be VERIFY or REJECT" });
            return;
        }

        let quotationAmount: number | undefined;
        if (quotation && typeof quotation === "object") {
            quotationAmount = Number(quotation.amount);
            if (!Number.isFinite(quotationAmount) || quotationAmount <= 0) {
                res.status(400).json({ success: false, message: "Quotation amount must be a positive number" });
                return;
            }
        }

        if (paymentQr && typeof paymentQr === "object" && paymentQr.url && !isSafeHttpUrl(paymentQr.url)) {
            res.status(400).json({ success: false, message: "Payment QR must be an uploaded image URL" });
            return;
        }

        if (finalDeliverable && typeof finalDeliverable === "object") {
            for (const key of ["fileUrl", "doiUrl"] as const) {
                if (finalDeliverable[key] && !isSafeHttpUrl(finalDeliverable[key])) {
                    res.status(400).json({ success: false, message: `Deliverable ${key} must be an http(s) link` });
                    return;
                }
            }
        }

        const messageText = typeof message === "string" ? message.trim() : "";
        if (messageText.length > 5000) {
            res.status(400).json({ success: false, message: "Message must be 5000 characters or fewer" });
            return;
        }

        const serviceRequest = await ServiceRequest.findById(id);

        if (!serviceRequest) {
            res.status(404).json({ success: false, message: "Service request not found" });
            return;
        }

        const staff = await User.findById(req.user?.userId).select("firstName lastName");
        const actorName = staff ? `${staff.firstName} ${staff.lastName || ""}`.trim() : "Research Hub team";
        const log = (entry: Omit<IRequestActivity, "createdAt" | "actor" | "actorName">) =>
            addActivity(serviceRequest, { actor: "STAFF", actorName, ...entry });

        /* Customer & request fields */
        if (name !== undefined) serviceRequest.customer.name = String(name).trim();
        if (email !== undefined) serviceRequest.customer.email = String(email).trim().toLowerCase();
        if (phone !== undefined) serviceRequest.customer.phone = String(phone ?? "").trim();
        if (whatsapp !== undefined) serviceRequest.customer.whatsapp = String(whatsapp ?? "").trim();
        if (requirements !== undefined) {
            serviceRequest.requirements = requirements;
            serviceRequest.markModified("requirements");
        }
        if (referenceFiles !== undefined) serviceRequest.referenceFiles = cleanFileList(referenceFiles, 50);
        if (additionalMessage !== undefined) serviceRequest.additionalMessage = String(additionalMessage ?? "").trim();
        if (preferredContactMethod !== undefined) serviceRequest.preferredContactMethod = preferredContactMethod;
        if (adminNotes !== undefined) serviceRequest.adminNotes = String(adminNotes ?? "");

        /* Status (transition rules enforced) */
        if (status !== undefined && status !== serviceRequest.status) {
            if (!isValidStatusTransition(serviceRequest.status, status)) {
                res.status(400).json({
                    success: false,
                    message: `A request cannot move from ${serviceRequest.status} to ${status}.`,
                });
                return;
            }
            serviceRequest.status = status;
            log({ type: "STATUS", status });
        }

        /* Quotation (null clears it) */
        if (quotation !== undefined) {
            if (quotation && typeof quotation === "object" && quotationAmount !== undefined) {
                const currency = String(quotation.currency || "INR").trim().toUpperCase().slice(0, 3) || "INR";
                const changed =
                    serviceRequest.quotation?.amount !== quotationAmount ||
                    serviceRequest.quotation?.currency !== currency;
                serviceRequest.set("quotation", {
                    amount: quotationAmount,
                    currency,
                    notes: String(quotation.notes || "").trim(),
                    providedAt: changed ? new Date() : serviceRequest.quotation?.providedAt || new Date(),
                });
                if (changed) {
                    log({ type: "QUOTATION", message: `Quotation issued: ${currency} ${quotationAmount.toLocaleString("en-IN")}` });
                }
            } else {
                serviceRequest.set("quotation", undefined);
            }
        }

        /* Payment QR (null clears it) */
        if (paymentQr !== undefined) {
            if (paymentQr && typeof paymentQr === "object" && paymentQr.url) {
                serviceRequest.set("paymentQr", {
                    url: String(paymentQr.url).trim(),
                    upiId: String(paymentQr.upiId || "").trim(),
                    uploadedAt: new Date(),
                });
            } else {
                serviceRequest.set("paymentQr", undefined);
            }
        }

        /* Final deliverable (null clears it) */
        if (finalDeliverable !== undefined) {
            if (finalDeliverable && typeof finalDeliverable === "object" && (finalDeliverable.fileUrl || finalDeliverable.doiUrl)) {
                const isNew =
                    finalDeliverable.fileUrl !== serviceRequest.finalDeliverable?.fileUrl ||
                    finalDeliverable.doiUrl !== serviceRequest.finalDeliverable?.doiUrl;
                serviceRequest.set("finalDeliverable", {
                    fileName: String(finalDeliverable.fileName || "").trim(),
                    fileUrl: String(finalDeliverable.fileUrl || "").trim(),
                    fileSize: Number(finalDeliverable.fileSize) || 0,
                    doiUrl: String(finalDeliverable.doiUrl || "").trim(),
                    notes: String(finalDeliverable.notes || "").trim(),
                    uploadedAt: isNew ? new Date() : serviceRequest.finalDeliverable?.uploadedAt || new Date(),
                });
                if (isNew) log({ type: "DELIVERABLE", message: "Final deliverable shared" });
            } else {
                serviceRequest.set("finalDeliverable", undefined);
            }
        }

        /* Payment verification */
        if (paymentVerificationAction !== undefined) {
            if (!serviceRequest.paymentSubmission?.transactionId) {
                res.status(400).json({ success: false, message: "The customer has not submitted a payment to verify" });
                return;
            }

            const verified = paymentVerificationAction === "VERIFY";
            const notes = typeof paymentVerificationNotes === "string" ? paymentVerificationNotes.trim() : "";
            serviceRequest.set("paymentSubmission.status", verified ? "VERIFIED" : "REJECTED");
            serviceRequest.set("paymentSubmission.verifiedAt", new Date());
            serviceRequest.set("paymentSubmission.adminVerificationNotes", notes);
            log({
                type: verified ? "PAYMENT_VERIFIED" : "PAYMENT_REJECTED",
                message: verified ? "Payment confirmed" : notes || "Payment could not be verified",
            });

            // Confirmed payment starts the work unless an explicit status was chosen in this same save
            if (
                verified &&
                status === undefined &&
                isValidStatusTransition(serviceRequest.status, "IN_PROGRESS") &&
                serviceRequest.status !== "IN_PROGRESS"
            ) {
                serviceRequest.status = "IN_PROGRESS";
                log({ type: "STATUS", status: "IN_PROGRESS" });
            }
        }

        /* Message to customer */
        const cleanMessageFiles = cleanFileList(messageFiles, 10);
        if (messageText || cleanMessageFiles.length > 0) {
            log({
                type: "MESSAGE",
                message: messageText || undefined,
                files: cleanMessageFiles.map((f) => ({ name: f.name, url: f.url })),
            });
        }

        await serviceRequest.save();

        const populated = await ServiceRequest.findById(id)
            .populate("serviceId", "name slug description pricingModel priceAmount priceRange currency turnaroundTime")
            .populate("domainId", "name slug description")
            .populate("categoryId", "name slug description")
            .populate("templateId", "name version isPublished");

        res.status(200).json({
            success: true,
            message: "Service request updated successfully",
            data: populated,
        });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| DELETE ADMIN SERVICE REQUEST
|--------------------------------------------------------------------------
|
| DELETE /api/admin/requests/:id
|
|--------------------------------------------------------------------------
*/

export const deleteAdminServiceRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = getParamString(
            req.params.id
        );

        /*
        |--------------------------------------------------------------------------
        | Validate ID
        |--------------------------------------------------------------------------
        */

        if (!isValidObjectId(id)) {
            res.status(400).json({
                success: false,
                message:
                    "Invalid request ID",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Delete
        |--------------------------------------------------------------------------
        */

        const serviceRequest =
            await ServiceRequest.findByIdAndDelete(
                id
            );

        /*
        |--------------------------------------------------------------------------
        | Not Found
        |--------------------------------------------------------------------------
        */

        if (!serviceRequest) {
            res.status(404).json({
                success: false,
                message:
                    "Service request not found",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        res.status(200).json({
            success: true,
            message:
                "Service request deleted successfully",
            data: {
                id: serviceRequest._id,
                requestNumber:
                    serviceRequest.requestNumber,
            },
        });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| UPDATE STATUS
|--------------------------------------------------------------------------
|
| PUT /api/admin/requests/:id/status
|
|--------------------------------------------------------------------------
*/

export const updateAdminServiceRequestStatus =
    async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const id = getParamString(req.params.id);

            if (!isValidObjectId(id)) {
                res.status(400).json({ success: false, message: "Invalid request ID" });
                return;
            }

            const { status } = req.body ?? {};

            if (!status || !ALLOWED_STATUSES.includes(status as RequestStatus)) {
                res.status(400).json({ success: false, message: "Invalid request status", allowedStatuses: ALLOWED_STATUSES });
                return;
            }

            const serviceRequest = await ServiceRequest.findById(id);

            if (!serviceRequest) {
                res.status(404).json({ success: false, message: "Service request not found" });
                return;
            }

            if (status !== serviceRequest.status) {
                if (!isValidStatusTransition(serviceRequest.status, status)) {
                    res.status(400).json({
                        success: false,
                        message: `A request cannot move from ${serviceRequest.status} to ${status}.`,
                    });
                    return;
                }

                const staff = await User.findById(req.user?.userId).select("firstName lastName");
                serviceRequest.status = status;
                addActivity(serviceRequest, {
                    type: "STATUS",
                    actor: "STAFF",
                    actorName: staff ? `${staff.firstName} ${staff.lastName || ""}`.trim() : "Research Hub team",
                    status,
                });
                await serviceRequest.save();
            }

            const populated = await ServiceRequest.findById(id)
                .populate("serviceId", "name slug")
                .populate("domainId", "name slug")
                .populate("categoryId", "name slug")
                .populate("templateId", "name version isPublished");

            res.status(200).json({
                success: true,
                message: "Service request status updated successfully",
                data: populated,
            });
        } catch (error) {
            next(error);
        }
    };

/*
|--------------------------------------------------------------------------
| GET REQUEST STATISTICS
|--------------------------------------------------------------------------
|
| GET /api/admin/requests/stats
|
|--------------------------------------------------------------------------
*/

export const getAdminServiceRequestStats =
    async (
        _req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const [
                total,
                newRequests,
                inProgress,
                completed,
                cancelled,
            ] = await Promise.all([
                ServiceRequest.countDocuments(),

                ServiceRequest.countDocuments({
                    status: "NEW",
                }),

                ServiceRequest.countDocuments({
                    status: "IN_PROGRESS",
                }),

                ServiceRequest.countDocuments({
                    status: "COMPLETED",
                }),

                ServiceRequest.countDocuments({
                    status: "CANCELLED",
                }),
            ]);

            res.status(200).json({
                success: true,
                data: {
                    total,
                    new: newRequests,
                    inProgress,
                    completed,
                    cancelled,
                },
            });
        } catch (error) {
            next(error);
        }
    };