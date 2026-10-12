import mongoose, { Document, Schema } from "mongoose";

export interface IReferenceData extends Document {
    key: string; // "academic_levels" | "publication_types" | "indexing_targets" | "citation_styles" | "disciplines"
    category: string;
    items: {
        id: string;
        label: string;
        description?: string;
        badge?: string;
        isActive: boolean;
        sortOrder: number;
    }[];
    updatedAt: Date;
    createdAt: Date;
}

const referenceDataSchema = new Schema<IReferenceData>(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        items: [
            {
                _id: false,
                id: { type: String, required: true },
                label: { type: String, required: true },
                description: String,
                badge: String,
                isActive: { type: Boolean, default: true },
                sortOrder: { type: Number, default: 0 },
            },
        ],
    },
    {
        timestamps: true,
    }
);

const ReferenceData = mongoose.model<IReferenceData>("ReferenceData", referenceDataSchema);

export default ReferenceData;
