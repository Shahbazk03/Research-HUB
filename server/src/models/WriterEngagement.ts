import mongoose, { Document, Schema } from "mongoose";

/*
|--------------------------------------------------------------------------
| Writer engagement
|--------------------------------------------------------------------------
|
| One record per (service request, writer). Lifecycle:
|
|   INTERESTED  writer saw the brief and proposed a fee / timeline
|   OFFERED     admin chose this writer and sent final terms (fee, deadline,
|               late-penalty rule). The brief is now hidden from other writers.
|   ACCEPTED    writer consented to the terms -> work in progress
|   SUBMITTED   writer uploaded a draft; waiting for admin review
|   CHANGES_REQUESTED  admin sent it back with notes
|   APPROVED    admin approved; optionally released to the customer
|
|   Closed:  DECLINED (writer refused offer), WITHDRAWN (writer withdrew
|            interest), NOT_SELECTED (another writer was assigned),
|            CANCELLED (admin took the work back)
|
*/

export const ENGAGEMENT_STAGES = [
    "INTERESTED",
    "OFFERED",
    "ACCEPTED",
    "SUBMITTED",
    "CHANGES_REQUESTED",
    "APPROVED",
    "DECLINED",
    "WITHDRAWN",
    "NOT_SELECTED",
    "CANCELLED",
] as const;

export type EngagementStage = (typeof ENGAGEMENT_STAGES)[number];

/** Stages in which a writer holds the request (it is hidden from other writers). */
export const ACTIVE_ENGAGEMENT_STAGES: EngagementStage[] = ["OFFERED", "ACCEPTED", "SUBMITTED", "CHANGES_REQUESTED", "APPROVED"];

export interface IEngagementMessage {
    from: "WRITER" | "ADMIN";
    authorName?: string;
    text?: string;
    /** Optional fee / timeline proposal attached to the message (negotiation). */
    proposedFee?: number;
    proposedDays?: number;
    createdAt: Date;
}

export interface IEngagementSubmission {
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    note?: string;
    submittedAt: Date;
    review?: {
        decision: "APPROVED" | "CHANGES_REQUESTED";
        notes?: string;
        reviewedAt: Date;
        reviewerName?: string;
        releasedToCustomer?: boolean;
    };
}

export interface IWriterEngagement extends Document {
    requestId: mongoose.Types.ObjectId;
    writerId: mongoose.Types.ObjectId;
    stage: EngagementStage;

    proposal?: { fee?: number; currency?: string; days?: number; note?: string; proposedAt?: Date };

    offer?: {
        fee: number;
        currency: string;
        deadline: Date;
        penaltyPerDayPct: number;
        maxPenaltyPct: number;
        notes?: string;
        offeredAt: Date;
    };

    acceptedAt?: Date;
    approvedAt?: Date;
    closedReason?: string;

    submissions: IEngagementSubmission[];
    messages: IEngagementMessage[];

    payout?: {
        lateDays?: number;
        penaltyAmount?: number;
        payableAmount?: number;
        status: "UNPAID" | "PAID";
        paidAt?: Date;
        note?: string;
    };

    createdAt: Date;
    updatedAt: Date;
}

const engagementSchema = new Schema<IWriterEngagement>(
    {
        requestId: { type: Schema.Types.ObjectId, ref: "ServiceRequest", required: true, index: true },
        writerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        stage: { type: String, enum: ENGAGEMENT_STAGES, default: "INTERESTED", index: true },

        proposal: {
            fee: { type: Number, min: 0 },
            currency: { type: String, default: "INR" },
            days: { type: Number, min: 1, max: 365 },
            note: { type: String, trim: true, maxlength: 2000 },
            proposedAt: Date,
        },

        offer: {
            fee: { type: Number, min: 0 },
            currency: { type: String, default: "INR" },
            deadline: Date,
            penaltyPerDayPct: { type: Number, min: 0, max: 100 },
            maxPenaltyPct: { type: Number, min: 0, max: 100 },
            notes: { type: String, trim: true, maxlength: 2000 },
            offeredAt: Date,
        },

        acceptedAt: Date,
        approvedAt: Date,
        closedReason: { type: String, trim: true, maxlength: 1000 },

        submissions: [
            {
                fileName: { type: String, required: true, maxlength: 300 },
                fileUrl: { type: String, required: true, maxlength: 2000 },
                fileSize: Number,
                note: { type: String, trim: true, maxlength: 3000 },
                submittedAt: { type: Date, default: Date.now },
                review: {
                    decision: { type: String, enum: ["APPROVED", "CHANGES_REQUESTED"] },
                    notes: { type: String, trim: true, maxlength: 3000 },
                    reviewedAt: Date,
                    reviewerName: String,
                    releasedToCustomer: Boolean,
                },
            },
        ],

        messages: [
            {
                from: { type: String, enum: ["WRITER", "ADMIN"], required: true },
                authorName: { type: String, maxlength: 200 },
                text: { type: String, trim: true, maxlength: 3000 },
                proposedFee: { type: Number, min: 0 },
                proposedDays: { type: Number, min: 1, max: 365 },
                createdAt: { type: Date, default: Date.now },
            },
        ],

        payout: {
            lateDays: Number,
            penaltyAmount: Number,
            payableAmount: Number,
            status: { type: String, enum: ["UNPAID", "PAID"] },
            paidAt: Date,
            note: { type: String, trim: true, maxlength: 1000 },
        },
    },
    { timestamps: true }
);

// A writer has at most one engagement per request
engagementSchema.index({ requestId: 1, writerId: 1 }, { unique: true });
engagementSchema.index({ stage: 1, "offer.deadline": 1 });

const WriterEngagement = mongoose.model<IWriterEngagement>("WriterEngagement", engagementSchema);

export default WriterEngagement;
