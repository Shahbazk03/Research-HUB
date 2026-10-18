import mongoose, { Document, Schema } from "mongoose";

export interface IReferralCode extends Document {
    referrerName: string;
    code: string;
    discountAmount: number;
    isActive: boolean;
    notes?: string;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const referralCodeSchema = new Schema<IReferralCode>(
    {
        referrerName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180,
        },
        code: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            maxlength: 50,
            unique: true,
            index: true,
        },
        discountAmount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

const ReferralCode = mongoose.model<IReferralCode>("ReferralCode", referralCodeSchema);

export default ReferralCode;
