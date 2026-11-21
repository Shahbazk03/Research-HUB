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
    /** Present only for WRITER accounts (professors / research writers). */
    writerProfile?: IWriterProfile;
    createdAt: Date;
    updatedAt: Date;
}
export declare const WRITER_APPLICATION_STATUSES: readonly ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];
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
    title?: string;
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
declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
export default User;
