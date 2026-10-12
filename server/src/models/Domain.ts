import mongoose, { Document, Schema } from "mongoose";

export interface IDomain extends Document {
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    isActive: boolean;
    sortOrder: number;

    createdAt: Date;
    updatedAt: Date;
}

const domainSchema = new Schema<IDomain>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 2000,
        },

        imageUrl: {
            type: String,
            trim: true,
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        sortOrder: {
            type: Number,
            default: 0,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

const Domain = mongoose.model<IDomain>("Domain", domainSchema);

export default Domain;