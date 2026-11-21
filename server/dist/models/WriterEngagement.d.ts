import mongoose, { Document } from "mongoose";
export declare const ENGAGEMENT_STAGES: readonly ["INTERESTED", "OFFERED", "ACCEPTED", "SUBMITTED", "CHANGES_REQUESTED", "APPROVED", "DECLINED", "WITHDRAWN", "NOT_SELECTED", "CANCELLED"];
export type EngagementStage = (typeof ENGAGEMENT_STAGES)[number];
/** Stages in which a writer holds the request (it is hidden from other writers). */
export declare const ACTIVE_ENGAGEMENT_STAGES: EngagementStage[];
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
    proposal?: {
        fee?: number;
        currency?: string;
        days?: number;
        note?: string;
        proposedAt?: Date;
    };
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
declare const WriterEngagement: mongoose.Model<IWriterEngagement, {}, {}, {}, mongoose.Document<unknown, {}, IWriterEngagement, {}, mongoose.DefaultSchemaOptions> & IWriterEngagement & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IWriterEngagement>;
export default WriterEngagement;
