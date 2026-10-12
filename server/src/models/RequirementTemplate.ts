import mongoose, { Document, Schema } from "mongoose";

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

const requirementTemplateSchema =
    new Schema<IRequirementTemplate>(
        {
            name: {
                type: String,
                required: true,
                trim: true,
                maxlength: 200,
            },

            description: {
                type: String,
                trim: true,
                maxlength: 2000,
            },

            serviceId: {
                type: Schema.Types.ObjectId,
                ref: "Service",
                required: true,
                index: true,
            },

            version: {
                type: Number,
                default: 1,
                min: 1,
            },

            isActive: {
                type: Boolean,
                default: true,
                index: true,
            },

            isPublished: {
                type: Boolean,
                default: false,
                index: true,
            },

            createdBy: {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        },
        {
            timestamps: true,
        }
    );

requirementTemplateSchema.index({
    serviceId: 1,
    version: 1,
});

const RequirementTemplate =
    mongoose.model<IRequirementTemplate>(
        "RequirementTemplate",
        requirementTemplateSchema
    );

export default RequirementTemplate;