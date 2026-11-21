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

    /** Present only for WRITER accounts (professors / research writers). */
    writerProfile?: IWriterProfile;

    createdAt: Date;
    updatedAt: Date;
}

export const WRITER_APPLICATION_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
export type WriterApplicationStatus = (typeof WRITER_APPLICATION_STATUSES)[number];

export interface IWriterPublication {
    title: string;
    journal?: string;
    year?: number;
    indexing?: string;
    url?: string;
}

export interface IWriterProfile {
    applicationStatus: WriterApplicationStatus;
    title?: string; // Dr., Prof.
    designation?: string;
    city?: string;
    country?: string;
    highestQualification?: string;
    yearsOfExperience?: number;
    expertise: string[];
    bio?: string;
    publications: IWriterPublication[];
    googleScholarUrl?: string;
    orcidId?: string;
    linkedinUrl?: string;
    cvUrl?: string;
    photoUrl?: string;
    /** Writer's own consent to appear on the public website. */
    showOnWebsite: boolean;
    /** Admin's decision to feature the profile on the website. */
    featuredOnWebsite: boolean;
    adminNotes?: string;
    reviewedAt?: Date;
}

const publicationSchema = new Schema<IWriterPublication>(
    {
        title: { type: String, required: true, trim: true, maxlength: 400 },
        journal: { type: String, trim: true, maxlength: 300 },
        year: { type: Number, min: 1950, max: 2100 },
        indexing: { type: String, trim: true, maxlength: 120 },
        url: { type: String, trim: true, maxlength: 1000 },
    },
    { _id: false }
);

const writerProfileSchema = new Schema<IWriterProfile>(
    {
        applicationStatus: {
            type: String,
            enum: WRITER_APPLICATION_STATUSES,
            default: "PENDING",
            index: true,
        },
        title: { type: String, trim: true, maxlength: 40 },
        designation: { type: String, trim: true, maxlength: 150 },
        city: { type: String, trim: true, maxlength: 100 },
        country: { type: String, trim: true, maxlength: 100 },
        highestQualification: { type: String, trim: true, maxlength: 150 },
        yearsOfExperience: { type: Number, min: 0, max: 70 },
        expertise: { type: [String], default: [] },
        bio: { type: String, trim: true, maxlength: 3000 },
        publications: { type: [publicationSchema], default: [] },
        googleScholarUrl: { type: String, trim: true, maxlength: 500 },
        orcidId: { type: String, trim: true, maxlength: 60 },
        linkedinUrl: { type: String, trim: true, maxlength: 500 },
        cvUrl: { type: String, trim: true, maxlength: 1000 },
        photoUrl: { type: String, trim: true, maxlength: 1000 },
        showOnWebsite: { type: Boolean, default: false },
        featuredOnWebsite: { type: Boolean, default: false },
        adminNotes: { type: String, trim: true, maxlength: 3000 },
        reviewedAt: Date,
    },
    { _id: false }
);

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

        writerProfile: {
            type: writerProfileSchema,
            default: undefined,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.index({ role: 1, "writerProfile.applicationStatus": 1 });

const User = mongoose.model<IUser>("User", userSchema);

export default User;