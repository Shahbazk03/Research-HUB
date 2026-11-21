import mongoose, { Schema } from "mongoose";
import { USER_ROLES, USER_STATUSES, } from "../types/roles.js";
export const WRITER_APPLICATION_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];
const publicationSchema = new Schema({
    title: { type: String, required: true, trim: true, maxlength: 400 },
    journal: { type: String, trim: true, maxlength: 300 },
    year: { type: Number, min: 1950, max: 2100 },
    indexing: { type: String, trim: true, maxlength: 120 },
    url: { type: String, trim: true, maxlength: 1000 },
}, { _id: false });
const writerProfileSchema = new Schema({
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
}, { _id: false });
const userSchema = new Schema({
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
}, {
    timestamps: true,
});
userSchema.index({ role: 1, "writerProfile.applicationStatus": 1 });
const User = mongoose.model("User", userSchema);
export default User;
//# sourceMappingURL=User.js.map