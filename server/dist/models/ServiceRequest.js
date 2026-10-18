import mongoose, { Schema } from "mongoose";
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
];
export const VALID_STATUS_TRANSITIONS = {
    NEW: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "CANCELLED", "UNDER_REVIEW", "QUOTATION_SENT"],
    UNDER_REVIEW: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "QUOTATION_SENT", "CANCELLED"],
    QUOTATION_SENT: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "CANCELLED"],
    NEEDS_INFORMATION: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "CANCELLED"],
    IN_PROGRESS: ["WAITING_FOR_CUSTOMER", "COMPLETED", "CANCELLED", "NEEDS_INFORMATION"],
    WAITING_FOR_CUSTOMER: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
    COMPLETED: ["IN_PROGRESS"], // allow reopen if needed
    CANCELLED: ["NEW", "IN_PROGRESS"], // allow reopen
};
export const isValidStatusTransition = (currentStatus, newStatus) => {
    if (currentStatus === newStatus)
        return true;
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(newStatus) : false;
};
const serviceRequestSchema = new Schema({
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
        correspondingAuthor: {
            name: String,
            designation: String,
            email: String,
            orcidId: String,
        },
        coAuthors: [
            {
                _id: false,
                name: String,
                designation: String,
                email: String,
                orcidId: String,
            },
        ],
        supervisor: {
            name: String,
            designation: String,
            email: String,
            orcidId: String,
        },
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
    referral: {
        code: { type: String, trim: true, uppercase: true },
        referrerName: { type: String, trim: true },
        discountAmount: Number,
        originalAmount: Number,
        finalAmount: Number,
        currency: { type: String, default: "INR" },
        appliedAt: Date,
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
    },
}, {
    timestamps: true,
});
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
const ServiceRequest = mongoose.model("ServiceRequest", serviceRequestSchema);
export default ServiceRequest;
//# sourceMappingURL=ServiceRequest.js.map