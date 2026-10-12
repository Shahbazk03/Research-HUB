import mongoose, { Document, Schema } from "mongoose";

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

const siteSettingSchema = new Schema<ISiteSetting>(
    {
        platformName: {
            type: String,
            default: "Research Hub",
            required: true,
        },
        tagline: {
            type: String,
            default: "Premier Academic Research & Publication Advisory",
        },
        description: {
            type: String,
            default: "Comprehensive research support for academic scholars, postgraduates, and faculty across disciplines.",
        },
        whatsappNumber: {
            type: String,
            default: "918004153053",
            required: true,
        },
        whatsappDefaultMessageTemplate: {
            type: String,
            default: "Hello Research Hub, I have an inquiry regarding Request #{requestNumber} for {serviceName}. Please assist me.",
        },
        supportEmail: {
            type: String,
            default: "support@researchhub.com",
        },
        supportPhone: {
            type: String,
            default: "+91 8004153053",
        },
        businessHours: {
            type: String,
            default: "Mon - Sat: 9:00 AM - 8:00 PM IST",
        },
        disclaimer: {
            type: String,
            default: "Research Hub provides ethical research consultation, technical writing guidance, proofreading, and journal formatting services. We strictly uphold academic integrity standards and do not guarantee publication acceptance without editorial review.",
        },
        academicIntegrityPolicy: {
            type: String,
            default: "All research and advisory work adheres to Committee on Publication Ethics (COPE) guidelines and institutional academic honesty regulations.",
        },
        enableQuotations: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const SiteSetting = mongoose.model<ISiteSetting>("SiteSetting", siteSettingSchema);

export default SiteSetting;
