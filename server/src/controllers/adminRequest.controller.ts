import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import ServiceRequest from "../models/ServiceRequest.js";

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
                        "name slug description basePrice"
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
                    "name slug description basePrice"
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
            paymentSubmission,
            paymentVerificationAction,
            paymentVerificationNotes,
        } = req.body;

        /*
        |--------------------------------------------------------------------------
        | Validate Status
        |--------------------------------------------------------------------------
        */

        if (
            status !== undefined &&
            !ALLOWED_STATUSES.includes(
                status as RequestStatus
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

        /*
        |--------------------------------------------------------------------------
        | Validate Contact Method
        |--------------------------------------------------------------------------
        */

        if (
            preferredContactMethod !==
            undefined &&
            !ALLOWED_CONTACT_METHODS.includes(
                preferredContactMethod as ContactMethod
            )
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Invalid preferred contact method",
                allowedContactMethods:
                    ALLOWED_CONTACT_METHODS,
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Validate Requirements
        |--------------------------------------------------------------------------
        */

        if (
            requirements !== undefined &&
            (
                typeof requirements !==
                "object" ||
                requirements === null ||
                Array.isArray(requirements)
            )
        ) {
            res.status(400).json({
                success: false,
                message:
                    "requirements must be an object",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Validate Reference Files
        |--------------------------------------------------------------------------
        */

        if (
            referenceFiles !== undefined
        ) {
            if (
                !Array.isArray(
                    referenceFiles
                )
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "referenceFiles must be an array",
                });

                return;
            }

            for (
                const file of referenceFiles
            ) {
                if (
                    !file ||
                    typeof file !==
                    "object" ||
                    !file.name ||
                    !file.url
                ) {
                    res.status(400).json({
                        success: false,
                        message:
                            "Every reference file must contain name and url",
                    });

                    return;
                }
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Build Update Object
        |--------------------------------------------------------------------------
        */

        const update: Record<
            string,
            unknown
        > = {};

        /*
        |--------------------------------------------------------------------------
        | Customer Fields
        |--------------------------------------------------------------------------
        */

        if (name !== undefined) {
            update["customer.name"] =
                name;
        }

        if (email !== undefined) {
            update["customer.email"] =
                email;
        }

        if (phone !== undefined) {
            update["customer.phone"] =
                phone;
        }

        if (whatsapp !== undefined) {
            update["customer.whatsapp"] =
                whatsapp;
        }

        /*
        |--------------------------------------------------------------------------
        | Request Fields
        |--------------------------------------------------------------------------
        */

        if (status !== undefined) {
            update.status = status;
        }

        if (requirements !== undefined) {
            update.requirements =
                requirements;
        }

        if (
            referenceFiles !==
            undefined
        ) {
            update.referenceFiles =
                referenceFiles;
        }

        if (
            additionalMessage !==
            undefined
        ) {
            update.additionalMessage =
                additionalMessage;
        }

        if (
            preferredContactMethod !==
            undefined
        ) {
            update.preferredContactMethod =
                preferredContactMethod;
        }

        if (adminNotes !== undefined) {
            update.adminNotes = adminNotes;
        }

        if (quotation !== undefined) {
            if (typeof quotation === "object" && quotation !== null) {
                update.quotation = {
                    amount: quotation.amount !== undefined ? Number(quotation.amount) : undefined,
                    currency: quotation.currency || "INR",
                    notes: quotation.notes || "",
                    providedAt: quotation.providedAt || new Date(),
                };
            } else {
                update.quotation = undefined;
            }
        }

        if (paymentQr !== undefined) {
            if (typeof paymentQr === "object" && paymentQr !== null) {
                update.paymentQr = {
                    url: paymentQr.url || "",
                    upiId: paymentQr.upiId || "",
                    uploadedAt: new Date(),
                };
            } else {
                update.paymentQr = undefined;
            }
        }

        if (finalDeliverable !== undefined) {
            if (typeof finalDeliverable === "object" && finalDeliverable !== null) {
                update.finalDeliverable = {
                    fileName: finalDeliverable.fileName || "",
                    fileUrl: finalDeliverable.fileUrl || "",
                    fileSize: finalDeliverable.fileSize || 0,
                    doiUrl: finalDeliverable.doiUrl || "",
                    notes: finalDeliverable.notes || "",
                    uploadedAt: new Date(),
                };
            } else {
                update.finalDeliverable = undefined;
            }
        }

        if (paymentSubmission !== undefined) {
            update.paymentSubmission = paymentSubmission;
        }

        if (paymentVerificationAction !== undefined) {
            const isVerified = paymentVerificationAction === "VERIFY";
            update["paymentSubmission.status"] = isVerified ? "VERIFIED" : "REJECTED";
            update["paymentSubmission.verifiedAt"] = new Date();
            if (paymentVerificationNotes !== undefined) {
                update["paymentSubmission.adminVerificationNotes"] = paymentVerificationNotes;
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Prevent Empty Update
        |--------------------------------------------------------------------------
        */

        if (
            Object.keys(update).length ===
            0
        ) {
            res.status(400).json({
                success: false,
                message:
                    "No fields provided for update",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Update Database
        |--------------------------------------------------------------------------
        */

        const serviceRequest =
            await ServiceRequest.findByIdAndUpdate(
                id,
                {
                    $set: update,
                },
                {
                    new: true,
                    runValidators: true,
                }
            )
                .populate(
                    "serviceId",
                    "name slug description basePrice"
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
                "Service request updated successfully",
            data: serviceRequest,
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
            const id = getParamString(
                req.params.id
            );

            if (!isValidObjectId(id)) {
                res.status(400).json({
                    success: false,
                    message:
                        "Invalid request ID",
                });

                return;
            }

            const { status } = req.body;

            if (
                !status ||
                !ALLOWED_STATUSES.includes(
                    status as RequestStatus
                )
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Invalid request status",
                    allowedStatuses:
                        ALLOWED_STATUSES,
                });

                return;
            }

            const serviceRequest =
                await ServiceRequest.findByIdAndUpdate(
                    id,
                    {
                        $set: {
                            status,
                        },
                    },
                    {
                        new: true,
                        runValidators: true,
                    }
                )
                    .populate(
                        "serviceId",
                        "name slug"
                    )
                    .populate(
                        "domainId",
                        "name slug"
                    )
                    .populate(
                        "categoryId",
                        "name slug"
                    )
                    .populate(
                        "templateId",
                        "name version isPublished"
                    );

            if (!serviceRequest) {
                res.status(404).json({
                    success: false,
                    message:
                        "Service request not found",
                });

                return;
            }

            res.status(200).json({
                success: true,
                message:
                    "Service request status updated successfully",
                data: serviceRequest,
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