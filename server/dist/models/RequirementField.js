import mongoose, { Schema } from "mongoose";
export const REQUIREMENT_FIELD_TYPES = [
    "TEXT",
    "LONG_TEXT",
    "NUMBER",
    "EMAIL",
    "PHONE",
    "DATE",
    "SELECT",
    "MULTI_SELECT",
    "RADIO",
    "CHECKBOX",
    "BOOLEAN",
    "FILE",
    "MULTI_FILE",
];
const requirementFieldSchema = new Schema({
    templateId: {
        type: Schema.Types.ObjectId,
        ref: "RequirementTemplate",
        required: true,
        index: true,
    },
    label: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
    },
    key: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 100,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
    type: {
        type: String,
        enum: REQUIREMENT_FIELD_TYPES,
        required: true,
    },
    isRequired: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    placeholder: {
        type: String,
        trim: true,
        maxlength: 300,
    },
    options: [
        {
            _id: false,
            label: {
                type: String,
                required: true,
                trim: true,
            },
            value: {
                type: String,
                required: true,
                trim: true,
            },
        },
    ],
    validation: {
        type: {
            min: Number,
            max: Number,
            minLength: Number,
            maxLength: Number,
            allowedFileTypes: [String],
            maxFileSizeMB: Number,
        },
        _id: false,
    },
    defaultValue: {
        type: Schema.Types.Mixed,
    },
    sortOrder: {
        type: Number,
        default: 0,
        index: true,
    },
}, {
    timestamps: true,
});
requirementFieldSchema.index({
    templateId: 1,
    key: 1,
});
requirementFieldSchema.index({
    templateId: 1,
    sortOrder: 1,
});
const RequirementField = mongoose.model("RequirementField", requirementFieldSchema);
export default RequirementField;
//# sourceMappingURL=RequirementField.js.map