import mongoose, { Document } from "mongoose";
export interface ISiteSetting extends Document {
    platformName: string;
    tagline: string;
    description?: string;
    whatsappNumber: string;
    whatsappDefaultMessageTemplate: string;
    supportEmail: string;
    supportPhone: string;
    businessHours: string;
    disclaimer: string;
    academicIntegrityPolicy: string;
    enableQuotations: boolean;
    updatedAt: Date;
    createdAt: Date;
}
declare const SiteSetting: mongoose.Model<ISiteSetting, {}, {}, {}, mongoose.Document<unknown, {}, ISiteSetting, {}, mongoose.DefaultSchemaOptions> & ISiteSetting & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ISiteSetting>;
export default SiteSetting;
