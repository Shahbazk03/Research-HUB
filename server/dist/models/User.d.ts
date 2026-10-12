import mongoose, { Document } from "mongoose";
import { UserRole, UserStatus } from "../types/roles.js";
export interface IUser extends Document {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName?: string;
    phone?: string;
    whatsapp?: string;
    academicLevel?: string;
    institution?: string;
    department?: string;
    role: UserRole;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
}
declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
export default User;
