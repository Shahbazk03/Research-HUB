import mongoose, { Document, Schema } from "mongoose";

export const SERVICE_REQUEST_STATUSES = [
    "NEW",
    "IN_PROGRESS",
    "WAITING_FOR_CUSTOMER",
    "COMPLETED",
    "CANCELLED",
    // Backwards compatibility aliases
    "UNDER_REVIEW",
    "NEEDS_INFORMATION",
    "QUOTATION_SENT",
] as const;

export type ServiceRequestStatus =
    (typeof SERVICE_REQUEST_STATUSES)[number];

export const VALID_STATUS_TRANSITIONS: Record<ServiceRequestStatus, ServiceRequestStatus[]> = {
    NEW: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "CANCELLED", "UNDER_REVIEW", "QUOTATION_SENT"],
    UNDER_REVIEW: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "QUOTATION_SENT", "CANCELLED"],
    QUOTATION_SENT: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "CANCELLED"],
    NEEDS_INFORMATION: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "CANCELLED"],
    IN_PROGRESS: ["WAITING_FOR_CUSTOMER", "COMPLETED", "CANCELLED", "NEEDS_INFORMATION"],
    WAITING_FOR_CUSTOMER: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
    COMPLETED: ["IN_PROGRESS"], // allow reopen if needed
    CANCELLED: ["NEW", "IN_PROGRESS"], // allow reopen
};

export const isValidStatusTransition = (
    currentStatus: ServiceRequestStatus,
    newStatus: ServiceRequestStatus
): boolean => {
    if (currentStatus === newStatus) return true;
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(newStatus) : false;
};

export interface IServiceRequest extends Document {
    requestNumber: string;

    userId?: mongoose.Types.ObjectId;

    customer: {
        name: string;
        email: string;
        phone?: string;
        whatsapp?: string;
    };

    serviceId: mongoose.Types.ObjectId;
    domainId?: mongoose.Types.ObjectId;
    categoryId?: mongoose.Types.ObjectId;
    templateId?: mongoose.Types.ObjectId;

    academicProfile?: {
        academicLevel?: string;
        discipline?: string;
        university?: string;
        department?: string;
        publicationType?: string;
        targetJournal?: string;
        targetConference?: string;
        indexingRequirement?: string;
        citationStyle?: string;
        wordCount?: number;
        pageCount?: number;
        deadline?: string;
    };

    requirements: Record<string, unknown>;

    referenceFiles: {
        name: string;
        url: string;
        type?: string;
        size?: number;
    }[];

    additionalMessage?: string;

    preferredContactMethod: "WHATSAPP" | "EMAIL" | "PHONE";

    status: ServiceRequestStatus;

    adminNotes?: string;

    quotation?: {
        amount?: number;
        currency?: string;
        notes?: string;
        providedAt?: Date;
    };

    paymentQr?: {
        url: string;
        upiId?: string;
        uploadedAt?: Date;
    };

    paymentSubmission?: {
        transactionId: string;
        amountPaid: number;
        currency: string;
        payerName?: string;
        payerUpiId?: string;
        screenshotUrl?: string;
        notes?: string;
        submittedAt: Date;
        status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
        verifiedAt?: Date;
        adminVerificationNotes?: string;
    };

    finalDeliverable?: {
        fileName?: string;
        fileUrl?: string;
        fileSize?: number;
        doiUrl?: string;
        notes?: string;
        uploadedAt?: Date;
    };

    assignedTo?: mongoose.Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

const serviceRequestSchema = new Schema<IServiceRequest>(
    {
        requestNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },

        customer: {
            name: {
                type: String,
                required: true,
                trim: true,
                maxlength: 200,
            },

            email: {
                type: String,
                required: true,
                trim: true,
                lowercase: true,
                maxlength: 320,
            },

            phone: {
                type: String,
                trim: true,
                maxlength: 30,
            },

            whatsapp: {
                type: String,
                trim: true,
                maxlength: 30,
            },
        },

        serviceId: {
            type: Schema.Types.ObjectId,
            ref: "Service",
            required: true,
            index: true,
        },

        domainId: {
            type: Schema.Types.ObjectId,
            ref: "Domain",
            index: true,
        },

        categoryId: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            index: true,
        },

        templateId: {
            type: Schema.Types.ObjectId,
            ref: "RequirementTemplate",
        },

        academicProfile: {
            academicLevel: String,
            discipline: String,
            university: String,
            department: String,
            publicationType: String,
            targetJournal: String,
            targetConference: String,
            indexingRequirement: String,
            citationStyle: String,
            wordCount: Number,
            pageCount: Number,
            deadline: String,
        },

        requirements: {
            type: Schema.Types.Mixed,
            required: true,
            default: {},
        },

        referenceFiles: [
            {
                _id: false,
                name: {
                    type: String,
                    required: true,
                },
                url: {
                    type: String,
                    required: true,
                },
                type: String,
                size: Number,
            },
        ],

        additionalMessage: {
            type: String,
            trim: true,
            maxlength: 5000,
        },

        preferredContactMethod: {
            type: String,
            enum: ["WHATSAPP", "EMAIL", "PHONE"],
            default: "WHATSAPP",
            required: true,
        },

        status: {
            type: String,
            enum: SERVICE_REQUEST_STATUSES,
            default: "NEW",
            required: true,
            index: true,
        },

        adminNotes: {
            type: String,
            trim: true,
            maxlength: 10000,
        },

        quotation: {
            amount: Number,
            currency: {
                type: String,
                default: "INR",
            },
            notes: String,
            providedAt: Date,
        },

        paymentQr: {
            url: String,
            upiId: String,
            uploadedAt: Date,
        },

        paymentSubmission: {
            transactionId: {
                type: String,
                trim: true,
            },
            amountPaid: Number,
            currency: {
                type: String,
                default: "INR",
            },
            payerName: String,
            payerUpiId: String,
            screenshotUrl: String,
            notes: String,
            submittedAt: Date,
            status: {
                type: String,
                enum: ["PENDING_VERIFICATION", "VERIFIED", "REJECTED"],
                default: "PENDING_VERIFICATION",
            },
            verifiedAt: Date,
            adminVerificationNotes: String,
        },

        finalDeliverable: {
            fileName: String,
            fileUrl: String,
            fileSize: Number,
            doiUrl: String,
            notes: String,
            uploadedAt: Date,
        },

        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

serviceRequestSchema.index({
    status: 1,
    createdAt: -1,
});

serviceRequestSchema.index({
    serviceId: 1,
    status: 1,
});

serviceRequestSchema.index({
    "customer.email": 1,
});

const ServiceRequest = mongoose.model<IServiceRequest>(
    "ServiceRequest",
    serviceRequestSchema
);

export default ServiceRequest;