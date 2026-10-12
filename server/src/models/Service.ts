import mongoose, { Document, Schema } from "mongoose";

export const PRICING_MODELS = [
    "FIXED",
    "RANGE",
    "CUSTOM_QUOTE",
    "CONTACT_FOR_PRICE",
] as const;

export type PricingModel = (typeof PRICING_MODELS)[number];

export interface IService extends Document {
    name: string;
    slug: string;

    shortDescription?: string;
    description?: string;
    imageUrl?: string;
    icon?: string;

    pricingModel: PricingModel;
    currency?: string;
    priceAmount?: number;
    priceRange?: {
        min?: number;
        max?: number;
        currency?: string;
    };

    turnaroundTime?: string;
    deliverables?: string[];
    idealFor?: string[];
    supportedPublicationTypes?: string[];
    supportedIndexing?: string[];

    isActive: boolean;
    isFeatured: boolean;
    sortOrder: number;

    domainIds: mongoose.Types.ObjectId[];
    categoryIds: mongoose.Types.ObjectId[];

    createdBy?: mongoose.Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        shortDescription: {
            type: String,
            trim: true,
            maxlength: 500,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 10000,
        },

        imageUrl: {
            type: String,
            trim: true,
        },

        icon: {
            type: String,
            trim: true,
        },

        pricingModel: {
            type: String,
            enum: PRICING_MODELS,
            default: "CUSTOM_QUOTE",
        },

        currency: {
            type: String,
            default: "INR",
            trim: true,
        },

        priceAmount: {
            type: Number,
        },

        priceRange: {
            min: Number,
            max: Number,
            currency: {
                type: String,
                default: "INR",
            },
        },

        turnaroundTime: {
            type: String,
            trim: true,
            maxlength: 100,
        },

        deliverables: [
            {
                type: String,
                trim: true,
            },
        ],

        idealFor: [
            {
                type: String,
                trim: true,
            },
        ],

        supportedPublicationTypes: [
            {
                type: String,
                trim: true,
            },
        ],

        supportedIndexing: [
            {
                type: String,
                trim: true,
            },
        ],

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        isFeatured: {
            type: Boolean,
            default: false,
            index: true,
        },

        sortOrder: {
            type: Number,
            default: 0,
            index: true,
        },

        domainIds: [
            {
                type: Schema.Types.ObjectId,
                ref: "Domain",
                index: true,
            },
        ],

        categoryIds: [
            {
                type: Schema.Types.ObjectId,
                ref: "Category",
                index: true,
            },
        ],

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

serviceSchema.index({
    name: "text",
    shortDescription: "text",
    description: "text",
});

const Service = mongoose.model<IService>("Service", serviceSchema);

export default Service;