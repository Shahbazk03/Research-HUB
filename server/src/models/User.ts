import mongoose, { Document, Schema } from "mongoose";
import {
    USER_ROLES,
    USER_STATUSES,
    UserRole,
    UserStatus,
} from "../types/roles.js";

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

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        passwordHash: {
            type: String,
            required: true,
            select: false,
        },

        firstName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        lastName: {
            type: String,
            trim: true,
            maxlength: 100,
        },

        phone: {
            type: String,
            trim: true,
            maxlength: 30,
        },

        whatsapp: {
            type: String,
            trim: true,
            maxlength: 30,
        },

        academicLevel: {
            type: String,
            trim: true,
            maxlength: 100,
        },

        institution: {
            type: String,
            trim: true,
            maxlength: 200,
        },

        department: {
            type: String,
            trim: true,
            maxlength: 200,
        },

        role: {
            type: String,
            enum: Object.values(USER_ROLES),
            default: USER_ROLES.CUSTOMER,
            index: true,
        },

        status: {
            type: String,
            enum: Object.values(USER_STATUSES),
            default: USER_STATUSES.ACTIVE,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;