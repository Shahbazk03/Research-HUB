import mongoose, { Schema } from "mongoose";
const requirementTemplateSchema = new Schema({
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
}, {
    timestamps: true,
});
requirementTemplateSchema.index({
    serviceId: 1,
    version: 1,
});
const RequirementTemplate = mongoose.model("RequirementTemplate", requirementTemplateSchema);
export default RequirementTemplate;
//# sourceMappingURL=RequirementTemplate.js.map