import mongoose, { Document } from "mongoose";
export declare const PRICING_MODELS: readonly ["FIXED", "RANGE", "CUSTOM_QUOTE", "CONTACT_FOR_PRICE"];
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
declare const Service: mongoose.Model<IService, {}, {}, {}, mongoose.Document<unknown, {}, IService, {}, mongoose.DefaultSchemaOptions> & IService & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IService>;
export default Service;
