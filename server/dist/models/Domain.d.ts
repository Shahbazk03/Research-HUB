import mongoose, { Document } from "mongoose";
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
declare const Domain: mongoose.Model<IDomain, {}, {}, {}, mongoose.Document<unknown, {}, IDomain, {}, mongoose.DefaultSchemaOptions> & IDomain & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IDomain>;
export default Domain;
