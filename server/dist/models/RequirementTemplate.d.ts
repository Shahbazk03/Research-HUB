import mongoose, { Document } from "mongoose";
export interface IRequirementTemplate extends Document {
    name: string;
    description?: string;
    serviceId: mongoose.Types.ObjectId;
    version: number;
    isActive: boolean;
    isPublished: boolean;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const RequirementTemplate: mongoose.Model<IRequirementTemplate, {}, {}, {}, mongoose.Document<unknown, {}, IRequirementTemplate, {}, mongoose.DefaultSchemaOptions> & IRequirementTemplate & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IRequirementTemplate>;
export default RequirementTemplate;
