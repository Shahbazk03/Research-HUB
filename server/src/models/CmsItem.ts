import mongoose, { Document, Schema } from "mongoose";

export interface ICmsFaq extends Document {
    question: string;
    answer: string;
    category: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const cmsFaqSchema = new Schema<ICmsFaq>(
    {
        question: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        answer: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000,
        },
        category: {
            type: String,
            default: "General",
            trim: true,
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

export const CmsFaq = mongoose.model<ICmsFaq>("CmsFaq", cmsFaqSchema);

export default CmsFaq;
