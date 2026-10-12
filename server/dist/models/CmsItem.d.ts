import mongoose, { Document } from "mongoose";
export interface ICmsFaq extends Document {
    question: string;
    answer: string;
    category: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const CmsFaq: mongoose.Model<ICmsFaq, {}, {}, {}, mongoose.Document<unknown, {}, ICmsFaq, {}, mongoose.DefaultSchemaOptions> & ICmsFaq & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ICmsFaq>;
export default CmsFaq;
