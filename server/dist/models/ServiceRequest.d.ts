import mongoose, { Document } from "mongoose";
export declare const SERVICE_REQUEST_STATUSES: readonly ["NEW", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "COMPLETED", "CANCELLED", "UNDER_REVIEW", "NEEDS_INFORMATION", "QUOTATION_SENT"];
export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUSES)[number];
export declare const VALID_STATUS_TRANSITIONS: Record<ServiceRequestStatus, ServiceRequestStatus[]>;
export declare const isValidStatusTransition: (currentStatus: ServiceRequestStatus, newStatus: ServiceRequestStatus) => boolean;
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
        correspondingAuthor?: {
            name?: string;
            designation?: string;
            email?: string;
            orcidId?: string;
        };
        coAuthors?: Array<{
            name?: string;
            designation?: string;
            email?: string;
            orcidId?: string;
        }>;
        supervisor?: {
            name?: string;
            designation?: string;
            email?: string;
            orcidId?: string;
        };
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
    referral?: {
        code: string;
        referrerName: string;
        discountAmount: number;
        originalAmount: number;
        finalAmount: number;
        currency: string;
        appliedAt: Date;
    };
    assignedTo?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const ServiceRequest: mongoose.Model<IServiceRequest, {}, {}, {}, mongoose.Document<unknown, {}, IServiceRequest, {}, mongoose.DefaultSchemaOptions> & IServiceRequest & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IServiceRequest>;
export default ServiceRequest;
