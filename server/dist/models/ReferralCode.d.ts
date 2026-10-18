import mongoose, { Document } from "mongoose";
export interface IReferralCode extends Document {
    referrerName: string;
    code: string;
    discountAmount: number;
    isActive: boolean;
    notes?: string;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const ReferralCode: mongoose.Model<IReferralCode, {}, {}, {}, mongoose.Document<unknown, {}, IReferralCode, {}, mongoose.DefaultSchemaOptions> & IReferralCode & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IReferralCode>;
export default ReferralCode;
