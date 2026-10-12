import mongoose, { Document } from "mongoose";
export interface ICategory extends Document {
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    sortOrder: number;
    domainIds: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}
declare const Category: mongoose.Model<ICategory, {}, {}, {}, mongoose.Document<unknown, {}, ICategory, {}, mongoose.DefaultSchemaOptions> & ICategory & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ICategory>;
export default Category;
