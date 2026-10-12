import mongoose, { Document } from "mongoose";
export interface IReferenceData extends Document {
    key: string;
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
declare const ReferenceData: mongoose.Model<IReferenceData, {}, {}, {}, mongoose.Document<unknown, {}, IReferenceData, {}, mongoose.DefaultSchemaOptions> & IReferenceData & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IReferenceData>;
export default ReferenceData;
